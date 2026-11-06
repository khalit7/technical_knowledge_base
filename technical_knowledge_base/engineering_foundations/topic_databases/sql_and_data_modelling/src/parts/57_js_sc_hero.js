// ---- Scene, Fig. 1 (top): one real query as a pipeline over the chat data, then one write meeting the schema's rules (renderer v2) ----
// SELECT u.plan, COUNT(*) FROM users u JOIN chats c ON c.user_id = u.id WHERE c.model = 'mini' GROUP BY u.plan ORDER BY 2 DESC;
// users (50, sorted by plan) down one edge, chats (200, sorted by their user) along the other, every pair a cell of a glass plate;
// the 200 pairs where ON is true are dots, WHERE keeps the mini ones, GROUP BY folds them into one bar per plan. Every count comes from SM_DATA.
(function(){
  if(!document.getElementById('stg-hero')||!window.SM_DATA)return;const {at,off,lerp,mix,cl}=S3;
  const D=window.SM_DATA,PL=['free','pro','team'],MODEL='mini';
  const U=D.users.slice().sort((a,b)=>PL.indexOf(a[3])-PL.indexOf(b[3])||a[0]-b[0]),ui={};U.forEach((u,i)=>ui[u[0]]=i);
  const C=D.chats.slice().sort((a,b)=>ui[a[1]]-ui[b[1]]||a[0]-b[0]);
  const NU=U.length,NC=C.length,X0=-3.9,X1=3.9,Z0=-1.4,Z1=1.4;
  const x=i=>X0+(X1-X0)*i/(NC-1),z=i=>Z0+(Z1-Z0)*i/(NU-1);
  const dots=C.map((c,i)=>({x:x(i),z:z(ui[c[1]]),plan:U[ui[c[1]]][3],keep:c[3]===MODEL}));
  const G=PL.map(p=>({p,n:dots.filter(d=>d.keep&&d.plan===p).length,xs:dots.filter(d=>d.plan===p).map(d=>d.x),zs:dots.filter(d=>d.plan===p).map(d=>d.z)}));
  const kept=dots.filter(d=>d.keep).length,BX=[-1.5,0,1.5],BZ=2.35,HMAX=1.05,mx=Math.max(...G.map(g=>g.n));
  window.CHK=Object.assign(window.CHK||{},{hero:{users:NU,chats:NC,pairs:NU*NC,on:dots.length,kept,groups:G.map(g=>[g.p,g.n])}});
  const f=n=>n.toLocaleString('en-GB'),avg=a=>a.reduce((s,v)=>s+v,0)/a.length;
  function draw(R,k,e){const P=R.P,PC={free:P.c1,pro:P.c4,team:P.c6};R.grid(-5,5,-3.4,3.2,.5);
    const back=k===3?.35:k===4?.22:1; // composition: what the step is about at full strength, the rest recedes
    // the two tables along two edges of the plate: users coloured by plan, chats lit when they are the mini model (from step 3)
    U.forEach((u,i)=>R.box([X0-.5,0,z(i)],[.34,.1,.045],{fill:mix(P.paper,PC[u[3]],.55),a:back,shadow:false,lw:.4}));
    C.forEach((c,i)=>{const m=c[3]===MODEL,lit=k>=2&&m;R.box([x(i),0,Z0-.42],[.03,lit?.16:.08,.26],{fill:lit?mix(P.paper,P.c5,.7):P.paper,a:(k>=2&&!m?.25:1)*back,shadow:false,lw:.35})});
    R.label([X0-.5,0,Z1+.15],'users · '+NU+' rows',{fs:12,b:1,dy:14,a:Math.max(.5,back),al:'center'});
    R.label([0,.1,Z0-.42],'chats · '+NC+' rows',{fs:12,b:1,dy:-14,a:Math.max(.5,back)});
    if(k>=2&&k<4)R.label([2.6,.1,Z0-.42],'model = mini lit',{fs:12,b:1,c:P.c5,dy:-14,a:at(k,e,2)*back,wide:1});
    // 1. FROM: every pair of a user and a chat is a cell of the plate
    R.glass([X0-.15,.01,Z0-.15],[X1-X0+.3,0,0],[0,0,Z1-Z0+.3],{c:P.c1,a:(k===0?e:1)*(k>=3?.4:1),nu:20,nv:10,th:.02});
    if(k===0)R.label([0,.05,0],f(NU*NC)+' pairs',{fs:15,b:1,c:P.c1,a:e});
    if(k===0){R.flow([[X0-.5,.12,Z1],[X0-.15,.05,Z1],[X1,.05,Z1]],{c:P.c1,a:e*.8,r:.05,n:14,speed:1.6});R.flow([[X1,.12,Z0-.42],[X1,.05,Z0-.15],[X1,.05,Z1]],{c:P.c5,a:e*.8,r:.05,n:8,speed:1.2})}
    // 2. ON c.user_id = u.id: one true pair per chat, a staircase because both edges are in the same user order
    if(k>=1){const a1=k===1?e:1;dots.forEach((d,i)=>{const a=k===1?cl(e*1.6-i/NC*.6,0,1):d.keep||k<2?1:k===2?lerp(1,.12,e):.1;
        if(k>=3&&d.keep){const g=G[PL.indexOf(d.plan)];const t=k===3?cl(e*1.4,0,1):1;if(t>=1)return;R.ball([lerp(d.x,BX[PL.indexOf(d.plan)],t),.05+t*.6,lerp(d.z,BZ,t)],.045,{c:PC[d.plan],a:a*(1-t)});return}
        R.ball([d.x,.05,d.z],.045,{c:k>=2&&d.keep?P.c5:PC[d.plan],a:a*back})});
      if(k===1){const pts=dots.filter((d,i)=>i%10===0).map(d=>[d.x,.07,d.z]);R.flow(pts,{c:P.good,a:a1,r:.05,n:16,speed:1.4});
        R.label([1.2,.05,-.4],dots.length+' pairs where ON is true',{fs:14,b:1,c:P.good,a:a1})}}
    // 3. WHERE c.model = 'mini': the other pairs fade
    if(k===2)R.label([1.2,.05,-.4],kept+' pairs kept, '+(dots.length-kept)+' dropped',{fs:14,b:1,c:P.c5,a:e});
    // 4. GROUP BY u.plan, COUNT(*): each plan's kept pairs flow into one bar; ORDER BY sorts the three result rows
    if(k>=3){const ga=k===3?e:1;G.forEach((g,j)=>{const h=Math.max(.04,g.n/mx*HMAX)*(k===3?e:1);
        R.box([BX[j],0,BZ],[.7,h,.5],{fill:mix(P.paper,PC[g.p],.6),a:k===4?1-.85*e:1});
        R.label([BX[j],h,BZ],g.p+' · '+g.n,{fs:13.5,b:1,dy:-12,c:PC[g.p],a:ga*(k===4?1-e:1)});
        if(k===3)R.flow([[avg(g.xs),.08,avg(g.zs)],[BX[j],h+.3,BZ-.4],[BX[j],h,BZ]],{c:PC[g.p],a:ga*.9,r:.035+.0006*g.n,n:Math.max(3,Math.round(g.n/4)),speed:1.5})});
      if(k===3)R.label([BX[2]+.5,.1,BZ],'3 rows out',{fs:12.5,al:'left',dx:14,c:P.mute,a:e,wide:1})}
    // 5. a write meets the schema: the foreign key on chats.user_id lets user 7's new chat in and refuses user 999's
    if(k===4){const a=e,FZ=Z0-1.2,good=[1.8,0,FZ-1.3],bad=[3.3,0,FZ-1.3];
      R.glass([1.1,0,FZ],[2.9,0,0],[0,.6,0],{c:P.c2,a,nu:6,nv:3});R.label([3.75,.6,FZ],'FOREIGN KEY (user_id) REFERENCES users',{fs:12,mono:true,b:1,c:P.c2,dy:-12,a});
      const tg=cl(e*1.3,0,1),pg=[good[0],0,lerp(good[2],Z0-.42,tg)];R.box(pg,[.36,.16,.3],{fill:mix(P.paper,P.good,.5),a,shadow:false});
      R.label([pg[0],.16,pg[2]],'user_id 7',{fs:12,mono:true,b:1,c:P.good,dy:-10,a});
      R.flowArc([good[0],.3,FZ],[X0-.5,.1,z(ui[7])],1.1,{c:P.good,a:a*.8,r:.05,n:16,speed:1.8});
      const tb=Math.min(cl(e*1.3,0,1),.62),pb=[bad[0],0,lerp(bad[2],Z0-.42,tb)];R.box(pb,[.36,.16,.3],{fill:mix(P.paper,P.bad,.55),a,shadow:false});
      R.label([pb[0],.16,pb[2]],'user_id 999',{fs:12,mono:true,b:1,c:P.bad,dy:-10,a});
      if(e>.5){R.glow([bad[0],.12,FZ],.45,{c:P.bad,a:(e-.5)*2});R.label([bad[0],0,FZ],'refused: no user 999',{fs:12.5,b:1,c:P.bad,dy:18,a:(e-.5)*2})}}
  }
  const full={cam:[.12,.8],bounds:[[-4.6,0,-2.1],[4.4,.5,2.9]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one query, one write, on the chat data',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,8,14,8]:[16,110,16,70],
    // the result moves in close to the three bars; the write looks at the back edge, where chats live
    view:k=>k===3?{cam:[.15,.5],bounds:[[-3.4,0,-.4],[3.4,1.3,2.9]]}:k===4?{cam:[Math.PI-.25,.6],bounds:[[.6,0,-4.1],[4.3,.8,-1.3]]}:full});
})();
