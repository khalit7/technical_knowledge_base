// ---- Scene, Fig. 3 (section 4): the same 16-GPU job placed packed (2 servers in one rack) or spread (1 GPU on each of 16 servers), on a cluster shaped
// like Llama 3's, drawn small: 2 pods of 4 racks, 2 servers of 8 GPUs per rack. The ring's edges are arcs rising to the switch layer they cross (0 inside a
// server, 1 rack switch, 3 inside a pod, 5 across pods). Times from window.CA.place (recompute.py: 2(N-1)/N x 1 GB / slowest edge, 50 GB/s per card,
// 50 / 7 on the 1:7 top layer when busy). The mode chips swap the step list (#sx-place-packed, #sx-place-spread). ----
(function(){
  if(!document.getElementById('stg-place')||!window.CAG||!window.CA)return;const {mix,lerp}=S3,G=CAG,PL=CA.place;
  const PX=p=>(p-.5)*6.4,RX=(p,r)=>PX(p)+(r-1.5)*1.3,YR=G.SWY+.07,YP=3.3,YT=4.6;
  const nodes=[];for(let p=0;p<2;p++)for(let r=0;r<4;r++)for(let s=0;s<2;s++)nodes.push({p,r,s});
  const trayC=n=>{const N=nodes[n];return [RX(N.p,N.r),G.SY[N.s],0]};
  let mode='packed';const zoomed=k=>mode==='packed'&&(k===1||k===2);
  const ranks=m=>m==='packed'?[0,1].flatMap(n=>[0,1,2,3,4,5,6,7].map(g=>[n,g])):nodes.map((_,n)=>[n,0]);
  const lvl=(a,b)=>{const A=nodes[a[0]],B=nodes[b[0]];return a[0]===b[0]?0:A.p!==B.p?3:A.r!==B.r?2:1};
  const edges=m=>{const a=ranks(m);return a.map((x,i)=>[x,a[(i+1)%a.length]])};
  const SW=[0,1,3,5];
  const stat=m=>{const c=[0,0,0,0];edges(m).forEach(([a,b])=>c[lvl(a,b)]++);const used=new Set(ranks(m).map(r=>r[0]));
    return {lv:c,sw:c.reduce((t,v,i)=>t+v*SW[i],0),servers:used.size,racks:new Set([...used].map(n=>nodes[n].p*4+nodes[n].r)).size,pods:new Set([...used].map(n=>nodes[n].p)).size}};
  window.CA_PLACE={packed:stat('packed'),spread:stat('spread'),packed_ms:PL.packed_ms,spread_busy_ms:PL.spread_busy_ms,busy_bw:PL.busy_bw,o:PL.o};
  // other jobs on a busy cluster: every GPU the job does not hold (a fixed pattern, illustrative)
  function draw(R,k,e,st){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{})),COL=[P.c4,P.c2,P.c3,P.bad];
    R.grid(-7.5,7.5,-2.5,2.5,.5);
    const mine={};ranks(mode).forEach(([n,g])=>mine[n+':'+g]=1);
    const busy=k===4;
    for(let p=0;p<2;p++)for(let r=0;r<4;r++)G.rack(R,[RX(p,r),0,0],{slab:false,sw:1,a:.9,shadow:p===0&&r===0});
    nodes.forEach((N,n)=>{const hl={};for(let g=0;g<8;g++){const m=mine[n+':'+g];hl[g]=k>=1&&m?P.acc:busy?mix(P.paper,P.mute,.75):null}
      G.tray(R,trayC(n),{hl,ga:k===0?1:(busy?1:.6),nvs:.35})});
    // switch layers: a pod plate over each pod, the top layer over both
    for(let p=0;p<2;p++){R.glass([PX(p)-2.6,YP,-.9],[5.2,0,0],[0,0,1.8],{c:P.c3,a:.55,nu:4,nv:1});if(!zoomed(k))lab([PX(p),0,.85],'pod '+(p+1),{dy:16,fs:12,c:P.mute})}
    R.glass([-5.9,YT,-1],[11.8,0,0],[0,0,2],{c:P.bad,a:busy?.75:.45,nu:6,nv:1});
    if(!zoomed(k)){lab([5.9,YT,0],'top layer · 1:'+PL.o,{al:'left',dx:8,fs:12,c:P.bad,grp:'ly'});lab([5.9,YP,0],'pod layer',{al:'left',dx:8,fs:12,c:P.c3,grp:'ly'});lab([RX(1,3)+.5,YR,0],'rack switch',{al:'left',dx:8,fs:12,c:P.c2,grp:'ly'})}
    // the ring: arcs rising to the layer each edge crosses, drawn at step 3, carrying data from step 4
    if(k>=2){const ed=edges(mode);ed.forEach(([a,b])=>{const L=lvl(a,b),pa=G.gpu(trayC(a[0]),a[1]),pb=G.gpu(trayC(b[0]),b[1]),A=[pa[0],pa[1]+.08,pa[2]],B=[pb[0],pb[1]+.08,pb[2]];
        const peak=[0,YR+.15,YP+.1,YT+.1][L],h=L===0?.12:peak-Math.max(A[1],B[1]),c=busy&&L===3?P.bad:COL[L];
        R.arc(A,B,h,{c,w:L===3&&busy?3:1.8,t:k===2?e:1,a:.9,top:L===0});
        if(k>=3){const slow=busy&&L===3;R.flowArc(A,B,h,{c,a:k===3?e:1,r:L===0?.03:.07,n:slow?3:L===0?3:Math.max(4,Math.round(4+h*2.5)),speed:slow?.5:1.6})}})}
    // other jobs streaming across the shared top layer on a busy cluster
    if(busy)for(let i=0;i<5;i++){const x0=-5+i*.6,x1=1+i*.9;R.flow([[x0,YT+.06,-.6+i*.3],[x1,YT+.06,-.6+i*.3]],{c:P.mute,a:e*.8,r:.06,n:5,speed:1.4})}
    // the outcome
    const S=window.CA_PLACE[mode];
    if(k===1)lab(zoomed(k)?[RX(0,0),G.RH,0]:[0,YT+.4,0],S.servers+' servers · '+S.racks+' rack'+(S.racks>1?'s':'')+' · '+S.pods+' pod'+(S.pods>1?'s':''),{dy:-12,b:1,c:P.acc,a:e});
    if(k===2){const t=['NVLink','rack','pod','cross-pod'].map((x,i)=>S.lv[i]+' '+x).filter(x=>x[0]!=='0').join(' · ');
      if(zoomed(k))lab([RX(0,0),G.RH,0],t,{dy:-14,b:1,a:e});else lab([0,YT+.4,0],t+' · '+S.sw+' switches per trip',{dy:-12,b:1,a:e})}
    if(k===3)lab([0,YT+.4,0],'idle · '+PL.packed_ms.toFixed(1)+' ms',{dy:-12,b:1,c:P.c3,a:e});
    if(k===4)lab([0,YT+.4,0],'busy · '+(mode==='packed'?PL.packed_ms:PL.spread_busy_ms).toFixed(1)+' ms',{dy:-12,b:1,c:mode==='packed'?P.c3:P.bad,a:e});
  }
  const st=S3.stage({id:'stg-place',list:'sx-place-packed',fig:'Fig. 3 · one ring, two placements',cam:[.3,.5],bounds:[[-6.4,0,-1.1],[6.4,5.2,1.1]],aspect:.56,dur:1500,hold:4600,draw,
    view:k=>zoomed(k)?{cam:[.35,.4],bounds:[[RX(0,0)-2.2,0,-1],[RX(0,0)+.9,2.7,1]]}:null,
    margin:w=>w<520?[18,10,14,10]:[26,96,20,20]});
  (window.CASTG=window.CASTG||{})['stg-place']=st;
  const seg=document.getElementById('ca-place-mode');
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.m===mode)return;mode=b.dataset.m;
    seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    ['packed','spread'].forEach(m=>document.getElementById('sx-place-'+m).hidden=m!==mode);st.list('sx-place-'+mode)}));
})();
