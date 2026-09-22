# SSH: protocol, keys, tunnels, and cluster workflows

⏱ 20 min read · +7h resources

The protocol you use more than any other and configure least: how SSH-2 works, and the config and workflow patterns that make a 2FA-gated cluster with a jump host tolerable rather than infuriating.

### Best resources (1 min)

- [OpenSSH release notes](https://www.openssh.com/releasenotes.html) (~1h for the recent releases): the authoritative changelog. Every version and default claimed below traces here.
- [OpenSSH post-quantum page](https://www.openssh.com/pq.html) (15 min): which hybrid key exchange, when it became default, and the reasoning behind the new weak-crypto warning.
- [`ssh_config(5)`](https://man.openbsd.org/ssh_config.5) (1h) and [`sshd_config(5)`](https://man.openbsd.org/sshd_config.5) (1h): the canonical reference for every keyword below.
- [RFC 4251](https://www.rfc-editor.org/rfc/rfc4251) through [4254](https://www.rfc-editor.org/rfc/rfc4254) (3h for all four): architecture, authentication, transport, and connection layers.
- [Qualys regreSSHion advisory](https://www.qualys.com/2024/07/01/cve-2024-6387/regresshion.txt) (25 min) and terrapin-attack.com (20 min): the two vulnerabilities worth understanding rather than just patching.

### The three layers (2 min)

**Transport (RFC 4253).** TCP connects, both sides exchange version banners, then `SSH_MSG_KEXINIT` negotiates algorithms and key exchange runs. The output includes a **session ID**, the hash of the first key exchange, which every later signature binds to. The server proves possession of its host key here, and that is the only anti-MITM anchor in the protocol. Rekeying happens periodically.

**User authentication (RFC 4252)** runs inside the encrypted transport. Because a public-key signature covers the session ID, it cannot be replayed against a different server.

**Connection (RFC 4254)** multiplexes independent **channels** over the single encrypted stream: `session` for shells and exec, `direct-tcpip` for local and dynamic forwarding, `forwarded-tcpip` for reverse forwarding, plus x11 and agent forwarding.

Channels are why the workflow section below works. Port forwards, SFTP, and connection multiplexing are all extra channels on one TCP connection and **one authentication**, which is why the second and subsequent `ssh`, `rsync`, or VS Code connection to a login node opens in milliseconds instead of re-running key exchange and 2FA. It is also why one dropped TCP connection kills every forward at once.

### Algorithms and the post-quantum migration (4 min)

Current OpenSSH 10.x defaults:

- **Key exchange**: `mlkem768x25519-sha256` first, then `sntrup761x25519-sha512@openssh.com`, then `curve25519-sha256`. Finite-field Diffie-Hellman was removed from sshd's defaults in 10.0.
- **Host keys**: prefer `ssh-ed25519` (fixed 32-byte keys, no parameter choices, no per-signature RNG footgun), then ECDSA, then `rsa-sha2-512/256`. **DSA was removed entirely in OpenSSH 10.0 (2025-04-09)**, ending a deprecation begun in 2015.
- **Ciphers**: ChaCha20-Poly1305, then AES-GCM, then AES-CTR with encrypt-then-MAC. CBC and non-ETM MACs are off by default.
The rule that follows: **do not hand-write Ciphers and KexAlgorithms lines.** Frozen crypto lists copied from a 2016 hardening blog post are now the main reason someone's SSH is weaker than the defaults.

**Post-quantum timeline.** OpenSSH 9.0 (2022-04-08) made `sntrup761x25519` the default key exchange, making SSH one of the first mainstream protocols with hybrid PQ on by default, explicitly reasoning about capture-now-decrypt-later. 9.9 added `mlkem768x25519-sha256` (ML-KEM-768 plus X25519, per FIPS 203), and **10.0 made it the default**. 10.1 added **WarnWeakCrypto, on by default**, which prints a warning when a session negotiates a non-PQ key exchange: expect to see it against older RHEL login nodes, and silence it per-Host rather than globally. 10.4 (2026-07-06) added an experimental composite PQ signature, `mldsa44-ed25519`, **not enabled by default**, which is the authentication half that was previously missing. The IETF hybrid key exchange draft is in the RFC Editor queue rather than published.

**Releases are coming faster.** The OpenSSH team has said publicly that they are receiving many AI-generated security reports, that independently discovered AI-found bugs imply adversaries find them too, and that they will therefore ship more frequent releases rather than batching fixes. The old "about four releases a year" assumption no longer holds; 10.5 arrived on 2026-08-11.

Three recent changes that break scripts rather than security:

- **10.1 moved the agent socket out of /tmp and into ~/.ssh/agent**, breaking anything with a hardcoded `/tmp/ssh-XXXX` path or a `/tmp` bind mount for agent sharing.
- **10.0 made scp and sftp use ControlMaster no**, so `scp` no longer silently warms a multiplexing socket for later use.
- **10.5 requires ECC support including NISTP521 in libcrypto**, which matters if you build OpenSSH in a container.

### Authentication (3 min)

**Turn off passwords** (`PasswordAuthentication no`, `KbdInteractiveAuthentication no`). Password auth is the entire input to the SSH brute-force botnet economy.

**Public keys** are the baseline: `ssh-keygen -t ed25519`, always passphrase-protected (`-a 100` raises the KDF rounds). The passphrase protects the key at rest only; anything that can read your agent socket bypasses it.

**Certificates are the right answer at cluster scale.**

```bash
ssh-keygen -s ca_key -I "khalid@2026-08" -n khalid,khalid-gpu -V +8h -z 42 id_ed25519.pub
```

`-I` is the key ID that lands in server logs, `-n` the principals the certificate is valid for, `-V` the validity window, `-z` a serial for revocation lists. The server trusts one CA key (`TrustedUserCAKeys`) rather than N users' keys on M nodes; revocation is a KRL update rather than a find-and-delete across the fleet; short validity makes key theft self-limiting; and **host certificates eliminate the trust-on-first-use prompt for nodes that do not exist yet**. This is what Teleport, Vault SSH, and Netflix BLESS automate. Note that 10.3 changed empty-principal certificates from matching *any* principal to matching *none*, which broke sloppy CA tooling in April 2026.

**Agent forwarding is a delegation of your private keys.** Anyone with root on the login node, or any process running as you, can use the socket to authenticate as you anywhere. On a shared HPC login node that is a genuine risk, and `ForwardAgent yes` must never appear under `Host *`. In preference order: **use ProxyJump**, where the jump host only relays an encrypted stream and never touches your keys or the final authentication; or destination-constrained keys via `ssh-add -h` and `session-bind@openssh.com`; or `ssh-add -c` to require confirmation per use. OpenSSH 10.5 fixed a bug where agent *locking* did not stop remote operations on forwarded agents, which is one more point for ProxyJump.

**Hardware keys.** `ssh-keygen -t ed25519-sk` keeps the private half on the token and requires a touch per authentication, with `-O resident` for portability and `-O verify-required` for a PIN. 10.5 now orders low-friction FIDO keys ahead of verify-required ones so you stop getting spurious prompts. The server needs OpenSSH 8.2 or newer to accept them, which some old login nodes are not.

`ssh -Z` (new in 10.5) shows which keys will be offered and in what order, which is the fix for "Too many authentication failures" when your agent holds nine keys and the server allows six attempts. The other fix is `IdentitiesOnly yes`.

### Config that saves hours (3 min)

```
Host *
    ServerAliveInterval 30
    ServerAliveCountMax 3
    AddKeysToAgent yes
    HashKnownHosts yes
    IdentitiesOnly yes

Host bastion
    HostName bastion.example.ac.uk
    User khalid
    IdentityFile ~/.ssh/id_ed25519_sk
    ControlMaster auto
    ControlPath ~/.ssh/cm/%C
    ControlPersist 10m

Host login gpu-login
    HostName %h.cluster.internal
    ProxyJump bastion
    ControlMaster auto
    ControlPath ~/.ssh/cm/%C
    ControlPersist 4h

Host gpu-node-*
    ProxyJump login
    StrictHostKeyChecking accept-new
    UserKnownHostsFile ~/.ssh/known_hosts_ephemeral
```

- `mkdir -p ~/.ssh/cm` first. `%C` is a hash of the connection parameters, which keeps the socket path short enough to avoid the Unix socket path limit.
- **ProxyJump replaced both ProxyCommand ssh -W and the ancient nc invocation.** Multi-hop is `ssh -J bastion,login gpu-node-07`. Version 10.3 added hostname validation to it to block shell injection from crafted hostnames.
- **ControlMaster plus ControlPersist is the single biggest time saver on a 2FA cluster.** Authenticate once, then every `rsync`, `git`, and VS Code channel rides the same connection. The caveats: when the master dies everything dies, `-O check` and `-O exit` manage it, and `scp` no longer creates one since 10.0.
- **ServerAliveInterval is what you want, not TCPKeepAlive.** The former is an SSH-layer probe that works through NAT; the latter is a 2-hour TCP timer that is useless against a VPN that drops idle flows at 10 minutes.
**Forwarding.** `-L lport:dsthost:dport` exposes a remote service on your laptop (Jupyter, TensorBoard). `-R` exposes something of yours on the remote. `-D port` opens a local SOCKS5 proxy and is the best single trick for reaching an internal Grafana or MLflow without one `-L` per port; point tools at it with `ALL_PROXY=socks5h://127.0.0.1:1080` so DNS resolves remotely. Use `-N -f` for pure tunnels. At an idle prompt, `~C` adds forwards to a live session, `~I` (10.3) prints connection info, and `~.` kills a wedged one.

**File transfer.** `scp` is deprecated as a protocol: since OpenSSH 9.0 it speaks SFTP underneath, and the legacy protocol's server-side glob expansion has produced repeated path-traversal CVEs, including two more in 2026. **Use rsync -avhP --partial -e ssh for anything checkpoint-sized**: resumable, delta-transferred, and free of extra handshakes when ControlMaster is up. For many small files, `tar | ssh 'tar -x'` beats rsync's per-file overhead. `sshfs` is convenient for editing but latency-bound, unusable for training data, and effectively unmaintained; VS Code Remote-SSH (code runs remotely) is the better answer.

### Cluster workflows (4 min)

**Jupyter or TensorBoard through a login node.** Compute nodes are usually not routable; the login node is.

```bash
# in the Slurm job
jupyter lab --no-browser --ip=127.0.0.1 --port=$PORT
# on your laptop, one command, ProxyJump does the hops
ssh -N -L 8888:localhost:$PORT -J bastion,login gpu-node-07
```

Bind to `127.0.0.1` and never `0.0.0.0` on a shared node, or any other user on that node reaches your kernel, which is arbitrary code execution as you. Keep the token. Derive the port from your UID (`PORT=$((10000 + UID % 10000))`) to avoid collisions, and echo the exact `ssh -L` line into the job's stdout log so you can paste it.

**Keeping work alive.** The real answer is `sbatch`, not a terminal multiplexer: an interactive `srun --pty` job dies with your session. Run `tmux` on the **login** node for the orchestration shell so a closed laptop or a dropped VPN does not matter, and do not run it on compute nodes, where an epilog may kill stray processes and it hides work from accounting. To attach to a running job's node, `srun --overlap --jobid=ID --pty bash`, or plain `ssh` where the site runs `pam_slurm_adopt`, which admits you only if you hold an allocation there and adopts your shell into the job's cgroup.

**Host key churn on ephemeral nodes.** SSH's trust model is trust-on-first-use, so cloud nodes that regenerate host keys every boot fire the loud identification-changed warning constantly, and people learn to ignore it, which is exactly what an MITM needs. `StrictHostKeyChecking accept-new` auto-adds unknown hosts while still refusing *changed* ones, which is the right setting for an ephemeral fleet; `no` accepts changed keys too and gives up MITM protection entirely. **Scope a throwaway UserKnownHostsFile and accept-new to the ephemeral Host block only**, never globally and never for the bastion. The better fixes are host certificates with a single `@cert-authority` line, or SSHFP records with `VerifyHostKeyDNS` (which needs DNSSEC to mean anything, and note CVE-2025-26465 below). Repair a stale entry with `ssh-keygen -R hostname`.

**Containers.** Do not run `sshd` in a container to get a shell: use `docker exec`, `kubectl exec`, or `apptainer shell`. For a notebook in Kubernetes, `kubectl port-forward` is the direct analogue of `-L`.

**GitHub.** Use a per-repository **deploy key** on the cluster, read-only by default, so a compromised login node exposes one repository rather than your account. `Host github.com / HostName ssh.github.com / Port 443` gets you through a firewall that blocks outbound 22. For commit signing you no longer need GPG: `git config gpg.format ssh` plus a signing key, with `gpg.ssh.allowedSignersFile` for local verification; GitHub has verified SSH signatures since 2022-08-23. It works with `ed25519-sk`, so signing requires a touch.

### Security (3 min)

**regreSSHion (CVE-2024-6387)**, disclosed 2024-07-01, is unauthenticated remote code execution as root. A `SIGALRM` on login-grace expiry calls a signal handler that reaches `syslog` and `malloc`, which are not async-signal-safe, and interrupting inside an allocation leaves the heap inconsistent. It affects **OpenSSH 8.5p1 through 9.7p1** (and pre-4.4p1) and is **fixed in 9.8**. It is a regression of a 2006 bug whose guard a 2020 refactor removed. Exploitation is slow and noisy (roughly one attempt in ten thousand, hours of work in the lab, glibc-Linux only), but the lesson stands: **key-only authentication does not protect you from a pre-auth bug**, which is the strongest argument for not exposing port 22 to the internet.

**Terrapin (CVE-2023-48795)**, disclosed 2023-12-18, is a prefix-truncation attack on the specification rather than one implementation: an MITM injects ignorable packets during the handshake and deletes a matching count from the start of the encrypted channel, keeping sequence numbers consistent so the MAC still verifies. It affects ChaCha20-Poly1305 and CBC with ETM MACs, not AES-GCM. Against OpenSSH the real impact is limited to downgrading extension negotiation; against AsyncSSH it was considerably worse. The fix is **strict key exchange, shipped in OpenSSH 9.6**, which resets sequence numbers after every key exchange, and it requires **both ends** to support it, so an unpatched login node leaves you unprotected regardless of your client.

Since then: **CVE-2025-26465** (client-side MITM when `VerifyHostKeyDNS` is enabled, fixed in 9.9p2, directly relevant if you enabled that to tame known_hosts churn), **CVE-2025-26466** (pre-auth denial of service), **CVE-2025-61984** (control characters in usernames yielding code execution when a `ProxyCommand` is configured, which is the crafted-git-URL scenario, fixed in 10.1), and batches in 10.3, 10.4, and 10.5 dominated by scp/sftp path handling, forwarding restrictions that did not restrict, and a client use-after-free on host-key change during rekey. **Patch cadence matters more than it used to.**

**Hardening baseline**: `PasswordAuthentication no`, `PermitRootLogin no`, `AllowGroups`, `MaxAuthTries 3`, `MaxStartups 10:30:60`, `LoginGraceTime 30`, forwarding scoped per `Match` block, and **`PerSourcePenalties`** (OpenSSH 9.8+), which is native fail2ban-lite: sshd penalises source addresses for auth failures and protocol errors with no log-parsing daemon, no root-owned regex, and no race between log write and ban. Moving to port 2222 cuts log volume and nothing else.

**Modern alternatives to an internet-facing bastion**: AWS **SSM Session Manager** (no inbound ports, IAM-authorised, CloudTrail-audited, and it still supports plain `ssh` via a `ProxyCommand` so `-J` and `rsync` keep working), **Tailscale or WireGuard** (device identity, ACLs, NAT traversal, port 22 never facing the internet), and **Teleport** (SSH CA with short-lived certificates, SSO, RBAC, session recording) where you need auditable multi-user access to GPU boxes. On a university cluster you rarely get to choose, and ProxyJump plus ControlPersist is what makes institutional VPN plus 2FA tolerable.

### Deltas worth knowing since 2025 (1 min)

- `ssh-add` now expires certificates automatically.
- **RFC 9987 (May 2026) standardised the SSH agent protocol**, so third-party agents (password managers, cloud KMS) should interoperate better than the previous de-facto arrangement.
- VS Code Remote-SSH needs glibc 2.28 or newer on the remote, so CentOS 7 login nodes are out. Pair it with `ControlPersist 4h` so its several channels do not re-trigger 2FA.

### Connections

- Host keys, trust-on-first-use, and how this compares with the CA model on the web: [TLS and PKI: handshake, certificates, and mTLS](tls-and-pki.md) (22 min read · +17h 30m resources).
- Keepalives, idle timeouts, and why `ServerAliveInterval` beats `TCPKeepAlive`: [TCP, UDP, and IP: the transport foundations](tcp-udp-ip.md) (17 min read · +5h 35m resources).
- SSHFP records and the DNSSEC dependency that makes them meaningful: [DNS: resolution, caching, and the failure modes](dns.md) (21 min read · +6h 15m resources).
