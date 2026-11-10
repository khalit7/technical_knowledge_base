// ---- Scene (2 Decision trees, Fig. 1): one CART tree grown depth by depth on the real tumours (renderer v2) ----
// The floor is the feature plane (mean radius across, mean texture in depth, both standardised); every leaf is a column over its box,
// as tall as the leaf's share of malignant training tumours (its prediction), tinted from benign orange to malignant blue.
// Each of the 398 training tumours rides on top of its leaf. Trees are this page's ML.tree (identical to scikit-learn's at every depth).
// The step list's numbers are written here from the same fits (check_stages.mjs compares the static text with them).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-tr')||!window.S3||!window.ML||!window.CD)return;const {at,lerp,mix}=S3;
  const d=CD.lab.cancer,X=d.Xtr,y=d.ytr,DS=[0,1,2,3,4,6,null];
  const B0=[-2.25,4.2,-2.45,4.75],S=.78,CX=(B0[0]+B0[1])/2,CY=(B0[2]+B0[3])/2,HT=1.25;
  const wx=v=>(v-CX)*S,wz=v=>-(v-CY)*S;
  const acc=(f,A,b)=>A.filter((x,i)=>(f(x)>=.5?1:0)===b[i]).length/A.length;
  const maj=y.reduce((a,b)=>a+b,0)/y.length;
  let M=null;
  // leaves (box, value) and splits (box, feature, threshold, depth) of a fitted tree
  function parts(t){const L=[],Sp=[];(function rec(k,b){const n=t.nodes[k];if(n.leaf){L.push({b,v:n.value,n:n.ns});return}
      const l=b.slice(),r=b.slice();if(n.f===0){l[1]=n.th;r[0]=n.th}else{l[3]=n.th;r[2]=n.th}Sp.push({b,f:n.f,th:n.th,dep:n.depth});rec(n.l,l);rec(n.r,r)})(0,B0.slice());return {L,Sp}}
  function fits(){if(M)return M;M=DS.map(k=>{if(k===0){const f=()=>maj;return {f,L:[{b:B0.slice(),v:maj,n:X.length}],Sp:[],leaves:1,train:acc(f,X,y),test:acc(f,d.Xte,d.yte)}}
      const t=ML.tree(X,y,null,{maxDepth:k}),f=x=>t.predict(x),p=parts(t);return {t,f,L:p.L,Sp:p.Sp,leaves:t.leaves(),train:acc(f,X,y),test:acc(f,d.Xte,d.yte)}});
    return M}
  const pct=v=>(100*v).toFixed(1)+'%';
  function writeList(){const F=fits(),set=(k,v)=>document.querySelectorAll('[data-tr="'+k+'"]').forEach(e=>e.textContent=v),r=F[1].t.nodes[0];
    set('p0',Math.round(100*maj)+'%');set('n',String(X.length));set('g0',r.imp.toFixed(3));set('g1',(r.imp-r.gain).toFixed(3));set('th',r.th.toFixed(2));
    set('vl',Math.round(100*F[1].t.nodes[r.l].value)+'%');set('vr',Math.round(100*F[1].t.nodes[r.r].value)+'%');
    F.forEach((m,i)=>{set('l'+i,String(m.leaves));set('tr'+i,pct(m.train));set('te'+i,pct(m.test))})}
  writeList();
  function tint(P,v){return mix(mix(P.c2,P.c1,v),P.paper,.18)}
  function draw(R,k,e){const P=R.P,F=fits(),m=F[k],pm=F[Math.max(0,k-1)],narrow=R.W<520;R.grid(-3.4,3.4,-3.6,3.6,.5);
    // the feature plane
    R.quad([[wx(B0[0]),0,wz(B0[2])],[wx(B0[1]),0,wz(B0[2])],[wx(B0[1]),0,wz(B0[3])],[wx(B0[0]),0,wz(B0[3])]],{fill:mix(P.paper,P.mute,.06),fa:.6,ea:.45,lw:1,dz:100});
    R.label([0,0,wz(B0[2])+.35],'mean radius',{mono:true,fs:12,c:P.mute,dy:10});
    R.label([wx(B0[0])-.25,0,0],'mean texture',{mono:true,fs:12,c:P.mute,al:'right',dx:-4,wide:1});
    // the columns: one per leaf, rising from the parent's prediction to the leaf's own
    const many=m.L.length>30;
    m.L.forEach(l=>{const b=l.b,cx=(b[0]+b[1])/2,cz=(b[2]+b[3])/2,v0=k===0?0:pm.f([cx,cz]),v=lerp(v0,l.v,e),h=Math.max(.02,v*HT),g=.012;
      R.box([wx(cx),0,wz(cz)],[(b[1]-b[0])*S-g,h,(b[3]-b[2])*S-g],{fill:tint(P,v),fa:.78,lw:.7,shadow:!many})});
    // split lines on the floor: earlier splits faint, this step's new ones in the highlight colour, as a glass wall that fades to a line
    const nd=k===0?-1:DS[k]==null?6:DS[k]-1,od=k<=1?-1:DS[k-1]-1;
    m.Sp.forEach(s=>{const b=s.b,isNew=s.dep>od,pts=s.f===0?[[wx(s.th),.005,wz(b[2])],[wx(s.th),.005,wz(b[3])]]:[[wx(b[0]),.005,wz(s.th)],[wx(b[1]),.005,wz(s.th)]];
      if(!isNew){R.line(pts,{c:P.ink,w:1,a:.35});return}
      R.line(pts,{c:P.acc,w:2,a:.4+.6*e,top:1});
      if(k<=3){const hw=HT*1.05*(1-.0*e);const u=s.f===0?[0,0,wz(b[3])-wz(b[2])]:[(b[1]-b[0])*S,0,0],o0=s.f===0?[wx(s.th),0,wz(b[2])]:[wx(b[0]),0,wz(s.th)];
        R.glass(o0,u,[0,hw,0],{c:P.acc,a:.75*Math.sin(Math.PI*Math.min(1,e*1.2))+.0,nu:4,nv:3,th:.01})}});
    // the training tumours riding on their leaves; they drop through the new cut onto their side
    X.forEach((x,i)=>{const v0=k===0?0:pm.f(x),v=lerp(v0,m.f(x),e),pos=[wx(x[0]),Math.max(.02,v*HT)+.05,wz(x[1])];R.ball(pos,.045,{c:y[i]?P.c1:P.c2,a:.95,top:1})});
    // labels on the first steps only (the step list names the rest)
    if(k===0)R.label([wx(CX),maj*HT+.1,wz(B0[3])+.4],'one leaf · '+Math.round(100*maj)+'% malignant',{fs:13,b:1,c:P.ink,a:e,dy:-12});
    if(k===1){const r=F[1].t.nodes[0],L=F[1].t.nodes[r.l],Rn=F[1].t.nodes[r.r];
      R.label([wx(r.th),HT*1.05,wz(B0[3])],'mean radius ≤ '+r.th.toFixed(2)+'?',{mono:true,fs:12.5,b:1,c:P.acc,dy:-10,a:e});
      R.label([wx((B0[0]+r.th)/2),L.value*HT+.1,wz(B0[2])],Math.round(100*L.value)+'% malignant',{fs:12.5,b:1,c:mix(P.ink,P.c2,.5),dy:16,a:e});
      R.label([wx((r.th+B0[1])/2),Rn.value*HT+.1,wz(B0[2])],Math.round(100*Rn.value)+'% malignant',{fs:12.5,b:1,c:mix(P.ink,P.c1,.5),dy:16,a:e})}
    if(k===DS.length-1&&!narrow)R.label([wx(B0[1]),HT,wz(B0[3])],m.leaves+' pure leaves',{fs:12.5,b:1,c:P.ink,al:'left',dx:6,a:e});
  }
  const full={cam:[-.62,.66],bounds:[[-2.7,0,-3],[2.7,1.4,3]]};
  S3.stage({id:'stg-tr',list:'sx-tr',fig:'Fig. 1 · a tree grown depth by depth on real tumours',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[22,18,14,18],
    view:k=>k===DS.length-1?{cam:[-.85,.5],bounds:[[-2.6,0,-2.8],[2.6,1.3,2.8]]}:full,
    onStep:k=>{if(window.CMLtd)window.CMLtd(DS[k])}});
})();
