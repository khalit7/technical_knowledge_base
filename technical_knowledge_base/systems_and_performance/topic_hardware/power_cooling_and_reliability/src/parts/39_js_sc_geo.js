// ---- Shared geometry for Fig. 1 (power in) and Fig. 2 (heat out): a GB200 NVL72 rack as the DGX GB200 user guide lists it
// (18 compute trays of 2 Grace CPUs and 4 Blackwell GPUs, 9 NVLink switch trays, 8 power shelves feeding a DC busbar, liquid manifolds
// for the compute trays). The order of the trays, the shelves' positions and the layout inside a tray are drawn for illustration.
// World units are not metres; the rack is drawn for position, not to scale. ----
window.PWG=(function(){
  if(!window.S3)return null;
  const {mix}=S3;
  const W=1.0,D=1.6,H=3.6,PITCH=(H-.2)/35;
  // bottom to top: 4 power shelves, 9 compute trays, 9 NVLink switch trays, 9 compute trays, 4 power shelves
  const KIND=[];for(let i=0;i<35;i++)KIND.push(i<4||i>=31?'psu':i>=13&&i<22?'sw':'cpt');
  const PULL=26; // the compute tray Fig. 1 pulls out
  const ySlab=i=>.1+i*PITCH;
  // a pipe whose drawn width is set by a world diameter d (so it keeps its proportion when the camera moves in)
  function pipe(R,a,b,d,o){o=o||{};const al=o.a==null?1:o.a;if(al<=.01)return;const P=R.P,m=[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],w=Math.max(1.2,R.px(m,d)),c=o.c||P.ink;
    R.line([a,b],{c:mix(P.paper,c,P.dark?.75:.55),w,a:al*.9,dz:o.dz});R.line([a,b],{c,w:Math.max(.8,w*.28),a:al*.5,dz:(o.dz||0)-.001})}
  function polyPipe(R,pts,d,o){for(let i=1;i<pts.length;i++)pipe(R,pts[i-1],pts[i],d,o)}
  // the rack at centre c (x, z) of its floor; A: alpha of the frame, shelves, trays (cpt, sw), busbar, manifolds; pull: how far tray PULL slides out (0..1);
  // heat: 0..1 warm glow on the compute trays; cold: 0..1 cold plates on the pulled tray
  function rack(R,c,A){const P=R.P;A=A||{};const a=k=>A[k]==null?1:A[k],x=c[0],z=c[1],pz=(A.pull||0)*1.5;
    R.box([x,0,z],[W+.12,.1,D+.12],{fill:mix(P.paper,P.ink,.12),a:a('frame')});
    // posts at the four corners and a roof
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>R.box([x+sx*(W/2+.03),.1,z+sz*(D/2+.03)],[.05,H-.1,.05],{fill:mix(P.paper,P.ink,.25),a:a('frame'),shadow:false}));
    R.box([x,H,z],[W+.12,.06,D+.12],{fill:mix(P.paper,P.ink,.1),a:a('frame'),shadow:false});
    for(let i=0;i<35;i++){const k=KIND[i],y=ySlab(i),out=i===PULL?pz:0;
      const fill=k==='psu'?mix(P.paper,P.c5,.6):k==='sw'?mix(P.paper,P.c6,.45):mix(P.paper,P.acc,.22);
      const al=k==='psu'?a('psu'):k==='sw'?a('sw'):a('cpt')*(i===PULL&&A.hlTray?1:1);
      R.box([x,y,z+out],[W,PITCH*.78,D],{fill:i===PULL&&A.hlTray?mix(P.paper,P.acc,.55):fill,a:al,shadow:false,lw:.6,ea:.5});
      if(k==='cpt'&&(A.heat||0)>.01&&i!==PULL)R.glow([x,y+PITCH*.4,z+D/2],.32,{c:P.bad,a:A.heat*.55})}
    // the busbar on the right side, near the back
    R.box([x+W/2+.06,.1,z-D/2+.22],[.07,H-.2,.14],{fill:mix(P.paper,P.c5,.9),a:a('bus'),shadow:false});
    // liquid manifolds on the right side, behind the busbar: hot (to the CDU) and cold (from it)
    R.box([x+W/2+.06,.1,z-D/2+.5],[.06,H-.3,.06],{fill:mix(P.paper,P.bad,.75),a:a('man'),shadow:false});
    R.box([x+W/2+.06,.1,z-D/2+.66],[.06,H-.3,.06],{fill:mix(P.paper,P.c1,.75),a:a('man'),shadow:false});
    // the pulled tray's contents: 4 GPUs at the front, 2 CPUs behind them (layout illustrative); cold plates when A.cold
    if(pz>.05){const y=ySlab(PULL)+PITCH*.78,zt=z+pz;
      gpus(x,zt).forEach(g=>{R.box([g[0],y,g[2]],[.2,.07,.24],{fill:mix(P.paper,P.acc,.7),a:a('cpt'),shadow:false});
        if((A.cold||0)>.01)R.glass([g[0]-.12,y+.075,g[2]-.14],[.24,0,0],[0,0,.28],{c:P.c1,a:A.cold,nu:3,nv:3,th:.03})});
      cpus(x,zt).forEach(g=>{R.box([g[0],y,g[2]],[.18,.06,.18],{fill:mix(P.paper,P.mute,.45),a:a('cpt'),shadow:false});
        if((A.cold||0)>.01)R.glass([g[0]-.1,y+.065,g[2]-.1],[.2,0,0],[0,0,.2],{c:P.c1,a:A.cold,nu:2,nv:2,th:.03})})}}
  const gpus=(x,zt)=>[[x-.24,0,zt+.5],[x+.24,0,zt+.5],[x-.24,0,zt+.18],[x+.24,0,zt+.18]];
  const cpus=(x,zt)=>[[x-.24,0,zt-.35],[x+.24,0,zt-.35]];
  return {W,D,H,PITCH,KIND,PULL,ySlab,pipe,polyPipe,rack,gpus,cpus};
})();
