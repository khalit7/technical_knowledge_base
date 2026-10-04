"""A small LaTeX-to-HTML converter for contest statements and answers (no external libraries are allowed in the page).
Covers what the MathArena AIME 2025/2026 and HMMT February 2026 statements use; anything unknown keeps its name without the backslash."""
import re, html
SYM={'cdot':'·','times':'×','le':'≤','leq':'≤','ge':'≥','geq':'≥','neq':'≠','ne':'≠','pm':'±','mp':'∓','infty':'∞','pi':'π','theta':'θ','alpha':'α','beta':'β','gamma':'γ','delta':'δ','Delta':'Δ','omega':'ω','Omega':'Ω','phi':'φ','varphi':'φ','lambda':'λ','mu':'μ','sigma':'σ','tau':'τ','epsilon':'ε','varepsilon':'ε','rho':'ρ','zeta':'ζ','eta':'η','xi':'ξ','psi':'ψ','chi':'χ','nu':'ν','kappa':'κ','iota':'ι',
 'angle':'∠','triangle':'△','circ':'∘','ldots':'…','cdots':'⋯','dots':'…','vdots':'⋮','in':'∈','notin':'∉','subset':'⊂','subseteq':'⊆','cup':'∪','cap':'∩','mid':'∣','nmid':'∤','equiv':'≡','approx':'≈','sim':'∼','cong':'≅','parallel':'∥','perp':'⊥','to':'→','rightarrow':'→','Rightarrow':'⇒','leftarrow':'←','implies':'⇒','iff':'⇔','sum':'∑','prod':'∏','int':'∫','partial':'∂','emptyset':'∅','forall':'∀','exists':'∃','lfloor':'⌊','rfloor':'⌋','lceil':'⌈','rceil':'⌉','langle':'⟨','rangle':'⟩','prime':'′','star':'⋆','bullet':'•','dagger':'†','ell':'ℓ','deg':'°','neg':'¬','wedge':'∧','vee':'∨','oplus':'⊕','setminus':'∖','div':'÷','lvert':'|','rvert':'|','vert':'|','|':'‖','quad':'\u2003','qquad':'\u2003\u2003',',':'\u2009',';':' ',':':' ','!':'','{':'{','}':'}','%':'%','$':'$','#':'#','&':'&amp;','_':'_','cdotp':'·','log':'log','ln':'ln','sin':'sin','cos':'cos','tan':'tan','gcd':'gcd','lcm':'lcm','max':'max','min':'min','det':'det','exp':'exp','arctan':'arctan','dfrac':None,'tfrac':None}
BB={'R':'ℝ','Z':'ℤ','N':'ℕ','Q':'ℚ','C':'ℂ'}
def grp(s,i):
    # return (content, next index) for a {...} group or a single token at s[i]
    while i<len(s) and s[i]==' ': i+=1
    if i>=len(s): return '',i
    if s[i]=='{':
        d=0
        for j in range(i,len(s)):
            if s[j]=='{': d+=1
            elif s[j]=='}':
                d-=1
                if d==0: return s[i+1:j],j+1
        return s[i+1:],len(s)
    if s[i]=='\\':
        m=re.match(r'\\([A-Za-z]+|.)',s[i:]); return s[i:i+m.end()],i+m.end()
    return s[i],i+1
