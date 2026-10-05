// ---- Practice drills (t-drill): problem cards, answer checking, progress, filters ----
// Problem text, steps and answers are static HTML in 33_tab_drill.html (formulas converted to MathML at build time);
// this script adds the controls. Progress lives in localStorage under 'pd-progress-v1' (every access in try/catch).
(function(){
  const root=document.getElementById('t-drill');if(!root)return;
  const KEY='pd-progress-v1';
  let S={};try{S=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){S={}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
  const st=id=>(S[id]=S[id]||{});
  const TR={la:'Linear algebra',ps:'Probability and statistics',co:'Calculus and optimisation',it:'Information theory',iv:'Classic derivations'};
  const LV={1:'warm-up',2:'core',3:'stretch'};

  // ---- a small, safe arithmetic parser: numbers, + - * / ^, parentheses, sqrt ln log log2 log10 exp, pi, e ----
  function parseExpr(src){
    const s=String(src).replace(/[−–]/g,'-').replace(/[×·]/g,'*').replace(/\s+/g,'').toLowerCase();
    let i=0;
    const peek=()=>s[i];
    function num(){const m=/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(s.slice(i));if(!m)return null;i+=m[0].length;return parseFloat(m[0])}
    function primary(){
      if(peek()==='('){i++;const v=expr();if(peek()!==')')throw 0;i++;return v}
      const n=num();if(n!==null)return n;
      const m=/^[a-z]+\d*/.exec(s.slice(i));if(!m)throw 0;i+=m[0].length;const w=m[0];
      const F={sqrt:Math.sqrt,ln:Math.log,log:Math.log,log2:Math.log2,log10:Math.log10,exp:Math.exp};
      if(w==='pi')return Math.PI;if(w==='e')return Math.E;
      if(F[w]){if(peek()!=='(')throw 0;i++;const v=expr();if(peek()!==')')throw 0;i++;return F[w](v)}
      throw 0}
    function unary(){if(peek()==='-'){i++;return -unary()}if(peek()==='+'){i++;return unary()}return power()}
    function power(){const b=primary();if(peek()==='^'){i++;return Math.pow(b,unary())}return b}
    function term(){let v=unary();while(peek()==='*'||peek()==='/'){const o=s[i++];const r=unary();v=o==='*'?v*r:v/r}return v}
    function expr(){let v=term();while(peek()==='+'||peek()==='-'){const o=s[i++];const r=term();v=o==='+'?v+r:v-r}return v}
    const v=expr();if(i!==s.length||!isFinite(v))throw 0;return v}
  function parseList(src,scalar){
    let t=String(src).trim();if(!t)return null;
    if(scalar)t=t.replace(/(\d),(?=\d{3}(\D|$))/g,'$1'); // 65,536 -> 65536 when one number is expected
    const parts=t.split(/[;,]/).map(x=>x.trim()).filter(Boolean);
    try{return parts.map(parseExpr)}catch(e){return null}}
  const close=(g,a)=>Math.abs(g-a)<=Math.max(0.005*Math.abs(a),0.0015);
  const near=(g,a)=>Math.abs(g-a)<=Math.max(0.05*Math.abs(a),0.01);

  // ---- links to the Reading tab: find the section by id, else by its heading text ----
  const READ={vec:{ids:['rd-s1','rd-vec','rd-vectors','rd-linalg','rd-la'],re:/vector|matri|linear algebra/i},
    prob:{ids:['rd-s2','rd-prob','rd-probability'],re:/probabilit|softmax|likelihood/i},
    info:{ids:['rd-s3','rd-info','rd-information'],re:/information|entropy|surprise/i},
    deriv:{ids:['rd-s4','rd-deriv','rd-derivatives','rd-calc'],re:/derivative|chain rule|gradient|backprop/i},
    opt:{ids:['rd-s5','rd-opt','rd-optimisation','rd-optim'],re:/optimi[sz]|curvature|learning rate/i},
    stats:{ids:['rd-s6','rd-stats','rd-statistics'],re:/statistic|real\?|noise|error bar/i},
    paper:{ids:['rd-hats','rd-paper','rd-read-paper','rd-shared'],re:/hats|paper|shared/i}};
  function findRead(k){const d=READ[k];if(!d)return null;const rd=document.getElementById('t-read');if(!rd)return null;
    for(const id of d.ids){const e=document.getElementById(id);if(e&&rd.contains(e))return e}
    const hs=[...rd.querySelectorAll('h2')];const h=hs.find(x=>d.re.test(x.textContent));return h?(h.closest('section')||h):null}
  function goTab(t){const b=document.querySelector('#tabs button[data-t="'+t+'"]');if(b)b.click()}
  root.addEventListener('click',e=>{
    const a=e.target.closest('a[data-pd-read]');if(!a)return;e.preventDefault();
    goTab('t-read');const el=findRead(a.dataset.pdRead);
    if(el)setTimeout(()=>el.scrollIntoView({block:'start'}),30);else document.getElementById('tabs').scrollIntoView({block:'start'})});

  // ---- build each card ----
  const cards=[...root.querySelectorAll('article.pd-q')];
  const list=document.getElementById('pd-list');
  function el(tag,cls,html){const x=document.createElement(tag);if(cls)x.className=cls;if(html!=null)x.innerHTML=html;return x}
  cards.forEach(c=>{
    const id=c.id,s=st(id),h=c.querySelector('h3'),body=c.querySelector('.pd-body');
    const tt=h.innerHTML;h.innerHTML='';h.setAttribute('role','button');h.tabIndex=0;h.setAttribute('aria-expanded','false');
    h.append(el('span','pd-tt',tt),el('span','pd-badge l'+c.dataset.lv,LV[c.dataset.lv]));
    if(c.dataset.cl)h.append(el('span','pd-badge cl','classic'));
    const ok=el('span','pd-badge ok','solved');h.append(ok);
    const toggle=()=>{const o=!c.classList.contains('open');c.classList.toggle('open',o);h.setAttribute('aria-expanded',o?'true':'false')};
    h.addEventListener('click',toggle);h.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
    const qs=c.querySelector('.pd-qs'),hint=c.querySelector('.pd-hint'),steps=[...c.querySelectorAll('.pd-steps li')];
    const after=[c.querySelector('.pd-ans'),c.querySelector('.pd-use'),c.querySelector('.pd-self')].filter(Boolean);
    // answer box
    let fb=null;
    if(c.dataset.ans){
      const want=parseList(c.dataset.ans,false);const scalar=want.length===1;
      const row=el('div','pd-ctl');const inp=el('input');inp.type='text';inp.id=id+'-in';inp.setAttribute('aria-label','Your answer');
      inp.placeholder=scalar?'your answer':want.length+' numbers, comma-separated';inp.autocomplete='off';
      const b=el('button',null,'Check');fb=el('span','pd-fb');fb.setAttribute('aria-live','polite');
      row.append(inp,b,fb);qs.after(row);
      const check=()=>{const got=parseList(inp.value,scalar);
        if(!got){fb.className='pd-fb no';fb.textContent=inp.value.trim()?'Could not read that: use numbers and + - * / ^ sqrt() ln() exp().':'Type an answer first.';return}
        if(got.length!==want.length){fb.className='pd-fb no';fb.textContent='Expected '+want.length+' number'+(want.length>1?'s':'')+', got '+got.length+'.';return}
        let g=got.slice(),w=want.slice();if(c.dataset.set){g.sort((x,y)=>x-y);w.sort((x,y)=>x-y)}
        const good=g.every((v,k)=>close(v,w[k]));
        if(good){fb.className='pd-fb ok';fb.textContent='Correct.'+(s.k<steps.length?' Step through the solution to compare your working.':'');s.s=1;s.a=inp.value;save();paint()}
        else if(g.every((v,k)=>near(v,w[k]))){fb.className='pd-fb no';fb.textContent='Close, but outside the tolerance (0.5%): check your rounding or a step.'}
        else{fb.className='pd-fb no';fb.textContent='Not yet. Try the hint, or reveal the next step.'}};
      b.addEventListener('click',check);inp.addEventListener('keydown',e=>{if(e.key==='Enter')check()});
      if(s.a){inp.value=s.a}
    }
    // hint
    const row2=el('div','pd-ctl');
    let hb=null;if(hint){hb=el('button',null,'Show hint');hb.addEventListener('click',()=>{s.h=s.h?0:1;save();paint()});row2.append(hb)}
    const nb=el('button',null,''),rb=el('button',null,'Hide the solution'),mb=el('button',null,'');
    nb.addEventListener('click',()=>{s.k=Math.min(steps.length,(s.k||0)+1);save();paint(true)});
    rb.addEventListener('click',()=>{s.k=0;save();paint()});
    mb.addEventListener('click',()=>{s.s=s.s?0:1;save();paint()});
    row2.append(nb,rb,mb);
    (c.dataset.ans?qs.nextElementSibling:qs).after(row2);
    if(hint)row2.after(hint);
    // self-check list
    const self=c.querySelector('.pd-self');let boxes=[];
    if(self){[...self.querySelectorAll('li')].forEach((li,k)=>{const cb=el('input');cb.type='checkbox';cb.id=id+'-c'+k;cb.setAttribute('aria-label','Self-check '+(k+1));
      const sp=document.createElement('span');while(li.firstChild)sp.append(li.firstChild);li.append(cb,sp);cb.addEventListener('change',()=>{s.c=boxes.map(b=>b.checked?1:0);if(boxes.every(b=>b.checked))s.s=1;save();paint()});boxes.push(cb)});
      self.before(el('p','small mute','<b>Self-check:</b> tick each item once you can do it without looking. Ticking all of them marks the problem solved.'))}
    function paint(fresh){
      const k=s.k||0;
      steps.forEach((li,j)=>{li.classList.toggle('pd-hide',j>=k);li.classList.toggle('pd-new',!!fresh&&j===k-1)});
      const done=k>=steps.length;after.forEach(x=>x.classList.toggle('pd-hide',!done));
      const sh=c.querySelector('.pd-steps');if(sh)sh.classList.toggle('pd-hide',k===0);
      if(hint){hint.classList.toggle('pd-hide',!s.h);hb.textContent=s.h?'Hide hint':'Show hint'}
      nb.textContent=done?'All '+steps.length+' steps shown':(k===0?'Show step 1 of '+steps.length:'Next step ('+(k+1)+' of '+steps.length+')');nb.disabled=done;
      rb.classList.toggle('pd-hide',k===0);
      mb.textContent=s.s?'Mark as not solved':'Mark as solved';
      boxes.forEach((b,j)=>{b.checked=!!(s.c&&s.c[j])});
      c.classList.toggle('solved',!!s.s);ok.classList.toggle('pd-hide',!s.s);
      if(fb&&!s.s&&fb.classList.contains('ok')){fb.textContent='';fb.className='pd-fb'}
      progress();filter()}
    c._paint=paint;
  });
  // track bands
  let prev='';cards.forEach(c=>{if(c.dataset.tr!==prev){prev=c.dataset.tr;const b=el('div','pd-band',TR[prev]);b.dataset.band=prev;c.before(b)}});

  // ---- progress ----
  const prog=document.getElementById('pd-prog');
  function progress(){
    const rows=Object.keys(TR).map(t=>{const cs=cards.filter(c=>c.dataset.tr===t);const n=cs.filter(c=>S[c.id]&&S[c.id].s).length;return [TR[t],n,cs.length]});
    const all=cards.filter(c=>S[c.id]&&S[c.id].s).length;rows.unshift(['All problems',all,cards.length]);
    prog.innerHTML=rows.map(r=>'<div class="pd-pc"><b>'+r[0]+'</b>'+r[1]+' of '+r[2]+' solved<div class="pd-pbar"><i style="width:'+(100*r[1]/r[2]).toFixed(1)+'%"></i></div></div>').join('')}

  // ---- filters ----
  const F={tr:'all',lv:'all',cl:false,hs:false};
  function filter(){
    let n=0;
    cards.forEach(c=>{const v=(F.tr==='all'||c.dataset.tr===F.tr)&&(F.lv==='all'||c.dataset.lv===F.lv)&&(!F.cl||c.dataset.cl)&&(!F.hs||c.classList.contains('open')||!(S[c.id]&&S[c.id].s));c.hidden=!v;if(v)n++});
    root.querySelectorAll('.pd-band').forEach(b=>{b.hidden=!cards.some(c=>c.dataset.tr===b.dataset.band&&!c.hidden)});
    const cnt=document.getElementById('pd-count');if(cnt)cnt.textContent=n+' of '+cards.length+' problems shown.'+(n?'':' Change a filter to see more.')}
  function seg(id,k){const g=document.getElementById(id);g.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;g.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));F[k]=b.dataset.m;try{localStorage.setItem('pd-filter',JSON.stringify(F))}catch(e){}filter()})}
  seg('pd-ftr','tr');seg('pd-flv','lv');
  const fcl=document.getElementById('pd-fcl'),fhs=document.getElementById('pd-fhs');
  fcl.addEventListener('change',()=>{F.cl=fcl.checked;filter()});fhs.addEventListener('change',()=>{F.hs=fhs.checked;filter()});
  try{const f=JSON.parse(localStorage.getItem('pd-filter')||'null');if(f){Object.assign(F,f);
    [['pd-ftr','tr'],['pd-flv','lv']].forEach(([g,k])=>document.getElementById(g).querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===F[k])));fcl.checked=!!F.cl;fhs.checked=!!F.hs}}catch(e){}
  document.getElementById('pd-pick').addEventListener('click',()=>{
    const pool=cards.filter(c=>!c.hidden&&!(S[c.id]&&S[c.id].s));const from=pool.length?pool:cards.filter(c=>!c.hidden);if(!from.length)return;
    const c=from[Math.floor(Math.random()*from.length)];c.classList.add('open');c.querySelector('h3').setAttribute('aria-expanded','true');c.scrollIntoView({block:'start'});
    const inp=c.querySelector('input[type=text]');if(inp)try{inp.focus({preventScroll:true})}catch(e){}});
  const rs=document.getElementById('pd-reset');let armed=0;
  rs.addEventListener('click',()=>{if(!armed){armed=setTimeout(()=>{armed=0;rs.textContent='Reset progress'},4000);rs.textContent='Click again to erase all progress';return}
    clearTimeout(armed);armed=0;rs.textContent='Reset progress';
    // empty each card's state object in place (the cards' handlers hold references to them)
    Object.values(S).forEach(o=>Object.keys(o).forEach(k=>delete o[k]));save();
    cards.forEach(c=>{const i=c.querySelector('input[type=text]');if(i)i.value='';const fb=c.querySelector('.pd-fb');if(fb){fb.textContent='';fb.className='pd-fb'}});
    cards.forEach(c=>c._paint())});
  cards.forEach(c=>c._paint());
  progress();filter();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-drill']=window.TAB_RENDER['t-drill']||[]).push(()=>{progress();filter()});
})();
// ---- Quick recall cards: "I knew it" per card, kept in localStorage 'pd-fc-v1' ----
(function(){
  const box=document.getElementById('pd-fcs');if(!box)return;
  let K=[];try{K=JSON.parse(localStorage.getItem('pd-fc-v1')||'[]')||[]}catch(e){K=[]}
  const cards=[...box.querySelectorAll('details.pd-fc')],cnt=document.getElementById('pd-fccount');
  const upd=()=>{cards.forEach((d,i)=>d.classList.toggle('known',!!K[i]));if(cnt)cnt.textContent=cards.filter((d,i)=>K[i]).length+' of '+cards.length+' marked known.'};
  cards.forEach((d,i)=>{const l=document.createElement('label');const cb=document.createElement('input');cb.type='checkbox';cb.checked=!!K[i];
    l.append(cb,' I knew it');d.append(l);cb.addEventListener('change',()=>{K[i]=cb.checked?1:0;try{localStorage.setItem('pd-fc-v1',JSON.stringify(K))}catch(e){}upd()})});
  upd();
})();
