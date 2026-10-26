// ---- Reading: static figures drawn at the measured width (hero, memory to scale, router cost, expert-parallel layer, serving-layer map) ----
// Numbers from window.DDC (recompute.py, the Capacity planner's model). Nothing here moves by itself.
(function(){
  const C=window.DDC;if(!C)return;
  const $=id=>document.getElementById(id);
  const fmt=(x,d)=>(+x).toLocaleString('en-GB',{maximumFractionDigits:d==null?1:d});
  const T=(x,y,s,o)=>RD.t(x,y,s,Object.assign({fill:'var(--ink)',fs:11.5},o||{}));
  const rect=(x,y,w,h,fill,o)=>'<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+h+'" rx="'+((o&&o.rx)||2)+'" fill="'+fill+'"'+(o&&o.stroke?' stroke="'+o.stroke+'"':'')+(o&&o.op!=null?' opacity="'+o.op+'"':'')+'/>';
  const line=(x1,y1,x2,y2,col,o)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+col+'" stroke-width="'+((o&&o.w)||1.6)+'"'+(o&&o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o&&o.end?' marker-end="url(#'+o.end+')"':'')+(o&&o.start?' marker-start="url(#'+o.start+')"':'')+'/>';
  const mk=id=>'<marker id="'+id+'" viewBox="0 0 8 8" refX="6.5" refY="4" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" fill="var(--acc)"/></marker>';
  const MB=b=>fmt(b/1e6,2)+' MB';

  // 1. hero: five splits, what crosses and over which link
  function hero(){
    const el=$('dd-hero');if(!el)return;
    const W=RD.width(el),narrow=W<600,rowH=narrow?74:64,G=4,bw=narrow?24:48,gap=narrow?10:22,bh=26,px=4;
    const picW=G*bw+(G-1)*gap,tx=px+picW+(narrow?10:22);
    const rows=[
      ['rep','Replicas: more users','each GPU a whole copy','nothing','none: a router in front'],
      ['tp','Tensor parallel: lower latency','each GPU a slice of every layer',MB(C.tp_bytes['8'].per_token_sent)+' per token per GPU','NVLink, inside one server'],
      ['pp','Pipeline parallel: more capacity','each GPU a run of whole layers','16 KiB per stage boundary','any network, across servers'],
      ['ep','Expert parallel: giant MoE models','attention local, experts spread',MB(C.ep.per_token)+' per token (DeepSeek-V3)','RDMA, overlapped with compute'],
      ['pd','Prefill/decode split: no stalls','prefill GPUs, decode GPUs',fmt(C.ex_xfer.mib,0)+' MiB once per request','RDMA or NVLink: '+fmt(C.ex_xfer.ms.nic400,0)+' ms at 50 GB/s']];
    let b='<defs>'+mk('dd-hm')+'</defs>';
    rows.forEach((r,i)=>{
      const y0=6+i*rowH,yb=y0+18;
      b+=T(px,y0+11,r[1],{w:600,fs:12.5});
      for(let g=0;g<G;g++){const x=px+g*(bw+gap);b+=rect(x,yb,bw,bh,'var(--soft)',{stroke:'var(--line)'});
        if(r[0]==='rep')b+=rect(x+3,yb+3,bw-6,bh-6,'var(--c1)',{op:0.55});
        if(r[0]==='tp')for(let l=0;l<4;l++)b+=rect(x+3+g*(bw-6)/4,yb+3+l*5,(bw-6)/4,4,'var(--c1)',{op:0.8,rx:0.5});
        if(r[0]==='pp')b+=rect(x+3,yb+3,bw-6,bh-6,'var(--c3)',{op:0.25+0.18*g});
        if(r[0]==='ep'){b+=rect(x+3,yb+3,bw-6,8,'var(--c1)',{op:0.55});for(let k=0;k<3;k++)b+='<circle cx="'+(x+7+k*(bw-14)/2)+'" cy="'+(yb+18)+'" r="2.6" fill="var(--c4)"/>'}
        if(r[0]==='pd')b+=rect(x+3,yb+3,bw-6,bh-6,g<2?'var(--c2)':'var(--c1)',{op:0.6})}
      const cx=g=>px+g*(bw+gap)+bw/2,yr=yb+bh/2;
      if(r[0]==='tp'){const ya=yb+bh+5;b+=line(cx(0),ya,cx(G-1),ya,'var(--acc)',{w:2,start:'dd-hm',end:'dd-hm'});for(let g=1;g<G-1;g++)b+=line(cx(g),yb+bh,cx(g),ya,'var(--acc)',{w:1.2})}
      if(r[0]==='pp')for(let g=0;g<G-1;g++)b+=line(px+g*(bw+gap)+bw+1,yr,px+(g+1)*(bw+gap)-2,yr,'var(--acc)',{w:2,end:'dd-hm'});
      if(r[0]==='ep'){for(let g=1;g<G;g++)b+='<path d="M'+cx(0)+' '+(yb+bh)+' Q'+((cx(0)+cx(g))/2)+' '+(yb+bh+10+2*g)+' '+cx(g)+' '+(yb+bh+1)+'" fill="none" stroke="var(--acc)" stroke-width="1.6" marker-end="url(#dd-hm)"/>'}
      if(r[0]==='pd')b+=line(px+2*(bw+gap)-gap+1,yr,px+2*(bw+gap)-1,yr,'var(--acc)',{w:3,end:'dd-hm'});
      if(r[0]==='pd'){b+=T(cx(0)-3,yr+4,'P',{fs:11,w:600});b+=T(cx(2)-3,yr+4,'D',{fs:11,w:600})}
      b+=T(tx,yb+10,r[3],{fill:'var(--acc)',w:600,fs:narrow?11:12.5});
      b+=T(tx,yb+25,r[4],{fill:'var(--mute)',fs:11});
      b+=T(tx,yb+(narrow?40:39),r[2],{fill:'var(--mute)',fs:11});
    });
    el.innerHTML=RD.svg(W,6+rows.length*rowH,b,'Five ways to spread serving over GPUs: what crosses between GPUs and over which link');
  }

  // 2. memory per GPU to scale: one H200 against TP 2
  function mem(){
    const el=$('dd-mem');if(!el||!C.mem)return;
    const W=RD.width(el),L=4,R=6,bw=W-L-R,cap=141,sx=v=>bw*v/cap,rowH=96;
    const rows=[['One H200, the whole model (141 GB)',C.mem['1'],'cache for '+fmt(C.mem['1'].seqs,0)+' conversations'],
      ['Tensor parallel 2: each of two H200s',C.mem['2'],'cache for half of each of '+fmt(C.mem['2'].seqs,0)+' conversations']];
    let b='';
    rows.forEach((r,i)=>{const m=r[1],y=6+i*rowH,yb=y+18,h=26;
      b+=T(L,y+12,r[0],{w:600,fs:12.5});
      const seg=[['weights '+fmt(m.w_gb)+' GB',m.w_gb,'var(--c1)'],['reserved',m.act_gb+m.ovh_gb+m.fixed_gb,'var(--dim)'],['KV cache '+fmt(m.pool_gb)+' GB',m.pool_gb-m.fixed_gb,'var(--c2)'],['8% kept free',cap-m.usable_gb,'var(--soft)']];
      let x=L;const out=[];seg.forEach((s,q)=>{const w=sx(s[1]);b+=rect(x,yb,w,h,s[2],{op:s[2]==='var(--soft)'?1:0.75,rx:0,stroke:s[2]==='var(--soft)'?'var(--line)':null});
        const tw=s[0].length*6.4;if(tw<w-6)b+=T(x+4,yb+17,s[0],{fs:11.5,w:600});else if(q===0)out.push(s[0]);x+=w});
      b+=T(L,yb+h+16,r[2],{fill:'var(--c2)',fs:11.5,w:600});
      if(out.length)b+=T(L,yb+h+31,'left bar: '+out.join('; '),{fill:'var(--mute)',fs:11});
    });
    el.innerHTML=RD.svg(W,6+rows.length*rowH-8,b,'GPU memory to scale, one H200 against tensor parallel 2');
  }

  // 3. router cost: Dynamo's formula on three workers, worker A's load on a slider
  function route(){
    const el=$('dd-rt'),sl=$('dd-rt-a');if(!el||!sl)return;
    const P=125,ov={A:112,B:0,C:0},dec={A:+sl.value,B:100,C:200};$('dd-rt-av').textContent=sl.value+' blocks';
    const cost=k=>Math.max(0,P-ov[k])+dec[k]+P,ks=['A','B','C'],best=ks.reduce((a,k)=>cost(k)<cost(a)?k:a,'A');
    const W=RD.width(el),L=118,R=70,mx=560,sx=v=>(W-L-R)*v/mx,rowH=34;let b='';
    ks.forEach((k,i)=>{const y=6+i*rowH,h=20;let x=L;
      b+=T(4,y+14,'Worker '+k+(ov[k]?' (cached)':''),{fs:11.5,w:k===best?700:400});
      [[Math.max(0,P-ov[k]),'var(--c2)'],[dec[k],'var(--c1)'],[P,'var(--dim)']].forEach(s=>{b+=rect(x,y,sx(s[0]),h,s[1],{op:0.8,rx:0});x+=sx(s[0])});
      b+=T(x+5,y+14,fmt(cost(k),0)+(k===best?' chosen':''),{fs:11.5,w:k===best?700:400,fill:k===best?'var(--acc)':'var(--ink)'})});
    let y=6+3*rowH+4,lx=4;
    [['prompt blocks to compute','var(--c2)'],['decode blocks carried','var(--c1)'],['the request’s own blocks','var(--dim)']].forEach(s=>{const tw=s[0].length*6.1+20;if(lx>4&&lx+tw>W){lx=4;y+=16}b+=rect(lx,y,10,10,s[1],{rx:1})+T(lx+14,y+9,s[0],{fs:11,fill:'var(--mute)'});lx+=tw});
    el.innerHTML=RD.svg(W,y+16,b,'Router cost of three workers');
  }

  // 4. one MoE layer under expert parallelism: attention boxes on top, a channel for the all-to-all, experts below
  function ep(){
    const el=$('dd-ep');if(!el)return;
    const W=RD.width(el),G=4,gap=8,cw=(W-8-(G-1)*gap)/G,top=34,H=top+116;let b='<defs>'+mk('dd-em')+'</defs>';
    const cx=g=>4+g*(cw+gap)+cw/2,per=C.ep.E/G,ya=top+44,ye=top+68;
    for(let g=0;g<G;g++){const x=4+g*(cw+gap);
      b+=rect(x,top,cw,112,'var(--soft)',{stroke:'var(--line)',rx:6})+T(x+6,top+14,'GPU '+g,{fs:11.5,w:600});
      b+=rect(x+6,top+20,cw-12,ya-top-20,'var(--c1)',{op:0.35,rx:4})+T(x+10,top+36,cw>110?'attention, own users':'attention',{fs:11});
      b+=rect(x+6,ye,cw-12,38,'var(--c4)',{op:0.25,rx:4})+T(x+10,ye+15,'experts',{fs:11})+T(x+10,ye+30,(g*per)+'–'+((g+1)*per-1),{fs:11,fill:'var(--mute)'});}
    const tx=cx(0);b+='<circle cx="'+tx+'" cy="'+(ya-6)+'" r="4.5" fill="var(--acc)"/>';
    for(let g=1;g<G;g++){
      b+='<path d="M'+tx+' '+ya+' C'+tx+' '+(ya+12+3*g)+' '+(cx(g)-8)+' '+(ya+6)+' '+(cx(g)-8)+' '+(ye-1)+'" fill="none" stroke="var(--acc)" stroke-width="1.8" marker-end="url(#dd-em)"/>';
      b+='<path d="M'+(cx(g)+8)+' '+ye+' C'+(cx(g)+8)+' '+(ya+4)+' '+(tx+8)+' '+(ya+16-3*g)+' '+(tx+8)+' '+(ya+1)+'" fill="none" stroke="var(--acc)" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#dd-em)"/>'}
    b+=T(4,12,'solid: dispatch, '+fmt(C.ep.h,0)+' bytes per expert (FP8)',{fs:11,fill:'var(--acc)'});
    b+=T(4,26,'dashed: combine, '+fmt(2*C.ep.h,0)+' bytes back (BF16)',{fs:11,fill:'var(--acc)'});
    el.innerHTML=RD.svg(W,H,b,'One token dispatched to experts on other GPUs and combined back');
  }

  // 5. serving-layer map
  function stack(){
    const el=$('dd-stack');if(!el)return;
    const cols=['Dynamo','llm-d','KServe','Ray Serve','Triton','TRT-LLM'];
    const rows=[['Runs the model (engine)','RRRRRF'],['HTTP front end','F...FF'],['Routes across engines','FFRF.F'],['Prefill/decode split','FFRFRF'],['Moves the KV cache','FRRR.F'],['Resizes the pools','FFR...'],['KV tiers beyond GPU','FF....'],['Non-LLM models','..F.F.']];
    const W=RD.width(el),narrow=W<560,lab=narrow?124:190,cw=(W-lab-4)/cols.length,hd=narrow?40:24,rh=24;let b='';
    cols.forEach((c,j)=>{const x=lab+j*cw+cw/2;b+=T(j===cols.length-1&&narrow?W-2:x,narrow?(j%2?34:16):16,c,{a:j===cols.length-1&&narrow?'end':'middle',fs:11,w:600})});
    rows.forEach((r,i)=>{const y=hd+i*rh;if(i%2===0)b+=rect(0,y,W,rh,'var(--soft)',{rx:0});b+=T(4,y+16,narrow?r[0].replace(' (engine)',''):r[0],{fs:11});
      [...r[1]].forEach((m,j)=>{const x=lab+j*cw+cw/2;if(m==='F')b+='<circle cx="'+x+'" cy="'+(y+12)+'" r="6" fill="var(--acc)"/>';else if(m==='R')b+='<circle cx="'+x+'" cy="'+(y+12)+'" r="5.2" fill="none" stroke="var(--acc)" stroke-width="1.8"/>'})});
    el.innerHTML=RD.svg(W,hd+rows.length*rh+4,b,'Which serving-layer project does which job');
  }

  function all(){hero();mem();route();ep();stack()}
  const sl=$('dd-rt-a');if(sl)sl.addEventListener('input',route);
  RD.onRender(all);RD.onResize(all);all();
})();
