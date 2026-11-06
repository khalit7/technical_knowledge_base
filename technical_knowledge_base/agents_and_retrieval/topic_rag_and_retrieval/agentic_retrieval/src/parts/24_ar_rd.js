// ---- Reading tab visuals ----
(function(){
  const A=ARL.A, esc=ARL.esc, f3=ARL.f3;
  // predict-then-reveal blocks
  document.querySelectorAll('#t-read .ar-q').forEach(q=>q.querySelectorAll('.chips button').forEach(b=>b.addEventListener('click',()=>{
    q.classList.add('done');q.querySelectorAll('.chips button').forEach(x=>x.classList.add(x.dataset.ok?'ok':'no'))})));
  // the second-hop stepper is now the 3D stage Fig. 3 (28c_sc_hop.js)
  // taxonomy of failures (section 6), animated across strategies
  const TX=A.tax, NM=ARL.NAMES;
  const MODES={a:['single_k10','react'],b:['longctx','longctx_tokens8000','react'],c:['closed','single_k2','single_k5','single_k10','decomp','react','longctx','longctx_tokens8000']};
  let mode='a';
  const taxEl=document.getElementById('ar-tax');
  function bar(s,show){const t=TX[s],segs=[['right','var(--c3)'],['readwrong','var(--c5)'],['half','var(--c2)'],['none','var(--dim)']];
    return '<div class="row"><div class="nm">'+esc(NM[s])+'</div><div class="sb">'+segs.map(([k,c])=>'<span style="width:'+(show?t[k]/2:0)+'%;background:'+c+';transition:width .6s'+(show&&t[k]>0?'':';padding:0')+'" title="'+k+' '+t[k]+'">'+(show&&t[k]>=14?t[k]:'')+'</span>').join('')+'</div></div>'}
  // one step per strategy; its numbers are the step list's item on the left (sx-tax-a, -b, -c, one list per comparison)
  const tan=RD.anim({card:'ar-taxcard',ctl:'ar-taxctl',n:MODES[mode].length,ms:3600,label:'Strategy',list:'sx-tax-a',draw:i=>{const L=MODES[mode];
    taxEl.innerHTML=L.map((s,j)=>bar(s,j<=i)).join('')}});
  RD.seg(document.getElementById('ar-taxseg'),m=>{mode=m;['a','b','c'].forEach(x=>{const l=document.getElementById('sx-tax-'+x);if(l)l.hidden=x!==m});tan.reset(MODES[m].length,'sx-tax-'+m)});
  // root's position run (20 paragraphs), when it exists
  const pb=document.getElementById('ar-posbox'),RP=A.pend.root_position;
  if(pb){if(RP&&RP['1.7b']){const slots=['0','4','9','14','18'],ms=['1.7b','4b'].filter(m=>RP[m]);
      pb.innerHTML='<div class="card"><div class="small mute">Root agent runs, measured: the same 20 paragraphs per question (about 3,000 tokens), the gold block moved through 5 slots</div>'+ms.map(m=>'<div class="small" style="margin-top:6px"><b>Qwen3-'+m.toUpperCase().replace('B','B')+'</b>, '+RP[m].n+' questions</div><div class="bars" id="ar-posb-'+m.replace('.','')+'"></div>').join('')+'</div>';
      ms.forEach(m=>ARL.bars(document.getElementById('ar-posb-'+m.replace('.','')),slots.map(s=>({nm:'gold at paragraph '+(+s+1),v:RP[m].f1[s],max:.75,txt:f3(RP[m].f1[s]),col:m==='4b'?'var(--c4)':'var(--acc)'}))));
      const r=RP['1.7b'].f1;
      pb.querySelector('.card').insertAdjacentHTML('beforeend','<p class="small">A clear U for the 1.7B: F1 '+f3(r['0'])+' with the gold block first, '+f3(r['18'])+' last and '+f3(Math.min(r['4'],r['9'],r['14']))+' in the middle; the root measured first minus middle at +0.116 (paired 95% interval +0.063 to +0.168) and last minus middle at +0.087 (+0.045 to +0.130). The 4B (100 questions) keeps the advantage of the first slot (+0.128, interval +0.055 to +0.207) but not of the last. Liu et al. measured one answer document; here the two gold paragraphs move as one block.</p>')}
    else pb.innerHTML='<div class="ar-pend"><div class="t">Pending (root agent runs)</div>The root\'s 20-paragraph position test fills this box from its run file when s_post.py is rerun.<code>sh src/scripts/run_pending.sh post</code></div>'}
})();
