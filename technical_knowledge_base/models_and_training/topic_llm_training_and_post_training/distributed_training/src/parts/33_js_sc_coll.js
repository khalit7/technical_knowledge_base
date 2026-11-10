// ---- Scene: the five collectives on four GPUs (Fig. 3), renderer v2 ----
// Each GPU holds a buffer of four chunks, coloured by the GPU that computed it (GPU 0 to 3: --c1 to --c4); a summed chunk is dark and marked Σ.
// Chunks travel along arcs to where the collective puts them, and dots keep streaming on those paths while the step is shown.
// The bytes each GPU sends are the ring factors of nccl-tests (cited in the prose); the scene itself is a picture of who ends with what.
(function(){
  if(!document.getElementById('stg-coll')||!window.S3)return;const {lerp,mix}=S3;
  const GX=g=>(g-1.5)*2.7,SX=(g,j)=>GX(g)-.69+j*.46,H=.34;
  function draw(R,k,e){const P=R.P,C=[P.c1,P.c2,P.c3,P.c4],SIG=mix(P.paper,P.ink,.78);R.grid(-6,6,-2,2,.5);
    for(let g=0;g<4;g++){R.box([GX(g),0,0],[2.25,.08,1.5],{fill:P.paper,dz:50});R.label([GX(g),0,.78],'GPU '+g,{fs:13,b:1,dy:13});
      for(let j=0;j<4;j++)R.box([SX(g,j),.08,0],[.38,.01,.6],{fa:0,ea:.18,shadow:false,lw:.6,dz:40})}
    const chunk=(p,c,a,sig,lab)=>{R.box(p,[.38,H,.6],{fill:c,a,shadow:false,lw:.8});if(lab&&a>.3)R.label([p[0],p[1]+H,p[2]],lab,{fs:12,b:1,dy:-9,c:sig?P.ink:P.mute,a})};
    const at=(g,j)=>[SX(g,j),.08,0],fly=(a,b,h,t)=>{const p=R.arcPt(a,b,h,t);return [p[0],p[1],p[2]]};
    const stream=(a,b,h,c,al)=>R.flowArc([a[0],a[1]+H,a[2]],[b[0],b[1]+H,b[2]],h,{c,a:al,r:.06,speed:1.6,n:6});
    if(k===0){for(let g=0;g<4;g++)for(let j=0;j<4;j++)chunk(at(g,j),C[g],1,false,g===0?String(j):null);
      R.label([SX(0,0)-.3,.3,0],'chunk',{al:'right',dx:-8,fs:12,c:P.mute,grp:'side'})}
    else if(k===1){ // reduce-scatter: chunk j of every GPU travels to GPU j and is summed there
      for(let g=0;g<4;g++)for(let j=0;j<4;j++){const a=at(g,j),b=at(j,j);if(g===j)continue;
        const t=Math.min(1,e*1.15);chunk(fly(a,b,.6+.12*Math.abs(g-j),t),C[g],1-t*.95,false);stream(a,b,.6+.12*Math.abs(g-j),C[g],.55)}
      for(let j=0;j<4;j++){chunk(at(j,j),e>.85?SIG:C[j],1,e>.85,e>.85?'Σ'+j:null)}}
    else if(k===2){ // all-gather: each summed chunk is copied to every other GPU; reduce-scatter + all-gather = all-reduce
      for(let j=0;j<4;j++){chunk(at(j,j),SIG,1,true,'Σ'+j);for(let g=0;g<4;g++){if(g===j)continue;const a=at(j,j),b=at(g,j),t=Math.min(1,e*1.15);
        chunk(fly(a,b,.6+.12*Math.abs(g-j),t),SIG,.25+.75*t,true,t>.95?'Σ'+j:null);stream(a,b,.6+.12*Math.abs(g-j),SIG,.5)}}}
    else if(k===3){ // all-to-all: GPU i's chunk j goes to GPU j, into slot i; nothing is summed
      for(let i=0;i<4;i++)for(let j=0;j<4;j++){const a=at(i,j),b=at(j,i),t=i===j?1:Math.min(1,e*1.15),h=i===j?0:.45+.14*Math.abs(i-j);
        chunk(i===j?a:fly(a,b,h,t),C[i],1,false,(t>.95&&j===0)?i+'→0':null);if(i!==j)stream(a,b,h,C[i],.45)}}
    else if(k===4){ // send and receive: each GPU passes a chunk to its neighbour, activations forward and gradients back
      for(let g=0;g<4;g++)for(let j=0;j<4;j++)chunk(at(g,j),C[g],j===3&&g<3?.35:1,false,null);
      for(let g=0;g<3;g++){const a=at(g,3),b=at(g+1,0),t=Math.min(1,e*1.15);chunk(fly([a[0],a[1],a[2]-.05],[b[0],b[1]+H+.02,b[2]],.5,t),C[g],1,false,null);
        R.flowArc([a[0],a[1]+H,a[2]+.15],[b[0],b[1]+H,b[2]+.15],.5,{c:P.acc,r:.06,speed:1.3});R.flowArc([b[0],b[1]+H,b[2]-.2],[a[0],a[1]+H,a[2]-.2],.32,{c:P.c2,r:.06,speed:1.3})}
      R.label([0,1.25,0],'activations forward, gradients back',{fs:12.5,b:1,c:P.mute,a:e})}
    const nm=['four GPUs, four chunks each','reduce-scatter · sends (n − 1)/n','all-gather · sends (n − 1)/n · together: all-reduce, 2(n − 1)/n','all-to-all · sends (n − 1)/n, nothing summed','send and receive · neighbour to neighbour'][k];
    R.label([0,1.55,-.2],nm,{fs:12.5,b:1,c:k===2?P.ink:P.mute,a:k===0?1:Math.min(1,e*2),wide:1})}
  (window.DTSTG=window.DTSTG||{})['stg-coll']=S3.stage({id:'stg-coll',list:'sx-coll',fig:'Fig. 3 · five collectives, four GPUs',cam:[.24,.7],bounds:[[-5.3,0,-.9],[5.3,1.7,1]],aspect:.45,dur:1900,hold:4600,draw,
    margin:w=>w<520?[12,8,12,8]:[16,14,14,56]});
})();
