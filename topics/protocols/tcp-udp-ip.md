# TCP, UDP, and IP: the transport foundations

⏱ 17 min read · +5h 35m resources

Added 2026-08-24. Everything else in this topic rides on these three. HTTP, WebSockets, gRPC, DNS, SSH, and NCCL all reduce to "bytes into a socket", and when a distributed job hangs or a checkpoint upload crawls, the answer is almost always here rather than in the application. Written for the cases you actually hit: high bandwidth-delay paths, cluster fabrics, and cloud MTU and NAT limits.

### Best resources

- [High Performance Browser Networking, "Building Blocks of TCP"](https://hpbn.co/building-blocks-of-tcp/) (free) (35 min): the clearest treatment of handshake cost, congestion window growth, and why latency dominates throughput.
- [ESnet fasterdata host tuning](https://fasterdata.es.net/host-tuning/linux/) (40 min): the canonical high-BDP tuning reference, maintained by the people running DOE's 100G science network. Best source for buffer sizing math.
- [RFC 9293 (TCP, 2022 consolidation)](https://www.rfc-editor.org/rfc/rfc9293) (2h 30m) and [`man 7 tcp`](https://man7.org/linux/man-pages/man7/tcp.7.html) (45 min): the spec, and the exact semantics of every Linux knob below.
- [EC2 instance network bandwidth](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html) (20 min) and [EC2 network MTU](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html) (15 min): the per-flow caps and jumbo-frame rules that decide your real transfer speed on AWS.
- [NCCL environment variables](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/env.html) (docs, ~30 min for the socket and net variables): what `NCCL_SOCKET_IFNAME` and the multi-socket knobs actually do.

### IP: addressing, MTU, and the silent failure

**Addressing.** IPv4 is 32-bit with a 20-byte minimum header and routers that may fragment. IPv6 is 128-bit with a fixed 40-byte header, no header checksum, and **routers never fragment**: only the source may, via a Fragment extension header. Private ranges (RFC 1918) are `10/8`, `172.16/12`, `192.168/16`; CGNAT space `100.64/10` (RFC 6598) turns up in EKS and Docker overlays and will collide with a carelessly chosen VPC CIDR. `169.254.169.254` is the EC2 instance metadata endpoint, which matters for the SSRF discussion in [DNS: resolution, caching, and the failure modes](dns.md) (21 min read · +6h 15m resources).

**Google's IPv6 measurement crossed 50 percent for the first time on 2026-03-28** (50.10 percent). APNIC's differently weighted figure sits nearer 42 percent. Dual-stack is now the boring default rather than an experiment.

**MTU and the blackhole.** Standard Ethernet MTU is 1500, giving a TCP MSS of 1460 (IPv4) or 1440 (IPv6), and 12 bytes less again with timestamps enabled. IPv6's hard minimum link MTU is 1280. Path MTU Discovery signals "too big" with ICMPv4 type 3 code 4 or ICMPv6 type 2, so **a firewall that drops ICMP creates a PMTUD blackhole**: the handshake and small packets succeed, then the first full-size segment vanishes and the connection hangs. That signature (connects fine, stalls on bulk transfer) is worth memorising. Mitigation is `net.ipv4.tcp_mtu_probing=1`, which enables packetization-layer PMTUD (RFC 4821).

**Jumbo frames on AWS.** 9001 MTU is supported on all current-generation instances, inside a VPC, in cluster placement groups, and over Direct Connect. It does **not** survive an internet gateway (hard 1500) or a VPN, and both inter-region peering and NAT gateways cap at 8500. At 9001 you move roughly six times fewer packets per byte, which is real on in-region NFS/FSx dataloading and S3 checkpoint pushes, and irrelevant on EFA/RDMA paths that bypass the kernel IP stack entirely. Test with `ping -M do -s 8973 host`.

The mixed-MTU failure is the one that will cost you a day: node A at 9001, node B at 1500 in the same job, small collectives fine, large allreduces hang. Verify MTU uniformity across every node in an allocation.

**NAT gateway limits worth knowing** (they are the reason a dataloader fleet suddenly fails): 55,000 simultaneous connections per unique destination per IP address, scaling to 100 Gbps and 10M packets per second, and idle connections dropped at 350 s. Five hundred dataloader workers hammering S3 through NAT will hit `ErrorPortAllocation`. Use a **VPC gateway endpoint for S3** and remove NAT from the path (which also removes the data-processing charge).

### TCP: the four numbers that explain most problems

**Throughput is window over RTT.** `throughput ≈ min(cwnd, receiver_window) / RTT`. Everything else is detail.

**Bandwidth-delay product** is how much data must be in flight to keep a pipe full:

| Path | BDP |
| --- | --- |
| 10 Gbps, 100 ms (cross-region) | 125 MB |
| 25 Gbps, 1 ms (in-AZ) | 3.1 MB |
| 100 Gbps, 50 us (in-rack) | 625 KB |

The TCP header's window field is 16 bits, so **without window scaling (RFC 7323) a 100 ms path caps at about 5 Mbps regardless of your NIC**. Scaling is negotiated in the SYN only, and a middlebox that strips the option silently reimposes the 64 KB ceiling.

**Loss matters more than you think.** The Mathis bound for loss-based congestion control is `BW ≤ MSS / (RTT × √p)`. At MSS 1460, RTT 100 ms, and one packet in 100,000 lost, that is about 37 Mbps for a single stream. This, plus the window ceiling, plus AWS's per-flow policy cap, is the complete argument for multi-stream transfers.

**Nagle plus delayed ACK.** Nagle withholds a small segment while an earlier small segment is unacknowledged; delayed ACK withholds the acknowledgement hoping to piggyback (Linux minimum about 40 ms). On a write-write-read pattern the two interact to produce **a 40 ms stall per RPC**. `TCP_NODELAY` disables Nagle and is set by default in most RPC stacks including gRPC. `TCP_CORK` is the deliberate opposite.

**TIME_WAIT and port exhaustion.** TIME_WAIT is hardcoded to 60 s in Linux, and the default ephemeral range gives 28,232 ports, so against a single destination IP and port you sustain roughly **470 new connections per second** before `EADDRNOTAVAIL`. The fix is connection pooling and keep-alive, not sysctls. `tcp_tw_reuse=1` helps outbound; `tcp_tw_recycle` was removed in Linux 4.12 and should never be suggested.

**`SO_REUSEPORT`** lets multiple sockets bind the same port with kernel-side load balancing across them, which is how you scale accept across N worker processes without accept-lock contention. `SO_REUSEADDR` is the different, older thing: bind despite a lingering TIME_WAIT.

**Keepalive is not a heartbeat.** Defaults are 7200 s idle plus 9 probes at 75 s, so **about 2 hours 11 minutes to notice a dead peer**. Middleboxes kill idle flows long before that (AWS NAT at 350 s). Use `TCP_USER_TIMEOUT` plus application-level heartbeats; keepalive cannot detect a peer that is alive but wedged, which is the common training-job failure.

**Accept queue.** `somaxconn` has defaulted to 4096 since Linux 5.4 (it was 128 for two decades, so older tuning guides are wrong here). On overflow the kernel **silently drops the ACK** and the client retransmits, producing 1 s and 3 s connection stalls that look like network faults. Check `ss -lnt` (Recv-Q is queue depth, Send-Q is the limit) and `nstat -az TcpExtListenOverflows`.

**Congestion control.** CUBIC has been the Linux default since 2006 and still is in 2026 (standardised as RFC 9438 in 2023). BBR models bottleneck bandwidth and round-trip propagation time and paces sends rather than reacting to loss, which is exactly right for high-BDP paths with non-congestive loss; BBRv1 has been in mainline since Linux 4.9. **BBRv3 remains an IETF draft (draft-ietf-ccwg-bbr, revision 06 dated 2026-07-06) and is not confirmed in mainline**; it ships via Google's `google/bbr` v3 branch and distro kernels such as XanMod. Check with `sysctl net.ipv4.tcp_available_congestion_control` rather than trusting a blog post.

**Head-of-line blocking.** TCP delivers one strictly ordered byte stream, so one lost segment stalls everything behind it, including bytes already in the receive buffer. HTTP/2 multiplexes many streams over one connection, so a single loss stalls all of them. That is the whole motivation for QUIC, covered in [HTTP: 1.1, 2, 3, and what matters for LLM services](http.md) (13 min read · +19h 40m resources).

**TCP Fast Open is effectively dead**: Firefox removed it in v87 (2021), no major browser enables it, and the cause was middlebox ossification. That failure is why QUIC was built over UDP with encrypted transport headers instead of extending TCP.

### UDP: a thin wrapper and your problem

An 8-byte header carrying source port, destination port, length, and checksum. You get port multiplexing, message boundaries, and an optional checksum (mandatory in IPv6). You do not get ordering, reliability, deduplication, flow control, congestion control, or MTU discovery.

- Practical maximum payload without fragmentation on a 1500 path is **1472 bytes** (IPv4) or 1452 (IPv6). Beyond that you are relying on IP fragmentation, where losing one fragment discards the whole datagram and UDP will not retransmit it.
- DNS Flag Day 2020 settled on **1232 bytes** as the safe EDNS buffer size. QUIC (RFC 9000) requires the path to carry a **1200-byte** UDP payload and runs its own probing.
- Where you meet UDP: DNS, QUIC and HTTP/3, NTP, syslog, WebRTC media, and, most relevant to GPU clusters, **RoCEv2, which is RDMA encapsulated in UDP on destination port 4791** and depends on a near-lossless fabric (PFC/DCQCN) rather than on UDP itself. AWS EFA does not use kernel UDP at all: **SRD** is a custom OS-bypass protocol that sprays packets across many paths and reorders at the endpoint, which is why it beats TCP on a fat tree.
**UDP has no receive-buffer autotuning.** TCP grows its buffer; UDP gives you exactly what you configured. The stock 208 KB default is far too small for a multi-Gbps QUIC flow, and the symptom is datagrams dropped before the application reads them, which QUIC interprets as loss and answers by backing off. quic-go recommends 7.5 MB:

```bash
sysctl -w net.core.rmem_max=7500000
sysctl -w net.core.wmem_max=7500000
# diagnose first:
nstat -az | grep -i Udp     # UdpRcvbufErrors, UdpInErrors climbing means raise it
```

### Linux knobs you will actually touch

```
net.ipv4.tcp_congestion_control   cubic (default); bbr worth testing on high-BDP paths
net.core.somaxconn                4096 since 5.4
net.ipv4.tcp_rmem / tcp_wmem      min default max; the third value is the autotune ceiling
net.core.rmem_max / wmem_max      caps explicit setsockopt, NOT autotuning
net.ipv4.ip_local_port_range      32768 60999
net.ipv4.tcp_tw_reuse             2 (loopback only) by default; 1 for outbound-heavy hosts
net.core.netdev_max_backlog       1000 default; 5000-30000 for 100G NICs
net.ipv4.tcp_mtu_probing          1 when you suspect a PMTUD blackhole
fs.file-max / ulimit -n           1024 soft limits still ship on many distros
```

Two traps. First, **rmem_max does not cap autotuning**; it caps explicit `setsockopt(SO_RCVBUF)`. Second, **an application that calls setsockopt(SO_RCVBUF) disables autotuning for that socket**, so a well-meaning "tuned" client can be slower than an untuned one on a long path. For a 100 ms 10 Gbps path, set the `tcp_rmem`/`tcp_wmem` ceilings to at least 134217728 and confirm window scaling is on.

On Slurm, limits are inherited from `slurmd`'s environment rather than your login shell, so `ulimit -n` in your `.bashrc` will not help a job.

### Diagnosing: tools and a checklist

`ss -tinm` is the single best command: per-socket cwnd, rtt, retransmits, pacing rate, delivery rate, and the congestion control in use. Small cwnd with climbing retransmits means loss-limited; large cwnd with a pinned receive window means receiver-limited. Then `ss -lnt` for accept queues, `nstat -az` for `TcpRetransSegs` and `TcpExtListenOverflows`, `ethtool -S eth0` for NIC-level drops that no TCP counter shows, `mtr` for per-hop loss, and `iperf3 -P 8` versus `-P 1` to demonstrate the single-stream ceiling to someone who does not believe it.

When a distributed training job stalls on the network, in rough order of likelihood:

1. **Wrong interface.** NCCL picked `docker0` or a management NIC. `NCCL_DEBUG=INFO NCCL_DEBUG_SUBSYS=INIT,NET` prints the choice; fix with `NCCL_SOCKET_IFNAME` (and `GLOO_SOCKET_IFNAME`, which is a separate variable).
2. **MTU mismatch** across nodes: small collectives pass, large ones hang.
3. **PMTUD blackhole**: handshake fine, bulk transfer dead.
4. **Retransmits**: `nstat -az TcpRetransSegs` before and after. Nonzero growth inside a datacenter is a real fabric problem.
5. **NIC drops**: `ethtool -S`, especially ring overruns.
6. **Accept-queue overflow** at the rendezvous rank.
7. **File-descriptor exhaustion**: `EMFILE`, or `ls /proc/PID/fd | wc -l` against `ulimit -n`.
8. **Security group or NACL**: NCCL needs all ports open between nodes, not just 29500. A silent hang in `init_process_group` is usually a firewall.
9. **Not the network at all**: one straggler rank makes an allreduce look like a network hang. Check GPU utilisation across ranks first.

### Where this shows up in ML

**NCCL bootstraps over TCP sockets even on an InfiniBand cluster**, so interface selection matters for job startup regardless of the data-plane transport. Its transport preference runs NVLink, then P2P/shared memory, then ibverbs (IB/RoCE), then plain sockets. `NCCL_SOCKET_NTHREADS` and `NCCL_NSOCKS_PERTHREAD` exist precisely because one TCP stream cannot fill a modern NIC: on AWS the defaults are 2 and 8, giving 16 parallel sockets per peer, against 1 and 1 elsewhere. The product is capped at 64.

**Checkpoint upload is where the numbers bite.** AWS caps a single flow (one 5-tuple) at 5 Gbps, or up to 10 Gbps inside a cluster placement group, or 25 Gbps with ENA Express. A 70B model in bf16 is about 140 GB of weights, and full training state with fp32 optimiser moments approaches 1 TB. At 5 Gbps that is roughly 224 s for the weights and about 27 minutes for the full state, per checkpoint. Eight to sixteen concurrent streams cut that by an order of magnitude, and `torch.distributed.checkpoint` gets it for free because every rank writes its own shard. `s5cmd` exists for the same reason and is dramatically faster than `aws s3 cp` at default settings.

**Small-file dataloading is latency-bound, not bandwidth-bound.** Ten million small files over NFS will be slow whatever your NIC is; the fix is sharded sequential formats (WebDataset, Parquet, MDS) plus prefetching workers, which is the multi-stream trick again. S3 gives 5,500 GET and 3,500 PUT per second per prefix, so shard across prefixes to scale past it.

### Recent developments worth a line

- **io_uring zero-copy receive merged in Linux 6.15 (2025)**, and devmem TCP lets a NIC DMA straight into GPU memory. This is the kernel's answer to userspace bypass, and it matters for inference serving and ingest rather than for NCCL, which already bypasses via RDMA.
- **HTTP/3 reached roughly 40 percent of websites by August 2026**, which makes UDP buffer tuning a mainstream production concern rather than a niche one.
- **DPDK stayed largely irrelevant to ML**: the field took the RDMA/EFA plus libfabric path instead. eBPF and XDP do matter to you, but for observability and policy (bpftrace, Cilium) rather than datapath throughput.
- **L4S** (RFC 9330/9331/9332) is the low-latency ECN work now seeing ISP deployment. Worth watching, not yet something you tune on a cluster.

### Connections

- Why HTTP/2 inherits TCP's head-of-line blocking and HTTP/3 does not: [HTTP: 1.1, 2, 3, and what matters for LLM services](http.md) (13 min read · +19h 40m resources).
- Long-lived sockets, heartbeats, and per-connection cost at scale: [WebSocket protocol (RFC 6455) in depth](websockets.md) (19 min read · +5h 10m resources).
- What sits on top of UDP port 53, and why it fails: [DNS: resolution, caching, and the failure modes](dns.md) (21 min read · +6h 15m resources).
- Interconnects, NVLink, and RDMA hardware: [Interconnects and scaling: why the network picks your parallelism](../hardware/interconnects-and-scaling.md).
