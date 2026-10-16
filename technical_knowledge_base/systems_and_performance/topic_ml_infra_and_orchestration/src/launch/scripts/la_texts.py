"""Launch lab: prose that carries measured numbers, generated from the same JSON the charts use.

texts(D, load) returns extra keys for window.LA: tltext, stnote, tlnotes, envnote, rzsrc, pgtext, hangsum, tools,
dns, srcbox, pullhtml, drills. Every number below is read from src/launch/out/*.json.
"""
import html

GH = "https://github.com/pytorch/pytorch/blob/v2.14.1/"
SYS = {"slurm": "Slurm", "k8s": "Kubernetes", "ray": "Ray"}
MEAS = '<span class="la-meas">measured</span> on Apple M1 Pro, Docker Desktop VM, shared machine'


def e(s):
    return html.escape(str(s), quote=False)


def gh(path, a, b=None, label=None):
    frag = f"#L{a}" + (f"-L{b}" if b else "")
    lab = label or f"{path.split('/')[-1]} line{'s' if b else ''} {a}{'-' + str(b) if b else ''}"
    return f'<a href="{GH}{path}{frag}" target="_blank" rel="noopener noreferrer">{lab}</a>'


def f1(x):
    return f"{x:.1f}"


def f2(x):
    return f"{x:.2f}"


def stage(sumd, key):
    for s in sumd["stages"]:
        if key.lower() in s["stage"].lower():
            return s
    raise KeyError(key)


