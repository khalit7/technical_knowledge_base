"""Build parts/21_js_data.js from the recorded lab outputs in raw/ (run by run_all.sh; safe to rerun alone).
Everything the page shows from the lab comes from here, so check_embed.py can confirm the page matches raw/."""
import json, os, re, glob
H = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(H, "raw")
def rd(n): return open(os.path.join(R, n)).read()
def jl(n): return [json.loads(l) for l in open(os.path.join(R, n))]
def js(n): return json.load(open(os.path.join(R, n)))
D = {}
KEX = ["curve25519-sha256", "mlkem768x25519-sha256", "sntrup761x25519-sha512", "ecdh-sha2-nistp256"]
ks = js("kex_summary.json")
D["kex"] = {}
for k in KEX:
    ev = jl(f"wire_{k}.jsonl")
    pk = [{"dir": e["dir"], "ev": e["ev"], "name": e.get("name", e.get("text", "")), "msg": e.get("msg"),
           "bytes": e.get("wire_bytes", e.get("bytes")), "payload": e.get("payload_bytes"), "t": e["t_ms"],
           **({"kexlist": e["lists"]["kex_algorithms"], "hostkeys": e["lists"]["server_host_key_algorithms"], "ciphers": e["lists"]["encryption_c2s"]} if "lists" in e else {})}
          for e in ev if e["ev"] in ("banner", "packet", "encrypted_total")]
    D["kex"][k] = {"packets": pk, "median_ms": ks["timing"][k]["median_ms"], "runs_ms": ks["timing"][k]["runs_ms"]}
D["delay40"] = [{"dir": e.get("dir"), "ev": e["ev"], "name": e.get("name", e.get("text", "")), "bytes": e.get("wire_bytes", e.get("bytes")), "t": e["t_ms"]}
                for e in jl("wire_delay40.jsonl") if e["ev"] in ("banner", "packet", "encrypted")]
wj = jl("wire_jump.jsonl")
D["jumpwire"] = {"plain": [{"dir": e["dir"], "name": e.get("name", e.get("text")), "bytes": e.get("wire_bytes", e.get("bytes"))} for e in wj if e["ev"] in ("banner", "packet")],
                 "enc": {e["dir"]: e["bytes"] for e in wj if e["ev"] == "encrypted_total"}}
D["jump"] = js("jump_timing.json"); D["mux"] = js("mux_timing.json")
D["xfer"] = js("xfer.json") if os.path.exists(os.path.join(R, "xfer.json")) else None
D["reach"] = js("fwd_who_reaches.json")
# logs shown verbatim (trimmed to the lines that matter)
def trim_vvv(t, keep_re=None, drop=r"debug3: (send packet|receive packet|ssh_packet|kex_parse|record_hostkey|load_hostkeys|channel \d+: rcvd adjust|.*pledge)"):
    out = []
    for l in t.splitlines():
        if re.match(drop, l): continue
        if keep_re and not re.search(keep_re, l): continue
        out.append(l[:220])
    return "\n".join(out)
L = {}
for n in ["agent_forward.txt", "agent_proxyjump.txt", "agent_constrained.txt", "agent_constrain_add.txt", "cert_good.txt", "cert_expired.txt", "cert_wrong_principal.txt",
          "cert_no_principal.txt", "cert_revoked.txt", "cert_krl_query.txt", "hk_first_contact.txt", "hk_strict_unknown.txt", "hk_changed_acceptnew.txt", "hk_changed_no.txt",
          "hk_remove.txt", "hk_cert_ok.txt", "hk_cert_after_rebuild.txt", "hk_cert_wrong_name.txt", "fwd_L.txt", "fwd_L_unix.txt", "fwd_D.txt", "fwd_R.txt", "fwd_port_taken.txt",
          "keepalive.txt", "pq_warning.txt", "too_many_auth.txt", "sshd_T.txt", "sshd_T_legacy.txt", "ssh_G.txt", "ssh_Z.txt", "penalties.txt", "mux_check.txt", "mux_conninfo.txt",
          "mux_channels.txt", "mux_exit.txt", "banner_vs_package.txt", "errors_extra.txt"]:
    p = os.path.join(R, n)
    if os.path.exists(p): L[n[:-4]] = rd(n).rstrip()
# certificate cases: drop ssh-keygen -L extension lists and the config-applying lines to keep them short
for k in list(L):
    if k.startswith("cert_") and k != "cert_krl_query":
        L[k] = "\n".join(l for l in L[k].splitlines() if not re.match(r"\s+permit-|debug1: cert.conf line|\s+Extensions:|\s+Critical", l))
L["vvv_bastion"] = trim_vvv(rd("vvv_bastion.txt"), drop=r"debug3: (send packet|receive packet|ssh_packet|kex_parse|record_hostkey|load_hostkeys|channel \d+: rcvd adjust|.*pledge|set_sock_tos|channel_clear|fd \d)|debug2: (MACs|compression|languages|first_kex|reserved|fd \d)")
L["vvv_jump"] = trim_vvv(rd("vvv_jump.txt"), keep_re=r"ProxyCommand|proxy command|Started with|stdio|direct-tcpip|Authenticated|kex: algorithm|Server host key|remote software|Connecting to")
L["bastion_log_jump"] = trim_vvv(rd("bastion_log_jump.txt"), keep_re=r"Accepted publickey|direct.tcpip|Connection from|channel 0: new")
L["mux_vvv_reuse"] = trim_vvv(rd("mux_vvv_reuse.txt"), keep_re=r"mux|Mux|master|exit|Exit|^\$|^#|\[exit")
D["logs"] = L

