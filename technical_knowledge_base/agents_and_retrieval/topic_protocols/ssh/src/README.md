# src: SSH page

`sh build.sh` writes `../index.html` from `parts/` (numbers written `[[key]]` in the text are filled from `numbers.json` by `fill_numbers.py`). `python3 check_embed.py` confirms the page carries exactly the data rebuilt from `raw/`, that the prose's qualitative claims hold in the recording, and that nothing committed contains a private key, token or private string. `node check_ui.mjs <dir>` (from the repo root) clicks every control at 390 px dark and 920 px light.

## The lab
`sh run_all.sh [WORKDIR]` re-records everything (about 12 minutes; Docker, OpenSSH 10.x, Python 3, curl):

- `lab/Dockerfile.edge` (Alpine edge, OpenSSH 10.5p1) for the bastion and `gpu-node-01`; `lab/Dockerfile.legacy` (Alpine 3.20, patched OpenSSH 9.7p1) for `gpu-node-02`. `lab/entry.sh` generates fresh host keys at every start (a rebuilt node), creates users `khalid` and `alice`, and on `gpu-node-01` starts `lab/notebook.py`, a token-protected stand-in for Jupyter, three ways (loopback, all interfaces, Unix socket in a 0700 directory).
- `lab/up.sh`, `lab/down.sh`: containers `proto-ssh-*` with `--rm --cpus 1 --memory 1g`; the bastion is on an edge network published on `127.0.0.1:30922` and on an `--internal` cluster network with the nodes.
- `lab/laptop.conf`, `lab/cert.conf`: the client configs, always used with `-F`; the user's `~/.ssh` is never read. Private keys, `known_hosts`, the agent socket and control sockets stay in WORKDIR; only public keys and certificates are copied to `raw/`.
- `lab/wire_relay.py`: a TCP relay that decodes SSH packets until `NEWKEYS` (banner, message types, sizes, KEXINIT lists) and then records encrypted sizes and times. No packet capture was possible (no sudo), so nothing below TCP payload is shown.
- `lab/exp_*.py`: one script per experiment (kex, jump, agent, mux, certs, hostkeys, fwd, misc, penalty, extra, xfer); `lab/common.py` runs commands and redacts paths, the laptop's host name and the parent's private patterns.
- `make_data.py` turns `raw/` into `parts/21_js_data.js` and `numbers.json`.

## Shape
Child page method (Part B of `html_utils/methods/topic_pages.md`): Reading organised by the protocol's own logic (wire, keys, host keys, certificates, jump hosts, agent, multiplexing, tunnels, keepalives, files, post-quantum, security, cluster workflows, debugging, interview), one standalone lab tab, an error decoder tab for the debugging goal, Further reading. The old page is `../../src/read/old/ssh.md`; every fact is mapped in `coverage.json` (verified, corrected with a visible box, or measured in the lab).

## Sources
`inputs/` holds extracts fetched on 2026-10-05: OpenSSH release notes 9.0 to 10.5, the OpenSSH post-quantum page, RFC 10042 sections 2.1 to 2.4, the head of Qualys's regreSSHion advisory.
