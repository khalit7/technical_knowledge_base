// ---- Scene: one feed-forward block under tensor parallelism on two GPUs, then with sequence parallelism (Fig. 7), renderer v2 ----
// Megatron-LM's notation: Y = GeLU(X·A), Z = Y·B. A is split by columns (GPU i holds Aᵢ), B by rows (GPU i holds Bᵢ), so Yᵢ = GeLU(X·Aᵢ)
// needs no communication and Zᵢ = Yᵢ·Bᵢ is a partial sum. Each GPU is a lane in depth (GPU 0 behind, GPU 1 in front); matrices are glass
// plates standing on the lane, width its columns and height its rows (schematic shapes, not to scale: X is tokens × h, A is h × 4h, B is 4h × h);
// the half a GPU does not hold is drawn as a faint outline. Activations are green, weights blue, NVLink collectives teal between the lanes.
(function(){
  if(!document.getElementById('stg-tpb')||!window.S3)return;const {lerp,mix}=S3;
  let mode='tp';
  const Z0=-1.5,Z1=1.5,LZ=g=>g?Z1:Z0,S=.95; // lane depth; S: one unit of h (and of tokens) in world units
  const XX=-4.6,XA=-2.9,XY=-.55,XB=1.35,XZ=3.3,XO=4.9;
  function plate(R,x,y,z,w,h,c,a,nm,lab){R.glass([x,y,z],[w,0,0],[0,h,0],{c,a,nu:Math.max(2,Math.round(w/S*4)),nv:Math.max(2,Math.round(h/S*4))})}
  function ghost(R,x,y,z,w,h){R.line([[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z],[x,y,z]],{c:R.P.mute,w:1,dash:[4,3],a:.55})}
  function draw(R,k,e){const P=R.P,ACT=P.c3,WT=P.c1,sp=mode==='sp',KX=sp?[0,1,2,3,4]:[0,0,1,2,3],ph=sp?k:k+1; // ph: 0 own tokens, 1 X whole, 2 A, 3 B, 4 sum
    R.grid(-6,6,-2.2,2.4,.5);
    for(let g=0;g<2;g++){const z=LZ(g);R.box([0,0,z],[11.4,.06,1.0],{fill:P.paper,dz:50});R.label([-5.7,.03,z],'GPU '+g,{al:'right',dx:-8,fs:13,b:1,grp:'lane'})}
    const y0=.08,lb=(g,x,t,o)=>R.label([x,g?y0:y0+S*2.05,LZ(g)],t,Object.assign({serif:true,fs:13.5,b:1,dy:g?14:-10},o||{}));
    for(let g=0;g<2;g++){const z=LZ(g),fade=(s)=>ph>=s?1:ph===s-1?e:0;
      // X: tokens (height) × h (width); with sequence parallelism each GPU starts with its own half of the tokens
      if(sp&&ph===0){plate(R,XX,y0+(g?0:S),z,S,S,ACT,1);ghost(R,XX,y0+(g?S:0),z,S,S);lb(g,XX+S/2,'X, own tokens',{c:ACT})}
      else{const a=sp&&ph===1?e:1;plate(R,XX,y0+(g?0:S),z,S,S,ACT,1);plate(R,XX,y0+(g?S:0),z,S,S,ACT,sp?a:1);lb(g,XX+S/2,'X',{c:ACT})}
      // A: h × 4h, columns split
      if(ph>=2||!sp&&ph>=1){const a=ph>=2?1:.35,aw=ph===2?e:1;plate(R,XA+g*S*1.0,y0+S*.5,z,S,S,WT,Math.max(a*aw,.2));ghost(R,XA+(1-g)*S,y0+S*.5,z,S,S);lb(g,XA+S,'A'+'₀₁'[g],{c:WT,a:Math.max(.4,aw)})}
      // Y_g = GeLU(X·A_g): tokens × 2h
      if(ph>=2){const a=ph===2?e:1;plate(R,XY,y0,z,S,S*2,ACT,a);lb(g,XY+S/2,'Y'+'₀₁'[g]+' = GeLU(X·A'+'₀₁'[g]+')',{c:ACT,a,fs:12.5,wide:1});
        if(ph===2)R.flow([[XX+S,y0+S,z],[XA+S,y0+S,z],[XY,y0+S,z]],{c:ACT,r:.07,speed:1.4})}
      // B: 4h × h, rows split
      if(ph>=3){const a=ph===3?e:1;plate(R,XB,y0+(g?0:S),z,S,S,WT,a);ghost(R,XB,y0+(g?S:0),z,S,S);lb(g,XB+S/2,'B'+'₀₁'[g],{c:WT,a});
        const ZA=ph===3?e:1;plate(R,XZ,y0,z,S,S*2,mix(ACT,P.c5,.5),ZA*.9);lb(g,XZ+S/2,'Z'+'₀₁'[g]+' = Y'+'₀₁'[g]+'·B'+'₀₁'[g],{c:P.c5,a:ZA,fs:12.5,wide:1});
        if(ph===3)R.flow([[XY+S,y0+S,z],[XB+S/2,y0+S,z],[XZ,y0+S,z]],{c:ACT,r:.07,speed:1.4})}
      // the sum: all-reduce (TP) gives Z on both; reduce-scatter (SP) gives each GPU the summed Z for its own tokens
      if(ph>=4){const a=e;if(sp){plate(R,XO,y0+(g?0:S),z,S,S,ACT,a);ghost(R,XO,y0+(g?S:0),z,S,S)}else plate(R,XO,y0,z,S,S*2,ACT,a);
        lb(g,XO+S/2,sp?'Z, own tokens':'Z = Z₀ + Z₁',{c:ACT,a,wide:1})}}
    // collectives between the lanes
    const coll=(nm,x,cl)=>{const a=Math.min(1,e*2);R.flowArc([x,y0+S*1.5,Z0+.1],[x,y0+S*1.5,Z1-.1],.5,{c:P.c6,a,r:.075,speed:1.5});R.flowArc([x+.35,y0+S*1.2,Z1-.1],[x+.35,y0+S*1.2,Z0+.1],.4,{c:P.c6,a,r:.075,speed:1.5});
      R.label([x+.2,y0+.05,0],nm,{fs:12.5,b:1,c:P.c6,a})};
    if(sp&&ph===1)coll('all-gather of X',XX+S/2);
    if(ph===4)coll(sp?'reduce-scatter':'all-reduce',XZ+S*1.3);
}
  const st=S3.stage({id:'stg-tpb',list:'sx-tpb',fig:'Fig. 7 · one feed-forward block, two GPUs',cam:[.14,.42],bounds:[[-5.3,0,-2.1],[6.1,2.1,2.1]],aspect:.58,dur:1600,hold:4600,draw,
    margin:w=>w<520?[12,8,12,8]:[18,14,18,64]});
  (window.DTSTG=window.DTSTG||{})['stg-tpb']=st;
  const seg=document.getElementById('tpbM');if(seg&&st)RD.seg(seg,m=>{mode=m;document.getElementById('sx-tpb').hidden=m!=='tp';document.getElementById('sx-tpbs').hidden=m!=='sp';st.list(m==='tp'?'sx-tpb':'sx-tpbs')});
})();
