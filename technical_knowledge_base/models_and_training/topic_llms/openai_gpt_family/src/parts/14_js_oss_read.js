// ---- gpt-oss in Reading: attention sinks, and one token through an MoE block against a dense one ----
(function(){ // attention sinks
  const Z={flat:[-1.0,-0.6,-1.2,-0.8,-0.9],one:[3.0,-0.6,-1.2,-0.8,-0.9]},names=['the','cat','sat','on','mat'];let p='flat',v=20;
  function draw(){
    const off=v<0,b=(v-20)/4,z=Z[p],ez=z.map(Math.exp),sink=off?0:Math.exp(b),den=sink+ez.reduce((a,c)=>a+c,0);
    $('skBv').textContent=off?'off (no sink)':b.toFixed(2);
    const rows=[['no token (sink)',sink/den,'var(--dim)']].concat(z.map((s,i)=>['"'+names[i]+'", score '+s.toFixed(1),ez[i]/den,'var(--acc)']));
    $('skBars').innerHTML=rows.map(([n,a,c])=>'<div class="row"><span class="nm">'+n+'</span><span class="track"><span class="fill" style="width:'+(100*a)+'%;background:'+c+'"></span></span><span class="val">'+(100*a).toFixed(1)+'%</span></div>').join('')+
      '<p class="small" style="margin:6px 0 0">Weight spread over real tokens: <b>'+(100*(1-sink/den)).toFixed(1)+'%</b>'+(off?'. Without a sink it is always 100%, whatever the scores.':'.')+'</p>';
  }
  $('skB').addEventListener('input',e=>{v=+e.target.value;draw()});segBind('skP',m=>{p=m;draw()});onTab('t-read',draw);
})();
(function(){ // MoE token animation, gpt-oss-120b against a dense block of the same size
  const EXP=2880*5760+5760+2880*2880+2880,K=4,NE=128,LAY=36,MOEB=K*EXP*4.25/8,DENB=NE*EXP*2;
  const rnd=mulberry32(11),SC=Array.from({length:NE},()=>{let u=0;for(let i=0;i<4;i++)u+=rnd();return (u-2)*1.6});
  const TOP=SC.map((s,i)=>[s,i]).sort((a,b)=>b[0]-a[0]).slice(0,K).map(x=>x[1]);
  const ex=TOP.map(i=>Math.exp(SC[i])),es=ex.reduce((a,c)=>a+c,0),WT=ex.map(x=>x/es);
  const cH='var(--acc)',cE='var(--c4)',cS='var(--good)',cD='var(--bad)';
  const Lw={W:660,H:346,ht:[14,46],rt:[66,52,84,40],eg:[176,46],mx:[176,214],sg:[460,52,120,44],bars:[14,286]};
  const Ln={W:360,H:566,ht:[10,46],rt:[60,52,84,40],eg:[10,128],mx:[10,296],sg:[190,52,150,44],bars:[10,500]};
  function base(L,k,e,dense){
    let s=tx(L.ht[0],L.ht[1]-10,'hₜ · 2,880',{fs:12});
    s+=grp(1,sq(L.ht[0],L.ht[1],5,k===0?Math.round(45*e):45,cH,.75));
    s+=tx(L.eg[0],L.eg[1]-10,dense?'one dense block: 128 slices of 24.9M, all used':'128 experts, one square = 24.9M parameters',{fs:11,c:'var(--mute)'});
    return s}
  function eg(L,fill){let s='';for(let i=0;i<NE;i++){const x=L.eg[0]+(i%16)*15,y=L.eg[1]+Math.floor(i/16)*15,f=fill(i);s+='<rect x="'+x+'" y="'+y+'" width="13" height="13" rx="2" fill="'+f[0]+'" fill-opacity="'+f[1]+'"'+(f[2]?' stroke="'+f[2]+'" stroke-width="2"':'')+'/>'}return s}
  const ctr=i=>[0,0];
  function bars(L,W,k,e,dense,stepP,stepB){
    const b=L.bars,x0=b[0]+150,wB=W-x0-70;let s=tx(b[0],b[1]-6,'This layer, to scale',{fs:11,c:'var(--mute)'});
    const row=(y,n,val,full,txt,col,op)=>grp(op,tx(b[0],y+9,n,{fs:10.5})+'<rect x="'+x0+'" y="'+y+'" width="'+wB+'" height="9" rx="2" fill="var(--soft)"/><rect x="'+x0+'" y="'+y+'" width="'+Math.max(val?1.5:0,wB*val/full).toFixed(1)+'" height="9" rx="2" fill="'+col+'"/>'+tx(x0+Math.max(4,wB*val/full)+5,y+8,txt,{fs:10}));
    const pD=dense?(k>=stepP?NE*EXP*(k===stepP?e:1):0):NE*EXP,pM=dense?K*EXP:(k>=stepP?K*EXP*(k===stepP?e:1):0);
    const bD=dense?(k>=stepB?DENB*(k===stepB?e:1):0):DENB,bM=dense?MOEB:(k>=stepB?MOEB*(k===stepB?e:1):0);
    s+=row(b[1],'params, dense',pD,NE*EXP,fmt(pD/1e9,2)+'B',cD,dense?1:.3);
    s+=row(b[1]+13,'params, MoE',pM,NE*EXP,fmt(pM/1e6,1)+'M',cS,dense?.3:1);
    s+=row(b[1]+30,'bytes, dense BF16',bD,DENB,fmtB(bD),cD,dense?1:.3);
    s+=row(b[1]+43,'bytes, MoE MXFP4',bM,DENB,fmtB(bM),cS,dense?.3:1);
    return s}
  const fmtB=v=>v>=1e9?(v/1e9).toFixed(2)+' GB':(v/1e6).toFixed(1)+' MB';
  function drawMoE(k,e,ph,nar){
    const L=nar?Ln:Lw;let s=base(L,k,e,false);
    s+=grp(k>=1?1:.25,bx(L.rt[0],L.rt[1],L.rt[2],L.rt[3],'boxa',['router','2,880 × 128'],11));
    if(k===1&&!RMOT)s+=pk([[L.ht[0]+36,L.ht[1]+30],[L.rt[0]+L.rt[2]/2,L.rt[1]+L.rt[3]/2],[L.eg[0]+120,L.eg[1]+60]],e,cH);
    const mn=Math.min(...SC),mxS=Math.max(...SC);
    s+=eg(L,i=>{const sc=(SC[i]-mn)/(mxS-mn),top=TOP.includes(i);
      if(k===0)return ['var(--dim)',.5];
      if(k===1)return [cE,.12+.8*sc*e];
      if(k===2)return top?[cE,1,'var(--ink)']:[cE,lerp(.12+.8*sc,.08,e)];
      return top?[cE,1,'var(--ink)']:['var(--dim)',.25]});
    if(k>=2){const op=k===2?e:1;let w='';TOP.forEach((i,j)=>{const x=L.eg[0]+(i%16)*15+6,y=L.eg[1]+Math.floor(i/16)*15;w+=tx(x+0.5,y+10,String(j+1),{fs:9.5,a:'middle',w:700,c:'var(--bg)'})});
      w+=tx(L.eg[0],L.eg[1]+136,'top 4 kept (numbered); softmax over them: '+WT.map(x=>x.toFixed(2)).join(', '),{fs:10.5});s+=grp(op,w)}
    if(k>=3){const op=k===3?e:1,x=L.mx[0],y=L.mx[1];let m=tx(x,y-8,'one MXFP4 block: 32 × 4-bit values + one 8-bit scale',{fs:10.5,c:'var(--mute)'});
      for(let i=0;i<32;i++)m+='<rect x="'+(x+i*7)+'" y="'+y+'" width="6" height="12" rx="1" fill="'+cE+'" fill-opacity="'+(.35+.6*((i*37)%11)/10).toFixed(2)+'"/>';
      m+='<rect x="'+(x+32*7+4)+'" y="'+y+'" width="24" height="12" rx="1" fill="var(--c5)"/>'+tx(x+32*7+16,y+24,'scale',{fs:9.5,a:'middle'});
      m+=tx(x,y+26,'(32 × 4 + 8) / 32 = 4.25 bits per parameter',{fs:10.5});s+=grp(op,m);
      if(k===3&&!RMOT)TOP.forEach(i=>{s+=pk([[L.eg[0]+(i%16)*15+6,L.eg[1]+Math.floor(i/16)*15+6],[L.mx[0]+112,L.mx[1]]],e,cE)})}
    if(k>=4){const op=k===4?e:1,g=L.sg;s+=grp(op,bx(g[0],g[1],g[2],g[3],'boxc',['Σ wᵢ · expertᵢ(hₜ)','+ residual'],11));
      if(k===4&&!RMOT)TOP.forEach(i=>{s+=pk([[L.eg[0]+(i%16)*15+6,L.eg[1]+Math.floor(i/16)*15+6],[g[0]+g[2]/2,g[1]+g[3]]],e,cS)})}
    if(k===5)s+=grp(e,tx(nar?10:460,nar?350:120,'× 36 layers',{fs:13,w:600})+tx(nar?10:460,nar?366:136,'5.13B of 116.83B active',{fs:11,c:cS}));
    s+=bars(L,L.W,k,e,false,2,3);
    return {W:L.W,H:L.H,s,label:'One token through a gpt-oss-120b MoE block'}}
  function drawDense(k,e,ph,nar){
    const L=nar?Ln:Lw;let s=base(L,k,e,true);
    s+=grp(.5,'<rect x="'+L.rt[0]+'" y="'+L.rt[1]+'" width="'+L.rt[2]+'" height="'+L.rt[3]+'" rx="6" class="boxo"/>'+tx(L.rt[0]+L.rt[2]/2,L.rt[1]+24,'no router',{fs:11,a:'middle',c:'var(--mute)'}));
    if(k===1&&!RMOT)s+=pk([[L.ht[0]+36,L.ht[1]+30],[L.eg[0]+120,L.eg[1]+60]],e,cH);
    s+=eg(L,i=>k===0?['var(--dim)',.5]:k===1?[cD,lerp(.2,.85,e)]:[cD,.85]);
    if(k>=2){const op=k===2?e:1;s+=grp(op,tx(L.eg[0],L.eg[1]+136,'every weight read for every token, 2 bytes each (BF16)',{fs:10.5}))}
    if(k>=3){const op=k===3?e:1,g=L.sg;s+=grp(op,bx(g[0],g[1],g[2],g[3],'box',['2 × 3.19B FLOPs','6.4 GFLOP'],11))}
    if(k===4)s+=grp(e,tx(nar?10:460,nar?350:120,'× 36 layers',{fs:13,w:600})+tx(nar?10:460,nar?366:136,'114.7B FFN params per token',{fs:11,c:cD}));
    s+=bars(L,L.W,k,e,true,1,2);
    return {W:L.W,H:L.H,s,label:'The same token through a dense block'}}
  const st1=[['A token reaches the MoE block','After attention and RMSNorm, token <i>t</i>\'s hidden state is 2,880 numbers (45 squares of 64). Each of gpt-oss-120b\'s 36 layers holds 128 experts here; each large square on the right is one expert of 24.9M parameters, about 3.19B for the layer.'],
    ['The router scores every expert','One linear projection, 2,880 × 128 (0.37M parameters), gives a score per expert. It is the only part of the block that looks at all 128.'],
    ['Keep the top 4, softmax over them','Only the four highest scores survive, and a softmax over just those four gives the weights that will mix their outputs. The other 124 experts are not read at all for this token.'],
    ['Read four experts, stored in MXFP4','Each chosen expert\'s 24.9M weights are stored in blocks of 32 four-bit values sharing one 8-bit scale, 4.25 bits a parameter, about 13.2 MB an expert. Four of them: 52.9 MB read for this layer, against 6.37 GB if the whole layer were dense BF16.'],
    ['Run the four, mix, add back','Each expert runs its gated SwiGLU (2,880 to 2 × 2,880 and back, clamped, with a residual); the outputs are weighted by w and summed into the residual stream. About 2 × 99.6M = 0.2 GFLOP for this layer\'s experts.'],
    ['Thirty-six layers later','Per token the experts contribute 36 × 4 × 24.9M = 3.58B parameters; with attention (0.96B) and the unembedding (0.58B) that is <b>5.13B active of 116.83B</b> (4.4%), the model card\'s figure, rebuilt here from config.json.']];
  const st2=[['A token reaches a dense block','The same token, the same 2,880 numbers. Suppose the same 114.7B feed-forward parameters formed one dense block per layer, as in GPT-3: 3.19B parameters in this layer.'],
    ['No router: everything runs','A dense block makes no choice: all 128 expert-sized slices are used for every token.'],
    ['Read all of it, in BF16','At 2 bytes a parameter this layer\'s weights are 6.37 GB, about 120 times the MoE\'s 52.9 MB (32 times from using 4 of 128 experts, 3.8 times from 4.25 bits instead of 16).'],
    ['Compute','2 × 3.19B ≈ 6.4 GFLOP for this layer, 32 times the MoE\'s experts.'],
    ['Thirty-six layers later','Per token: 114.7B feed-forward parameters. The weights alone, 233.7 GB in BF16, need three 80 GB cards before any KV cache: what sparsity and MXFP4 together removed.']];
  const c1=(k,e)=>stat('Experts read, this layer',k<2?'0 of 128':'4 of 128',k<2?'':'124 skipped')+stat('Weights read, this layer',k<3?'0':fmtB(MOEB*(k===3?e:1)),'MXFP4, 4.25 bits')+stat('Active per token, 36 layers',k<5?'…':'5.13B','of 116.83B (4.4%)');
  const c2=(k,e)=>stat('Slices used, this layer',k<1?'0 of 128':'128 of 128','no routing')+stat('Weights read, this layer',k<2?'0':fmtB(DENB*(k===2?e:1)),'BF16, 16 bits')+stat('FFN parameters per token',k<4?'…':'114.7B','all 36 layers');
  makeAnim({id:'moex',aria:'Block type',dur:3400,foot:'Expert size and counts from {{config.json|@cfg120}}; the parameter table being reproduced is the {{model card|@oss}}\'s Table 1. Router scores are <span class="ill">illustrative</span> (random); everything else is computed.',
    modes:[{label:'gpt-oss-120b MoE, MXFP4',steps:st1,draw:drawMoE,cnt:c1},{label:'Dense, same size, BF16',steps:st2,draw:drawDense,cnt:c2}]});
})();
