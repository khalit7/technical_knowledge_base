"""Write parts/22_js_rd_data.js (window.RDL) from lab_values.json: one HTML string per data-rd key,
filled from the labs' recorded outputs when the lead resumes the Reading agent. Keys still missing keep their TODO text on the page."""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
vals = json.load(open(os.path.join(H, 'lab_values.json'), encoding='utf-8'))
js = '// written by src/read/make_read_data.py from src/read/lab_values.json; do not edit by hand\nwindow.RDL=' + json.dumps(vals, ensure_ascii=False, sort_keys=True) + ';\n'
open(os.path.join(H, '..', 'parts', '22_js_rd_data.js'), 'w', encoding='utf-8').write(js)
print(len(vals), 'keys')
