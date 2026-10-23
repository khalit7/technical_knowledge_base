// ---- Reading figures added 2026-10-23: hero, c10d, DDP buckets (stepper), FSDP2 step, DTensor placements, DCP files,
// composed shards, flight-recorder mismatch. Every number is read from window.DPT (recorded data); nothing autoplays. ----
(function(){
  const D=window.DPT,U=window.DU,$=U.$,T=RD.t,comma=U.comma;
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+Math.max(0,h)+'" rx="'+(o.rx==null?3:o.rx)+'"'+
    (o.cls?' class="'+o.cls+'"':'')+(o.fill?' fill="'+o.fill+'"':'')+(o.stroke?' stroke="'+o.stroke+'"':'')+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+(o.sw?' stroke-width="'+o.sw+'"':'')+'/>'};
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.c||'var(--mute)')+'" stroke-width="'+(o.w||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.arrow?' marker-end="url(#dpt-ar)"':'')+'/>'};
  const defs='<defs><marker id="dpt-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="var(--mute)"/></marker></defs>';
  const MB=b=>(b/1e6).toFixed(2)+' MB';

  // ---- hero: what each rank holds under each API ----
  function hero(){
    const el=$('dpt-hero');if(!el)return;const w=U.W(el),narrow=w<560;
    const rows=[['DDP',4,'var(--c1)'],['FSDP2',4,'var(--c3)'],['TP',2,'var(--c4)'],['PP',2,'var(--c5)']];
    const L=narrow?0:78,gap=6,cellW=(w-L-3*gap)/4,bh=8,bg=3,ch=6*(bh+bg)+18,rowH=ch+(narrow?18:8);
    let s='',y=2;
    rows.forEach(([api,n,col])=>{
      if(narrow){s+=T(0,y+12,api,{w:600});y+=16}else s+=T(0,y+ch/2+4,api,{w:600});
      const cw=n===4?cellW:2*cellW+gap;
      for(let r=0;r<n;r++){const x0=L+r*(cw+gap);s+=rect(x0,y,cw,ch,{cls:'bx'})+T(x0+4,y+12,'rank '+r,{fs:11,fill:'var(--mute)'});
        const bx=x0+6,bw=cw-12;
        for(let b=0;b<6;b++){const by=y+16+b*(bh+bg),thin=(b===0||b===5);const hh=thin?bh-3:bh,yy=by+(thin?1.5:0);
          let a=0,z=0;      // filled fraction [a,z] of the bar's width
          if(api==='DDP'){a=0;z=1}
          else if(api==='FSDP2'){a=r/4;z=(r+1)/4}
          else if(api==='TP'){if(thin){a=0;z=1}else{a=r/2;z=(r+1)/2}}
          else {const mine=r===0?(b<=2):(b>=3);a=0;z=mine?1:0}
          s+=rect(bx,yy,bw,hh,{fill:'none',stroke:'var(--line)',dash:api==='FSDP2'?'3 2':null,rx:1.5});
          if(z>a)s+=rect(bx+bw*a,yy,bw*(z-a),hh,{fill:col,rx:1.5});
        }
      }
      y+=rowH;
    });
    // bar key, once, at the right of the last row's last cell is too tight on phones: put it below
    s+=T(L,y+4,'bars, top to bottom: embeddings, blocks 0 to 3, output layer',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,y+10,s,'What each rank holds under DDP, FSDP2, tensor parallel and pipelining');
  }

  // ---- c10d: launch, store, mesh groups ----
  function c10d(){
    const el=$('dpt-c10d');if(!el)return;const w=U.W(el),two=w>=620,pw=two?(w-16)/2:w,ph=200;
    const env=D.c10d.env,mesh=D.c10d.mesh[1].mesh;
    // panel A
    let a='';const bw=Math.min(96,(pw-24)/4),gx=(pw-4*bw)/5;
    a+=rect(pw/2-80,4,160,30,{cls:'bxa'})+T(pw/2,18,'torchrun agent',{a:'middle',w:600})+T(pw/2,30,'--nproc_per_node 4',{a:'middle',fs:11,fill:'var(--mute)'});
    for(let r=0;r<4;r++){const x=gx+r*(bw+gx);a+=line(pw/2,34,x+bw/2,70,{arrow:1})+rect(x,72,bw,50,{cls:'bx'})+T(x+bw/2,88,'rank '+r,{a:'middle',w:600})+T(x+bw/2,102,'RANK='+r,{a:'middle',fs:11,fill:'var(--mute)'})+T(x+bw/2,115,bw>=92?'WORLD_SIZE='+env.WORLD_SIZE:'of '+env.WORLD_SIZE,{a:'middle',fs:11,fill:'var(--mute)'});
      a+=line(x+bw/2,122,pw/2,158,{c:'var(--acc)',dash:'3 2'})}
    a+=rect(pw/2-92,158,184,34,{cls:'bxa'})+T(pw/2,172,'TCPStore',{a:'middle',w:600})+T(pw/2,186,'MASTER_ADDR:'+env.MASTER_PORT,{a:'middle',fs:11,fill:'var(--mute)'});
    a+=T(4,62,'spawn, env',{fs:11,fill:'var(--mute)'})+T(4,146,'rendezvous',{fs:11,fill:'var(--acc)'});
    // panel B
    let b='';const cs=Math.min(64,(pw-120)/2),ox=(pw-2*cs-16)/2,oy=44;
    b+=T(pw/2,16,'init_device_mesh("cpu", (2, 2))',{a:'middle',fs:11,w:600})+T(pw/2,30,'mesh_dim_names=("dp", "tp")',{a:'middle',fs:11,fill:'var(--mute)'});
    for(let i=0;i<2;i++){b+=rect(ox-8,oy+i*(cs+16)-6,2*cs+32,cs+12,{fill:'none',stroke:'var(--c4)',dash:'4 3',rx:8})}
    for(let j=0;j<2;j++){b+=rect(ox+j*(cs+16)-4,oy-10,cs+8,2*cs+36,{fill:'none',stroke:'var(--c3)',dash:'2 3',rx:8})}
    mesh.forEach((row,i)=>row.forEach((rk,j)=>{const x=ox+j*(cs+16),y=oy+i*(cs+16);b+=rect(x,y,cs,cs,{cls:rk===1?'bxa':'bx'})+T(x+cs/2,y+cs/2+4,'rank '+rk,{a:'middle',w:600})}));
    b+=T(ox+2*cs+30,oy+cs/2,'tp {0, 1}',{fs:11,fill:'var(--c4)'})+T(ox+2*cs+30,oy+cs+16+cs/2,'tp {2, 3}',{fs:11,fill:'var(--c4)'});
    b+=T(ox+cs/2,oy+2*cs+44,'dp {0, 2}',{a:'middle',fs:11,fill:'var(--c3)'})+T(ox+cs+16+cs/2,oy+2*cs+44,'dp {1, 3}',{a:'middle',fs:11,fill:'var(--c3)'});
    const ph2=oy+2*cs+52;
    el.innerHTML='<div class="rd-two"><div>'+RD.svg(pw,ph,defs+a,'torchrun spawns four workers that meet at a TCPStore')+'</div><div>'+RD.svg(pw,ph2,b,'A 2 by 2 device mesh: rows are tp groups, columns dp groups')+'</div></div>';
  }

  // ---- DDP buckets: stepper over the recorded backward, step 0 against step 1 ----
  const LANES=[['ln_f',p=>p.startsWith('ln_f')],['block 3',p=>p.startsWith('blocks.3.')],['block 2',p=>p.startsWith('blocks.2.')],['block 1',p=>p.startsWith('blocks.1.')],['block 0',p=>p.startsWith('blocks.0.')],['embeddings',p=>p==='tok.weight'||p==='pos.weight']];
  const BCOL=['var(--c5)','var(--c3)'];
  let ddpMode=0;
  function ddpFrames(st){
    const rd=st.ready,laneEnd=k=>Math.max(...rd.filter(q=>LANES[k][1](q[0])).map(q=>q[1]));
    const b0last=rd.filter(q=>q[2]===0).length===rd.length?rd[3][1]:Math.max(...rd.filter(q=>q[2]===0).map(q=>q[1]));
    const ar=st.allreduce,last=Math.max(...rd.map(q=>q[1]));
    return [0,Math.max(b0last,ar.length>1?ar[0][1]:0),laneEnd(1),laneEnd(2),laneEnd(3),Math.max(last,ar[ar.length-1][1]),st.bwd_end_ms];
  }
  function ddpCap(i){
    const st=D.ddpb.steps[ddpMode],ar=st.allreduce,f=ddpFrames(st),ms=v=>v.toFixed(2)+' ms';
    const one=ddpMode===0;
    const C=[
      ['Forward done; backward starts at the loss','Gradients become ready from the last layer back. '+(one?'Step 0: one bucket holds all 52 gradients, '+comma(st.buckets[0].bytes)+' bytes.':'Step 1: two buckets, rebuilt in arrival order: '+comma(st.buckets[0].bytes)+' and '+comma(st.buckets[1].bytes)+' bytes.')],
      [one?'The first gradients wait':'Bucket 0 is full: its all-reduce leaves at once',one?'ln_f and block 3\'s mlp.proj are ready at '+ms(f[1])+', but their bucket is the whole model: nothing can be sent yet.':'ln_f and block 3\'s mlp.proj (4 tensors) fill bucket 0; its all-reduce of '+comma(ar[0][0])+' bytes is issued at '+ms(ar[0][1])+', while backward continues into block 3.'],
      ['Block 3 done',one?'Still waiting: the one bucket is '+pct(st,f[2])+' full.':'Bucket 1 is '+pct(st,f[2],1)+' full; bucket 0\'s all-reduce is already under way.'],
      ['Block 2 done','Each block adds about 3 MB of gradients ('+(one?'bucket ':'bucket 1 ')+pct(st,f[3],one?0:1)+' full).'],
      ['Block 1 done','Block 0 and the embeddings remain ('+pct(st,f[4],one?0:1)+' full).'],
      [one?'The last gradient arrives: the only all-reduce leaves':'The last gradient arrives: bucket 1\'s all-reduce leaves','tok.weight is ready at '+ms(Math.max(...st.ready.map(q=>q[1])))+'; the all-reduce of '+comma(ar[ar.length-1][0])+' bytes is issued at '+ms(ar[ar.length-1][1])+(one?'. All 12.75 MB go after backward has finished computing.':'. Only this bucket waits for the end of backward.')],
      ['backward() returns','At '+ms(st.bwd_end_ms)+', once the all-reduces are done. '+(one?'Step 0 is also slower overall (first-step overheads); compare the order, not only the totals.':'On NCCL the 1 MB all-reduce would have run on its own stream under block 3 to 0\'s backward.')]];
    const c=C[i];$('dpt-ddp-cap').innerHTML='<div class="t">'+(i+1)+'. '+c[0]+'</div><p>'+c[1]+'</p>';
  }
  function pct(st,t,b){b=b||0;const tot=st.buckets[b].bytes;const got=st.ready.filter(q=>q[2]===b&&q[1]<=t).reduce((a,q)=>a+q[3],0);return Math.round(100*got/tot)+'%'}
  function ddpDraw(i){
    const el=$('dpt-ddp');if(!el)return;const w=U.W(el),st=D.ddpb.steps[ddpMode],f=ddpFrames(st),tnow=f[i];
    const tmax=Math.max(...D.ddpb.steps.map(s=>s.bwd_end_ms))*1.02,L=w<480?70:84,R=10,lh=20;
    const X=t=>L+(w-L-R)*t/tmax;let s='',y=6;
    LANES.forEach(([nm,fn])=>{s+=T(0,y+13,nm,{fill:'var(--mute)'})+line(L,y+9,w-R,y+9,{c:'var(--line)'});
      st.ready.filter(q=>fn(q[0])).forEach(q=>{const on=q[1]<=tnow+1e-9;s+='<rect x="'+(X(q[1])-1.5)+'" y="'+(y+2)+'" width="3" height="14" fill="'+BCOL[q[2]]+'" opacity="'+(on?1:.15)+'"><title>'+q[0]+': ready at '+q[1].toFixed(2)+' ms, bucket '+q[2]+'</title></rect>'});y+=lh});
    s+=T(0,y+13,'all-reduce',{fill:'var(--mute)',w:600})+line(L,y+9,w-R,y+9,{c:'var(--line)'});
    st.allreduce.forEach((a,k)=>{if(a[1]>tnow+1e-9)return;const x=X(a[1]);const c=st.buckets.length>1?BCOL[k]:BCOL[0];
      s+='<path d="M'+x+' '+(y+2)+' l6 7 l-6 7 l-6 -7z" fill="'+c+'"/>'+T(Math.min(x+8,w-R-60),y+13,MB(a[0]),{fs:11})});y+=lh+4;
    // time axis
    s+=line(X(tnow),2,X(tnow),y,{c:'var(--bad)'});
    [0,10,20,30,40].filter(v=>v<tmax).forEach(v=>{s+=T(X(v),y+12,v+' ms',{a:'middle',fs:10,fill:'var(--mute)'})});y+=20;
    // bucket fill bars
    const tot=st.buckets.reduce((a,b)=>a+b.bytes,0),bw=w-L-R;let x=L;
    s+=T(0,y+13,'buckets',{fill:'var(--mute)'});
    st.buckets.forEach((b,k)=>{const ww=Math.max(14,bw*b.bytes/tot)-(k?0:2);const got=st.ready.filter(q=>q[2]===k&&q[1]<=tnow+1e-9).reduce((a,q)=>a+q[3],0);
      s+=rect(x,y+2,ww,16,{fill:'none',stroke:BCOL[k]})+rect(x,y+2,ww*got/b.bytes,16,{fill:BCOL[k],op:.6});
      if(ww>70)s+=T(x+4,y+14,(k===0&&st.buckets.length>1?'0: ':'')+MB(b.bytes),{fs:11});x+=ww+2});y+=24;
    el.innerHTML=RD.svg(w,y,s,'DDP backward: gradients ready, buckets and all-reduces');
    ddpCap(i);
  }
  let ddpA=null;
  if($('dpt-ddp-ctl')){ddpA=RD.anim({card:'dpt-ddp-card',ctl:'dpt-ddp-ctl',n:7,ms:1500,label:'Step of backward',draw:ddpDraw});
    U.seg($('dpt-ddp-seg'),m=>{ddpMode=+m;ddpA.reset(7)})}

  // ---- FSDP2: one step's collectives per unit ----
  function fsdp(){
    const el=$('dpt-fsdp');if(!el)return;const w=U.W(el),c=D.mesh.fsdp4.ranks[0].coll;
    const ag=c.filter(x=>x[0]==='all_gather'),rs=c.filter(x=>x[0]!=='all_gather');
    const agRoot=ag.find(x=>x[4]===1)[3],agBlk=ag.find(x=>x[4]>1)[3],rsBlk=rs.find(x=>x[4]>1)[3],rsRoot=rs.find(x=>x[4]===1)[3];
    const units=[['root unit','FSDPGPT: tok, pos, ln_f'],['block 0','FSDPBlock'],['block 1','FSDPBlock'],['block 2','FSDPBlock'],['block 3','FSDPBlock']];
    const L=w<480?84:150,cols=['forward: all-gather','backward: all-gather','backward: reduce'],cw=(w-L-8)/3,rh=30;
    let s=T(0,14,'unit',{w:600,fill:'var(--mute)'});
    cols.forEach((t,k)=>{const x=L+k*cw+cw/2;const sp=w<480?t.split(': '):[t];sp.forEach((p,j)=>{s+=T(x,(sp.length>1?8:14)+j*12,p,{a:'middle',fs:11,w:600,fill:k===2?'var(--c2)':'var(--c3)'})})});
    let y=24;let nAG=0,nRS=0;
    units.forEach(([u,cls],i)=>{s+=T(0,y+13,u,{w:600})+(w>=480?T(0,y+25,cls,{fs:10.5,fill:'var(--mute)'}):'');
      const cells=i===0?[[agRoot,1],[null,0],[rsRoot,2]]:[[agBlk,1],[agBlk,1],[rsBlk,2]];
      cells.forEach(([b,kind],k)=>{const x=L+k*cw+4,ww=cw-8;
        if(b==null){s+=rect(x,y+3,ww,rh-8,{fill:'none',stroke:'var(--line)',dash:'3 2'})+T(x+ww/2,y+rh/2+3,'kept',{a:'middle',fs:11,fill:'var(--mute)'});return}
        if(kind===1)nAG++;else nRS++;
        s+=rect(x,y+3,ww,rh-8,{fill:kind===1?'var(--c3)':'var(--c2)',op:.28,stroke:kind===1?'var(--c3)':'var(--c2)'})+T(x+ww/2,y+rh/2+3,comma(b)+(ww>80?' B':''),{a:'middle',fs:11})});
      y+=rh});
    s+=T(w<480?0:L,y+14,nAG+' all-gathers + '+nRS+' reductions = '+(nAG+nRS)+(w<480?' per step':' collectives per step'),{fs:11,w:600});
    el.innerHTML=RD.svg(w,y+20,s,'FSDP2 collectives per unit in one step');
  }

  // ---- DTensor: three placements, and a product of shards ----
  function dt(){
    const el=$('dpt-dt');if(!el)return;const w=U.W(el),two=w>=640,pw=two?(w-16)/2:w;
    const grid=(x,y,r,c,cs,o)=>{o=o||{};let g=rect(x,y,c*cs,r*cs,{fill:o.fill||'var(--soft)',stroke:o.stroke||'var(--line)',rx:1,op:o.op});for(let i=1;i<r;i++)g+=line(x,y+i*cs,x+c*cs,y+i*cs,{c:'var(--line)'});for(let j=1;j<c;j++)g+=line(x+j*cs,y,x+j*cs,y+r*cs,{c:'var(--line)'});return g};
    // panel A: placements of A (4 x 6) on 2 ranks
    let a='';const cs=Math.max(6,Math.min(9,(pw-96)/14));let y=4;
    [['Shard(0)',['rows split'],[[0,2],[2,4]]],['Replicate()',['all of it'],[[0,4],[0,4]]],['Partial()',['full shape,','values sum'],[[0,4],[0,4]]]].forEach(([pl,why,rr],k)=>{
      a+=T(0,y+12,pl,{w:600});why.forEach((t,j)=>{a+=T(0,y+25+j*12,t,{fs:11,fill:'var(--mute)'})});
      [0,1].forEach(r=>{const x=86+r*(6*cs+14);const rows=rr[r][1]-rr[r][0];a+=T(x,y+10,'rank '+r,{fs:10.5,fill:'var(--mute)'});
        if(k===0)a+=rect(x,y+14,6*cs,4*cs,{fill:'none',stroke:'var(--line)',dash:'2 2',rx:1});
        a+=grid(x,y+14+rr[r][0]*cs,rows,6,cs,{fill:k===0?'var(--c3)':k===1?'var(--c1)':'var(--c5)',op:.5});
        if(k===2&&r===0)a+=T(x+6*cs+7,y+14+2*cs+4,'+',{a:'middle',w:600})});
      y+=14+4*cs+12});
    const ha=y;
    // panel B: A S(1) @ B S(0) -> P -> relu -> all-reduce -> R
    let b='';const c2=Math.max(5,Math.min(8,(pw-60)/24));y=4;
    b+=T(0,y+12,'A Shard(1) @ B Shard(0)',{w:600});y+=20;
    [0,1].forEach(r=>{let x=0;b+=T(x,y+4*c2/2+4,'rank '+r,{fs:10.5,fill:'var(--mute)'});x=44;
      b+=grid(x,y,4,3,c2,{fill:'var(--c3)',op:.5});x+=3*c2+6;b+=T(x+2,y+2*c2+4,'@',{fs:11});x+=14;
      b+=grid(x,y-c2*0,3,8,c2,{fill:'var(--c3)',op:.5});x+=8*c2+6;b+=T(x+2,y+2*c2+4,'=',{fs:11});x+=14;
      b+=grid(x,y,4,8,c2,{fill:'var(--c5)',op:.5});b+=T(x+8*c2+4,y+2*c2+4,'P',{fs:11,w:600,fill:'var(--c5)'});y+=4*c2+10});
    b+=T(0,y+12,'no communication: a pending sum',{fs:11,fill:'var(--c5)'});y+=22;
    b+=T(0,y+12,'relu needs the sum: 1 all-reduce first',{fs:11,fill:'var(--bad)',w:600});y+=18;
    [0,1].forEach(r=>{b+=T(0,y+2*c2+4,'rank '+r,{fs:10.5,fill:'var(--mute)'})+grid(44,y,4,8,c2,{fill:'var(--c1)',op:.5})+T(44+8*c2+4,y+2*c2+4,'R',{fs:11,w:600,fill:'var(--c1)'});y+=4*c2+8});
    const hb=y;
    el.innerHTML='<div class="rd-two"><div>'+RD.svg(pw,ha,a,'Three placements of one 4 by 6 matrix on two ranks')+'</div><div>'+RD.svg(pw,hb,b,'A product of column and row shards is a Partial sum; relu forces an all-reduce')+'</div></div>';
  }

  // ---- DCP: four ranks, four shard files and a map, two ways to read them ----
  function dcp(){
    const el=$('dpt-dcp');if(!el)return;const w=U.W(el),cv=D.dcp.convert,files=cv.dcp_files;
    const wide=w>=600,colW=wide?(w-40)/3:w;let s=defs,y=0;
    if(wide){const bh=34,gy=8;const x1=0,x2=colW+20,x3=2*colW+40;
      s+=T(x1,12,'4 FSDP2 ranks',{w:600,fill:'var(--mute)'})+T(x2,12,'checkpoint directory',{w:600,fill:'var(--mute)'})+T(x3,12,'read back as',{w:600,fill:'var(--mute)'});
      const fy=k=>20+k*(bh+gy);
      for(let r=0;r<4;r++){s+=rect(x1,fy(r+1),colW,bh,{cls:'bx'})+T(x1+6,fy(r+1)+14,'rank '+r,{w:600})+T(x1+6,fy(r+1)+27,'1/4 of model + AdamW',{fs:11,fill:'var(--mute)'})+line(x1+colW,fy(r+1)+bh/2,x2-2,fy(r+1)+bh/2,{arrow:1})}
      files.forEach((f,k)=>{s+=rect(x2,fy(k),colW,bh,{cls:k===0?'bxa':'bx'})+T(x2+6,fy(k)+14,f[0],{w:600,fs:11})+T(x2+6,fy(k)+27,comma(f[1])+' B',{fs:11,fill:'var(--mute)'})});
      const t1=fy(1),t2=fy(3);
      s+=rect(x3,t1,colW,bh+10,{cls:'bx'})+T(x3+6,t1+14,'2 × 2 HSDP',{w:600})+T(x3+6,t1+28,'(Replicate(), Shard(0))',{fs:11,fill:'var(--mute)'})+T(x3+6,t1+40,'difference 0.0',{fs:11,fill:'var(--good)'});
      s+=rect(x3,t2,colW,bh+10,{cls:'bx'})+T(x3+6,t2+14,'one .pt',{w:600})+T(x3+6,t2+28,'dcp_to_torch_save',{fs:11,fill:'var(--mute)'})+T(x3+6,t2+40,comma(cv.pt_bytes)+' B',{fs:11,fill:'var(--mute)'});
      s+=line(x2+colW,fy(0)+bh/2,x3-2,t1+bh/2,{arrow:1,c:'var(--acc)'})+line(x2+colW,fy(0)+bh/2,x3-2,t2+bh/2,{arrow:1,c:'var(--acc)'});
      s+=T(x2+colW+4,fy(0)+bh/2-4,'the map',{fs:11,fill:'var(--acc)'});
      y=fy(5)}
    else{const bw2=(w-12)/2,bh=34;s+=T(0,12,'4 FSDP2 ranks write',{w:600,fill:'var(--mute)'});y=18;
      files.slice(1).forEach((f,k)=>{const x=(k%2)*(bw2+12),yy=y+Math.floor(k/2)*(bh+6);s+=rect(x,yy,bw2,bh,{cls:'bx'})+T(x+6,yy+14,'rank '+k+': '+f[0],{w:600,fs:11})+T(x+6,yy+27,comma(f[1])+' B',{fs:11,fill:'var(--mute)'})});
      y+=2*(bh+6);s+=rect(0,y,w,bh,{cls:'bxa'})+T(6,y+14,files[0][0]+' (the map)',{w:600,fs:11})+T(6,y+27,comma(files[0][1])+' B',{fs:11,fill:'var(--mute)'});y+=bh+6;
      s+=line(w/2,y,w/2,y+16,{arrow:1,c:'var(--acc)'});y+=20;
      s+=rect(0,y,bw2,bh+10,{cls:'bx'})+T(6,y+14,'2 × 2 HSDP',{w:600})+T(6,y+28,'(Replicate(), Shard(0))',{fs:10.5,fill:'var(--mute)'})+T(6,y+40,'difference 0.0',{fs:11,fill:'var(--good)'});
      s+=rect(bw2+12,y,bw2,bh+10,{cls:'bx'})+T(bw2+18,y+14,'one .pt',{w:600})+T(bw2+18,y+28,'dcp_to_torch_save',{fs:10.5,fill:'var(--mute)'})+T(bw2+18,y+40,comma(cv.pt_bytes)+' B',{fs:11,fill:'var(--mute)'});y+=bh+14}
    el.innerHTML=RD.svg(w,y,s,'DCP: shard files plus a metadata map, read back in another layout');
  }

  // ---- composed shards of one weight, to scale ----
  function c3s(){
    const el=$('dpt-c3s');if(!el)return;const w=U.W(el);const pq=D.c3[0].params.find(p=>p[0]==='blocks.0.mlp.fc.weight');
    const full=pq[1],loc=pq[2],tp=[full[0]/2,full[1]];const H=Math.min(170,w*0.4),k=H/full[0];
    const shapes=[[full,'model','var(--c1)'],[tp,'after ColwiseParallel (tp)','var(--c4)'],[loc,'after fully_shard (dp)','var(--c3)']];
    const col=w/3;let s=defs;
    shapes.forEach(([sh,lab,c],i)=>{const ww=sh[1]*k,hh=sh[0]*k,cx=col*i+col/2,x=cx-ww/2;s+=rect(x,6,ww,hh,{fill:c,stroke:'var(--line)',op:0.55,rx:2})+T(cx,H+24,'['+sh.join(', ')+']',{a:'middle',w:600});
      const lb=lab.split(' (');s+=T(cx,H+38,lb[0],{a:'middle',fs:11,fill:'var(--mute)'})+(lb[1]?T(cx,H+51,'('+lb[1],{a:'middle',fs:11,fill:'var(--mute)'}):'');
      if(i<2)s+=line(cx+ww/2+6,6+H/4,col*(i+1)+col/2-(shapes[i+1][0][1]*k)/2-6,6+H/4,{arrow:1})});
    el.innerHTML=RD.svg(w,H+58,s,'One weight cut by tensor parallel, then by FSDP, to scale');
  }

  // ---- flight recorder: the first disagreeing sequence number ----
  function fr(){
    const el=$('dpt-frfig');if(!el)return;const w=U.W(el),L=58,bw=(w-L-6*3)/4,bh=28;let s='';
    s+=T(L,12,'collective sequence number',{fs:11,fill:'var(--mute)'});
    [1,2,3,4].forEach(q=>{s+=T(L+(q-1)*(bw+6)+bw/2,28,String(q),{a:'middle',w:600})});
    [0,1].forEach(r=>{const y=36+r*(bh+8);s+=T(0,y+18,'rank '+r,{fill:'var(--mute)'});
      [1,2,3,4].forEach(q=>{const x=L+(q-1)*(bw+6);const bad=q===4,nm=bad?(r===0?'all_reduce':'barrier'):'all_reduce';
        s+=rect(x,y,bw,bh,{fill:bad?'var(--bad)':'var(--good)',op:bad?.22:.16,stroke:bad?'var(--bad)':'var(--good)'})+T(x+bw/2,y+18,nm,{a:'middle',fs:bw<70?10:11,w:bad?600:400})})});
    const y=36+2*(bh+8);s+=T(L+3*(bw+6)+bw,y+12,'first mismatch',{a:'end',fs:11,fill:'var(--bad)',w:600});
    el.innerHTML=RD.svg(w,y+18,s,'Two ranks agree on collectives 1 to 3 and disagree at 4');
  }

  function all(){hero();c10d();fsdp();dt();dcp();c3s();fr();if(ddpA)ddpA.redraw()}
  RD.onRender(all);RD.onResize(all);all();
})();
