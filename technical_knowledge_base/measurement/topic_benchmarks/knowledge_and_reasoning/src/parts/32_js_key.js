// ---- Fix the key: before/after re-grade (MMLU-Redux Table 2, HLE-Verified Table 2) and MMLU's defect map (data: window.KR) ----
(function(){
  const K=window.KR,R=K.redux,E=KU.esc,A=KU.a;
  const TYPES=[['w','wrong key','var(--bad)'],['n','no correct option','var(--c5)'],['m','several correct','var(--c4)'],['q','unclear question','var(--c6)'],['p','unclear options','var(--c1)'],['e','needs an expert','var(--mute)']];
  const TC={};TYPES.forEach(([c,n,col])=>TC[c]=col);
  const SUBJ=R.t2subj,SUBJK=R.seqSubj;// display names and dataset keys, same order
  const MODELS=Object.keys(R.t2),HM=Object.keys(K.hlev.t2);
  let mode='mmlu',si=0,an=null;
  const sq=document.getElementById('ky-sq'),bars=document.getElementById('ky-bars'),cap=document.getElementById('ky-cap'),cnt=document.getElementById('ky-cnt'),
    leg=document.getElementById('ky-leg'),sqlab=document.getElementById('ky-sqlab'),barlab=document.getElementById('ky-barlab'),src=document.getElementById('ky-src');
  const subjBox=document.getElementById('ky-subj');
  subjBox.innerHTML=SUBJ.map((s,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+s+'</button>').join('');
  // ---- squares ----
  function squares(codes,state,cols){// state: 0 neutral, 1 coloured, 2 flagged faded; codes: array of single letters
    const n=codes.length,w=Math.max(220,Math.min(420,KU.width(sq.parentNode))),c=cols,cs=Math.floor(w/c),gap=cs>6?1:0.5,rows=Math.ceil(n/c);
    let b='';for(let i=0;i<n;i++){const x=(i%c)*cs,y=Math.floor(i/c)*cs,code=codes[i];
      let f='var(--dim)',op=1;
      if(state>=1){f=code==='o'||code==='v'?'var(--good)':(TC[code]||(code==='r'?'var(--c1)':code==='u'?'var(--c5)':'var(--dim)'))}
      if(state===2&&code!=='o'&&code!=='v'&&code!=='r')op=.18;
      if(state===3&&code==='r')f='var(--c4)';
      b+='<rect x="'+x+'" y="'+y+'" width="'+(cs-gap)+'" height="'+(cs-gap)+'" rx="'+(cs>8?1.5:0)+'" fill="'+f+'" opacity="'+op+'"/>'}
    sq.innerHTML=KU.svg(c*cs,rows*cs,b,'One square per question');
  }
  // ---- bars: absolutely positioned rows that slide when the order changes ----
  let barEls={};
  const SHORT={'Claude 3.5 Sonnet (20240620)':'Claude 3.5 Sonnet','Claude 3 Opus (20240229)':'Claude 3 Opus','Llama 3.1 Instruct Turbo (405B)':'Llama 3.1 405B','GPT-4o (2024-05-13)':'GPT-4o',
    'Gemini 1.5 Pro (001)':'Gemini 1.5 (001)','GPT-4 (0613)':'GPT-4 (0613)','Qwen2 Instruct (72B)':'Qwen2 72B','GPT-4 Turbo (2024-04-09)':'GPT-4 Turbo',
    'Gemini 1.5 Pro (0409 preview)':'Gemini 1.5 (0409)','Llama 3.1 Instruct Turbo (70B)':'Llama 3.1 70B','Grok 4.1 fast reasoning':'Grok 4.1 fast','Qwen3-Max-Thinking':'Qwen3-Max','Claude Opus 4.6':'Claude Opus 4.6','Claude Opus 4.5':'Claude Opus 4.5'};
  const sh=n=>SHORT[n]||n;
  function setupBars(names){bars.innerHTML='';barEls={};bars.style.height=(names.length*26)+'px';
    names.forEach(n=>{const d=document.createElement('div');d.className='kb';d.innerHTML='<span class="nm" title="'+E(n)+'">'+E(sh(n))+'</span><span class="tr"><span class="fl"></span></span><span class="vl"></span>';bars.appendChild(d);barEls[n]=d})}
  function setBars(vals,labels,colour){// vals: {name: value 0..100}; labels: {name: html}
    const order=Object.keys(vals).sort((a,b)=>vals[b]-vals[a]);
    order.forEach((n,i)=>{const d=barEls[n];d.style.top=(i*26)+'px';d.querySelector('.fl').style.width=Math.max(0,Math.min(100,vals[n]))+'%';
      d.querySelector('.fl').style.background=colour||'var(--c1)';d.querySelector('.vl').innerHTML=labels[n]})}
  // ---- MMLU mode ----
  function mmluDraw(i){
    const s=SUBJ[si],codes=R.seq[SUBJK[si]].split(''),T=R.t2,k=SUBJ.indexOf(s);
    const flagged=codes.filter(c=>c!=='o').length,wk=codes.filter(c=>c==='w').length;
    squares(codes,i===0?0:(i===1?1:2),10);
    sqlab.textContent='The 100 sampled '+s+' questions, in dataset order';
    const before={},after={},lb={},la={};
    MODELS.forEach(m=>{const [a,ra,c,rc]=T[m][k];before[m]=a*100;after[m]=c*100;
      lb[m]=a.toFixed(2)+' <span class="rk">#'+ra+'</span>';
      const mv=ra-rc;la[m]=c.toFixed(2)+' <span class="rk">#'+rc+'</span>'+(mv?' <span class="'+(mv>0?'up':'dn')+'">'+(mv>0?'▲':'▼')+Math.abs(mv)+'</span>':'')});
    const re=i>=3;setBars(re?after:before,re?la:lb,re?'var(--c4)':'var(--c1)');
    barlab.innerHTML=re?'Exact match on the '+(100-flagged)+' correct items; HELM rank after (▲ moved up)':'Exact match on all 100 sampled items (HELM); # = rank among all HELM models';
    leg.innerHTML=i>=1?('<span><i style="background:var(--good)"></i>no defect</span>'+TYPES.map(([c,n,col])=>'<span><i style="background:'+col+'"></i>'+n+'</span>').join('')):'';
    // biggest mover in this subject
    let best=null;MODELS.forEach(m=>{const [a,ra,c,rc]=T[m][k];const d=Math.abs(ra-rc);if(!best||d>best.d)best={m,ra,rc,a,c,d}});
    const lead0=Object.keys(before).sort((a,b)=>before[b]-before[a])[0],lead1=Object.keys(after).sort((a,b)=>after[b]-after[a])[0];
    const C=[
      ['1. The original key','Ten models HELM scored on MMLU, graded against MMLU\'s key on the 100 '+s+' questions MMLU-Redux sampled. Ranks are among every model on HELM, so the top here can be #1 or #3.'],
      ['2. The audit','Annotators check each question against a six-way taxonomy. '+flagged+' of 100 are flagged, '+wk+' of them with a wrong key. '+(si===0?'Note the solid block at the end: 27 consecutive items, rows 73 to 99, all with a wrong key.':si===2?'Note the block of 21 consecutive wrong keys, rows 77 to 97.':'')],
      ['3. Drop the flawed items','MMLU-Redux\'s re-grade keeps only the '+(100-flagged)+' items with no defect. Nothing about the models has changed; only the questions they are scored on.'],
      ['4. Re-grade','Same model outputs, scored on the correct items only. '+E(sh(best.m))+' moves from #'+best.ra+' to #'+best.rc+' ('+best.a.toFixed(2)+' to '+best.c.toFixed(2)+').'],
      ['5. What changed','Leader before: '+E(sh(lead0))+'. Leader after: '+E(sh(lead1))+' (ties share a rank). Where the key is bad, the ranking measures agreement with the key. MMLU-Redux paper, Table 2.']];
    cap.innerHTML='<div class="t">'+C[i][0]+'</div><p>'+C[i][1]+'</p>';
    const moved=MODELS.filter(m=>T[m][k][1]!==T[m][k][3]).length;
    cnt.innerHTML=KU.stat('Questions scored',i>=2?(100-flagged):100,s)+KU.stat('Flagged',i>=1?flagged:'?',i>=1?wk+' wrong keys':'not yet audited')+
      KU.stat('Models whose rank changed',i>=3?moved+' of 10':'?')+KU.stat('Top score',(i>=3?Math.max(...Object.values(after)):Math.max(...Object.values(before))).toFixed(0)+'%');
    src.innerHTML='Per-item labels: '+A('MMLU-Redux 2.0','https://huggingface.co/datasets/edinburgh-dawg/mmlu-redux-2.0')+' ('+s.toLowerCase()+' configuration). Scores and ranks: '+A('Gema et al., Table 2','https://arxiv.org/abs/2406.04127')+'.';
  }
  // ---- HLE mode ----
  function hleDraw(i){
    const sp=K.hlev.split,codes=[].concat(Array(sp.verified).fill('v'),Array(sp.revised).fill('r'),Array(sp.uncertain).fill('u'));
    squares(codes,i===0?0:(i===2||i===3?3:1),50);
    sqlab.textContent='All 2,500 HLE questions, grouped by HLE-Verified\'s verdict (one square each)';
    leg.innerHTML=i>=1?'<span><i style="background:var(--good)"></i>verified as is (668)</span><span><i style="background:'+(i===2||i===3?'var(--c4)':'var(--c1)')+'"></i>revised (1,143)</span><span><i style="background:var(--c5)"></i>uncertain (689)</span>':'';
    const T=K.hlev.t2,v={},l={};let col='var(--c1)';
    HM.forEach(m=>{const r=T[m];let x;
      if(i<=1){x=r[0];l[m]=x.toFixed(1)+'%'}
      else if(i===2){x=r[4];l[m]=x.toFixed(1)+'%';col='var(--bad)'}
      else if(i===3){x=r[6];l[m]=x.toFixed(1)+'% <span class="up">+'+(r[6]-r[4]).toFixed(1)+'</span>';col='var(--c4)'}
      else {x=r[2];l[m]=x.toFixed(1)+'% <span class="up">+'+(r[2]-r[0]).toFixed(1)+'</span>';col='var(--c4)'}
      v[m]=x});
    setBars(v,l,col);
    barlab.innerHTML=['Accuracy on raw text-only HLE (avg of 5 runs)','Accuracy on raw text-only HLE (avg of 5 runs)','Raw HLE, only the items whose problem or answer was later revised','The same items after revision','Full text-only set: raw against HLE-Verified'][i];
    const g=K.rc.hlev_sub_gain_range,fg=K.rc.hlev_full_gain_range;
    const C=[
      ['1. The original key','Seven 2025 and 2026 models on the text-only HLE questions, graded against the original answers: 19.9% to 40.4%.'],
      ['2. The audit','Every item checked component by component (problem, answer, rationale) by domain experts with model cross-checks: 668 verified as they were, 1,143 flawed but repairable, 689 left uncertain.'],
      ['3. Look only at the repaired items','On the items whose problem statement or answer key was revised, the original scores are 7.9% to 20.0%. Most of the "failures" here were failures to match a wrong key or answer a broken question.'],
      ['4. Re-grade the repaired items','Against the repaired items the same models score 43.1% to 52.5%: gains of '+g[0].toFixed(1)+' to '+g[1].toFixed(1)+' points, and the order changes (GPT-5.2 moves from third to first; Grok 4.1 and DeepSeek-V3.2 swap).'],
      ['5. The whole set','Across all text-only items the gain is '+fg[0].toFixed(1)+' to '+fg[1].toFixed(1)+' points, because most items were unchanged. Calibration error falls too (for example 73 to 63 for Grok 4.1), since models are less confidently wrong on fixed items.']];
    cap.innerHTML='<div class="t">'+C[i][0]+'</div><p>'+C[i][1]+'</p>';
    const ce=i===4?HM.map(m=>T[m][3]):i===3?HM.map(m=>T[m][7]):i===2?HM.map(m=>T[m][5]):HM.map(m=>T[m][1]);
    cnt.innerHTML=KU.stat('Questions',i===0?'2,500':'668 / 1,143 / 689','verified / revised / uncertain')+KU.stat('Leader',E(sh(Object.keys(v).sort((a,b)=>v[b]-v[a])[0])))+
      KU.stat('Calibration error, range',Math.min(...ce)+' to '+Math.max(...ce),'RMS, lower is better')+KU.stat('Share of items revised (implied)',i>=3?(100*K.rc.hlev_share_range[0]).toFixed(0)+' to '+(100*K.rc.hlev_share_range[1]).toFixed(0)+'%':'?','full gain ÷ subset gain, derived');
    src.innerHTML='Counts and scores: '+A('HLE-Verified, Table 2','https://arxiv.org/abs/2602.13964')+' (text-only HLE, five rollouts per item, each model\'s default decoding). Its prose states full-set gains that differ from the table for six of seven models; the table is used here.';
  }
  function draw(i){(mode==='mmlu'?mmluDraw:hleDraw)(i)}
  function setup(){setupBars(mode==='mmlu'?MODELS:HM);subjBox.style.display=mode==='mmlu'?'':'none'}
  setup();
  an=KU.anim({card:'ky-card',ctl:'ky-ctl',n:5,draw,ms:2200,label:'Re-grade step'});
  KU.seg(document.getElementById('ky-mode'),m=>{mode=m;setup();an.reset(5)});
  KU.seg(subjBox,m=>{si=+m;an.reset(5)});
  // ---- defect map ----
  const map=document.getElementById('ky-map'),mout=document.getElementById('ky-mapout');
  document.getElementById('ky-mapleg').innerHTML=TYPES.map(([c,n,col])=>'<span><i style="background:'+col+'"></i>'+n+'</span>').join('');
  let sort='rate',N=20,sel='virology';
  const fl=s=>Object.values(s.c).reduce((a,b)=>a+b,0);
  function drawMap(){
    const S=R.subjects.slice().map(s=>({s,f:fl(s),est:fl(s)/s.n*s.t}));
    S.sort((a,b)=>sort==='rate'?b.f-a.f:b.est-a.est);
    const mx=sort==='rate'?60:Math.max(...S.map(x=>x.est));
    map.innerHTML=S.slice(0,N).map(({s,f,est})=>{const scale=sort==='rate'?100/mx:100/mx*(s.t/s.n);
      return '<div class="row'+(s.k===sel?' sel':'')+'" data-k="'+s.k+'" role="button" tabindex="0"><span class="nm">'+s.k.replace(/_/g,' ')+'</span><span class="st">'+TYPES.map(([c,n,col])=>s.c[c]?'<span style="width:'+(s.c[c]*scale).toFixed(2)+'%;background:'+col+'" title="'+n+': '+s.c[c]+'"></span>':'').join('')+'</span><span class="vl">'+(sort==='rate'?f+'%':Math.round(est))+'</span></div>'}).join('');
    const s=R.subjects.find(x=>x.k===sel),f=fl(s);
    mout.innerHTML=KU.stat(sel.replace(/_/g,' '),f+' of 100 flagged','test set: '+s.t+' questions')+TYPES.filter(([c])=>s.c[c]).map(([c,n])=>KU.stat(n,s.c[c])).join('')+
      KU.stat('Estimated flawed test questions',Math.round(f/100*s.t),'derived: share × '+s.t);
  }
  map.addEventListener('click',e=>{const r=e.target.closest('.row');if(!r)return;sel=r.dataset.k;drawMap()});
  map.addEventListener('keydown',e=>{if(e.key==='Enter'){const r=e.target.closest('.row');if(r){sel=r.dataset.k;drawMap()}}});
  KU.seg(document.getElementById('ky-sort'),m=>{sort=m;drawMap()});
  KU.seg(document.getElementById('ky-n'),m=>{N=+m;drawMap()});
  drawMap();
  KU.onResize('t-key',()=>an.redraw());
})();
