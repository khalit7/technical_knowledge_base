#!/usr/bin/env python3
"""Launch lab: out/texts_extra.json (summary table of broken launches, the debugging tools on the stalled run, the
diagnosis drills, the DNS card) from the evidence and out/hangs.json. Also saves out/tools.json (py-spy and flight
recorder extracts) so the page's text can be checked against data.
usage: python3 la_extra.py <evidence root>
"""
import glob, html, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")
sys.path.insert(0, HERE)
from la_collect import scrub  # noqa: E402

e = lambda s: html.escape(str(s), quote=False)
GH = "https://github.com/pytorch/pytorch/blob/v2.14.1/"


def jl(p):
    with open(p) as f:
        return json.load(f)


def main():
    root = sys.argv[1]
    H = {h["id"]: h for h in jl(os.path.join(OUT, "hangs.json"))}
    X = {}
    # ---- summary table ----
    gov = {
        "sl-miss": "torchrun c10d join timeout, 600 s", "k8s-miss": "torchrun static store timeout, 900 s (launcher default)",
        "ray-miss": "Ray Train worker-group start timeout, 60 s, then retried forever", "k8s-addr": "torchrun static store timeout, 900 s",
        "sl-typo": "c10d store client read_timeout, 60 s (took longer)", "sl-local": "c10d join timeout, 600 s",
        "sl-coll": "the other job's join timeout, 600 s", "sl-ws": "process-group timeout (120 s here; 30 min default)",
        "k8s-stall": "process-group timeout (60 s here; 30 min gloo, 10 min NCCL default)"}
    first = {
        "sl-miss": "nothing for 600 s, then a bare RendezvousTimeoutError", "k8s-miss": "nothing for 900 s, then \"1/2 clients joined\"",
        "ray-miss": "\"worker group startup timed out\" every minute", "k8s-addr": "pod 1: gai warnings; pod 0: \"1/2 clients joined\" after 900 s",
        "sl-typo": "gai warnings, then \"timed out after 60000ms\"", "sl-local": "nothing for 600 s, then RendezvousTimeoutError",
        "sl-coll": "\"Did the remote server shutdown or crash?\"", "sl-ws": "\"wait timeout after 120000ms, keys: /default_pg/0//cpu//0/0\"",
        "k8s-stall": "send and recv timeouts, and a misleading \"remote worker crashing\""}
    rows = "".join(
        f'<tr><td data-h="Case"><b>{e(h["short"])}</b></td><td data-h="First error after" class="num">{h["t_err"]:.0f} s</td>'
        f'<td data-h="What you see">{e(first[k])}</td><td data-h="Governed by">{e(gov[k])}</td></tr>' for k, h in H.items())
    X["hangsum"] = ('<h4>All broken launches at a glance</h4><div class="tw"><table class="la-tbl"><thead><tr><th>Case</th><th class="num">First error after</th><th>What you see</th><th>Governed by</th></tr></thead><tbody>'
                    + rows + '</tbody></table></div><p class="small mute">Each case ran once (the times are set by timeouts, so they repeat: two independent 600 s cases gave 601 and 602 s, two 900 s cases 902 and 903 s). '
                    'Every waiting process held its CPUs and (fake) GPUs the whole time. On a real cluster, multiply by the allocation: a 64-node, 512-GPU job that loses one node before the rendezvous idles 512 &times; 10 min = 85 GPU-hours before torchrun says anything (calculation).</p>')
    # ---- tools on the stalled run ----
    d = os.path.join(root, "k8s", "la-stall"); rr = os.path.join(root, "k8s_runs", "la-stall")
    ps = {}
    for r in range(4):
        t = scrub(open(os.path.join(d, f"pyspy_rank{r}.txt")).read())
        ps[r] = [l for l in t.splitlines() if l.startswith("    ")]
    fr = {}
    for r in range(4):
        tag = "sigusr1" if r == 3 else "error"
        ents = jl(os.path.join(rr, f"fr_rank{r}_{tag}.json"))["entries"]
        fr[r] = [(x["collective_seq_id"], x["profiling_name"], x["input_sizes"]) for x in ents]
    json.dump({"pyspy": ps, "fr": fr}, open(os.path.join(OUT, "tools.json"), "w"), indent=1)
    last = {r: fr[r][-1][0] for r in fr}
    FRLINK = '<a href="' + GH + 'torch/csrc/distributed/c10d/FlightRecorder.hpp#L110" target="_blank" rel="noopener noreferrer">FlightRecorder.hpp:110</a>'
    frrows = "".join(f'<tr><td data-h="Rank">rank {r}</td><td data-h="Last collective" class="num">#{last[r]}</td><td data-h="Its name">{e(fr[r][-1][1])}</td><td data-h="All recorded">' +
                     ", ".join(f'#{s} {n.split(":")[1]}' for s, n, _ in fr[r]) + '</td></tr>' for r in sorted(fr))
    X["tools"] = (
        '<div class="la-card"><h4>1. Where is each process right now? <code>py-spy dump</code></h4>'
        '<p class="small">py-spy reads a running Python process\'s stack from outside, without stopping it. In Kubernetes the pod has no permission to trace other processes (the VM\'s <code>ptrace_scope</code> is 1 and pods lack CAP_SYS_PTRACE), so it ran from the node, against the pod\'s process ID as the node sees it, 15 s after the stall began:</p>'
        '<div class="la-two"><div><pre>rank 3 (the stalled one)\n' + e("\n".join(ps[3])) + '</pre><div class="la-codecap"><code>train.py:166</code> is <code>time.sleep(a.slow_ms / 1000)</code>: the injected stall.</div></div>'
        '<div><pre>rank 0 (one of the waiting ones)\n' + e("\n".join(ps[0])) + '</pre><div class="la-codecap">Inside DDP\'s forward: step 2 begins by rebuilding gradient buckets, which broadcasts across ranks and waits for rank 3. Rank 2 was inside <code>backward</code> (<code>train.py:156</code>), also blocked on a collective.</div></div></div>'
        '<p class="small">On a real job you would run it on a handful of ranks (<code>py-spy dump --pid</code>, add <code>--native</code> for C++ frames): the outlier stack is the answer.</p></div>'
        '<div class="la-card"><h4>2. Who is behind? The flight recorder</h4>'
        f'<p class="small">PyTorch keeps a ring buffer of each rank\'s last collectives (2,000 by default, <code>TORCH_FR_BUFFER_SIZE</code>), with a sequence number per process group; in torch 2.14 gloo records into it too ({FRLINK}). The probe dumped it with <code>torch._C._distributed_c10d._dump_fr_trace_json()</code> when a rank failed, and on <code>SIGUSR1</code> for the sleeping rank 3:</p>'
        '<div class="tw"><table class="la-tbl"><thead><tr><th>Rank</th><th class="num">Last collective</th><th>Its name</th><th>All recorded (sequence number, kind)</th></tr></thead><tbody>' + frrows + '</tbody></table></div>'
        f'<p class="small">Rank 3 stopped at #{last[3]} (the loss all-reduce of step 1); every other rank had issued #{min(last[r] for r in (0, 1, 2))} or later. The rank with the lowest sequence number is the one the others are waiting for. #1 to #3 are DDP\'s start-up (shape check, then broadcasting rank 0\'s weights), #4 the gradient all-reduce, #5 the running example\'s loss all-reduce, #6 onwards step 2. With NCCL the same dump is written automatically on a timeout when <code>TORCH_NCCL_DUMP_ON_TIMEOUT=1</code>; PyTorch ships a <code>torchfrtrace</code> analyser that compares the dumps of all ranks.</p></div>'
        '<div class="la-card"><h4>3. More logs: <code>TORCH_DISTRIBUTED_DEBUG</code> and <code>NCCL_DEBUG</code> <span class="la-doc">documented</span></h4>'
        '<p class="small"><code>TORCH_DISTRIBUTED_DEBUG=INFO</code> or <code>DETAIL</code> makes DDP log its bucketing and unused parameters; <code>DETAIL</code> also wraps every collective with a check that all ranks call the same collective with the same shapes, and reports the mismatch instead of hanging, at a cost in speed (use it to reproduce, not in production). <code>NCCL_DEBUG=INFO</code> (section 6) shows which interface and transport each rank chose, which is where most GPU start-up hangs are found. <code>TORCH_CPP_LOG_LEVEL=INFO</code> shows the store\'s connect and retry messages seen in the cases above.</p></div>')
    # ---- DNS card ----
    dn0 = scrub(open(os.path.join(root, "k8s_runs", "la-t1", "dns_1.txt")).read()).splitlines()
    svc = jl(os.path.join(root, "k8s", "la-t1", "svc.json"))["spec"]
    pods = jl(os.path.join(root, "k8s", "la-t1", "pods.json"))["items"]
    p1 = [p for p in pods if p["metadata"]["name"].startswith("la-t1-node-0-1")][0]
    tdns = float(dn0[0]); a0 = jl(os.path.join(root, "k8s_runs", "la-t1", "agent_la-t1-node-0-0.json"))
    X["dns"] = ('<div class="la-card"><h4>The headless Service, as it ran (Kubernetes run 1)</h4>'
                '<div class="la-two"><div><pre>' + e(json.dumps({k: svc[k] for k in ("clusterIP", "publishNotReadyAddresses", "selector")}, indent=1)) + '</pre><div class="la-codecap">The Service JobSet created, named after the JobSet: no virtual IP (<code>clusterIP: None</code>), and it publishes pods that are not ready yet.</div></div>'
                '<div><pre>pod spec (set by JobSet):\n  hostname:  ' + e(p1["spec"].get("hostname", "")) + '\n  subdomain: ' + e(p1["spec"].get("subdomain", "")) + '\n\ngetent hosts la-t1-node-0-0.la-t1   (in pod 1)\n' + e("\n".join(dn0[1:3])) + '</pre><div class="la-codecap">' +
                f'Pod 1 resolved pod 0\'s name at its own start-up, {abs(a0["t0"] - tdns):.2f} s before pod 0\'s torchrun had even begun: the name exists as soon as the pod has an address. <code>ndots:5</code> and the search list are why the short form <code>la-t1-node-0-0.la-t1</code> works inside the namespace.</div></div></div></div>')
    # ---- process group text ----
    T = jl(os.path.join(OUT, "launch_times.json"))["systems"]
    med = {s: [x for x in T[s]["summary"]["stages"] if "init_process_group" in x["stage"]][0] for s in T}
    X["pgtext"] = (f'Measured here, with 4 ranks on 2 containers: <code>init_process_group</code> over gloo took a median {med["slurm"]["median"] * 1000:.0f} ms on Slurm, '
                   f'{med["k8s"]["median"] * 1000:.0f} ms on Kubernetes and {med["ray"]["median"] * 1000:.0f} ms on Ray ({MEAS}; on Ray it includes waiting for the slowest worker to arrive, since Ray Train calls it in all workers at once). '
                   'It is fast because every rank was already waiting at the store: the expensive part of start-up is getting every process to that point, and on GPUs, NCCL\'s own bootstrap and topology detection after it.')
    # ---- drills ----
    D = []
    D.append({"q": "Ten minutes after submission the job log shows only this. What happened?", "log": "job 72 nodes c[1-2] rendezvous c1:29500\ntorch.distributed.elastic.rendezvous.api.RendezvousTimeoutError\nsrun: error: c1: task 0: Exited with exit code 1\nsrun: error: c2: task 1: Terminated",
              "opts": [["The rendezvous port 29500 is blocked by a firewall", 0], ["Node c2 never started its torchrun (or never reached the store), so c1 waited the full 600 s join timeout", 1], ["The model ran out of memory on c1", 0]],
              "ans": "A port blocked by a firewall would show connection warnings on c2, which logged nothing at all. Nothing from c2 plus a join timeout on c1 means c2's agent never joined: look at c2's own task (here it was sleeping on purpose)."})
    D.append({"q": "Pod 1 of a JobSet logs this over and over. What is wrong?", "log": "[c10d] The IPv6 network addresses of (la-badaddr-node-0-0, 29500) cannot be retrieved (gai error: -2 - Name or service not known).",
              "opts": [["Pod 0 has crashed", 0], ["The rendezvous address is the pod's short host name; it resolves only inside pod 0. Use the name under the headless Service (la-badaddr-node-0-0.la-badaddr)", 1], ["IPv6 is disabled in the cluster", 0]],
              "ans": "gai error -2 is a name that does not resolve. The kubelet puts a pod's own short name in its /etc/hosts, so the name works in pod 0 and nowhere else; cluster DNS knows <code>&lt;hostname&gt;.&lt;subdomain&gt;</code>. The IPv6 wording is just the first address family tried."})
    D.append({"q": "Three ranks print this after exactly the process-group timeout. Which rank do you investigate?", "log": H["k8s-stall"]["err"],
              "opts": [["Rank 0: it reports a crashed remote worker", 0], ["Rank 1 or 2: they timed out", 0], ["Rank 3: it is the only one that printed nothing; check where it is (py-spy) and the flight recorder's sequence numbers", 1]],
              "ans": "Every message here is a symptom. The silent rank is the suspect: in this run py-spy showed it sleeping in <code>train.py:166</code> and the flight recorder showed it one collective behind all others."})
    D.append({"q": "Two ranks of a three-task srun job fail with this after 120 s. Cause?", "log": "torch.distributed.DistStoreError: wait timeout after 120000ms, keys: /default_pg/0//cpu//0/0",
              "opts": [["WORLD_SIZE says 4 but only 3 processes exist: they wait for rank 3's address", 1], ["The store on rank 0 is overloaded", 0], ["gloo is not installed", 0]],
              "ans": "The key is the store entry where gloo's rank 3 would post its address; nobody ever writes it. Read WORLD_SIZE from the launcher (<code>SLURM_NTASKS</code>) instead of hard-coding it."})
    X["drills"] = D
    json.dump(X, open(os.path.join(OUT, "texts_extra.json"), "w"), indent=1)
    print("extra ok", list(X))


MEAS = '<span class="la-meas">measured</span> on Apple M1 Pro, Docker Desktop VM, shared machine'

if __name__ == "__main__":
    main()
