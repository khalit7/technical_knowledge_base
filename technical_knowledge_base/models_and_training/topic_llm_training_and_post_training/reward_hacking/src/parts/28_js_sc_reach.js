// ---- Scene (section 5, Fig. 3): what the policy can reach, as nested rings around it, and every exploit path ending at the reward (renderer v2) ----
// The rings and their order are the page's (from what the task meant to touch, inside, to what it never should, outside); the short case on each ring
// is the measured case in the step list (METR, DSec, Dreadnode, Prime Agent, Denison et al.). Ring sizes are illustrative: only the nesting is meant.
(function(){
  if(!document.getElementById('stg-reach')||!window.S3)return;const {at,off,lerp,mix}=S3;
  const N=7,hs=i=>.75+.62*i; // half-size of ring i
  // ring: name, colour key, where its object stands (angle from the front, radians), the case shown while it is lit
  const RING=[['the code it was asked for','good',.5,'what the task meant'],['tests and framework','c1',-1.5,'exit(0), conftest.py'],
    ['scorer','c2',1.2,'o3: 39 of 128 RE-Bench runs'],['sandbox and filesystem','c4',-2.35,'overwrote /bin/bash'],
    ['the internet','c6',2.4,'37.1% of passes cheated'],['harness and leaderboard','c5',-.55,'a Factorio cheat as a skill'],['the reward process','red',.62,'45 of 32,768 episodes']];
  const pos=(i,y)=>{const a=RING[i][2],h=hs(i),s=Math.sin(a),c=Math.cos(a),m=Math.max(Math.abs(s),Math.abs(c));return [h*s/m*.98,y,h*c/m*.98]};
  function draw(R,k,e){const P=R.P,red=P.dark?[235,112,104]:[200,66,58],C=i=>RING[i][1]==='red'?red:P[RING[i][1]];R.grid(-4.8,4.8,-4.8,4.8,.6);
    // the rings: each lit from its step on; the current one strongest
    for(let i=Math.min(N-1,k+1);i>=0;i--){const h=hs(i),on=i<=k,cur=i===k,a=on?(cur?Math.max(.4,e):.55):.16,c=C(i),sq=[[-h,.004,-h],[h,.004,-h],[h,.004,h],[-h,.004,h]];
      if(cur)R.quad(sq,{fill:mix(P.card,c,.18),fa:e,edge:false,dz:40});
      R.quad(sq,{ec:c,ea:a,lw:cur?2.2:1.2,dash:on?null:[4,4]})}
    // the policy at the centre
    R.box([0,0,0],[.7,.7,.7],{fill:P.paper});R.label([0,.7,0],'policy',{mono:true,fs:12.5,b:1,dy:-11});
    // one object per ring reached so far, standing where its exploit happens (the rings still to come are dashed, the next one only)
    for(let i=0;i<=k;i++){const p=pos(i,0),on=i<=k,cur=i===k,a=on?(cur?Math.max(.35,e):.5):.18,c=C(i),ht=i===6?1.3:i===4?.85:.85;
      if(i===6)R.box(p,[.5,1.3,.5],{fill:c,a});
      else if(i===3)R.box(p,[.85,.75,.85],{fill:mix(P.paper,c,.25),fa:.35,a});
      else if(i===4){R.glow([p[0],.5,p[2]],.55,{c,a:a*.8});R.ball([p[0],.5,p[2]],.32,{c,a})}
      else R.glass([p[0]-.4,.06,p[2]],[.8,0,0],[0,i===0?.55:.85,0],{c,a,nu:4,nv:4});
      // only rings already reached are named, so no label points past the card's edge
      if(on&&(cur||i>0)){const q=[p[0]+(i===0?.45:0),i===0?.3:ht,p[2]],o=i===0?{al:'left',dx:8}:{};
        R.label(q,RING[i][0],Object.assign({mono:true,fs:12.5,b:cur,c,dy:cur?-28:-12,a:cur?1:.75,wide:cur?0:1},o));
        if(cur)R.label(q,RING[i][3],Object.assign({mono:true,fs:12.5,c:P.ink,dy:-12,a:e},o))}}
    // the exploit path of the current ring: the policy reaching out to its object
    if(k===0)R.flowArc([0,.5,.2],pos(0,.35),.3,{c:P.good,r:.07,n:6,speed:1});
    else R.flowArc([0,.55,0],pos(k,.6),.5+.12*k,{c:C(k),a:e,r:.08,n:10,speed:1.3});
  }
  // the camera pulls back one ring at a time, so each step's ring fills the card
  const B=i=>{const h=hs(Math.min(N-1,i+1))+.15;return [[-h,0,-h],[h,1.5,h]]};
  S3.stage({id:'stg-reach',list:'sx-reach',fig:'Fig. 3 · what the policy can reach',cam:[.3,.68],bounds:B(N-1),aspect:.5,dur:1500,hold:5200,draw,
    view:k=>k===0&&document.getElementById('stg-reach').clientWidth<520?{cam:[.3,.85],bounds:[[-.95,0,-.95],[.95,1,.95]]}:{cam:[.3,.68],bounds:B(k)},margin:w=>w<520?[14,10,14,10]:[18,18,30,18]});
})();