def math(s):
    out=[];i=0
    while i<len(s):
        c=s[i]
        if c=='\\':
            m=re.match(r'\\([A-Za-z]+|.)',s[i:]); name=m.group(1); i+=m.end()
            if name in ('frac','dfrac','tfrac'):
                a,i=grp(s,i); b,i=grp(s,i); A=math(a);B=math(b)
                wrap=lambda x,raw: x if re.fullmatch(r'[\w.′]+',raw.strip()) else '('+x+')'
                out.append(wrap(A,a)+'/'+wrap(B,b))
            elif name=='sqrt':
                if i<len(s) and s[i]=='[':
                    j=s.index(']',i); idx=s[i+1:j]; i=j+1
                    a,i=grp(s,i); out.append('<sup>'+math(idx)+'</sup>√<o>'+math(a)+'</o>')
                else:
                    a,i=grp(s,i); out.append('√<o>'+math(a)+'</o>')
            elif name in ('overline','bar'):
                a,i=grp(s,i); out.append('<o>'+math(a)+'</o>')
            elif name in ('text','textbf','mathrm','textit','emph','mathit','operatorname','mbox','textrm','mathbf','boldsymbol','textsf','mathsf'):
                a,i=grp(s,i); out.append(math(a) if name not in ('text','mbox','textrm','textit','emph') else html.escape(a))
            elif name=='mathbb':
                a,i=grp(s,i); out.append(BB.get(a.strip(),a))
            elif name=='mathcal':
                a,i=grp(s,i); out.append('<i>'+a+'</i>')
            elif name=='binom':
                a,i=grp(s,i); b,i=grp(s,i); out.append('C('+math(a)+', '+math(b)+')')
            elif name in ('left','right','big','Big','bigg','Bigg','bigl','bigr','Bigl','Bigr','displaystyle','limits','nolimits','hspace','vspace','label','phantom'):
                if name in ('hspace','vspace','label','phantom'): a,i=grp(s,i)
                continue
            elif name=='pmod' or name=='mod':
                a,i=grp(s,i) if name=='pmod' else ('',i); out.append(' (mod '+math(a)+')' if name=='pmod' else ' mod ')
            elif name=='hat' or name=='widehat' or name=='vec' or name=='tilde':
                a,i=grp(s,i); out.append(math(a)+('\u0302' if 'hat' in name else '\u20d7' if name=='vec' else '\u0303'))
            elif name=='underbrace' or name=='overbrace':
                a,i=grp(s,i); out.append(math(a))
            elif name=='begin' or name=='end':
                a,i=grp(s,i); continue
            elif name=='\\':
                out.append('<br>')
            elif name in SYM and SYM[name] is not None:
                out.append(SYM[name])
            else:
                out.append(name)
        elif c in '^_':
            i+=1; a,i=grp(s,i); tag='sup' if c=='^' else 'sub'
            inner=math(a)
            if a.strip() in ('\\circ',): out.append('°')
            elif a.strip()=='\\prime': out.append('′')
            else: out.append('<%s>%s</%s>'%(tag,inner,tag))
        elif c=='{' :
            a,i=grp(s,i); out.append(math(a))
        elif c=='}': i+=1
        elif c=='&': out.append(' '); i+=1
        elif c=='<': out.append(' &lt; '); i+=1
        elif c=='>': out.append(' &gt; '); i+=1
        elif c=='~': out.append('\u00a0'); i+=1
        elif c=='\n': out.append(' '); i+=1
        else: out.append(html.escape(c)); i+=1
    r=''.join(out)
    r=re.sub(r'([A-Za-z])',r'\1',r)
    return r
def italicize(h):
    # italic single-letter variables outside tags
    parts=re.split(r'(<[^>]+>)',h)
    for k,p in enumerate(parts):
        if p.startswith('<'): continue
        parts[k]=re.sub(r'(?<![A-Za-z&#;])([A-Za-z])(?![A-Za-z;])',r'<i>\1</i>',p)
    return ''.join(parts)
def tex2html(t):
    t=t.replace('\r','')
    TB=[]
    def tb(m):
        TB.append(m.group(2)); return '@@T%d@@'%(len(TB)-1)
    t=re.sub(r'\\begin\{(array|tabular)\}\{[^}]*\}(.*?)\\end\{\1\}',tb,t,flags=re.S)
    t=re.sub(r'\\\[\s*(@@T\d+@@)\s*\\\]',r'\1',t); t=re.sub(r'\$\$\s*(@@T\d+@@)\s*\$\$',r'\1',t)
    out=[];pos=0
    pat=re.compile(r'\$\$(.+?)\$\$|\\\[(.+?)\\\]|\$(.+?)\$|\\\((.+?)\\\)|@@T(\d+)@@',re.S)
    for m in pat.finditer(t):
        out.append(text(t[pos:m.start()]))
        if m.group(5) is not None:
            rows=[r for r in re.split(r'\\\\',TB[int(m.group(5))]) if r.replace('\\hline','').strip()]
            rows=[[math(c.replace('\\hline','')).strip() for c in r.replace('\\hline','').split('&')] for r in rows]
            out.append('<table class="mt">'+''.join('<tr>'+''.join('<td>'+c+'</td>' for c in r)+'</tr>' for r in rows)+'</table>')
        else:
            g=m.group(1) or m.group(2) or m.group(3) or m.group(4)
            disp=m.group(1) is not None or m.group(2) is not None
            h=italicize(math(g))
            if disp: out.append('<md>%s</md>'%h)
            elif re.search(r'[<A-Za-z]',h): out.append('<m>%s</m>'%h)
            else: out.append(h)
        pos=m.end()
    out.append(text(t[pos:]))
    return re.sub(r'\s+',' ',''.join(out)).strip()
def text(s):
    s=html.escape(s,quote=False)
    s=re.sub(r'\\textbf\{([^}]*)\}',r'<b>\1</b>',s); s=re.sub(r'\\(emph|textit)\{([^}]*)\}',r'<i>\2</i>',s)
    s=s.replace('\\%','%').replace('\\$','$').replace('``','"').replace("''",'"').replace('\\&','&amp;').replace('~',' ')
    s=re.sub(r'\n\s*\n','<br>',s)
    return s
def ans2html(a):
    a=str(a)
    if a in ('None',''): return '(no answer)'
    return italicize(math(a)) if ('\\' in a or '^' in a or '{' in a) else html.escape(a)
if __name__=='__main__':
    for x in [r'Find $m+n\sqrt{p}$ where $\angle B=60^{\circ}$ and $f(x)=\frac{(x-18)(x-72)}{x}$.', r'$(3+\sqrt{6})^{-1/3}$', r'50(1 - \frac{1}{2^{101} - 1})']:
        print(tex2html(x))
    print(ans2html(r'\frac{\sqrt{1740}}{3}'))
