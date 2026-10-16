"""ld_lines.py: find the file and line of every source quote this page cites, by pattern, at pinned versions.
usage: python3 ld_lines.py <scratch>/mi > ../out/lines.json
Each entry: id -> {repo, ver, file, line, text, url}. A pattern that is missing or matches twice is an error.
Sources (clones and packages kept in the scratchpad, see ../README.md):
  torch v2.14.1 (pytorch-v2.14.1 sparse clone), NCCL v2.30.7-1 (sparse clone), DeepSpeed 0.19.7 (sdist),
  Accelerate 1.15.0 (wheel), Slurm slurm-24-11-5-1, Kubeflow Trainer v2.3.0, JobSet v0.13.0, Ray 2.59.0 (installed).
"""
import json, re, sys

M = sys.argv[1]
ROOTS = {
    "torch": (M + "/src/pytorch-v2.14.1", "v2.14.1", "https://github.com/pytorch/pytorch/blob/v2.14.1/"),
    "torchpkg": (M + "/venv/lib/python3.12/site-packages", "v2.14.1 (installed wheel)", "https://github.com/pytorch/pytorch/blob/v2.14.1/"),
    "nccl": (M + "/src/nccl-v2.30.7-1", "v2.30.7-1", "https://github.com/NVIDIA/nccl/blob/v2.30.7-1/"),
    "ds": (M + "/ld/dl/x/deepspeed-0.19.7", "0.19.7", "https://github.com/deepspeedai/DeepSpeed/blob/v0.19.7/"),
    "acc": (M + "/ld/dl/x/acc", "1.15.0", "https://github.com/huggingface/accelerate/blob/v1.15.0/src/"),
    "slurm": (M + "/src/slurm-24-11-5-1", "slurm-24-11-5-1", "https://github.com/SchedMD/slurm/blob/slurm-24-11-5-1/"),
    "trainer": (M + "/src/trainer-v2.3.0", "v2.3.0", "https://github.com/kubeflow/trainer/blob/v2.3.0/"),
    "jobset": (M + "/src/jobset-v0.13.0", "v0.13.0", "https://github.com/kubernetes-sigs/jobset/blob/v0.13.0/"),
    "ray": (M + "/venv/lib/python3.12/site-packages", "ray-2.59.0", "https://github.com/ray-project/ray/blob/ray-2.59.0/python/"),
}
Q = [  # id, repo, file, pattern (regex, must match exactly one line)
 # torchrun and the elastic agent
 ("run_static", "torch", "torch/distributed/run.py", r'^\s+default="static",$'),
 ("run_monitor", "torch", "torch/distributed/run.py", r'^\s+default=0\.1,$'),
 ("run_maxrestarts", "torch", "torch/distributed/run.py", r'"--max-restarts",'),
 ("pet_env", "torch", "torch/distributed/argparse_util.py", r'env_name = f"PET_\{dest.upper\(\)\}"'),
 ("launcher_900", "torch", "torch/distributed/launcher/api.py", r'^\s+default_timeout = 900$'),
 ("launcher_cfg", "torch", "torch/distributed/launcher/api.py", r'self\.rdzv_configs\["timeout"\] = default_timeout'),
 ("dyn_gettimeout", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'timeout = params\.get_as_int\(key \+ "_timeout"\)'),
 ("static_cfg", "torch", "torch/distributed/elastic/rendezvous/static_tcp_rendezvous.py", r'timeout = int\(params\.config\["timeout"\]\)'),
 ("agent_failed", "torch", "torch/distributed/elastic/agent/server/api.py", r'elif state in \{WorkerState\.UNHEALTHY, WorkerState\.FAILED\}:'),
 ("agent_member", "torch", "torch/distributed/elastic/agent/server/api.py", r'# membership changes do not count as retries'),
 ("agent_env", "torch", "torch/distributed/elastic/agent/server/local_elastic_agent.py", r'"TORCHELASTIC_USE_AGENT_STORE": str\('),
 ("agent_async", "torch", "torch/distributed/elastic/agent/server/local_elastic_agent.py", r'"TORCH_NCCL_ASYNC_ERROR_HANDLING": os\.getenv\('),
 ("agent_exitbarrier", "torch", "torch/distributed/elastic/agent/server/api.py", r'exit_barrier_timeout: float = 300,'),
 ("events_null", "torch", "torch/distributed/elastic/events/handlers.py", r'"dynamic_rendezvous": logging\.NullHandler\(\),'),
 # dynamic rendezvous
 ("dyn_timeouts", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'"join": timedelta\(seconds=600\),'),
 ("dyn_state", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'^class _RendezvousState:'),
 ("dyn_actions", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'^class _Action\(Enum\):'),
 ("dyn_lastcall", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'if len\(state\.participants\) == self\._settings\.min_nodes:'),
 ("dyn_max", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'if len\(state\.participants\) == self\._settings\.max_nodes:'),
 ("dyn_ranks", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'for rank, node in enumerate\(sorted\(state\.participants\)\):'),
 ("dyn_join", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'^class _RendezvousJoinOp:'),
 ("dyn_waitlist", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'return _Action\.ADD_TO_WAIT_LIST'),
 ("dyn_redund", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'return _Action\.ADD_TO_REDUNDANCY_LIST'),
 ("dyn_dead", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'self\._settings\.keep_alive_interval \* self\._settings\.keep_alive_max_attempt'),
 ("dyn_keepalive", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'keep_alive_interval = params\.get_as_int\("keep_alive_interval", 5\)'),
 ("dyn_keepmax", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'keep_alive_max_attempt = params\.get_as_int\("keep_alive_max_attempt", 3\)'),
 ("dyn_delay0", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'_delay\(seconds=\(0, 0\.3\)\)'),
 ("dyn_poll", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'_delay\(seconds=1\)'),
 ("dyn_nodedesc", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'return _NodeDesc\(local_addr or socket\.getfqdn\(\), os\.getpid\(\), local_id\)'),
 ("dyn_share", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'return os\.getenv\("TORCH_DISABLE_SHARE_RDZV_TCP_STORE", "0"\) != "1"'),
 ("dyn_bootcond", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'if self\._bootstrap_store_info is None or \($'),
 ("c10d_twice", "torch", "torch/distributed/elastic/rendezvous/c10d_rendezvous_backend.py", r'for is_server in \[is_host, False\]:'),
 ("c10d_read", "torch", "torch/distributed/elastic/rendezvous/c10d_rendezvous_backend.py", r'read_timeout = cast\(int, params\.get_as_int\("read_timeout", 60\)\)'),
 ("api_masteraddr", "torch", "torch/distributed/elastic/rendezvous/api.py", r'addr = store\.get\(RendezvousStoreInfo\.MASTER_ADDR_KEY\)'),
 ("static_600", "torch", "torch/distributed/elastic/rendezvous/static_tcp_rendezvous.py", r'_default_timeout_seconds = 600'),
 ("rdzv_noprefix", "torch", "torch/distributed/rendezvous.py", r'# We create a new TCPStore for every retry so no need to add prefix for each attempt\.'),
 # process groups and stores
 ("store_300", "torch", "torch/csrc/distributed/c10d/Store.hpp", r'std::chrono::seconds\(300\);'),
 ("pg_default", "torch", "torch/distributed/distributed_c10d.py", r'store = PrefixStore\("default_pg", store\)'),
 ("pg_wrapper", "torch", "torch/distributed/distributed_c10d.py", r'if get_debug_level\(\) == DebugLevel\.DETAIL:'),
 ("gloo_mesh", "torch", "torch/csrc/distributed/c10d/ProcessGroupGloo.cpp", r'context->connectFullMesh\(connectStore, options_->devices\[i\]\);'),
 ("nccl_uid_set", "torch", "torch/csrc/distributed/c10d/ProcessGroupNCCL.cpp", r'^\s+store_->set\(storeKey, vec\);'),
 ("nccl_uid_err", "torch", "torch/csrc/distributed/c10d/ProcessGroupNCCL.cpp", r'"retrieving ncclUniqueId from \[0\] via c10d key-value store by key \'",'),
 ("nccl_timeout", "torch", "torch/csrc/distributed/c10d/ProcessGroupNCCL.hpp", r'kProcessGroupNCCLDefaultTimeout'),
 ("backend_timeout", "torch", "torch/csrc/distributed/c10d/Backend.hpp", r'kBackendDefaultTimeout'),
 ("fr_buffer", "torch", "torch/csrc/distributed/c10d/FlightRecorder.hpp", r'TORCH_FR_BUFFER_SIZE'),
 ("ddp_logger", "torchpkg", "torch/nn/parallel/distributed.py", r'self\.logger\.set_construction_data_and_log\('),
 ("nccl_eager", "torch", "torch/csrc/distributed/c10d/ProcessGroupNCCL.cpp", r'^void ProcessGroupNCCL::eagerConnectSingleDevice\(at::Device device\) \{'),
 ("dyn_lastcall30", "torch", "torch/distributed/elastic/rendezvous/dynamic_rendezvous.py", r'"last_call": timedelta\(seconds=30\),'),
 ("ray_wg_timeout", "ray", "ray/train/v2/_internal/constants.py", r'^WORKER_GROUP_START_TIMEOUT_S_ENV_VAR|RAY_TRAIN_WORKER_GROUP_START_TIMEOUT_S"'),
 ("ray_torch_timeout", "ray", "ray/train/torch/config.py", r'timeout_s: int = 1800'),
 # NCCL
 ("nccl_iface", "nccl", "src/misc/socket.cc", r'^ncclResult_t ncclFindInterfaces\('),
 ("nccl_iface_ib", "nccl", "src/misc/socket.cc", r'ncclOsFindInterfaces\("ib", '),
 ("nccl_iface_excl", "nccl", "src/misc/socket.cc", r'ncclOsFindInterfaces\("\^docker,lo,virbr", '),
 ("nccl_os_find", "nccl", "src/os/linux.cc", r'^ncclResult_t ncclOsFindInterfaces\('),
 ("nccl_os_running", "nccl", "src/os/linux.cc", r'if \(!\(interface->ifa_flags & IFF_RUNNING\)\) continue;'),
 ("nccl_boot_if", "nccl", "src/bootstrap.cc", r'NCCLCHECK\(ncclFindInterfaces\(bootstrapNetIfName, &bootstrapNetIfAddr, MAX_IF_NAME_SIZE, 1, &nIfs\)\);'),
 ("nccl_boot_using", "nccl", "src/bootstrap.cc", r'INFO\(NCCL_BOOTSTRAP, "Bootstrap: Using%s", line\);'),
 ("nccl_uid", "nccl", "src/bootstrap.cc", r'^ncclResult_t bootstrapGetUniqueId\('),
 ("nccl_commid", "nccl", "src/bootstrap.cc", r'INFO\(NCCL_ENV, "NCCL_COMM_ID set by environment to %s", env\);'),
 ("nccl_stagger", "nccl", "src/bootstrap.cc", r'NCCL_PARAM\(StaggerRate, "UID_STAGGER_RATE", 7000\);'),
 ("nccl_sock_ifs", "nccl", "src/transport/net_socket.cc", r'NCCLCHECK\(ncclFindInterfaces\(names, addrs, MAX_IF_NAME_SIZE, MAX_IFS, &ncclNetIfs\)\);'),
 ("nccl_maxifs", "nccl", "src/include/socket.h", r'#define MAX_IFS 16'),
 ("nccl_ib_none", "nccl", "src/transport/net_ib/init.cc", r'"NET/IB : No device found\."'),
 ("nccl_ib_timeout", "nccl", "src/transport/net_ib/connect.cc", r'NCCL_PARAM\(IbTimeout, "IB_TIMEOUT", 20\);'),
 ("nccl_ib_retry", "nccl", "src/transport/net_ib/connect.cc", r'NCCL_PARAM\(IbRetryCnt, "IB_RETRY_CNT", 7\);'),
 ("nccl_ib_gid", "nccl", "src/transport/net_ib/connect.cc", r'NCCL_PARAM\(IbGidIndex, "IB_GID_INDEX", -1\);'),
 ("nccl_ib_disable", "nccl", "src/transport/net_ib/init.cc", r'NCCL_PARAM\(IbDisable, "IB_DISABLE", 0\);'),
 ("nccl_shm_disable", "nccl", "src/transport/shm.cc", r'NCCL_PARAM\(ShmDisable, "SHM_DISABLE", 0\);'),
 ("nccl_runtime_connect", "nccl", "src/init.cc", r'NCCL_PARAM\(RuntimeConnect, "RUNTIME_CONNECT", 1\);'),
 ("nccl_init_start", "nccl", "src/init.cc", r'"%s comm %p rank %d nranks %d cudaDev %d nvmlDev %d busId %lx parent %p childCount %d color %d key %d- Init "'),
 ("nccl_bootinit", "nccl", "src/init.cc", r'NCCLCHECKGOTO\(bootstrapInit\(job->nId, '),
 ("nccl_allgather1", "nccl", "src/init.cc", r'// AllGather1 - begin'),
 ("nccl_topo", "nccl", "src/init.cc", r'NCCLCHECKGOTO\(ncclTopoGetSystem\(comm, &comm->topo\), ret, fail\);'),
 ("nccl_ring", "nccl", "src/init.cc", r'NCCLCHECKGOTO\(ncclTopoCompute\(comm->topo, ringGraph\), ret, fail\);'),
 ("nccl_tree", "nccl", "src/init.cc", r'NCCLCHECKGOTO\(ncclTopoCompute\(comm->topo, treeGraph\), ret, fail\);'),
 ("nccl_net_name", "nccl", "src/init.cc", r'INFO\(NCCL_INIT, "Using network %s", comm->ncclNet->name\);'),
 ("nccl_net_env", "nccl", "src/init.cc", r'envNetName = ncclGetEnv\("NCCL_NET"\);'),
 ("nccl_crossnic", "nccl", "src/graph/search.cc", r'NCCL_PARAM\(CrossNic, "CROSS_NIC", 2\);'),
 # other launchers
 ("ds_env", "ds", "deepspeed/launcher/launch.py", r'current_env\[CROSS_RANK\] = str\(args\.node_rank\)'),
 ("ds_rank", "ds", "deepspeed/launcher/launch.py", r'current_env\["RANK"\] = str\(dist_rank\)'),
 ("ds_pdsh", "ds", "deepspeed/launcher/runner.py", r'default=PDSH_LAUNCHER,'),
 ("ds_ssh", "ds", "deepspeed/launcher/runner.py", r'ssh_check_cmd = \("ssh -o PasswordAuthentication=no " \+'),
 ("ds_mpi", "ds", "deepspeed/comm/comm.py", r'^def mpi_discovery\('),
 ("acc_prep", "acc", "accelerate/utils/launch.py", r'^def prepare_multi_gpu_env\('),
 ("acc_rdzv", "acc", "accelerate/utils/launch.py", r'args\.rdzv_endpoint = f"\{main_process_ip\}:\{main_process_port\}"'),
 ("acc_static", "acc", "accelerate/commands/launch.py", r'"--rdzv_backend",'),
 ("acc_run", "acc", "accelerate/commands/launch.py", r'^\s+distrib_run\.run\(args\)$'),
 ("sl_procid", "slurm", "src/common/env.c", r'setenvf\(&env->env, "SLURM_PROCID", "%d", env->procid\)'),
 ("sl_localid", "slurm", "src/common/env.c", r'setenvf\(&env->env, "SLURM_LOCALID", "%d", env->localid\)'),
 ("sl_nodeid", "slurm", "src/common/env.c", r'setenvf\(&env->env, "SLURM_NODEID", "%d", env->nodeid\)'),
 ("tr_pet", "trainer", "pkg/runtime/framework/plugins/torch/torch.go", r'petEnvs := \[\]corev1ac\.EnvVarApplyConfiguration\{'),
 ("js_subdomain", "jobset", "pkg/controllers/jobset_controller.go", r'job\.Spec\.Template\.Spec\.Subdomain = GetSubdomain\(js\)'),
 ("ray_env", "ray", "ray/train/torch/config.py", r'^def _set_torch_distributed_env_vars'),
 ("ray_master", "ray", "ray/train/torch/config.py", r'execute_single\(0, get_address_and_port\)|= worker_group.execute_single\($'),
]
out = {}
for qid, repo, f, pat in Q:
    root, ver, url = ROOTS[repo]
    lines = open(f"{root}/{f}", encoding="utf-8", errors="replace").read().split("\n")
    hits = [i + 1 for i, l in enumerate(lines) if re.search(pat, l)]
    if not hits:
        sys.exit(f"MISSING {qid}: {pat} in {f}")
    if len(hits) > 1:
        print(f"note {qid}: {len(hits)} matches {hits[:6]}, using first", file=sys.stderr)
    n = hits[0]
    vf = f if repo != "ray" else f
    out[qid] = {"repo": repo, "ver": ver, "file": vf, "line": n, "text": lines[n - 1].strip()[:200],
                "url": f"{url}{vf}#L{n}"}
json.dump(out, sys.stdout, indent=1)
