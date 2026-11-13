// ---- Scene: two models against one fused checkpoint, with the thinking budget (renderer v2). Weights are glass plates at the back,
// their width to scale with BF16 memory (Qwen2.5-32B-Instruct and QwQ-32B 65 GB each, Qwen3-32B 65.5 GB, from the page's recount and
// the model cards); two requests are rows of token blocks in front (quick in front, hard behind), laid out as Table 9's template;
// dots flow from the weights into each token row as it is written. Token counts (26 thinking tokens, 14 under the budget) are
// illustrative, as in the old 2D animation. ----
(function(){
  if(!document.getElementById('stg-fz'))return;const {mix}=S3;
  let M='two';
  const GB={inst:65.0,qwq:65.0,q3:65.5},PW=2.4/65.5,PH=1.55,ZP=-1.45,ZH=.15,ZQ=1.55,X0=-4.9,TP=.36,NTH=12,NB=6;
  window.Q3_FZ={GB,NTH,NB};
  const PLATES={two:[['inst','Qwen2.5-32B-Instruct',-1.4],['qwq','QwQ-32B',1.4]],one:[['q3','Qwen3-32B',0]]};
  // a request's tokens: [kind, step it appears at]; widths in token pitches
  const W={p:1,f:2.3,t:1.9,th:1,s:4,a:1};
  function lane(m,which,k){const L=[],add=(kd,s,n)=>{for(let i=0;i<(n||1);i++)L.push({kd,s})};
    if(which==='q'){add('p',0,4);if(m==='one'){add('f',1);add('t',2);add('t2',2);add('a',2,3)}else add('a',2,3)}
    else{add('p',0,6);if(m==='one')add('f',1);const s=m==='one'&&k===4?4:3;add('t',3);
      if(s===4){add('th',3,NB);add('s',4);add('t2',4);add('a',4,3)}else{add('th',3,NTH);add('t2',3);add('a',3,3)}}
    let x=X0;L.forEach(t=>{const w=(W[t.kd]||W.t)*TP;t.x=x+w/2;t.w=w-.04;x+=w});return L}
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-2.8,2.4,.5);
    const C={p:mix(P.paper,P.mute,.35),f:P.c4,t:P.paper,t2:P.paper,th:P.acc,s:P.c2,a:P.c3},H={p:.18,f:.3,t:.26,t2:.26,th:.38,s:.3,a:.5};
    // the weights, glass plates to scale with memory
    const pl=PLATES[M];pl.forEach(([id,n,x],i)=>{const w=GB[id]*PW,a=1;R.glass([x-w/2,.05,ZP],[w,0,0],[0,PH,0],{c:M==='one'?P.acc:i?P.c4:P.c3,a,nu:8,nv:6});
      R.label([pl.length>1?(i?x+w/2:x-w/2):x,PH+.08,ZP],(R.W<520?n.replace('Qwen2.5-32B-','').replace('-32B',''):n)+' · '+GB[id].toFixed(1).replace(/\.0$/,'')+' GB',{fs:12.5,b:1,dy:-10,al:pl.length>1?(i?'left':'right'):'center',dx:pl.length>1?(i?4:-4):0})});
    if(M==='two'&&k===1)R.label([0,PH+.08,ZP],'130 GB in memory',{fs:12.5,b:1,dy:-30,c:P.c2});
    // the router (before Qwen3)
    if(M==='two'&&k>=1){const rx=-3.6,rz=-.62,a=k===1?1:.35;R.box([rx,0,rz],[.8,.3,.45],{fill:mix(P.paper,P.ink,.15),a});R.label([rx,.3,rz],'router',{fs:12.5,b:1,dy:-10,a:Math.max(a,.5)});
      if(k===1){R.flowArc([X0+1.3,.2,ZQ-.25],[rx-.2,.3,rz+.2],.4,{c:P.mute,a:e,r:.05,n:4});R.flowArc([X0+2,.2,ZH-.25],[rx+.2,.3,rz+.2],.3,{c:P.mute,a:e,r:.05,n:4});
        R.flowArc([rx,.32,rz-.2],[pl[0][2],.6,ZP+.1],.5,{c:P.c3,a:e,r:.06,n:5});R.flowArc([rx+.3,.32,rz-.2],[pl[1][2],.6,ZP+.1],.6,{c:P.c4,a:e,r:.06,n:5})}}
    // the two requests as token rows
    [['q',ZQ,'quick request'],['h',ZH,'hard request']].forEach(([which,z,name])=>{const L=lane(M,which,k),active=(which==='q'&&k===2)||(which==='h'&&k>=3)||k<=1;
      const sa=active?1:.4;let last=null;
      const cur=L.filter(t=>t.s===k),idx=new Map(cur.map((t,i)=>[t,i]));
      L.forEach(t=>{if(t.s>k)return;let a=sa;if(t.s===k&&cur.length>1){const u=Math.max(0,Math.min(1,(e*(cur.length+3)-idx.get(t))/3));if(u<=0)return;a*=u}
        const tag=t.kd==='t'||t.kd==='t2';R.box([t.x,0,z],[t.w,H[t.kd],.5],{fill:tag?P.paper:mix(P.paper,C[t.kd],t.kd==='p'?1:.62),a,shadow:false,lw:tag?1.1:.6});
        if(tag&&sa>.5&&t.s===k&&!(which==='q'&&t.kd==='t2')&&!(k===4&&t.kd==='t2'))R.label([which==='q'?t.x+t.w/2:t.x,H.t,z],which==='q'?'<think></think>':t.kd==='t'?'<think>':'</think>',{fs:12,mono:true,dy:-9,a,wide:1});
        if(t.kd==='f')R.label([t.x,H.f,z],which==='q'?'/no_think':'/think',{fs:12.5,mono:true,b:1,dy:-10,c:P.c4,a});
        if(t.kd==='s')R.label([t.x,H.s,z],'stop sentence',{fs:12,b:1,dy:-10,c:P.c2,a});
        if(a>.05)last=t});
      R.label([X0-.15,0,z],name,{al:'right',dx:-6,fs:12.5,c:P.ink,grp:'lane'});
      // the weights write the tokens of this step
      if(last&&last.s===k&&k>=2&&last.kd!=='p'&&last.kd!=='f'){const p=M==='two'?(which==='q'?pl[0]:pl[1]):pl[0];R.flowArc([p[2],.5,ZP+.1],[last.x,H[last.kd]+.05,z],.55,{c:C[last.kd]===P.paper?P.acc:C[last.kd],a:.9,r:.06,n:6})}
      // the budget: a glass wall where the thinking was cut, and the slots it never wrote behind it
      if(which==='h'&&M==='one'&&k===4){const th=L.filter(t=>t.kd==='th'),wx=th[th.length-1].x+TP/2;R.glass([wx,0,z-.4],[0,0,.8],[0,.95,0],{c:P.c2,a:e,nu:1,nv:4});
        R.label([wx,.95,z],'budget: '+NB+' tokens',{fs:12.5,b:1,dy:-10,c:P.c2,a:e});
        for(let i=0;i<NTH-NB;i++)R.quad([[wx+i*TP+.03,0,z-.85],[wx+(i+1)*TP-.03,0,z-.85],[wx+(i+1)*TP-.03,0,z-.4],[wx+i*TP+.03,0,z-.4]],{fill:null,dash:[3,3],a:e*.7,ea:.6});
        R.label([wx+(NTH-NB)*TP,0,z-.62],'thinking never written',{fs:12,al:'left',dx:8,c:P.mute,a:e,wide:1})}});
  }
  const FULL={cam:[.1,.92],bounds:[[-5.9,0,-1.6],[5.3,1.9,1.9]]};
  function view(k){const L=[[-6.4,0,-1.6],[1.6,1.9,2]];
    if(innerWidth<520)return k===0?{cam:[0,1.0],bounds:FULL.bounds}:k<=2?{cam:[.1,.95],bounds:L}:{cam:[-.05,.95],bounds:[[-3,0,-1.6],[5.4,1.9,1.9]]};
    if(M==='two')return k===1||k===2?{cam:[.24,.72],bounds:[L[0],[2.8,1.9,2]]}:FULL;
    return k===1||k===2?{cam:[.24,.72],bounds:L}:FULL}
  const stg=S3.stage({id:'stg-fz',list:'sx-fz-two',fig:'Fig. 2 · two models, or one checkpoint with a flag and a budget',cam:FULL.cam,bounds:FULL.bounds,aspect:.46,dur:1500,hold:5000,draw,view,
    margin:w=>w<520?[14,10,14,10]:[18,16,16,110]});
  const seg=document.getElementById('fzM');
  if(seg&&stg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(y=>{y.classList.toggle('on',y===b);y.setAttribute('aria-pressed',y===b?'true':'false')});
    M=b.dataset.m;['two','one'].forEach(m=>{document.getElementById('sx-fz-'+m).hidden=m!==M});stg.list('sx-fz-'+M)}));
})();
