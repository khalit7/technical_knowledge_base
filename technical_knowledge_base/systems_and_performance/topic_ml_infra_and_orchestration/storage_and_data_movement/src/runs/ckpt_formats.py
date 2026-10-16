#!/usr/bin/env python3
"""Checkpoint formats as storage objects (run under torchrun, gloo, CPU, 1 thread per rank).

The model is the Storage lab's: train.py's GPT at d 512, 8 layers, 8 heads (25,319,489 parameters), FSDP2 over W ranks,
AdamW, three training steps. Same seed and batches as the root's src/io/dist_ckpt.py.

--mode save : (1) a DCP checkpoint (model + optimiser) by W ranks; rank 0 then reads its .metadata and prints, for every
              tensor, its chunks (offset and size in the global tensor) and where each chunk's bytes live
              (file, byte offset, length);
              (2) the full model weights as safetensors on rank 0: one file, and sharded at --shard-mb with an
              index.json (the Hugging Face layout); the 8-byte header length and the JSON header are printed;
              (3) DCP's own HuggingFaceStorageWriter (safetensors written by DCP, one file per rank, then consolidated).
--mode load : load the DCP checkpoint into this W (resharding), recording every byte range each rank reads.
Prints JSON lines (rank 0, plus one per rank for reads).
"""
import argparse, importlib.util, json, os, sys, time, struct
import torch, torch.distributed as dist, torch.nn.functional as F
from torch.distributed.fsdp import fully_shard
from torch.distributed.device_mesh import init_device_mesh
import torch.distributed.checkpoint as dcp
from torch.distributed.checkpoint import FileSystemReader
from torch.distributed.checkpoint.state_dict import get_state_dict, set_state_dict, StateDictOptions


