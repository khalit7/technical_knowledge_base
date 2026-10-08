// ---- Capacity planner model (t-plan): line-for-line mirror of src/plan/plan.py; src/plan/check_plan.mjs compares it with out/plan_ref.json ----
// The parent's functions it needs (kv per token, kv per sequence, experts touched, attended context) are copied from
// the hardware root's calculator (topic_hardware/src/calc/model.py) unchanged in meaning.
window.PLN=(function(){
  const D=window.PLND,M=D.models,C=D.chips,BLOCK=D.block;
  const kvPerToken=(m,kvb)=>m.kv_el*(m.kv_full+m.kv_slide)*kvb;
  function kvSeq(m,ctx,kvb){const full=m.kv_el*m.kv_full*ctx,slide=m.kv_slide?m.kv_el*m.kv_slide*Math.min(ctx,m.window):0;return (full+slide)*kvb}
  const touched=(m,B)=>m.E?m.E*(1-Math.pow(1-m.k/m.E,B)):0;
  const attCtx=(m,x)=>m.kv_full*x+(m.kv_slide?m.kv_slide*Math.min(x,m.window):0);
  function weightSplit(m,fmt){
    if(fmt==='native')fmt=m.fmt;
    const P=m.P,Pe=m.Pexp,emb=m.emb;
    if(fmt==='mxfp4x')return [(P-Pe)*2,Pe*D.fmt.mxfp4];
    if(fmt==='bf16')return [(P-Pe)*2,Pe*2];
    if(fmt==='q4km')return [(P-Pe)*D.q4km_bits/8,Pe*D.q4km_bits/8];
    const b=fmt==='fp8'?1:D.int4_bits/8;
    return [(P-Pe-emb)*b+emb*2,Pe*b];
  }
  function computePrec(m,ch,fmt){const f=fmt==='native'?m.fmt:fmt;return (f==='fp8'&&ch.peak.fp8)?'fp8':'bf16'}
  const kvSeqGpu=(m,tokens,kvb,kvf)=>kvSeq(m,tokens,kvb)*kvf;
  function setup(o){
    const m=M[o.model],ch=C[o.chip];
    const tp=o.tp,pp=o.pp,ep=!!(o.ep&&m.E>0),G=tp*pp;
    const ws=weightSplit(m,o.fmt),wn=ws[0],we=ws[1];
    let wGpu,kvf,tpa;
    if(ep){wGpu=wn+we/G;kvf=1;tpa=1}
    else{wGpu=(wn+we)/G;kvf=(m.mla?1:Math.max(1/tp,1/m.nkv))/pp;tpa=tp}
    const kvTok=kvPerToken(m,o.kvb),tb=o.tb;
    const act=tb*2*(2*m.h+2*m.ffa/tpa)+Math.min(o.seqs,tb)*m.V*4/tpa;
    const usable=ch.mem*1e9*o.util,pool=usable-wGpu-act-o.ovh*1e9;
    const Pu=Math.max(1,o.P*(1-o.share)),shared=o.P-Pu;
    const held=Math.ceil((Pu+o.O/2)/BLOCK)*BLOCK;
    const sharedB=shared>0?Math.ceil(shared/BLOCK)*BLOCK:0;
    const perSeq=kvSeqGpu(m,held,o.kvb,kvf),fixed=sharedB?kvSeqGpu(m,sharedB,o.kvb,kvf):0;
    const nkvGpu=pool>fixed?Math.max(0,(pool-fixed)/perSeq):0;
    const seqsCap=Math.floor(nkvGpu)*(ep?G:1);
    const bmax=Math.min(seqsCap,o.seqs*(ep?G:1));
    return {G:G,ep:ep?1:0,w_gpu:wGpu,wn:wn,we:we,act:act,ovh:o.ovh*1e9,usable:usable,pool:pool,kvf:kvf,kv_tok:kvTok,kv_tok_gpu:kvTok*kvf,
      held:held,per_seq:perSeq,fixed:fixed,seqs_kv:seqsCap,bmax:bmax,fits:pool>fixed+perSeq,Pu:Pu,prec:computePrec(m,ch,o.fmt)};
  }
  function step(o,s,B,c){
    const m=M[o.model],ch=C[o.chip];
    const tp=o.tp,pp=o.pp,G=s.G,ep=s.ep;
    const T=B+c,ctxDec=o.P+o.O/2,ctxPre=(o.P-s.Pu)+s.Pu/2;
    let wr;
    if(m.E){const frac=touched(m,Math.max(!ep?T/pp:T,1e-9))/m.E;wr=(s.wn/(ep?1:G))+s.we/G*frac}
    else wr=s.w_gpu;
    const kvr=(ep?B/G:B/pp)*kvSeqGpu(m,ctxDec,o.kvb,s.kvf);
    const fl=T*2*m.Pact+B*2*m.nh*(m.dqk+m.dv)*attCtx(m,ctxDec)+c*2*m.nh*(m.dqk+m.dv)*attCtx(m,ctxPre);
    const flGpu=ep?fl/G:fl/(tp*pp*pp);
    const pk=ch.peak[s.prec]*1e12*o.eff_c,bw=ch.bw*1e9*o.eff_m;
    const tMem=(wr+kvr)/bw,tCmp=flGpu/pk;
    const link=(ch.up&&G<=ch.upN)?ch.up:(ch.out||ch.up||1);
    const lat=ch.lat*1e-6*o.latx;
    let tComm;
    if(ep&&G>1){const tg=T/G,a2a=tg*m.k*m.h*3*(G-1)/G/(link*1e9)+2*lat;tComm=m.moeL*a2a}
    else if(tp>1){const S=T/pp*m.h*2,ar=2*(tp-1)/tp*S/(link*1e9)+lat;tComm=(m.L/pp)*2*ar}
    else tComm=0;
    const work=Math.max(tMem,tCmp),tMb=o.overlap?Math.max(work,tComm):work+tComm;
    const t=pp*tMb+o.tovh*1e-3+o.tseq*1e-3*(ep?B/G:B);
    return {t:t,t_mem:tMem*pp,t_cmp:tCmp*pp,t_comm:tComm*pp,wr:wr,kvr:kvr,fl:fl,bound:tMem>=tCmp?'memory':'compute'};
  }
  const GRID=(function(){const g=[];for(let i=0;i<200;i++)g.push(1e-4*Math.pow(60/1e-4,i/199));return g})();
  function fluid(o,s,lam){
    const O=o.O,Pu=s.Pu,tb=o.tb;
    if(lam<=0){const t0=step(o,s,1,0).t;return {t:t0,B:0,c:0}}
    const f=T=>step(o,s,lam*O*T,lam*Pu*T).t<=T;
    let hi=-1;for(let i=0;i<GRID.length;i++){if(f(GRID[i])){hi=i;break}}
    if(hi<0)return null;
    let a=hi>0?GRID[hi-1]:0,b=GRID[hi];
    for(let i=0;i<60;i++){const mid=(a+b)/2;if(f(mid))b=mid;else a=mid}
    const B=lam*O*b,c=lam*Pu*b;
    if(B>s.bmax||B+c>tb)return null;
    return {t:b,B:B,c:c};
  }
  function maxFluid(o,s){
    const ok=lam=>fluid(o,s,lam)!==null;
    let hi=1e-3;if(!ok(hi))return 0;
    while(ok(hi*2)&&hi<1e7)hi*=2;
    let lo=hi;hi=hi*2;
    for(let i=0;i<50;i++){const mid=(lo+hi)/2;if(ok(mid))lo=mid;else hi=mid}
    return lo;
  }
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let z=a;z=Math.imul(z^(z>>>15),z|1)>>>0;z=(z^((z+(Math.imul(z^(z>>>7),z|61)>>>0))>>>0))>>>0;return ((z^(z>>>14))>>>0)/4294967296}}
  function simulate(o,s,lam,n,seed,warm){
    n=n||3000;seed=seed||7;warm=warm==null?0.15:warm;
    const u=rng(seed),arr=[];let t=0;
    for(let i=0;i<n;i++){t+=-Math.log(1-u())/lam;arr.push(t)}
    const Pu=Math.max(1,Math.floor(s.Pu+0.5)),O=o.O,tb=o.tb,bmax=Math.floor(s.bmax);
    let now=0,i=0,ndone=0,steps=0;
    let wid=[],wleft=[],run=[],runid=[];
    const first=new Float64Array(n),done=new Float64Array(n);
    let tB=0,tT=0,backlog=0;
    const tw=arr[Math.min(n-1,Math.floor(n*warm))];
    while(ndone<n){
      while(i<n&&arr[i]<=now){wid.push(i);wleft.push(Pu);i++}
      if(i===n&&backlog===0)backlog=wid.length+1;
      if(!wid.length&&!run.length){now=arr[i];continue}
      if(!wid.length){
        // decode-only stretch: every step has the same B and c = 0, so the same duration; advance step by step
        // without recomputing it until a sequence finishes or a prompt arrives (identical arithmetic to one step at a time)
        const B=run.length,dt=step(o,s,B,0).t;let rmin=run[0];for(let q=1;q<B;q++)if(run[q]<rmin)rmin=run[q];
        let j=0;
        do{now+=dt;steps++;if(tw<=now){tB+=B*dt;tT+=dt}j++}while(j<rmin&&!(i<n&&arr[i]<=now)&&steps<=400000);
        const nr=[],ni=[];
        for(let q=0;q<B;q++){const x=run[q]-j;if(x===0){done[runid[q]]=now;ndone++}else{nr.push(x);ni.push(runid[q])}}
        run=nr;runid=ni;
        if(steps>400000)return null;
        continue;
      }
      const B=run.length;let budget=tb-B,c=0,adm=B,j=0;const fin=[];
      while(j<wid.length&&budget>0){
        if(wleft[j]===Pu){if(adm>=bmax)break;adm++}
        const take=Math.min(wleft[j],budget);wleft[j]-=take;budget-=take;c+=take;
        if(wleft[j]===0)fin.push(wid[j]);
        j++;
      }
      const dt=step(o,s,B,c).t;now+=dt;steps++;
      if(tw<=now){tB+=B*dt;tT+=dt}
      const nr=[],ni=[];
      for(let q=0;q<run.length;q++){const x=run[q]-1;if(x===0){done[runid[q]]=now;ndone++}else{nr.push(x);ni.push(runid[q])}}
      run=nr;runid=ni;
      let k=0;while(k<wid.length&&wleft[k]===0)k++;
      if(k){wid=wid.slice(k);wleft=wleft.slice(k)}
      for(const rid of fin){first[rid]=now;if(O>1){run.push(O-1);runid.push(rid)}else{done[rid]=now;ndone++}}
      if(steps>400000)return null;
    }
    const tt=[],tp=[];
    for(let r=Math.floor(n*warm);r<n;r++){tt.push(first[r]-arr[r]);tp.push((done[r]-first[r])/(O-1))}
    tt.sort((x,y)=>x-y);
    const q=(xs,p)=>xs[Math.min(xs.length-1,Math.floor(p*xs.length))];
    let st=0,sp=0;for(const v of tt)st+=v;for(const v of tp)sp+=v;
    return {ttft_p50:q(tt,0.5),ttft_p99:q(tt,0.99),ttft_mean:st/tt.length,tpot:sp/tp.length,B:tT>0?tB/tT:0,steps:steps,stable:backlog-1<=0.05*n};
  }
  function atRate(o,s,lam){
    const fl=fluid(o,s,lam);if(!fl)return null;
    const sm=simulate(o,s,lam);if(!sm||!sm.stable)return null;
    return {fl:fl,B:sm.B,c:fl.c,tpot:sm.tpot,ttft:{p50:sm.ttft_p50,p99:sm.ttft_p99,mean:sm.ttft_mean},out_tps:lam*o.O,in_tps:lam*o.P};
  }
  function maxRate(o,s,lamOff){
    const ok=lam=>{const r=atRate(o,s,lam);return !!r&&r.ttft.p99<=o.slo_ttft&&r.tpot<=o.slo_tpot};
    let lo=0,hi=lamOff*0.999;
    if(hi<=0)return 0;
    if(ok(hi))return hi;
    for(let i=0;i<18;i++){const mid=(lo+hi)/2;if(ok(mid))lo=mid;else hi=mid}
    return lo;
  }
  function plan(o){
    const m=M[o.model];
    const s=setup(o),res={setup:s,fits:s.fits&&s.bmax>=1};
    if(!res.fits)return res;
    const one=step(o,s,1,0);
    res.single={t:one.t,tps:1/one.t,bound:one.bound};
    const lamOff=maxFluid(o,s);
    res.lam_off=lamOff;
    res.off=lamOff>0?fluid(o,s,lamOff*0.999):null;
    const lamSlo=maxRate(o,s,lamOff);
    res.lam_slo=lamSlo;
    if(lamSlo<=0)return res;
    const reps=Math.max(1,Math.ceil(o.lam/lamSlo-1e-9)),gpus=reps*s.G,op=atRate(o,s,o.lam/reps);
    Object.assign(res,{reps:reps,gpus:gpus,op:op});
    const price=o.price;
    if(price&&price>0&&op){
      const costH=gpus*price,lamAvg=o.lam*o.avg,inH=lamAvg*o.P*3600,outH=lamAvg*o.O*3600,fl=op.fl;
      const a=step(o,s,0,fl.c).t-o.tovh*1e-3,b=step(o,s,fl.B,0).t-o.tovh*1e-3;
      const sharePre=a+b>0?a/(a+b):0.5;
      res.cost={cost_h:costH,in_h:inH,out_h:outH,share_pre:sharePre,usd_in:inH?costH*sharePre/inH*1e6:null,
        usd_out:outH?costH*(1-sharePre)/outH*1e6:null,usd_blend:inH+outH?costH/(inH+outH)*1e6:null};
      const api=D.api[m.api];
      if(api&&api.min){
        const pin=o.api==='min'?api.min[0]:api.median[0],pout=o.api==='min'?api.min[1]:api.median[1];
        const apiH=lamAvg*3600*(o.P*pin+o.O*pout)/1e6,perReq=(o.P*pin+o.O*pout)/1e6;
        res.api={pin:pin,pout:pout,api_h:apiH,breakeven:costH/3600/perReq};
      }
    }
    return res;
  }
  return {D,M,C,kvPerToken,kvSeq,touched,attCtx,weightSplit,computePrec,setup,step,fluid,maxFluid,rng,simulate,atRate,maxRate,plan};
})();
