// ---- Scene, Fig. 3 (section 8): one Llama 2 7B decoder layer on v5e as a predicted profile (renderer v2) ----
// Calculated, not measured: the matmuls of the Roofline lab's 7B layer (31_js_tq_roof.js layerOps, the same formulas: U.mm, U.bound, U.L7 from
// MaxText's llama2-7b config) in execution order. Width on the timeline = the roofline's best time, max(FLOPs / peak, bytes / bandwidth).
// Back lane: FLOP rate as a share of the bf16 peak; front lane: HBM traffic as a share of the bandwidth over that time. Three configurations:
// 4,096 tokens per chip with the scores written to HBM, the same with fused attention, and 32 tokens per chip (fused). Explained by #sx-prof.
(function(){
  if(!document.getElementById('stg-prof')||!window.TQU)return;const {mix,lerp}=S3,U=window.TQU,g=U.G.v5e,M=U.L7;
  function ops(n,S,fused){const Se=Math.min(S,n),nb=Math.max(1,Math.floor(n/Se)),H=M.Hq,dh=M.dh;
    const o=[['q',U.mm(1,n,M.D,M.Hq*dh)],['k',U.mm(1,n,M.D,M.Hkv*dh)],['v',U.mm(1,n,M.D,M.Hkv*dh)]];
    if(fused)o.push(['attn',{fl:4*nb*H*Se*Se*dh,by:nb*H*4*Se*dh*2}]);else o.push(['QKᵀ',U.mm(nb*H,Se,dh,Se)],['×V',U.mm(nb*H,Se,Se,dh)]);
    o.push(['o',U.mm(1,n,M.Hq*dh,M.D)],['gate',U.mm(1,n,M.D,M.F)],['up',U.mm(1,n,M.D,M.F)],['down',U.mm(1,n,M.F,M.D)]);
    let t=0;return o.map(([name,m])=>{const b=U.bound(m.fl,m.by,g.bf16,g.bw),r={name,t0:t,t:b.t,mxu:m.fl/b.t/g.bf16,hbm:m.by/b.t/g.bw,compute:b.compute};t+=b.t;return r})}
  const CF=[ops(4096,4096,false),ops(4096,4096,true),ops(32,4096,true)],TOT=CF.map(c=>c.reduce((s,r)=>s+r.t,0));
  window.TQ_SC=window.TQ_SC||{};window.TQ_SC.prof={total_ms:TOT.map(v=>v*1e3),ops:CF.map(c=>c.map(r=>[r.name,r.t*1e3,r.mxu,r.hbm]))};
  const HB=1;const cfgAt=k=>k<=2?0:k===3?1:2,X0=-5,WX=10,ZF=-.75,ZB=.85,HM=1.7,DP=.95;
  // timeline layout: one world unit per (total of configuration 0) / 10, except the last configuration, which is redrawn to fill the axis
  const scale=c=>WX/(c===2?TOT[2]:TOT[0]);
  function lay(c){const s=scale(c);return CF[c].map(r=>({name:r.name,x:X0+r.t0*s,w:r.t*s,mxu:r.mxu,hbm:r.hbm,compute:r.compute}))}
  const ms=v=>U.fmt(v*1e3,v>=1e-2?1:2)+' ms';
  function draw(R,k,e){const P=R.P,c=cfgAt(k),pc=k===3?0:k===4?1:c,A=lay(pc),B=lay(c),t=c!==pc?e:1;R.grid(-6,6,-2.6,2.8,.5);
    const cC=P.acc,cM=P.c2,cH=P.c5;
    // blocks present in both layouts glide; the others fade out (old) or in (new)
    const both=B.map(b=>{const a=A.find(x=>x.name===b.name);return {b,a}});
    const gone=A.filter(a=>!B.find(b=>b.name===a.name));
    const front=k===0?.18:1,back=k>=2?(k===2?e:1):0;
    function blk(x,w,r,al,isNew){const hF=k===0?.22:k===1?lerp(.22,r.mxu*HM,e):r.mxu*HM,hB=r.hbm*HB*back,gap=.03;
      R.box([x+w/2,0,ZF],[Math.max(.02,w-gap),Math.max(.02,hF),DP],{fill:mix(P.paper,r.compute?cC:cM,.62),a:al,lw:.6});
      if(back>0)R.box([x+w/2,0,ZB],[Math.max(.02,w-gap),Math.max(.02,hB),DP],{fill:mix(P.paper,cH,.6),a:al*Math.max(.2,back),lw:.6});
      // data from HBM to the MXUs: dots stream from the back lane to the front, denser where HBM is the limit
      if(k>=2&&al>.5&&w>.05)R.flowArc([x+w/2,Math.max(.05,hB)*.9,ZB-DP/2],[x+w/2,Math.max(.05,hF)*.9,ZF+DP/2],.25+r.hbm*.35,{c:cH,a:al*back,r:.05+.05*r.hbm,n:Math.max(2,Math.round(2+r.hbm*7)),speed:.6+r.hbm*1.2});
      const lb=r.name,big=w>.5;R.label([x+w/2,0,ZB+DP/2],lb,{dy:13+(both.findIndex(o=>o.b.name===r.name)%2)*14,mono:true,fs:12,c:P.ink,a:al,wide:big?0:1})}
    both.forEach(({a,b})=>{const x=a?lerp(a.x,b.x,t):b.x,w=a?lerp(a.w,b.w,t):b.w,r=b;blk(x,w,r,a?1:t,!a)});
    if(t<1)gone.forEach(a=>blk(a.x,a.w,a,1-t));
    // the time axis and the total
    const ZA=ZB+DP/2+.55,tot=TOT[c],end=X0+tot*scale(c),endA=X0+TOT[pc]*scale(pc),xe=lerp(endA,end,t);
    R.line([[X0,0,ZA],[xe,0,ZA]],{c:P.mute,w:1.2,head:6});
    R.label([X0,0,ZA],'0',{dy:12,c:P.mute,fs:12});R.label([xe,0,ZA],ms(t<1?lerp(TOT[pc],tot,t):tot)+(k===4?', axis redrawn':''),{dy:14,b:1,c:P.ink,fs:13});
    // lane names and the 100% line
    R.label([X0,front*.0+.1,ZF],'MXUs: share of peak',{al:'right',dx:-8,b:1,c:cC,fs:12.5,grp:'lane'});
    if(back>0)R.label([X0,.1,ZB],'HBM: share of bandwidth',{al:'right',dx:-8,b:1,c:cH,fs:12.5,a:back,grp:'lane'});
    if(k>=1){const a=k===1?e:1;R.line([[X0,HM,ZF],[X0+WX,HM,ZF]],{c:cC,w:1,dash:[4,4],a:a*.7});R.label([X0+WX,HM,ZF],'100%',{al:'left',dx:6,c:cC,fs:12,a})}
    if(k===1||k===2){const at=B.find(r=>r.name==='QKᵀ');if(at){const a=k===1?e:1;R.label([at.x+at.w/2,k===1?at.mxu*HM:at.hbm*HB,k===1?ZF:ZB],k===1?'50%: intensity 120 < 240.5':'100%: the scores go through HBM',{dy:k===1?-14:-12,al:'center',b:1,c:k===1?cM:cH,fs:12.5,a,wide:1})}}
    if(k===3){const at=B.find(r=>r.name==='attn');R.label([at.x+at.w/2,at.mxu*HM,ZF],'fused: compute-bound',{dy:-14,b:1,c:cC,fs:12.5,a:e})}
    window.TQ_SC.prof.step=k;
  }
  const full={cam:[.24,.82],bounds:[[-5.2,0,-2.1],[5.2,1.8,2]]};
  const st=S3.stage({id:'stg-prof',list:'sx-prof',fig:'Fig. 3 · a predicted profile, one 7B layer on v5e',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[18,10,26,10]:[24,46,30,170],
    view:k=>TQPH(k===4?{cam:[.24,1.05],bounds:full.bounds}:full)});
  (window.TQSTG=window.TQSTG||{})['stg-prof']=st;
})();
