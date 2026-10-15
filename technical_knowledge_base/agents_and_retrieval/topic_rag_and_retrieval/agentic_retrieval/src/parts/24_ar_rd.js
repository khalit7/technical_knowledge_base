// ---- Reading tab visuals ----
(function(){
  const A=ARL.A, esc=ARL.esc, f3=ARL.f3;
  // predict-then-reveal blocks
  document.querySelectorAll('#t-read .ar-q').forEach(q=>q.querySelectorAll('.chips button').forEach(b=>b.addEventListener('click',()=>{
    q.classList.add('done');q.querySelectorAll('.chips button').forEach(x=>x.classList.add(x.dataset.ok?'ok':'no'))})));
  // result formats (section 1)
  const F=A.tool.formats, fm=document.getElementById('ar-fmt');
  if(fm)ARL.bars(fm,[['full paragraphs with titles (root)','full'],['as JSON objects','json'],['title + first sentence','first'],['titles only','titles']].map(([nm,k])=>({nm,v:F[k],max:F.json,txt:Math.round(F[k])+' tok',col:k==='full'?'var(--acc)':'var(--c6)',hl:k==='full'})));
  // second-hop bars (section 2)
  const H=A.hops.all, hb=document.getElementById('ar-hopbars');
  if(hb)ARL.bars(hb,[['same question again','same'],['the 1.7B agent\'s 2nd query','agent'],['decomposition, 2nd sub-question','decomp'],['hop-1 sentence (IRCoT oracle)','sent'],['question + hop-1 sentence','q_sent'],['bridge entity\'s exact name','title']].map(([nm,k])=>({nm,v:H[k].top3/H[k].n,max:1,txt:H[k].top3+' / '+H[k].n,col:(k==='agent'||k==='decomp')?'var(--c2)':k==='same'?'var(--mute)':'var(--c3)'})));
  // second-hop animation
  const EX=A.hops.examples, T=A.hops.titles;
  const chipsEl=document.getElementById('ar-hopq');let cur=0;
  chipsEl.innerHTML=EX.map((e,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>'+(i+1)+'</button>').join('');
  const lx=r=>Math.min(1,Math.log10(Math.max(1,r))/3);
  function ladder(rank){if(rank==null)return '<div class="small mute">no second search</div>';
    let h='<div class="ar-ladder">';[1,3,10,100,1000].forEach(t=>{const x=(4+92*lx(t)).toFixed(1);h+='<div class="tk" style="left:'+x+'%"></div><div class="lb" style="left:'+x+'%">'+t+'</div>'});
    return h+'<div class="dot" style="left:'+(4+92*lx(rank)).toFixed(1)+'%" title="rank '+rank+'">'+(rank>999?'1k+':rank)+'</div></div>'}
  function chipsOf(pids,e){return '<div class="ar-res">'+pids.map(p=>'<span class="'+(p===e.h2?'g2':p===e.h1?'g1':'')+'" title="'+esc(T[p]||p)+'">'+esc(T[p]||p)+'</span>').join('')+'</div>'}
  function lanes(e,step){
    const L=[
      {hd:'<b>1. First search</b> with the question',q:e.question,p:e.first,r:e.r2_q},
      {hd:'<b>2. Search again with the same words</b> (first 3 skipped)',q:e.question,p:e.same,r:e.rank_same},
      {hd:'<b>3. The 1.7B agent\'s own second query</b> (recorded)',q:e.q_agent||'(the agent did not search a second time)',p:e.agent||[],r:e.q_agent?e.rank_agent:null},
      {hd:'<b>4. The sentence hop 1 states, as the query</b> (oracle: what IRCoT would search with)',q:e.q_sent,p:e.sent,r:e.rank_sent}];
    return L.map((l,i)=>'<div class="ar-lane'+(i+1>step?' dim':'')+'"><div class="hd">'+l.hd+'</div><span class="qq">'+esc(l.q)+'</span>'+(i+1<=step?chipsOf(l.p,e)+ladder(l.r):'')+'</div>').join('')}
  const caps=e=>['Question '+(cur+1)+' of '+EX.length+'. Answer: '+esc(e.answer)+'. Gold paragraphs: '+esc(T[e.h1])+' (hop 1) and '+esc(T[e.h2])+' (hop 2). Press play.',
    'The question finds hop 1 ('+esc(T[e.h1])+') at once. Hop 2 ranks '+e.r2_q+': the question never names it.',
    'Searching again with the same words shows ranks 4 to 6. Hop 2 is now at rank '+e.rank_same+' of the remaining paragraphs: more of the same rarely helps.',
    e.q_agent?'The agent wrote "'+esc(e.q_agent)+'". Hop 2 lands at rank '+e.rank_agent+(e.rank_agent<=3?': found.':': missed; the query does not carry the bridge entity.'):'The agent answered after one search, so it never looked for hop 2.',
    'Searching with the sentence hop 1 states (it names the bridge entity), hop 2 ranks '+e.rank_sent+'. The search tool was never the problem; the query was.'];
  const qt=document.getElementById('ar-hopqt'),ln=document.getElementById('ar-hoplanes'),cap=document.getElementById('ar-hopcap');
  const an=RD.anim({card:'ar-hopcard',ctl:'ar-hopctl',n:5,ms:2200,label:'Second-hop step',draw:i=>{const e=EX[cur];
    qt.innerHTML='<b>Q:</b> '+esc(e.question);ln.innerHTML=lanes(e,i);cap.innerHTML=caps(e)[i]}});
  RD.seg(chipsEl,v=>{cur=+v;an.reset(5)});
  // taxonomy of failures (section 6), animated across strategies
  const TX=A.tax, NM=ARL.NAMES;
  const MODES={a:['single_k10','react'],b:['longctx','longctx_tokens8000','react'],c:['closed','single_k2','single_k5','single_k10','decomp','react','longctx','longctx_tokens8000']};
  let mode='a';
  const taxEl=document.getElementById('ar-tax'),taxCap=document.getElementById('ar-taxcap');
  function bar(s,show){const t=TX[s],segs=[['right','var(--c3)'],['readwrong','var(--c5)'],['half','var(--c2)'],['none','var(--dim)']];
    return '<div class="row"><div class="nm">'+esc(NM[s])+'</div><div class="sb">'+segs.map(([k,c])=>'<span style="width:'+(show?t[k]/2:0)+'%;background:'+c+';transition:width .6s'+(show&&t[k]>0?'':';padding:0')+'" title="'+k+' '+t[k]+'">'+(show&&t[k]>=14?t[k]:'')+'</span>').join('')+'</div></div>'}
  function capOf(s){const t=TX[s];return esc(NM[s])+': right '+t.right+' of 200; both gold read '+t.both_seen+' times, right given both '+Math.round(100*t.right_given_both)+'%; right without both '+t.right_without_both+'.'}
  const tan=RD.anim({card:'ar-taxcard',ctl:'ar-taxctl',n:MODES[mode].length,ms:1800,label:'Strategy',draw:i=>{const L=MODES[mode];
    taxEl.innerHTML=L.map((s,j)=>bar(s,j<=i)).join('');taxCap.innerHTML=capOf(L[i])}});
  RD.seg(document.getElementById('ar-taxseg'),m=>{mode=m;tan.reset(MODES[m].length)});
  // accuracy against tokens read (section 8)
  const AC=A.lc.acc, la=document.getElementById('ar-lcacc');
  if(la)ARL.bars(la,['single_k2','single_k5','single_k10','longctx','longctx_tokens8000'].map(s=>({nm:NM[s],v:AC[s].f1,max:.35,txt:f3(AC[s].f1),col:s.indexOf('long')===0?'var(--c4)':'var(--acc)'})).concat([]));
  if(la)la.insertAdjacentHTML('beforeend','<p class="small mute">F1 (bar) measured; tokens per question: '+['single_k2','single_k5','single_k10','longctx','longctx_tokens8000'].map(s=>esc(NM[s])+' '+ARL.fmtInt(AC[s].tok)+' ('+AC[s].both+' with both gold)').join('; ')+'.</p>');
  // root's position run (20 paragraphs), when it exists
  const pb=document.getElementById('ar-posbox'),RP=A.pend.root_position;
  if(pb){if(RP&&RP['1.7b']){const slots=['0','4','9','14','18'],ms=['1.7b','4b'].filter(m=>RP[m]);
      pb.innerHTML='<div class="card"><div class="small mute">Root Agentic lab, measured: the same 20 paragraphs per question (about 3,000 tokens), the gold block moved through 5 slots</div>'+ms.map(m=>'<div class="small" style="margin-top:6px"><b>Qwen3-'+m.toUpperCase().replace('B','B')+'</b>, '+RP[m].n+' questions</div><div class="bars" id="ar-posb-'+m.replace('.','')+'"></div>').join('')+'</div>';
      ms.forEach(m=>ARL.bars(document.getElementById('ar-posb-'+m.replace('.','')),slots.map(s=>({nm:'gold at paragraph '+(+s+1),v:RP[m].f1[s],max:.75,txt:f3(RP[m].f1[s]),col:m==='4b'?'var(--c4)':'var(--acc)'}))));
      const r=RP['1.7b'].f1;
      pb.querySelector('.card').insertAdjacentHTML('beforeend','<p class="small">A clear U for the 1.7B: F1 '+f3(r['0'])+' with the gold block first, '+f3(r['18'])+' last and '+f3(Math.min(r['4'],r['9'],r['14']))+' in the middle; the root measured first minus middle at +0.116 (paired 95% interval +0.063 to +0.168) and last minus middle at +0.087 (+0.045 to +0.130). The 4B (100 questions) keeps the advantage of the first slot (+0.128, interval +0.055 to +0.207) but not of the last. Liu et al. measured one answer document; here the two gold paragraphs move as one block.</p>')}
    else pb.innerHTML='<div class="ar-pend"><div class="t">Pending (root Agentic lab)</div>The root\'s 20-paragraph position test fills this box from its run file when s_post.py is rerun.<code>sh src/scripts/run_pending.sh post</code></div>'}
})();
