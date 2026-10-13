// ---- Reading tab, section 7: one step on 2 ranks, DDP against FSDP2, from the Distributed lab's flight-recorder records ----
(function(){
  const D=window.RDD&&window.RDD.dist,box=document.getElementById('rd-dst-ranks');if(!D||!box)return;
  const fmt=n=>Number(n).toLocaleString('en-US'),MB=b=>(b/1e6).toFixed(2)+' MB';
  const G=['Root: embeddings, final norm','Block 0','Block 1','Block 2','Block 3'];
  const CD=D.coll.ddp_w2,CF=D.coll.fsdp_w2,MD=D.mem.ddp_w2,MF=D.mem.fsdp_w2;
  // steps: shard state per group (1 = full, .5 = own half), gathered groups (drawn full and lighter), collectives issued in this step (indices into the record)
  const full=[1,1,1,1,1],half=[.5,.5,.5,.5,.5];
  const byph=(C,ph)=>C.map((c,i)=>[c,i]).filter(x=>x[0].ph===ph);
  const ddpB=byph(CD,'bwd'),ddpF=byph(CD,'fwd'),fs=CF;
  const SD=[
    {t:'Before the step: a full copy on every rank',p:'Each rank holds all weights ('+MB(MD.params)+'), all AdamW state ('+MB(MD.opt)+') and gradient buckets ('+MB(MD.buckets)+'): '+MB(MD.persistent)+' before any activation.',hold:full,gat:[],c:[],ph:'idle'},
    {t:'Forward: no weight traffic',p:'Each rank runs the whole model on its own 8 windows. At step 1 only, rank 0 broadcasts the rebuilt bucket order ('+ddpF.map(x=>x[0].in_bytes+' B').join(' and ')+'): DDP\'s first step used one bucket and recorded the order gradients arrived in.',hold:full,gat:[],c:ddpF.map(x=>x[1]),ph:'fwd'},
    {t:'Backward: the first bucket fills and is all-reduced',p:'Gradients arrive last layer first. The final norm and block 3\'s second MLP matrix fill bucket 0 ('+fmt(ddpB[0][0].in_bytes)+' B); its all-reduce starts while backward continues through the other blocks.',hold:full,gat:[],c:[ddpB[0][1]],ph:'bwd'},
    {t:'Backward: the second bucket',p:'Everything else ('+fmt(ddpB[1][0].in_bytes)+' B) is the second bucket, all-reduced when backward reaches the embeddings. After it, every rank has the same averaged gradient.',hold:full,gat:[],c:[ddpB[1][1]],ph:'bwd'},
    {t:'Optimizer: every rank does the same full update',p:'No communication: each rank applies identical gradients to identical weights, so the copies stay equal. 2 all-reduces of '+MB(ddpB[0][0].in_bytes+ddpB[1][0].in_bytes)+' in total, the size of the gradients.',hold:full,gat:[],c:[],ph:'opt'}];
  const fw=byph(fs,'fwd'),bw=byph(fs,'bwd');
  // FSDP2 backward order on rank 0 (flight recorder): AG b3, AG b2, RS b3, AG b1, RS b2, AG b0, RS b1, RS b0, RS root
  const SF=[
    {t:'Before the step: half of everything on each rank',p:'Every parameter is a DTensor with placement Shard(0): this rank holds '+MB(MF.params)+' of weights and '+MB(MF.opt)+' of AdamW state, '+MB(MF.persistent)+' in all, and no gradient buckets.',hold:half,gat:[],c:[],ph:'idle'},
    {t:'Forward: gather the root\'s weights',p:'The root group (embeddings and final norm, not resharded after forward) is all-gathered once: '+fmt(fw[0][0].in_bytes)+' B in, '+fmt(fw[0][0].out_bytes)+' B out.',hold:half,gat:[0],c:[fw[0][1]],ph:'fwd'}];
  for(let b=0;b<4;b++)SF.push({t:'Forward: block '+b+' gathered, run, freed',p:'All-gather block '+b+' ('+fmt(fw[b+1][0].in_bytes)+' B in, '+fmt(fw[b+1][0].out_bytes)+' B out), run it, then free the gathered copy (reshard after forward), keeping its activations.',hold:half,gat:[0,b+1],c:[fw[b+1][1]],ph:'fwd'});
  const lab=['gather block 3','gather block 2 (prefetch)','reduce block 3\'s gradients','gather block 1','reduce block 2\'s gradients','gather block 0','reduce block 1\'s gradients','reduce block 0\'s gradients','reduce the root\'s gradients'];
  const GAT=[[0,4,3],[0,3,2],[0,2,1],[0,1],[0]];
  const groups=[[0,1],[2,3],[4,5],[6,7],[8]];
  const gtext=['Backward needs block 3 again: re-gather it, and prefetch block 2 so it is ready when needed.','Block 3\'s gradients are reduce-scattered: each rank receives the summed half it owns. Gloo has no reduce-scatter, so it all-reduces the full '+fmt(bw[2][0].in_bytes)+' B and keeps a chunk. Block 1 is gathered.','Block 2\'s gradients reduced; block 0 gathered.','Blocks 1 and 0 reduced.','Last, the root group\'s gradients ('+fmt(bw[8][0].in_bytes)+' B).'];
  groups.forEach((g,k)=>SF.push({t:'Backward: '+g.map(i=>lab[i]).join(', '),p:gtext[k],hold:half,gat:GAT[k],c:g.map(i=>bw[i][1]),ph:'bwd'}));
  SF.push({t:'Optimizer: each rank updates only its half',p:'No communication: AdamW runs on the local shards. '+fs.length+' collectives in the step against DDP\'s 2 all-reduces; weights never exist in full on a rank except while a block is gathered.',hold:half,gat:[],c:[],ph:'opt'});
  let mode='ddp',S=SD;
  const cap=document.getElementById('rd-dst-cap'),cnt=document.getElementById('rd-dst-cnt');
  function rank(r,st,C){return '<div><div class="small"><b>Rank '+r+'</b> <span class="mute">'+(mode==='ddp'?'full replica':'owns half of every parameter')+'</span></div><div class="bars">'+G.map((g,k)=>{
      const own=st.hold[k],gat=st.gat.includes(k);
      return '<div class="row"><div class="nm">'+g+'</div><div class="track">'+(gat?'<div class="fill" style="width:100%;background:var(--acc2)"></div>':'')+'<div class="fill" style="'+(mode==='fsdp'&&r===1?'left:50%;':'')+'width:'+(own*100)+'%;background:'+(mode==='ddp'?'var(--c1)':'var(--c4)')+'"></div></div><div class="val">'+(gat?'gathered':own===1?'full':'half')+'</div></div>'}).join('')+'</div></div>'}
  function draw(i){const st=S[i],C=mode==='ddp'?CD:CF;
    box.innerHTML=rank(0,st,C)+rank(1,st,C);
    const done=S.slice(0,i+1).flatMap(s=>s.c),now=st.c.map(j=>C[j]);
    const bytes=done.reduce((a,j)=>a+C[j].in_bytes,0);
    cap.innerHTML='<div class="t">'+(i+1)+' / '+S.length+'. '+st.t+'</div><p>'+st.p+'</p>'+(now.length?'<p class="small mute">Recorded: '+now.map(c=>'#'+c.seq+' '+c.op+' of '+fmt(c.numel)+' floats').join('; ')+'</p>':'');
    const M=mode==='ddp'?MD:MF;
    cnt.innerHTML=RD.stat('Collectives so far',done.length,'of '+S.flatMap(s=>s.c).length+' this step')+RD.stat('Bytes sent into them',fmt(bytes)+' B','rank 0, input sizes')+RD.stat('Held before activations',MB(M.persistent),'weights, AdamW, buckets')+RD.stat('Peak this step',MB(M.total),'measured')}
  const an=RD.anim({card:'rd-dst-card',ctl:'rd-dst-ctl',n:S.length,draw,ms:2600,label:'Distributed step'});
  RD.seg(document.getElementById('rd-dst-seg'),m=>{mode=m;S=m==='ddp'?SD:SF;an.reset(S.length);an.play()});
  // memory per rank
  const mb=document.getElementById('rd-dst-mem');
  if(mb){const rows=[['DDP, 2 or 4 ranks','ddp_w2'],['FSDP2, 2 ranks','fsdp_w2'],['FSDP2, 4 ranks','fsdp_w4'],['FSDP2, 2 ranks, no reshard','fsdp_w2_nr'],['Bigger model: DDP','ddp_w2_big'],['Bigger model: FSDP2, 2 ranks','fsdp_w2_big'],['Bigger model: FSDP2, 4 ranks','fsdp_w4_big']];
    mb.innerHTML='<div class="small"><b>Peak memory per rank</b></div>'+rows.map(([n,k],j)=>{const m=D.mem[k],mx=j<4?D.mem.ddp_w2.total:D.mem.ddp_w2_big.total;
      return '<div class="row"><div class="nm">'+n+'</div><div class="track"><div class="fill" style="width:'+(100*m.persistent/mx).toFixed(1)+'%;background:var(--c1)"></div><div class="fill" style="left:'+(100*m.persistent/mx).toFixed(1)+'%;width:'+(100*m.peak_delta/mx).toFixed(1)+'%;background:var(--c2)"></div></div><div class="val">'+(m.total/1e6).toFixed(1)+' MB</div></div>'}).join('')+
      '<div class="leg"><span style="--sw:var(--c1)">weights, AdamW state, buckets</span><span style="--sw:var(--c2)">peak of activations and temporaries during the step</span></div>'}
})();
