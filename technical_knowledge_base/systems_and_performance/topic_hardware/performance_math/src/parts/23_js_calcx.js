// ---- Copied verbatim from the parent Topic: hardware (src/parts/32_js_calc_1core.js, the Performance calculator model); check/check_page.mjs compares it with the root file ----
window.CALCX=(function(){
  const D=window.CALCD,M=D.models,C=D.chips,R=D.recipes,F=D.fmt;
  function lora(m){return m.lora}
  function actBytes(m,s,b,ckpt,tp){
    const h=m.h,a=m.nh,L=m.L;
    if(ckpt==='none')return L*s*b*h*(34+5*a*s/h)/tp;
    if(ckpt==='flash')return L*34*s*b*h/tp;
    return (L*2*s*b*h+34*s*b*h)/tp;
  }
  function train(o){
    const m=M[o.model],ch=C[o.chip],r=R[o.recipe];
    const n=o.gpus,tp=o.tp||1,pp=o.pp||1,z=o.zero||0;
    const dp=Math.max(1,Math.floor(n/(tp*pp))),mp=tp*pp,P=m.P;
    let w,g,opt,trainable;
    if(o.recipe==='lora'||o.recipe==='qlora'){
      const A=lora(m);
      w=(r.w*P+2*A)/mp;g=2*A/mp;opt=12*A/mp;
      if(z>=1)opt/=dp;if(z>=2)g/=dp;if(z>=3)w/=dp;
      trainable=A;
    }else{
      w=r.w*P/mp/(z>=3?dp:1);g=r.g*P/mp/(z>=2?dp:1);opt=r.o*P/mp/(z>=1?dp:1);trainable=P;
    }
    const act=actBytes(m,o.seq,o.mb,o.ckpt,tp),total=w+g+opt+act;
    let flTok=6*m.Pact+(o.attn?12*m.L*m.nh*m.dqk*o.seq:0);
    if(o.recipe==='lora'||o.recipe==='qlora')flTok=4*m.Pact;
    const hwTok=flTok+(o.ckpt==='full'?2*m.Pact:0);
    const Cf=flTok*o.tokens,peak=ch.peak.bf16*1e12,secs=Cf/(n*peak*o.mfu),gpuh=n*secs/3600;
    return {w:w/1e9,g:g/1e9,opt:opt/1e9,act:act/1e9,total:total/1e9,mem:ch.mem,fits:total/1e9<=ch.mem,trainable:trainable,flops:Cf,fl_tok:flTok,
      hfu_ratio:hwTok/flTok,days:secs/86400,gpuh:gpuh,cost:ch.price?gpuh*ch.price:null,dp:dp};
  }
  function weightBytes(m,fmt){
    if(fmt==='native')fmt=m.fmt;
    if(fmt==='mxfp4x')return m.Pexp*F.mxfp4+(m.P-m.Pexp)*2;
    return m.P*F[fmt];
  }
  const kvPerToken=(m,kvb)=>m.kv_el*(m.kv_full+m.kv_slide)*kvb;
  function kvSeq(m,ctx,kvb){const full=m.kv_el*m.kv_full*ctx,slide=m.kv_slide?m.kv_el*m.kv_slide*Math.min(ctx,m.window):0;return (full+slide)*kvb}
  const touched=(m,B)=>m.E?m.E*(1-Math.pow(1-m.k/m.E,B)):0;
  function decode(o){
    const m=M[o.model],ch=C[o.chip],n=o.chips,B=o.batch,ctx=o.ctx,kvb=o.kvb;
    const wb=weightBytes(m,o.fmt),bpp=wb/m.P;
    const wread=m.E?(m.P-m.Pexp)*bpp+m.moeL*touched(m,B)*m.exp1*bpp:wb;
    const kvr=B*kvSeq(m,ctx,kvb),byts=wread+kvr;
    const attCtx=m.kv_full*ctx+(m.kv_slide?m.kv_slide*Math.min(ctx,m.window):0);
    const fl=B*(2*m.Pact+2*m.nh*(m.dqk+m.dv)*attCtx);
    const pk=ch.peak[o.prec]*1e12*n*o.eff,bw=ch.bw*1e9*n*o.eff;
    const tm=byts/bw,tc=fl/pk,t=Math.max(tm,tc),need=wb+B*kvSeq(m,ctx,kvb);
    return {wbytes:wb/1e9,kv_tok:kvPerToken(m,kvb),kv_seq:kvSeq(m,ctx,kvb)/1e9,mem_need:need/1e9,mem_have:ch.mem*n,fits:need/1e9<=ch.mem*n,
      wread:wread/1e9,kvread:kvr/1e9,t_ms:t*1e3,t_mem_ms:tm*1e3,t_cmp_ms:tc*1e3,bound:tm>=tc?'memory':'compute',tps_seq:1/t,tps:B/t,busy:tc/t,flops:fl,bytes:byts};
  }
  function crossover(o){for(let B=1;B<=4096;B++){if(decode(Object.assign({},o,{batch:B})).bound==='compute')return B}return null}
  function prefill(o){
    const m=M[o.model],ch=C[o.chip],Pt=o.prompt;
    const attCtx=m.kv_full*Pt+(m.kv_slide?m.kv_slide*Math.min(Pt,m.window):0);
    const fl=2*m.Pact*Pt+m.nh*(m.dqk+m.dv)*attCtx*Pt;
    return {flops:fl,t_ms:fl/(ch.peak[o.prec]*1e12*o.chips*o.eff)*1e3};
  }
  function allreduce(S,n,bw,lat){if(n<=1)return 0;return 2*(n-1)/n*S/(bw*1e9)+2*(n-1)*(lat||0)*1e-6}
  function tpRatio(o){
    const m=M[o.model],ch=C[o.chip],tp=o.tp,T=o.tokens;
    const comm=4*2*(tp-1)/tp*T*m.h*2/(o.link*1e9),comp=6*m.layer_params*T/(tp*ch.peak.bf16*1e12*o.mfu);
    return {comm_ms:comm*1e3,comp_ms:comp*1e3,ratio:comm/comp};
  }
  function stepAnim(mode,overlap){
    const m=M.l8,ch=C.h100,P=m.P,seq=8192,gb=64,mfu=0.40;
    const n={'1':1,'8':8,'64f':64,'64h':64}[mode],micro=gb/n;
    const tc=6*P*seq/(ch.peak.bf16*1e12*mfu),act=actBytes(m,seq,1,'flash',1);
    let states,ag,rs,cross,vol;
    if(n===1){states=16*P;ag=rs=cross=0;vol=0}
    else if(mode==='8'||mode==='64f'){states=16*P/n;const link=n<=8?ch.up:ch.out;ag=(n-1)/n*2*P/(link*1e9);rs=ag;cross=0;vol=3*(n-1)/n*2*P}
    else{states=16*P/8;ag=7/8*2*P/(ch.up*1e9);rs=ag;cross=allreduce(2*P/8,8,ch.out)/micro;vol=3*7/8*2*P+2*7/8*2*P/8/micro}
    const comm=2*ag+rs+cross,perMicro=tc+(!overlap?comm:Math.max(0,comm-tc));
    const opt=28*(P/(mode==='64h'?8:n))/(ch.bw*1e9),step=micro*perMicro+opt,tokens=gb*seq;
    return {n:n,micro:micro,t_cmp:tc,ag:ag,rs:rs,cross:cross,comm:comm,opt:opt,step:step,states:states/1e9,act:act/1e9,mem:(states+act)/1e9,
      fits:(states+act)/1e9<=ch.mem,tok_s:tokens/step,tok_s_gpu:tokens/step/n,mfu:6*P*tokens/(step*n*ch.peak.bf16*1e12),vol_gb:vol*micro/1e9,net_busy:comm/tc};
  }
  // formatting helpers
  const sig=(x,n)=>{if(x==null||!isFinite(x))return '?';if(x===0)return '0';const d=Math.max(0,(n||3)-1-Math.floor(Math.log10(Math.abs(x))));return (+x.toFixed(Math.min(d,6))).toLocaleString('en-US',{maximumFractionDigits:Math.min(d,6)})};
  const fGB=g=>g>=1000?sig(g/1000)+' TB':g>=1?sig(g)+' GB':g>=1e-3?sig(g*1e3)+' MB':sig(g*1e6)+' KB';
  const fT=s=>s>=86400*2?sig(s/86400)+' days':s>=3600?sig(s/3600)+' h':s>=60?sig(s/60)+' min':s>=1?sig(s)+' s':s>=1e-3?sig(s*1e3)+' ms':sig(s*1e6)+' µs';
  const fE=x=>{if(!isFinite(x))return '?';const e=Math.floor(Math.log10(x)),mm=x/Math.pow(10,e);return sig(mm,3)+'e'+e};
  const fUSD=x=>x==null?'n/a':x>=1e6?'$'+sig(x/1e6)+'M':x>=1e3?'$'+sig(x/1e3)+'K':'$'+sig(x);
  const pct=x=>(x*100>=10?Math.round(x*100):sig(x*100,2))+'%';
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-calc']=window.TAB_RENDER['t-calc']||[]).push(f)};
  return {D,M,C,R,F,actBytes,train,weightBytes,kvPerToken,kvSeq,touched,decode,crossover,prefill,allreduce,tpRatio,stepAnim,sig,fGB,fT,fE,fUSD,pct,esc,stat,RM,onRender};
})();
