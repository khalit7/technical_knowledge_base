// ---- Scene (stg-mem): what each layer holds for one sequence, Qwen3-30B-A3B (a transformer) against Nemotron 3 Nano (a Mamba-2 hybrid), renderer v2 ----
// From each config.json (the same numbers as recompute.py / recompute.out): Qwen 48 attention layers x 4 KV heads x 128 x 2 (K and V) x 2 bytes = 2 KiB per layer per token;
// Nano's 52-layer pattern below (M Mamba-2, E MoE, * attention) with 2 KV heads (1 KiB per layer per token) and a fixed Mamba-2 state of 64 heads x 64 x 128 float32
// plus a (4096 + 2*8*128) x 3 BF16 convolution buffer per layer. One column per layer, its height the bytes that layer holds at this context, one scale for both models
// (rescaled per step, the tallest column named). The last step puts the caches into one H100's memory left over after the BF16 weights. window.ONP_MEM for the checks.
(function(){
  if(!document.getElementById('stg-mem'))return;const {at,off,lerp,mix}=S3;
  const PAT='MEMEM*EMEMEM*EMEMEM*EMEMEM*EMEMEM*EMEMEMEM*EMEMEMEME';
  const KVQ=2*4*128*2,KVN=2*2*128*2,MS=64*64*128*4+(4096+2*8*128)*3*2,NM=23,NA=6;
  const WQ=30.53e9*2,WN=31.58e9*2,HBM=80e9; // BF16 weights (parameters from each card) and one H100's memory
  const NS=[0,1,512,4096,131072,1048576,131072];
  const per=(m,n)=>m==='q'?48*KVQ*n:(n>0?NM*MS:0)+NA*KVN*n;
  const fits=(m,n)=>Math.floor((HBM-(m==='q'?WQ:WN))/per(m,n));
  const GiB=2**30,MiB=2**20,KiB=1024;
  const B=v=>v>=GiB?(v/GiB).toFixed(v/GiB>=10?0:1)+' GiB':v>=MiB?(v/MiB).toFixed(v/MiB>=100?0:1)+' MiB':v>=KiB?Math.round(v/KiB)+' KiB':v+' B';
  const f=v=>v.toLocaleString('en-GB'),cross=Math.round(NM*MS/(48*KVQ-NA*KVN));
  const N131=131072;
  window.ONP_MEM={per,fits,cross,need:[[1,'2 KiB per layer'],[1,'96 KiB per token'],[1,'6 KiB'],[1,(NM*MS/MiB).toFixed(1)+' MiB'],
    [2,(per('q',512)/MiB).toFixed(0)+' MiB'],[2,(per('n',512)/MiB).toFixed(1)+' MiB'],[2,f(cross)],[3,B(per('q',4096))],[3,(per('n',4096)/MiB).toFixed(1)+' MiB'],[3,(per('q',4096)/per('n',4096)).toFixed(1)+'×'],
    [4,B(per('q',N131))],[4,(per('n',N131)/MiB).toFixed(1)+' MiB'],[4,(per('q',N131)/per('n',N131)).toFixed(1)+'×'],[5,B(per('q',1048576))],[5,(per('n',1048576)/GiB).toFixed(2)+' GiB'],
    [6,f(fits('q',N131))+' sequence'],[6,f(fits('n',N131))+' sequences'],[6,Math.round((HBM-WQ)/1e9)+' GB'],[6,Math.round((HBM-WN)/1e9)+' GB']]};
  // each model's layers as a block of columns (8 across, in layer order from the front left), the two blocks side by side
  const PI=.44,TW=.34,HM=2.7,CX={q:-2.35,n:2.35},COLS=8;
  const pos=(m,i,L)=>{const r=Math.floor(i/COLS),c=i%COLS,rows=Math.ceil(L/COLS);return [CX[m]+(c-(COLS-1)/2)*PI,(rows-1)/2*PI-r*PI]};
  const held=(t,n)=>t==='A'?KVQ*n:t==='*'?KVN*n:t==='M'?(n>0?MS:0):0;
  const top=n=>Math.max(KVQ*n,n>0?MS:1);
  const QL=Array(48).fill('A'),NL=PAT.split('');
  function draw(R,k,e,st){const P=R.P;R.grid(-5,5,-2.4,2.4,.5);
    const L6=k===6,n0=L6?NS[st.pk===6?5:st.pk]:NS[st.pk],n1=L6?n0:NS[k],t=L6||k===st.pk?1:e,sc=lerp(top(n0),top(n1),t),hh=v=>Math.max(.012,HM*v/sc);
    const col=c=>({A:mix(P.paper,P.c1,.8),'*':mix(P.paper,P.c1,.8),M:mix(P.paper,P.c3,.75),E:mix(P.paper,P.ink,.12)})[c];
    const ba=k===6?Math.max(0,1-2*e):st.pk===6&&k<6?e:1,fa=k===6?Math.max(0,2*e-1):0;  // the last step fades the blocks out fully, then the H100 in
    const GC={q:P.c1,n:mix(P.c3,P.ink,.15)};
    [[QL,'q'],[NL,'n']].forEach(([L,m])=>{if(ba>.01){L.forEach((c,i)=>{const [px,pz]=pos(m,i,L.length),v=lerp(held(c,n0),held(c,n1),t);
        R.box([px,0,pz],[TW,.05,TW],{fill:mix(col(c),P.paper,.3),a:ba,shadow:false,lw:.4});
        if(k>=1&&v>0)R.box([px,.05,pz],[TW*.8,hh(v),TW*.8],{fill:col(c),a:ba,shadow:false,lw:.5})});
      // totals above each block
      if(k>=1&&k<6){R.label([CX[m],HM+.15,-1.6],B(per(m,n1))+' per sequence',{fs:14,b:1,c:GC[m],dy:-8});if(m==='n')R.label([0,0,2.45],'one scale for both: tallest column '+B(sc),{fs:12,mono:true,c:P.mute,dy:4,wide:1})}}
      const rows=Math.ceil(L.length/COLS),zf=(rows-1)/2*PI+.35;
      R.label([CX[m],0,zf],m==='q'?'Qwen3-30B-A3B':'Nemotron 3 Nano',{fs:13.5,b:1,c:GC[m],dy:16});
      R.label([CX[m],0,zf],m==='q'?'48 layers, each attention + MoE':'23 Mamba-2 · 23 MoE · 6 attention',{fs:12,c:P.mute,dy:33,wide:1})});
    // the token arriving: new keys and values stream into every attention layer; the Mamba-2 states are updated in place
    if(k>=1&&k<=5){const tk=[0,1.5,.6];R.glow(tk,.3,{c:P.ink,a:.4});R.ball(tk,.09,{c:P.ink});
      QL.forEach((c,i)=>{if(i%2)return;const [px,pz]=pos('q',i,48);R.flowArc(tk,[px,hh(KVQ*n1)+.08,pz],.4,{c:P.c1,a:.6,r:.045,n:3,speed:1.3})});
      NL.forEach((c,i)=>{if(c!=='*')return;const [px,pz]=pos('n',i,52);R.flowArc(tk,[px,hh(KVN*n1)+.08,pz],.4,{c:P.c1,a:.9,r:.05,n:5,speed:1.3})});
      R.label(tk,'new token',{fs:12,c:P.mute,dy:-14});
      if(k===1){const [px,pz]=pos('n',7,52);R.label([px+.2,hh(MS),pz],'Mamba-2 state · 2 MiB',{fs:12.5,b:1,c:GC.n,al:'left',dx:6});
        const [qx,qz]=pos('q',0,48);R.label([qx-.2,.1,qz],'2 KiB per layer',{fs:12.5,b:1,c:P.c1,al:'right',dx:-6})}}
    // the last step: one H100's memory left after the BF16 weights, filled with sequences of 131,072 tokens
    if(fa>.01){const GB=HM/19.5;
      [['q',WQ],['n',WN]].forEach(([m,w])=>{const fr=(HBM-w)/1e9,cnt=fits(m,N131),s=per(m,N131)/1e9,c=GC[m];
        R.box([CX[m],0,0],[2.2,fr*GB,1.8],{fill:mix(P.paper,c,.1),fa:.12,a:fa,shadow:false,lw:.8});
        for(let j=0;j<cnt;j++){const aj=Math.min(1,Math.max(0,fa*cnt*1.2-j*.9));if(aj<=0)continue;R.box([CX[m],j*s*GB,0],[1.9,s*GB*.88,1.5],{fill:mix(P.paper,c,.7),a:aj,shadow:false,lw:.5})}
        R.label([CX[m],fr*GB,-.9],f(cnt)+(cnt===1?' sequence fits':' sequences fit'),{fs:14,b:1,c,dy:-10,a:fa});
        R.label([CX[m],fr*GB,-.9],Math.round(fr)+' GB free after '+Math.round(w/1e9)+' GB of weights',{fs:12,c:P.mute,dy:-28,a:fa})})}
  }
  S3.stage({id:'stg-mem',list:'sx-mem',fig:'What each layer holds for one sequence · from config.json',cam:[.42,.52],bounds:[[-4.2,0,-1.7],[4.2,3.1,2.35]],aspect:.62,dur:1500,hold:4800,draw,
    view:k=>k===0?{cam:[.42,.8],bounds:[[-4.2,0,-1.7],[4.2,.6,1.9]]}:null,
    margin:w=>w<520?[34,10,30,10]:[44,20,40,20]});
})();
