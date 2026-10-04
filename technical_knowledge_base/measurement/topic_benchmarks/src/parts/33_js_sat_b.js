// ---- Saturation timeline: core rules (pure functions; checked against saturation/check_saturation.py by saturation/check_core.mjs) ----
window.SAT_CORE=(function(){
  const D=window.SAT_DATA;
  const day=s=>Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))/864e5;
  const KR={ind:0,board:1,bench:2,lab:3};
  const asOf=day(D.as_of);
  // ceiling: the human baseline where published (mode 'human'), else 100
  function ceil(b,mode){return (mode==='human'&&b.human)?b.human.v:100}
  function base(b,chance){return chance&&b.chance?b.chance:0}
  function thr(b,o){const c=ceil(b,o.mode),z=base(b,o.chance);return z+o.f*(c-z)}
  function pts(b,o){const out=[];b.series.forEach(s=>s.pts.forEach(p=>{if(p.ub)return;if(o&&o.indOnly&&p.k==='lab')return;out.push({p,s})}));return out}
  // first point in any series at or above the threshold; earliest date, then independent before lab
  function crossing(b,o){
    const t=thr(b,o)-1e-9;let best=null;
    pts(b,o).forEach(x=>{if(x.p.v<t)return;
      if(!best||x.p.d<best.p.d||(x.p.d===best.p.d&&(KR[x.p.k]-KR[best.p.k]||best.p.v-x.p.v)<0))best=x});
    const L=day(b.launch.d);
    if(best){const dd=Math.max(0,day(best.p.d)-L);return {status:'reached',days:dd,pt:best.p,ser:best.s,atLaunch:day(best.p.d)<=L,thr:thr(b,o)}}
    const end=b.retired?day(b.retired.d):asOf;
    return {status:b.retired?'retired':'open',days:end-L,thr:thr(b,o)};
  }
  // best reading at a day (any listed series); returns share of the ceiling
  function bestAt(b,t,o){let best=null;pts(b,o).forEach(x=>{if(day(x.p.d)<=t&&(!best||x.p.v>best.p.v))best=x});return best}
  function fmtDays(n){if(n===0)return '0 days';if(n<60)return n+(n===1?' day':' days');if(n<730)return (n/30.44).toFixed(n<304?1:0)+' months';return (n/365.25).toFixed(1)+' years'}
  return {D,day,asOf,ceil,base,thr,pts,crossing,bestAt,fmtDays,KR};
})();
