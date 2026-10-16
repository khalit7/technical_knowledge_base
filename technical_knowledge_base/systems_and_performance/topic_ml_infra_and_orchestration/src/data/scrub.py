#!/usr/bin/env python3
"""Scrub a log for the repo: strip ANSI colour codes, replace Docker-internal IPv4 addresses by stable
placeholders (<ip-1>, <ip-2>, ... in order of first appearance), drop the user's paths and hostnames.
usage: python scrub.py < raw.log > clean.log   (optional args: lines matching any regex given are dropped)"""
import re, sys, socket, os
text = sys.stdin.read()
text = re.sub(r"\x1b\[[0-9;]*m", "", text)
ips = {}
def ip(m):
    ips.setdefault(m.group(0), f"<ip-{len(ips) + 1}>")
    return ips[m.group(0)]
text = re.sub(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", ip, text)
for s in {socket.gethostname(), socket.gethostname().split(".")[0], os.path.expanduser("~"), os.environ.get("USER", "")}:
    if s and len(s) > 2:
        text = text.replace(s, "<redacted>")
text = re.sub(r"/(private/)?tmp/claude-[^\s\"']*", "<scratch>", text)
drop = [re.compile(r) for r in sys.argv[1:]]
sys.stdout.write("".join(l for l in text.splitlines(True) if not any(d.search(l) for d in drop)))
