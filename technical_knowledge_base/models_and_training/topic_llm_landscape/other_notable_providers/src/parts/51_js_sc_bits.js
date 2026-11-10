// ---- Scene (stg-bits): the same 27B weights at 16, 8, 4 and 1.76 bits per weight against one RTX 5090's 32 GB (renderer v2) ----
// Each slab is one bit of every weight: 27 x 10^9 bits = 3.375 GB, so a column is as tall as its bits per weight and its memory is slabs x 3.375 GB
// (27 x 10^9 x bits / 8, the page's formula; Prism ML's 1.76 effective bits and 5.9 GB). The glass plane is the card's memory. The close-up's
// ternary values and groups are illustrative (Prism does not state the group size in the source read). window.ONP_BITS for the checks.
(function(){
  if(!document.getElementById('stg-bits'))return;const {at,off,lerp,mix}=S3;
  const NP=27e9,BITS=[16,8,4,1.76],GB=b=>NP*b/8/1e9,CARD=32,SLAB=NP/8/1e9; // 3.375 GB per slab
  const f2=v=>v>=10?(v%1?v.toFixed(1):String(v)):v.toFixed(2);
  window.ONP_BITS={GB,need:[[0,'54 GB'],[0,'3.375 GB'],[0,'32 GB'],[1,'27 GB'],[1,(CARD-GB(8)).toFixed(0)+' GB'],[2,'13.5 GB'],[3,GB(1.76).toFixed(2)+' GB'],[3,(16/1.76).toFixed(2)],[4,Math.log2(3).toFixed(2)+' bits'],[5,'54 GB'],[5,GB(1.76).toFixed(2)+' GB']]};
  const SH=.17,XS=[-3.45,-1.15,1.15,3.45],FW=1.7,YC=CARD/SLAB*SH;
  const NAME=['16-bit','8-bit','4-bit','ternary, 1.76 bits'];
  const rnd=mulberry32(27);const TV=[];for(let i=0;i<36;i++){const r=rnd();TV.push(r<.3?-1:r<.62?0:1)} // illustrative ternary values
  function column(R,j,a,grow){const P=R.P,b=BITS[j],col=[P.c4,P.c6,P.c5,P.acc][j],ns=Math.ceil(b-1e-9);
    for(let s=0;s<ns;s++){const part=Math.min(1,b-s),y=s*SH;if(s>=grow*b)break;const over=y+SH*part>YC+1e-6;
      R.box([XS[j],y,0],[FW,SH*part*.86,FW],{fill:mix(P.paper,over?P.bad:col,over?.55:.62+.12*(s%2)),a,shadow:s===0,lw:.6})}}
  function draw(R,k,e,st){const P=R.P;R.grid(-5.5,5.5,-2.4,2.4,.5);
    const zoom=k===4;
    BITS.forEach((b,j)=>{const ap=at(k,e,j),a=(k<4?(j===k?1:j<k?.55:0):k===4?(j===3?1:.2):1)*(j<=k||k>3?1:0);
      if(a<=.01||(k<4&&ap<=0))return;column(R,j,a,k===j?ap:1);
      const g=GB(b),ov=g>CARD;
      if(a<.3)return;R.label([XS[j],0,FW/2+.2],NAME[j],{fs:13,b:1,c:mix([P.c4,P.c6,P.c5,P.acc][j],P.ink,.25),dy:14,a:Math.max(a,.5)});
      R.label([XS[j],0,FW/2+.2],f2(g)+' GB'+(ov&&R.W>=520?' · does not fit':''),{fs:12.5,c:ov?P.bad:P.mute,b:ov?1:0,dy:31,a:Math.max(a,.5)})});
    // the card's memory as a glass plane: what sits under it fits
    const ga=k===4?.25:1;R.glass([-4.6,YC,-1.15],[9.2,0,0],[0,0,2.3],{c:P.bad,a:ga*.45,nu:12,nv:3,th:.02});
    if(k!==4)R.label([4.6,YC,-1.15],'RTX 5090 · 32 GB',{al:'left',dx:8,fs:12.5,b:1,c:P.bad,a:ga,wide:1});
    // 3: the ratio to 16-bit
    if(k===3)R.label([XS[3],0,FW/2+.2],'9.09× smaller than 16-bit',{fs:13,b:1,c:P.acc,dy:50,a:e});
    // 4: close up on the ternary column: weights in {-1, 0, +1} (illustrative), one FP16 scale per group of six
    if(k===4){const za=e,y0=BITS[3]*SH+.32,cw=FW/6,h=.22;R.box([XS[3],y0-.03,0],[FW+.1,.03,FW+.1],{a:za,shadow:false});
      [-1,1].forEach(sx=>R.box([XS[3]+sx*FW/2,BITS[3]*SH,0],[.03,y0-.03-BITS[3]*SH,.03],{a:za*.9,shadow:false}));
      TV.forEach((v,i)=>{const r=Math.floor(i/6),c=i%6,px=XS[3]-FW/2+cw*(c+.5),pz=-FW/2+cw*(r+.5);
        R.box([px,v<0?y0-.03-h:y0,pz],[cw*.6,v===0?.012:h,cw*.6],{fill:v>0?mix(P.paper,P.acc,.85):v<0?mix(P.paper,P.c2,.85):mix(P.paper,P.ink,.15),a:za,shadow:false,lw:.5})});
      for(let r=0;r<6;r++)R.glass([XS[3]+FW/2+.08,y0,-FW/2+cw*r+.04],[.32,0,0],[0,0,cw-.08],{c:P.c5,a:za,nu:1,nv:1,th:.03});
      R.label([XS[3],y0+.3,-FW/2],'+1 up · 0 flat · −1 hangs below',{dy:-10,fs:12.5,b:1,c:P.ink,a:za});
      R.label([XS[3]+FW/2+.4,y0+.05,0],'one FP16 scale per group',{al:'left',dx:8,fs:12.5,b:1,c:mix(P.c5,P.ink,.3),a:za})}
    // 5: decoding one token at batch 1 reads every weight once: dots stream from the weights to the token, as many as the gigabytes read
    if(k===5){const tk=[0,3.3,0];R.glow(tk,.35,{c:P.ink,a:.45*e});R.ball(tk,.1,{c:P.ink,a:e});R.label(tk,'one decoded token',{fs:12.5,b:1,dy:-16,a:e});
      BITS.forEach((b,j)=>{const g=GB(b);R.flowArc([XS[j],b*SH+.05,0],tk,.5,{c:[P.c4,P.c6,P.c5,P.acc][j],a:e*.9,n:Math.max(3,Math.round(g/1.1)),r:.06,speed:1.1})})}
  }
  const full={cam:[.3,.42],bounds:[[-4.4,0,-1.2],[4.4,2.8,1.4]]};
  S3.stage({id:'stg-bits',list:'sx-bits',fig:'One 27B model at four precisions',cam:full.cam,bounds:full.bounds,aspect:.48,dur:1400,hold:4600,draw,
    view:k=>k===4?{cam:[.55,.62],bounds:[[XS[3]-1.6,0,-1.2],[XS[3]+1.9,BITS[3]*SH+.8,1.2]]}:k===5?{cam:[.3,.36],bounds:[[-4.4,0,-1.2],[4.4,3.6,1.4]]}:full,
    margin:w=>w<520?[14,10,40,10]:[18,130,44,20]});
})();
