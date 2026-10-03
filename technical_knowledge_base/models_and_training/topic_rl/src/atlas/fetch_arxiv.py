#!/usr/bin/env python3
"""Fetch arXiv metadata (title, authors, v1 date, abstract) for every arXiv paper the atlas cites.
Writes inputs/arxiv.json. The check script verifies every quoted abstract sentence against it.
usage: python3 src/atlas/fetch_arxiv.py"""
import json, os, re, time, urllib.request, xml.etree.ElementTree as ET
HERE = os.path.dirname(os.path.abspath(__file__))
IDS = """1312.5602 1509.06461 1511.06581 1511.05952 1707.06887 1710.10044 1710.02298 1602.01783 1502.05477
1707.06347 1506.02438 1509.02971 1802.09477 1801.01290 1812.05905 1712.01815 1911.08265 1912.01603 2301.04104
1606.03476 2006.04779 2110.06169 2106.01345 1706.03741 1909.08593 2009.01325 2203.02155 2305.18290 2402.03300
2501.12948 2402.14740 2503.20783 2503.14476 2507.18071 2411.15124 2608.16072 2601.05242 2505.09388 1912.06680
2003.13350 2202.06626 2407.21783 2410.24164 2303.04137 2004.07219 1606.01540 2507.20534 2501.03262""".split()
NS = {'a': 'http://www.w3.org/2005/Atom'}
out = {}
for i in range(0, len(IDS), 20):
    q = ','.join(IDS[i:i+20])
    x = urllib.request.urlopen('https://export.arxiv.org/api/query?max_results=50&id_list=' + q, timeout=60).read()
    root = ET.fromstring(x)
    for e in root.findall('a:entry', NS):
        aid = re.sub(r'v\d+$', '', e.find('a:id', NS).text.split('/abs/')[-1])
        out[aid] = {
            'title': ' '.join(e.find('a:title', NS).text.split()),
            'authors': [a.find('a:name', NS).text for a in e.findall('a:author', NS)],
            'published': e.find('a:published', NS).text[:10],
            'updated': e.find('a:updated', NS).text[:10],
            'abstract': ' '.join(e.find('a:summary', NS).text.split()),
        }
    time.sleep(3)
miss = [i for i in IDS if i not in out]
json.dump(out, open(os.path.join(HERE, 'inputs', 'arxiv.json'), 'w'), indent=1, ensure_ascii=False)
print(len(out), 'fetched; missing', miss)
for k in IDS:
    if k in out: print(k, out[k]['published'], out[k]['title'][:80], '|', out[k]['authors'][0])
