// ---- Scene, section 2 (Fig. 2): the toy bank assistant's eight requests through a radix tree with a 40-slot KV pool (renderer v2).
// Data: window.SGTOY (40_js_sc_00toy.js), the page's checked radix cache run request by request. Each node is a slab laid along the
// token positions it covers (x) and fanned out in depth by branch (z); the pool's 40 slots stand behind it. Green: the path the request
// matched (locked while it runs); blue: nodes created for it; red ghosts: least recently used leaves evicted to make room.
// A strip in front is the request's prompt, one cube per token, green where it was found cached. ----
(function(){
  if(!document.getElementById('stg-tree')||!window.SGTOY)return;const {at,off,lerp,mix}=S3;
  const T=SGTOY,REQ=T.reqs,CAP=T.CAP;
  // steps: which requests each step plays (the last step shows the whole tree)
  const GROUPS=[[0],[1],[2],[3],[4,5],[6,7],[]];
  const U=.42,XO=-.2,ZF=3.2,ZP=-3.6,SL=.36,x=p=>XO+p*U,sx=s=>XO+(s%20)*SL*1.2,sz=s=>ZP-Math.floor(s/20)*.55;
  // tree layout: leaves get their own row in depth, a parent sits at the mean of its children
  function layout(nodes){const kids=new Map(),pos=new Map();nodes.forEach(n=>{if(!kids.has(n.par))kids.set(n.par,[]);kids.get(n.par).push(n)});
    let leaf=0;const z=n=>{if(pos.has(n.id))return pos.get(n.id);const ch=kids.get(n.id)||[];const v=ch.length?ch.map(z).reduce((a,b)=>a+b,0)/ch.length:leaf++;pos.set(n.id,v);return v};
    (kids.get(-1)||[]).forEach(z);const m=Math.max(1,leaf-1);const out=new Map();nodes.forEach(n=>out.set(n.id,{n,z:2.0-pos.get(n.id)*Math.min(1.3,4.4/m)}));return out}
  const snapAt=k=>{const g=GROUPS[k];const last=g.length?g[g.length-1]:REQ.length-1;return REQ[last].after};
  const L=GROUPS.map((g,k)=>layout(snapAt(k).nodes));
  function slab(R,o,a,fill,ec,lw){R.box([(x(o.n.start)+x(o.n.start+o.n.len))/2,0,o.z],[o.n.len*U-.08,.3,.5],{fill,a,ec,lw:lw||.8})}
  function draw(R,k,e){const P=R.P;R.grid(-1.6,9.6,-4.6,3.6,.5);
    const g=GROUPS[k],cur=L[k],prev=k?L[k-1]:null,last=!g.length;
    const path=new Set(),made=new Set(),gone=[];
    g.forEach(i=>{const r=REQ[i];r.path.forEach(id=>path.add(id));
      const before=new Set((i?REQ[i-1].after.nodes:[]).map(n=>n.id));r.after.nodes.forEach(n=>{if(!before.has(n.id)&&!r.path.includes(n.id))made.add(n.id)});
      r.evicted.forEach(ev=>{const o=(prev&&prev.get(ev.id))||(i?layout(REQ[i-1].after.nodes).get(ev.id):null)||layout(r.mid.nodes).get(ev.id);if(o)gone.push(o)})});
    // the nodes: positions glide from the last step's layout; nodes the step is not about recede
    cur.forEach((o,id)=>{const p=prev&&prev.get(id),z=p?lerp(p.z,o.z,e):o.z,q={n:o.n,z};
      const hp=path.has(id),hn=made.has(id),a=last?1:hp||hn?1:.3,fill=hp?mix(P.paper,P.good,.7):hn?mix(P.paper,P.acc,.6):P.paper;
      slab(R,q,hn&&!p?Math.min(1,e*1.6)*a:a,fill,hp?P.good:null,hp?1.4:.8);
      const pa=cur.get(o.n.par);if(pa){const pz=prev&&prev.get(o.n.par)?lerp(prev.get(o.n.par).z,pa.z,e):pa.z;
        R.line([[x(o.n.start)-.04,.15,pz],[x(o.n.start)-.04,.15,z],[x(o.n.start)+.04,.15,z]],{c:hp?P.good:P.mute,w:hp?2:1,a:last?.8:hp?.9:.35})}
      if((hp||hn)&&!last||last&&o.n.len>=3)R.label([x(o.n.start+o.n.len/2),.3,z],o.n.text,{fs:12,dy:-10,c:hp?P.good:hn?P.acc:P.ink,a:last?.85:1,b:hp||hn,grp:'nodes'})});
    // evicted leaves: red ghosts that fade during the step, their slots streaming back to the free pool
    gone.forEach(o=>{slab(R,o,.85*(1-e*.6),mix(P.paper,P.bad,.35),P.bad,1.2);R.label([x(o.n.start+o.n.len/2),.3,o.z],'evicted · '+o.n.text,{fs:12,dy:-10,c:P.bad,b:1,grp:'nodes'});
      o.n.slots.forEach((s,j)=>{if(j%2)return;R.flowArc([x(o.n.start+o.n.len/2),.3,o.z],[sx(s),.3,sz(s)],.6,{c:P.bad,r:.04,n:3,speed:1.4,a:1-e*.5})})});
    // the KV pool: 40 slots; a held slot is filled, a slot of a highlighted node takes its colour
    const own=REQ[last?REQ.length-1:g[g.length-1]].after.owner,col={};cur.forEach((o,id)=>{o.n.slots.forEach(s=>col[s]=path.has(id)?'good':made.has(id)?'acc':'held')});
    for(let s=0;s<CAP;s++){const c=col[s],held=own[s]>=0;
      R.box([sx(s),0,sz(s)],[SL,held?.3:.06,.4],{fill:c==='good'?mix(P.paper,P.good,.7):c==='acc'?mix(P.paper,P.acc,.6):held?mix(P.paper,P.ink,.12):P.paper,a:held?1:.5,lw:.6,shadow:false})}
    const held=own.filter(v=>v>=0).length;
    R.label([sx(9.5),.3,sz(20)],'KV pool on the GPU · '+held+' of '+CAP+' slots hold KV',{dy:-24,fs:12.5,b:1,c:held>=CAP?P.bad:P.mute});
    // the tree points at the slots: arcs from each highlighted node to its slots, dots streaming while the KV is written
    cur.forEach((o,id)=>{if(!(path.has(id)||made.has(id))||last)return;const c=path.has(id)?P.good:P.acc;
      o.n.slots.forEach((s,j)=>{if(j%2&&o.n.slots.length>6)return;const a=[x(o.n.start+(j+.5)*o.n.len/o.n.slots.length),.0,o.z-.25],b=[sx(s),.3,sz(s)];
        if(made.has(id))R.flowArc(a,b,.5,{c,r:.04,n:3,speed:1.2,a:Math.min(1,e*1.5)})})});
    // the request in front: one cube per prompt token, green where it matched
    if(!last){const r=REQ[g[g.length-1]];for(let t=0;t<r.P;t++){const hit=t<r.hit;R.box([x(t+.5),0,ZF],[U*.8,.22,.32],{fill:hit?mix(P.paper,P.good,.75):mix(P.paper,P.acc,.6),a:Math.min(1,.3+e),lw:.6})}
      R.label([x(0)-.2,0,ZF],'R'+(r.i+1)+' ('+r.who+')',{al:'right',dx:-8,fs:12.5,b:1,c:P.ink});
      R.label([x(r.P)+.1,0,ZF],r.hit+' of '+r.P+' cached',{al:'left',dx:8,fs:12.5,b:1,c:P.good});
      if(r.hit)R.flowArc([x(r.hit/2),.22,ZF],[x(r.hit/2),.3,cur.get(r.path[0])?cur.get(r.path[0]).z:0],.4,{c:P.good,r:.05,n:5,speed:1.3,a:e})}
    else{let h=0,p=0;REQ.forEach(r=>{h+=r.hit;p+=r.P});R.label([x(0)-.2,0,ZF-.6],'eight requests: '+h+' of '+p+' prompt tokens reused · '+REQ[REQ.length-1].nodes+' nodes',{al:'left',fs:12.5,b:1,c:P.good})}
    R.label([x(0),0,ZF+.55],'token position →',{al:'left',fs:12,c:P.mute,wide:1});
  }
  const st=S3.stage({id:'stg-tree',list:'sx-tree',fig:'Fig. 2 · eight requests through a radix tree',cam:[-.12,1.02],bounds:[[-1.4,0,-4.5],[9.4,.6,3.6]],aspect:.72,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[20,24,18,110]});
  (window.SGSTG=window.SGSTG||{})['stg-tree']=st;
})();
