"""Bundle every result the page shows into parts/20_js_bk_data.js (window.BKD), from the out/ folders.
The page embeds exactly these files' numbers (check_data.py verifies it). usage: python3 -I gen_data.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda *p: json.load(open(os.path.join(HERE, *p)))
opt = lambda *p: J(*p) if os.path.exists(os.path.join(HERE, *p)) else None
D = {
    'frag': J('evict', 'out', 'frag.json'),
    'ev': J('evict', 'out', 'evict_grid.json'),
    'evanim': opt('evict', 'out', 'evict_anim.json'),
    'evcheck': [J('evict', 'out', 'vllm_evict_conversation.json'), J('evict', 'out', 'vllm_evict_toolagent.json')],
    'sch': J('sched', 'out', 'sched.json'),
    'regress': J('sched', 'out', 'regress.json'),
    'meas': opt('exp', 'out', 'measured.json'),
    'kvc': opt('kvc', 'out', 'kvc_summary.json'),
}
js = ('// ---- data for every tab, written by src/gen_data.py from src/*/out/*.json; do not edit by hand ----\n'
      'window.BKD=' + json.dumps(D, separators=(',', ':')) + ';\n')
open(os.path.join(HERE, 'parts', '20_js_bk_data.js'), 'w').write(js)
print(len(js), 'bytes')
