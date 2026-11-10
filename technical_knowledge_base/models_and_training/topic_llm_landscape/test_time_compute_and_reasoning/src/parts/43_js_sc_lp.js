// ---- Scene: Fig. 5, the same 32 layers of depth bought by writing, by looping, or by carrying state (stg-lp, renderer v2) ----
// Layers are glass plates stacked in a column, one column per forward pass. Three modes on the same 8 layers of weights, scaled down so they fit:
// an ordinary 8-layer model writing four tokens (D = L x T = 8 x 4), Huginn's (2, 4, 2) shape with its core looped r = 7 times (2 + 4 x 7 + 2 = 32,
// Geiping et al. 2025), and RLT's 4+4 split carrying the last decoder state into the next token (RLT project page). Tokens are placeholders.
(function(){
  if(!document.getElementById('stg-lp')||!window.S3)return;const {at,off,lerp,mix,cl,ease}=S3;
  let mode='ord';const RL=7,DONE={ord:[0,8,16,24,32],loop:[0,2,6,30,32],rlt:[0,8,16,24,32]},SUB='₁₂₃₄';
  window.TTCS=window.TTCS||{};TTCS.lp={ord:8*4,loop:2+4*RL+2,huginn:2+4*32+2,rltPath:t=>4*(t-1)};
  const LY=i=>.32+i*.33,PW=1.15,PD=.8,XC=t=>-3.15+t*2.1,TOP=LY(7)+.25;
  // which plates one application lights, in order: [column, layer]
  const APPS={ord:[],loop:[],rlt:[]};for(let t=0;t<4;t++)for(let i=0;i<8;i++){APPS.ord.push([t,i]);APPS.rlt.push([t,i])}
  APPS.loop.push([0,0],[0,1]);for(let r=0;r<RL;r++)for(let j=2;j<6;j++)APPS.loop.push([0,j]);APPS.loop.push([0,6],[0,7]);
  const colOf=(P,m,i)=>m==='ord'?P.c6:m==='loop'?(i<2?P.c2:i<6?P.c1:P.c4):(i<4?P.mute:P.c1);
  function draw(R,k,e){const P=R.P,m=mode,cols=m==='loop'?1:4,xc=t=>m==='loop'?0:XC(t);R.grid(-5.2,5.2,-1.6,1.6,.5);
    const D=DONE[m],done=k===0?0:lerp(D[k-1],D[k],e),nd=Math.floor(done+1e-9),apps=APPS[m];
    const lit=new Map();for(let a=0;a<Math.min(nd,apps.length);a++){const key=apps[a].join(',');lit.set(key,(lit.get(key)||0)+1)}
    for(let t=0;t<cols;t++){const started=m==='loop'||t<=Math.max(0,k-1);
      for(let i=0;i<8;i++){const n=lit.get(t+','+i)||0,c=colOf(P,m,i),a=n?1:(started?.28:.14);
        R.glass([xc(t)-PW/2,LY(i),-PD/2],[PW,0,0],[0,0,PD],{c,a,nu:4,nv:3,th:.04});}
      if(m!=='loop')R.label([xc(t),0,PD/2],'token '+(t+1),{fs:12,dy:14,c:t<=k-1?P.ink:P.mute})}
    // the activation climbing: a glowing ball at the layer being applied now, a stream along the path it has taken in this step
    if(k>0&&e<1&&nd<apps.length){const [t,i]=apps[nd],p=[xc(t),LY(i)+.06,0];R.glow(p,.45,{c:colOf(P,m,i),a:.8});R.ball(p,.09,{c:colOf(P,m,i)})}
    if(m!=='loop'&&k>0){const t=k-1;R.flow([[xc(t),LY(0),0],[xc(t),LY(7)+.05,0]],{c:m==='ord'?P.c6:P.c1,a:.75,r:.06,n:6,speed:1.2})}
    if(m==='loop'){const fl=(a,b,c)=>R.flow([[0,LY(a),0],[0,LY(b)+.05,0]],{c,a:.75,r:.06,n:4,speed:1.2});
      if(k===1)fl(0,1,P.c2);if(k===4)fl(6,7,P.c4);
      if(k===2||k===3){const x1=PW/2+.35,lp=[[0,LY(2),0],[0,LY(5)+.05,0],[x1,LY(5)+.05,0],[x1,LY(2)-.05,0],[0,LY(2)-.05,0],[0,LY(2),0]];R.flow(lp,{c:P.c1,a:.85,r:.065,n:10,speed:1.6});
        R.line(lp.slice(1,5),{c:P.c1,w:1.4,a:.5,dash:[4,3]})}
      const loops=nd<=2?0:Math.min(RL,Math.ceil((Math.min(nd,30)-2)/4));
      [['prelude',.5,P.c2],['recurrent core',3.5,P.c1],['coda',6.5,P.c4]].forEach(([t,y,c])=>R.label([-PW/2-.1,LY(0)+(y)*.33,0],t,{al:'right',dx:-6,fs:12.5,b:1,c,grp:'part'}));
      if(k>=2)R.label([PW/2+.35,LY(3.5),0],'loop '+loops+' of '+RL,{mono:true,fs:12.5,al:'left',dx:8,b:1,c:P.c1})}
    if(m==='rlt')[['encoder ×4',1.5,P.mute],['decoder ×4',5.5,P.c1]].forEach(([t,y,c])=>R.label([XC(0)-PW/2-.1,LY(y),0],t,{al:'right',dx:-6,fs:12.5,b:1,c,grp:'part'}));
    if(m==='ord')R.label([XC(0)-PW/2-.1,LY(3.5),0],'8 layers',{al:'right',dx:-6,fs:12.5,b:1,c:P.c6,grp:'part'});
    // emitted tokens, and what crosses from one token to the next
    for(let t=0;t<cols;t++){const outAt=m==='loop'?32:8*(t+1);if(done+1e-9<outAt)continue;const tp=[xc(t),TOP,0];
      R.box(tp,[.5,.3,.4],{fill:mix(P.paper,P.good,.35),lw:1});R.label([xc(t),TOP+.3,0],'x'+SUB[t],{mono:true,fs:13,b:1,dy:-10,c:P.ink});
      if(m!=='loop'&&t<3){const nxt=[xc(t+1),LY(0)-.12,0];
        if(m==='ord'&&k>=t+2)R.flowArc([xc(t)+.25,TOP+.15,0],nxt,.35,{c:P.good,a:.95,r:.075,n:8,speed:1.1});
        if(m==='rlt'&&k>=t+2){R.flowArc([xc(t)+PW/2,LY(7),0],[xc(t+1)-PW/2,LY(4),0],.5,{c:P.c4,a:.95,r:.085,n:9,speed:1.3});
          R.flowArc([xc(t)+.25,TOP+.15,0],nxt,.35,{c:P.mute,a:.35,r:.04,n:5,speed:1.1})}}}
    // the running count
    const tok=m==='loop'?(nd>=32?1:0):Math.floor(nd/8),path=m==='rlt'?(tok?4*(tok-1)+4:0):0;
    if(k>0)R.label([0,TOP+.9,0],R.W<520?nd+' layers · '+tok+' token'+(tok===1?'':'s')+(m==='rlt'&&k>=2?' · path '+path:''):nd+' layer applications · '+tok+' token'+(tok===1?'':'s')+' written'+(m==='rlt'&&k>=2?' · state path '+path+' decoder blocks':''),{fs:13,b:1,c:P.ink,dy:-6})
  }
  const full={cam:[.42,.32],bounds:[[-4.6,0,-1],[4.2,TOP+1,1]]},solo={cam:[.42,.3],bounds:[[-2.4,0,-1],[2.6,TOP+1,1]]};
  const st=S3.stage({id:'stg-lp',list:'sx-lp-ord',fig:'Fig. 5 · the same 32 layers of depth, three ways',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1700,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,18,14],view:()=>mode==='loop'?solo:full});
  (TTCS.stage=TTCS.stage||{}).lp=st;
  const seg=document.getElementById('lpM');if(seg&&st)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.m===mode)return;mode=b.dataset.m;
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    ['ord','loop','rlt'].forEach(x=>{document.getElementById('sx-lp-'+x).hidden=x!==mode});st.list('sx-lp-'+mode)}));
})();
