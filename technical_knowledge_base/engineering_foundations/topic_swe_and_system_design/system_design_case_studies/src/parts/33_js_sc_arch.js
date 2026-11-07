// ---- Scenes: the seven designs built step by step in 3D (renderer v2, 25_js_s3.js), one shared architecture stage driven by each design's spec ----
// window.DESIGN_SPECS (26_js_designs.js) gives the lanes, the parts with the step each appears and leaves, the edges, which parts are the
// bottleneck at each step and the counters; the numbers drawn come from EST_EXPECT (recompute.py) and MEAS (inputs/pg_measured.json).
// Parts by kind: clients as phones, a load balancer as a low slab, services as blocks, fleets as three blocks, caches as upright glass plates,
// queues as a rail of slabs, stores as stacks, shards as three small stacks. Requests flow as dots along the edges; a bottleneck turns red and
// the camera moves in close to it; what a fix adds turns green. Each design adds its own layer (code space, the race, fan-out, the burst).
window.ARCH=(function(){
  if(!window.S3||!window.DESIGN_SPECS||!window.EST_EXPECT)return null;
  const {mix,lerp3,cl}=S3,E=window.EST_EXPECT,F=RD.fmt,XS=2.5,ZS=1.9;
  // a label only when its anchor is on the canvas (a close view leaves parts out, and the renderer would pile their names at the edge)
  function lab(R,p,text,o){if(text==null||text==='')return;const q=R.p(p);if(q[2]<=0||q[0]<-4||q[0]>R.W+4||q[1]<-4||q[1]>R.H+4)return;R.label(p,text,o)}
  const arcPts=(R,a,b,h,n,t0,t1)=>{const o=[];n=n||22;t0=t0||0;t1=t1==null?1:t1;for(let i=0;i<=n;i++)o.push(R.arcPt(a,b,h,t0+(t1-t0)*i/n));return o};
  const win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  // the colour each kind of part is tinted with
  const KC={cli:P=>P.mute,lb:P=>P.c1,svc:P=>P.c1,multi:P=>P.c1,cache:P=>P.c5,queue:P=>P.c4,store:P=>P.c6,shards:P=>P.c6,cfg:P=>P.mute,model:P=>P.c4};
  // draw one part; returns the height its name sits at. sub: sub-positions of a fleet or the phones, for the design layers
  function part(R,n,a,hot,nw){const P=R.P,[x,,z]=n.p,base=KC[n.kind](P);
    let fill=mix(P.paper,base,n.kind==='cli'?.12:.22);fill=mix(fill,mix(P.paper,P.bad,.62),hot);fill=mix(fill,mix(P.paper,P.good,.6),nw*(1-hot));
    const gc=hot>0?P.bad:P.good,ga=Math.max(hot,nw);if(ga>.01)R.glow([x,.3,z],1.0,{c:gc,a:a*ga*.45});
    const o={fill,a};let h=.55;
    if(n.kind==='svc'||n.kind==='model')R.box([x,0,z],[1.15,.55,.8],o);
    else if(n.kind==='multi'){h=.45;[-.5,0,.5].forEach(dz=>R.box([x,0,z+dz],[1.0,.45,.36],o))}
    else if(n.kind==='cli'){h=.62;[-.46,0,.46].forEach(dx=>R.box([x+dx,0,z],[.32,.62,.14],o))}
    else if(n.kind==='lb'){h=.18;R.box([x,0,z],[1.2,.18,1.0],o)}
    else if(n.kind==='cfg'){h=.28;R.box([x,0,z],[.9,.28,.6],o)}
    else if(n.kind==='cache'){h=.95;R.box([x,0,z],[1.25,.06,.34],{fill:P.paper,a});const gcol=mix(mix(base,P.bad,hot),P.good,nw*(1-hot));
      R.glass([x-.55,.06,z],[1.1,0,0],[0,.88,0],{c:gcol,a,nu:5,nv:3,th:.04})}
    else if(n.kind==='queue'){h=.42;for(let i=0;i<5;i++)R.box([x-.5+i*.25,0,z],[.17,.42,.5],o)}
    else if(n.kind==='store'){h=0;for(let i=0;i<4;i++){R.box([x,h,z],[1.1,.1,.8],Object.assign({},o,{shadow:i===0,lw:.7}));h+=.14}}
    else if(n.kind==='shards'){h=.42;[-.62,0,.62].forEach(dx=>{let y=0;for(let i=0;i<3;i++){R.box([x+dx,y,z],[.5,.1,.6],Object.assign({},o,{shadow:i===0,lw:.7}));y+=.14}})}
    return h}
  function subPos(n){const [x,,z]=n.p;if(n.kind==='multi')return [-.5,0,.5].map(dz=>[x,.3,z+dz]);if(n.kind==='cli')return [-.46,0,.46].map(dx=>[x+dx,.4,z]);return [[x,.3,z]]}
  function mount(d,cfg){
    const id='stg-'+d,sp=window.DESIGN_SPECS[d];if(!document.getElementById(id)||!sp)return null;cfg=cfg||{};
    const L=sp.lanes.length,rows=Math.max(...sp.nodes.map(n=>n.r))+1,X=c=>(c-(L-1)/2)*XS,Z=r=>.6-r*ZS,byId={};
    sp.nodes.forEach(n=>{byId[n.id]=n;n.kind=(cfg.kinds||{})[n.id]||(n.kind==='store'?'store':'svc');n.p=[X(n.c)+(n.dx||0),0,Z(n.r)+(n.dz||0)]});
    let api=null;const N=sp.steps.length,hotAt=k=>new Set((sp.steps[k]||{}).hot||[]);
    const alpha=(n,k,e)=>{if(n.out!==undefined&&k>=n.out)return k===n.out?1-e:0;if(n.in>k)return 0;if(n.in===k&&k>0)return e;return 1};
    const B0=[[X(0)-1.3,0,Z(rows-1)-.9],[X(L-1)+1.3,.6,1.7]],full=cfg.full||{cam:[.12,.9],bounds:cfg.bounds||B0};
    const ctx={byId,X,Z,lab,arcPts,win,subPos,E,F};
    function draw(R,k,e,st){const P=R.P,narrow=R.W<520,hk=hotAt(k),hp=hotAt(st?st.pk:k),fx=sp.steps[k].k==='fix';
      R.grid(B0[0][0]-.6,B0[1][0]+.6,(cfg.bounds||B0)[0][2]-.6,2.2,.5);
      // lanes as faint strips on the floor, their names in front (wide screens; the step text names the parts on a phone)
      sp.lanes.forEach((ln,i)=>{const x=X(i),z0=(cfg.bounds||B0)[0][2]+.2,z1=1.45;
        R.quad([[x-1.18,.001,z0],[x+1.18,.001,z0],[x+1.18,.001,z1],[x-1.18,.001,z1]],{fill:P.dark?mix(P.card,P.ink,.06):mix(P.card,P.ink,.035),edge:false,dz:1e4});
        if(!view(k)&&!narrow)lab(R,[x,0,z1+.1],ln,{fs:12,mono:1,c:P.mute,dy:10,wide:1})});
      const A={},H={},hot={},nw={};
      sp.nodes.forEach(n=>{A[n.id]=alpha(n,k,e);hot[n.id]=hk.has(n.id)?(hp.has(n.id)&&st&&st.pk!==k?1:e):0;nw[n.id]=fx&&n.in===k?e:0});
      ctx.A=A;ctx.hot=hot;
      // edges: a faint line and, unless dashed (configuration), dots flowing from a to b; red into a bottleneck
      (sp.edges||[]).forEach(ed=>{const a=byId[ed.a],b=byId[ed.b];if(!a||!b)return;if(ed.in!==undefined&&ed.in>k)return;if(ed.out!==undefined&&k>=ed.out)return;
        const ea=Math.min(A[a.id],A[b.id]);if(ea<=.01)return;
        const pa=[a.p[0],.32,a.p[2]],pb=[b.p[0],.32,b.p[2]],dist=Math.hypot(pb[0]-pa[0],pb[2]-pa[2]),skip=Math.abs(a.c-b.c)>1||(a.c===b.c);
        const h=skip?.45+.12*dist:.12,t0=Math.min(.45,.55/dist),pts=arcPts(R,pa,pb,h,22,t0,1-t0);
        R.line(pts,{c:P.mute,w:1.1,a:ea*.4,dash:ed.d?[4,4]:null});
        if(!ed.d&&!(cfg.noFlow&&cfg.noFlow(k,ed))){R.flow(pts,{c:hot[b.id]>.5?P.bad:P.acc,a:ea*.85,r:.06,speed:1.2,n:Math.max(3,Math.round(dist*1.6*(ed.w||1)))})}});
      // parts and their names (on a phone only the parts a step is about are named)
      sp.nodes.forEach(n=>{const a=A[n.id];if(a<=.01)return;const h=part(R,n,a,hot[n.id],nw[n.id]);H[n.id]=h;
        const focus=hot[n.id]>.01||nw[n.id]>.01;if(narrow&&!focus&&k>0)return; // the naive design has few parts, so a phone names them all
        const top=[n.p[0],h,n.p[2]-(n.kind==='multi'?.5:0)],c=hot[n.id]>.5?P.bad:nw[n.id]>.5?P.good:P.ink;
        const la=win(a,.5,1);lab(R,top,n.l,{b:1,fs:12.5,dy:-11,c,a:la}); // a part that replaces another: the old name goes in the first half of the step, the new one comes in the second, so they never overlap
        if(focus&&n.s&&!narrow)lab(R,top,n.s,{fs:12,dy:-27,c:P.mute,a:la*Math.max(hot[n.id],nw[n.id])})});
      ctx.H=H;
      if(cfg.layer)cfg.layer(R,k,e,ctx,st)}
    // a bottleneck step moves the camera in close to the parts it is about; the other steps show the whole design
    // on a phone the camera looks along the lanes (the design recedes into depth and fills the tall canvas) and every step about some parts moves in close to them
    function view(k){const s=sp.steps[k],nar=api&&api.R&&api.R.W&&api.R.W<520;
      if(nar){const cv=cfg.view&&cfg.view(k);if(cv)return {cam:[.85,.78],bounds:cv.bounds};const ids=s.hot.length?s.hot:sp.nodes.filter(n=>n.in===k&&k>0).map(n=>n.id);if(!ids.length)return {cam:[.95,.8],bounds:full.bounds};
        const ps=ids.map(i=>byId[i].p);return {cam:[.85,.78],bounds:[[Math.min(...ps.map(p=>p[0]))-1.8,0,Math.min(...ps.map(p=>p[2]))-1.3],[Math.max(...ps.map(p=>p[0]))+1.8,.8,Math.max(...ps.map(p=>p[2]))+1.3]]}}
      if(cfg.view){const v=cfg.view(k);if(v!==undefined)return v}if(s.k!=='bad'||!s.hot.length)return null;
      const ps=s.hot.map(i=>byId[i].p),x0=Math.min(...ps.map(p=>p[0]))-2.0,x1=Math.max(...ps.map(p=>p[0]))+2.0,z0=Math.min(...ps.map(p=>p[2]))-1.4,z1=Math.max(...ps.map(p=>p[2]))+1.5;
      return {cam:[.18,.82],bounds:[[x0,0,z0],[x1,.8,z1]]}}
    const cnt=document.getElementById('cnt-'+d);
    function counters(i){if(!cnt)return;cnt.innerHTML=(sp.counters||[]).map(c=>{const v0=c.v[0],v=c.v[i],f=c.fmt||(x=>F(x)),changed=i>0&&v!==v0;
      return '<div class="stat"><div class="k">'+c.l+'</div><div class="v">'+(changed?'<s title="naive design">'+f(v0)+'</s>':'')+f(v)+'</div>'+(c.d?'<div class="d">'+c.d+'</div>':'')+'</div>'}).join('')}
    const st=api=S3.stage({id,list:'sx-'+d,fig:cfg.fig,cam:full.cam,bounds:full.bounds,aspect:cfg.aspect||.5,dur:1400,hold:cfg.hold||5200,draw,view,
      margin:w=>w<520?[26,8,22,8]:[34,14,26,14],onStep:k=>{try{counters(k)}catch(err){}}});
    (window.SC_STAGES=window.SC_STAGES||{})[d]=st;return st}
  // for src/check_stages.mjs: pairs of drawn labels (alpha above .3) whose boxes overlap on the canvas of design d, as last drawn
  function overlaps(d){const st=(window.SC_STAGES||{})[d];if(!st||!st.R.lab)return [];const cx=st.R.cx,out=[],bx=st.R.lab.filter(L=>L.a>.3).map(L=>{const o=L.o,fs=Math.max(12,o.fs||12.5);
      cx.font=(o.b?'600 ':'')+fs+'px '+(o.mono?'ui-monospace,Menlo,monospace':'ui-sans-serif,Helvetica,Arial,sans-serif');const w=cx.measureText(L.text).width,x0=o.al==='right'?L.x-w:o.al==='left'?L.x:L.x-w/2;
      return {t:L.text,x0,x1:x0+w,y0:L.y-fs/2,y1:L.y+fs/2}});
    for(let i=0;i<bx.length;i++)for(let j=i+1;j<bx.length;j++){const a=bx[i],b=bx[j];if(a.x0<b.x1-1&&b.x0<a.x1-1&&a.y0<b.y1-1&&b.y0<a.y1-1)out.push(a.t+' / '+b.t)}return out}
  return {mount,overlaps,lab,arcPts,win,subPos,part};
})();