class LoggingReader(FileSystemReader):
    """FileSystemReader that records the (file, offset, length) of every read item before reading it."""
    def __init__(self, path):
        super().__init__(path); self.reads = []
    def read_data(self, plan, planner):
        for it in plan.items:
            md = self.storage_data[it.storage_index]
            self.reads.append((md.relative_path, md.offset, md.length, it.storage_index.fqn))
        return super().read_data(plan, planner)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--train-py", required=True); ap.add_argument("--data", required=True)
    ap.add_argument("--dir", required=True); ap.add_argument("--mode", required=True)
    ap.add_argument("--shard-mb", type=int, default=25)
    a = ap.parse_args()
    dist.init_process_group("gloo")
    r, W = dist.get_rank(), dist.get_world_size(); torch.set_num_threads(1)
    spec = importlib.util.spec_from_file_location("mi_train", a.train_py)
    T = importlib.util.module_from_spec(spec); spec.loader.exec_module(T)
    targs = T.parse(["--d", "512", "--layers", "8", "--heads", "8"])
    data, vocab = T.load_text(a.data)
    torch.manual_seed(1234)
    m = T.GPT(vocab, 512, 8, 8, 64); n = sum(p.numel() for p in m.parameters())
    mesh = init_device_mesh("cpu", (W,))
    for b in m.blocks: fully_shard(b, mesh=mesh)
    fully_shard(m, mesh=mesh)
    opt = torch.optim.AdamW(m.parameters(), lr=targs.lr)
    def log(**kw):
        if r == 0: print(json.dumps({"world": W, "torch": torch.__version__, **kw}), flush=True)
    dcp_dir = os.path.join(a.dir, "dcp_w4")
    if a.mode == "save":
        for s in range(3):
            x, y = T.get_batch(data, s, targs, r, W)
            loss = F.cross_entropy(m(x).view(-1, vocab), y.view(-1)); opt.zero_grad(); loss.backward(); opt.step()
        msd, osd = get_state_dict(m, opt)
        t0 = time.perf_counter(); dcp.save({"model": msd, "optim": osd}, checkpoint_id=dcp_dir); t_dcp = time.perf_counter() - t0
        dist.barrier()
        full, _ = get_state_dict(m, opt, options=StateDictOptions(full_state_dict=True, cpu_offload=True))
        if r == 0:
            md = FileSystemReader(dcp_dir).read_metadata()
            tensors = []
            for fqn, tm in md.state_dict_metadata.items():
                if not hasattr(tm, "chunks"): continue
                ch = []
                for i, c in enumerate(tm.chunks):
                    key = [k for k in md.storage_data if k.fqn == fqn and tuple(k.offset) == tuple(c.offsets)]
                    si = md.storage_data[key[0]] if key else None
                    ch.append({"offsets": list(c.offsets), "sizes": list(c.sizes),
                               "file": si.relative_path if si else None, "byte_offset": si.offset if si else None, "length": si.length if si else None})
                tensors.append({"fqn": fqn, "size": list(tm.size), "dtype": str(tm.properties.dtype).replace("torch.", ""), "chunks": ch})
            files = {f: os.path.getsize(os.path.join(dcp_dir, f)) for f in sorted(os.listdir(dcp_dir))}
            log(mode="dcp_meta", params=n, save_s=round(t_dcp, 4), files=files, n_entries=len(tensors),
                n_chunks=sum(len(t["chunks"]) for t in tensors), n_storage_items=len(md.storage_data), tensors=tensors)
            # safetensors, the Hugging Face way: one file, then sharded with an index
            from safetensors.torch import save_file
            st = {k: v.contiguous() for k, v in full.items()}
            one = os.path.join(a.dir, "model.safetensors"); save_file(st, one, metadata={"format": "pt"})
            with open(one, "rb") as f:
                hl = struct.unpack("<Q", f.read(8))[0]; header = json.loads(f.read(hl))
            shard_dir = os.path.join(a.dir, "hf_sharded"); os.makedirs(shard_dir, exist_ok=True)
            limit = a.shard_mb * 1_000_000; shards, cur, size = [], {}, 0
            for k, v in st.items():  # the same greedy split as transformers' save_pretrained(max_shard_size=...)
                nb = v.numel() * v.element_size()
                if cur and size + nb > limit: shards.append(cur); cur, size = {}, 0
                cur[k] = v; size += nb
            if cur: shards.append(cur)
            wmap = {}
            for i, sh in enumerate(shards):
                fn = "model-%05d-of-%05d.safetensors" % (i + 1, len(shards)); save_file(sh, os.path.join(shard_dir, fn), metadata={"format": "pt"})
                for k in sh: wmap[k] = fn
            total = sum(v.numel() * v.element_size() for v in st.values())
            json.dump({"metadata": {"total_size": total}, "weight_map": wmap}, open(os.path.join(shard_dir, "model.safetensors.index.json"), "w"), indent=2)
            hdr_items = [(k, v) for k, v in header.items() if k != "__metadata__"]
            log(mode="safetensors", file_bytes=os.path.getsize(one), header_len=hl, n_tensors=len(hdr_items),
                header_sample={k: header[k] for k in list(header)[:4]}, total_tensor_bytes=total,
                shards={fn: os.path.getsize(os.path.join(shard_dir, fn)) for fn in sorted(os.listdir(shard_dir))},
                index_sample={k: wmap[k] for k in list(wmap)[:3] + list(wmap)[-2:]})
        dist.barrier()
        # DCP writing safetensors itself: every rank its own shard file, then consolidated into full tensors
        try:
            from torch.distributed.checkpoint import HuggingFaceStorageWriter
            hf_dir = os.path.join(a.dir, "dcp_hf")
            t0 = time.perf_counter()
            dcp.save({k: v for k, v in msd.items()}, storage_writer=HuggingFaceStorageWriter(path=hf_dir, save_distributed=True, enable_consolidation=True))
            dist.barrier(); t_hf = time.perf_counter() - t0
            if r == 0:
                listing = {}
                for root, _, fs in os.walk(hf_dir):
                    for f in fs: listing[os.path.relpath(os.path.join(root, f), hf_dir)] = os.path.getsize(os.path.join(root, f))
                log(mode="dcp_hf", save_s=round(t_hf, 4), files=dict(sorted(listing.items())))
        except Exception as e:
            log(mode="dcp_hf", error="%s: %s" % (type(e).__name__, str(e)[:400]))
    elif a.mode == "load":
        x, y = T.get_batch(data, 0, targs, r, W)
        loss = F.cross_entropy(m(x).view(-1, vocab), y.view(-1)); loss.backward(); opt.step(); opt.zero_grad()
        msd, osd = get_state_dict(m, opt)
        rd = LoggingReader(dcp_dir)
        t0 = time.perf_counter(); dcp.load({"model": msd, "optim": osd}, storage_reader=rd); tl = time.perf_counter() - t0
        per_file = {}
        for f, off, ln, fqn in rd.reads:
            d = per_file.setdefault(f, {"reads": 0, "bytes": 0}); d["reads"] += 1; d["bytes"] += ln
        sample = [x for x in rd.reads if x[3] == "model.blocks.0.qkv.weight" or x[3] == "model.tok.weight"]
        allr = [None] * W; dist.all_gather_object(allr, {"rank": r, "load_s": round(tl, 4), "per_file": per_file, "n_reads": len(rd.reads),
                                                          "bytes": sum(v["bytes"] for v in per_file.values()), "sample": sample})
        log(mode="load", ranks=allr)
    dist.barrier(); dist.destroy_process_group()


if __name__ == "__main__":
    main()