# numbers quoted in the Reading text: build.sh replaces [[key]] with these
def kx(k, name): return next(p["bytes"] for p in D["kex"][k]["packets"] if p["name"].startswith(name))
N = {}
for k, s in (("mlkem768x25519-sha256", "ml"), ("curve25519-sha256", "cv"), ("sntrup761x25519-sha512", "sn"), ("ecdh-sha2-nistp256", "ec")):
    N[f"kex_{s}_init"] = kx(k, "KEX_ECDH_INIT"); N[f"kex_{s}_reply"] = kx(k, "KEX_ECDH_REPLY"); N[f"kex_{s}_ms"] = round(D["kex"][k]["median_ms"])
    N[f"kex_{s}_kexbytes"] = N[f"kex_{s}_init"] + N[f"kex_{s}_reply"]
N["kexinit_s"] = kx("curve25519-sha256", "KEXINIT")
N["kexinit_c_full"] = next(e["bytes"] for e in D["delay40"] if e["name"] == "KEXINIT" and e["dir"] == "c2s")
pk = D["kex"]["mlkem768x25519-sha256"]["packets"]
N["enc_c2s"] = next(p["bytes"] for p in pk if p["ev"] == "encrypted_total" and p["dir"] == "c2s"); N["enc_s2c"] = next(p["bytes"] for p in pk if p["ev"] == "encrypted_total" and p["dir"] == "s2c")
N["d40_done"] = round(max(e["t"] for e in D["delay40"]))
N["d40_banner"] = round(next(e["t"] for e in D["delay40"] if e["ev"] == "banner" and e["dir"] == "s2c"))
N["d40_newkeys"] = round(max(e["t"] for e in D["delay40"] if e["name"] == "NEWKEYS"))
N["jump_b"] = round(D["jump"]["bastion"]["median_ms"]); N["jump_n"] = round(D["jump"]["gpu-node-01 via bastion"]["median_ms"])
m = D["mux"]
N["mux_b"] = round(m["bastion, fresh connection each time"]["median_ms"]); N["mux_n"] = round(m["gpu-node-01 via bastion, fresh each time"]["median_ms"])
N["mux_first"] = round(m["gpu-node-01 first (creates master)"]["ms"]); N["mux_reuse"] = round(m["gpu-node-01 via existing master"]["median_ms"])
N["mux_x"] = round(m["gpu-node-01 via bastion, fresh each time"]["median_ms"] / m["gpu-node-01 via existing master"]["median_ms"], 1)
N["mux_10_fresh_s"] = round(sum(m["gpu-node-01 via bastion, fresh each time"]["runs_ms"]) / 1000, 1)
N["mux_10_mux_s"] = round((m["gpu-node-01 first (creates master)"]["ms"] + sum(m["gpu-node-01 via existing master"]["runs_ms"][:9])) / 1000, 1)
N["jw_c2s"] = D["jumpwire"]["enc"]["c2s"]; N["jw_s2c"] = D["jumpwire"]["enc"]["s2c"]
ka = L.get("keepalive", "")
mm = re.findall(r"ssh exited \d+ after ([\d.]+) s", ka); N["keep_sa"] = mm[0] if mm else "?"
mm = re.findall(r"still waiting after (\d+) s", ka); N["keep_none"] = mm[0] if mm else "?"
mm = re.findall(r"activating ipv4 penalty of ([\d.]+) seconds", L.get("penalties", "")); N["pen_s"] = mm[0] if mm else "?"
if D["xfer"]:
    X = D["xfer"]; f = lambda k: round(X[k]["median_ms"] / 1000, 1)
    N["x_scp_small"] = f("scp -r (1000 x 4 KiB)"); N["x_rsync_small"] = f("rsync -a (1000 x 4 KiB)"); N["x_tar_small"] = f("tar | ssh tar -x (1000 x 4 KiB)")
    N["x_scp_big"] = f("scp (one 64 MiB file)"); N["x_rsync_big"] = f("rsync -a (one 64 MiB file)")
    st = X["resume"]["stats"]; mm = re.search(r"Matched data: ([\d,]+)", st); N["x_resume_matched"] = int(mm.group(1).replace(",", "")) if mm else "?"
    mm = re.search(r"\s(\d{6,})\s", " " + X["resume"]["after_interrupt"] + " "); N["x_partial"] = int(mm.group(1)) if mm else "?"
    N["x_resume_s"] = round(X["resume"]["resume_ms"] / 1000, 1)
json.dump(N, open(os.path.join(H, "numbers.json"), "w"), indent=1)
D["N"] = N
D["pub"] = {os.path.basename(p): open(p).read().strip() for p in sorted(glob.glob(os.path.join(R, "*.pub")))}
out = "// Generated by make_data.py from raw/ (the lab run of " + os.environ.get("LAB_DATE", "2026-10-05") + "). Do not edit.\nwindow.SSHD=" + json.dumps(D, separators=(",", ":")) + ";\n"
open(os.path.join(H, "parts/21_js_data.js"), "w").write(out)
print("21_js_data.js", len(out), "bytes;", len(L), "logs")
