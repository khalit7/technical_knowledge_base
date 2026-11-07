// ---- Scene: Fig. 5 (section 13, stg-ap2), AP2's two modes as parties with the signed objects travelling between them: the user and the trusted
// surface, the agent, the merchant and the payment side; the merchant-signed checkout (yellow plate) and the user's or agent's mandates (orange plates).
// Renderer v2. Structure only, from the AP2 specification v0.2 and its checkout and payment mandate pages; no values (AP2 publishes none to draw). ----
(function(){
  if(!document.getElementById('stg-ap2')||!window.S3)return;const {mix,lerp3,cl}=S3;let mode='present';
  const U=[-3.9,0,0],TS=[-2.85,0,-.9],AG=[-.6,0,0],ME=[2.7,0,-1.35],PA=[2.7,0,1.45];
  const up=(p,y)=>[p[0],y,p[2]];
  function doc(R,p,c,a,lab,o){if(a<=.01)return;o=o||{};R.glass([p[0]-.24,p[1],p[2]],[.48,0,0],[0,.6,0],{c,nu:2,nv:4,a,th:.03});if(lab)R.label([p[0],p[1]+.6,p[2]],lab,{fs:12,b:1,c,dy:-8,a,grp:o.grp,al:o.al,dx:o.dx})}
  const path=(pts,t)=>{const n=pts.length-1,s=cl(t,0,1)*n,i=Math.min(n-1,Math.floor(s));return lerp3(pts[i],pts[i+1],s-i)};
  function draw(R,k,e){const P=R.P,G=P.c2,CK=P.c5,pres=mode==='present';R.grid(-5,4.4,-2.8,2.9,.5);
    const userA=!pres&&k>=1?.18:1;
    // the parties
    R.box(U,[.6,1.0,.6],{fill:mix(P.paper,G,.3),a:userA});R.label(up(U,1.0),'user',{b:1,fs:12.5,dy:-8,a:Math.max(.4,userA)});
    if(!pres&&k===1)R.label(up(U,0),'gone: no person in the loop',{fs:12.5,b:1,c:G,dy:18});
    R.glass([TS[0]-.5,.05,TS[2]],[1.0,0,0],[0,.75,0],{c:P.c1,nu:4,nv:3,a:(pres&&(k===1||k===2))||(!pres&&k===0)?1:.35});R.label(up(TS,.85),'trusted surface: no model',{fs:12,c:P.c1,dy:-8,wide:1});
    R.box(AG,[1.2,.8,1.0],{fill:mix(P.paper,P.acc,.25)});R.label(up(AG,.8),'shopping agent',{b:1,fs:12.5,dy:-10});
    R.box(ME,[1.3,.75,1.0],{fill:mix(P.paper,CK,.3)});R.label(up(ME,.75),'merchant',{b:1,fs:12.5,dy:-10});
    R.box(PA,[1.3,.6,1.0],{fill:mix(P.paper,P.c3,.3)});R.label(up(PA,.6),'payment side',{b:1,fs:12.5,dy:-10});
    const ag=[AG[0],.85,AG[2]],me=[ME[0]-.3,.8,ME[2]+.2],pa=[PA[0]-.3,.65,PA[2]-.2],ts=[TS[0],.85,TS[2]+.15],us=[U[0]+.1,1.05,U[2]];
    if(pres){
      // 1. the merchant-signed checkout travels to the trusted surface; 2. shown there; 3. the user signs two mandates; 4. the agent carries them; 5. verified
      const ckRoute=[me,ag,ts];
      if(k===0){R.flow(ckRoute,{c:CK,r:.07,n:10,speed:1.6});doc(R,path(ckRoute,e),CK,1,'checkout, merchant-signed')}
      if(k>=1)doc(R,[TS[0]-.15,.9,TS[2]+.05],CK,k<=2?1:.35,k===1?'checkout, shown by non-agentic code':null);
      if(k===2){doc(R,[U[0]+.25,1.1,U[2]+.35],G,e,'Checkout Mandate',{grp:'m'});doc(R,[U[0]-.35,1.1,U[2]+.35],G,e,'Payment Mandate',{grp:'m'});R.glow([U[0],1.2,U[2]],.6,{c:G,a:.6*e})}
      if(k===3){const r1=[us,ag,me],r2=[us,ag,pa];R.flow(r1,{c:G,r:.07,n:10,speed:1.4});R.flow(r2,{c:G,r:.07,n:10,speed:1.4});
        doc(R,path(r1,e),G,1,'Checkout Mandate',{grp:'m'});doc(R,path(r2,e),G,1,'Payment Mandate',{grp:'m'});R.label([AG[0],0,AG[2]+.5],'the agent cannot change what was signed',{fs:12.5,b:1,dy:18})}
      if(k===4){doc(R,me,G,1);doc(R,pa,G,1);R.glow(up(ME,.9),.6,{c:P.c3,a:.8});R.glow(up(PA,.75),.6,{c:P.c3,a:.8});
        R.label([ME[0],.75,ME[2]],'verified in deterministic code',{fs:12.5,b:1,c:P.c3,dy:-30});R.label([PA[0],0,PA[2]+.5],'sees only what concerns it · receipts kept',{fs:12,c:P.c3,dy:18,wide:1})}
    }else{
      // 1. open mandates signed in advance; 2. the user leaves; 3. the merchant signs a checkout; 4. the agent signs closed mandates; 5. held to the limits
      const open=[us,ag];
      if(k===0){R.flow(open,{c:G,r:.07,n:8,speed:1.3});doc(R,path(open,e),G,1,'open mandates: merchants, items, amount range, budget')}
      if(k>=1)doc(R,[AG[0]-.35,.85,AG[2]-.2],G,k===3||k===4?1:.6,k<=2?'open mandates':null);
      if(k===2){const r=[me,ag];R.flow(r,{c:CK,r:.07,n:8,speed:1.6});doc(R,path(r,e),CK,1,'checkout, merchant-signed')}
      if(k>=3){const cm=mix(G,P.acc,.45);if(k===3){doc(R,[AG[0]+.3,.85,AG[2]+.2],cm,e,'closed mandates, signed by the agent');R.label([AG[0],0,AG[2]+.5],'within the open mandates\' constraints',{fs:12.5,b:1,c:G,dy:18})}
        if(k===4){const r1=[ag,me],r2=[ag,pa];R.flow(r1,{c:cm,r:.07,n:8,speed:1.4});R.flow(r2,{c:cm,r:.07,n:8,speed:1.4});doc(R,path(r1,e),cm,1);doc(R,path(r2,e),cm,1);
          R.glow(up(ME,.9),.6,{c:P.c3,a:.8*e});R.glow(up(PA,.75),.6,{c:P.c3,a:.8*e});R.label([ME[0],.75,ME[2]],'held to the open mandates\' limits',{fs:12.5,b:1,c:P.c3,dy:-30})}}
    }
  }
  const st=S3.stage({id:'stg-ap2',list:'sx-ap-present',fig:'Fig. 5 · AP2: who signs what, and who only carries it',cam:[.22,.66],bounds:[[-4.6,0,-2.2],[3.6,1.8,2.2]],aspect:.62,dur:1600,hold:4800,draw,
    margin:w=>w<520?[16,8,12,8]:[22,16,14,16],
    view:k=>(mode==='present'&&(k===1||k===2))||(mode==='absent'&&k<=1)?{cam:[.35,.6],bounds:[[-4.6,0,-1.6],[.4,1.8,1.2]]}:null});
  const C=document.getElementById('ap-mode');
  if(C)C.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;C.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    mode=b.dataset.m;document.querySelectorAll('ol[id^="sx-ap-"]').forEach(l=>l.hidden=l.id!=='sx-ap-'+mode);st.list('sx-ap-'+mode)});
})();
