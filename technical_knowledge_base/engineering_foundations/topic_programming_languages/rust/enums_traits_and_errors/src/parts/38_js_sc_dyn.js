// ---- Scene: a generic against a trait object, followed through the compiled program (section 4; renderer v2: few large objects per step, camera in close, glass plates, flows on every call and load) ----
// Steps 1 to 3: mono.rs. The four copies are the symbols nm printed for the release build (RA_DATA.mono).
// Steps 4 to 7: traits.rs (total_dyn, the vtable, then the functions it points at, left to right). The references are drawn to scale, one cube per byte, from its size_of line (RA_DATA.traits); vtable contents simplified.
// Step 8: iterbench.rs, generic closure against &dyn Fn closure, ns per element (RA_DATA.bench.rs).
(function(){
  if(!document.getElementById('stg-dyn')||!window.RA_DATA)return;const {at,off,lerp,mix,cl}=S3;
  const D=RA_DATA,get=(t,re)=>(t.match(new RegExp(re.source,'m'))||[])[1];
  const SYMS=(D.mono.match(/^t mono::biggest::<[^>]+>$/mg)||[]).map(x=>x.replace(/^t mono::/,''));
  const RS=+get(D.traits,/size_of &Whitespace = (\d+)/),RD_=+get(D.traits,/&dyn Tokenizer = (\d+)/);
  const NG=+get(D.bench.rs,/^generic closure F: Fn\s+([0-9.]+)/),ND=+get(D.bench.rs,/^&dyn Fn closure\s+([0-9.]+)/);
  const B=.17,XS=-4.6,XD=-1.0;
  const cx=i=>XS+i*1.2;                                   // copies, in nm's order
  const XR=.8,ZR1=3.0,ZR2=2.2,ZV=.6,ZT=-.9,ZF=-2.5;      // refs, value, vtable, functions
  const XT=3.0,SL=['drop','size','align','name','count','report'],SY=i=>.1+1.5*(5.5-i)/6;
  const FN=[['Chars::name',ZT+1.0],['Chars::count',ZT],['report (default)',ZT-1.0]],XF=5.0,XTD=.9;
  function cubes(R,x0,n,z,fill,a){for(let i=0;i<n;i++)R.box([x0+(i+.5)*B,0,z],[B*.9,.3,.5],{fill:typeof fill==='function'?fill(i):fill,a,shadow:false,lw:.6})}
  function draw(R,k,e){const P=R.P,G=P.c1,DY=P.c2,V=P.c4;R.grid(-6,6.5,-3.4,3.8,.5);
    const left=k<=2?1:k===3?lerp(1,.15,e):k===7?lerp(.15,0,e):.15,right=k<3?0:k===3?e:k===7?1-e:1;
    const LA=A=>A>.5?A:0; // labels of a receding world are dropped, so they never clutter the step in front
    // ---- generic world: the source, its four compiled copies, a direct call
    {const A=left;
      R.glass([-4.9,.1,-2.2],[4.2,0,0],[0,.9,0],{c:G,a:A*(k===0?1:.6),nu:6,nv:3});
      R.label([-2.8,1.0,-2.2],'fn biggest<T: PartialOrd + Copy>',{mono:true,fs:13,b:1,dy:-8,c:G,a:LA(A)});
      const ca=k===0?0:k===1?e:1;
      SYMS.forEach((s,i)=>{const a=A*cl(ca*SYMS.length-i,0,1);R.box([cx(i),0,0],[1.0,.5,.6],{fill:mix(P.paper,G,i===SYMS.length-1&&k===2?.6:.3),a});
        R.label([cx(i),.5,0],s,{mono:true,fs:12,dy:i%2?-24:-9,a:LA(a)});
        if(k===1)R.flowArc([cx(i),1.0,-2.2],[cx(i),.5,0],.35,{c:G,a:a*.9,r:.06,n:5})});
      if(k>=2){const a=A*(k===2?e:1),cs=[XD,0,2.0];R.box(cs,[1.6,.3,.6],{fill:P.paper,a});R.label([XD,0,2.0],'biggest(&[1u8, 7, 3])',{mono:true,fs:12.5,b:1,dy:18,a:LA(a)});
        R.flowArc([XD,.3,2.0],[cx(SYMS.length-1),.5,0],.4,{c:G,a:a*(k===2?1:.4),r:.07,n:6});
        if(k===2)R.label(R.arcPt([XD,.3,2.0],[cx(SYMS.length-1),.5,0],.4,.5),'direct call',{fs:12,b:1,al:'left',dx:10,c:G,a})}}
    // ---- dyn world
    if(right>0){const A=right,hot=k===6;
      // two references, to scale
      cubes(R,XR,RS,ZR1,mix(P.paper,G,.4),A*(k===3||hot?1:.4));
      R.label([XR,0,ZR1],'&Whitespace · '+RS+' B',{al:'right',dx:-8,dy:-4,fs:12.5,b:1,a:LA(A)*(k===3||hot?1:.4)});
      cubes(R,XR,RD_,ZR2,i=>mix(P.paper,i<RD_/2?G:DY,.5),A);
      R.label([XR,0,ZR2],'&dyn Tokenizer · '+RD_+' B',{al:'right',dx:-8,dy:-4,fs:12.5,b:1,a:LA(A)});
      if(k===3||k===4){R.label([XR+B*RD_/4,.3,ZR2],'data',{fs:12,dy:-9,c:G,b:1,a:A});R.label([XR+B*RD_*3/4,.3,ZR2],'vtable',{fs:12,dy:-9,c:DY,b:1,a:A})}
      // the value
      R.box([1.6,0,ZV],[1.8,.45,.6],{fill:mix(P.paper,V,.3),a:A});R.label([1.6,.45,ZV],'Chars { per_token: 3 }',{mono:true,fs:12,dy:-9,a:LA(A)});
      R.flowArc([XR+B*RD_/4,.3,ZR2],[1.6,.45,ZV+.1],.3,{c:G,a:A*(k===5?.4:.9),r:.06,n:5});
      if(hot)R.flowArc([XR+B*RS/2,.3,ZR1],[1.3,.45,ZV+.2],.45,{c:G,a:A*e,r:.06,n:5});
      // the vtables: Chars's, and Whitespace's behind it
      const ta=k===3?0:k===4?e:1;
      if(ta>0){R.glass([XT-.8,.1,ZT],[1.6,0,0],[0,1.5,0],{c:DY,a:A*ta,nu:1,nv:6});
        SL.forEach((t,i)=>R.label([XT,SY(i),ZT],t,{mono:true,fs:12,b:t==='count'&&k===5,c:t==='count'&&k===5?DY:P.ink,a:LA(A*ta),wide:t!=='count'}));
        R.label([XT,1.6,ZT],'vtable for Chars',{fs:12.5,b:1,dy:-9,c:DY,a:LA(A*ta)});
        R.glass([XT-.5,.1,ZT-1.5],[1.2,0,0],[0,1.5,0],{c:DY,a:A*ta*.35,nu:1,nv:6});R.label([XT+.1,1.6,ZT-1.5],'Whitespace',{fs:12,dy:-9,c:P.mute,a:LA(A*ta),wide:1});
        if(k===4)R.flowArc([XR+B*RD_*3/4,.3,ZR2],[XT-.3,1.2,ZT],.5,{c:DY,a:A*e,r:.065,n:7});
        // slots point at code
        FN.forEach(([n,z],i)=>{R.box([XF,0,z],[1.3,.4,.55],{fill:mix(P.paper,V,.25),a:A*ta});R.label([XF,.4,z],n,{mono:true,fs:12,al:'left',dx:30,dy:-4,a:LA(A*ta)});
          if(k===4)R.flowArc([XT+.8,SY(3+i),ZT],[XF-.6,.3,z],.2,{c:DY,a:A*e*.5,r:.045,n:4})})}
      // total_dyn: one copy; the call loads count's address from the table, then jumps
      if(k>=5){const a=A*(k===5?e:1),td=[XTD,0,ZT];R.box(td,[1.4,.45,.55],{fill:mix(P.paper,G,.25),a});R.label([XTD,.45,ZT],'total_dyn: one copy',{mono:true,fs:12.5,b:1,dy:-10,a:LA(a)});
        if(k===5){const a1=cl(e*2,0,1),a2=cl(e*2-1,0,1),slot=[XT-.8,SY(4),ZT];
          R.flowArc([XTD+.7,.4,ZT],slot,.4,{c:DY,a:A*a1,r:.07,n:6});R.flowArc([XT+.8,SY(4),ZT],[XF-.6,.4,FN[1][1]],.3,{c:DY,a:A*a2,r:.07,n:6});
          R.label(R.arcPt([XTD+.7,.4,ZT],slot,.4,.5),'1 load',{fs:12,b:1,dy:-12,dx:10,c:DY,a:A*a1});
          R.label(R.arcPt([XT+.8,SY(4),ZT],[XF-.6,.4,FN[1][1]],.3,.5),'2 call',{fs:12,b:1,dy:-10,c:DY,a:A*a2})}}}
    // ---- the cost in a loop: ns per element, as heights
    if(k===7){const s=2.2/Math.max(NG,ND);[[NG,-.8,G,'generic F: Fn'],[ND,.8,DY,'&dyn Fn']].forEach(([v,x,c,t])=>{const h=v*s*e;
        R.box([x,0,.4],[1.1,Math.max(.02,h),.8],{fill:mix(P.paper,c,.55)});R.label([x,h,.4],v.toFixed(3)+' ns',{fs:14,b:1,dy:-10,c,a:e});R.label([x,0,.4],t,{mono:true,fs:12.5,dy:20,a:e})})}
  }
  const full={cam:[.18,.62],bounds:[[-5.2,0,-2.8],[6,1.6,3.3]]};
  S3.stage({id:'stg-dyn',list:'sx-dyn',fig:'A generic against a trait object',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4600,draw,
    view:k=>k<=2?{cam:[.12,.6],bounds:[[-5.3,0,-2.3],[-.2,1.1,2.3]]}:k===3?{cam:[.2,.6],bounds:[[-.6,0,.2],[4.2,.6,3.3]]}:k===6?{cam:[.2,.6],bounds:[[-.6,0,.2],[4.2,.6,3.3]]}:
      k===7?{cam:[.1,.4],bounds:[[-1.8,0,-.4],[1.8,2.4,1.4]]}:{cam:[.18,.5],bounds:[[-.2,0,-2.1],[6.6,1.7,3.1]]},
    margin:w=>w<520?[28,10,16,10]:[30,14,18,150]});
})();
