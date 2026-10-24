import sys,re
from html.parser import HTMLParser
class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.out=[]; s.skip=0
    def handle_starttag(s,t,a):
        if t in('script','style','noscript','annotation','annotation-xml','svg'): s.skip+=1
        if t=='math':
            alt=dict(a).get('alttext')
            if alt and not s.skip: s.out.append(' $'+alt+'$ ')
            s.skip+=1
        if t in('p','div','li','h1','h2','h3','h4','h5','br','tr','section','figcaption','caption'): s.out.append('\n')
        if t in('td','th'): s.out.append(' | ')
    def handle_endtag(s,t):
        if t in('script','style','noscript','annotation','annotation-xml','svg','math'): s.skip=max(0,s.skip-1)
    def handle_data(s,d):
        if not s.skip: s.out.append(d)
for f in sys.argv[1:]:
    p=P(); p.feed(open(f,encoding='utf-8',errors='ignore').read())
    t=''.join(p.out); t=re.sub(r'[ \t]+',' ',t); t=re.sub(r'\n\s*\n+','\n',t)
    open(re.sub(r'\.html$','',f)+'.txt','w').write(t)
