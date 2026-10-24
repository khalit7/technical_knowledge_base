// ---- shared helpers for this page (prefix ar) ----
window.ARL=(function(){
  const A=window.AR, esc=RD.esc;
  const NAMES={closed:'No retrieval',single_k2:'Pipeline, top 2',single_k5:'Pipeline, top 5',single_k10:'Pipeline, top 10',
    single_k5_methodbm25:'Pipeline, BM25 top 5',decomp:'Decompose, then retrieve',react:'Agent loop (ReAct)',longctx:'Long context, own 10 (1.5k tok)',
    longctx_tokens8000:'Long context, 8k tokens'};
  const f3=x=>(x==null||isNaN(x))?'n/a':(+x).toFixed(3);
  const fmtInt=x=>Math.round(x).toLocaleString('en-US');
  const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
  // seeded random (mulberry32)
  function rng(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296}}
  function bootCI(v,n,seed){const R=rng(seed||1),m=v.length,ms=[];for(let b=0;b<(n||500);b++){let s=0;for(let i=0;i<m;i++)s+=v[Math.floor(R()*m)];ms.push(s/m)}ms.sort((a,b)=>a-b);return[ms[Math.floor(.025*ms.length)],ms[Math.floor(.975*ms.length)-1]]}
  // horizontal bars into el: rows [{nm, v, max, txt, col, hl}]
  function bars(el,rows){el.innerHTML=rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><div class="nm" title="'+esc(r.nm)+'">'+esc(r.nm)+'</div><div class="track"><div class="fill" style="width:'+Math.max(0,Math.min(100,100*r.v/r.max)).toFixed(1)+'%;background:'+(r.col||'var(--acc)')+'"></div></div><div class="val">'+r.txt+'</div></div>').join('')}
  // pending boxes: data from AR.pend (filled by s_post.py after run_pending.sh); null = not run yet
  const P=A.pend||{};
  const ROW=(nm,s)=>s?'<tr><td>'+esc(nm)+'</td><td class="num">'+s.n+'</td><td class="num">'+f3(s.f1)+'</td><td class="num">'+(s.f1_ci?f3(s.f1_ci[0])+' to '+f3(s.f1_ci[1]):'')+'</td><td class="num">'+fmtInt(s.tok)+'</td><td class="num">'+(+s.sec).toFixed(2)+'</td><td class="num">'+(s.srch!=null?(+s.srch).toFixed(2):'')+'</td></tr>':'';
  const HEAD='<div class="tw"><table><thead><tr><th>Run</th><th class="num">n</th><th class="num">F1</th><th class="num">95% CI</th><th class="num">Tokens</th><th class="num">Seconds</th><th class="num">Searches</th></tr></thead><tbody>';
  const BOX={
    'ar-pend-budget':{cmd:'sh src/scripts/run_pending.sh budgets   # about 1 h 15 min, bench lock',what:'The root\'s ReAct agent with search budgets 1, 2, 3 and 6 (4 is the root\'s run) and with 1 or 5 paragraphs per search, 200 questions, Qwen3-1.7B.',
      rows:[['budget 1','react_budget1'],['budget 2','react_budget2'],['budget 3','react_budget3'],['budget 6','react_budget6'],['1 result per search','react_k1'],['5 results per search','react_k5']]},
    'ar-pend-iter':{cmd:'sh src/scripts/run_pending.sh core   # about 1 h 20 min, bench lock (IRCoT ~23 min, Self-Ask ~13, FLARE ~5)',what:'IRCoT, Self-Ask and FLARE on the 200 questions with Qwen3-1.7B, after a format check on 60 held-out dev questions; the 4B: run_pending.sh optional (about 2 h).',
      rows:[['IRCoT','ircot'],['Self-Ask','selfask'],['FLARE','flare'],['IRCoT, 4B','ircot_4b'],['Self-Ask, 4B','selfask_4b']]},
    'ar-pend-crag':{cmd:'sh src/scripts/run_pending.sh core   # crag ~5 min, selfcheck ~3 min of it',what:'CRAG-style (cross-encoder thresholds at the 33rd and 67th percentiles, query rewritten by the 1.7B on Incorrect or Ambiguous) and the Self-RAG-style yes/no critique.',
      rows:[['CRAG-style','crag']],extra:()=>(P.crag_verdicts?'<p class="small">Verdicts: correct '+P.crag_verdicts.correct+', ambiguous '+P.crag_verdicts.ambiguous+', incorrect '+P.crag_verdicts.incorrect+'.</p>':'')+(P.selfcheck?'<p class="small">Self-check: said supported for '+P.selfcheck.supported+' of '+P.selfcheck.n+' ('+P.selfcheck.supported_right+' of them right; '+P.selfcheck.unsupported_right+' right answers called unsupported); policy (unsupported &rarr; agent loop) F1 '+f3(P.selfcheck.policy_f1)+' at '+fmtInt(P.selfcheck.policy_tok)+' tokens.</p>':'')},
    'ar-pend-router':{cmd:'sh src/scripts/run_pending.sh core   # router ~3 min',what:'Adaptive-RAG-style three-way router prompted to the 1.7B (NONE: no retrieval, ONE: top 5, MANY: agent loop).',
      rows:[],extra:()=>P.router_labels?'<p class="small">Labels: none '+P.router_labels.NONE+', one '+P.router_labels.ONE+', many '+P.router_labels.MANY+' (all 200 need two paragraphs). Routed F1 '+f3(P.router_policy.f1)+' at '+fmtInt(P.router_policy.tok)+' tokens.</p>':''},
    'ar-pend-lim':{cmd:'sh src/scripts/run_pending.sh lim   # about 1 h 10 min, bench lock',what:'Lost in the middle at 5, 10, 40 and 80 paragraphs (up to about 12k tokens), gold block at 5 relative positions, first 50 questions, Qwen3-1.7B.',
      rows:[],extra:()=>{if(!P.lim)return'';const Ns=Object.keys(P.lim).sort((a,b)=>a-b),rels=['0.00','0.25','0.50','0.75','1.00'];
        return '<div class="tw"><table><thead><tr><th>Paragraphs (mean tokens)</th>'+rels.map(r=>'<th class="num">'+(r==='0.00'?'first':r==='1.00'?'last':r)+'</th>').join('')+'</tr></thead><tbody>'+Ns.map(N=>'<tr><td>'+N+' ('+fmtInt(P.lim_tok[N])+')</td>'+rels.map(r=>'<td class="num">'+f3(P.lim[N][r])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'}},
    'ar-pend-mem':{cmd:'sh src/scripts/run_pending.sh core   # memory ~6 min',what:'The final answer of the root\'s ReAct trajectories (2 or more searches) re-generated from: everything read, the last observation, or the top 3 read paragraphs by question plus last thought (one prompt, no thoughts).',
      rows:[['everything read','memory.all'],['last observation','memory.last'],['top 3 by question + thought','memory.top3']]},
    'ar-pend-traj':{cmd:'the root\'s chain (Qwen3-4B runs) and sh src/scripts/run_pending.sh core',what:'Trajectories of the 4B model (root agent runs chain, running) and of IRCoT and Self-Ask (this page) are not in the comparer yet: their runs are pending.',rows:[]},
    'ar-pend-route':{cmd:'sh src/scripts/run_pending.sh core',what:'The LLM router, CRAG-style query rewriting and the self-check critique are not policies in this lab yet: their runs are pending (results appear in the Reading tab, sections 4 and 5, when they land).',rows:[]}
  };
  const get=k=>k.split('.').reduce((o,x)=>o==null?null:o[x],P);
  function pendBoxes(){Object.keys(BOX).forEach(id=>{const el=document.getElementById(id);if(!el)return;const b=BOX[id];
    const have=b.rows.filter(r=>get(r[1]));const ex=b.extra?b.extra():'';
    if(have.length||ex){el.className='card';el.innerHTML='<div class="small mute">Measured on Apple M1 Pro (Metal), Qwen3 Q4_K_M, temperature 0: '+esc(b.what)+'</div>'+(have.length?HEAD+have.map(r=>ROW(r[0],get(r[1]))).join('')+'</tbody></table></div>':'')+ex+
        (have.length<b.rows.length?'<div class="small mute">Still pending: '+b.rows.filter(r=>!get(r[1])).map(r=>esc(r[0])).join(', ')+'</div>':'');}
    else el.innerHTML='<div class="t">Pending generator run</div>'+esc(b.what)+'<code>'+esc(b.cmd)+'</code>';});}
  return {A,NAMES,f3,fmtInt,mean,rng,bootCI,bars,pendBoxes,esc};
})();
ARL.pendBoxes();
