"""Add the page's text to the storage run (out/raw_storage.json -> out/storage.json). Numbers are computed from the
run; run: python3 src/map/storage/finalize.py"""
import json, os
H = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(H, "..", "out")
S = json.load(open(os.path.join(O, "raw_storage.json")))
b = {s["fmt"]: s["bytes"] for s in S["sizes"]}
for s in S["sizes"]:
    if s["fmt"].startswith("parquet.") and s["fmt"] != "parquet.snappy": s["label"] = s["label"].replace("zstd", "zstd (level 1, pyarrow default)")
T, N = S["tokens"], S["n_docs"]
w = {x["L"]: x for x in S["pack"]["windows"]}
S["note"] = ("%s; %s columns (%s); %s tokens with the %s, so ids need uint32. Sizes are bytes on disk, measured." %
             (S["source"], len(S["columns"]), ", ".join(S["columns"]), f"{T:,}", S["tokenizer"]))
S["reading"] = ("zstd shrinks the JSONL %.1f times; Parquet with zstd is %.0f%% larger than JSONL with zstd only because pyarrow 26 writes zstd at level 1 when no level is given; at level 3 "
                "Parquet is 2%% smaller (measured by the Storage and loading at scale page), and it lets a reader skip columns. The token shard (%s) is %.1f times the zstd JSONL: 4 bytes per token and no compression. A vocabulary of at most 65,536 "
                "would allow uint16 and roughly halve it (%s derived)." % (b["jsonl"] / b["jsonl.zst"], 100 * (b["parquet.zstd"] / b["jsonl.zst"] - 1), f"{b['bin']:,} bytes",
                b["bin"] / b["jsonl.zst"], f"{T * 2 + N * 8:,} bytes"))
S["loader"] = ("A pretraining loader memory-maps the token file (numpy.memmap or Megatron's indexed dataset), so the operating system pages in only the windows a step needs. "
               "It draws window start positions with a seeded shuffle (Megatron, datatrove; nanoGPT instead draws random offsets with replacement), gives each data-parallel rank a disjoint slice, and records how many samples it has consumed so a "
               "restart resumes at the same place. Measured on these %s documents (median %s tokens, 90th percentile %s): one document per 2,048-token window leaves %.1f%% "
               "of positions as padding (%s windows), packing needs %s windows at %.2f%% fill; at 8,192 tokens the padding share rises to %.1f%%. Streaming loaders "
               "(MosaicML Streaming, LitData, WebDataset) do the same from object storage, one shard at a time." %
               (f"{N:,}", f"{S['lens_quantiles']['0.5']:,}", f"{S['lens_quantiles']['0.9']:,}", 100 * w[2048]["pad_frac"], f"{w[2048]['n_pad']:,}", f"{w[2048]['n_pack']:,}",
                100 * w[2048]["pack_fill"], 100 * w[8192]["pad_frac"]))
S["tokenizer"] = S["tokenizer"].replace(str(S["vocab"]), f"{S['vocab']:,}")
json.dump(S, open(os.path.join(O, "storage.json"), "w"), indent=1)
print(S["reading"]); print(S["loader"])
