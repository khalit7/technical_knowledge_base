"""Section 7 of the Reading tab: the few distributed numbers it draws, read from the Distributed lab's records
(src/dist/inputs, written by that tab's scripts). Called by build_data.py."""
import json, os
def extract(d):
    J = lambda t: json.load(open(os.path.join(d, t + ".json")))
    out = {"mem": {}, "coll": {}}
    for t in ["ddp_w2", "ddp_w4", "fsdp_w2", "fsdp_w4", "fsdp_w2_nr", "ddp_w2_big", "fsdp_w2_big", "fsdp_w4_big"]:
        r = J(t)["ranks"][0]; st = r["state"]
        pers = st["params"] + st["opt_state"] + st.get("bucket_buffers", 0)
        out["mem"][t] = dict(persistent=pers, peak_delta=r["mem"]["peak_delta"], total=pers + r["mem"]["peak_delta"],
                             params=st["params"], opt=st["opt_state"], buckets=st.get("bucket_buffers", 0))
    for t in ["ddp_w2", "fsdp_w2"]:
        r = J(t)["ranks"][0]; s = r["steps"][1]; tt = s["t"]
        ph = lambda c: "fwd" if c["time_created_ns"] < tt["fwd1"] else "bwd" if c["time_created_ns"] < tt["bwd1"] else "opt"
        out["coll"][t] = [dict(seq=c["collective_seq_id"], ph=ph(c), op=c["profiling_name"].replace("gloo:", ""),
                               numel=c["input_sizes"][0][0], in_bytes=c["in_bytes"], out_bytes=c["out_bytes"]) for c in s["coll"]]
        out["coll"][t + "_loss"] = [round(x["loss"], 5) for x in r["steps"]]
    return out
