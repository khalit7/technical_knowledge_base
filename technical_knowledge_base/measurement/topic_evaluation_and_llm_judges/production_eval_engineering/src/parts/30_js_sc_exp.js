// ---- Scene: Fig. 4, who sees the challenger (stg-exp, renderer v2). Live requests as flowing dots from users through a router to the champion and
// challenger (glass plates); answers flowing back only from the arm that is served. Shadow mirrors every request and logs the challenger's answer;
// a canary serves 10% (KServe's example canaryTrafficPercent: 10), drawn as one dot in ten; an A/B test splits users in two (half and half,
// illustrative); interleaving merges both rankers' results into one user's list. Shares and the sources are in the step list. ----
(function(){
  if(!document.getElementById('stg-exp')||!window.PEK)return;
  const {mix,lerp}=S3,{lab,win,seg,poly,block}=PEK;
  const U=[],NU=12;for(let i=0;i<NU;i++)U.push([-4.6+(i%3)*.42,0,-1.15+Math.floor(i/3)*.62]);
  const RT=[-2.3,0,0],CP=[1.2,0,-1.2],XP=[1.2,0,1.2],LG=[3.7,0,2.1],GU=[3.7,0,-.6];
  const plate=(R,c,col,a)=>R.glass([c[0]-.55,.08,c[2]],[1.1,0,0],[0,1.05,0],{c:col,a,nu:4,nv:4});
  function draw(R,k,e){const P=R.P;R.grid(-5.4,4.6,-2.6,2.9,.5);const cc=P.c1,cx=P.c2,ia=win(e,0,.3);
    // users: in an A/B test each one is assigned an arm, shown by its colour
    U.forEach((p,i)=>{const arm=i%2,col=k===3?(arm?cx:cc):k===4&&i!==7?P.mute:P.c3,a=k===4&&i!==7?.25:1;
      R.box(p,[.26,.34,.26],{fill:mix(P.paper,col,k===3?.25+.45*win(e,.1,.5):.35),a})});
    block(R,RT,[.7,.4,.9],P.c5,k===4?.25:1,.3);
    plate(R,CP,cc,1);plate(R,XP,cx,k===0?.25:1);
    const rin=[RT[0]-.35,.25,RT[2]],c0=[CP[0]-.5,.55,CP[2]],x0=[XP[0]-.5,.55,XP[2]];
    const fromU=poly([[-3.3,.25,0],rin],6);
    // requests in, answers back
    const toC=n=>R.flowArc([RT[0]+.35,.3,RT[2]-.2],c0,.35,{c:cc,r:.07,n,speed:1.3,a:ia}),toX=(n,o)=>R.flowArc([RT[0]+.35,.3,RT[2]+.2],x0,.35,Object.assign({c:cx,r:.07,n,speed:1.3,a:ia},o||{}));
    const backC=n=>R.flowArc([CP[0]-.3,1,CP[2]],[-3.6,.5,-.9],.9,{c:cc,r:.06,n,speed:1.2,a:ia*.9}),backX=n=>R.flowArc([XP[0]-.3,1,XP[2]],[-3.6,.5,.9],.9,{c:cx,r:.06,n,speed:1.2,a:ia*.9});
    if(k<4)R.flow(fromU,{c:P.c3,r:.07,speed:1.3,a:ia});
    if(k===0){toC(14);backC(14)}
    if(k===1){toC(14);backC(14);toX(14);block(R,LG,[.9,.3,.6],cx,win(e,.2,.5),.25);
      R.flowArc([XP[0]+.5,.6,XP[2]+.05],[LG[0]-.3,.3,LG[2]],.4,{c:cx,r:.06,n:6,speed:1.1,a:win(e,.3,.6)})}
    if(k===2){toC(18);toX(2);backC(18);backX(2);block(R,GU,[.5,.9,.5],P.good,win(e,.2,.5),.25);
      R.box([GU[0],.7,GU[2]],[.7,.02,.7],{fill:mix(P.paper,P.bad,.8),a:win(e,.3,.6),shadow:false});
      R.flowArc([XP[0]+.5,.6,XP[2]-.05],[GU[0]-.2,.6,GU[2]+.2],.4,{c:P.good,r:.05,n:5,speed:1,a:win(e,.3,.6)})}
    if(k===3){toC(10);toX(10);backC(10);backX(10)}
    if(k===4){// one user's merged list: results alternate between the rankers; the click on a challenger result credits the challenger
      const u=U[7],L0=[-1.4,0,0];for(let j=0;j<5;j++){const own=j%2?cx:cc,hi=j===1,z=L0[2]-.9+j*.45;
        R.box([L0[0],0,z],[1.3,hi?.22:.1,.34],{fill:mix(P.paper,own,hi?.85:.4),a:win(e,.05+j*.08,.25+j*.08)})}
      R.flowArc([CP[0]-.5,.5,CP[2]],[L0[0]+.5,.15,L0[2]-.9],.4,{c:cc,r:.05,n:5,speed:1.2,a:ia});R.flowArc([XP[0]-.5,.5,XP[2]],[L0[0]+.5,.15,L0[2]+.9],.4,{c:cx,r:.05,n:5,speed:1.2,a:ia});
      R.flowArc([L0[0]-.65,.15,L0[2]],[u[0]+.15,.4,u[2]],.4,{c:P.c3,r:.05,n:4,speed:1,a:ia});
      R.flowArc([L0[0]+.65,.22,L0[2]-.45],[XP[0],.6,XP[2]],.7,{c:P.good,r:.07,n:6,speed:1.3,a:win(e,.5,.8)})}
    // labels: this step's only
    const la=win(e,.45,.9),Lb=(p,t,o)=>lab(R,p,t,Object.assign({fs:12.5,a:la},o));
    Lb([CP[0],1.13,CP[2]],'champion',{b:1,c:cc,dy:-12,a:1,ph:1});if(k>0)Lb([XP[0],1.13,XP[2]],'challenger',{b:1,c:cx,dy:-12,a:1,ph:1});
    if(k<4)Lb([-4.2,0,1.2],'users',{dy:16,c:P.mute,a:1});
    if(k===0)Lb([CP[0],0,CP[2]+.2],'every answer comes from the champion',{b:1,dy:16,ph:1});
    if(k===1){Lb([LG[0],.3,LG[2]],'logged, never served',{dy:-14,b:1,c:cx,ph:1});Lb([-.6,0,.4],'same request to both',{dy:14,c:P.mute,wide:1})}
    if(k===2){{const two=innerWidth>=1100;Lb([GU[0]+(two?.3:0),.9,GU[2]],'guardrails, rollback line',{al:two?'right':'center',dy:-14,b:1,c:P.good})} /* in the two-column card, right-aligned to the block, clear of the card's edge */Lb([XP[0],.1,XP[2]+.55],'1 request in 10',{dy:14,b:1,c:cx,ph:1})}
    if(k===3)Lb([-4.2,.34,-1.4],'users split by arm',{dy:-12,b:1,ph:1});
    if(k===4){Lb([-1.4,0,1.1],'one merged list',{dy:16,b:1,ph:1});Lb([-2.05,.22,-.45],'clicked: credit to the challenger',{al:'right',dx:-8,c:P.good,b:1,wide:1})}
  }
  const full={cam:[.36,.66],bounds:[[-5.1,0,-1.9],[4.4,1.3,2.5]]};
  S3.stage({id:'stg-exp',list:'sx-exp',fig:'Fig. 4 · who sees the challenger\'s answer',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1500,hold:4800,draw,
    margin:w=>w<520?[22,8,14,8]:[26,18,18,18]});
})();
