// ---- Scene, Fig. 4 (section 6): where you batch decides whether the worker count matters (TS.grain.G1 from src/runs/ts_grain.py).
// Back: the first 64 positions of shuffle(0) over the running example's 7,781 windows, as pipeline A reads them with no worker processes (the reference);
// middle: mp_prefetch's worker processes; front: batches 0 and 1 of the chosen pipeline and worker count, 32 records each, every record flowing from its
// position in the order to its slot. Colours are window indices; a record that is not where the 0-worker pipeline put it is lifted and outlined.
// Which worker handled which record was not recorded, so the flows pass through the worker plate as a whole. Steps are explained by #sx-grain. ----
(function(){
  if(!document.getElementById('stg-grain')||!window.TSS||!window.TS||!TS.grain)return;const {at,off,lerp,mix}=S3,{lab,legs,tint,rec}=TSS;
  const G=TS.grain,NW=G.n_windows,BASE=G.G1.A0[0].concat(G.G1.A0[1]),POS={};BASE.forEach((id,i)=>POS[id]=i);
  let cfg='A',w='2';
  const key=()=>cfg==='DL'?('DL'+(w==='4'?'2':w)+'_run0'):(cfg+w),ref=()=>cfg==='DL'?G.G1.DL0_run0:G.G1[cfg+'0'];
  const SP=.2,xo=i=>(i%32-15.5)*SP,ZO=i=>i<32?-2.5:-2.1,ZB=b=>b?1.75:1.15,ZW=-.45,CS=.16;
  function draw(R,k,e){const P=R.P,ph=R.W<520,B=G.G1[key()],RF=ref(),nw=cfg==='DL'&&w==='4'?2:+w;R.grid(-4.4,4.4,-3.2,2.6,.5);
    // the order (reference): 64 positions in two rows
    const oA=k===0?1:k===4?.5:.55;
    BASE.forEach((id,i)=>{R.box([xo(i),0,ZO(i)],[CS,.12,CS],{fill:rec(P,id,NW),a:k===0?Math.min(1,.2+e*1.5*(1-i/90)):oA,shadow:false,lw:.5})});
    lab(R,[xo(0)-.2,.06,-2.3],'shuffle(0): positions 0 to 63',{mono:true,fs:12,al:'right',dx:-4,c:P.mute,a:Math.max(.5,oA),grp:'r'});
    lab(R,[xo(31)+.2,.06,-2.5],'+ later',{mono:true,fs:12,al:'left',dx:4,c:P.mute,a:Math.max(.4,oA),wide:1});
    // the worker processes
    const wA=k===1?Math.min(1,e*1.4):k===2||k===3?.6:.3;
    if(nw>0){const ww=6.6/nw;for(let j=0;j<nw;j++){const cx=-3.3+ww*(j+.5);R.glass([cx-ww/2+.08,.02,ZW-.35],[ww-.16,0,0],[0,0,.7],{c:P.c5,a:wA,nu:Math.max(2,Math.round(ww*3)),nv:2,th:.06});
        lab(R,[cx,.08,ZW],'worker '+j,{mono:true,fs:12,c:P.c5,a:Math.max(.4,wA),grp:'w',wide:1})}}
    else R.quad([[-3.3,.01,ZW-.35],[3.3,.01,ZW-.35],[3.3,.01,ZW+.35],[-3.3,.01,ZW+.35]],{a:wA,ec:P.mute,dash:[4,3],lw:1});
    lab(R,[-3.4,.05,ZW],nw>0?'mp_prefetch: '+nw+' worker processes':'no worker processes',{mono:true,fs:12,al:'right',dx:-6,c:nw>0?P.c5:P.mute,a:Math.max(.5,wA),grp:'r'});
    // the batches
    [0,1].forEach(b=>{const fill=k>b+2?1:k===b+2?e:0,on=k===b+2||k===4;
      lab(R,[xo(0)-.2,.06,ZB(b)],'batch '+b,{mono:true,fs:12.5,b:1,al:'right',dx:-4,a:k>=b+2?1:.5,grp:'r'});
      for(let j=0;j<32;j++){const id=B[b][j],moved=RF[b][j]!==id,p=[xo(j),0,ZB(b)],t=Math.min(1,Math.max(0,fill*1.25-j/32*.25));
        R.quad([[p[0]-CS/2,.005,p[2]-CS/2],[p[0]+CS/2,.005,p[2]-CS/2],[p[0]+CS/2,.005,p[2]+CS/2],[p[0]-CS/2,.005,p[2]+CS/2]],{a:.45,ec:P.mute,dash:[3,2],lw:.8});
        if(t<=0)continue;const lift=k===4&&moved?.18*e:0;
        R.box([p[0],lift,p[2]],[CS,.12,CS],{fill:rec(P,id,NW),a:(k>=b+2?1:.4)*t,shadow:false,lw:k===4&&moved?2:.5,ec:k===4&&moved?P.bad:null,ea:k===4&&moved?1:null});
        if(k===b+2){const i=POS[id],src=i==null?[xo(31)+.4,.1,-2.5]:[xo(i),.12,ZO(i)];R.flow(legs([src,[src[0],.25,ZW],[p[0],.25,ZW],[p[0],.14,p[2]]]),{c:rec(P,id,NW),r:.04,n:2,speed:1.4,a:e*.9})}}});
    if(k===4){let n=0;for(let b=0;b<2;b++)for(let j=0;j<32;j++)if(RF[b][j]!==B[b][j])n++;
      lab(R,[0,0,2.25],w==='0'?'0 workers: the reference stream':n?n+' of 64 records not where 0 workers put them':'the same stream as with 0 workers',{fs:13,b:1,dy:16,c:n?P.bad:P.good,a:e})}
  }
  const full={cam:[.08,.78],bounds:[[-4.6,0,-2.8],[4.0,.4,2.4]]};
  const V=[{cam:[.08,.7],bounds:[[-4.6,0,-2.9],[4.0,.4,-1.6]]},{cam:[.08,.74],bounds:[[-4.6,0,-2.8],[4.0,.4,.6]]},
    {cam:[.08,.74],bounds:[[-4.6,0,-1.0],[4.0,.4,2.1]]},{cam:[.08,.74],bounds:[[-4.6,0,-1.0],[4.0,.4,2.3]]},full];
  const st=S3.stage({id:'stg-grain',list:'sx-grain',fig:'Fig. 4 · batch 0 and 1 of a grain pipeline',cam:full.cam,bounds:full.bounds,aspect:.45,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,14,170],view:k=>V[k],onStep:()=>{try{readout()}catch(err){}}});
  function readout(){const B=G.G1[key()],RF=ref();let moved=0;for(let b=0;b<2;b++)for(let j=0;j<32;j++)if(RF[b][j]!==B[b][j])moved++;
    const eq=cfg==='DL'?G.G1_equal.DL['0_2']:(w==='0'?null:G.G1_equal[cfg]['0_'+w]);
    document.getElementById('dg-cap').innerHTML='<b>Pipeline '+cfg+', '+(cfg==='DL'&&w==='4'?'2 workers (4 was not run for the DataLoader API)':w+' worker'+(w==='1'?'':'s'))+':</b> '+
      (w==='0'?'this is the reference stream itself.':(eq?'the same stream as with 0 workers, over all six recorded batches.':'a different stream from 0 workers: '+moved+' of the 64 records shown are not where the 0-worker pipeline put them. Deterministic for this worker count, but not elastic.'));
    document.getElementById('dg-stats').innerHTML=RD.stat('out of place',moved,'of 64, vs 0 workers')+RD.stat('first 6 batches equal to 0 workers',w==='0'?'(reference)':(eq?'yes':'no'),'recorded over 6 batches')}
  RD.seg(document.getElementById('dg-cfg'),m=>{cfg=m;readout();st.list('sx-grain')});
  RD.seg(document.getElementById('dg-w'),m=>{w=m;readout();st.list('sx-grain')});
  readout();
  (window.TSSTG=window.TSSTG||{})['stg-grain']=st;
})();