def texts(D, load):
    T = D["times"]
    out = {}
    sl, k8, ry = T["slurm"]["summary"], T["k8s"]["summary"], T["ray"]["summary"]
    # ---- section 3 prose ----
    imp_s = stage(sl, "torchrun imports")["median"]
    wimp_s = stage(sl, "spawn workers")["median"]
    pg_s = stage(sl, "init_process_group")["median"]
    pg_k = stage(k8, "init_process_group")["median"]
    pg_r = stage(ry, "init_process_group")["median"]
    rd_s = stage(sl, "rendezvous")["median"]
    rd_k = stage(k8, "rendezvous")["median"]
    q_s = stage(sl, "queue and dispatch")["median"]
    adm_k = stage(k8, "admit")["median"]
    out["tltext"] = (
        f'<p><b>What the numbers say</b> ({MEAS}; median of {sl["n"]}, {k8["n"]} and {ry["n"]} runs; the image was already on '
        f'every node). Submit to first step took a median <b>{f1(sl["total"]["median"])} s on Slurm</b>, '
        f'<b>{f1(k8["total"]["median"])} s on Kubernetes</b> and <b>{f1(ry["total"]["median"])} s on Ray</b>. '
        f'The scheduler\'s own part is small here: Slurm went from <code>sbatch</code> to the batch script in {f2(q_s)} s, '
        f'and Kubernetes from <code>kubectl create</code> through Kueue admission, pod scheduling and container start in {f2(adm_k)} s, '
        f'because the cluster was empty. Most of the time is Python: every torchrun agent imports torch '
        f'({f1(imp_s)} s on Slurm), then every worker process imports it again ({f1(wimp_s)} s). '
        f'The rendezvous itself took {f2(rd_s)} s on Slurm and {f2(rd_k)} s on Kubernetes. The difference is the protocol, not the scheduler: '
        f'the c10d (dynamic) backend re-reads the shared state with a 1 s pause between polls ({gh("torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", 685)}), so the agent that arrived first notices the second up to a second late; '
        f'the static backend just waits on the store and returns the moment both agents have connected. <code>init_process_group</code> over gloo took {pg_s*1000:.0f} ms (Slurm), {pg_k*1000:.0f} ms (Kubernetes) '
        f'and {pg_r*1000:.0f} ms (Ray, where it includes waiting for the slowest worker). On Ray the cluster\'s processes are already running, so there is no container start, but the '
        f'driver, Ray Train\'s controller and a placement group come first.</p>')
    out["stnote"] = ("Each bar is one run, coloured by stage as in the legend above. Times from the probes' timestamps on the Docker VM clock; "
                     "stage boundaries are when the last node or rank reached them. Raw numbers: <code>src/launch/out/launch_times.json</code>.")
    out["tlnotes"] = {
        "slurm": "Per-node lanes: each torchrun's import and its wait in the rendezvous; per-rank lanes: each worker's import and init_process_group.",
        "k8s": "Per-node lanes are the two pods. The API objects give coarser checkpoints (1-second resolution): see the JSON for Kueue admission and pod scheduling times.",
        "ray": "Worker lanes: from the moment Ray set up each worker process to the end of its init_process_group (grey: started, waiting for the rest of the group).",
    }
    out["envnote"] = {
        "slurm": "Slurm run 1: srun started one task per node; torchrun then set the PyTorch variables. Note MASTER_PORT: not 29500 (section 5's prediction).",
        "k8s": "Kubernetes run 1: the kubelet started the pods; torchrun (static rendezvous) set the PyTorch variables; MASTER_PORT is 29500.",
        "ray": "Ray run 1: Ray Train set the variables in each worker actor before calling init_process_group; there is no torchrun, so no TORCHELASTIC_ variables and no GROUP_RANK.",
    }
    # ---- rendezvous source box ----
    p_dyn = "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py"
    out["rzsrc"] = (
        '<div class="la-src"><b>Read the source</b> (torch 2.14.1, identical in the installed package and at tag v2.14.1):'
        '<pre>_DEFAULT_TIMEOUTS = {\n    "join": timedelta(seconds=600),\n    "last_call": timedelta(seconds=30),\n    "close": timedelta(seconds=30),\n    "heartbeat": timedelta(seconds=5),\n}</pre>'
        f'<div class="f">{gh(p_dyn, 143, 148)}: the agents\' rendezvous gives up after 600 s (<code>--rdzv-conf join_timeout=...</code> changes it).</div>'
        '<pre>if len(state.participants) == self._settings.min_nodes:\n    state.deadline = (\n        datetime.now(timezone.utc) + self._settings.timeout.last_call\n    )\n\nif len(state.participants) == self._settings.max_nodes:\n    self._mark_rendezvous_complete()</pre>'
        f'<div class="f">{gh(p_dyn, 743, 749)}: with <code>--nnodes=2</code> (min = max = 2) the round completes the moment the second agent joins; with <code>--nnodes=1:4</code> it would wait up to 30 s more for latecomers once one node has arrived.</div>'
        '<pre>is_host = _matches_machine_hostname(host)\n...\nread_timeout = cast(int, params.get_as_int("read_timeout", 60))\n...\nstore = TCPStore(host, port, is_master=is_server,\n                 multi_tenant=True, timeout=timedelta(seconds=read_timeout))</pre>'
        f'<div class="f">{gh("torch/distributed/elastic/rendezvous/c10d_rendezvous_backend.py", 145, 162)}: the agent whose host name or address matches the endpoint hosts the store; everyone else connects as a client and has 60 s to reach it.</div>'
        '<pre>auto deadline = std::chrono::steady_clock::now() + opts.timeout;\n...\n} catch (const c10::DistNetworkError&amp; ex) {\n  if (deadline &lt; std::chrono::steady_clock::now()) {\n    C10D_ERROR("TCP client failed to connect/validate to host {}:{} - timed out ...");\n    throw;\n  }\n  auto delayDuration = backoff-&gt;nextBackoff();\n  C10D_WARNING("TCP client failed to connect/validate to host {}:{} - retrying ...");</pre>'
        f'<div class="f">{gh("torch/csrc/distributed/c10d/TCPStore.cpp", 308, 353)}: a store client retries with exponential back-off until its deadline, which is why a wrong address is a wait, not an instant error. The static backend instead builds the store with the world size and a timeout that is 600 s in its own file but 900 s when started by torchrun, whose launcher fills in that default ({gh("torch/distributed/elastic/rendezvous/static_tcp_rendezvous.py", 65, 73)}; {gh("torch/distributed/launcher/api.py", 125, 130)}); its server waits for every agent: "Timed out after {{}} seconds waiting for clients. {{}}/{{}} clients joined." ({gh("torch/csrc/distributed/c10d/TCPStore.cpp", 399)}).</div></div>')
    out["srcbox"] = (
        '<h4>Source read for this lab (pinned)</h4><ul class="tight small">'
        f'<li>PyTorch 2.14.1, compared byte for byte with the installed package: {gh("torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", 144, 145, "dynamic_rendezvous.py")} (join and last-call timeouts, join logic lines 743-749 and 906-922, the workers\' store lines 1209-1217); '
        f'{gh("torch/distributed/elastic/rendezvous/c10d_rendezvous_backend.py", 145, 184, "c10d_rendezvous_backend.py")} (who hosts the store, client timeout, fallback to client); '
        f'{gh("torch/distributed/elastic/rendezvous/static_tcp_rendezvous.py", 28, 73, "static_tcp_rendezvous.py")}; {gh("torch/distributed/launcher/api.py", 125, 130, "launcher/api.py")} (the 900 s default); '
        f'{gh("torch/distributed/elastic/rendezvous/api.py", 89, 106, "rendezvous/api.py")} (MASTER_ADDR/PORT published through the store); {gh("torch/distributed/elastic/agent/server/local_elastic_agent.py", 424, 441, "local_elastic_agent.py")} (worker environment); '
        f'{gh("torch/distributed/rendezvous.py", 204, 222, "rendezvous.py")} (env:// reuses the agent\'s store); {gh("torch/csrc/distributed/c10d/TCPStore.cpp", 308, 406, "TCPStore.cpp")} (client retry loop, server waiting for clients); {gh("torch/csrc/distributed/c10d/socket.cpp", 845, None, "socket.cpp")} (the gai warning).</li>'
        '<li>Ray 2.59.0 (installed): <code>ray/train/torch/config.py</code> lines 167-181 and 208-265 (environment and process group set-up), <code>ray/train/v2/_internal/constants.py</code> lines 39-44 and <code>worker_group.py</code> lines 300-305 (start timeout).</li>'
        '<li>NCCL: documentation only (NCCL 2.32.3 environment variables page).</li></ul>'
        '<p class="small mute">Notes, scripts and every raw output: <code>src/launch/</code> (README, sources.md, scripts/, out/, raw_scrubbed/).</p>')
    # ---- the rest comes from the experiments ----
    extra = load("texts_extra.json", {})
    out.update(extra)
    return out
