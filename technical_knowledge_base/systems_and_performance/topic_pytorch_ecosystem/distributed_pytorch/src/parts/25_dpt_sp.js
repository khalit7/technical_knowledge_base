// ---- Reading section 6: one block's forward under TP and under TP + sequence parallel, the same input, 2 ranks ----
(function(){
  const D=window.DPT,U=window.DU,$=U.$;
  const tp=D.tp.tp1,sp=D.tp.tpsp;
  const sh=(b,k)=>'('+b[k].local.join(', ')+')';
  const b=x=>x.bounds;
  const FULL=[1,1,1,1,1,1,1,1],H0=[1,1,1,1,0,0,0,0],H1=[0,0,0,0,1,1,1,1];
  const st=(a,c)=>a.map(v=>v?c:'');
  const full=c=>[st(FULL,c),st(FULL,c)],half=c=>[st(H0,c),st(H1,c)],gath=()=>[H0.map(v=>v?'h':'g'),H1.map(v=>v?'h':'g')];
  // steps: [chip label, is_comm, lanes, caption title, caption text, comm counted]
  const S={
    tp:[
      ['input',0,full('h'),'Block input','Both ranks hold the whole activation, 8 sequences &times; 64 tokens &times; 256 (recorded <code>ln1</code> input, local shape '+sh(b(tp)[0],'in')+', a '+b(tp)[0].in.placement+'). The same numbers sit in two memories.',0],
      ['ln1',0,full('h'),'LayerNorm, duplicated','Both ranks normalise all 64 tokens: the same work done twice, and the same activation saved twice for backward.',0],
      ['q, k, v (Colwise)',0,full('h'),'Attention, split by heads','Each rank computes its 2 of the 4 heads for all 64 tokens (q, k, v weights local '+JSON.stringify(tp.params.find(p=>p.name==='attn.q.weight').local)+' of [256, 256]).',0],
      ['proj (Rowwise)',0,full('p'),'Output projection: a Partial sum','Each rank multiplies its heads by its rows of <code>proj</code>: a full-shape (8, 64, 256) result that is only part of the sum.',0],
      ['all-reduce',1,full('h'),'All-reduce','One all-reduce of 524,288 bytes adds the two partial sums; both ranks again hold the whole activation.',1],
      ['residual, ln2',0,full('h'),'Residual and LayerNorm, duplicated again','Add to the residual stream and normalise, on both ranks, for all tokens.',0],
      ['fc + GELU (Colwise)',0,full('h'),'MLP up-projection, split by hidden units','Each rank computes 512 of the 1,024 hidden units for every token; GELU works on its half alone.',0],
      ['proj (Rowwise)',0,full('p'),'MLP down-projection: a Partial sum','Again a full-shape partial result on each rank.',0],
      ['all-reduce',1,full('h'),'All-reduce','The second all-reduce of the block. Per training step of the whole model: 16 all-reduces (8 in forward, 8 in backward), recorded.',1]],
    sp:[
      ['input',0,half('h'),'Block input, split along the sequence','Rank 0 holds tokens 0 to 31, rank 1 tokens 32 to 63 (recorded <code>ln1</code> input: '+b(sp)[0].in.placement+', local shape '+sh(b(sp)[0],'in')+'). Half the memory.',0],
      ['ln1',0,half('h'),'LayerNorm on half the tokens','LayerNorm works token by token, so each rank normalises only its own 32 tokens: half the work, half the saved activation.',0],
      ['all-gather',1,gath(),'All-gather','Attention needs every token: one all-gather (262,144 bytes in per rank) rebuilds the full (8, 64, 256) input on both ranks (recorded attention input: '+b(sp)[1].in.placement+', '+sh(b(sp)[1],'in')+').',1],
      ['q, k, v (Colwise)',0,full('h'),'Attention, split by heads','As under TP: 2 of 4 heads per rank, all tokens.',0],
      ['proj (Rowwise)',0,full('p'),'Output projection: a Partial sum','A full-shape partial result on each rank, as before.',0],
      ['reduce-scatter',1,half('h'),'Reduce-scatter instead of all-reduce','Sum the partials and keep only your half of the tokens (recorded attention output: '+b(sp)[1].out.placement+', '+sh(b(sp)[1],'out')+'). Gloo runs it as an all-reduce of the full tensor; NCCL moves half the bytes.',1],
      ['residual, ln2',0,half('h'),'Residual and LayerNorm on half the tokens','No duplication: each rank updates its own 32 tokens of the residual stream.',0],
      ['all-gather',1,gath(),'All-gather','Rebuild the full sequence for the MLP.',1],
      ['fc + GELU (Colwise)',0,full('h'),'MLP up-projection','512 of 1,024 hidden units per rank, all tokens.',0],
      ['proj (Rowwise)',0,full('p'),'MLP down-projection: a Partial sum','A full-shape partial result.',0],
      ['reduce-scatter',1,half('h'),'Reduce-scatter','Back to half the tokens per rank. Per training step of the whole model: 18 all-gathers and 16 reduce-scatters (recorded), against TP\'s 16 all-reduces.',1]]};
  let mode='tp';
  const A=RD.anim({card:'dpt-sp-card',ctl:'dpt-sp-ctl',n:S.tp.length,ms:1700,label:'Step of the block',draw(i){
    const s=S[mode];i=Math.min(i,s.length-1);const cur=s[i];
    $('dpt-sp-flow').innerHTML=s.map((x,k)=>'<span class="'+(x[1]?'cm ':'')+(k===i?'on':k<i?'done':'')+'">'+x[0]+'</span>').join('');
    $('dpt-sp-lanes').innerHTML=[0,1].map(r=>'<div class="dpt-lane"><b>rank '+r+'</b><div class="dpt-tiles">'+cur[2][r].map(c=>'<span class="'+c+'" style="flex:1"></span>').join('')+'</div></div>').join('');
    $('dpt-sp-cap').innerHTML='<div class="t">'+(i+1)+'. '+cur[3]+'</div><p>'+cur[4]+'</p>';
    const comm=s.slice(0,i+1).filter(x=>x[5]).length,held=cur[2][0].filter(c=>c).length;
    const rec=mode==='tp'?tp:sp;
    $('dpt-sp-cnt').innerHTML=RD.stat('Collectives so far in this block',comm,'forward of one block')+
      RD.stat('Tokens rank 0 holds now',held*8+' of 64',cur[2][0].includes('p')?'as a Partial sum':'')+
      RD.stat('Per training step (recorded)',mode==='tp'?'16 all-reduces':'18 all-gathers + 16 reduce-scatters','4 blocks, forward and backward')+
      RD.stat('Saved activations per rank (recorded)',U.mb(rec.saved),'one process: '+U.mb(rec.saved_one));
  }});
  U.seg($('dpt-sp-seg'),m=>{mode=m;A.reset(S[m].length)});
})();
