"""Write the prose numbers into the built page's static HTML, so they show without script and the knowledge ledger can find them.
<span data-lo="k"></span> is filled from window.LO.facts (gen_data.py) and <span data-mf="k"></span> from window.MF.facts (formats/gen_data.py);
the page's script fills the same values again at load. Usage (from src/, run by build.sh): python3 -I bake_facts.py ../index.html"""
import json, re, sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
for var, attr in (('LO', 'data-lo'), ('MF', 'data-mf')):
    m = re.search(r'window\.' + var + r'=(\{.*?\});\n', s, re.S)
    F = json.loads(m.group(1).replace('{\\u007b', '{{'))['facts']
    def fill(mm):
        k = mm.group(1)
        if k not in F:
            sys.exit('bake_facts: missing ' + attr + ' ' + k)
        return '<span ' + attr + '="' + k + '">' + str(F[k]) + '</span>'
    s = re.sub(r'<span ' + attr + r'="(\w+)"></span>', fill, s)
open(p, 'w', encoding='utf-8').write(s)
