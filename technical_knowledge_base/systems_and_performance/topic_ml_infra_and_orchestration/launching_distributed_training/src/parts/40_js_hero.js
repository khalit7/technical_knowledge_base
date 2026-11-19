// ---- Fig. 1 (the idea, page hero): the six links of a launch on two nodes of two ranks, the Slurm run of the parent's Launch lab, flat (2026-11-19: was a
// 3D stage; processes on two nodes and the messages between them read the same flat). Stage times are LD.stages.slurm (medians of 5 runs); the variables
// on each worker are LD.envrec.slurm (recorded on every rank); the timeouts are the defaults section 7 links. Positions of nodes, agents, store and ranks are
// schematic. Under the figure, the six links on one time scale (the measured seconds, submit to first step). ----
(function(){
  // flat SVG helpers (2026-11-19): rect, text, line, arrow, eased marks (class rd-new eases in on a forward step)
  const fx=v=>(+v).toFixed(1),MONO='ui-monospace,SFMono-Regular,Menlo,monospace';
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect'+(o.cl?' class="'+o.cl+'"':'')+' x="'+fx(x)+'" y="'+fx(y)+'" width="'+fx(Math.max(0,w))+'" height="'+fx(Math.max(0,h))+'" rx="'+(o.r==null?5:o.r)+'" fill="'+(o.fill||'none')+'"'+(o.fo!=null?' fill-opacity="'+o.fo+'"':'')+(o.s?' stroke="'+o.s+'" stroke-width="'+(o.sw||1.2)+'"':'')+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const text=(x,y,s,o)=>{o=o||{};return '<text'+(o.cl?' class="'+o.cl+'"':'')+' x="'+fx(x)+'" y="'+fx(y)+'" font-size="'+(o.fs||12)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' fill="'+(o.c||'var(--ink)')+'"'+(o.w?' font-weight="'+o.w+'"':'')+(o.mono?' font-family="'+MONO+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+s+'</text>'};
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line'+(o.cl?' class="'+o.cl+'"':'')+' x1="'+fx(x1)+'" y1="'+fx(y1)+'" x2="'+fx(x2)+'" y2="'+fx(y2)+'" stroke="'+(o.c||'var(--line)')+'" stroke-width="'+(o.sw||1.2)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const arrow=(x1,y1,x2,y2,o)=>{o=o||{};const a=Math.atan2(y2-y1,x2-x1),h=o.h||7,c=o.c||'var(--ink)';
    const p=[[x2,y2],[x2-h*Math.cos(a-.42),y2-h*Math.sin(a-.42)],[x2-h*Math.cos(a+.42),y2-h*Math.sin(a+.42)]].map(q=>fx(q[0])+','+fx(q[1])).join(' ');
    return '<g'+(o.cl?' class="'+o.cl+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+line(x1,y1,x2-(h*.6)*Math.cos(a),y2-(h*.6)*Math.sin(a),{c,sw:o.sw||1.6,da:o.da})+'<polygon points="'+p+'" fill="'+c+'"/></g>'};
  const grp=(s,o)=>{o=o||{};return '<g'+(o.cl?' class="'+o.cl+'"':'')+(o.op!=null&&o.op<1?' opacity="'+o.op+'"':'')+'>'+s+'</g>'};
  const card=document.getElementById('ld-hero-card');if(!card||!window.LD)return;
  const D=window.LD,SG=D.stages.slurm.stages,EV=D.envrec.slurm,f2=x=>x.toFixed(2),f1=x=>x.toFixed(1);
  const T={sched:SG[0][1],srun:SG[1][1],imp:SG[2][1],rdzv:SG[3][1],spawn:SG[4][1],pg:SG[5][1],ddp:SG[6][1],first:SG[7][1],total:D.stages.slurm.total};
  window.LD_HERO=T;
  // the six links, each with its measured time (seconds) for the bar under the figure
  const LINKS=[['scheduler',T.sched,'var(--c3)'],['node launcher',T.srun+T.imp,'var(--c5)'],['rendezvous',T.rdzv,'var(--acc)'],['workers',T.spawn,'var(--c5)'],['communicator',T.pg,'var(--c4)'],['first step',T.ddp+T.first,'var(--acc)']];
  const HL=['sbatch to batch script: '+f2(T.sched)+' s','srun '+f2(T.srun)+' s, then torchrun imports '+f2(T.imp)+' s',
    'GROUP_WORLD_SIZE '+EV[0].GROUP_WORLD_SIZE+' · rendezvous '+f2(T.rdzv)+' s · join timeout 600 s',
    'WORLD_SIZE '+EV[0].WORLD_SIZE+' · MASTER_ADDR '+EV[0].MASTER_ADDR+':'+EV[0].MASTER_PORT+' · '+f2(T.spawn)+' s',
    'init_process_group '+(T.pg*1000).toFixed(0)+' ms · gloo: a full mesh of TCP',
    'DDP wrapper '+f2(T.ddp)+' s, first step '+f2(T.first)+' s · submit to step 1: '+f1(T.total)+' s'];
  function draw(k){const el=document.getElementById('ld-hero'),W=RD.width(el),ph=W<520,fs=ph?11.5:12;let s='';
    const box=(x,y,w,h,t,c,op,hot,sub)=>grp(rect(x,y,w,h,{fill:c,fo:hot?.3:.14,s:hot?c:'var(--line)',sw:hot?2:1.2,r:7})+text(x+w/2,y+(sub?h/2:h/2+4),t,{a:'middle',fs,w:700,mono:1})+(sub?text(x+w/2,y+h/2+14,sub,{a:'middle',fs:11,mono:1,c:'var(--mute)'}):''),{op});
    // 1. the scheduler and the two nodes it allocates
    const sw=ph?120:150,sx=(W-sw)/2;s+=box(sx,4,sw,30,'slurmctld','var(--c3)',k===0?1:.4,k===0);
    const ny=62,nw=(W-12)/2,nh=ph?178:170,NX=[0,nw+12];
    NX.forEach((x,n)=>{s+=grp(rect(x,ny,nw,nh,{fill:'var(--soft)',s:'var(--line)',sw:1.2,r:10})+text(x+10,ny+17,'node '+n,{fs:12.5,w:700}),{op:k===0?1:.9,cl:k===0?'rd-new':''})});
    // 2. one torchrun agent per node; 3. the c10d store hosted by node 0's agent
    const ah=30,aw=Math.min(nw-20,ph?nw-20:150),AG=n=>[NX[n]+10,ny+26,aw,ah],STO=[NX[0]+(ph?10:aw+20),ny+(ph?64:26),ph?nw-20:Math.min(nw-aw-30,150),ah];
    if(k>=1)[0,1].forEach(n=>{const a=AG(n);s+=box(a[0],a[1],a[2],a[3],'torchrun agent','var(--c5)',k<=3?1:.5,k===1||k===2)});
    if(k>=2)s+=box(STO[0],STO[1],STO[2],STO[3],k>=4?':'+EV[0].MASTER_PORT+' store':'c10d store :29500','var(--acc)',k===2||k===4?1:.5,k===2||k===4);
    // 4. two workers per node, each told its numbers
    const rw=(nw-30)/2,rh=ph?40:42,ry=ny+nh-rh-10,RK=r=>[NX[r>>1]+10+(r&1)*(rw+10),ry,rw,rh],rc=r=>{const b=RK(r);return [b[0]+b[2]/2,b[1]+b[3]/2]};
    if(k>=3)for(let r=0;r<4;r++){const b=RK(r);s+=box(b[0],b[1],b[2],b[3],'RANK '+EV[r].RANK,'var(--c1)',1,k===3||k===5,k===3?(ph?'local ':'LOCAL_RANK ')+EV[r].LOCAL_RANK:null)}
    else for(let r=0;r<4;r++){const b=RK(r);s+=rect(b[0],b[1],b[2],b[3],{fill:'none',s:'var(--line)',da:'4 3',r:7})}
    const A=(p,q,c,o)=>arrow(p[0],p[1],q[0],q[1],Object.assign({c,sw:1.8,cl:'rd-new'},o||{}));
    if(k===0)NX.forEach(x=>{s+=A([W/2,34],[x+nw/2,ny-2],'var(--c3)')});
    if(k===1)[0,1].forEach(n=>{const a=AG(n);s+=A([W/2,34],[a[0]+a[2]/2,a[1]-2],'var(--c5)')});
    // an arrow between two boxes, trimmed to their edges
    const link=(a,b,c,o)=>{const p=[a[0]+a[2]/2,a[1]+a[3]/2],q=[b[0]+b[2]/2,b[1]+b[3]/2],dx=q[0]-p[0],dy=q[1]-p[1],L=Math.hypot(dx,dy)||1,u=[dx/L,dy/L];
      const t=r=>Math.min(Math.abs(r[2]/2/(u[0]||1e-9)),Math.abs(r[3]/2/(u[1]||1e-9)));const ta=t(a),tb=t(b)+3;return A([p[0]+u[0]*ta,p[1]+u[1]*ta],[q[0]-u[0]*tb,q[1]-u[1]*tb],c,o)};
    if(k===2)[0,1].forEach(n=>{const a=AG(n);s+=link(a,STO,'var(--acc)');
      s+=text(a[0]+a[2]/2,a[1]+a[3]+(ph&&!n?60:16),'GROUP_RANK '+EV[n*2].GROUP_RANK,{a:'middle',fs:11.5,mono:1,w:700,c:'var(--acc)',cl:'rd-new'})});
    if(k===3)for(let r=0;r<4;r++){const a=AG(r>>1),b=RK(r);s+=A([a[0]+a[2]/2,a[1]+a[3]],[b[0]+b[2]/2,b[1]-2],'var(--c5)')}
    // 5. every rank writes its address to the store, then connects to every other rank: a full mesh
    if(k===4){for(let r=0;r<4;r++)s+=link(RK(r),STO,'var(--acc)',{op:.55,sw:1.2})}
    if(k>=4){let m='';for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const p=rc(i),q=rc(j),dy=22+10*Math.abs(i-j);
        m+='<path d="M'+fx(p[0])+','+fx(p[1]+rh/2)+' Q'+fx((p[0]+q[0])/2)+','+fx(p[1]+rh/2+dy)+' '+fx(q[0])+','+fx(q[1]+rh/2)+'" fill="none" stroke="var(--c4)" stroke-width="1.6"/>'}
      s+=grp(m,{op:k===4?1:.45,cl:k===4?'rd-new':''})}
    // 6. the first step: DDP broadcasts rank 0's weights to every rank
    if(k===5){let m='';for(let r=1;r<4;r++){const p=[rc(0)[0],RK(0)[1]],q=[rc(r)[0],RK(r)[1]],cy=p[1]-18-12*r,mx=(p[0]+q[0])/2;
      m+='<path d="M'+fx(p[0])+','+fx(p[1])+' Q'+fx(mx)+','+fx(cy)+' '+fx(q[0])+','+fx(q[1]-3)+'" fill="none" stroke="var(--acc)" stroke-width="2"/>'+arrow(q[0]-(q[0]-mx)*.08,q[1]-9,q[0],q[1]-1,{c:'var(--acc)',sw:2})}
      s+=grp(m,{cl:'rd-new'})}
    // the six links on one time scale, submit to first step
    let y=ny+nh+(k>=4?44:16);const bx0=0,bw=W,tot=LINKS.reduce((a,l)=>a+l[1],0);let x=bx0;
    const mx=Math.floor(W/(ph?7.2:7.6)),hl=[];HL[k].split(' · ').forEach(part=>{const L=hl.length-1;if(L>=0&&(hl[L]+' · '+part).length<=mx)hl[L]+=' · '+part;else hl.push(part)});
    hl.forEach((t,i)=>{s+=text(0,y+12+i*17,t,{fs:12.5,w:700,mono:!ph,c:LINKS[k][2],cl:'rd-new'})});y+=22+(hl.length-1)*17;
    LINKS.forEach(([nm,v,c],i)=>{const w=Math.max(2,v/tot*bw);s+=rect(x,y,w-1,14,{fill:c,fo:i===k?.85:i<k?.4:.12,r:2});x+=w});
    s+=text(0,y+28,'submit',{fs:11,c:'var(--mute)'})+text(W,y+28,'step 1: '+f1(T.total)+' s, measured',{a:'end',fs:11,c:'var(--mute)'});
    el.innerHTML=RD.svg(W,y+34,s,'A launch on two nodes of two ranks, measured on Slurm')}
  const an=RD.anim({card:'ld-hero-card',ctl:'ld-hero-ctl',n:6,ms:5200,draw,label:'Launch link',list:'sx-hero'});
  RD.onResize(()=>an.redraw());
  (window.LDSTG=window.LDSTG||{})['ld-hero']=an;
})();
