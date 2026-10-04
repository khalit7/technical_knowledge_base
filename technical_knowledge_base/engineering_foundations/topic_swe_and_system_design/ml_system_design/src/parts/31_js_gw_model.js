// ---- Gateway lab model (tab t-gw). Same formulas as src/models.py gateway() ----
window.MSD_GW=(function(){
  const GPU_TPS=2209,GPU_PRICE_H=3.99,SELF_DERATE=0.5;
  // USD per million tokens, read 2026-10-01 from the knowledge base's shared Artificial Analysis snapshot (provider price pages linked on the tab).
  // ttft (s) and tps (tokens/s per user) are illustrative.
  const TIERS={
    sonnet:{name:'Claude Sonnet 5.5 (API)',pin:2,pout:10,pcache:0.2,ttft:0.8,tps:60},
    gpt61sol:{name:'GPT-6.1 Sol (API)',pin:2,pout:10,pcache:0.1,ttft:0.8,tps:60},
    haiku:{name:'Claude 4.5 Haiku (API)',pin:1,pout:5,pcache:0.1,ttft:0.4,tps:120},
    luna:{name:'GPT-6 Luna (API)',pin:0.1,pout:0.5,pcache:0.01,ttft:0.4,tps:120},
    llama:{name:'Llama 3.3 70B, self-hosted (2 x H100)',self:true,ttft:0.2,tps:69}
  };
  const selfTok=()=>GPU_PRICE_H/3600/(GPU_TPS*SELF_DERATE);
  function tierCost(t,tin,tout,cs){if(t.self)return tout*selfTok();const cin=tin*cs;return ((tin-cin)*t.pin+cin*t.pcache+tout*t.pout)/1e6}
  function tierTime(t,tin,cs,tout){const ttft=t.ttft*(1-0.6*cs);return [ttft,ttft+tout/t.tps]}
  const D={rps:231.5,easy:0.6,tin:1000,tout:400,router:true,router_acc:0.9,router_ms:20,small:'haiku',big:'sonnet',fb:'gpt61sol',
    exact:0.05,sem:true,sem_hit:0.15,sem_false:0.03,prefix:0.7,outage:0,fallback:true,detect_s:2,gw_ms:10};
  const r=(x,n)=>{const m=Math.pow(10,n);return Math.round(x*m)/m};
  function run(p){
    const big=TIERS[p.big],small=TIERS[p.small],fb=TIERS[p.fb],gw=p.gw_ms/1000;
    const exact=p.exact;let rest=1-exact;const sem=p.sem?rest*p.sem_hit:0;rest-=sem;
    let se,be,sh,bh,rt;
    if(p.router){const acc=p.router_acc;se=rest*p.easy*acc;be=rest*p.easy*(1-acc);sh=rest*(1-p.easy)*(1-acc);bh=rest*(1-p.easy)*acc;rt=p.router_ms/1000}
    else{se=0;sh=0;be=rest*p.easy;bh=rest*(1-p.easy);rt=0}
    const toS=se+sh,toB=be+bh,fail=toB*p.outage,okB=toB-fail,toF=p.fallback?fail:0,err=p.fallback?0:fail;
    const pc=p.prefix,tin=p.tin,tout=p.tout;
    const cS=tierCost(small,tin,tout,pc),cB=tierCost(big,tin,tout,pc),cF=tierCost(fb,tin,tout,0);
    const cost=toS*cS+okB*cB+toF*cF;
    const hit=gw,semT=gw+0.02;
    const [sT,sF]=tierTime(small,tin,pc,tout),[bT,bF]=tierTime(big,tin,pc,tout),[fT,fF]=tierTime(fb,tin,0,tout);
    const pre=gw+(p.sem?0.02:0)+rt;
    const ttft=exact*hit+sem*semT+toS*(pre+sT)+okB*(pre+bT)+toF*(pre+p.detect_s+fT)+err*(pre+p.detect_s);
    const full=exact*hit+sem*semT+toS*(pre+sF)+okB*(pre+bF)+toF*(pre+p.detect_s+fF)+err*(pre+p.detect_s);
    const wrong=sem*p.sem_false+sh;
    return {share:{exact:r(exact,8),sem:r(sem,8),small:r(toS,8),big:r(okB,8),fb:r(toF,8),err:r(err,8)},
      per_k:r(cost*1000,6),monthly:r(cost*p.rps/2*3600*730,2),ttft:r(ttft,6),full:r(full,6),err:r(err,8),wrong:r(wrong,8),
      parts:{small_easy:se,small_hard:sh,big_easy:be,big_hard:bh,cS,cB,cF}}}
  const PRESETS={
    naive:{router:false,exact:0,sem:false,prefix:0,outage:0,fallback:false},
    tuned:{router:true,exact:0.05,sem:false,prefix:0.7,outage:0,fallback:true},
    semantic:{router:true,exact:0.05,sem:true,sem_hit:0.3,sem_false:0.05,prefix:0.7,outage:0,fallback:true},
    outage_nofb:{router:true,exact:0.05,sem:false,prefix:0.7,outage:1,fallback:false},
    outage_fb:{router:true,exact:0.05,sem:false,prefix:0.7,outage:1,fallback:true},
    selfhost:{router:true,small:'llama',exact:0.05,sem:false,prefix:0.7,outage:0,fallback:true}
  };
  return {TIERS,D,run,PRESETS,selfTok,tierCost};
})();
