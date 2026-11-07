// ---- Scene: raw pointers crossing the unsafe gate, split_at_mut, and the read past the end that only Miri reports (section 4; renderer v2) ----
// Driven by LSP_DATA.uok and LSP_DATA.ub (ra/gen.py): the vectors, indexes and split point read from unsafe_ok.rs and ub/src/main.rs, their printed
// outputs (second = 20, [101, 2, 103, 4], the two zeros of the release build), and Miri's message (access size, offset, allocation size, location).
// Byte offsets follow from u32 being 4 bytes; Miri's "size 12 bytes" and "+0xc" agree with them (gen.py asserts it). Positions are illustrative.
// Layout: the stack plate at the back, raised; the unsafe gate as a glass wall across the scene; the heap in front of it.
(function(){
  if(!document.getElementById('stg-ub')||!window.LSP_DATA)return;const {at,off,cl,mix}=S3;
  const U=LSP_DATA.uok,B=LSP_DATA.ub,EW=1.0,X0=-1.2,ZV=.55,ZW=1.65;          // one u32 cell's width; the heap rows of v and of w
  const YS=1.15,PL=[-3.6,1.0,-2.3,-1.05],GZ=-.45,ZP=-1.95,PX=-.2;          // stack plate x0,x1,z0,z1; the gate's z; p's row and x on the plate
  const cx=i=>X0+(i+.5)*EW;
  function cells(R,z,vals,o){const P=R.P;vals.forEach((v,i)=>{R.box([cx(i),0,z],[EW-.07,.38,.7],{fill:mix(P.paper,o.c||P.c2,o.hi===i?.7:.35),a:o.a,lw:.9});
      R.label([cx(i),.38,z],String(v),{mono:true,fs:13,b:1,dy:-10,a:o.a});if(o.off)R.label([cx(i)-EW/2,0,z+.36],'+'+i*B.elt,{mono:true,fs:12,c:P.mute,dy:12,a:o.a})});
    if(o.off)R.label([cx(vals.length)-EW/2,0,z+.36],'+'+vals.length*B.elt,{mono:true,fs:12,c:P.mute,dy:12,a:o.a})}
  function ghost(R,i,z,o){const P=R.P,x0=cx(i)-EW/2+.04,x1=cx(i)+EW/2-.04;R.quad([[x0,.01,z-.35],[x1,.01,z-.35],[x1,.01,z+.35],[x0,.01,z+.35]],{fill:false,ec:o.c||P.mute,dash:[5,4],lw:1.5,a:o.a})}
  function sfield(R,z,t,o){const P=R.P;R.box([PX,YS,z],[.8,.32,.5],{fill:mix(P.paper,o.c||P.acc,.38),a:o.a,shadow:false,lw:.8});R.label([PX-.45,YS+.16,z],t,{mono:true,fs:12.5,al:'right',dx:-8,a:o.a,b:o.b,c:o.lc||P.ink});return [PX,YS+.32,z]}
  function draw(R,k,e){const P=R.P;R.grid(-4.4,4.6,-2.8,2.6,.5);
    R.glass([PL[0],YS,PL[2]],[PL[1]-PL[0],0,0],[0,0,PL[3]-PL[2]],{c:P.c1,nu:6,nv:3,a:.7,dz:50});R.label([PL[0]+.1,YS,PL[2]],'stack',{al:'left',fs:12.5,b:1,c:P.c1,dy:-12});
    R.label([3.3,0,ZV+.6],'heap',{fs:12.5,b:1,c:P.c2,al:'left',dy:14});
    // the unsafe gate: every dereference of a raw pointer passes through it
    const gHot=k===1||k===3||k===4||k===5,ga=k===2?.25:gHot?.9:.45;R.glass([-3.6,0,GZ],[7.2,0,0],[0,1.0,0],{c:P.c4,a:ga,nu:12,nv:2});
    R.label([-3.6,1.0,GZ],'unsafe { }',{mono:true,fs:13,b:1,c:P.c4,al:'left',dy:-10,a:k===2?.35:1});
    // v (unsafe_ok.rs, steps 1 and 2; ub/src/main.rs, steps 4 to 6: the same three u32s)
    const vA=k===2?cl(1-e*3,0,1):k===5?.3:1,vals=k<=1?U.vals:B.vals;
    cells(R,ZV,vals,{a:vA,off:k!==2,hi:k===1?U.idx:-1});
    R.label([X0-.1,.2,ZV],'v: '+vals.length*B.elt+'-byte allocation',{al:'right',dx:-6,fs:12.5,c:P.c2,b:1,a:vA});
    const p=sfield(R,ZP,'p: *const u32',{a:k===2?cl(1-e*3,0,1):k===5?.4:1,b:1});
    // 1. making p is safe: it is only an address (dashed: nothing has been read)
    if(k===0)R.arc(p,[cx(0),.4,ZV-.2],.7,{c:P.acc,w:1.8,dash:[5,4],t:Math.min(1,e*1.5),a:1});
    // 2. *p.add(1) inside unsafe: the read crosses the gate and brings back 20
    if(k===1){R.flowArc(p,[cx(U.idx),.42,ZV-.2],.8,{c:P.acc,r:.08,n:11,a:1});R.flowArc([cx(U.idx)+.15,.42,ZV-.2],[p[0]+.3,p[1],p[2]+.1],.6,{c:P.good,r:.07,n:7,a:cl(e*2-.6,0,1)});
      R.label([p[0]+.5,p[1],p[2]],'second = '+U.second,{mono:true,fs:13,b:1,c:P.good,al:'left',dx:8,a:cl(e*2-.6,0,1)})}
    // 3. split_at_mut: two &mut halves of one array on the stack that never overlap, each changed once
    if(k===2){const A=U.a,aft=JSON.parse(U.after),z=-1.7,ax=i=>-3.1+(i+.5)*.9,mid=U.mid,t=cl(e*2-.6,0,1);
      A.forEach((v,i)=>{const ch=i===0||i===mid,val=ch&&t>.5?aft[i]:v;R.box([ax(i),YS,z],[.84,.34,.6],{fill:mix(P.paper,i<mid?P.acc:P.c6,ch&&t>.5?.6:.35),shadow:false,lw:.9});R.label([ax(i),YS+.34,z],String(val),{mono:true,fs:13,b:1,dy:-10})});
      R.line([[ax(0)-.42,YS+.02,z+.42],[ax(mid-1)+.42,YS+.02,z+.42]],{c:P.acc,w:3.5});R.line([[ax(mid)-.42,YS+.02,z+.42],[ax(A.length-1)+.42,YS+.02,z+.42]],{c:P.c6,w:3.5});
      R.label([(ax(0)+ax(mid-1))/2,YS,z+.42],'l: &mut a[0..'+mid+']',{mono:true,fs:12.5,b:1,c:P.acc,dy:16});R.label([(ax(mid)+ax(A.length-1))/2,YS,z+.42],'r: &mut a['+mid+'..'+A.length+']',{mono:true,fs:12.5,b:1,c:P.c6,dy:16});
      R.flowArc([ax(0),YS+1.0,z-.1],[ax(0),YS+.36,z],.15,{c:P.acc,r:.07,n:5,a:Math.min(1,e*2)});R.flowArc([ax(mid),YS+1.0,z-.1],[ax(mid),YS+.36,z],.15,{c:P.c6,r:.07,n:5,a:Math.min(1,e*2)});
      R.label([ax(1.5),YS+1.05,z],'+= 100 through each half',{fs:12.5,c:P.mute,dy:-8,a:Math.min(1,e*2)});
      R.label([ax(1.5),YS,z+.42],'printed '+U.after,{mono:true,fs:13,b:1,dy:36,a:t})}
    // 4 and 5. *p.add(3): the bytes just past the 12-byte allocation; the release build reads them, Miri stops there
    if(k===3||k===4){const i=B.past;ghost(R,i,ZV,{a:1,c:k===4?P.bad:P.mute});R.label([cx(i),.1,ZV],'?',{mono:true,fs:14,b:1,c:P.mute});
      if(k===3){R.flowArc(p,[cx(i),.3,ZV-.2],.9,{c:P.acc,r:.08,n:12,a:1});
        R.label([cx(i),0,ZV+.36],'release build: read past the end: '+B.run_past+', exit 0',{mono:true,fs:12.5,b:1,al:'right',dx:40,dy:34,a:cl(e*2-.5,0,1)})}
      else{const wx=cx(i)-EW/2;R.glass([wx,0,ZV-.5],[0,0,1.0],[0,1.0,0],{c:P.bad,a:.95,nu:2,nv:3});
        const pts=[];for(let j=0;j<=24;j++)pts.push(R.arcPt(p,[wx-.1,.45,ZV-.2],.9,j/24));R.flow(pts,{c:P.acc,r:.08,n:11,a:1});R.glow([wx,.5,ZV-.1],.5,{c:P.bad,a:Math.min(1,e*2)});
        R.label([wx,1.0,ZV],'Miri: '+B.acc+'-byte access at +0x'+B.off.toString(16)+', allocation size '+B.size,{mono:true,fs:12.5,b:1,c:P.bad,al:'right',dx:30,dy:-14,a:Math.min(1,e*2),wide:1});
        R.label([wx,0,ZV+.36],'Undefined Behavior at '+B.miri_at,{mono:true,fs:12.5,c:P.bad,al:'right',dx:40,dy:34,a:Math.min(1,e*2)})}}
    // 6. w freed at its block's end; q still holds its address; the release build reads it anyway
    if(k===5){const fA=cl(1-e*2,0,1);cells(R,ZW,B.w,{a:fA,c:P.c6});B.w.forEach((_,i)=>ghost(R,i,ZW,{a:1-fA}));
      R.label([X0-.1,.2,ZW],'w: freed',{al:'right',dx:-6,fs:12.5,c:P.mute,b:1,a:1-fA});
      const q=sfield(R,ZP+.62,'q: *const u32',{a:1,b:1});R.flowArc(q,[cx(0),.3,ZW-.3],1.0,{c:P.acc,r:.08,n:12,a:cl(e*2-.6,0,1)});
      R.label([cx(1),0,ZW+.36],'release build: read after free: '+B.run_free,{mono:true,fs:12.5,b:1,dy:16,a:cl(e*2-.6,0,1)})}
  }
  const full={cam:[.16,.62],bounds:[[-3.7,0,-2.3],[4.0,1.6,2.1]]};
  S3.stage({id:'stg-ub',list:'sx-ub',fig:'unsafe_ok.rs and ub/src/main.rs: raw pointers through the gate',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1500,hold:4800,draw,
    view:k=>k===2?{cam:[.12,.62],bounds:[[-3.7,0,-2.3],[1.1,2.3,-.8]]}:k===3||k===4?{cam:[.2,.6],bounds:[[-3.0,0,-2.3],[4.0,1.6,1.3]]}:full,
    margin:w=>w<520?[22,10,40,10]:[22,24,44,24]});
})();
