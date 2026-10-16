# Launch lab: sources (read 2026-10-16)

## PyTorch 2.14.1 (the version in the image and the host venv)
The installed `site-packages/torch/distributed/*.py` files were compared byte for byte with a sparse clone of
`pytorch/pytorch` at tag `v2.14.1` (commit 5c4886908584029761b579af026dcfb627c84070): identical for every file
quoted below, so the line numbers hold for both. C++ files are from the clone only.
Links: `https://github.com/pytorch/pytorch/blob/v2.14.1/<path>#L<line>`.

| What | File:line | Quote or fact |
|---|---|---|
| dynamic rendezvous default timeouts | torch/distributed/elastic/rendezvous/dynamic_rendezvous.py:144-145 | `"join": timedelta(seconds=600)`, `"last_call": timedelta(seconds=30)` (close 30 s, heartbeat 5 s) |
| min nodes reached: start last-call timer | dynamic_rendezvous.py:743-746 | `if len(state.participants) == self._settings.min_nodes: state.deadline = now + last_call` |
| max nodes reached: complete now | dynamic_rendezvous.py:748-749 | `if len(state.participants) == self._settings.max_nodes: self._mark_rendezvous_complete()` |
| join deadline passed: give up | dynamic_rendezvous.py:906-922 | `if now > deadline:` ... `return _Action.ERROR_TIMEOUT` (raised as `RendezvousTimeoutError`) |
| rank 0 starts a NEW TCPStore on a free port for the workers | dynamic_rendezvous.py:1212-1216 | `server_port = 0`; `if rank == 0: self._shared_tcp_store_server = self._create_tcp_store_server(self._this_node.addr, server_port)` |
| MASTER_ADDR/PORT for workers come from the store | elastic/rendezvous/api.py:89-106 | rank 0 sets `MASTER_ADDR` = `local_addr or socket.getfqdn()`, `MASTER_PORT` = `server_port or get_free_port()`; everyone reads them back |
| c10d backend: who hosts the rendezvous store | elastic/rendezvous/c10d_rendezvous_backend.py:145 | `is_host = _matches_machine_hostname(host)` (unless `is_host` is set) |
| c10d backend: client connect timeout | c10d_rendezvous_backend.py:148, 156-162 | `read_timeout = ... get_as_int("read_timeout", 60)`; `TCPStore(host, port, is_master=is_server, multi_tenant=True, timeout=read_timeout)` |
| static rendezvous (torchrun's default backend; --master-addr) | elastic/rendezvous/static_tcp_rendezvous.py:28, 65-73 | `_default_timeout_seconds = 600`; `is_master = self.rank == 0`; `TCPStore(master_addr, master_port, world_size, is_master, timeout, multi_tenant=True)` |
| torchrun's default backend | torch/distributed/run.py:519-523 | `--rdzv-backend` default `"static"` |
| env the agent gives each worker | elastic/agent/server/local_elastic_agent.py:424-441 | RANK, GROUP_RANK, ROLE_RANK, ROLE_NAME, LOCAL_WORLD_SIZE, WORLD_SIZE, GROUP_WORLD_SIZE, ROLE_WORLD_SIZE, MASTER_ADDR, MASTER_PORT, TORCHELASTIC_RESTART_COUNT, TORCHELASTIC_MAX_RESTARTS, TORCHELASTIC_RUN_ID, TORCHELASTIC_USE_AGENT_STORE, TORCH_NCCL_ASYNC_ERROR_HANDLING (default 1) |
| env:// in the worker: reuse the agent's store | torch/distributed/rendezvous.py:204-222 | if the agent store serves MASTER_ADDR:MASTER_PORT every rank is a client (`is_master=False`); else `start_daemon = rank == 0` |
| no barrier after init by default | torch/distributed/distributed_c10d.py:1974-1975, 2605 | `TORCH_DIST_INIT_BARRIER` default 0 |
| TCPStore client: retry until the deadline | torch/csrc/distributed/c10d/TCPStore.cpp:308-353 | `deadline = now + opts.timeout`; on `DistNetworkError` log "TCP client failed to connect/validate to host {}:{} - retrying" and back off; after the deadline "... - timed out (try={}, timeout={}ms)" and rethrow |
| TCPStore server: wait for all clients | TCPStore.cpp:372-406 | "Timed out after {} seconds waiting for clients. {}/{} clients joined." |
| name that does not resolve | torch/csrc/distributed/c10d/socket.cpp:845 | "The {}network addresses of ({}, {}) cannot be retrieved (gai error: {} - {})." |
| nobody listening yet | socket.cpp:928-932 | "The server socket on {} is not yet listening {}, will retry." |
| connect deadline | socket.cpp:1023 | "The client socket has timed out after {} while trying to connect to ({}, {})." |
| process-group timeouts | torch/csrc/distributed/c10d/Backend.hpp:37; ProcessGroupNCCL.hpp:159 | 30 min default (gloo and generic); 10 min NCCL |
| flight recorder | torch/csrc/distributed/c10d/FlightRecorder.hpp:110; ProcessGroupGloo.cpp:7, 624, 835 | ring buffer of `TORCH_FR_BUFFER_SIZE` (alias `TORCH_NCCL_TRACE_BUFFER_SIZE`) entries, default 2000; ProcessGroupGloo records into it; `torch._C._distributed_c10d._dump_fr_trace_json` (init.cpp:4882) dumps it |
| NCCL watchdog knobs | ProcessGroupNCCL.hpp:62-118 | TORCH_NCCL_BLOCKING_WAIT, TORCH_NCCL_ASYNC_ERROR_HANDLING, TORCH_NCCL_DUMP_ON_TIMEOUT, TORCH_NCCL_DESYNC_DEBUG, TORCH_NCCL_ENABLE_MONITORING, TORCH_NCCL_HEARTBEAT_TIMEOUT_SEC, TORCH_NCCL_TRACE_BUFFER_SIZE |

## Ray 2.59.0 (installed in the image and the host venv)
| What | File:line | Fact |
|---|---|---|
| Ray Train picks rank 0's address and a free port, sets MASTER_ADDR/MASTER_PORT, then calls init_process_group in every worker | ray/train/torch/config.py:208-265 | `worker_group.execute_single(0, get_address_and_port)`; `init_method="env"` default; `timeout_s` default 1800 (line 64) |
| Ray Train sets LOCAL_RANK, LOCAL_WORLD_SIZE, NODE_RANK, RANK, WORLD_SIZE | ray/train/torch/config.py:167-181 | `_set_torch_distributed_env_vars` |
| worker group start timeout | ray/train/v2/_internal/constants.py:43-44; v2/_internal/execution/worker_group/worker_group.py:300-305 | `RAY_TRAIN_WORKER_GROUP_START_TIMEOUT_S`, default 60 s; `if not pg_handle.wait(timeout): raise WorkerGroupStartupTimeoutError` |
| worker health check timeout | v2/_internal/constants.py:39-40 | 10 min |

## NCCL (documentation only; nothing here runs NCCL)
NCCL user guide, Environment Variables, page header NCCL 2.32.3 (https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/env.html, read 2026-10-16):
NCCL_DEBUG (VERSION, WARN, INFO, TRACE), NCCL_DEBUG_SUBSYS (default INIT,BOOTSTRAP,ENV), NCCL_DEBUG_FILE (default stdout),
NCCL_SOCKET_IFNAME (`^docker` excludes, loopback and docker interfaces not selected unless nothing else), NCCL_IB_HCA,
NCCL_IB_DISABLE, NCCL_P2P_DISABLE, NCCL_NET_GDR_LEVEL (auto), NCCL_SOCKET_NTHREADS (1; 2 on AWS; 4 on Google gVNIC),
NCCL_IB_TIMEOUT (20 since 2.23), NCCL_TOPO_DUMP_FILE, NCCL_ALGO, NCCL_PROTO.

## Tools
py-spy 0.4.2 (PyPI, uploaded 2026-04-24), aarch64 wheel sha256 142887e984a4e541071c99a4401ff8c3770f255d329dbd0f64e8c1dd51882cce.
