// ---- Scene: one real Q8_0 block (CL.quant: the first 34 bytes of blk.0.attn_q.weight), the same weights as Q4_0, the repack into block_q8_0x4, and the SDOT kernel (renderer v2) ----
// Bytes are drawn to scale (0.1 world units per byte). Row 0's values are the recorded block; rows 1 to 3 of the repack are structure only (no values were read).
// The interleave (4 scales, then each row's bytes 4 at a time) and the eight vdotq_laneq_s32 per block follow repack.h and arch/arm/repack.cpp as excerpted on the page.
(function(){
  if(!document.getElementById('stg-quant')||!window.S3||!window.CLX||!CLX.CL.quant)return;const {at,off,mix,cl,lerp,lerp3}=S3;
  const Q=CLX.CL.quant,x=Q.x,n=32,BW=.1,X0=-1.7;           // the block: d at [-1.7,-1.5], q bytes from -1.5 to 1.7
  const amaxI=x.reduce((b,v,i)=>Math.abs(v)>Math.abs(x[b])?i:b,0),W=Math.max(...x.map(Math.abs));
  const deq4=Q.q4.map(q=>Q.d4*(q-8)),W4=Math.max(W,...deq4.map(Math.abs));
  const qx=j=>X0+.2+(j+.5)*BW;                             // centre of weight j's byte in the Q8_0 block
  const ROWZ=[0,-.5,-1,-1.5],RIB=[1.0,1.5],RX0=-3.2,SX0=-4.25,AZ=2.35,PY=.75; // source rows, ribbon (b_low, b_high), scales slot, activation row, plinth height
  // the woven position of byte j of row r: groups of 4 bytes, the 4 rows in turn (repack interleave 4)
  const woven=(r,j)=>{const t=Math.floor(j/4)*16+r*4+(j%4);return [RX0+(t%64+.5)*BW,0,RIB[t<64?0:1]]};
  function plinth(R,c,wd,a){R.box([c[0],c[1]-.04,c[2]],[wd+.1,.04,.3],{a,shadow:false})}
  function draw(R,k,e){const P=R.P,ROW=[P.c1,P.c2,P.c3,P.c4];R.grid(-5,5,-2.2,3,.5);
    // the stored block (row 0): d, then 32 signed bytes, flat on the floor; it moves into the ribbon at step 4
    const mv=k===3?e:k>3?1:0;
    for(let r=0;r<4;r++){const ra=r===0?(k>=4?.0:1):(k===3?Math.min(1,e*3):0)*(1-cl((e-.75)*4,0,1));
      if(r>0&&k!==3)continue;
      // scales
      const sd=[X0+.1,0,ROWZ[r]],td=[SX0+(r*2+1)*BW,0,(RIB[0]+RIB[1])/2];
      R.box(r===0?lerp3(sd,td,mv):lerp3(sd,td,cl(e*1.4-.2,0,1)),[.2-.02,.12,.32],{fill:mix(P.paper,P.c5,.6),a:r===0?1:Math.max(ra,k===3?cl(e*3,0,1):0),shadow:false});
      for(let j=0;j<n;j++){const s0=[qx(j),0,ROWZ[r]],t0=woven(r,j),u=r===0?mv:cl(e*1.4-.2-j*.004,0,1),p=lerp3(s0,t0,u);
        const fill=k>=3?mix(P.paper,ROW[r],.55):j===amaxI&&k>=1?mix(P.paper,P.acc,.6):P.paper;
        R.box(p,[BW-.015,.12,.32],{fill,a:r===0?1:cl(e*3,0,1),shadow:false,lw:.6})}}
    // after the repack the other rows' bytes and scales sit in the ribbon too
    if(k>=4)for(let r=1;r<4;r++){R.box([SX0+(r*2+1)*BW,0,(RIB[0]+RIB[1])/2],[.18,.12,.32],{fill:mix(P.paper,P.c5,.6),a:1,shadow:false});
      for(let j=0;j<n;j++)R.box(woven(r,j),[BW-.015,.12,.32],{fill:mix(P.paper,ROW[r],.55),a:1,shadow:false,lw:.6})}
    if(k<=2){R.label([X0+.1,.12,0],'d · 2 bytes',{mono:true,fs:12,dy:-12,c:P.c5,b:1,a:k===0?e:1});
      R.label([X0+.2+16*BW,0,.5],'q · 32 signed bytes · 34 bytes in all',{mono:true,fs:12,dy:14,a:k===0?e:k===1?.7:0})}
    // steps 2 and 3: the integers as signed bars on a plinth above the block, then Q4_0's 16 levels in front
    const ba=k===1?e:k===2?1:k===3?off(k,e,3):0;
    if(ba>.01){plinth(R,[0,PY,0],3.3,ba);
      x.forEach((v,j)=>{const h=Math.max(.012,Math.abs(v)/W*.6),hot=j===amaxI;if(k!==2)R.box([qx(j),v>=0?PY:PY-.04-h,0],[BW*.72,h,.12],{fill:hot?P.acc:mix(P.paper,P.c1,.55),a:ba,shadow:false,lw:.6})});
      if(k===1){R.label([qx(amaxI),PY+.62,0],'q = 127 · the largest',{mono:true,fs:12,dy:-10,b:1,c:P.acc,a:e});R.label([1.7,PY,0],'weight = d × q',{al:'left',dx:10,mono:true,fs:12,a:e,wide:1})}}
    const b4=k===2?e:0;
    if(b4>.01){const z4=0;
      deq4.forEach((v,j)=>{const h=Math.max(.012,Math.abs(v)/W4*.6),t=Math.abs(x[j])/W4*.6;R.box([qx(j),v>=0?PY:PY-.04-h,z4],[BW*.72,h,.12],{fill:mix(P.paper,P.c2,.6),a:b4,shadow:false,lw:.6});
        const y0=x[j]>=0?PY+t:PY-.04-t,y1=v>=0?PY+h:PY-.04-h;R.box([qx(j),y0-.006,z4],[BW*.9,.012,.16],{fill:P.ink,a:b4*.8,shadow:false,edge:false});
        if(Math.abs(y1-y0)>.01)R.line([[qx(j),y0,z4+.08],[qx(j),y1,z4+.08]],{c:P.bad,w:3,a:b4,top:1})});
      R.label([1.7,PY,z4],'Q4_0: 16 levels · 18 bytes',{al:'left',dx:10,mono:true,fs:12,b:1,c:P.c2,a:b4,wide:1});
      // its 18 bytes to scale, on the floor in front
      for(let j=0;j<18;j++)R.box([X0+(j+.5)*BW*1,0,.75],[BW-.015,.1,.3],{fill:j<2?mix(P.paper,P.c5,.6):mix(P.paper,P.c2,.45),a:b4,shadow:false,lw:.6});
      R.label([X0+.9,.1,.9],'Q4_0 block · 18 bytes',{mono:true,fs:12,dy:14,b:1,c:P.c2,a:b4})}
    if(k===3){R.label([SX0+.4,.12,(RIB[0]+RIB[1])/2],'4 scales',{mono:true,fs:12,dy:-12,c:P.c5,a:e,wide:1});
      R.label([RX0+3.2,.12,RIB[0]-.2],'block_q8_0x4 · 136 bytes · 4 bytes of each row in turn',{mono:true,fs:12,dy:-12,b:1,a:e,wide:1})}
    if(k===3)for(let r=0;r<4;r++)R.label([X0,0,ROWZ[r]],'row '+r+(r?' · no values read':''),{al:'right',dx:-8,mono:true,fs:12,c:ROW[r],a:cl(1-e*1.6,0,1),grp:'rows'});
    // steps 5 and 6: the activation block and the eight SDOT instructions
    if(k>=4){const aa=k===4?e:1;R.box([X0+.1,0,AZ],[.18,.12,.32],{fill:mix(P.paper,P.c5,.6),a:aa,shadow:false});
      const m=k===4?0:Math.min(7,Math.floor(e*8)),lane=m%4,reg=Math.floor(m/4);   // instruction m: register val[m%4] of b_low (m<4) or b_high, lane m%4 of a.val[m>=4]
      for(let j=0;j<n;j++){const on=j>=reg*16+lane*4&&j<reg*16+lane*4+4,used=k===5&&j<reg*16+lane*4;R.box([qx(j),0,AZ],[BW-.015,.12,.32],{fill:on?P.c2:used?mix(P.paper,P.c2,.35):P.paper,a:aa,shadow:false,lw:.6})}
      R.label([1.7,0,AZ],'activation · Q8_0',{al:'left',dx:10,mono:true,fs:12,c:P.c2,a:aa,wide:1});
      // the 16 bytes of the weight register used: 4 bytes from each of the 4 rows
      const t0=m*16,z=RIB[t0<64?0:1];R.box([RX0+(t0%64+8)*BW,.12,z],[16*BW,.03,.36],{fill:P.acc,a:.9,shadow:false,edge:false});
      const src=[qx(reg*16+lane*4+2),.12,AZ];
      for(let r=0;r<4;r++){const dst=[RX0+(t0%64+r*4+2)*BW,.14,z];R.flowArc(src,dst,.5,{c:P.c2,a:aa,r:.05,n:6,speed:1.4})}
      // four 32-bit sums, one per row
      for(let r=0;r<4;r++){const o=[3.9,0,.85+r*.32];R.box(o,[.32,.18+(k===5?.3*e:0),.22],{fill:mix(P.paper,ROW[r],.6),a:aa,shadow:false});
        R.flow([[RX0+(t0%64+r*4+2)*BW,.16,z],[3.9,.25,o[2]]],{c:ROW[r],a:aa*.8,r:.045,n:5,speed:1.6})}
      R.label([4.05,0,2.0],k===4?'4 sums · 16 multiply-adds':'4 outputs · one FMA applies both scales',{al:'right',mono:true,fs:12,dy:18,b:1,a:aa,wide:1});
      R.label([RX0+(t0%64+8)*BW,.15,z-.2],'vdotq_laneq_s32 '+(m+1)+' of 8',{mono:true,fs:12.5,b:1,dy:-14,c:P.acc,a:aa})}
  }
  const full={cam:[.28,.95],bounds:[[-4.5,0,-1.6],[4.3,.4,2.6]]};
  S3.stage({id:'stg-quant',list:'sx-quant',fig:'Fig. 3 · one real block, to scale',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:4800,draw,
    // the block steps move in close on the 34 bytes; the repack and the kernel need the whole floor
    view:k=>k===0?{cam:[.3,.5],bounds:[[-1.9,0,-.3],[2.2,.3,.6]]}:k<=2?{cam:[.3,.42],bounds:[[-1.9,0,-.3],[2.9,1.5,k===2?.9:.5]]}:k===3?{cam:[.28,.85],bounds:[[-4.5,0,-1.6],[3.4,.4,1.7]]}:{cam:[.28,.95],bounds:[[-4.5,0,.6],[4.3,.4,2.6]]},
    margin:w=>w<520?[16,10,16,10]:[20,20,18,20]});
})();
