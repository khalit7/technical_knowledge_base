"""Load balancing gRPC, measured: python lb_run.py GEN_DIR PY LABDIR NGINX WORK OUT.json
Three backends (infer_server.py, names backend-1..3 on 30531..30533) behind nginx as an L4 (stream, 30530) and an
L7 (HTTP/2 grpc_pass, 30534) balancer, plus direct client-side policies. One client channel per run.
Part 1, counts: 30 sequential unary calls (Who) per setup.
Part 2, scale-up timelines: a call every 50 ms for 7 s; the fleet starts with backend-1 and backend-2 and backend-3
joins at 1.5 s (nginx reloads with the longer list; the client's own list is fixed). Every call is recorded with its
time and the backend that answered. Only the PIDs started here are stopped."""
import json, os, signal, subprocess, sys, time
GEN, PY, LAB, NGINX, WORK, OUT = sys.argv[1:7]
sys.path.insert(0, GEN)
import grpc
import llm_pb2 as pb, llm_pb2_grpc as pbg

BK = {1: 30531, 2: 30532, 3: 30533}
TPL = open(os.path.join(LAB, "nginx_lb.conf.in")).read()


def nginx_conf(d, which):
    b = " ".join(f"server 127.0.0.1:{BK[i]};" for i in which)
    open(os.path.join(d, "nginx.conf"), "w").write(TPL.replace("@WORK@", d).replace("@BACKENDS@", b))


def start_backends(max_age=0):
    ps = []
    for i, p in BK.items():
        a = [PY, f"{LAB}/infer_server.py", GEN, str(p), f"backend-{i}"]
        if max_age:
            a += ["--max-age", str(max_age)]
        ps.append(subprocess.Popen(a, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    time.sleep(1.2)
    return ps


def start_nginx(tag, which):
    d = os.path.join(WORK, f"ngx_{tag}"); os.makedirs(os.path.join(d, "tmp"), exist_ok=True)
    nginx_conf(d, which)
    p = subprocess.Popen([NGINX, "-p", d, "-c", os.path.join(d, "nginx.conf")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    return p, d


def stop(ps):
    for p in ps:
        p.terminate()
    for p in ps:
        try:
            p.wait(5)
        except subprocess.TimeoutExpired:
            p.kill()


def channel(target, lb=None):
    opts = [("grpc.use_local_subchannel_pool", 1)]
    if lb:
        opts.append(("grpc.lb_policy_name", lb))
    return grpc.insecure_channel(target, opts)


def counts(target, lb=None, n=30):
    ch = channel(target, lb); who = pbg.InferenceStub(ch).Who; c = {}
    for _ in range(n):
        r = who(pb.WhoRequest(), timeout=3)
        c[r.backend] = c.get(r.backend, 0) + 1
    ch.close()
    return dict(sorted(c.items()))


DIRECT3 = "ipv4:" + ",".join(f"127.0.0.1:{p}" for p in BK.values())
DIRECT2 = "ipv4:" + ",".join(f"127.0.0.1:{BK[i]}" for i in (1, 2))
res = dict(grpcio=grpc.__version__, recorded=time.strftime("%Y-%m-%d %H:%M %Z"), counts=[], timelines=[])

# Part 1
bs = start_backends(); ng, d = start_nginx("counts", [1, 2, 3])
try:
    for label, target, lb, note in [
        ("client, default policy (pick_first)", DIRECT3, None, "the channel knows all three addresses but the default policy uses the first that connects"),
        ("client, round_robin", DIRECT3, "round_robin", "one connection per backend, calls rotate"),
        ("L4 balancer (nginx stream)", "127.0.0.1:30530", None, "one TCP connection, one backend chosen once"),
        ("L7 balancer (nginx grpc_pass)", "127.0.0.1:30534", None, "nginx reads every call and picks a backend per call"),
    ]:
        res["counts"].append(dict(setup=label, target=target, lb=lb or "pick_first", n=30, answers=counts(target, lb), note=note))
    three = {}
    for _ in range(3):
        for k, v in counts("127.0.0.1:30530", None, 10).items():
            three[k] = three.get(k, 0) + v
    res["counts"].append(dict(setup="L4 balancer, three channels of 10 calls", target="127.0.0.1:30530", lb="pick_first", n=30, answers=dict(sorted(three.items())),
                              note="each channel opens its own connection (grpc.use_local_subchannel_pool=1), so the balancer chooses three times"))
finally:
    stop([ng] + bs)
time.sleep(0.5)


def timeline(label, target, lb, max_age, uses_nginx, note):
    bs = start_backends(max_age); procs = list(bs); d = None
    if uses_nginx:
        ng, d = start_nginx(label.split()[0].lower() + str(len(res["timelines"])), [1, 2]); procs.append(ng)
    try:
        ch = channel(target, lb); who = pbg.InferenceStub(ch).Who
        calls = []; t0 = time.time(); joined = None
        while time.time() - t0 < 7.0:
            if joined is None and time.time() - t0 >= 1.5:
                joined = round(time.time() - t0, 3)
                if uses_nginx:
                    nginx_conf(d, [1, 2, 3]); os.kill(ng.pid, signal.SIGHUP)
            t = time.time()
            try:
                r = who(pb.WhoRequest(), timeout=3); b = r.backend
            except grpc.RpcError as e:
                b = e.code().name
            calls.append([round(t - t0, 3), b])
            time.sleep(max(0, 0.05 - (time.time() - t)))
        ch.close()
    finally:
        stop(procs)
    tot = {}
    for _, b in calls:
        tot[b] = tot.get(b, 0) + 1
    after = {}
    for t, b in calls:
        if t >= joined:
            after[b] = after.get(b, 0) + 1
    res["timelines"].append(dict(setup=label, target=target, lb=lb or "pick_first", max_connection_age_s=max_age or None, backend3_joined_s=joined,
                                 calls=calls, totals=dict(sorted(tot.items())), after_join=dict(sorted(after.items())), note=note))
    time.sleep(0.5)


timeline("L4 balancer", "127.0.0.1:30530", None, 0, True, "nginx stream; backend-3 added to its list by a reload at 1.5 s")
timeline("L4 balancer + max connection age 1 s", "127.0.0.1:30530", None, 1, True, "backends close each connection with GOAWAY after about 1 s (+-10%); the client reconnects through the balancer")
timeline("L7 balancer", "127.0.0.1:30534", None, 0, True, "nginx grpc_pass; backend-3 added by a reload at 1.5 s")
timeline("client round_robin, fixed list", DIRECT2, "round_robin", 0, False, "the client was given backend-1 and backend-2; nothing tells it about backend-3")
json.dump(res, open(OUT, "w"), indent=1)
for c in res["counts"]:
    print(c["setup"], c["answers"])
for t in res["timelines"]:
    print(t["setup"], t["totals"], "after join", t["after_join"])
