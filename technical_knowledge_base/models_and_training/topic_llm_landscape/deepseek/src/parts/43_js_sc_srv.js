// ---- Scene (Fig. 4, stg-srv): how V3 and R1 are served (day 6 of DeepSeek's open-source week, window.DS.srv). A prefill unit of 4 nodes and a
// decode unit of 18, 8 GPUs a node as boxes on node trays; on every GPU a green slab (the shared expert) and its routed experts as blue cubes
// (9 in prefill, 2 in decode: 288 copies of 256 experts); requests flow in (teal), the cache moves from prefill to decode (orange), tokens leave
// (purple); then the 32 redundant copies lit gold. Which slots hold the copies, and which experts a token reaches, are illustrative (seeded). ----
(function(){
  if(!document.getElementById('stg-srv')||!window.DS)return;const {lerp,mix}=S3,S=DS.srv;
  const G=.3,GP=.36,GH=.08;
  // trays: centre x, z; 4 GPUs across, 2 deep
  const PRE=[[-4.6,-.42],[-3.0,-.42],[-4.6,.42],[-3.0,.42]],DEC=[];for(let r=0;r<6;r++)for(let c=0;c<3;c++)DEC.push([.7+c*1.6,-2.1+r*.84]);
  const gpus=(T)=>{const o=[];T.forEach(([x,z],n)=>{for(let j=0;j<8;j++)o.push({n,x:x+((j%4)-1.5)*GP,z:z+(Math.floor(j/4)-.5)*GP})});return o};
  const GPre=gpus(PRE),GDec=gpus(DEC);
  // the redundant copies: 32 of the 288 slots in each unit (illustrative: seeded)
  const pick=(n,seed)=>{const r=mulberry32(seed),s=new Set();while(s.size<S.red)s.add(Math.floor(r()*n));return s};
  const RP=pick(S.copies,11),RD=pick(S.copies,5);
  const lab=(k,e,st,f)=>{const a=f(st.pk),b=f(k);if(e>=1||a===b)return b;return a>b?Math.max(b,a*(1-2*e)):b*Math.max(0,2*e-1)};
  const vis=(k,e,st,f)=>{const a=f(st.pk),b=f(k);return e>=1||a===b?b:lerp(a,b,e)};
  function unit(R,P,T,GS,per,red,ra,a,hot){
    T.forEach(([x,z])=>R.box([x,0,z],[4*GP+.12,.04,2*GP+.12],{fill:mix(P.paper,P.line,.5),a,shadow:true,lw:.6,ea:.4}));
    GS.forEach((g,i)=>{R.box([g.x,.04,g.z],[G,GH,G],{a,shadow:false,lw:.5,ea:.45});R.box([g.x,.04+GH,g.z],[G,.03,G],{fill:P.c3,a,shadow:false,lw:.4,ea:.35});
      const n=per,cols=n>2?3:2,cs=n>2?.07:.1,pit=n>2?.09:.13;
      for(let j=0;j<n;j++){const cx=g.x+((j%cols)-(cols-1)/2)*pit,cz=g.z+(Math.floor(j/cols)-(Math.ceil(n/cols)-1)/2)*pit,isR=red.has(i*per+j);
        const fill=isR&&ra>0?mix(P.c1,P.c5,ra):P.c1;R.box([cx,.04+GH+.03,cz],[cs,cs*(isR&&ra>0?1+ra:1),cs],{fill,a:isR&&ra>0?Math.max(a,ra):a,shadow:false,lw:.4,ea:.4})}})}
  function draw(R,k,e,st){const P=R.P;R.grid(-6,5,-2.8,2.8,.5);
    const ra=vis(k,e,st,s=>s===3?1:0),pa=vis(k,e,st,s=>s===2?.35:1),da=vis(k,e,st,s=>s===1?.35:1);
    unit(R,P,PRE,GPre,S.pre.per,RP,ra,pa);unit(R,P,DEC,GDec,S.dec.per,RD,ra,da);
    const na=lab(k,e,st,s=>s===2?0:1),nd=lab(k,e,st,s=>s===1?0:1);
    R.label([-3.8,.2,-.95],(R.W<520?'prefill · EP':'prefill · '+S.pre.nodes+' nodes, '+S.pre.gpus+' GPUs (EP')+S.pre.gpus+(R.W<520?'':')'),{fs:12.5,b:1,dy:-26,c:P.ink,a:na});
    R.label([2.3,.2,-2.6],(R.W<520?'decode · EP':'decode · '+S.dec.nodes+' nodes, '+S.dec.gpus+' GPUs (EP')+S.dec.gpus+(R.W<520?'':')'),{fs:12.5,b:1,dy:-26,c:P.ink,a:nd});
    // step 1: a request's path: prompt in, the cache across, tokens out
    const fa=vis(k,e,st,s=>s===0?1:s===3?.5:0);
    if(fa>.01){R.flow([[-5.9,.2,0],[-5.3,.2,0]],{c:P.c6,a:fa,r:.08,speed:1});R.flowArc([-2.3,.2,0],[.0,.2,0],.6,{c:P.c2,a:fa,r:.09,speed:1.2,n:7});R.flow([[4.6,.2,0],[5.2,.2,0]],{c:P.c4,a:fa,r:.08,speed:1});
      R.label([-1.15,.75,0],'the cache moves across',{fs:12,b:1,dy:-24,c:P.c2,a:lab(k,e,st,s=>s===0?1:0),wide:1})}
    // steps 2 and 3: a token's routed experts are spread over the unit (all-to-all), illustrative
    const r2=vis(k,e,st,s=>s===1?1:0),r3=vis(k,e,st,s=>s===2?1:0);
    if(r2>.01){const src=GPre[9];[2,6,13,17,21,26,30,24].forEach(j=>R.flowArc([src.x,.2,src.z],[GPre[j].x,.2,GPre[j].z],.35,{c:P.c1,a:r2,r:.05,speed:1,n:4}));
      R.label([GPre[15].x+G/2,.15,GPre[15].z],S.pre.per+' routed + the shared expert per GPU',{al:'left',dx:14,fs:12.5,b:1,c:P.ink,a:lab(k,e,st,s=>s===1?1:0),wide:1})}
    if(r3>.01){const src=GDec[33];[1,6,10,14,26,29,36,39].forEach(j=>R.flowArc([src.x,.2,src.z],[GDec[j].x,.2,GDec[j].z],.3,{c:P.c1,a:r3,r:.05,speed:1,n:4}));
      R.label([GDec[0].x-G/2,.15,GDec[0].z],S.dec.per+' routed + the shared expert per GPU',{al:'right',dx:-14,fs:12.5,b:1,c:P.ink,a:lab(k,e,st,s=>s===2?1:0),wide:1})}
    if(ra>.01)R.label([2.3,0,2.55],S.routed+' experts + '+S.red+' copies = '+S.copies+' in each unit',{fs:12.5,b:1,dy:18,c:mix(P.c5,P.ink,.25),a:lab(k,e,st,s=>s===3?1:0)});
  }
  const full={cam:[.18,.8],bounds:[[-6,0,-3],[5.2,.4,3]]};
  S3.stage({id:'stg-srv',list:'sx-srv',fig:'Fig. 4 · V3 and R1 in production: two pools',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5000,draw,
    margin:w=>w<520?[22,8,22,8]:[30,16,30,16],
    view:k=>k===1?{cam:[.3,.72],bounds:[[-5.5,0,-1.6],[-.4,.3,1.1]]}:k===2?{cam:[.25,.8],bounds:[[-2.2,0,-2.9],[4.7,.3,2.7]]}:full});
})();
