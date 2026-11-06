// ---- Scene: one search path stepped by the rules (AlphaZero) or by a learned model (MuZero), and what trains it (section 8) ----
// Depth is search depth: the root at the front, each simulated step one row further back. Glass plates are the learned functions h, g and f.
// AlphaZero mode: three real tic-tac-toe positions and the prior and value of this page's trained network (§7, checkpoint 60).
// MuZero mode: hidden states, rewards, priors and values are illustrative bars (a picture of "a vector the network chose", not activations).
(function(){
  if(!document.getElementById('stg-mu'))return;const {at,off,lerp,mix}=S3;
  let mode='mu';const ZO=2.75,ZH=2.0,ZS=[1.15,-.55,-2.25],YP=.22,FX=1.75,OX=2.75,RX=-1.85;
  const B=[[-1,0,0,1,1,0,0,0,0],[-1,0,0,1,1,-1,0,0,0],[-1,0,0,1,1,-1,1,0,0]],LAST=[null,5,6];
  let NET=null;const netOut=k=>{NET=NET||MB.Net(MB_DATA.ttt.ckpts['60']);return NET.evaluate(B[k])};
  const ill=(k,i,n)=>{const v=Math.sin(12.9898*(k+1)+78.233*(i+1))*43758.5453;return (v-Math.floor(v))*2-1}; // fixed illustrative values
  function comb(R,c,vals,col,a,hmax,wd){if(a<=.01)return;const nb=vals.length,bw=wd/nb;
    R.box([c[0],c[1]-.045,c[2]],[wd+.14,.045,.34],{a,shadow:false});
    if(c[1]>.12)[-1,1].forEach(sx=>R.box([c[0]+sx*(wd/2),0,c[2]],[.03,c[1]-.05,.03],{a:a*.9}));
    vals.forEach((v,i)=>{const h=Math.max(.014,Math.abs(v)*hmax),bx=c[0]-wd/2+bw*(i+.5);R.box([bx,v>=0?c[1]:c[1]-.045-h,c[2]],[bw*.7,h,.11],{fill:col,a,shadow:false,lw:.7})})}
  function board(R,c,b,a,last){const P=R.P,cs=.3;for(let i=0;i<9;i++){const x=c[0]+((i%3)-1)*cs,z=c[2]+(Math.floor(i/3)-1)*cs;
    R.box([x,0,z],[cs*.92,.06,cs*.92],{fill:i===last?mix(P.paper,P.c5,.4):P.paper,a,shadow:false,lw:.6});if(b[i])R.label([x,.06,z],b[i]===1?'X':'O',{fs:13,b:1,c:b[i]===1?P.q:P.acc,a})}}
  function draw(R,k,e){const P=R.P,mu=mode==='mu';R.grid(-4.6,4.6,-3.4,3.6,.5);
    const shownAt=[0,2,4],predAt=[1,3,4],act=k===6,train=k===7;
    // the root's input: past observations through h (MuZero), or the real position itself (AlphaZero)
    if(mu){for(let j=0;j<3;j++)R.glass([-1.25+j*.85-.32,.1,ZO],[.64,0,0],[0,.5,0],{c:P.q,nu:3,nv:3,a:k===0||train?1:.35});
      R.label([-1.25-.4,.35,ZO],'observations o₁ … oₜ',{al:'right',fs:12.5,c:P.q,dx:-6,grp:'l',a:k===0||train?1:.5});
      R.glass([-.9,.08,ZH],[1.8,0,0],[0,.62,0],{c:P.v,nu:6,nv:2,a:k===0||train?.95:.3});R.label([.95,.4,ZH],'h',{al:'left',serif:true,fs:16,b:1,c:P.v,dx:6,a:k===0||train?1:.4});
      if(k===0||train)[[-1.25,ZO],[-.4,ZO],[.45,ZO]].forEach(([x,z])=>R.flow([[x,.35,z],[x*.5,.4,ZH],[0,YP+.3,ZS[0]+.2]],{c:P.q,r:.06,n:5,speed:1,a:k===0?e:.6}))}
    // nodes: hidden states as signed bars (MuZero) or real boards (AlphaZero)
    for(let n=0;n<3;n++){if(k<shownAt[n]&&!(act||train))continue;if((act)&&n>0)continue;
      const a=k===shownAt[n]?Math.max(.15,e):(k===5||train||k===predAt[n])?1:.45,c=[0,YP,ZS[n]];
      if(mu){comb(R,c,Array.from({length:8},(_,i)=>ill(n,i)),mix(P.paper,P.v,.55),a,.32,1.5);R.label([-.85,YP,ZS[n]],'s'+['⁰','¹','²'][n],{al:'right',mono:true,fs:13,b:1,c:P.v,dx:-6,a})}
      else{board(R,[0,0,ZS[n]],B[n],a,LAST[n]);R.label([-.55,.05,ZS[n]],n?'s'+['','₁','₂'][n]:'s',{al:'right',mono:true,fs:13,b:1,dx:-6,a})}
      // the dynamics step into this node: g (learned) or the rules, plus the predicted reward (MuZero)
      if(n>0){const zm=(ZS[n-1]+ZS[n])/2,ga=k===shownAt[n]?1:k===5||train?.8:.3;
        if(mu){R.glass([-.75,.06,zm],[1.5,0,0],[0,.55,0],{c:P.q,nu:5,nv:2,a:ga});R.label([.8,.35,zm],'g',{al:'left',serif:true,fs:16,b:1,c:P.q,dx:6,a:ga});
          comb(R,[RX,YP,ZS[n]],[ill(9,n)*.6],P.c3,a,.4,.22);R.label([RX,YP+.35,ZS[n]],'r'+['','¹','²'][n],{mono:true,fs:12.5,b:1,c:P.c3,a:train?a*.4:a,dy:-8})}
        else{R.quad([[-.75,.03,zm-.05],[.75,.03,zm-.05],[.75,.03,zm+.05],[-.75,.03,zm+.05]],{fill:P.mute,a:ga*.5});R.label([.8,.05,zm],'rules',{al:'left',fs:12.5,b:1,c:P.mute,dx:6,a:ga})}
        if(k===shownAt[n])R.flow([[0,YP+.35,ZS[n-1]-.15],[0,YP+.35,zm],[0,YP+.35,ZS[n]+.15]],{c:mu?P.q:P.mute,r:.065,n:6,speed:1.1})}
      // prediction f: prior p and value v beside the node
      if(k>=predAt[n]&&!act){const pa=k===predAt[n]?e:k===5||train?.85:.4;let pv,vv;
        if(mu){pv=[.5,.2,.15,.1,.05].map((x,i)=>Math.max(.03,x+.08*ill(n+3,i)));vv=ill(n+6,0)}else{const o=netOut(n);pv=[];for(let i=0;i<9;i++)if(!B[n][i])pv.push(o[0][i]);vv=o[1]}
        R.glass([FX,.06,ZS[n]-.3],[0,0,.6],[0,.5,0],{c:P.c1,nu:2,nv:2,a:pa});R.label([FX,.6,ZS[n]],'f',{serif:true,fs:16,b:1,c:P.c1,dy:-8,a:pa});
        comb(R,[OX,YP,ZS[n]],pv,P.c1,pa,.9,Math.min(1.3,.2*pv.length));comb(R,[OX+.95,YP,ZS[n]],[vv],P.c5,pa,.5,.2);
        R.label([OX,YP-.1,ZS[n]+.25],'p'+(mu?['⁰','¹','²'][n]:''),{mono:true,fs:12.5,b:1,c:P.c1,dy:10,a:pa,grp:'pv'+n});R.label([OX+.95,YP-.1,ZS[n]+.25],'v'+(mu?['⁰','¹','²'][n]:'')+(mu?'':' '+RD.n(vv,2)),{mono:true,fs:12.5,b:1,c:P.c5,dy:10,a:pa});
        if(k===predAt[n])R.flow([[.75,YP+.15,ZS[n]],[FX,.3,ZS[n]],[OX-.6,YP+.2,ZS[n]]],{c:P.c1,r:.06,n:5,speed:1})}}
    // backup: the leaf's value and the rewards stream back to the root
    if(k===5){R.flow([[0,YP+.5,ZS[2]],[0,YP+.5,ZS[1]],[0,YP+.5,ZS[0]]],{c:P.c5,r:.075,n:9,speed:1.2});
      R.label([0,YP+.8,ZS[1]],mu?'G = r¹ + γ r² + γ² v²':'value backed up, sign alternating',{fs:13,b:1,c:P.c5,dy:-10})}
    // act: the root's visit counts give π; the move goes to the real environment
    if(act){const EN=[-2.9,0,1.15];R.box(EN,[1.0,.6,.8],{fill:mix(P.paper,P.q,.18)});R.label([EN[0],.6,EN[2]],mu?'environment':'the game',{fs:12.5,b:1,dy:-10});
      R.flowArc([-.6,YP+.2,ZS[0]],[EN[0]+.5,.5,EN[2]],.5,{c:P.acc,r:.07,n:7,speed:1.1});R.label([-1.2,.2,ZS[0]+.9],'visits → π → act',{fs:13,b:1,c:P.acc,dy:12})}
    // training: real targets at every unrolled step pull the predictions
    if(train){const TX=-3.5;for(let n=0;n<3;n++){const z=ZS[n];R.box([TX,0,z],[.8,.32,.5],{fill:mix(P.paper,P.good,.25),a:.95});
        R.label([TX,.32,z],mu?(n?'u, z, π at t+'+n:'z, π at t'):'z, π at '+(n?'s'+['','₁','₂'][n]:'s'),{mono:true,fs:12,b:1,c:P.good,dy:-9,grp:'tg'});
        R.flowArc([TX+.4,.3,z],[OX-.4,YP+.4,z],.55,{c:P.good,r:.055,n:8,speed:1.2,a:.85})}
      R.label([0,.2,ZS[2]-.9],mu?'unroll K = 5 along the real trajectory':'one real position at a time',{fs:13,b:1,c:P.good,dy:-6,wide:1})}
  }
  // on a phone the camera looks down the search depth, so the path runs up the card instead of across it
  const narrow=()=>{const h=document.getElementById('stg-mu');return !!h&&h.clientWidth>0&&h.clientWidth<520};
  const fullW={cam:[.55,.62],bounds:[[-3.9,0,-2.9],[3.8,1.0,3.1]]},fullN={cam:[.12,.85],bounds:[[-2.6,0,-2.7],[3.5,1.0,3.0]]},full=()=>narrow()?fullN:fullW;
  const st=S3.stage({id:'stg-mu',list:'sx-mz-mu',fig:'Fig. 4 · one search path, rules or learned model',cam:fullW.cam,bounds:()=>full().bounds,aspect:.7,dur:1400,hold:4600,draw,
    view:k=>narrow()?(k<=1?{cam:[.12,.8],bounds:[[-2.0,0,.4],[3.5,1.0,3.1]]}:full()):k===0?{cam:[.4,.5],bounds:[[-2.6,0,.6],[1.4,.9,3.1]]}:k===1?{cam:[.45,.55],bounds:[[-2.4,0,.4],[3.8,1.1,3.1]]}:k===6?{cam:[.35,.6],bounds:[[-3.5,0,-.2],[2.2,1.2,3.1]]}:full()});
  const M=document.getElementById('rd-mzM');
  M.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;M.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));mode=b.dataset.m;
    ['mu','az'].forEach(m=>document.getElementById('sx-mz-'+m).hidden=m!==mode);st.list('sx-mz-'+mode)});
})();
