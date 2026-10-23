// Eviction lab: kept-entry maps (recorded by src/kv/run_kv.py, binned to 64-token columns) stepped through as a
// before/after on one prompt; quality against memory over all recorded prompts; needle survival per policy.
(function(){
  if(!window.EVD||!LC.$('ev-cv'))return;
  const $=LC.$,E=EVD;
  const NAME={full:'full cache',recent:'recent',sink_recent:'sink + recent',random:'random (+ sinks)',h2o:'H2O',snapkv:'SnapKV',snapkv_doc:'SnapKV, before the question',local_global:'local + global',
    q_tok8:'int8',q_tok4:'int4',q_tok2:'int2',q_kivi4:'KIVI int4',q_kivi2:'KIVI int2'};
  const WHY={full:'Every key and value of all 4,096 prompt tokens in all 90 caches: 4,096 x 23,040 bytes = 90 MiB in bf16 for this small model.',
    recent:'A window applied after training: everything older than the window is gone, including the first tokens where SmolLM2 parks its attention (its attention sink switches on at layer 12, Inside a real model on the root).',
    sink_recent:'StreamingLLM keeps the first 4 tokens as sinks, so the model stays fluent, but the window still forgets the needle unless it is recent.',
    random:'The cheap control: a random choice per head, keeping the sinks and the question. A five-token number survives intact in almost no head.',
    h2o:'Accumulated attention favours tokens many queries looked at: early tokens, sinks, punctuation. A number read once in passing is not a heavy hitter.',
    snapkv:'Scored by the question itself (it sits in the 32-token observation window), each head keeps what the question looks at: the number survives where it matters.',
    snapkv_doc:'The same method, but scored before the question arrived. The selection is made for the document\'s last sentences, and the number is dropped.',
    local_global:'Five global layers keep everything; the other 25 keep sinks and a short window. The model was trained with every layer global, so the five cannot carry the answer alone.'};
  const ORDER=['full','recent','sink_recent','random','h2o','snapkv','snapkv_doc','local_global'];
  let bud='0.25';
  const ser=(p,f)=>E.series.find(r=>r.pol===p&&Math.abs(r.f-f)<1e-9);
  const pc=v=>Math.round(100*v)+'%';
  const steps=()=>ORDER.filter(p=>p==='full'||E.maps[p+'@'+bud]);
  const cv=$('ev-cv');
  function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888'}
  function drawMap(p){
    const W=LC.width(cv.parentElement),dpr=window.devicePixelRatio||1,rows=E.layers*E.kvh,cols=E.bins;
    const L=W<520?26:34,cw=(W-L-4)/cols,ch=W<520?2.6:3,H=Math.round(rows*ch+18);
    cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';
    const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
    const acc=css('--acc'),soft=css('--soft'),ink=css('--mute'),hl=css('--c4');
    const s=p==='full'?null:E.maps[p+'@'+bud];
    c.fillStyle=soft;c.fillRect(L,0,cols*cw,rows*ch);
    for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){const v=s?+s[r*cols+k]/9:1;if(v<=0)continue;c.globalAlpha=0.15+0.85*v;c.fillStyle=acc;c.fillRect(L+k*cw,r*ch,cw+0.3,ch+0.2)}
    c.globalAlpha=1;const n0=E.feat.needle[0]/E.length*cols,n1=E.feat.needle[1]/E.length*cols;
    c.strokeStyle=hl;c.lineWidth=2;c.strokeRect(L+n0*cw-1,0,Math.max(3,(n1-n0)*cw+2),rows*ch);
    c.fillStyle=ink;c.font='11px system-ui,sans-serif';c.textAlign='right';
    [0,12,29].forEach(l=>c.fillText('L'+l,L-3,l*E.kvh*ch+ch*2+3));
    c.textAlign='left';c.fillText('token 0',L,rows*ch+13);c.textAlign='right';c.fillText('4,096',L+cols*cw,rows*ch+13);
  }
  function draw(i){
    const p=steps()[i],f=p==='full'?1:+bud,r=ser(p,f),fe=p==='full'?{pred:E.feat.full,exact:true,surv:90}:E.feat.res[p+'@'+bud];
    drawMap(p);
    $('ev-cap').innerHTML='<div class="t">Step '+i+': '+NAME[p]+(p==='full'?'':' at '+(f*100)+'% of the entries')+'</div><p>'+WHY[p]+'</p>'+
      '<p>This prompt: the answer is '+E.feat.key+'; the model says "'+LC.esc(fe.pred.trim())+'"'+(fe.exact?' (right)':' (wrong)')+'; '+fe.surv+' of 90 caches kept the whole number.</p>';
    $('ev-cnt').innerHTML=[
      ['Cache kept',LC.bytes(E.length*E.bpt*f),'bf16, of '+LC.bytes(E.length*E.bpt)],
      ['Pass-key, '+E.n_pk+' prompts',pc(r.pk),'full cache '+pc(ser('full',1).pk)],
      ['Copy loss',r.copy!==undefined?LC.fmt(r.copy,2):'not run','full '+LC.fmt(ser('full',1).copy,2)+' (lower is better)'],
      ['New-story loss',r.new!==undefined?LC.fmt(r.new,2):'not run','full '+LC.fmt(ser('full',1).new,2)]
    ].map(x=>'<div class="stat"><div class="k">'+x[0]+'</div><div class="v">'+x[1]+'</div><div class="d">'+x[2]+'</div></div>').join('');
  }
  const an=LC.anim({card:'ev-card',ctl:'ev-ctl',n:steps().length,draw,ms:2200,tab:'t-read',label:'Policy step'});
  LC.seg($('ev-bud'),m=>{bud=m;an.reset(steps().length)});
  LC.onResize($('t-read'),()=>{an.redraw();chart()});
  // quality vs memory
  let met='pk';
  const COL={recent:'--c3',sink_recent:'--c5',random:'--mute',h2o:'--c2',snapkv:'--acc',snapkv_doc:'--c6',local_global:'--c4',q_tok:'--ink',q_kivi:'--c4'};
  function chart(){
    const el=$('ev-chart'),W=LC.width(el),H=Math.round(Math.min(320,Math.max(230,W*0.52))),L=44,R=10,T=12,B=34;
    const xs=v=>L+(W-L-R)*(Math.log2(v)+4.2)/4.2;
    const full=ser('full',1),ys=met==='pk'?[0,1]:met==='copy'?[0,5]:[1.8,5];
    const py=v=>T+(H-T-B)*(1-(v-ys[0])/(ys[1]-ys[0]));
    let g='';
    const ticks=met==='pk'?[0,0.25,0.5,0.75,1]:met==='copy'?[0,1,2,3,4,5]:[2,3,4,5];
    ticks.forEach(v=>{g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+py(v)+'" y2="'+py(v)+'" stroke="var(--line)"/>'+LC.t(L-4,py(v)+4,met==='pk'?Math.round(v*100)+'%':v,{a:'end'})});
    [1/16,1/8,1/4,1/2,1].forEach(v=>{g+=LC.t(xs(v),H-B+15,(v*100>=10?Math.round(v*100):(v*100).toFixed(1))+'%',{a:'middle'})});
    g+=LC.t(L,H-4,'share of the full bf16 cache kept (log scale)',{fill:'var(--mute)'});
    const val=r=>r[met];
    g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+py(val(full))+'" y2="'+py(val(full))+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'+LC.t(W-R,py(val(full))-4,'full cache',{a:'end',fs:11});
    const leg=[];
    Object.keys(COL).forEach(p=>{let rows;
      if(p==='q_tok')rows=E.series.filter(r=>/^q_tok/.test(r.pol));else if(p==='q_kivi')rows=E.series.filter(r=>/^q_kivi/.test(r.pol));else rows=E.series.filter(r=>r.pol===p);
      rows=rows.filter(r=>val(r)!==undefined&&val(r)!==null).sort((a,b)=>a.f-b.f);if(!rows.length)return;
      const c='var('+COL[p]+')',q=/^q_/.test(p);
      g+='<path d="'+rows.map((r,k)=>(k?'L':'M')+xs(r.f).toFixed(1)+' '+py(Math.min(ys[1],val(r))).toFixed(1)).join('')+'" fill="none" stroke="'+c+'" stroke-width="2"'+(q?' stroke-dasharray="6 3"':'')+'/>';
      rows.forEach(r=>{g+=(q?'<rect x="'+(xs(r.f)-4)+'" y="'+(py(Math.min(ys[1],val(r)))-4)+'" width="8" height="8"':'<circle cx="'+xs(r.f)+'" cy="'+py(Math.min(ys[1],val(r)))+'" r="3.5"')+' fill="'+c+'"><title>'+(NAME[r.pol]||r.pol)+': '+(met==='pk'?pc(val(r)):LC.fmt(val(r),2))+' at '+LC.fmt(100*r.f,1)+'%</title>'+(q?'</rect>':'</circle>')});
      leg.push('<span><i style="background:'+c+'"></i>'+(p==='q_tok'?'int8 / int4 / int2 (dashed, squares)':p==='q_kivi'?'KIVI int4 / int2 (dashed, squares)':NAME[p])+'</span>')});
    el.innerHTML=LC.svg(W,H,g,'Quality against cache kept');$('ev-leg').innerHTML=leg.join('');
    const TXT={pk:'Pass-key: higher is better. Only a question-aware selection (SnapKV, scored with the question in its window) holds up as the cache shrinks; the same method scored before the question, H2O and every window-based policy collapse even at 50%. Quantisation keeps every entry: int8 and int4 cost almost nothing, int2 breaks per-token rounding and halves KIVI\'s accuracy.',
      copy:'Copy loss: lower is better. Re-reading a story from earlier in the prompt needs that whole story in the cache; every eviction policy loses most of the benefit already at 50% (the copy loss more than doubles), while int4 quantisation keeps it. Only fewer bits, not fewer entries, preserves long-range copying here.',
      new:'New-story loss: what a perplexity benchmark sees. Every policy that keeps the first tokens stays within a few percent of the full cache even at 6% of it; only the windows without sinks (recent) and 2-bit per-token rounding move it. A perplexity check would pass caches that fail both other tasks.'};
    $('ev-qtext').textContent=TXT[met];
  }
  LC.seg($('ev-met'),m=>{met=m;chart()});LC.onTab('t-read',chart);chart();
  // survival table
  const pols=['recent','sink_recent','random','h2o','snapkv','snapkv_doc','local_global'];
  let h='<thead><tr><th>Policy</th>'+['50%','25%','12.5%','6.25%'].map(x=>'<th class="num">'+x+': heads kept / correct</th>').join('')+'</tr></thead><tbody>';
  pols.forEach(p=>{h+='<tr><td>'+NAME[p]+'</td>'+[0.5,0.25,0.125,0.0625].map(f=>{const r=ser(p,f);return '<td class="num">'+(r?LC.fmt(r.surv,0)+' / '+pc(r.pk):'-')+'</td>'}).join('')+'</tr>'});
  $('ev-surv').innerHTML=h+'</tbody>';
  const s125=ser('snapkv',0.125),d50=ser('snapkv_doc',0.5),lg=ser('local_global',0.5);
  $('ev-survtext').textContent='It is which heads keep the number, not how many. SnapKV at 12.5% keeps it in about '+LC.fmt(s125.surv,0)+' of 90 caches and answers '+pc(s125.pk)+
    '; SnapKV scored before the question keeps it in more ('+LC.fmt(d50.surv,0)+' at 50%) and answers '+pc(d50.pk)+'. Local + global always keeps it in the 15 caches of its 5 global layers, and at 50% in about '+LC.fmt(lg.surv,0)+', yet answers '+pc(lg.pk)+': the heads that retrieve in SmolLM2 are spread over layers the layout made local.';
  // drill
  const pr=$('ev-pr1');pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{pr.classList.add('done');
    pr.querySelectorAll('.opts button').forEach(x=>x.classList.add(x.dataset.ok?'right':'wrong'))}));
  const h125=ser('h2o',0.125),l25=ser('local_global',0.25);
  $('ev-pr1-a').textContent='SnapKV: '+pc(s125.pk)+' of the '+E.n_pk+' prompts at 12.5%, against '+pc(h125.pk)+' for H2O and '+pc(l25.pk)+' for local + global (which cannot even reach 12.5%: its five global layers alone are a sixth of the cache, so it is shown at 25%). H2O is tempting because heavy hitters carry most of the attention mass, but mass is not relevance: the number is read once.';
})();
