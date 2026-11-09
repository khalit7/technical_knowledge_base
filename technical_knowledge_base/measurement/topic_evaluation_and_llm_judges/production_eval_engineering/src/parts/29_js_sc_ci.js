// ---- Scene: Fig. 3, eval gates in CI, cheapest first (stg-ci, renderer v2). Four gates in the order a pull request meets them: deterministic
// assertions, a safety floor, the paired per-slice judge gate of section 3, the budget gate; then shadow. The judge gate's slice columns, its 320 calls,
// their cost and the one unparsable grade are the swap's real numbers (window.PES); the broken-format change, the assertions and safety gates passing,
// the three repeated runs and the flipping item are illustrative, as the step text says. Block sizes are not measurements. ----
(function(){
  if(!document.getElementById('stg-ci')||!window.PES||!window.PEK)return;
  const {mix,lerp}=S3,{lab,win,seg,poly,block,sbar}=PEK,S=PES,G=S.G,C=PEC;
  const J={as:[-3.7,0,0],sf:[-2.1,0,0],jg:[.15,0,0],bu:[2.35,0,0],sh:[3.95,0,0],rv:[.15,0,2.1],au:[-4.9,0,-1.9],qu:[-1.6,0,-2.1],lg:[2.35,0,-2.1]};
  const SZ={as:[1,.28,.9],sf:[1,.34,.9],jg:[1.8,.4,1.2],bu:[1,.3,.9],sh:[.9,.42,.8],rv:[1,.3,.7],au:[.8,.3,.6],qu:[.9,.26,.7],lg:[1.3,.3,.7]};
  const L_=id=>[J[id][0]-SZ[id][0]/2,.18,J[id][2]],R_=id=>[J[id][0]+SZ[id][0]/2,.18,J[id][2]],T_=(id,dy)=>[J[id][0],SZ[id][1]+(dy||0),J[id][2]];
  const SX=j=>J.jg[0]-.74+j*.21,YS=1.05;
  function draw(R,k,e){const P=R.P;R.grid(-5.6,4.8,-2.8,2.8,.5);const ok=P.good,bad=P.bad,rv=P.c5;
    const lit={0:['as','sf','jg','bu','sh'],1:['as'],2:['as','sf','jg'],3:['jg','rv','au','bu'],4:['jg','qu'],5:['as','sf','jg','bu','lg']}[k];
    const COL={as:P.c1,sf:P.c3,jg:P.c2,bu:P.c1,sh:P.c4,rv:rv,au:P.mute,qu:P.c5,lg:P.c6};
    const show={rv:k===3,au:k===3||k===1,qu:k===4,lg:k===5};
    Object.keys(J).forEach(id=>{if(id in show&&!show[id])return;const a=lit.includes(id)?1:.22,c=k===1&&id==='as'?mix(COL.as,bad,win(e,.4,.7)):COL[id];
      block(R,J[id],SZ[id],c,id in show?win(e,0,.3)*a:a,k===1&&id==='as'?.3+.4*win(e,.4,.7):.3)});
    [['as','sf'],['sf','jg'],['jg','bu'],['bu','sh']].forEach(([a,b])=>R.line([R_(a),L_(b)],{c:P.line,w:1.4,head:6,a:.7}));
    // the judge gate's slices: one column per tag, height the paired change, coloured by verdict
    const sa=k===2?win(e,.4,.8):k===3?1:k===5?.4:0;
    if(sa>0){G.slices.forEach((s,j)=>sbar(R,SX(j),J.jg[2],YS,s.mean,.6,.16,mix(P.paper,s.v==='fail'?bad:s.v==='escalate'?rv:ok,.7),sa));
      R.glass([J.jg[0]-.86,YS-.005,J.jg[2]-.4],[1.72,0,0],[0,0,.8],{c:P.c2,a:sa*.5,nu:8,nv:1,th:.02});[-.8,.8].forEach(dx=>R.box([J.jg[0]+dx,SZ.jg[1],J.jg[2]],[.04,YS-SZ.jg[1],.04],{a:sa,shadow:false}))}
    // flaky runs (illustrative): the same configuration scored three times, ten items a run; one item flips in the second run
    if(k===4)for(let run=0;run<3;run++)for(let j=0;j<10;j++){const fl=run===1&&j===6,u=win(e,.1+run*.15,.3+run*.15);
      R.box([J.jg[0]-.81+j*.18,SZ.jg[1],J.jg[2]-.36+run*.36],[.13,fl?.2:.1,.13],{fill:mix(P.paper,fl?P.c5:ok,fl?.8:.45),a:u,shadow:false})}
    // flows
    const F=(pts,c,a,o)=>R.flow(pts,Object.assign({c,r:.07,speed:1.5,a},o||{}));
    if(k===0)F(poly([[J.as[0]-1.1,.18,0],L_('as'),R_('as'),L_('sf'),R_('sf'),L_('jg'),R_('jg'),L_('bu'),R_('bu'),L_('sh')],8),P.c1,win(e,0,.3));
    if(k===1){F(seg([J.as[0]-1.1,.18,0],J.as,10),bad,1);R.flowArc([J.as[0]-.3,.3,-.3],[J.au[0]+.2,.3,J.au[2]+.2],.4,{c:bad,r:.06,speed:1.2,a:win(e,.5,.8)})}
    if(k===2)F(poly([[J.as[0]-1.1,.18,0],L_('as'),R_('as'),L_('sf'),R_('sf'),L_('jg'),J.jg],8),ok,1);
    if(k===3){F(seg(R_('jg'),L_('bu'),8),ok,win(e,.1,.4)*.35,{n:3});
      R.flowArc([J.jg[0]-.4,.4,-.5],[J.au[0]+.3,.3,J.au[2]+.2],.6,{c:bad,r:.07,speed:1.2,a:win(e,.2,.5)});
      F(seg([J.jg[0],.25,.6],[J.rv[0],.25,J.rv[2]-.35],8),rv,win(e,.3,.6))}
    if(k===4){R.flowArc([J.jg[0]-.81+6*.18,SZ.jg[1]+.2,J.jg[2]],[J.qu[0]+.3,.3,J.qu[2]+.2],.6,{c:P.c5,r:.06,n:5,speed:1.2,a:win(e,.55,.8)})}
    if(k===5)['as','sf','jg','bu'].forEach(id=>R.flowArc([J[id][0],SZ[id][1],J[id][2]-.3],[J.lg[0],.3,J.lg[2]+.2],.5,{c:P.c6,r:.05,n:5,speed:1.1,a:win(e,.2,.5)}));
    // labels: this step's only
    const la=win(e,.45,.9),Lb=(p,t,o)=>lab(R,p,t,Object.assign({fs:12.5,a:la},o));
    const NM={as:'assertions',sf:'safety floor',jg:'paired judge gate',bu:'budget',sh:'shadow'};
    if(k===0||k===5)Object.keys(NM).forEach(id=>Lb(T_(id),NM[id],{b:1,dy:-12,mono:1,grp:'gates',a:1}));
    if(k===0){[['as','no model calls'],['sf','must stay at 100%'],['jg',S.calls+' GPT-4 calls · $'+(S.callCost*S.calls).toFixed(2)],['bu','same runs, no new calls']].forEach(([id,t])=>Lb([J[id][0],0,J[id][2]+SZ[id][2]/2],t,{dy:14,c:P.mute,wide:1}))}
    if(k===1){Lb(T_('as'),'format fails (illustrative)',{b:1,c:bad,dy:-14,ph:1});Lb(T_('jg'),'never ran: no judge calls spent',{c:P.mute,dy:-14,wide:1});Lb([J.au[0],0,J.au[2]],'back to the author',{dy:14,c:bad})}
    if(k===2){Lb(T_('as'),'pass',{c:ok,dy:-12,b:1});Lb(T_('sf'),'pass',{c:ok,dy:-12,b:1});Lb([SX(0),YS,J.jg[2]],'writing '+C.f(S.sl('writing').mean)+': fail',{al:'right',dx:-14,b:1,c:bad,ph:1});Lb([SX(5),YS,J.jg[2]],'extraction: review',{al:'left',dx:60,dy:22,c:rv,b:1,wide:1});Lb([J.jg[0],SZ.jg[1],J.jg[2]+.6],S.calls+' judge calls',{dy:16,c:P.mute,wide:1})}
    if(k===3){Lb([J.au[0],0,J.au[2]],'fail: back to the author',{dy:14,c:bad,b:1,ph:1});Lb([J.rv[0],0,J.rv[2]+.35],'cannot tell: review',{dy:14,c:rv,b:1,ph:1});Lb(T_('bu'),'pass: onward',{dy:-12,c:ok})}
    if(k===4){Lb([J.jg[0]+.9,SZ.jg[1],J.jg[2]],'same config, 3 runs',{al:'left',dx:10,b:1,c:P.c2});Lb([J.qu[0],0,J.qu[2]],'quarantine: it flipped',{dy:14,c:P.c5,b:1,ph:1})}
    if(k===5)Lb([J.lg[0],0,J.lg[2]],'run log: every version pinned',{dy:-30,c:P.c6,b:1,ph:1});
  }
  const full={cam:[.32,.66],bounds:[[-5.4,0,-2.4],[4.5,1.2,2.5]]};
  S3.stage({id:'stg-ci',list:'sx-ci',fig:'Fig. 3 · eval gates in CI, cheapest first',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:4800,draw,
    margin:w=>w<520?[24,8,14,8]:[30,18,20,18],view:k=>k===0?{cam:[.32,.62],bounds:[[-4.6,0,-.9],[4.5,.5,1]]}:k===1?{cam:[.3,.62],bounds:[[-5.5,0,-2.3],[1.2,.5,1]]}:k===5?{cam:[.32,.66],bounds:[[-4.4,0,-2.6],[4.5,.5,1]]}:k===2?{cam:[.2,.42],bounds:[[-1.6,0,-.8],[1.9,1.7,.9]]}:k===4?{cam:[.25,.6],bounds:[[-2.6,0,-2.5],[1.8,.8,1.2]]}:full});
})();
