# Visualisation ideas: Networking foundations (2026-10-05)

Scored 1 to 5 on teaches-more-than-text (T), uses real data (D), cost (C, 5 = cheap). The root page already owns the layer stack, the HTTP/1.1 vs 2 vs 3 head-of-line measurement, TLS 1.2 vs 1.3 and the Failure lab, so none of those is rebuilt here; they are linked.

## Built

| Idea | T | D | C | Placement | Data and formula |
|---|---|---|---|---|---|
| TCP timeline: event-driven model of the root's recorded request, before/after pairs (timer vs fast retransmit + tail probe; Nagle on vs TCP_NODELAY; delayed ACK on/off), RTT slider, to scale | 5 | 4 | 2 | own tab | writes and sizes from the root's `wire/raw/h1_arrivals.json` and `h1_response.bin`; rules from RFC 5681 s3.2/4.2, RFC 8985 s7.2 (PTO = 2 SRTT + max_ack_delay when one segment is in flight), RFC 9293 s3.7.4; RTO = RTT + 200 ms (Linux floor) |
| Throughput lab: four ceilings, streams, payload time, measured runs against window / RTT | 5 | 4 | 3 | own tab | window/RTT; Mathis C = sqrt(3/2); AWS per-flow caps; `meas/out/tcp_path.json` |
| Window over RTT measured: 12 real downloads with pinned and autotuned buffers vs prediction | 5 | 5 | 3 | Reading 5 | speed.cloudflare.com/__down, TCP_CONNECTION_INFO (macOS) |
| Autotuning window growth over time | 4 | 5 | 4 | Reading 5 | same run, sampled every 4 ms |
| Latency under load (bufferbloat): ping every 100 ms around one download | 5 | 5 | 4 | Reading 6 | `loaded_latency.json` |
| Reno vs CUBIC cwnd animation on one path (before/after, then both) | 4 | 2 | 3 | Reading 6 | RFC 5681, RFC 9438 (C 0.4, beta 0.7, W_est); recomputed in Python by `check_embed.py` |
| TCP state ladder stepper (11 states, CLOSE_WAIT and TIME_WAIT called out) | 4 | 2 | 4 | Reading 3 | RFC 9293 s3.3.2, s3.6 |
| NAT idle timeout animation, no keepalive vs keepalive (before/after) | 4 | 2 | 4 | Reading 9 | AWS 350 s, RST; documentation addresses |
| Path MTU binary search chart plus the real ICMP "frag needed (MTU 1492)" | 5 | 5 | 4 | Reading 10 | `path_mtu.json` |
| UDP receive-buffer overflow bars | 4 | 5 | 5 | Reading 11 | `local_sockets.json` |
| QUIC connection migration ladder: every real datagram (aioquic, qlog) vs TCP on the same move (before/after) | 5 | 5 | 2 | Reading 12 | `quic_migrate.json`, packets grouped into datagrams in `make_data.py` |
| Accept-queue table, TCP_NODELAY defaults table, stream vs datagram boundary recording | 4 | 5 | 5 | Reading 2, 7, 8 | `local_sockets.json` |
| Prefix (CIDR) calculator with overlap check | 4 | 1 | 5 | Reading 1 | RFC 4632, reserved blocks |
| Predict-then-reveal drills (8) | 4 | 3 | 5 | Reading 16 | page numbers |

## Rejected or not possible

- TIME_WAIT decay measured on macOS: `netstat` lists no TIME_WAIT sockets on this macOS (zero after twenty closes), so it was dropped; taught from Linux's tcp.h.
- Slow-start curve from the real download: the home line's BDP is about 100 KB, so slow start finishes in about three round trips and is invisible in 10 ms bins; the autotuning window plot shows the growth that is visible.
- Real loss and delay experiments with kernel TCP (netem, dummynet, tcpdump): need root; not run. The Failure lab's HTTP/2-window measurement through a userspace delay proxy is linked instead.
- IPv6 path MTU probe: `ping6 -D` needs root on macOS.
- Nagle reproduction: needs a real round trip; the root's Failure lab could not reproduce it on loopback, and the TCP timeline models it instead.
- BBR in the congestion animation: no published closed-form model simple enough to animate honestly; described in prose.
- An RDMA / NCCL visual: belongs to Distributed training and Training infrastructure.

## What the methodology lacked

A rule for measurements on the author's own network: they are real but describe one home line, so every measured number here says where it came from, and the presets in the Throughput lab separate "measured" from "typical shape".
