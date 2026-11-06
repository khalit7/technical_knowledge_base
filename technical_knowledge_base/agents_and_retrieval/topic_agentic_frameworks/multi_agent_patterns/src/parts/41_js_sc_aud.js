// ---- Scene: Fig. 2, the audit too big for one window (renderer v2). Height is tokens on one scale for every design (1 unit = 100,000):
// the module text as a pile of 48 slabs, each loop's context as a column against a glass wall gridded every 50,000 tokens up to Haiku 4.5's
// 200,000-token window. Every height is a recorded number: the largest context each loop sent in run 1 of each design (FM.audit),
// the module text measured from the fan-out prompts (section 3), the modules each blackboard agent claimed. Slab heights are equal
// (the total divided by 48), since per-module token counts were not recorded. ----
(function(){
  if(!document.getElementById('stg-aud'))return;const {at,off,lerp,mix}=S3;
  const U=FMU,A=FM.audit,K=1e5;
  const r1=(d,m)=>U.runs(d,m)[0];
  const S=r1('single'),SO=r1('single','sonnet'),M=r1('multi'),F=r1('fanout'),B=r1('board');
  if(!S||!M||!F||!B)return;
  {const V={'aud.s1.peak':U.nf(U.lanePeak(S)),'aud.s1.tp':S.tp,'aud.b1.x':B.fp};
    document.querySelectorAll('.fm-v[data-v^="aud."]').forEach(e=>{if(e.dataset.v in V){e.textContent=V[e.dataset.v];e.classList.remove('fm-miss')}});}
  const modTok=Math.round((F.lanes.reduce((a,l)=>a+l.calls[0][1],0)-F.lanes.length*FM.probe.overhead)),SL=modTok/48/K,BOOT=.13;
  const XS=[-3.75,-2.25,-.75,.75,2.25,3.75],ZT=0,ZG=1.25,ZL=2.75,WIN=2;
  const claims={};Object.values(B.claims||{}).forEach(c=>{claims[c[0]]=(claims[c[0]]||0)+1});
  const bAg=B.lanes.map(l=>l.name),bCount=bAg.map(n=>claims[n]||0);
  // a loop's context: a filled column in front of a glass wall gridded every 50,000 tokens, with the 200,000 window as a dashed rim
  function tank(R,x,z,h,a,o){o=o||{};if(a<=.01)return;const P=R.P,wh=o.wall||WIN,w=o.w||.62;
    R.glass([x-w/2-.06,0,z-w/2-.08],[w+.12,0,0],[0,wh,0],{c:P.c6,a:a*.75,nu:2,nv:Math.round(wh/.5)});
    const rim=[[x-w/2-.06,WIN,z-w/2-.08],[x+w/2+.06,WIN,z-w/2-.08],[x+w/2+.06,WIN,z+w/2+.06],[x-w/2-.06,WIN,z+w/2+.06],[x-w/2-.06,WIN,z-w/2-.08]];
    R.line(rim,{c:P.bad,w:1.4,dash:[5,4],a:a*.9});
    const over=Math.max(0,h-WIN),hi=Math.min(h,WIN);
    if(h>0){R.box([x,0,z],[w,hi,w],{fill:mix(P.paper,P.c6,.55),a});if(over>0)R.box([x,WIN,z],[w,over,w],{fill:mix(P.paper,P.bad,.55),a,shadow:false})}
    if(o.lab)R.label([x,h,z],o.lab,{mono:true,fs:12,dy:-12,b:o.b,c:o.c||P.ink,a})}
  function agent(R,x,z,a,lab,o){o=o||{};const P=R.P;R.box([x,0,z],[.5,.4,.5],{fill:o.code?mix(P.paper,P.c5,.5):mix(P.paper,P.c1,.35),a});if(lab)R.label([x,.4,z],lab,{fs:12,dy:-10,a,c:o.c||P.ink,b:o.b})}
  function slab(R,c,a,f){const P=R.P;R.box(c,[.5,SL*.86,.34],{fill:f||mix(P.paper,P.c4,.28),a,shadow:false,lw:.5})}
  // where module j sits at step k: one pile beside the single loop, then six groups of eight in front of the workers
  const PILE=[-1.6,0,ZT],grp=j=>Math.floor(j/8),inG=j=>j%8;
  const pilePos=j=>[PILE[0],BOOT+j*SL,PILE[2]],grpPos=j=>[XS[grp(j)],inG(j)*SL*1.05,ZG];
  function draw(R,k,e){const P=R.P,O=P.c2,I=P.c4;R.grid(-5,5,-1.6,3.8,.5);
    // 1 to 3: the pile and one loop
    const oneA=k<=2?1:off(k,e,3),one=k===2?SO:S;
    if(oneA>.01){
      tank(R,0,ZT,k===0?0:k===1?U.lanePeak(S)/K*e:k===2?lerp(U.lanePeak(S),U.lanePeak(SO),e)/K:U.lanePeak(S)/K,oneA,{wall:k===2?3.1:WIN,
        lab:k===0?null:(k===2?U.nf(U.lanePeak(SO)):U.nf(U.lanePeak(S)))+' tokens',b:1,c:k===2?P.bad:P.ink});
      R.label([.42,WIN,ZT-.4],'200,000-token window (Haiku 4.5)',{fs:12,al:'left',dx:6,c:P.bad,a:oneA*(k===2?.6:1)});
      if(k===2)R.label([.42,3.1,ZT-.4],'Sonnet 5.5: the window goes on to 1,000,000',{fs:12,al:'left',dx:6,c:P.mute,a:e});
      agent(R,0,ZL-.6,oneA,k===0?null:k===2?'one agent, Sonnet 5.5':'one agent, Haiku 4.5',{b:1});
      if(k===0){R.box([PILE[0],0,PILE[2]],[.5,BOOT,.34],{fill:mix(P.paper,P.mute,.3),a:1,shadow:false});
        R.label([PILE[0]-.3,BOOT/2,PILE[2]],'start-up ≈ 13,000',{fs:12,al:'right',dx:-6,c:P.mute});
        R.label([PILE[0]-.3,BOOT+48*SL,PILE[2]],'48 modules ≈ '+U.nf(Math.round(modTok/1000))+',000 tokens',{fs:12.5,b:1,al:'right',dx:-6,c:P.c4})}
      if(k===1||k===2){R.flowArc([PILE[0],BOOT+48*SL*.6,PILE[2]],[0,.9,ZT],.4,{c:O,a:oneA,r:.06,n:k===2?9:6});R.flowArc([0,.3,ZL-.6],[0,.4,ZT+.4],.3,{c:P.c6,a:oneA,r:.05,n:4})}}
    // the 48 slabs: in the pile (steps 1 to 3), moving to six groups (step 4), staying there; on step 2 half of them were read only in part
    for(let j=0;j<48;j++){const q=k<3?pilePos(j):k===3?(t=>[lerp(pilePos(j)[0],grpPos(j)[0],t),lerp(pilePos(j)[1],grpPos(j)[1],t)+Math.sin(Math.PI*t)*.5,lerp(pilePos(j)[2],grpPos(j)[2],t)])(Math.min(1,Math.max(0,e*1.5-j*.01))):grpPos(j);
      const part=k===1&&j%2===1;slab(R,q,(k>=5?.35:1)*(part?.45:1),part?P.paper:k===1?mix(P.paper,P.c4,.55):null)}
    if(k===1)R.label([PILE[0]-.3,BOOT+48*SL*.5,PILE[2]],U.nf(S.lanes[0].partial)+' of 48 read only in part (pale)',{fs:12,al:'right',dx:-6,c:P.c4,b:1});
    // 4 to 6: six loops
    const sixA=at(k,e,3);
    if(sixA>.01){
      const L=k===3?M.lanes.slice(1):k===4?F.lanes:B.lanes;
      XS.forEach((x,i)=>{const pk=k>=5?B.lanes[i].peak:k===4?F.lanes[i].peak:M.lanes[i+1].peak,pk0=k===4?M.lanes[i+1].peak:k===5?F.lanes[i].peak:0,h=lerp(pk0,pk,k===3?e:e)/K;
        tank(R,x,ZT,h,sixA,{w:.56,lab:U.nf(pk/1000,0)+'K'});
        if(k===3)R.flowArc([x,.35,ZG],[x,.8,ZT+.3],.25,{c:O,a:sixA,r:.05,n:4});
        if(k===4)R.flowArc([0,.2,ZL],[x,.8,ZT+.3],.5,{c:O,a:sixA,r:.05,n:5});
        if(k===3)R.flowArc([x,.4,ZT+.3],[0,.45,ZL],.45,{c:I,a:sixA*e,r:.05,n:4});
        if(k===4)R.flowArc([x,.4,ZT+.3],[0,.2,ZL+.15],.55,{c:I,a:sixA*e,r:.05,n:4});
        if(k===5){R.flowArc([0,.36,ZL-.2],[x,.8,ZT+.3],.35,{c:O,a:sixA,r:.05,n:3});R.flowArc([x,.6,ZT+.3],[0,.36,ZL-.2],.6,{c:I,a:sixA*e,r:.05,n:3});
          R.label([x,0,ZG+.25],bCount[i]+' claimed',{fs:12,dy:14,c:P.c4})}});
      R.label([XS[0]-.4,WIN,ZT-.3],'200,000',{fs:12,al:'right',dx:-6,c:P.bad,mono:true});
      // the lead, a code slab, or a board in front
      if(k===3){agent(R,0,ZL,1,'lead · largest call '+U.nf(M.lanes[0].peak),{b:1});tank(R,1.0,ZL,M.lanes[0].peak/K,1,{w:.4,wall:.5})}
      if(k===4){R.box([0,0,ZL],[1.4,.14,.5],{fill:mix(P.paper,P.c5,.5)});R.label([0,.14,ZL],'your code: split, one call each, merge',{fs:12,b:1,dy:-12})}
      if(k===5){R.glass([-.75,.36,ZL-.65],[1.5,0,0],[0,0,.9],{c:P.c3,a:.95,nu:6,nv:4,th:.04});R.box([0,0,ZL-.2],[.08,.36,.08],{});R.label([0,.36,ZL+.25],'board: claim a module, post findings',{fs:12,b:1,dy:16,c:P.c3})}}
  }
  const full={cam:[.18,.5],bounds:[[-4.4,0,-1],[4.4,2.3,3.3]]};
  S3.stage({id:'stg-aud',list:'sx-aud',fig:'Fig. 2 · the audit: every loop\'s context on one scale',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:5200,draw,
    view:k=>k===0?{cam:[.35,.42],bounds:[[-3.6,0,-1],[1.4,2.2,3]]}:k<=1?{cam:[.3,.42],bounds:[[-3.4,0,-1],[2.6,2.3,3]]}:k===2?{cam:[.3,.38],bounds:[[-3.4,0,-1],[3.4,3.2,3]]}:full,
    margin:w=>w<520?[14,10,14,10]:[18,14,16,18]});
})();
