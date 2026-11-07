// ---- Scene: Fig. 6 (section 14, stg-mhs), the Model Hardware Standard as layers: instruments on the floor, one standard driver above them with its
// reference file and its safety limits (orange glass, below the model), then MCP, a CLI or code, then the agent. Renderer v2. Structure only, from
// Anthropic's post of 27 August 2026; the instruments are the post's examples and no values are drawn (the post publishes no limits to draw). ----
(function(){
  if(!document.getElementById('stg-mhs')||!window.S3)return;const {mix,at,off}=S3;
  const INST=[['liquid handler',-3.0],['plate reader',-1.5],['robotic arm',0],['microscope',1.5],['laser',3.0]];
  const YD=1.4,YL=1.0,YA=2.25,YM=3.05;
  function draw(R,k,e){const P=R.P,G=P.c2;R.grid(-4.6,4.6,-2.2,2.2,.5);
    // the instruments, each once with its own vendor driver
    INST.forEach(([n,x],i)=>{const hot=(k===3&&i===4)||(k===4&&i===0)||(k===5&&i===4);R.box([x,0,0],[1.0,.5+.08*(i%3),.9],{fill:mix(P.paper,P.ink,hot?.3:.12)});
      R.label([x,0,.45],n,{fs:12,b:hot,c:hot?P.ink:P.mute,dy:16,grp:'inst'});
      const vd=k===0?1-e:0;if(vd>.01)R.box([x,.85,0],[.6,.22,.5],{fill:mix(P.paper,P.c5,.5),a:vd,shadow:false})});
    if(k===0)R.label([-3.0,1.07,0],'its own vendor driver',{fs:12,c:P.c5,dy:-8,a:1-e,wide:1});
    // the standard driver, its reference file and the safety limits
    const da=k===0?e:1;
    R.box([0,YD,0],[7.4,.14,1.3],{fill:P.paper,a:da,shadow:false});R.label([-3.7,YD+.14,-.65],'MHS standard driver · read, write',{fs:12.5,b:1,al:'left',dy:-8,a:da});
    const ra=k===0?0:k===1?e:.8;R.glass([2.6,YD+.16,-.55],[.9,0,0],[0,.7,0],{c:P.c1,nu:2,nv:4,a:ra});
    if(k>=1)R.label([3.05,YD+.9,-.55],'reference file',{fs:12.5,b:1,c:P.c1,dy:-6,a:k===1?e:.7});
    const la=k===0?0:k===1?e:1;R.glass([-3.7,YL,-.65],[7.4,0,0],[0,0,1.3],{c:G,nu:12,nv:2,a:la*(k===3?1:.6)});
    if(k===1||k===3)R.label([-3.75,YL,.65],'safety limits, enforced below the model',{fs:12.5,b:1,c:G,al:'left',dy:14,a:la});
    // access and the agent (or, at the end, the script that replaces it)
    const aa=k<2?0:k===2?e:1;
    [['MCP',-1.3],['CLI',0],['code',1.3]].forEach(([n,x])=>{R.box([x,YA,0],[.9,.32,.7],{fill:mix(P.paper,P.c6,.35),a:aa,shadow:false});R.label([x,YA+.32,0],n,{mono:true,fs:12,b:1,dy:-6,a:aa})});
    const ag=k<2?0:k===5?1-e:aa;R.box([0,YM,0],[1.6,.55,1.0],{fill:mix(P.paper,P.acc,.3),a:ag,shadow:false});R.label([0,YM+.55,0],'agent: a model in any harness',{b:1,fs:12.5,dy:-8,a:ag});
    if(k===5){R.box([0,YM,0],[1.8,.4,1.0],{fill:mix(P.paper,P.c3,.35),a:e,shadow:false});R.label([0,YM+.4,0],'a reviewed, deterministic script: no agent',{b:1,fs:12.5,c:P.c3,dy:-8,a:e})}
    // what moves
    if(k===2){R.flow([[0,YM,0],[-1.3,YA+.32,0],[-1.3,YA,0],[-.5,YD+.16,0]],{c:P.acc,r:.07,n:10,speed:1.3})}
    if(k===3){R.flow([[0,YM,0],[-1.3,YA+.32,0],[-1.3,YA,0],[3.0,YD+.16,0],[3.0,YL+.02,0]],{c:P.acc,r:.07,n:14,speed:1.5});R.glow([3.0,YL,0],.6,{c:G,a:.8});
      R.label([3.0,YD+.16,0],'write: set laser power (illustrative)',{mono:true,fs:12,b:1,c:P.acc,al:'right',dx:-14,dy:-10})}
    if(k===4){R.flow([[-3.0,.6,0],[-3.0,YD,0],[-1.3,YA,0],[0,YM,0]],{c:P.bad,r:.07,n:10,speed:1.4});R.flow([[0,YM,.25],[-1.3,YA,.25],[-3.0,YD,.25],[-3.0,.6,.25]],{c:P.bad,r:.06,n:8,speed:1.6,a:.7});
      R.label([-3.0,.6,0],'bubbles → runtime error → retry → more bubbles',{fs:12.5,b:1,c:P.bad,al:'left',dx:30,dy:-48})}
    if(k===5)R.flow([[0,YM,0],[1.3,YA+.32,0],[1.3,YA,0],[3.0,YD+.16,0],[3.0,.6,0]],{c:P.c3,r:.07,n:12,speed:1.3,a:e});
  }
  S3.stage({id:'stg-mhs',list:'sx-mh',fig:'Fig. 6 · the device layer, from the MHS post',cam:[.38,.32],bounds:[[-4.3,0,-1.1],[4.3,3.7,1.1]],aspect:.66,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,12,8]:[20,16,14,16],
    view:k=>k<=1?{cam:[.32,.38],bounds:[[-4.3,0,-1.1],[4.3,2.2,1.1]]}:null});
})();
