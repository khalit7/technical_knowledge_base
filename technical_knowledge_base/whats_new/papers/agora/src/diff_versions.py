import re,sys,difflib
def sents(f):
    t=open(f).read(); t=t.split('\nReferences\n')[0]
    t=re.sub(r'\s+',' ',t)
    return [s.strip() for s in re.split(r'(?<=[.;:])\s+(?=[A-Z0-9(])',t) if s.strip()]
a,b=sents(sys.argv[1]),sents(sys.argv[2])
for op,i1,i2,j1,j2 in difflib.SequenceMatcher(None,a,b,autojunk=False).get_opcodes():
    if op=='equal': continue
    A=' '.join(a[i1:i2]); B=' '.join(b[j1:j2])
    if not re.search(r'\d',A+B): continue
    print('---',op); print(' OLD:',A[:900]); print(' NEW:',B[:900])
