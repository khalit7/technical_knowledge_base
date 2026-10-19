"""Coverage of this page against what it must carry: the Notion row as fetched (src/live.md) and, because the row had
no body yet, the paper's own claims (abstract, introduction, conclusions of each results section).

  python3 mk_coverage.py        (after build.sh; writes coverage.json)

Each item lists phrases that must all appear in the built page's text (tags stripped). The list is this paper's own,
written from live.md and inputs/paper_v1.txt; it is not copied from another page.
"""
import html, json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, '..', 'index.html'), encoding='utf-8').read()
text = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<script.*?</script>|<style.*?</style>|<[^>]+>', ' ', page, flags=re.S)))
data = page  # numbers drawn by scripts live in the embedded data
NEW = "Letting the model rewrite its own context as a file beats harness-side context management at lower cost in zero-shot runs (BrowseComp-Plus +11.4% accuracy with 21.5% fewer FLOPs) and makes context management learnable; after online RL the solid gain is cost (38.8% fewer FLOPs), since the +47.6% is measured against CLM's own untrained start and an equally trained summary harness is within noise."
ITEMS = [
 # live.md: the row's properties and body
 # the Takeaway property: live.md holds the version fetched on 19 October 2026; the coordinator rewrote the property the
 # same day (after this page found the RL comparison), and the card carries the new text verbatim
 ('live.takeaway', 'Takeaway property, current text, verbatim on the headline card', [NEW], 'Notion property (rewritten 19 October 2026)'),
 ('live.takeaway.bcp', 'zero-shot: BrowseComp-Plus +11.4% accuracy with 21.5% fewer FLOPs', ['+11.4%', '21.5% fewer'], 'Takeaway'),
 ('live.takeaway.rl', 'after RL the solid gain is cost (38.8% fewer FLOPs); +47.6% is against CLM\'s own start; trained summary harness within noise', ['38.8% fewer', '47.6%', '0.4 points'], 'Takeaway'),
 ('live.takeaway.learn', 'context management becomes learnable', ['makes context management learnable'], 'Takeaway'),
 ('live.takeaway.old', 'the fetched Takeaway\'s "+47.6% for Qwen3.5-9B after online RL" (live.md), explained on the page', ['47.6%', 'own untrained start'], 'live.md Takeaway (superseded)'),
 # the paper's claims
 ('abs.def', 'CLMs natively manage their own context, implemented as a file the model may update without restriction', ['context as a file', 'unrestricted updates'], 'Abstract, §4.1'),
 ('abs.multi', 'extends to multi-agent systems: several context files', ['Several agents are several files'], 'Abstract, §4.1'),
 ('abs.bcp', 'zero-shot: 11.4% higher accuracy with 21.5% fewer FLOPs on BrowseComp-Plus', ['59.4%', '53.3%', '11.4%', '21.5% fewer prefix-reuse FLOPs'], 'Abstract, §5.1.1'),
 ('abs.edge', '5% higher scores with 59% fewer FLOPs on 12-hour EdgeBench', ['44.6', '179', '437', '5% higher with 59% fewer FLOPs'], 'Abstract, §5.1.2'),
 ('abs.sw', '65% greater improvement at the same compute on a 24-hour multi-repository swarm', ['65% greater speedup', '1.044', '1.026'], 'Abstract, §5.1.2'),
 ('abs.learn', 'in-context and parametric learning of context management', ['Tell it', 'Evolve the instruction', 'Train it'], 'Abstract, §4.2'),
 ('abs.steer', 'steered with natural-language instructions', ['One sentence steers it', '16.0K, 23.6K and 30.9K'], 'Abstract, §5.2'),
 ('abs.evo', 'skill evolution improves held-out accuracy by up to 35.9 points while reducing compute', ['35.9 points', '38.3%', '74.2%'], 'Abstract, Appendix F'),
 ('abs.rl', 'online RL improves Qwen3.5-9B on BrowseComp-Plus by 47.6% with 12% fewer FLOPs', ['47.6%', '12% fewer FLOPs', '28.8%', '42.5%'], 'Abstract, Table 2'),
 ('abs.scr', 'Suffix Cache Reuse cuts server-side compute by 35% against standard SGLang at matched performance', ['35% less', '7.14', '10.98', '60.2%'], 'Abstract, §5.3'),
 ('intro.tb', 'matches the strongest baseline on TerminalBench 2.1 with 29.5% fewer FLOPs', ['53.4%', '29.5% fewer'], '§1'),
 ('intro.tblite', 'TBLite 73.7% against 67.0% with 91% of the FLOPs', ['73.7%', '67.0%', '91% of the FLOPs'], '§5.1.1'),
 ('intro.math', 'beats OpenEvolve by up to 16.8% (Heilbronn) and 3.0% (circle packing)', ['16.8%', '3.0%', '2.618', '0.03653'], '§1, Table 1'),
 ('intro.emerge', 'emergent behaviours: trackers for orchestration, a new chat role for notes, reusable functions', ['163 in-place edits', 'role=notes', 'compact_turns'], '§1, Figure 3'),
 ('intro.rl2', 'RL: 28.8% to 42.5%, 0.4 points over the trained summary harness, 38.8% fewer FLOPs', ['0.4 points', '38.8% fewer'], '§1, §5.2'),
 ('m.flops', 'prefix-reuse FLOPs: prefill from the first mismatch plus decode', ['prefix-reuse FLOPs', 'first mismatch'], '§4.1, Eq. 3'),
 ('m.appc', 'Appendix C constants for Qwen3.6-27B and the Figure 16 example', ['48.70', '3.93', '1.41', '5.74', '10.81'], 'Appendix C'),
 ('m.eq6', 'success-gated efficiency advantage, zero for failures and for groups with fewer than two successes', ['success-gated efficiency advantage', 'fewer than two successes'], '§4.2, Eq. 6'),
 ('m.stepgrpo', 'stepwise GRPO broadcasts the trajectory advantage to every call', ['Stepwise GRPO'], '§4.2'),
 ('m.scr', 'SCR relocates surviving spans, re-rotates keys, K = 6, hybrid recurrent snapshot', ['re-rotates', 'K = 6', 'recurrent state'], '§4.3, Appendix B'),
 ('m.strip', 'most SCR reuse comes from reasoning stripping (5.3 of 7.8 points)', ['5.3', '2.5', 'reasoning stripping'], 'Appendix B, Figure 14'),
 ('m.ctxbench', 'ContextBench: four synthetic tasks, 32K limit, pressure up to 24x', ['Needle Retention', 'Sudoku Sketchpad', 'KV Store', 'Log Triage', '24×'], '§3, Appendix D'),
 ('r.9b', 'Qwen3.5-9B: CLM 39.9% against Summary 37.7%; fewer edits; median peak 30.2K', ['39.9%', '37.7%', '30.2K'], 'Appendix F'),
 ('r.edge128', 'EdgeBench-10 at 128K: CLM 47.3, Summary 47.8, CLM with subagents 50.2', ['47.3', '47.8', '50.2'], 'Appendix F, Figure 27'),
 ('r.sonnet', 'EdgeBench-10 with Claude 4.6 Sonnet: 51.0 and 50.4 against 42.3', ['51.0', '50.4'], '§5.1.2'),
 ('d.safety', 'safety: an editable context is a new channel for persistent injected instructions', ['attack surface'], '§6'),
 ('d.future', 'future work: scale CLM RL; distil harnesses into CLMs', ['distilled into weights'], '§6'),
]
out, missing = [], 0
for iid, fact, needles, where in ITEMS:
    miss = [n for n in needles if n not in text and n not in data]
    out.append({'id': iid, 'fact': fact, 'where_in_paper': where, 'needles': needles, 'found': not miss, 'missing': miss})
    missing += bool(miss)
dropped = [{'fact': 'Row body "Being built in the technical_knowledge_base repository."', 'reason': 'a placeholder, not a fact; replaced by this page'}]
json.dump({'items': out, 'dropped': dropped, 'n': len(out), 'found': len(out) - missing}, open(os.path.join(HERE, 'coverage.json'), 'w'), indent=1, ensure_ascii=False)
print('coverage: %d items, %d found, %d dropped with reason' % (len(out), len(out) - missing, len(dropped)))
for o in out:
    if not o['found']: print('  MISSING', o['id'], o['missing'])
