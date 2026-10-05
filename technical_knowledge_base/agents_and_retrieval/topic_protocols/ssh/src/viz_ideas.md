# Visualisation ideas: SSH (2026-10-05)

Scores: teaching value x data quality x novelty against the parent and siblings (1 to 5 each).

| Rank | Idea | Score | Data | Placement | Status |
|---|---|---|---|---|---|
| 1 | Cluster lab: every recorded scenario (login, ProxyJump, agent forwarding, multiplexing, host-key churn, host and user certificates, tunnels, keepalives, old node, penalties) as steps on one topology, with the real log of each step highlighted | 5x5x5 | `raw/*.txt` from the container cluster | Tab | built |
| 2 | Before/after animation: agent forwarding (-A) against a destination-constrained key against ProxyJump, same attacker (root on the bastion), real results | 5x5x5 | `raw/agent_*.txt` | Reading s6 | built |
| 3 | Before/after animation: ten commands fresh against one ControlMaster, each bar a real run to scale, running elapsed counters | 5x5x4 | `raw/mux_timing.json` (40 ms added with netem) | Reading s7 | built |
| 4 | Handshake packet bars to scale, toggled across four key exchanges (classic, ML-KEM hybrid, sntrup hybrid, P-256), decoded by a relay on the path | 5x5x5 | `raw/wire_*.jsonl` | Reading s1 | built |
| 5 | Round-trip ladder of one login with 40 ms added, labels inferred after NEWKEYS | 4x5x4 | `raw/wire_delay40.jsonl` | Reading s1 | built |
| 6 | Error decoder: recorded error message to meaning, command, fix and log | 5x5x4 | `raw/*.txt` | Tab | built |
| 7 | Certificate refusals: client view against server log, four cases | 5x5x4 | `raw/cert_*.txt` | Reading s4 | built |
| 8 | Who reaches the notebook (loopback, 0.0.0.0, Unix socket; same-node user, other node) | 5x5x5 | `raw/fwd_who_reaches.json` | Reading s8 | built |
| 9 | Annotated ssh_config: click a line for its meaning and the recorded result behind it | 4x4x3 | the page's own sections | Reading s13 | built |
| 10 | File transfer bars (scp -r, rsync, tar pipe, one large file; resume) | 4x5x3 | `raw/xfer.json` | Reading s10 | built (square-root scale, labelled) |
| 11 | Static diagrams: the three layers; -L, -D, -R directions | 3x5x2 | none | Reading s1, s8 | built |

## Rejected
- A key-exchange maths toy (X25519 or ML-KEM on small numbers): the TLS page's Diffie-Hellman toy teaches the same idea; linked instead.
- Re-recording the TCP keepalive timer: Networking foundations derives it; linked.
- An ssh_config generator with form inputs: the annotated config teaches more per minute and needs no validation logic; generators invite copy-paste without understanding.
- tcpdump-style packet capture: no sudo; the decoding relay shows the plaintext handshake and sizes, and the page says what it could not see.
- A two-factor (keyboard-interactive with PAM) simulation: adds PAM setup without changing the protocol story; its cost is described in prose (multiplexing section).
- Reproducing regreSSHion: hours of attempts on a 32-bit glibc target; described from the advisory instead.

## What the methodology lacked
Protocol pages have no published figures to reproduce; the equivalent check is that every number and log on the page comes from one recorded run (`check_embed.py` regenerates the data from `raw/` and compares, and asserts the qualitative claims the prose makes: the agent attack reached both nodes, the constrained key was refused at the second, the Unix socket refused the other user).
