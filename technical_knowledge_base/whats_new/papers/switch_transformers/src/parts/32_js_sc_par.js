// ---- Scene (Parallelism section): the paper's Figure 9 redrawn on 16 cores, one strategy per step. Each core is a white block; on it a glass plate for
// the FFN weights it holds (width to scale with d_ff / m, a full plate for a whole FFN or expert; same colour on several cores = a copy) and a block of
// tokens (height to scale with B / n; same colour = the same tokens). Flows are each strategy's forward communication from §5.1 to §5.5: none for data
// parallelism, all-reduce rings for model parallelism (over all 16 cores, or along each row), all-to-all arcs for expert parallelism (from one core; every
// core does the same). The logical mesh is the old 2D card's: core i has model index i % m and data index floor(i / m). ----
(function(){
  if(!document.getElementById('stg-par'))return;const {lerp,mix}=S3;
  const S=[{n:16,m:1,E:1,t:'data parallel · n 16 × m 1'},{n:1,m:16,E:1,t:'model parallel · n 1 × m 16'},{n:4,m:4,E:1,t:'model + data · n 4 × m 4'},
    {n:16,m:1,E:16,t:'expert + data · 16 experts'},{n:4,m:4,E:4,t:'expert + model + data · 4 experts × 4'}];
  const G=1.45,cx=i=>((i%4)-1.5)*G,cz=i=>(Math.floor(i/4)-1.5)*G,PW=.95,TH=1.2;
  const hue=(lo,hi,j,n)=>'hsl('+Math.round(n<=1?lo:lo+(hi-lo)*j/(n-1))+',55%,'+(52+(j%2)*8)+'%)';
  function wid(st,i){const mi=i%st.m,ni=Math.floor(i/st.m);return st.E>1?(st.m>1?(ni%st.E):ni):mi} // which distinct weight block this core holds
  function core(R,st,i,a,hl){const P=R.P,X=cx(i),Z=cz(i),mi=i%st.m,ni=Math.floor(i/st.m);
    R.box([X,0,Z],[1.1,.12,1.1],{a,fill:P.paper});
    // weights: a full plate for a whole FFN or expert, 1/m of it for a model-parallel slice; colour = which weights
    const w=Math.max(.06,PW/st.m),nW=st.E>1?st.E:st.m,c=st.E===1&&st.m===1?P.c1:hue(195,290,wid(st,i),nW);
    R.glass([X-PW/2+(st.m>1?mi*w:0),.13,Z-.22],[w,0,0],[0,.8,0],{c,a,nu:Math.max(1,Math.round(8/st.m)),nv:6,th:.03});
    // tokens: height to scale with B / n; colour = which tokens
    const h=TH/st.n,tc=st.n===1?P.c2:hue(12,48,ni%st.n,st.n);R.box([X+.12,.12,Z+.3],[.5,Math.max(.02,h),.3],{a,fill:tc,shadow:false});
    if(hl){R.glow([X,.5,Z],1,{c:P.c2,a:.5*a});R.box([X,0,Z],[1.16,.125,1.16],{a,fill:mix(P.paper,P.c2,.35)})}}
  // a ring through cores in order (an all-reduce), drawn as a closed path just above the blocks
  function ring(R,ids,c,a){const pts=ids.map(i=>[cx(i),.2,cz(i)+.02]);pts.push(pts[0]);R.line(pts,{c,w:1.6,a:a*.5});R.flow(pts,{c,a,r:.07,speed:1.8,n:Math.max(4,ids.length*2)})}
  function draw(R,k,e){const P=R.P,st=S[k];R.grid(-3.6,3.6,-3.4,3.4,.5);
    const ap=S3.RM?1:Math.min(1,e*1.4);
    for(let i=0;i<16;i++)core(R,st,i,1,k===3&&i===5||k===4&&i===5);
    R.label([0,1.5,-3],st.t,{mono:true,fs:12.5,b:1,c:P.ink});
    if(k===0)R.label([0,.2,3.25],'forward: nothing sent · gradients all-reduced after the backward pass',{mono:true,fs:12,c:P.mute,a:ap});
    if(k===1){ring(R,[0,1,2,3,7,6,5,4,8,9,10,11,15,14,13,12],P.acc,ap);R.label([0,.2,3.25],'all-reduce over all 16 · [B, d_model]',{mono:true,fs:12,c:P.acc,a:ap})}
    if(k===2||k===4){for(let r=0;r<4;r++)ring(R,[4*r,4*r+1,4*r+2,4*r+3],P.acc,ap);R.label([0,.2,3.25],'all-reduce along each row · [B/n, d_model]',{mono:true,fs:12,c:P.acc,a:ap})}
    if(k===3||k===4){const src=5,dst=k===3?[...Array(16).keys()].filter(j=>j!==src):[0,1,2,3,8,9,10,11,12,13,14,15];
      dst.forEach(j=>R.flowArc([cx(src),.5,cz(src)],[cx(j),.45,cz(j)],.5+.12*Math.hypot(cx(j)-cx(src),cz(j)-cz(src)),{c:P.c2,a:ap,r:.065,n:6,speed:1.7}));
      R.label([0,.2,3.25],'all-to-all from one core · [E, C, d_model]',{mono:true,fs:12,c:P.c2,a:ap,dy:k===4?18:0})}
  }
  window.__parScene={S,stage:S3.stage({id:'stg-par',list:'sx-par',fig:'Fig. 9 redrawn · 16 cores',cam:[.45,.78],bounds:[[-3.1,0,-3.1],[3.1,1.4,3.5]],aspect:.66,dur:1300,hold:5600,draw,
    margin:w=>w<520?[14,10,14,10]:[18,16,16,16]})};
})();
