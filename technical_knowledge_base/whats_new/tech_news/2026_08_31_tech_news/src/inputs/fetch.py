#!/usr/bin/env python3
"""Fetch source pages to plain text (inputs/<name>.txt). Usage: fetch.py name url [name url ...]"""
import sys, subprocess, re, html
def text(h):
    h = re.sub(r'(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>', ' ', h)
    h = re.sub(r'(?i)<br\s*/?>|</(p|div|li|h[1-6]|tr|td|th|section|article)>', '\n', h)
    h = re.sub(r'<[^>]+>', ' ', h); h = html.unescape(h)
    h = re.sub(r'[ \t]+', ' ', h); h = re.sub(r'\n\s*\n+', '\n', h)
    return h.strip()
a = sys.argv[1:]
for name, url in zip(a[::2], a[1::2]):
    r = subprocess.run(['curl', '-sL', '--compressed', '-m', '30', '-A', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/126 Safari/537.36', '-w', '\n__CODE__%{http_code}', url], capture_output=True)
    raw = r.stdout.decode('utf-8', 'replace'); code = raw.rsplit('__CODE__', 1)[-1]
    t = text(raw.rsplit('__CODE__', 1)[0])
    open(f'{name}.txt', 'w').write(f'SOURCE: {url}\nFETCHED: 2026-10-02 HTTP {code}\n\n' + t)
    print(name, code, len(t))
