// ---- Scene, Fig. 6 (section 7): fork and copy-on-write, two page tables over shared frames (renderer v2) ----
// Four pages drawn. The costs in the step list are this machine's measurements (VM_DATA.fork, cow_write, cow_gc); the step list's spans are filled here.
(function(){
  if(!document.getElementById('stg-cow')||!window.VM_DATA)return;const {at,off,lerp,mix}=S3,D=VM_DATA,$=id=>document.getElementById(id);
  const fmt=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const fk=(k,m)=>D.fork.find(x=>x.kind===k&&x.mib===m).us;
  {const e=$('vm-cow-pm');if(e)e.textContent=fmt((fk('4k',1024)-fk('4k',0))/1024);document.querySelectorAll('.vm-cow4k').forEach(x=>x.textContent=fmt(D.cow_write['4k'].ns_per_page))}
  // per step: parent entries [frame, writable], child entries (or null), the entries and frames a step is about
  const P0=[['A',1],['B',1],['C',1],['D',1]],RO=[['A',0],['B',0],['C',0],['D',0]];
  const S=[{p:P0,ch:null,hl:[]},{p:RO,ch:RO,hl:['p0','p1','p2','p3','c0','c1','c2','c3']},{p:RO,ch:RO,hl:['c1']},
    {p:RO,ch:[['A',0],['B',0],["C'",1],['D',0]],hl:['c2',"C'"]},{p:[['A',0],['B',0],['C',1],['D',0]],ch:[['A',0],['B',0],["C'",1],['D',0]],hl:['p2']},
    {p:[['A',0],['B',0],['C',1],['D',0]],ch:[["A'",1],["B'",1],["C'",1],["D'",1]],hl:['c0','c1','c3',"A'","B'","D'"]}];
  const XP=-3.0,XC=3.0,ZT=-.6,FX=-.45,CX=.55,ZF=.5,Y=i=>1.55-i*.42;
  const fpos=f=>[f.indexOf("'")>0?CX:FX,Y('ABCD'.indexOf(f[0]))-.16,ZF];
  function plate(R,x,lab,a){const P=R.P;R.glass([x-.6,.1,ZT],[1.2,0,0],[0,1.75,0],{c:P.c5,nu:1,nv:4,a});R.label([x,1.9,ZT],lab,{fs:12.5,b:1,dy:-8,a:Math.max(.4,a)})}
  function draw(R,k,e){const P=R.P,st=S[k],pr=k>0?S[k-1]:st,nar=R.W<520,hl=n=>st.hl.indexOf(n)>=0;R.grid(-4.6,4.6,-1.8,2,.5);
    // physical memory: a glass panel behind the frames
    R.glass([FX-.45,.0,ZF-.3],[1.9,0,0],[0,1.85,0],{c:P.c3,nu:2,nv:4,a:.35});R.label([.05,0,ZF+.3],'physical frames',{fs:12,dy:14,c:P.mute,wide:1});
    const used=new Set();st.p.forEach(x=>used.add(x[0]));(st.ch||[]).forEach(x=>used.add(x[0]));
    ['A','B','C','D'].forEach((f,i)=>{const sh=st.ch&&st.p[i][0]===f&&st.ch[i][0]===f;R.box(fpos(f),[.42,.32,.3],{fill:mix(P.paper,P.c3,.45),a:1,shadow:false});
      R.label([FX-.3,Y(i),ZF],f+(sh?' x2':''),{al:'right',mono:true,fs:12.5,b:1,c:sh?P.c5:P.ink,dx:-4})});
    ["A'","B'","C'","D'"].forEach(f=>{if(!used.has(f))return;const born=pr.p.concat(pr.ch||[]).every(x=>x[0]!==f),a=born?e:1;
      R.box(fpos(f),[.42,.32,.3],{fill:mix(P.paper,P.c2,hl(f)?.75:.5),a,shadow:false});R.label([CX+.3,Y('ABCD'.indexOf(f[0])),ZF],f,{al:'left',mono:true,fs:12.5,b:1,c:P.c2,dx:4,a});
      if(born)R.flow([[FX+.2,Y('ABCD'.indexOf(f[0])),ZF],[CX-.2,Y('ABCD'.indexOf(f[0])),ZF]],{c:P.c2,a:e,r:.06,n:4})});
    // the two page tables: four entries each, solid when writable, dashed when read-only (a write faults)
    const ent=(x,side,i,en,id,a)=>{const y=Y(i),h=hl(id),to=fpos(en[0]),wr=en[1];
      R.box([x,y-.14,ZT+.05],[1.0,.28,.08],{fill:h?mix(P.paper,P.c5,.6):mix(P.paper,P.c5,.18),a,shadow:false});
      R.label([x+side*.5,y,ZT+.05],'page '+i+' '+(wr?'rw':'r-'),{al:side>0?'left':'right',dx:side*6,mono:true,fs:12,c:h?P.ink:P.mute,a:Math.max(.5,a),wide:1});
      R.line([[x+(side>0?-.5:.5),y,ZT+.1],[to[0]+(side>0?.21:-.21),y,ZF]],{c:wr?P.c3:P.mute,w:h?2:1.3,dash:wr?null:[5,4],a:a*(h?1:.7)});
      if(h&&k===2)R.flow([[x-.5,y,ZT+.1],[to[0]+.21,y,ZF]],{c:P.c1,a:e,r:.06,n:5})};
    plate(R,XP,'parent',1);st.p.forEach((en,i)=>ent(XP,-1,i,en,'p'+i,1));
    if(st.ch){const a=k===1?e:1,x=k===1?lerp(XP,XC,e):XC;plate(R,x,'child',a);st.ch.forEach((en,i)=>ent(x,1,i,en,'c'+i,a));
      if(k===1)R.flow([[XP+.6,1.0,ZT],[0,2.2,ZT],[XC-.6,1.0,ZT]],{c:P.c5,a:e,r:.07,n:8})}
    if(k===5)R.label([0,2.1,ZF],nar?'gc.collect copies':'gc.collect(): every page of tracked objects is copied',{fs:12.5,b:1,c:P.c2,a:e})
  }
  const full={cam:[.28,.42],bounds:[[-4.4,0,-1],[4.4,2.1,1]]};
  S3.stage({id:'stg-cow',list:'sx-cow',fig:'Fig. 6 · fork shares frames until a write',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1400,hold:4800,draw,
    margin:w=>w<520?[22,8,20,8]:[28,16,22,16]});
})();
