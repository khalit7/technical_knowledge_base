// ---- Scene (renderer v2, 2026-11-07): Fig. 5, the MRO of c1_mro.py (section 5) ----
// The class diamond lies on the floor (arrows from a class to its parents); C3 lifts it into one stack, Service.__mro__, which lookups and
// super() climb from the bottom; the run's printed lines appear beside each class as the call climbs. Then Logging's own, shorter stack, and
// the class C3 cannot order. Every class list and printed line is read from window.PA.out.c1_mro (outputs/c1_mro.txt, via pa/gen.py).
(function(){
  if(!document.getElementById('stg-mro')||!window.S3||!window.PA||!PA.out)return;const {lerp3,mix,cl,lerp}=S3;
  const O=PA.out.c1_mro.split('\n'),list=s=>JSON.parse(s.replace(/'/g,'"'));
  const MRO=list(O[0]),PR=O.slice(1,5),LM=list(O[5]),LPR=O.slice(6,8),ERR=O[8]||'';
  const L=(R,p,t,o)=>{if((o.a==null?1:o.a)>=.3)R.label(p,t,o)};
  const FLOOR={Service:[0,0,1.7],Logging:[-1.5,0,.45],Caching:[1.5,0,.45],Base:[0,0,-.8],object:[0,0,-2.05]};
  const PARENTS=[['Service','Logging'],['Service','Caching'],['Logging','Base'],['Caching','Base'],['Base','object']];
  const DY=.6,BX=[1.5,.36,.62],TX=0,T2=3.2;
  const towerPos=(i,x)=>[x,i*DY,0];
  function cls(R,p,nm,o){const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;
    R.box(p,BX,{fill:mix(P.paper,o.c||P.c1,o.hot?.55:.25),a,shadow:p[1]<.05});L(R,[p[0],p[1]+BX[1],p[2]],nm,{mono:true,fs:12.5,b:1,dy:-8,a,c:o.err?P.bad:P.ink})}
  function draw(R,k,e){const P=R.P;R.grid(-3,6,-2.6,2.4,.5);
    // where each class is: on the floor (step 1), rising into the stack (step 2), in the stack after
    const lift=k===0?0:k===1?e:1,fadeS=k<=2?1:k===3?lerp(1,.22,e):cl(1-e*2.5,0,1)*.22;
    MRO.forEach((nm,i)=>{const f=FLOOR[nm],t=cl(lift*1.4-i*.1,0,1),p=lerp3(f,towerPos(i,TX),t);
      const hot=k===2&&e*PR.length*1.1>i&&i<PR.length;cls(R,p,nm,{a:fadeS,hot,c:nm==='object'?P.mute:P.c1})});
    // inheritance arrows on the floor, fading as the classes lift
    const fa=k===0?1:k===1?1-e:0;
    PARENTS.forEach(([a,b])=>{const A=FLOOR[a],B=FLOOR[b],d=[B[0]-A[0],B[2]-A[2]],l=Math.hypot(...d),u=[d[0]/l,d[1]/l];
      R.line([[A[0]+u[0]*.45,.02,A[2]+u[1]*.4],[B[0]-u[0]*.5,.02,B[2]-u[1]*.42]],{c:P.mute,w:1.5,a:fa,head:7})});
    if(k===0&&e>.6)L(R,[FLOOR.Service[0],0,FLOOR.Service[2]+.35],'class Service(Logging, Caching)',{mono:true,fs:12,dy:16,c:P.mute});
    if(k===1&&e>.8)L(R,[TX-BX[0]/2,MRO.length*DY*.5,0],'Service.__mro__',{al:'right',dx:-10,mono:true,fs:12.5,b:1,c:P.c1});
    // Service().setup(): the call climbs the stack; each printed line appears beside its class
    if(k===2){const n=PR.length,pos=cl(e*1.1,0,1)*(n-1),top=[TX,pos*DY+.18,.5];
      R.flow([[TX,.18,.5],top],{c:P.acc,a:.9,r:.06,n:Math.max(3,Math.round(pos*3)),speed:1});R.glow(top,.25,{c:P.acc,top:1});R.ball(top,.07,{c:P.acc,top:1});
      PR.forEach((s,i)=>{if(pos+.05>=i)L(R,[TX+BX[0]/2,i*DY+.18,0],s,{al:'left',dx:10,mono:true,fs:12.5,b:1,c:P.good})});
      if(pos>=2)L(R,[TX+BX[0]/2,2*DY+.18,0],"super() in Logging lands here",{al:'left',dx:10,dy:16,mono:true,fs:12,c:P.acc,wide:1})}
    // Logging().setup() on its own: Logging's own MRO, a shorter stack
    if(k>=3){const a=k===3?cl(e*1.6,0,1):cl(1-e*2.5,0,1);
      LM.forEach((nm,i)=>cls(R,towerPos(i,T2),nm,{a,hot:k===3&&i<LPR.length&&e>.5+i*.2,c:nm==='object'?P.mute:P.c1}));
      if(a>.3)L(R,[T2,LM.length*DY,0],'Logging.__mro__',{dy:-10,mono:true,fs:12.5,b:1,c:P.c1,a});
      if(k===3){const pos=cl((e-.4)/.5,0,1)*(LPR.length-1),top=[T2,pos*DY+.18,.5];if(e>.4){R.flow([[T2,.18,.5],top],{c:P.acc,a:.9,r:.06,n:4,speed:1});R.ball(top,.07,{c:P.acc,top:1})}
        LPR.forEach((s,i)=>{if(e>.4&&pos+.05>=i)L(R,[T2+BX[0]/2,i*DY+.18,0],s,{al:'left',dx:10,mono:true,fs:12.5,b:1,c:P.good})})}}
    // class Bad(Base, Logging): two orders required, no order satisfies both
    if(k===4){const a=cl((e-.35)/.5,0,1),bad=[1,0,0],b1=[-.6,DY*1.7,0],l1=[2.6,DY*1.7,0];
      cls(R,bad,'Bad',{a,c:P.bad,err:1});cls(R,b1,'Base',{a,c:P.bad,err:1});cls(R,l1,'Logging',{a,c:P.bad,err:1});
      R.line([[bad[0]-.3,.36,0],[b1[0],b1[1],0]],{c:P.bad,w:1.5,a,head:7});R.line([[bad[0]+.3,.36,0],[l1[0],l1[1],0]],{c:P.mute,w:1.5,a,head:7});
      R.line([[l1[0]-.75,l1[1]+.18,0],[b1[0]+.75,b1[1]+.18,0]],{c:P.bad,w:1.5,a,head:7,dash:[4,4]});
      L(R,[b1[0]-.75,b1[1]+.18,0],'listed first',{al:'right',dx:-8,mono:true,fs:12,c:P.bad,a});
      L(R,[l1[0]+.75,l1[1]+.18,0],'subclass: must come first',{al:'left',dx:8,mono:true,fs:12,c:P.bad,a});
      L(R,[1,DY*3.3,0],ERR.length>60?ERR.slice(0,ERR.indexOf('(MRO)')+5):ERR,{mono:true,fs:12,b:1,c:P.bad,a,wide:1});
      if(ERR.length>60)L(R,[1,DY*3.3,0],ERR.slice(ERR.indexOf('(MRO)')+6),{mono:true,fs:12,b:1,dy:16,c:P.bad,a,wide:1})}
  }
  S3.stage({id:'stg-mro',list:'sx-mro',fig:'Fig. 5 · C3 turns the class graph into one stack that super() climbs',cam:[.3,.82],bounds:[[-2.4,0,-2.5],[2.4,.4,2.2]],aspect:.66,dur:1800,hold:5200,draw,
    margin:w=>w<520?[14,8,12,8]:[18,14,14,14],
    view:k=>k===0?null:k<=2?{cam:[.32,.3],bounds:[[-1.6,0,-.6],[4.2,2.8,.6]]}:k===3?{cam:[.3,.3],bounds:[[-1.4,0,-.6],[6.4,3.0,.6]]}:{cam:[.3,.3],bounds:[[-2.4,0,-.6],[4.6,2.4,.6]]}});
})();
