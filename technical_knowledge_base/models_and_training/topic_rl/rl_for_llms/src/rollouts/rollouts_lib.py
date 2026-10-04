import re
def num(s):
    s = s.replace(',', '').replace('$', '').strip()
    m = re.findall(r'-?\d+(?:\.\d+)?', s)
    return float(m[-1]) if m else None

def v_boxed(text, gold):
    b = re.findall(r'\\boxed\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', text)
    if not b: return 0
    v = num(b[-1]); return int(v is not None and abs(v - gold) < 1e-6)

def v_last(text, gold):
    v = num(text); return int(v is not None and abs(v - gold) < 1e-6)

def v_any(text, gold):
    vals = [float(x) for x in re.findall(r'-?\d+(?:\.\d+)?', text.replace(',', ''))]
    return int(any(abs(v - gold) < 1e-6 for v in vals))

