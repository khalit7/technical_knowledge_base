"""Expert parallelism for real: one trained MoE layer of the tiny GPT split over W processes (gloo, CPU), each rank
holding E/W experts and a quarter of the running sequence's tokens. Dispatch and combine are two all_to_all_single
calls, exactly the pattern DeepEP and Megatron implement on GPUs. The result is checked against the same layer run
in one process.

Run: LA_SCRATCH=<scratch>/la OMP_NUM_THREADS=1 nice -n 15 <venv>/bin/python src/ep/ep_alltoall.py <run> [layer] [world]
Writes src/ep/out/ep_<run>_L<layer>_W<world>.json (counts, bytes, shapes, max abs difference, rough times).
Timings come from gloo over shared memory on a laptop CPU: they say nothing about NCCL on NVLink or InfiniBand.
"""
import json, os, socket, sys, time
import torch
import torch.distributed as dist
import torch.multiprocessing as mp

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "analysis"))
import moe_probe as P  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")


def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p


def worker(rank, world, port, h_all, layer_state, cfgd, ret):
    torch.set_num_threads(1)
    os.environ.update(MASTER_ADDR="127.0.0.1", MASTER_PORT=str(port))
    dist.init_process_group("gloo", rank=rank, world_size=world)
    cfg = P.GPTConfig(**cfgd)
    moe = P.MoE(cfg); moe.load_state_dict(layer_state); moe.eval()
    E, k, D = cfg.n_experts, cfg.top_k, cfg.d_model
    per = E // world                                        # experts per rank: rank r owns experts r*per .. r*per+per-1
    T = h_all.shape[0] // world
    h = h_all[rank * T:(rank + 1) * T]                      # this rank's tokens (T, D)
    t0 = time.perf_counter()
    with torch.inference_mode():
        # 1. route locally (every rank holds a copy of the router: it is tiny)
        logits = moe.router(h).float()
        scores = logits.sigmoid() if cfg.router == "sigmoid" else logits.softmax(-1)
        sel = scores + moe.e_bias if cfg.balance == "bias" else scores
        top_i = sel.topk(k, -1).indices                      # (T, k)
        top_w = scores.gather(-1, top_i)
        if cfg.router == "sigmoid" or k > 1:
            top_w = top_w / top_w.sum(-1, keepdim=True)
        # 2. sort the T*k assignments by destination rank
        flat_e = top_i.flatten()                             # (T*k,)
        flat_t = torch.arange(T).repeat_interleave(k)
        dest = flat_e // per
        order = torch.argsort(dest, stable=True)
        send_cnt = torch.bincount(dest, minlength=world)     # how many token copies go to each rank
        # 3. exchange counts so every rank knows how much it will receive (a tiny all-to-all of W integers)
        recv_cnt = torch.empty_like(send_cnt)
        dist.all_to_all_single(recv_cnt, send_cnt)
        t1 = time.perf_counter()
        # 4. dispatch all-to-all: hidden states (and their expert ids) travel to the expert's rank
        send_x = h[flat_t[order]]                            # (T*k, D)
        recv_x = torch.empty(int(recv_cnt.sum()), D)
        dist.all_to_all_single(recv_x, send_x, recv_cnt.tolist(), send_cnt.tolist())
        send_e = flat_e[order].to(torch.float32)[:, None]
        recv_e = torch.empty(int(recv_cnt.sum()), 1)
        dist.all_to_all_single(recv_e, send_e, recv_cnt.tolist(), send_cnt.tolist())
        t2 = time.perf_counter()
        # 5. local experts compute on what they received
        y = torch.zeros_like(recv_x)
        re = recv_e[:, 0].long()
        for e in range(rank * per, rank * per + per):
            m = re == e
            if m.any():
                y[m] = moe.experts[e](recv_x[m])
        t3 = time.perf_counter()
        # 6. combine all-to-all: outputs go home, in the order they were sent
        back = torch.empty_like(send_x)
        dist.all_to_all_single(back, y, send_cnt.tolist(), recv_cnt.tolist())
        t4 = time.perf_counter()
        # 7. weight and sum at home; shared experts run locally with no communication
        out = torch.zeros(T, D)
        w = top_w.flatten()[order]
        out.index_add_(0, flat_t[order], back * w[:, None])
        for s in moe.shared:
            out = out + s(h)
    gathered = [torch.empty_like(out) for _ in range(world)] if rank == 0 else None
    dist.gather(out, gathered, dst=0)
    ret.put((rank, {"send_cnt": send_cnt.tolist(), "recv_cnt": recv_cnt.tolist(), "tokens": T,
                    "t_counts_ms": round((t1 - t0) * 1e3, 2), "t_dispatch_ms": round((t2 - t1) * 1e3, 2),
                    "t_experts_ms": round((t3 - t2) * 1e3, 2), "t_combine_ms": round((t4 - t3) * 1e3, 2)},
             torch.cat(gathered) if rank == 0 else None))
    dist.barrier(); dist.destroy_process_group()


def main(run, layer=3, world=4):
    model = P.load(run)
    cfg = model.cfg
    ids = torch.tensor([P.json.load(open(os.path.join(P.DATA, "running_sequence.json")))["ids"]])
    blk = model.blocks[layer]
    cap = {}
    def hook(mod, inp, outp):
        cap["h"] = inp[0][0].detach().clone(); cap["y"] = outp[0][0].detach().clone()
    hd = blk.ffn.register_forward_hook(hook)
    P.MoE.forward = P.ORIG_FORWARD                          # reference: the unmodified layer, one process
    with torch.inference_mode():
        model(ids)
    hd.remove()
    ctx = mp.get_context("spawn"); q = ctx.Queue()
    port = free_port()
    procs = [ctx.Process(target=worker, args=(r, world, port, cap["h"], blk.ffn.state_dict(), cfg.to_dict(), q)) for r in range(world)]
    for p in procs: p.start()
    got = [q.get(timeout=300) for _ in range(world)]
    for p in procs: p.join(timeout=60)
    got.sort(key=lambda g: g[0])
    out = got[0][2]
    diff = float((out - cap["y"]).abs().max())
    send = [g[1]["send_cnt"] for g in got]
    D = cfg.d_model
    res = {"run": run, "layer": layer, "world": world, "experts": cfg.n_experts, "experts_per_rank": cfg.n_experts // world,
           "top_k": cfg.top_k, "d_model": D, "tokens_per_rank": got[0][1]["tokens"], "send_matrix": send,
           "local_copies": [send[r][r] for r in range(world)],
           "bytes_out_per_rank_fp32": [sum(s) * D * 4 for s in send], "bytes_out_per_rank_bf16": [sum(s) * D * 2 for s in send],
           "max_abs_diff_vs_one_process": diff, "times_ms": [g[1] for g in got], "torch": torch.__version__,
           "backend": "gloo (CPU, one process per rank, shared memory)", "machine": "Apple M1 Pro (CPU)"}
    os.makedirs(OUT, exist_ok=True)
    P.jdump(res, os.path.join(OUT, f"ep_{run}_L{layer}_W{world}.json"))
    print(json.dumps({k: res[k] for k in ("send_matrix", "max_abs_diff_vs_one_process", "bytes_out_per_rank_bf16")}))


if __name__ == "__main__":
    a = sys.argv[1:]
    main(a[0], int(a[1]) if len(a) > 1 else 3, int(a[2]) if len(a) > 2 else 4)
