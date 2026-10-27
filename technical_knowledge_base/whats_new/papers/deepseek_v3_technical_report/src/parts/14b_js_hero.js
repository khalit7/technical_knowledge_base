// ---- Hero: the seven co-designed pieces, each with the number the paper gives for it, and the bill they add up to; static, nothing moves ----
// ---- and the all-to-all route of one token (IB once per node, then NVLink), static, in Infrastructure ----
(function(){
const host=$('heroSvg');
if(host){
  const M=[['DeepSeekMoE','1 shared + 8 of 256 routed','37B of 671B active','s-arch'],
           ['Aux-loss-free balancing','a bias bᵢ only picks the top 8','no tokens dropped','s-bal'],
           ['MLA','K and V from a 512-d latent','576 numbers cached, not 32,768','s-arch'],
           ['Multi-token prediction','1 extra block predicts t + 2','1.8× decoding as a draft','s-mtp']];
  const S=[['FP8 training','1×128 tiles, 128×128 blocks','loss within 0.25% of BF16','s-fp8'],
           ['DualPipe','hides all-to-all behind compute','16-way PP, no TP','s-infra'],
           ['All-to-all kernels','IB once per node, then NVLink','20 of 132 SMs','s-infra']];
  function box(x,y,w,h,b,c){return rc(x,y,w,h,'var(--bg)',{s:c,sw:1.6,r:6})+rc(x,y,5,h,c,{r:2})
    +tx(x+13,y+18,b[0],{fs:12.5,w:600})+tx(x+13,y+35,b[1],{fs:11,c:'var(--mute)'})+tx(x+13,y+52,b[2],{fs:12,w:600,c})}
  function row(items,y,W,cols,c){const g=10,bw=(W-2-(cols-1)*g)/cols,bh=62;let s='',r=0;
    items.forEach((b,i)=>{const cx=i%cols,ry=Math.floor(i/cols);r=ry;s+=box(1+cx*(bw+g),y+ry*(bh+g),bw,bh,b,c)});
    return {s,h:(r+1)*(bh+g)-g}}
  function draw(W){const cols=W>=780?4:W>=500?2:1,c3=W>=780?3:cols;let s='',y=14;
    s+=tx(1,y,'Do less arithmetic per token: the model',{fs:12.5,w:600,c:'var(--c1)'});y+=10;
    let r=row(M,y,W,cols,'var(--c1)');s+=r.s;y+=r.h+24;
    s+=tx(1,y,'Keep 2,048 H800s busy: the system',{fs:12.5,w:600,c:'var(--c2)'});y+=10;
    r=row(S,y,W,c3,'var(--c2)');s+=r.s;y+=r.h+16;
    s+=rc(1,y,W-2,W>=520?40:58,'var(--soft)',{r:6});
    if(W>=520){s+=tx(13,y+17,'= 2.788M H800 GPU hours, $5.576M at an assumed $2 an hour',{fs:12.5,w:600})+tx(13,y+33,'Llama 3.1 405B took 11.1× the hours for 11.5× the work (active parameters × tokens)',{fs:11,c:'var(--mute)'});y+=40}
    else{s+=tx(13,y+17,'= 2.788M H800 GPU hours',{fs:12.5,w:600})+tx(13,y+33,'$5.576M at an assumed $2 an hour',{fs:11,c:'var(--mute)'})+tx(13,y+49,'Llama 3.1 405B: 11.1× hours, 11.5× work',{fs:11,c:'var(--mute)'});y+=58}
    host.innerHTML=svgW(W,y+2,s,'DeepSeek-V3 in one picture: four model choices that cut arithmetic per token (DeepSeekMoE with 37B of 671B active, auxiliary-loss-free balancing, MLA with 576 cached numbers, multi-token prediction) and three system choices that keep the cluster busy (FP8 with fine-grained scales, DualPipe, all-to-all kernels), adding up to 2.788M H800 GPU hours')}
  fit(host,draw)}

const a2a=$('a2aSvg');
if(a2a){
  // illustrative assignment: the token sits on GPU 3 of node A; its 8 routed experts are spread over the 4 nodes it may reach, 2 per node
  const N=[['Node A (the token’s own)',[5,6]],['Node B',[0,6]],['Node C',[1,4]],['Node D',[2,7]]],SRC=3;
  function draw(W){const narrow=W<620,lane=narrow?30:0,nw=narrow?W-lane-2:(W-3*12-2)/4,ch=26,rg=16,nh=24+2*ch+rg+8,top=narrow?40:78,vg=narrow?16:0;
    let s='<defs><marker id="a2aIB" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--c2)"/></marker>'
      +'<marker id="a2aNV" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--c1)"/></marker></defs>';
    const gpu=[],nv=[];
    N.forEach((n,i)=>{const x=narrow?1:1+i*(nw+12),y=narrow?top+i*(nh+vg):top;
      s+=rc(x,y,nw,nh,'var(--soft)',{s:'var(--line)',r:6})+tx(x+8,y+15,n[0],{fs:11.5,w:600});
      const cw=(nw-16-3*6)/4,g=[];
      for(let k=0;k<8;k++){const gx=x+8+(k%4)*(cw+6),gy=y+24+Math.floor(k/4)*(ch+rg);g.push({cx:gx+cw/2,cy:gy+ch/2,x:gx,y:gy,w:cw,h:ch,row:Math.floor(k/4)})}
      gpu.push(g);
      // NVLink: down from the receiving GPU into the gap between the rows, along it, into each expert
      const a=g[SRC],bus=y+24+ch+rg/2;
      n[1].forEach(k=>{const b=g[k];nv.push('<path d="M'+a.cx+' '+(a.y+a.h)+' V'+bus+' H'+b.cx+' V'+(b.row?b.y:b.y+b.h)+'" fill="none" stroke="var(--c1)" stroke-width="1.6" stroke-linejoin="round" marker-end="url(#a2aNV)"/>')});
      for(let k=0;k<8;k++){const c=g[k],ex=n[1].includes(k),src=k===SRC;
        s+=rc(c.x,c.y,c.w,c.h,ex?'var(--acc)':'var(--bg)',{s:src?'var(--c2)':'var(--line)',sw:src?2:1,r:3,op:ex?.9:1});
        s+=tx(c.cx,c.y+17,ex?'expert':src&&i===0?'token':(c.w<48?'':'GPU ')+k,{fs:11,a:'middle',c:ex?'var(--bg)':src?'var(--c2)':'var(--mute)',w:src||ex?600:null})}});
    s+=nv.join('');
    // IB: one transfer per remote node, to the GPU with the same in-node index
    const A=gpu[0][SRC];
    for(let i=1;i<4;i++){const d=gpu[i][SRC];let p;
      if(!narrow){const lift=26+i*14;p='M'+A.cx+' '+A.y+' C'+A.cx+' '+(A.y-lift)+' '+d.cx+' '+(d.y-lift)+' '+d.cx+' '+(d.y-1)}
      else{const lx=W-lane+6+(i-1)*9;p='M'+(A.x+A.w)+' '+A.cy+' H'+lx+' V'+d.cy+' H'+(d.x+d.w+1)}
      s+='<path d="'+p+'" fill="none" stroke="var(--c2)" stroke-width="2" stroke-linejoin="round" marker-end="url(#a2aIB)"/>'}
    const H=narrow?top+4*nh+3*vg+24:top+nh+24;
    s+=ln2(1,12,21,12,'var(--c2)',{sw:2})+tx(27,16,'InfiniBand, 50 GB/s: once per remote node',{fs:11});
    s+=ln2(1,30,21,30,'var(--c1)',{sw:1.6})+tx(27,34,'NVLink, 160 GB/s: fan out to the experts',{fs:11});
    s+=tx(narrow?1:W-2,H-6,'3 IB sends for 6 off-node experts; 8 experts in all',{fs:11,a:narrow?null:'end',c:'var(--mute)'});
    a2a.innerHTML=svgW(W,H,s,'One token routed to 8 experts on 4 nodes: it crosses InfiniBand once to each of the 3 remote nodes, landing on the GPU with its own in-node index, and NVLink carries it on to the expert GPUs inside each node')}
  fit(a2a,draw)}
})();
