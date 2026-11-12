// ---- Scene data (window.VLS) for the 3D stages, derived from the recorded engine (window.VL_STEP, vLLM v0.31.0 serving Qwen3-0.6B) ----
// Fig. 1 follows customer C through the prefix-caching-on run; Fig. 2 is the step of the prefix-caching-off run in which C is admitted.
// Nothing here is invented: every count and block number is read from the recording; check_stages.mjs compares the step lists with it.
(function(){
  const D=window.VL_STEP;if(!D||!D.runs)return;
  D.runs.forEach(r=>r.steps.forEach(st=>{if(typeof st.blocks==='string')st.blocks=st.blocks.split(',').map(x=>x.split('.').map(Number))}));
  const run=k=>D.runs.find(r=>r.key===k);
  // blocks after step i: [{id, rc, hashed, owner}] (block 0 is the null block and is not listed)
  const pool=(r,i)=>r.steps[i].blocks.map((b,k)=>({id:k+1,rc:b[0],hashed:b[1]>=0,owner:b[2]>=0?r.names[b[2]]:null}));
  const admitAt=(r,q)=>r.steps.findIndex(s=>s.ev.some(e=>e[0]==='admit'&&e[1]===q));
  const finishAt=(r,q)=>r.steps.findIndex(s=>s.ev.some(e=>e[0]==='finish'&&e[1]===q));
  const ev=(s,t)=>s.ev.filter(e=>e[0]===t);
  // Fig. 1: customer C, prefix caching on
  const on=run('pc_on'),ia=admitAt(on,'C'),sa=on.steps[ia],adm=ev(sa,'admit').find(e=>e[1]==='C'),ifin=finishAt(on,'C'),sf=on.steps[ifin],fr=ev(sf,'free')[0];
  const cb=sa.reqs.C[5],newB=ev(sa,'alloc')[0][1];
  const hero={run:on,step:ia,bs:on.bs,np:adm[3],hit:adm[2],hitBlocks:cb.slice(0,adm[2]/on.bs),newBlocks:newB,tok:sa.tok,kind:sa.kind,budget:on.cfg.max_num_batched_tokens,
    used:Object.values(sa.tok).reduce((a,b)=>a+b,0),shared:cb.slice(0,adm[2]/on.bs).map(id=>pool(on,ia)[id-1].rc),
    poolAt:pool(on,ia),poolFin:pool(on,ifin),freeAt:sa.free,freeFin:sf.free,finish:ifin,freed:fr[1],freedHashed:fr[2],answer:on.req.C.answer,
    firstToken:sa.reqs.C[4]===1,others:Object.keys(sa.tok).filter(q=>q!=='C')};
  // Fig. 2: the step that admits C, prefix caching off
  const off=run('pc_off'),ib=admitAt(off,'C'),sb=off.steps[ib],pb=off.steps[ib-1];
  const out={};Object.keys(sb.tok).forEach(q=>{out[q]=sb.reqs[q][4]-(pb.reqs[q]?pb.reqs[q][4]:0)});
  const before={};Object.keys(sb.tok).forEach(q=>{const p=pb.reqs[q];before[q]=p?{done:p[1],len:p[2],np:p[3],state:p[0]}:{done:0,len:off.req[q].np,np:off.req[q].np,state:'WAIT'}});
  const step={run:off,step:ib,bs:off.bs,budget:off.cfg.max_num_batched_tokens,maxSeqs:off.cfg.max_num_seqs,tok:sb.tok,kind:sb.kind,order:Object.keys(sb.tok),before,out,
    alloc:ev(sb,'alloc')[0][1],blocks:Object.fromEntries(Object.keys(sb.tok).map(q=>[q,sb.reqs[q][5]])),prevBlocks:Object.fromEntries(Object.keys(sb.tok).map(q=>[q,pb.reqs[q]?pb.reqs[q][5]:[]])),
    freeBefore:pb.free.length,freeAfter:sb.free.length,poolBefore:pool(off,ib-1),poolAfter:pool(off,ib),nBlocks:off.cfg.real_num_blocks,waitBefore:pb.wait,runBefore:pb.run};
  window.VLS={hero,step,COL:{A:'#2f6fb5',B:'#c2703a',C:'#3f7f56',D:'#8a5cb8',A2:'#3a9aa8'}};
})();
