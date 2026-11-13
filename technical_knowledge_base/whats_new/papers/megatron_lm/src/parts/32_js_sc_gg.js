// ---- Scene (Fig. 3): the 8.3B run's 512 GPUs as the paper groups them (Appendix B.1, Figure 8), renderer v2 ----
// 32 DGX-2H servers (slabs, 4 across and 8 deep), each 16 V100 cubes in two rows of 8, numbered as in Figure 8: GPU n is in server
// ceil(n / 16); its model-parallel group is the 8 GPUs of its row (8g + 1 to 8g + 8), its data-parallel group the 64 GPUs at the same
// position in every group (n, n + 8, ..., one in each row of every server). The GPU lit is the one picked with the slider under the step list
// (window.GG_GPU, 13_js_read.js); flows: blue the f and g all-reduces of one model-parallel group on NVSwitch, green the data-parallel
// gradient all-reduce across servers. Counts are the page's: 8-way TP, 64-way DP, 512 GPUs, 4 all-reduces per layer, 72 layers.
(function(){
  if(!document.getElementById('stg-gg')||!window.S3)return;const {mix}=S3;
  const PX=.3,RZ=.17,CW=2.9,RD=1.25,GS=.24,GH=.2,SL=.06;
  const srvC=s=>[((s%4)-1.5)*CW,0,(3.5-Math.floor(s/4))*RD];
  const gpuC=n=>{const s=n>>4,k=n&15,c=srvC(s);return [c[0]+((k&7)-3.5)*PX,SL,c[2]+((k>>3)?-RZ:RZ)]};
  const top=n=>{const c=gpuC(n);return [c[0],c[1]+GH,c[2]]};
  const sel=()=>Math.max(0,Math.min(511,(window.GG_GPU||1)-1));
  function draw(R,k,e){const P=R.P,n0=sel(),g0=n0>>3,p0=n0&7,s0=n0>>4;R.grid(-6.4,6.4,-5.2,5.2,.5);
    for(let s=0;s<32;s++){const c=srvC(s),mine=s===s0,a=k<=1?(mine?1:.18):1;
      R.box([c[0],0,c[2]],[8*PX+.22,SL,2*RZ+.42],{fill:mine&&k<=1?mix(P.paper,P.c1,.08):P.paper,a,dz:30,shadow:k>=2});
      for(let j=0;j<16;j++){const n=s*16+j,g=n>>3,inG=g===g0,inD=(n&7)===p0,me=n===n0;let f=P.paper,ga=a;
        if(k<=1){if(mine)f=inG?P.c1:mix(P.paper,P.c1,.35)}
        else if(k===2)f=(g&1)?mix(P.paper,P.c1,.35):mix(P.paper,P.c1,.75);
        else{f=inD?P.c3:inG?mix(P.paper,P.c1,.6):P.paper;ga=inD||inG?1:.35}
        if(me)f=P.c2;
        R.box(gpuC(n),[GS,GH,GS],{fill:f,a:ga,shadow:false,lw:.6})}}
    const c0=srvC(s0),r0=(n0>>3)&1;
    if(k<=1){R.label([c0[0]-4*PX-.1,SL+GH,c0[2]+RZ],'GPUs '+(s0*16+1)+'–'+(s0*16+8),{al:'right',dx:-8,fs:12.5,mono:true,b:!r0,c:P.c1,grp:'row'});
      R.label([c0[0]-4*PX-.1,SL+GH,c0[2]-RZ],'GPUs '+(s0*16+9)+'–'+(s0*16+16),{al:'right',dx:-8,fs:12.5,mono:true,b:!!r0,c:P.c1,grp:'row'});
      R.label([c0[0],SL,c0[2]+RZ+.21],'server '+(s0+1)+': 16 V100s on NVSwitch, 300 GB/s',{fs:12.5,dy:30,c:P.ink,a:k===0?1:.7})}
    // step 2: f and g, a ring of all-reduces among the 8 GPUs of the group
    if(k===1){const m=[...Array(8)].map((_,j)=>top(g0*8+j));for(let j=0;j<7;j++)R.flowArc(m[j],m[j+1],.12,{c:P.c1,a:e,r:.045,n:3,speed:.9});
      R.flowArc(m[7],m[0],.45,{c:P.c1,a:e,r:.045,n:8,speed:1.4});
      R.label([c0[0],.95,c0[2]],'4 all-reduces per layer, 288 per iteration',{fs:13,b:1,c:P.c1,a:e})}
    if(k===2)R.label([0,.9,-5.0],'32 servers, 512 GPUs: 64 copies of the model',{fs:13.5,b:1,c:P.ink,a:e});
    // step 4: the data-parallel group, one ring through every server
    if(k===3){const m=[];for(let j=0;j<64;j++)m.push(top(p0+8*j));
      for(let j=0;j<64;j++){const a=m[j],b=m[(j+1)%64],far=(j&1)===1;R.flowArc(a,b,far?(j===63?1.6:.5):.1,{c:P.c3,a:e,r:.05,n:far?4:2,speed:1.3})}
      R.label([0,1.6,-5.0],'data-parallel group: GPUs '+(p0+1)+', '+(p0+9)+', ..., '+(p0+505),{fs:13.5,b:1,c:P.c3,a:e});
      R.label([0,1.6,-5.0],'gradient all-reduce once per step, InfiniBand',{fs:12.5,c:P.c3,a:e,dy:20})}
  }
  const full={cam:[.3,.82],bounds:[[-6.2,0,-5.3],[6.2,1.6,5.3]]};
  const close=()=>{const c=srvC(sel()>>4);return {cam:[.4,.62],bounds:[[c[0]-1.9,0,c[2]-.8],[c[0]+1.5,.9,c[2]+.8]]}};
  window.GG_STAGE=S3.stage({id:'stg-gg',list:'sx-gg',fig:'Fig. 3 · the 8.3B run: 32 DGX-2H servers, 512 V100s',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1500,hold:5000,draw,
    view:k=>k<=1?close():full,margin:w=>w<520?[18,8,12,8]:[20,14,14,14]});
})();
