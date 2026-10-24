// ---- Static annotated diagrams of the Reading tab (prefix km): the hero chain, the two-network pod, Deployment against LeaderWorkerSet ----
// No data and no motion: each is drawn at the measured width and redrawn on resize or when the tab opens.
(function(){
  const $=id=>document.getElementById(id);
  const T=RD.t;
  const rect=(x,y,w,h,f,s,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.rx==null?6:o.rx)+'" fill="'+f+'" stroke="'+s+'" stroke-width="'+(o.sw||1)+'"'+(o.d?' stroke-dasharray="'+o.d+'"':'')+'/>'};
  const line=(x1,y1,x2,y2,c,w,d)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+(w||1)+'"'+(d?' stroke-dasharray="'+d+'"':'')+'/>';
  const arrowDown=(x,y1,y2,c)=>line(x,y1,x,y2-6,c,2)+'<path d="M'+(x-5)+' '+(y2-7)+' L'+(x+5)+' '+(y2-7)+' L'+x+' '+y2+' Z" fill="'+c+'"/>';

  // ---------- hero: the chain of objects ----------
  const ROWS=[
    {o:'TrainJob',s:'you write it: image, nodes, processes per node',g:'framework knowledge: rank and master address',sec:'10'},
    {o:'JobSet',s:'replicatedJobs and a failurePolicy',g:'restart the whole group as one unit',sec:'9',w:'Trainer controller'},
    {o:'Indexed Jobs + headless Service',s:'pod indexes 0..N-1, one DNS name per pod',g:'ranks and stable names',sec:'2',w:'JobSet controller'},
    {o:'Workload: suspended, then admitted',s:'quota checked for all pods together',g:'admit the whole job at once',sec:'8',w:'Kueue (webhook and loop)'},
    {o:'Pods with no node',s:'one per node share of the job',g:'gang: hold them until all can be placed',sec:'7',w:'job controller, once unsuspended'},
    {o:'Pods bound to nodes',s:'Filter, Score, Bind, one pod per cycle',g:'count GPUs when ranking nodes',sec:'3',w:'kube-scheduler'},
    {o:'Containers with GPUs and an RDMA NIC',s:'torchrun starts; NCCL finds the fabric',g:'attach the devices and the fabric',sec:'s 4 and 5',w:'kubelet + device plugin or DRA + Multus'}];
  function hero(){
    const el=$('km-hero-svg');if(!el)return;const W=Math.max(300,Math.min(860,RD.width(el)));
    const wide=W>=600, bw=wide?Math.round(W*0.5):W-2, bh=wide?42:58, ah=30;let y=2,b='';
    ROWS.forEach((r,i)=>{
      if(i){b+=arrowDown(22,y,y+ah,'var(--mute)')+T(34,y+19,r.w,{fs:11,fill:'var(--mute)'});y+=ah}
      b+=rect(1,y,bw,bh,i===0?'var(--acc2)':'var(--soft)',i===0?'var(--acc)':'var(--line)');
      b+=T(10,y+17,r.o,{fs:12.5,w:600})+T(10,y+33,r.s,{fs:11,fill:'var(--mute)'});
      const gx=wide?bw+16:10, gy=wide?y+25:y+49;
      if(wide)b+=line(bw+2,y+bh/2,bw+12,y+bh/2,'var(--acc)',1.5);
      b+=T(gx,gy,r.g+' (section'+(r.sec[0]==='s'?r.sec:' '+r.sec)+')',{fs:11.5,fill:'var(--acc)',w:600});
      y+=bh});
    el.innerHTML=RD.svg(W,y+4,b,'The chain of objects from a TrainJob down to containers with GPUs, with the controller that writes each and the gap each add-on closes')}

  // ---------- section 5: a pod on two networks ----------
  function net(){
    const el=$('km-net-svg');if(!el)return;const W=Math.max(300,Math.min(860,RD.width(el)));
    const wide=W>=600;let b='',H;
    const pw=wide?Math.round(W*0.52):W-2, px=1, py=22;
    // node and pod
    const ph=wide?150:166;
    b+=T(px,14,'GPU node',{fs:11.5,w:600,fill:'var(--mute)'});
    b+=rect(px,py,pw,ph,'var(--bg)','var(--line)',{d:'4 3'});
    b+=rect(px+8,py+8,pw-16,ph-16,'var(--soft)','var(--line)');
    b+=T(px+16,py+26,'Training pod',{fs:12.5,w:600});
    const gx=px+16, gy=py+36, gs=Math.min(22,Math.floor((pw-48)/8)-3);
    for(let k=0;k<8;k++)b+=rect(gx+k*(gs+3),gy,gs,gs,'var(--c1)','none',{rx:3});
    b+=T(gx,gy+gs+15,'nvidia.com/gpu: 8 (GPU device plugin)',{fs:11});
    b+=rect(gx,gy+gs+24,gs*2+3,gs,'var(--acc)','none',{rx:3});
    b+=T(gx+gs*2+12,gy+gs+24+gs*0.7,'rdma/hca_shared_devices_a: 1',{fs:11});
    b+=T(gx,gy+2*gs+40,'(RDMA shared or SR-IOV device plugin)',{fs:11,fill:'var(--mute)'});
    // interfaces
    const ix=wide?px+pw-58:px+16, e0y=wide?py+56:py+ph-30, n1y=wide?py+104:py+ph-30, n1x=wide?ix:px+pw/2+6;
    b+=rect(ix,e0y,44,20,'var(--bg)','var(--ink)',{rx:4})+T(ix+22,e0y+14,'eth0',{fs:11,a:'middle'});
    b+=rect(n1x,n1y,44,20,'var(--bg)','var(--acc)',{rx:4,sw:2})+T(n1x+22,n1y+14,'net1',{fs:11,a:'middle',w:600});
    if(wide){
      const lx=px+pw+40, y1=py+66, y2=py+114;
      b+=line(ix+44,y1,lx,y1,'var(--ink)',1.5)+line(ix+44,y2,lx,y2,'var(--acc)',3);
      b+=rect(lx,y1-18,W-lx-1,30,'var(--soft)','var(--line)')+T(lx+8,y1-3,'pod network (primary CNI)',{fs:11.5,w:600})+T(lx+8,y1+9,'DNS, rendezvous, TCP',{fs:11,fill:'var(--mute)'});
      b+=rect(lx,y2-18,W-lx-1,30,'var(--acc2)','var(--acc)')+T(lx+8,y2-3,'RDMA fabric (InfiniBand or RoCE)',{fs:11.5,w:600})+T(lx+8,y2+9,'NCCL all-reduce; via Multus',{fs:11,fill:'var(--mute)'});
      H=py+ph+6}
    else{
      const y0=py+ph+18, cx0=ix+22, cx1=n1x+22, bw=(W-12)/2;
      b+=line(cx0,e0y+20,cx0,y0,'var(--ink)',1.5)+line(cx1,n1y+20,cx1,y0,'var(--acc)',3);
      b+=rect(1,y0,bw,44,'var(--soft)','var(--line)')+T(8,y0+16,'pod network',{fs:11.5,w:600})+T(8,y0+30,'(primary CNI): DNS,',{fs:11,fill:'var(--mute)'})+T(8,y0+41,'rendezvous, TCP',{fs:11,fill:'var(--mute)'});
      b+=rect(bw+11,y0,bw,44,'var(--acc2)','var(--acc)')+T(bw+18,y0+16,'RDMA fabric (IB, RoCE)',{fs:11.5,w:600})+T(bw+18,y0+30,'NCCL all-reduce,',{fs:11,fill:'var(--mute)'})+T(bw+18,y0+41,'attached by Multus',{fs:11,fill:'var(--mute)'});
      H=y0+48}
    el.innerHTML=RD.svg(W,H,b,'A training pod with GPUs and an RDMA device from device plugins, eth0 on the pod network and net1 on the RDMA fabric')}

  // ---------- section 11: Deployment against LeaderWorkerSet ----------
  function lws(){
    const el=$('km-lws-svg');if(!el)return;const W=Math.max(300,Math.min(860,RD.width(el)));
    let b='',y=14;const gap=6;
    b+=T(1,y,'Deployment, replicas: 4 (one pod is one replica)',{fs:11.5,w:600});y+=8;
    const dw=(W-2-gap*3)/4;
    for(let k=0;k<4;k++){const x=1+k*(dw+gap);b+=rect(x,y,dw,40,'var(--soft)','var(--line)')+T(x+dw/2,y+17,'pod',{fs:11,a:'middle',w:600})+T(x+dw/2,y+32,W<520?'1 node':'replica '+k+', 1 node',{fs:11,a:'middle',fill:'var(--mute)'})}
    y+=40+26;
    b+=T(1,y,'LeaderWorkerSet, replicas: 2, size: 4 (a group is one replica)',{fs:11.5,w:600});y+=8;
    const gw=(W-2-gap*2)/2;
    for(let g=0;g<2;g++){const gx=1+g*(gw+gap*2);
      b+=rect(gx,y,gw,76,'var(--acc2)','var(--acc)',{sw:1.5,d:'5 3'});
      const pw=(gw-10-3*4)/4;
      for(let k=0;k<4;k++){const x=gx+5+k*(pw+4),L=k===0;
        b+=rect(x,y+6,pw,36,L?'var(--bg)':'var(--soft)',L?'var(--acc)':'var(--line)',{sw:L?2:1})+T(x+pw/2,y+22,pw<50?(L?'L':'W'):(L?'leader':'worker'),{fs:11,a:'middle',w:L?600:400})+T(x+pw/2,y+36,String(k),{fs:11,a:'middle',fill:'var(--mute)'})}
      b+=T(gx+6,y+56,'group '+g+': created, restarted',{fs:11,fill:'var(--acc)',w:600})+T(gx+6,y+70,'and rolled as one',{fs:11,fill:'var(--acc)',w:600})}
    y+=80;
    el.innerHTML=RD.svg(W,y,b,'A Deployment of four one-pod replicas above a LeaderWorkerSet of two groups, each a leader and three workers')}

  function all(){hero();net();lws()}
  all();RD.onRender(all);RD.onResize(all);
})();
