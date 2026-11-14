// ---- Shared geometry for the three stages (Fig. 1 the ladder, Fig. 2 one server, Fig. 5 parallelism): an 8-GPU HGX server as section 2
// describes it (8 GPUs, 4 NVSwitch chips, each GPU with its own NIC under a PCIe switch, two CPUs; the number of PCIe switches is illustrative),
// two such servers on 8 rail leaves (GPU k of every server on leaf k), and spine switches above (their number illustrative).
// Pipes: a link drawn as a tube whose cross-section area is proportional to its bandwidth per GPU, each direction (diameter = K * sqrt(GB/s)). ----
// on a phone (canvas under 520 px) a stage's camera turns about 1 radian so the long row of GPUs runs into depth and the parts draw larger;
// f(k) is the step's wide-screen view (or null), cam0 the stage's camera
window.S3P=(k,id,f,cam0)=>{const v=f(k),h=document.getElementById(id);if(!h||h.clientWidth>=520)return v;const c=(v&&v.cam)||cam0;return {cam:[1.0,Math.max(.6,c[1])],bounds:v&&v.bounds}};
window.ICG=(function(){
  if(!window.S3)return null;
  const {mix}=S3;
  const K=.012,XG=g=>(g-3.5)*1.3,XS=s=>(s-1.5)*2.6,YL=2.9,YS=5.2,XSP=s=>(s-1.5)*2.9;
  // a server at depth z0; sg = +1 puts its NICs towards +z (the front), -1 towards -z (the back), so two servers face away from the rails between them
  function server(z0,sg){return {z0,sg,
    gpu:g=>[XG(g),.1,z0],nvs:s=>[XS(s),.1,z0-sg*.95],pci:p=>[XS(p),.1,z0+sg*.8],nic:g=>[XG(g),.1,z0+sg*1.4],cpu:c=>[c?6.45:-6.45,.1,z0+sg*.8],
    tray:[[-7.05,z0+(sg>0?-1.35:-1.8)],[7.05,z0+(sg>0?1.8:1.35)]]}}
  const leaf=k=>[XG(k),YL,0],spine=s=>[XSP(s),YS,0];
  const D=bw=>K*Math.sqrt(bw);
  // a tube from a to b (world points): its width in pixels follows the camera, so it keeps its proportion when the camera moves in
  function pipe(R,a,b,bw,o){o=o||{};const al=o.a==null?1:o.a;if(al<=.01)return;const m=[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],w=Math.max(1.2,R.px(m,D(bw)));
    const P=R.P,c=o.c||P.ink;R.line([a,b],{c:mix(P.paper,c,P.dark?.75:.55),w:w,a:al*.95,dz:o.dz});R.line([a,b],{c,w:Math.max(.8,w*.28),a:al*.55,dz:(o.dz||0)-.001})}
  // the parts of one server, each with its own alpha (A.tray, A.gpu, A.hbm, A.nvs, A.pci, A.nic, A.cpu) and a highlight colour per GPU (A.hl)
  function drawServer(R,S,A,lab){const P=R.P;A=A||{};const a=k=>A[k]==null?1:A[k];
    R.box([0,0,(S.tray[0][1]+S.tray[1][1])/2],[S.tray[1][0]-S.tray[0][0],.1,S.tray[1][1]-S.tray[0][1]],{fill:mix(P.paper,P.ink,.05),a:a('tray'),dz:200});
    for(let g=0;g<8;g++){const c=S.gpu(g),hl=A.hl&&A.hl[g];
      R.box([c[0],.1,c[2]],[1.05,.06,.9],{fill:mix(P.paper,P.ink,.08),a:a('gpu'),shadow:false,dz:60});
      R.box([c[0],.16,c[2]],[.46,.26,.5],{fill:hl?hl:mix(P.paper,P.acc,.35),a:a('gpu'),shadow:false});
      // six HBM sites beside the die, five used (the H100 SXM)
      if(a('hbm')>.01)for(let s=0;s<6;s++){const x=c[0]+(s<3?-.37:.37),z=c[2]+((s%3)-1)*.27;if(s===5)continue;R.box([x,.16,z],[.16,.24,.2],{fill:mix(P.paper,P.c4,.55),a:a('hbm'),shadow:false})}}
    for(let s=0;s<4;s++)R.box(S.nvs(s),[.8,.2,.42],{fill:mix(P.paper,P.c3,.6),a:a('nvs'),shadow:false});
    // the switch layer: every GPU's 18 links are spread over all four chips, drawn as one glass plate the GPUs plug into
    if(a('nvs')>.01){const z=S.nvs(0)[2];R.glass([-5.45,.34,z-.32],[10.9,0,0],[0,0,.64],{c:P.c3,a:a('nvs')*.6,nu:4,nv:1,th:.03})}
    for(let p=0;p<4;p++)R.box(S.pci(p),[.6,.14,.3],{fill:mix(P.paper,P.c5,.45),a:a('pci'),shadow:false});
    for(let g=0;g<8;g++)R.box(S.nic(g),[.5,.14,.32],{fill:mix(P.paper,P.c2,.5),a:a('nic'),shadow:false});
    for(let c=0;c<2;c++)R.box(S.cpu(c),[.7,.18,.7],{fill:mix(P.paper,P.mute,.35),a:a('cpu'),shadow:false})}
  // the links inside one server: NVLink from each GPU to the switch row, PCIe from each GPU to its PCIe switch, PCIe switch to NICs and CPUs
  const top=p=>[p[0],p[1]+.2,p[2]];
  function links(R,S,bw,A){const P=R.P;A=A||{};const a=k=>A[k]==null?0:A[k];
    if(a('nvl')>.01)for(let g=0;g<8;g++){const c=S.gpu(g),s=S.nvs(Math.floor(g/2));pipe(R,[c[0],.3,c[2]],[c[0],.3,s[2]],bw.nvl,{c:P.c3,a:a('nvl')})}
    if(a('pcie')>.01){for(let g=0;g<8;g++){const c=S.gpu(g),p=S.pci(Math.floor(g/2)),n=S.nic(g);pipe(R,[c[0],.2,c[2]],top(p),bw.pcie,{c:P.c5,a:a('pcie')});pipe(R,top(p),top(n),bw.pcie,{c:P.c5,a:a('pcie')})}
      for(let p=0;p<4;p++)pipe(R,top(S.pci(p)),top(S.cpu(p<2?0:1)),bw.pcie,{c:P.c5,a:a('pcie')*.6})}}
  return {K,D,XG,XS,YL,YS,XSP,server,leaf,spine,pipe,drawServer,links,top};
})();
