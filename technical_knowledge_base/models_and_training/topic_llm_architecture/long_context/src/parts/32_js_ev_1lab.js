// Eviction, section 4: quality against memory over all recorded prompts (src/kv/run_kv.py evict), needle survival per policy,
// the predict answer. The kept-entry maps on one prompt are the 3D stage, 43_js_sc_ev.js (2026-11-09); window.EV_NAME is shared with it.
(function(){
  if(!window.EVD||!LC.$('ev-chart'))return;
  const $=LC.$,E=EVD;
  const NAME={full:'full cache',recent:'recent',sink_recent:'sink + recent',random:'random (+ sinks)',h2o:'H2O',snapkv:'SnapKV',snapkv_doc:'SnapKV, before the question',local_global:'local + global',
    q_tok8:'int8',q_tok4:'int4',q_tok2:'int2',q_kivi4:'KIVI int4',q_kivi2:'KIVI int2'};
  window.EV_NAME=NAME;
  const ser=(p,f)=>E.series.find(r=>r.pol===p&&Math.abs(r.f-f)<1e-9);
  const pc=v=>Math.round(100*v)+'%';
  LC.onResize($('t-read'),()=>chart());
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
