// ---- Scene, Fig. 2 (section 3): one 8-GPU server, NVSwitch against a direct mesh, then in-switch reduction. Numbers as section 3 states them:
// NVLink 4 450 GB/s each way per H100 (900 total over 18 links, Hopper in depth), 4 NVSwitch chips per HGX H100 (NVIDIA, Aug 2024); MI300X 7
// Infinity Fabric links of 128 GB/s both directions, 64 each way, 448 with all 7 (MI300X data sheet); PCIe 5.0 x16 63 GB/s each way (window.IC.ladder).
// The mesh is drawn on the same 8 positions for comparison; an MI300X platform's real board layout is not drawn. Steps: #sx-srv on the left. ----
(function(){
  if(!document.getElementById('stg-srv')||!window.ICG||!window.IC)return;const {mix,lerp}=S3,G=ICG;
  const bwOf=re=>IC.ladder.find(r=>re.test(r.nm)).bw;
  const BW={nvl:bwOf(/NVLink 4/),pcie:bwOf(/PCIe/),mesh:128/2,links:7,nvlinks:18,nvs:4};BW.meshAll=BW.mesh*BW.links;
  window.IC_SRV=BW; // checked by check/check_stages.mjs
  const S=G.server(0,1),f=n=>Number(n).toLocaleString('en-US');
  const A=[{nvs:1,nvl:1,pci:1,pcie:1,nic:1,cpu:1,mesh:0},{nvs:1,nvl:1,pci:.25,pcie:.2,nic:.25,cpu:.25,mesh:0},{nvs:0,nvl:0,pci:.25,pcie:.15,nic:.25,cpu:.25,mesh:1},
    {nvs:0,nvl:0,pci:.25,pcie:.15,nic:.25,cpu:.25,mesh:1},{nvs:1,nvl:1,pci:.25,pcie:.15,nic:.25,cpu:.25,mesh:0}];
  const gp=g=>{const c=S.gpu(g);return [c[0],.42,c[2]]};
  const arcPts=(i,j,n)=>{const a=gp(i),b=gp(j),h=.22+.11*Math.abs(i-j),pts=[];for(let t=0;t<=n;t++){const u=t/n;pts.push([lerp(a[0],b[0],u),a[1]+4*h*u*(1-u),a[2]-.12*Math.sin(Math.PI*u)])}return pts};
  function draw(R,k,e,st){const P=R.P,pk=st.pk==null?k:st.pk,a=n=>lerp(A[pk][n],A[k][n],e),lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-7.5,7.5,-2,2.6,.5);
    const hl={0:k>=1&&k<=3?P.acc:null,3:k>=1&&k<=2?P.acc:null};
    G.drawServer(R,S,{hbm:.35,nvs:a('nvs'),pci:a('pci'),nic:a('nic'),cpu:a('cpu'),hl});
    G.links(R,S,BW,{nvl:a('nvl'),pcie:a('pcie')});
    // the mesh: every pair joined by one link of 64 GB/s each way
    const ma=a('mesh');
    if(ma>.01)for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){const pts=arcPts(i,j,18),w=Math.max(1.2,R.px(pts[9],G.D(BW.mesh)));
      R.line(pts,{c:mix(P.paper,P.c6,.6),w,a:ma*(i===0?.95:.45)})}
    const z=S.nvs(0)[2],via=g=>[[G.XG(g),.44,S.z0],[G.XG(g),.44,z]];
    if(k===0){lab([G.XS(3)+.4,.45,z],BW.nvs+' NVSwitch chips',{al:'left',dx:14,fs:12,c:P.c3,a:e,wide:1});lab([G.XG(0)-.5,.5,z],'8 GPUs · '+BW.nvlinks+' links each · '+BW.nvl+' GB/s each way',{al:'left',dy:-22,b:1,c:P.c3,a:e});
      lab(G.top(S.nic(7)),'NIC per GPU',{al:'left',dx:14,fs:12,c:P.c2,a:e});lab(G.top(S.pci(3)),'PCIe switch · '+BW.pcie+' GB/s',{al:'left',dx:14,dy:-4,fs:12,c:P.c5,a:e,wide:1});
      lab(G.top(S.cpu(0)),'CPU',{dy:-14,fs:12,a:e})}
    if(k===1){R.flow([...via(0),...via(3).reverse()],{c:P.acc,a:e,r:.09,n:12,speed:1.4});
      [[1,6],[2,5],[4,7]].forEach(([x,y])=>R.flow([...via(x),...via(y).reverse()],{c:P.c3,a:e*.55,r:.06,n:8,speed:1.4}));
      lab(gp(0),'GPU 0',{dy:22,fs:12,a:e});lab(gp(3),'GPU 3',{dy:22,fs:12,a:e});lab([G.XG(1.5),.5,z],'GPU 0 → GPU 3 · '+BW.nvl+' GB/s',{dy:-16,b:1,c:P.acc,a:e})}
    if(k===2){R.flow(arcPts(0,3,24),{c:P.acc,a:e,r:.06,n:6,speed:1});lab(arcPts(0,3,2)[1],'one link · '+BW.mesh+' GB/s each way',{dy:-14,b:1,c:P.c6,a:e});
      lab(gp(0),'GPU 0',{dy:22,fs:12,a:e});lab(gp(3),'GPU 3',{dy:22,fs:12,a:e})}
    if(k===3){for(let j=1;j<8;j++)R.flow(arcPts(0,j,24),{c:P.acc,a:e,r:.055,n:5,speed:1});lab(arcPts(0,7,2)[1],BW.links+' links at once · '+BW.meshAll+' GB/s',{dy:-14,b:1,c:P.c6,a:e});lab(gp(0),'GPU 0',{dy:22,fs:12,a:e})}
    if(k===4){for(let g=0;g<8;g++){const [p0,p1]=via(g);R.flow([[p0[0]-.12,p0[1],p0[2]],[p1[0]-.12,p1[1],p1[2]+.25]],{c:P.c2,a:e,r:.08,n:5,speed:.9});R.flow([[p1[0]+.12,p1[1],p1[2]+.25],[p0[0]+.12,p0[1],p0[2]]],{c:P.c3,a:e,r:.08,n:5,speed:.9})}
      lab([G.XS(1.5),.5,z],'add 8 buffers, multicast the sum',{dy:-16,b:1,c:P.c3,a:e});lab(gp(6),'up: S bytes · down: the sum',{dy:26,fs:12,c:P.c2,a:e,wide:1})}
  }
  const st=S3.stage({id:'stg-srv',list:'sx-srv',fig:'Fig. 2 · one 8-GPU server: switch against mesh',cam:[.22,.88],bounds:[[-7.1,0,-1.4],[7.1,.5,1.9]],aspect:.46,dur:1500,hold:4800,draw,
    view:k=>S3P(k,'stg-srv',k=>k===1?{cam:[.3,.72],bounds:[[-6.1,0,-1.4],[G.XG(3)+.9,.5,.9]]}:k===2||k===3?{cam:[.08,.42],bounds:[[-5.9,0,-1.2],[5.9,1.45,.6]]}:k===4?{cam:[.25,.7],bounds:[[-5.9,0,-1.4],[5.9,.6,.6]]}:null,[.22,.88]),
    margin:w=>w<520?[18,10,14,10]:[26,20,22,20]});
  (window.ICSTG=window.ICSTG||{})['stg-srv']=st;
})();
