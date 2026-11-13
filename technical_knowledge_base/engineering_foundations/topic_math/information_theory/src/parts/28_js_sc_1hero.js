// ---- Scene, Fig. 1 (the idea in one screen): the cross-entropy H(p, q) of every bet q over cat, dog, sat against one target p (renderer v2) ----
// Target p = (cat 0, dog 0.2, sat 0.8), the illustrative soft target of section 3; q = the tiny model's bet softmax(2, 1, 0).
// Heights in nats from IT.CE and IT.H; the descent path is gradient descent on the scores, z <- z - (q - p), step size 1, 40 steps (illustrative).
(function(){
  if(!document.getElementById('stg-hero')||!window.ITS)return;const S=ITS,{mix,lerp}=S3,E=Math.E;
  const p=[0,.2,.8],q0=IT.softmax([2,1,0]),Hp=IT.H(p,E),ce=q=>IT.CE(p,q,E),SY=.5,CAP=4.5;
  const M=S.mesh(ce,25),path=[];{let z=[2,1,0];for(let k=0;k<=40;k++){const q=IT.softmax(z);path.push(q);z=z.map((v,i)=>v-(q[i]-p[i]))}}
  const CE0=ce(q0),KL0=CE0-Hp,qe=path[path.length-1],KLe=ce(qe)-Hp;
  window.IT_HERO={Hp,CE0,KL0,KLe};
  function draw(R,k,e){const P=R.P;R.grid(-3.2,3.2,-3,2.2,.5);
    const grow=k===0?0:k===1?e:1;S.tri(R,{a:1,hide:k===3?[0,1,2]:[]});
    // the target and the tiny model's bet, on the floor in step 1, on the surface after
    const hq=ce(q0)*SY*grow,hp=Hp*SY*grow,pp=S.at(p,hp),pq=S.at(q0,hq);
    if(grow>0)S.surf(R,M,SY,{c:P.c4,grow,cap:CAP,lo:Hp,hi:CAP,a:k>=3?.55:.85,fa:.86});
    R.ball(pp,.09,{c:P.c1,top:1});R.glow(pp,.3,{c:P.c1,top:1,a:.6});
    R.label(pp,k===0?'target p · sat 0.8, dog 0.2':'target p',{al:'left',dx:12,dy:k===0?4:-2,fs:12.5,b:1,c:P.c1});
    if(k<4){R.ball(pq,.09,{c:P.c2,top:1});if(k!==3)R.label(pq,k===0?'tiny model q · (0.665, 0.245, 0.090)':k===1?'q · '+(CE0*grow).toFixed(3)+' nats':'q · '+CE0.toFixed(3),{al:'right',dx:-12,dy:-6,fs:12.5,b:1,c:P.c2})}
    if(k>=1&&k<4&&grow>.2)R.line([S.at(q0,0),pq],{c:P.c2,w:1.2,dash:[3,3],a:grow});
    // 3. the floor: a glass plane at H(p), touched only at q = p
    const fa=k===2?e:k>2?1:0;
    if(fa>0){const cs=[[1,0,0],[0,1,0],[0,0,1]].map(c=>S.at(c,Hp*SY));R.quad(cs,{fill:P.c1,a:fa,fa:.22,ec:P.c1,ea:.9,lw:1.4,dz:50});
      R.label(S.at([0,1,0],Hp*SY),'floor H(p) = '+Hp.toFixed(3)+' nats',{al:'left',dx:10,dy:4,fs:12.5,b:1,c:P.c1,a:fa,wide:k===3?1:0})}
    // 4. the gap above the bet: floor part and KL part as one column
    const ca=k===3?e:k>3?.35:0;
    if(ca>0){const b=S.at(q0,0);R.box(b,[.22,Hp*SY,.22],{fill:P.c1,a:ca,shadow:false});R.box([b[0],Hp*SY,b[2]],[.22,KL0*SY*(k===3?e:1),.22],{fill:P.c2,a:ca,shadow:false});
      if(k===3){R.label([b[0],Hp*SY*.5,b[2]],'H(p) · '+Hp.toFixed(3),{al:'left',dx:16,fs:12.5,b:1,c:P.c1,a:e});
        R.label([b[0],Hp*SY+KL0*SY*.55,b[2]],'KL(p ‖ q) · '+KL0.toFixed(3),{al:'left',dx:16,fs:12.5,b:1,c:P.c2,a:e});
        R.label([b[0],CE0*SY,b[2]],'H(p, q) · '+CE0.toFixed(3),{al:'right',dx:-14,dy:-8,fs:12.5,b:1,a:e})}}
    // 5. training walks the bet downhill to p: the KL goes, the floor stays
    if(k===4){const pts=S.lift(path,ce,SY,.06),n=Math.max(2,Math.round(e*pts.length));R.line(pts.slice(0,n),{c:P.c2,w:2.6,top:1});
      R.flow(pts,{c:P.c2,r:.07,speed:1.2,n:9,top:1,a:e});const cur=pts[n-1];R.ball(cur,.09,{c:P.c2,top:1});
      R.label(pts[0],'start · KL '+KL0.toFixed(3),{al:'right',dx:-12,dy:-6,fs:12.5,b:1,c:P.c2});
      if(e>.7)R.label(cur,'after 40 steps · KL '+KLe.toFixed(3),{al:'left',dx:12,dy:-14,fs:12.5,b:1,c:P.c2,a:(e-.7)/.3})}
  }
  const full={cam:[Math.PI-.42,.62],bounds:[[-2.6,0,-2.6],[2.6,2.3,1.6]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the loss over every bet',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,16,14,16],
    view:k=>k===3?{cam:[Math.PI-.75,.45],bounds:(()=>{const b=S.at(q0,0);return [[b[0]-1.3,0,b[2]-1.2],[b[0]+1.3,CE0*SY+.1,b[2]+1.2]]})()}:null});
})();
