"""Multi-process ("multi-host") JAX on one machine: 2 processes x 4 simulated CPU devices = 8 global devices.

Each process plays one host: it calls jax.distributed.initialize, loads only its own half of every batch
(the per-host data loading of a real slice), builds the global batch with jax.make_array_from_process_local_data,
and runs the same jitted data-parallel train step of the running example. The CPU collectives between processes
go over gloo (TCP on localhost); on a TPU slice they would ride ICI and the program would be the same.
Also records what each process can and cannot see, and the errors you meet.

    $JX_SCRATCH/venv/bin/python -I -B ss_multi.py            # the driver: starts both processes, merges results
Writes ../out/multi.json. Losses are compared with the root Sharding lab's one-device run (same 20 batches).
"""
import json
import os
import socket
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
NPROC, LOCAL, STEPS = 2, 4, 20


def worker(pid, port, outp, mode="normal"):
    os.environ["XLA_FLAGS"] = f"--xla_force_host_platform_device_count={LOCAL}"
    sys.path.insert(0, HERE)
    import ss_common as SC  # noqa: F401
    import jax
    jax.config.update("jax_cpu_collectives_implementation", "gloo")
    t0 = time.time()
    jax.distributed.initialize(coordinator_address=f"127.0.0.1:{port}", num_processes=NPROC, process_id=pid)
    import numpy as np
    from jax.sharding import AxisType, NamedSharding, PartitionSpec as P
    import common as C
    import model_jax as MJ
    cfg = C.CFG
    rec = {"process_index": jax.process_index(), "process_count": jax.process_count(),
           "devices": [str(d) for d in jax.devices()], "device_ids": [d.id for d in jax.devices()],
           "local_devices": [str(d) for d in jax.local_devices()], "init_s": round(time.time() - t0, 2)}
    mesh = jax.make_mesh((NPROC * LOCAL,), ("data",), axis_types=(AxisType.Auto,))
    rec["mesh_devices"] = [d.id for d in mesh.devices.flat]
    xs, rep = NamedSharding(mesh, P("data", None)), NamedSharding(mesh, P())
    tx = MJ.make_optimizer(cfg, C.lr_at)
    sd = dict(np.load(C.path("data", "init_torch.npz")))
    params = MJ.from_torch(sd, cfg)
    if mode == "mismatch" and pid == 1:              # the bug: host 1 starts from slightly different weights
        params = jax.tree.map(lambda a: a + 1e-3, params)
    opt = tx.init(params)
    try:
        params = jax.device_put(params, rep)        # every process passes the same values; each keeps its own copy
    except AssertionError as e:                     # jax checks that a replicated device_put got equal values
        rec["mode"] = mode
        rec["device_put_error"] = (type(e).__name__ + ": " + str(e)).split(". Expected")[0][:300]
        with open(outp, "w") as fh:
            json.dump(rec, fh)
        jax.distributed.shutdown()
        return
    opt = jax.device_put(opt, rep)

    def step(p, o, x, y):
        loss, g = jax.value_and_grad(MJ.loss_fn)(p, x, y, cfg)
        u, o = tx.update(g, o, p)
        import optax
        return optax.apply_updates(p, u), o, loss

    f = jax.jit(step, in_shardings=(rep, rep, xs, xs), out_shardings=(rep, rep, rep), donate_argnums=(0, 1))
    B = cfg["batch"]
    rows = slice(pid * B // NPROC, (pid + 1) * B // NPROC)     # this host's rows of the global batch
    losses = []
    for i in range(STEPS):
        x, y = C.batch(i)
        gx = jax.make_array_from_process_local_data(xs, x[rows])
        gy = jax.make_array_from_process_local_data(xs, y[rows])
        if i == 0:
            rec["global_batch_shape"] = list(gx.shape)
            rec["addressable_shards"] = [[str(s.device), list(s.data.shape), s.index[0].start, s.index[0].stop]
                                         for s in gx.addressable_shards]
            rec["is_fully_addressable"] = gx.is_fully_addressable
            try:
                np.asarray(gx)
                rec["np_asarray_global"] = "ok"
            except Exception as e:  # noqa: BLE001
                rec["np_asarray_global"] = (type(e).__name__ + ": " + str(e)).splitlines()[0][:300]
            from jax.experimental import multihost_utils
            full = multihost_utils.process_allgather(gx, tiled=True)
            rec["process_allgather_shape"] = list(full.shape)
            rec["process_allgather_equal"] = bool((np.asarray(full) == x).all())
            comp = f.lower(params, opt, gx, gy).compile()
            txt = comp.as_text()
            rec["hlo_all_reduce"] = txt.count(" all-reduce(") + txt.count(" all-reduce-start(")
        params, opt, loss = f(params, opt, gx, gy)
        losses.append(float(loss))                   # the loss is replicated: every process can read it
    rec["losses"] = losses
    rec["mode"] = mode
    from jax.experimental import multihost_utils
    try:
        multihost_utils.assert_equal(np.asarray(params["head"]["w"]), "head weights differ between processes")
        rec["assert_equal_after"] = "ok"
    except Exception as e:  # noqa: BLE001
        rec["assert_equal_after"] = (type(e).__name__ + ": " + str(e)).splitlines()[0][:200]
    try:
        rec["params_readable"] = bool(np.isfinite(np.asarray(params["head"]["w"])).all())
    except Exception as e:  # noqa: BLE001
        rec["params_readable"] = (type(e).__name__ + ": " + str(e)).splitlines()[0][:300]
    with open(outp, "w") as fh:
        json.dump(rec, fh)
    jax.distributed.shutdown()


def launch(mode, tmp, port):
    procs, outs = [], []
    env = dict(os.environ, JAX_PLATFORMS="cpu", OMP_NUM_THREADS="2")
    t0 = time.time()
    for pid in range(NPROC):
        outp = os.path.join(tmp, f"{mode}_proc{pid}.json")
        if os.path.exists(outp):
            os.remove(outp)
        outs.append(outp)
        log = open(os.path.join(tmp, f"{mode}_proc{pid}.log"), "w")
        procs.append(subprocess.Popen(["nice", "-n", "15", sys.executable, "-I", "-B", os.path.abspath(__file__),
                                       "worker", str(pid), str(port), outp, mode], env=env, stdout=log, stderr=subprocess.STDOUT))
    codes = [p.wait(timeout=900) for p in procs]
    return codes, time.time() - t0, [json.load(open(o)) for o in outs]


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def main():
    sys.path.insert(0, HERE)
    import ss_common as SC
    tmp = os.path.dirname(SC.big("multi", "x"))
    single = SC.load_root("strategies.json")["strategies"][0]
    assert single["id"] == "single"
    ref = single["losses"][:STEPS]
    res = {"what": f"{NPROC} processes x {LOCAL} simulated CPU devices on one machine, jax.distributed + gloo, "
                   "data-parallel train step of the running example, 20 steps on the shared batches",
           "one_device_losses": ref}
    for mode in ("normal", "mismatch"):
        codes, wall, recs = launch(mode, tmp, free_port())
        res[mode] = {"exit_codes": codes, "wall_s": round(wall, 1), "processes": recs}
        if all("losses" in r for r in recs):
            res[mode]["max_abs_loss_diff_vs_one_device"] = max(abs(a - b) for r in recs for a, b in zip(r["losses"], ref))
            res[mode]["processes_agree"] = recs[0]["losses"] == recs[1]["losses"]
        print(mode, "codes", codes, res[mode].get("max_abs_loss_diff_vs_one_device"), "wall", round(wall, 1),
              [r.get("device_put_error", "")[:150] for r in recs], flush=True)
    SC.dump("multi.json", res)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "worker":
        worker(int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5])
    else:
        main()
