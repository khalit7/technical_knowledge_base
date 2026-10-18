"""Write parts/33_tab_calc_d.html: the code section of the Config calculator tab, quoting calc.py and the recorded
outputs of validate.py and check_js_equals_py.mjs (out/validate_stdout.txt, out/js_check_stdout.txt) verbatim.
It also closes the tab's div. Run after: python3 validate.py > out/validate_stdout.txt; node check_js_equals_py.mjs > out/js_check_stdout.txt"""
import html, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'calc.py')).read()


def func(name):
    m = re.search(r'^def ' + name + r'\(.*?(?=^def |\Z)', src, re.S | re.M)
    return m.group(0).rstrip() + '\n'


def lines_of(name):
    i = src.index('def ' + name + '(')
    return src[:i].count('\n') + 1


code = func('mixer_params') + '\n\n' + func('ffn_params') + '\n\n' + func('params')
val = open(os.path.join(HERE, 'out', 'validate_stdout.txt')).read()
js = open(os.path.join(HERE, 'out', 'js_check_stdout.txt')).read()
assert '\u2014' not in code + val + js
out = '''
<section id="cc-s-code"><h2>The code</h2>
<p>The formulas live once, in <code>src/calc/calc.py</code> (standard library only); <code>parts/33_js_cc_1core.js</code> is a line-by-line port. Below: the parameter functions as they ran, the validation output, and the check that the page's JavaScript gives the same numbers as the Python on every config at five context lengths.</p>
<details class="cc-det"><summary>calc.py: mixer_params, ffn_params and params (from line %d)</summary>
<div class="cc-code">%s</div></details>
<details class="cc-det"><summary>python3 validate.py (run 2026-10-18)</summary>
<div class="cc-code cc-out">%s</div>
<p class="cc-codecap">Columns: calculated main model, MTP layers shipped in the checkpoint, vision tower, other stored tensors (buffers, FP8 scales, a duplicated head), the Hub's count, and the residual.</p></details>
<details class="cc-det"><summary>node check_js_equals_py.mjs (run 2026-10-18)</summary>
<div class="cc-code cc-out">%s</div></details>
</section>
</div>
''' % (lines_of('mixer_params'), html.escape(code), html.escape(val.rstrip()), html.escape(js.rstrip()))
open(os.path.join(HERE, '..', 'parts', '33_tab_calc_d.html'), 'w').write(out)
print(len(out), 'bytes')
