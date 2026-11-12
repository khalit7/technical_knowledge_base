// ---- Scene, Fig. 2 (top of the page, the stack): llama.cpp's stack on the left and MLX's on the right, built from the file up, one layer a step,
// then one request travelling down the left stack and the weights coming up from the file. The layers and their contents are the step list's,
// read from each project's source at the versions in the reference block (no numbers in this figure). ----
(function(){
  if(!document.getElementById('stg-stack'))return;const {at,off,lerp,mix}=S3;
  const XL=-2.5,XR=2.5,W=3.4,D=1.3,DY=1.45;
  // layer i at height y(i); the file (layer 0) is a box on the floor, the others glass plates
  const y=i=>i?(i-.4)*DY:0;
  const L=[
    {n:'file',l:'GGUF',r:'MLX safetensors'},
    {n:'kernels',l:'ggml',r:'MLX',lb:['CPU','Metal','CUDA','Vulkan'],rb:['Metal','CPU']},
    {n:'engine',l:'libllama',r:'mlx-lm'},
    {n:'server',l:'llama-server',r:'mlx_lm.server'},
    {n:'apps',l:'Ollama · LM Studio',r:'LM Studio · Ollama'}];
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({fs:12.5},o||{}));R.grid(-6,6,-2.2,2.2,.5);
    const CL=P.c1,CR=P.c3;
    L.forEach((ly,i)=>{const a=at(k,e,i);if(a<=0)return;const cur=k===i||k===5,fa=cur?1:.38,yy=y(i);
      // the layer name in the middle, upright
      lab([0,yy+(i?0:.2),0],ly.n,{mono:true,fs:12,c:P.mute,a:a*(cur?1:.6)});
      if(i===0){R.box([XL,0,0],[1.5,.4,1.1],{fill:mix(P.paper,CL,.55),a:a*fa});R.box([XR,0,0],[1.5,.4,1.1],{fill:mix(P.paper,CR,.55),a:a*fa});
        lab([XL,0,.55],ly.l,{dy:16,b:1,c:CL,a:a*Math.max(.55,fa)});lab([XR,0,.55],ly.r,{dy:16,b:1,c:CR,a:a*Math.max(.55,fa)});return}
      R.glass([XL-W/2,yy,-D/2],[W,0,0],[0,0,D],{c:CL,nu:6,nv:3,a:a*fa,th:.04});R.glass([XR-W/2,yy,-D/2],[W,0,0],[0,0,D],{c:CR,nu:6,nv:3,a:a*fa,th:.04});
      lab([XL-W/2,yy,0],ly.l,{al:'right',dx:-8,b:1,c:CL,a:a*Math.max(.55,fa)});lab([XR+W/2,yy,0],ly.r,{al:'left',dx:8,b:1,c:CR,a:a*Math.max(.55,fa)});
      // the kernel layer's back ends stand on its plate as small chips
      if(ly.lb){[[XL,ly.lb,CL],[XR,ly.rb,CR]].forEach(([x0,bs,c])=>bs.forEach((b,j)=>{const x=x0-W/2+W*(j+.5)/bs.length;
        R.box([x,yy+.04,-.25],[Math.min(.62,W/bs.length-.15),.22,.5],{fill:mix(P.paper,c,.3),a:a*fa,shadow:false});
        lab([x,yy+.26,-.25],b,{fs:12,dy:-10,c:P.ink,a:a*(cur?1:.5)})}))}
    });
    // step 6: one request down the left stack, the weights up from the file into the Metal kernels, tokens back up
    if(k===5){const xs=XL-.9,top=y(4)+.15,bot=y(1)+.3;
      R.flow([[xs,top,.2],[xs,bot,.2]],{c:P.c2,r:.07,n:10,speed:1.2,a:e});
      R.flowArc([XL,.4,0],[XL-W/2+W*1.5/4,y(1)+.3,-.25],.3,{c:CL,r:.07,n:8,speed:1.2,a:e});
      R.flow([[XL+.9,bot,.2],[XL+.9,top,.2]],{c:P.c6,r:.06,n:8,speed:1.2,a:e});
      lab([xs,top+.25,.2],'request',{dy:-8,b:1,c:P.c2,a:e});lab([XL+.9,top+.25,.2],'tokens',{dy:-8,b:1,c:P.c6,a:e})}
  }
    const st=S3.stage({id:'stg-stack',list:'sx-stack',fig:'Fig. 2 · the two local stacks',cam:[.1,.32],bounds:[[-6.4,0,-.8],[6.4,y(4)+.7,.8]],aspect:.5,dur:1400,hold:4600,draw,
    view:k=>k<5?{cam:[.1,k?.36:.5],bounds:[[-6.4,Math.max(0,y(k)-2.2),-.8],[6.4,k?Math.max(y(k)+.9,3):1.4,.8]]}:null,
    margin:w=>w<520?[16,8,16,8]:[22,16,18,16]});
  (window.LOSTG=window.LOSTG||{})['stg-stack']=st;
})();
