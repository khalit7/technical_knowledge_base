// ---- Scene, Fig. 3 (section 3): GROUP BY folds rows into one per group; OVER keeps every row and writes the group's value on each (renderer v2) ----
// The 16 real messages of chat 11 (SM_DATA), one bar per row, height = tokens; the same scale throughout, so a group's stack is literally its SUM.
(function(){
  if(!document.getElementById('stg-grp')||!window.SM_DATA)return;const {at,off,lerp,mix,cl}=S3;
  const D=window.SM_DATA,R0=D.msgs.filter(m=>m[1]===11).sort((a,b)=>a[0]-b[0]).map(m=>({id:m[0],role:m[2]?'assistant':'user',tok:m[4]}));
  const n=R0.length,ROLES=['user','assistant'],G=ROLES.map(r=>({role:r,rows:R0.filter(x=>x.role===r)}));
  G.forEach(g=>{g.sum=g.rows.reduce((a,x)=>a+x.tok,0);let s=0;g.rows.forEach((x,j)=>{x.j=j;s+=x.tok;x.run=s})});
  window.RD_GRP=G.map(g=>({role:g.role,n:g.rows.length,sum:g.sum})); // for src/check_page.mjs
  window.CHK=Object.assign(window.CHK||{},{grp:{n,groups:window.RD_GRP,run:G.map(g=>g.rows.map(x=>x.run))}});
  const S=2.3/Math.max(...G.map(g=>g.sum)),h=t=>Math.max(.02,t*S),f=v=>v.toLocaleString('en-GB');
  const xb=i=>-3.75+i*.5,xp=r=>(r.role==='user'?-3.95:.45)+r.j*.48,XS={user:-2.6,assistant:1.95},ZR=1.25;
  // each row's stack offset inside its group (in id order)
  G.forEach(g=>{let y=0;g.rows.forEach(x=>{x.y0=y;y+=h(x.tok)})});
  function draw(R,k,e){const P=R.P,RC={user:P.c1,assistant:P.c4};R.grid(-4.6,4.6,-1.8,2.2,.5);
    R0.forEach((r,i)=>{let p=[xb(i),0,0];
      if(k===1)p=[lerp(xb(i),xp(r),e),0,0];
      else if(k===2)p=[lerp(xp(r),XS[r.role],e),lerp(0,r.y0,e),0];
      else if(k>=3)p=[xp(r),0,0];
      R.box(p,[.32,h(r.tok),.32],{fill:mix(P.paper,RC[r.role],.6),shadow:p[1]<.01,lw:.6});
      if(k===0)R.label([p[0],h(r.tok),0],String(r.tok),{fs:12,dy:-9,c:P.mute,wide:1,a:e})});
    if(k===0){R.label([xb(0)-.3,0,0],'chat 11 · 16 rows, height = tokens',{fs:12.5,b:1,al:'left',dy:22})}
    if(k>=1)G.forEach(g=>{const x0=g.role==='user'?-3.95:.45,cx=k===2?lerp(x0+1.68,XS[g.role],e):x0+1.68;
      R.label([cx,0,.25],g.role+' · '+g.rows.length+' rows',{fs:12.5,b:1,c:RC[g.role],dy:18,a:k===1?e:k===2?1-e:1})});
    // GROUP BY: each stack is one output row; flows carry the two rows to the result
    if(k===2){G.forEach(g=>{const top=[XS[g.role],g.sum*S,0];R.label(top,'SUM '+f(g.sum),{fs:13.5,b:1,dy:-12,c:RC[g.role],a:e});
        R.flow([[XS[g.role],.1,.2],[XS[g.role],.1,ZR-.3]],{c:RC[g.role],a:e,r:.06,n:5,speed:1});
        R.box([XS[g.role],0,ZR],[1.3,.12,.42],{fill:mix(P.paper,RC[g.role],.3),a:e,lw:.6});R.label([XS[g.role],.12,ZR],g.role+' · '+g.rows.length+' · '+f(g.sum),{fs:12,mono:true,b:1,dy:-9,a:e})});
      R.label([0,0,ZR],'16 rows in, 2 rows out',{fs:12.5,c:P.mute,dy:20,a:e,wide:1})}
    // OVER (PARTITION BY role): every row stays and gains its partition's SUM (a glass column behind it); with ORDER BY, the running SUM
    if(k>=3){const ga=k===3?e:1;G.forEach(g=>g.rows.forEach(r=>{const v=k===3?g.sum:lerp(g.sum,r.run,e),hh=v*S;
        R.box([xp(r),0,-.42],[.32,hh,.32],{fill:RC[g.role],fa:.16,a:ga,shadow:false,lw:.5});
        if(k===4)R.label([xp(r),hh,-.42],f(Math.round(v)),{fs:12,dy:-9,c:RC[g.role],a:e,wide:1});
        R.flow([[xp(r),hh,-.42],[xp(r),h(r.tok)+.05,0]],{c:RC[g.role],a:ga*.7,r:.035,n:2,speed:.8})}));
      if(k===3)G.forEach(g=>R.label([g.role==='user'?-3.95:.45,g.sum*S,-.42],'role_tokens = '+f(g.sum)+' on every '+g.role+' row',{fs:12.5,b:1,al:'left',dx:-6,dy:-12,c:RC[g.role],a:e}));
      R.label([0,0,0],'16 rows in, 16 rows out',{fs:12.5,c:P.mute,dy:22,a:ga,wide:1})}
  }
  const full={cam:[.18,.4],bounds:[[-4.4,0,-.8],[4.4,1.2,1.6]]};
  S3.stage({id:'stg-grp',list:'sx-grp',fig:'Fig. 3 · chat 11, 16 messages, grouped and windowed',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1500,hold:4600,draw,
    margin:w=>w<520?[16,8,12,8]:[22,16,14,16],
    // the stacks rise to 2.3 units, so the folded and windowed steps use taller bounds
    view:k=>k>=2?{cam:[.22,.32],bounds:[[-4.4,0,-.8],[4.4,2.5,1.6]]}:full});
})();
