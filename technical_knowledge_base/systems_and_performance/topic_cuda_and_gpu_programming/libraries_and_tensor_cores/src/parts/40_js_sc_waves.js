// ---- Scene, Fig. 1 (section 3): a GEMM's work as a city of columns. The floor is the output matrix cut into tiles; each tile's column is its
// K loop, one slab per K slice of 64 (one MAC-loop iteration); beside it, the GPU's SMs. Every count comes from window.GS.plan, the page's
// scheduler model (checked against recompute.py by check/check_page.mjs): NVIDIA's A100 example (108 and 117 tiles of 256 x 128 on 108 SMs),
// then 1,024 x 1,024 x 16,384 on an H100 (132 SMs) with 128 x 256 tiles, data-parallel, split-K 4 ways and Stream-K.
// Which tile runs in which wave follows the launch order the model assumes (tile t on SM t mod P, tiles numbered row by row): an assumption of the model.
// Steps are explained by #sx-waves on the left. ----
(function(){
  if(!document.getElementById('stg-waves'))return;const {at,off,lerp,mix,cl}=S3;
  const A1=[2304,1536,4096,256,128,108],A2=[2304,1544,4096,256,128,108],B=[1024,1024,16384,128,256,132];
  const plan=(c,s)=>GS.plan(c[0],c[1],c[2],c[3],c[4],c[5],s);
  const R1=plan(A1,'dp'),R2=plan(A2,'dp'),R4=plan(B,'dp'),R5=plan(B,'sk4'),R6=plan(B,'stream');
  // Stream-K chunks: SM sm covers iterations [sm*per, (sm+1)*per) of the T*I in a row, cut at tile boundaries (the same rule as GS.plan)
  const W6=R6.T*R6.I,PER6=Math.ceil(W6/R6.P),CH=[];
  for(let sm=0;sm<R6.P;sm++){let a=sm*PER6;const b=Math.min(W6,a+PER6);while(a<b){const t=Math.floor(a/R6.I),o=a%R6.I,l=Math.min(R6.I-o,b-a);CH.push({sm,t,o,l});a+=l}}
  const busy=r=>r.segs.filter(s=>s.length).length;
  // words in the step list (#sx-waves), checked against these by check/check_stages.mjs
  window.LT_WAVES={I1:R1.I,busy2:busy(R1),time2:R1.time,util2:R1.util,tail3:R2.T-R2.P,idle3:R2.P-(R2.T-R2.P),time3:R2.time,util3:R2.util,
    T4:R4.T,I4:R4.I,busy4:busy(R4),util4:R4.util,time4:R4.time,units5:R5.units,busy5:busy(R5),time5:R5.time,util5:R5.util,extra5:R5.extra,
    W6,per6:PER6,busy6:busy(R6),time6:R6.time,util6:R6.util,extra6:R6.extra,chunks6:CH};
  const TAB=['#4e79a7','#f28e2b','#59a14f','#b07aa1','#d4a72c','#76b7b2','#e15759','#9c755f'].map(S3.rgb);
  // geometry. Case A: 9 rows (M / 256) by 12 or 13 columns (N / 128); case B: 8 rows (M / 128) by 4 columns (N / 256). One unit = 512 elements.
  const UA=1/512,UB=1/300,HA=1.1,HB=2.2;
  function tileBox(c,r,cols,rows,bm,bn,x0,U){const w=bn*U,d=bm*U;return {x:x0+(c+.5)*w,z:(r+.5-rows/2)*d,w:w*.86,d:d*.86}}
  function smGrid(P){const cols=12,rows=Math.ceil(P/cols),pt=.3;return i=>({x:1.15+(i%cols)*pt,z:(Math.floor(i/cols)-(rows-1)/2)*pt})}
  const smA=smGrid(108),smB=smGrid(132);
  function draw(R,k,e){const P=R.P,W=R.W,H=R.H;R.grid(-5,5.5,-3,3,.5);
    const lab=(p,t,o)=>{const q=R.p(p);if(q[0]<4||q[0]>W-4||q[1]<4||q[1]>H-4)return;R.label(p,t,o)};
    const caseA=k<=2,aA=k<=2?1:k===3?Math.max(0,1-2.2*e):0,aB=k>=3?(k===3?Math.max(0,(e-.4)/.6):1):0;
    const ink=P.ink,ghost=P.dark?.22:.16;
    // ---- case A: NVIDIA's A100 example ----
    if(aA>0){const cols=k>=2?13:12,rows=9,x0=-4.1;
      const prog2=k===1?e:k>=2?1:0,w1=k===2?Math.min(1,e*2):k>2?1:prog2,w2=k===2?Math.max(0,e*2-1):k>2?1:0;
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const t=r*cols+c,b=tileBox(c,r,cols,rows,256,128,x0,UA),late=k>=2&&t>=108,nw=k===2&&c===12;
        const a=aA*(nw?Math.min(1,e*3):1);
        R.box([b.x,0,b.z],[b.w,HA,b.d],{fill:P.paper,a:a*ghost,fa:.35,shadow:false,lw:.6});
        const pr=late?w2:k===2?w1:prog2,col=late?P.c2:P.c1;
        const rec=k===2&&!late&&e>.5?1-.65*Math.min(1,(e-.5)*4):1;if(pr>0)R.box([b.x,0,b.z],[b.w,HA*pr,b.d],{fill:mix(P.paper,col,late?.75:.55),a:a*rec,shadow:false,lw:.6})}
      const smOn=i=>k===1?1:k===2?(e<.5?1:i<(R2.T-R2.P)?1:0):0;
      for(let i=0;i<108;i++){const p=smA(i),on=smOn(i),c2=k===2&&e>=.5;
        R.box([p.x,0,p.z],[.2,.2,.2],{fill:on?mix(P.paper,c2?P.c2:P.c1,.65):P.paper,a:aA*(on?1:.45),shadow:false,lw:.6})}
      // dots from the SMs to the tiles they work on
      if(k===1||k===2){const n=k===2&&e>=.5?2:6;for(let j=0;j<n;j++){const i=k===2&&e>=.5?[0,8][j]:j*18+4,p=smA(i),t=k===2&&e>=.5?108+i:i,b=tileBox(t%cols,Math.floor(t/cols),cols,rows,256,128,x0,UA);
        R.flowArc([p.x,.22,p.z],[b.x,HA+.05,b.z],.6,{c:k===2&&e>=.5?P.c2:P.c1,a:aA*.85,r:.06,n:6,speed:1.6})}}
      const tx=x0+cols*128*UA/2;
      lab([tx,0,2.3],(cols===13?'9 × 13 = 117 tiles':'9 × 12 = 108 tiles'),{mono:true,fs:12.5,b:1,dy:16,a:aA});
      lab([tx,0,2.3],'each a K loop of '+R1.I+' slices',{mono:true,fs:12,dy:33,c:P.mute,a:aA,wide:1});
      lab([2.8,0,1.4],'A100 · 108 SMs',{mono:true,fs:12.5,b:1,dy:16,a:aA,wide:1});
      const e3=k===2?e:1,s1=k===0?'waiting for work':k===1?'108 of 108 busy':e3<.5?'wave 1: 108 of 108 busy':'wave 2: '+(R2.T-R2.P)+' of 108 busy';
      lab([2.8,0,1.4],s1,{mono:true,fs:12.5,b:1,dy:R.W<520?16:33,c:k===0?P.mute:k>=2&&e3>=.5?P.c2:P.c1,a:aA});
      if(k>=1)lab([2.8,0,1.4],k===1?'done after '+R1.time+' iterations':'done after '+(e3<.5?R1.time:R2.time)+' iterations',{mono:true,fs:12,dy:50,c:P.mute,a:aA,wide:1})}
    // ---- case B: 1,024 x 1,024 x 16,384 on an H100 ----
    if(aB>0){const cols=4,rows=8,x0=-3.9,I=R4.I,hs=HB/I;
      const T=R4.T,cB=t=>tileBox(t%cols,Math.floor(t/cols),cols,rows,128,256,x0,UB);
      for(let t=0;t<T;t++){const b=cB(t);R.box([b.x,0,b.z],[b.w,HB,b.d],{fill:P.paper,a:aB*ghost,fa:.3,shadow:false,lw:.5})}
      if(k===3){const pr=Math.max(0,(e-.4)/.6);for(let t=0;t<T;t++){const b=cB(t);if(pr>0)R.box([b.x,0,b.z],[b.w,HB*pr,b.d],{fill:mix(P.paper,P.c1,.55),a:aB,shadow:false,lw:.6})}}
      if(k===4){const s=4,L=I/s,gap=.08*e;for(let t=0;t<T;t++){const b=cB(t);for(let l=0;l<s;l++)
          R.box([b.x,l*(L*hs+gap),b.z],[b.w,L*hs-(e>.05?.02:0),b.d],{fill:mix(P.paper,TAB[l],.25+.45*e),a:aB,shadow:false,lw:.6})}
        // the partial sums of the front row's tiles flow down into the output tile
        for(let c=0;c<cols;c++){const t=(rows-1)*cols+c,b=cB(t);for(let l=1;l<s;l++)R.flow([[b.x+b.w*.25,(l+.5)*L*hs+l*gap,b.z+b.d/2+.04],[b.x+b.w*.25,.06,b.z+b.d/2+.04]],{c:TAB[l],a:e,r:.045,n:3,speed:1})}}
      if(k===5){CH.forEach(ch=>{const b=cB(ch.t),y=ch.o*hs,h=ch.l*hs;R.box([b.x,y+(ch.o?.03*e:0),b.z],[b.w,h-(ch.o+ch.l<I||ch.o?.02:0),b.d],{fill:mix(P.paper,TAB[ch.sm%8],.25+.45*e),a:aB,shadow:false,lw:.6})});
        // fix-up: the pieces of each front-row tile hand their partial sums to the piece that finishes it
        for(let c=0;c<cols;c++){const t=(rows-1)*cols+c,b=cB(t),ps=CH.filter(ch=>ch.t===t);ps.slice(1).forEach(ch=>R.flow([[b.x+b.w*.25,(ch.o+ch.l/2)*hs,b.z+b.d/2+.04],[b.x+b.w*.25,ps[0].l*hs*.5,b.z+b.d/2+.04]],{c:TAB[ch.sm%8],a:e,r:.045,n:3,speed:.9}))}}
      // the SMs, lit by the work they hold
      const smCol=i=>{if(k===3)return i<T?P.c1:null;if(k===4)return i<R5.units?TAB[i%4]:null;if(k===5)return i<busy(R6)?TAB[i%8]:null;return null};
      for(let i=0;i<132;i++){const p=smB(i),c=smCol(i),a=k===3?(i<T?Math.max(.45,aB):.45*aB):aB*(c?1:.45);
        R.box([p.x,0,p.z],[.2,.2,.2],{fill:c?mix(P.paper,c,k===3?.55*Math.min(1,e*1.5):.65):P.paper,a,shadow:false,lw:.6})}
      // the work handed to the SMs
      if(k===3&&e>.4)for(let j=0;j<4;j++){const p=smB(j*8+3),b=cB(j*8+3);R.flowArc([p.x,.22,p.z],[b.x,HB+.05,b.z],.5,{c:P.c1,a:aB*.85,r:.06,n:6,speed:1.6})}
      const tx=x0+cols*256*UB/2,tz=rows*128*UB/2+.1;
      lab([tx,0,tz],'8 × 4 = '+T+' tiles',{mono:true,fs:12.5,b:1,dy:16,a:aB});
      lab([tx,0,tz],'each a K loop of '+I+' slices',{mono:true,fs:12,dy:33,c:P.mute,a:aB,wide:1});
      const r=k===3?R4:k===4?R5:R6,nm=k===3?'data-parallel':k===4?'split-K, 4 ways':'Stream-K';
      lab([2.8,0,1.75],'H100 · 132 SMs · '+nm,{mono:true,fs:12.5,b:1,dy:16,a:aB,wide:1});
      lab([2.8,0,1.75],busy(r)+' of 132 busy'+(R.W<520?'':', done after '+r.time+' iterations'),{mono:true,fs:12.5,b:1,dy:R.W<520?16:33,c:k===3?P.c1:P.ink,a:aB});
      lab([2.8,0,1.75],(100*r.util).toFixed(1)+'% used'+(r.extra?' · partial sums '+(r.extra/2**20).toFixed(1)+' MiB':''),{mono:true,fs:12,dy:50,c:P.mute,a:aB,wide:1})}
  }
  const vA={cam:[.3,.75],bounds:[[-4.3,0,-2.4],[4.6,1.1,2.6]]},vB={cam:[.3,.55],bounds:[[-4.1,0,-1.9],[4.6,2.2,2.0]]};
  const st=S3.stage({id:'stg-waves',list:'sx-waves',fig:'Fig. 1 · one GEMM as work for the SMs',cam:vA.cam,bounds:vA.bounds,aspect:.6,dur:1900,hold:5200,draw,
    margin:w=>w<520?[16,10,16,10]:[26,18,40,18],
    // case A from above, case B lower so the tall K loops read as columns
    view:k=>k<=2?vA:vB});
  (window.LTSTG=window.LTSTG||{})['stg-waves']=st;
})();
