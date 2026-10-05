// ---- Notation decoder (t-notation): equation picker, tap-a-symbol, conventions filter, attention animation ----
(function(){
  const tab=document.getElementById('t-notation');if(!tab)return;
  const arts=[...tab.querySelectorAll('article.nd-eq')];
  const ids=arts.map(a=>a.dataset.eq);
  const pick=document.getElementById('nd-pick');
  const pos=document.getElementById('nd-pos');
  let cur=ids[0];

  // -- map each symbol's chip to the matching nodes of the rendered MathML (by text content) --
  const norm=s=>String(s).replace(/[⁡-⁤\s​]/g,'').replace(/−/g,'-');
  window.ND_UNMATCHED=[];
  function mapEq(art){
    const box=art.querySelector('.nd-m');const math=box&&box.querySelector('math');if(!math)return;
    const sem=math.querySelector('semantics');const root=sem?sem.firstElementChild:math;
    const all=[...root.querySelectorAll('*')];
    const jobs=[];
    art.querySelectorAll('.nd-chips button').forEach(b=>{let ms=[];try{ms=JSON.parse(b.dataset.match)}catch(e){}ms.forEach(m=>jobs.push([norm(m),b.dataset.sym]))});
    jobs.sort((a,b)=>b[0].length-a[0].length);
    const taken=[];const found={};
    for(const [m,sym] of jobs){
      const hits=all.filter(el=>norm(el.textContent)===m);
      const minimal=hits.filter(el=>!hits.some(o=>o!==el&&el.contains(o)));
      minimal.forEach(el=>{if(taken.some(t=>t.contains(el)||el.contains(t)))return;el.setAttribute('data-sym',sym);taken.push(el);found[sym]=1});
    }
    art.querySelectorAll('.nd-chips button').forEach(b=>{if(!found[b.dataset.sym])window.ND_UNMATCHED.push(art.dataset.eq+':'+b.dataset.sym)});
  }
  arts.forEach(mapEq);

  function selectSym(art,sym){
    art.querySelectorAll('[data-sym]').forEach(el=>{const on=el.getAttribute('data-sym')===sym;el.classList.toggle('nd-on',on)});
    art.querySelectorAll('.nd-sdi').forEach(d=>{d.hidden=d.dataset.sym!==sym});
    const z=art.querySelector('.nd-sd0');if(z)z.hidden=!!sym;
  }
  arts.forEach(art=>{
    art.addEventListener('click',e=>{
      const t=e.target.closest&&e.target.closest('[data-sym]');if(!t||!art.contains(t))return;
      if(t.closest('.nd-sd'))return;
      selectSym(art,t.getAttribute('data-sym'));
    });
  });

  function show(id,scroll){
    if(ids.indexOf(id)<0)id=ids[0];cur=id;
    arts.forEach(a=>{a.hidden=a.dataset.eq!==id});
    pick.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.eq===id));
    const i=ids.indexOf(id);pos.textContent=(i+1)+' of '+ids.length;
    try{localStorage.setItem('nd-eq',id)}catch(e){}
    if(id==='attn'&&AN)AN.redraw();
    if(scroll){const a=document.getElementById('nd-eq-'+id);if(a&&a.scrollIntoView)a.scrollIntoView({block:'start',behavior:RD.RM?'auto':'smooth'})}
  }
  pick.addEventListener('click',e=>{const b=e.target.closest('button[data-eq]');if(b)show(b.dataset.eq,false)});
  document.getElementById('nd-prev').addEventListener('click',()=>show(ids[(ids.indexOf(cur)+ids.length-1)%ids.length],false));
  document.getElementById('nd-next').addEventListener('click',()=>show(ids[(ids.indexOf(cur)+1)%ids.length],false));

  // -- conventions: filter and "seen in" jumps --
  const ref=document.getElementById('nd-ref');
  ref.addEventListener('click',e=>{const b=e.target.closest('button[data-go]');if(b)show(b.dataset.go,true)});
  const flt=document.getElementById('nd-filter');
  flt.addEventListener('input',()=>{const q=flt.value.trim().toLowerCase();
    [...ref.children].forEach(c=>{c.hidden=!!q&&(c.dataset.k+' '+c.textContent).toLowerCase().indexOf(q)<0})});

  // -- attention, decoded step by step (real tiny matrices; numbers checked by src/notation/recompute.py) --
  const Q=[[1,0,1,0],[0,2,0,1],[1,1,1,1]],K=[[1,0,1,0],[0,1,0,1],[1,1,0,0]],V=[[1,0],[0,1],[1,1]];
  const n=3,dk=4,dv=2;
  const KT=K[0].map((_,j)=>K.map(r=>r[j]));
  const S=Q.map(q=>K.map(k=>q.reduce((s,v,i)=>s+v*k[i],0)));
  const soft=r=>{const m=Math.max(...r),e=r.map(v=>Math.exp(v-m)),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s)};
  const mats={};
  ['s','u'].forEach(m=>{const Sc=S.map(r=>r.map(v=>m==='s'?v/Math.sqrt(dk):v));const W=Sc.map(soft);
    const O=W.map(w=>V[0].map((_,j)=>w.reduce((s,x,i)=>s+x*V[i][j],0)));mats[m]={Sc,W,O}});
  window.ND_ATT=mats;
  const fmt=v=>{const r=Math.round(v*1000)/1000;return Number.isInteger(r)?String(r):r.toFixed(3).replace(/0+$/,'')};
  function mx(lb,M,rows,cols,cls){
    let h='<div class="nd-mx"><div class="lb">'+lb+'</div><div class="nd-grid" style="grid-template-columns:repeat('+cols+',auto)">';
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const k=cls?cls(r,c):'';const v=(M&&k!=='mt')?fmt(M[r][c]):'·';h+='<span class="'+k+'">'+v+'</span>'}
    return h+'</div><div class="shp">'+rows+' × '+cols+'</div></div>';
  }
  const op=s=>'<span class="nd-op">'+s+'</span>';
  let mode='s';
  const STEPS=13;
  function draw(i){
    const M=mats[mode],sc=mode==='s';const st=document.getElementById('nd-an-stage');let h='',cap='',shape='',mults=0;
    const sname=sc?'QKᵀ/√dₖ':'QKᵀ';
    if(i===0){h=mx('Q',Q,n,dk)+mx('K',K,n,dk)+mx('V',V,n,dv);cap='The inputs: one row per token. Q and K are 3 × 4 (dₖ = 4), V is 3 × 2.';shape='3 × 4, 3 × 4, 3 × 2'}
    else if(i===1){h=mx('K',K,n,dk)+op('→')+mx('Kᵀ',KT,dk,n,()=> 'nw');cap='Transpose K: its rows become columns, 3 × 4 becomes 4 × 3, so every query can meet every key.';shape='4 × 3'}
    else if(i<=4){const r=i-2;mults=12*(r+1);
      h=mx('Q',Q,n,dk,(a)=>a===r?'hi':'')+op('×')+mx('Kᵀ',KT,dk,n,()=>'hi')+op('=')+mx('QKᵀ',S,n,n,(a)=>a<r?'':a===r?'nw':'mt');
      const q=Q[r];cap='Row '+(r+1)+': query '+(r+1)+' dotted with each key. First cell: '+q.map((v,k)=>v+'·'+K[0][k]).join(' + ')+' = '+S[r][0]+'.'+(r===2?' All three scores are equal: this query matches every key the same.':'');shape='3 × 3'}
    else if(i===5){mults=36;
      if(sc){h=mx('QKᵀ',S,n,n)+op('÷ √4')+mx(sname,M.Sc,n,n,()=>'nw');cap='Divide every score by √dₖ = 2. Shape unchanged. This keeps scores from growing with dₖ (footnote 4).'}
      else{h=mx('QKᵀ',S,n,n,()=>'nw');cap='Before: plain dot-product attention skips the division, so the raw scores go straight into the softmax.'}
      shape='3 × 3'}
    else if(i<=8){const r=i-6;mults=36;
      const row=M.Sc[r],e=row.map(Math.exp),s=e.reduce((a,b)=>a+b,0);
      h=mx(sname,M.Sc,n,n,(a)=>a===r?'hi':'')+op('→ softmax')+mx('weights',M.W,n,n,(a)=>a<r?'':a===r?'nw':'mt');
      cap='Row '+(r+1)+': exponentiate ('+e.map(fmt).join(', ')+'), divide by their sum '+fmt(s)+' → ('+M.W[r].map(fmt).join(', ')+'), which sums to 1.';shape='3 × 3'}
    else if(i<=11){const r=i-9;mults=36+6*(r+1);
      h=mx('weights',M.W,n,n,(a)=>a===r?'hi':'')+op('×')+mx('V',V,n,dv,()=>'hi')+op('=')+mx('output',M.O,n,dv,(a)=>a<r?'':a===r?'nw':'mt');
      cap='Output row '+(r+1)+' = '+M.W[r].map((w,k)=>fmt(w)+'·v'+(k+1)).join(' + ')+' = ('+M.O[r].map(fmt).join(', ')+'): a weighted average of V’s rows.';shape='3 × 2'}
    else{mults=54;h=mx('Attention(Q, K, V)',M.O,n,dv,()=>'nw');
      cap='Done. Shapes: (3×4)(4×3) → 3×3 scores'+(sc?' → ÷2':'')+' → softmax 3×3 → (3×3)(3×2) → 3×2. Cost: n·n·dₖ + n·n·dᵥ = 36 + 18 multiply-adds.';shape='3 × 2'}
    st.innerHTML=h;document.getElementById('nd-an-cap').textContent=cap;
    document.getElementById('nd-an-cnt').innerHTML='<span>Step <b>'+(i+1)+' of '+STEPS+'</b> ('+(sc?'scaled, Eq. 1':'unscaled, before')+')</span><span>Result shape <b>'+shape+'</b></span><span>Multiply-adds so far <b>'+mults+'</b></span>';
  }
  function cmp(){
    const a=mats.s.W,b=mats.u.W;
    document.getElementById('nd-an-cmp').innerHTML='<b>Same input, both ways.</b> Largest weight per row, scaled against unscaled: '+
      [0,1,2].map(r=>'row '+(r+1)+' '+fmt(Math.max(...a[r]))+' vs '+fmt(Math.max(...b[r]))).join('; ')+
      '. Without the division the softmax is sharper; at the paper’s dₖ = 64 the unscaled scores are √64 = 8 times the scaled ones, pushing each row towards one-hot.';
  }
  let AN=null;
  if(document.getElementById('nd-an')){
    AN=RD.anim({card:'nd-an',ctl:'nd-an-ctl',n:STEPS,ms:1700,label:'Attention step',draw});
    RD.seg(document.getElementById('nd-an-mode'),m=>{mode=m;AN.redraw()});
    cmp();
  }
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-notation']=window.TAB_RENDER['t-notation']||[]).push(()=>{if(AN)AN.redraw()});
  let start=ids[0];try{const v=localStorage.getItem('nd-eq');if(v&&ids.indexOf(v)>=0)start=v}catch(e){}
  show(start,false);
})();
