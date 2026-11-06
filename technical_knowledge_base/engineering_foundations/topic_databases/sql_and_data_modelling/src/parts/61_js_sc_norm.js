// ---- Scene, Fig. 5 (section 9): one wide table against the normalised schema, on user 7's 59 real message rows (renderer v2) ----
// Front: one slab per message row of user 7, grouped by chat (SM_DATA). In the wide table each row carries a cap: the user's name stored on it.
// The rename (to the illustrative 'Ines Novak-Reyes') must touch every cap; a buggy path touches one chat's; normalising lifts the caps into one
// users row, reached from every message through its chat. N, K and the buggy chat are exposed as RD_NORM for src/check_page.mjs and recompute.py.
(function(){
  if(!document.getElementById('stg-norm')||!window.SM_DATA)return;const {at,off,lerp,mix,cl}=S3;
  const D=window.SM_DATA,UID=7,user=D.users.find(u=>u[0]===UID),OLD=user[2],NEW='Ines Novak-Reyes';
  const per=D.chats.filter(c=>c[1]===UID).map(c=>c[0]).sort((a,b)=>a-b).map(c=>({c,n:D.msgs.filter(m=>m[1]===c).length})).filter(x=>x.n>0);
  const N=per.reduce((a,x)=>a+x.n,0),BUG=Math.min(...per.map(x=>x.c)),K=per.find(x=>x.c===BUG).n;
  const lonely=D.users.filter(u=>!D.chats.some(c=>c[1]===u[0])).map(u=>u[0]);
  window.RD_NORM={N,K,BUG};window.CHK=Object.assign(window.CHK||{},{norm:{N,K,BUG,chats:per.length,lonely:lonely.length}});
  // layout: rows left to right in chat groups
  const RW=.12,GAP=.32,total=N*RW+(per.length-1)*GAP;let cx=-total/2;
  per.forEach(g=>{g.x0=cx;g.xc=cx+g.n*RW/2;cx+=g.n*RW+GAP});
  const rows=[];per.forEach(g=>{for(let i=0;i<g.n;i++)rows.push({g,x:g.x0+(i+.5)*RW})});
  const RH=.34,ZM=.9,ZC=-.7,ZU=-2.4,UX=-.6,UB=[1.5,.3,.6];
  function draw(R,k,e){const P=R.P,old=P.c1,neu=P.c2;R.grid(-5.2,5.2,-3,1.8,.5);
    const norm=k>=4,lift=k===4?e:k>4?1:0;
    // the message rows (white slabs) and, in the wide table, the name cap on each
    rows.forEach(r=>{const bug=r.g.c===BUG;R.box([r.x,0,ZM],[RW*.8,RH,.7],{fill:P.paper,shadow:false,lw:.4,a:norm?.85:1});
      if(lift<1){const renamed=(k>=2&&bug),c=renamed?neu:old,cap=[lerp(r.x,UX,lift*lift),lerp(RH,1.0,lift),lerp(ZM,ZU,lift)];
        R.box(cap,[RW*.8,.08,.7*(1-lift*.6)],{fill:k===1?mix(P.paper,old,.55):mix(P.paper,c,.75),shadow:false,lw:.4,a:1-lift*.9})}});
    per.forEach(g=>R.label([g.xc,0,ZM+.35],(k>=2&&k<4&&g.c===BUG?'chat '+g.c+' · ':'')+g.n,{fs:12,mono:true,dy:14,c:k>=2&&k<4&&g.c===BUG?P.bad:P.mute,b:k>=2&&k<4&&g.c===BUG,wide:1}));
    if(k===0)R.label([0,RH+.08,ZM],'chat_log · '+N+' rows of user '+UID+', each storing "'+OLD+'"',{fs:13,b:1,dy:-14,c:old});
    // the rename, wide: a correct UPDATE must reach every row; the buggy path reaches one chat's rows
    const UPD=[0,1.5,ZM-.2];
    if(k===1||k===2){R.box([UPD[0],1.35,UPD[2]],[1.9,.22,.5],{fill:mix(P.paper,k===1?P.acc:P.bad,.25),shadow:false});
      R.label([UPD[0]+.95,1.46,UPD[2]],k===1?'UPDATE every row of user 7':'UPDATE only chat '+BUG+"'s rows",{fs:12.5,b:1,mono:true,al:'left',dx:8,c:k===1?P.acc:P.bad});
      per.forEach(g=>{if(k===2&&g.c!==BUG)return;R.flow([[UPD[0],1.35,UPD[2]],[g.xc,RH+.4,ZM],[g.xc,RH+.1,ZM]],{c:k===1?P.acc:neu,a:e,r:.05,n:Math.max(3,Math.round(g.n/1.5)),speed:1.4})});
      R.label([total/2,RH,ZM],k===1?N+' rows to write':K+' rows written, '+(N-K)+' missed',{fs:13,b:1,al:'left',dx:10,c:k===1?P.acc:P.bad,a:e,wide:1})}
    // two answers to one question
    if(k===3){const g=per.find(x=>x.c===BUG),o=per[per.length-1];
      R.label([g.xc,RH+.1,ZM],'"'+NEW+'" ('+K+')',{fs:13,b:1,c:neu,dy:-16,a:e});R.label([o.xc,RH+.1,ZM],'"'+OLD+'" ('+(N-K)+')',{fs:13,b:1,c:old,dy:-16,a:e});
      R.quad([[total/2+.3,.01,ZM-.35],[total/2+1.1,.01,ZM-.35],[total/2+1.1,.01,ZM+.35],[total/2+.3,.01,ZM+.35]],{a:e,dash:[4,3],ec:P.bad});
      R.label([total/2+.7,0,ZM],'no row for a user who never wrote',{fs:12,c:P.bad,dy:18,al:'right',a:e,wide:1})}
    // normalised: one users row, one row per chat, and messages that reach the name through chat_id and user_id
    if(norm){const a=k===4?cl(e*1.4-.3,0,1):1,renamed=k>=5,ux=k===6?lerp(UX,UX-2.2,e):k>6?UX-2.2:UX;
      per.forEach(g=>{R.box([g.xc,0,ZC],[g.n*RW,.22,.45],{fill:mix(P.paper,P.c6,.25),a,lw:.6});R.label([g.xc,.22,ZC],'chat '+g.c,{fs:12,mono:true,dy:-9,a,wide:1});
        R.flow([[g.xc,.2,ZM-.35],[g.xc,.2,ZC+.22]],{c:P.c6,a:a*.8,r:.04,n:3,speed:.9});
        R.flowArc([g.xc,.22,ZC],[ux,UB[1],ZU],.5,{c:renamed?neu:P.c6,a:a*(renamed?1:.6),r:.045,n:5,speed:1.3})});
      R.box([ux,0,ZU],UB,{fill:mix(P.paper,renamed?neu:old,renamed?.6*(k===5?e:1):.5),a,lw:.8});
      R.label([ux,UB[1],ZU],'users · id 7 · '+(renamed&&(k>5||e>.5)?NEW:OLD),{fs:13,b:1,dy:-12,c:renamed?neu:old,a});
      R.label([-total/2,0,ZC],'chats',{fs:12,al:'right',dx:-8,c:P.c6,a,wide:1});R.label([-total/2,0,ZM],'messages',{fs:12,al:'right',dx:-8,c:P.mute,a,wide:1});
      if(k===5)R.label([ux+UB[0]/2,UB[1]/2,ZU],'1 row written',{fs:13,b:1,al:'left',dx:10,c:neu,a:e});
      // a user exists without messages: the users who never opened a chat are rows of users like any other
      if(k===6)lonely.forEach((id,i)=>{const p=[UX-1.4+(i+1)*1.15,0,ZU];R.box(p,[.8,.3,.6],{fill:mix(P.paper,P.good,.3),a:e});R.label([p[0],.3,ZU],'id '+id,{fs:12,mono:true,dy:-10,a:e,wide:1})});
      if(k===6)R.label([UX-1.4+4.6,.3,ZU],lonely.length+' users with no chat, stored fine',{fs:12.5,b:1,c:P.good,dy:-32,a:e})}
  }
  S3.stage({id:'stg-norm',list:'sx-norm',fig:'Fig. 5 · user 7, one wide table against three tables',cam:[.2,.8],bounds:[[-5,0,-2.9],[5,1.2,1.4]],aspect:.55,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,12,8]:[18,16,14,70]});
})();
