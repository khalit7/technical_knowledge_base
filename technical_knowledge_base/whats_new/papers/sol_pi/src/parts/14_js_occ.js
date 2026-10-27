// ---- Online Context Compact's cost gate, ported line for line from the released code ----
// Source: github.com/NVlabs/SoL-Pi src/sol-pi/extensions/online-context-compact/economics.ts (MIT, copy in src/inputs/economics.ts).
// check_occ.mjs runs the original TypeScript against this port on random inputs and requires identical decisions.
const OCC_ECON={remainingRequestScale:1,remainingRequestStddevK:0,windowReserveTokens:16384,firstCompactionRequestScale:2,subsequentCompactionMargin:1.5,minimumRequestsSinceCompaction:2};
function occEstimate(i){
  const n=i.completedBoundaryRequestCounts.length,mean=i.completedBoundaryRequestCounts.reduce((t,c)=>t+c,0)/Math.max(1,n);
  let lower=mean;
  if(i.standardDeviationK!==0){
    if(n<3)lower*=0.5;
    else{const v=i.completedBoundaryRequestCounts.reduce((t,c)=>t+(c-mean)**2,0);lower=Math.max(0,mean-i.standardDeviationK*Math.sqrt(v/(n-1)))}
  }
  const unb=1+Math.floor(lower*Math.max(0,i.remainingBoundaries)*i.scale);
  const win=(i.contextWindowTokens===null||i.averageContextTokenIncrement===null||i.averageContextTokenIncrement<=0)?null:
    Math.max(0,Math.floor((i.contextWindowTokens-i.contextTokens)/i.averageContextTokenIncrement));
  return {requestsPerBoundaryMean:mean,requestsPerBoundaryLowerBound:lower,unboundedExpectedRemainingRequests:unb,windowRequestUpperBound:win,
    expectedRemainingRequests:win===null?unb:Math.min(unb,win)};
}
function occDecide(i){
  const E=i.economics||OCC_ECON;
  const h=i.completedBoundaryRequestCounts===null?null:occEstimate({completedBoundaryRequestCounts:i.completedBoundaryRequestCounts,remainingBoundaries:i.remainingBoundaries,
    scale:E.remainingRequestScale,standardDeviationK:E.remainingRequestStddevK,contextTokens:i.contextTokens,contextWindowTokens:i.contextWindowTokens,averageContextTokenIncrement:i.averageContextTokenIncrement});
  const saving=i.archiveTokens-i.memoTokens;
  const post=Math.max(0,i.writeTokens-saving);
  const incr=i.cacheWriteReadRatio===null?null:Math.max(0,i.cacheWriteReadRatio-1);
  const newDebt=post*(incr??0);
  const breakeven=saving>0&&incr!==null?newDebt/saving:null;
  const combRepay=i.cacheDebtRepaymentTokens+saving;
  const combBreak=saving>0&&incr!==null&&combRepay>0?(i.carriedDebtTokens+newDebt)/combRepay:null;
  const first=i.priorCompactionCount===0;
  const effH=h===null?null:first?Math.min(h.expectedRemainingRequests*E.firstCompactionRequestScale,h.windowRequestUpperBound??Infinity):h.expectedRemainingRequests;
  const winProt=i.contextWindowTokens!==null&&i.contextTokens>=i.contextWindowTokens-E.windowReserveTokens;
  const baseEcon=h!==null&&h.expectedRemainingRequests>0&&breakeven!==null&&breakeven<=h.expectedRemainingRequests;
  const firstEcon=first&&effH!==null&&effH>0&&breakeven!==null&&breakeven<=effH;
  const margin=!first&&h!==null&&breakeven!==null&&breakeven*E.subsequentCompactionMargin<=h.expectedRemainingRequests;
  const debtOpen=!first&&h!==null&&combBreak!==null&&combBreak<=h.expectedRemainingRequests;
  const econ=first?firstEcon:baseEcon&&margin&&debtOpen;
  const compressible=saving>0;
  const rs=i.requestsSinceLastCompaction;
  const cool=rs!==null&&rs!==undefined&&rs<E.minimumRequestsSinceCompaction;
  const compact=compressible&&(winProt||(econ&&!cool));
  const reason=!compressible?'non_positive_saving':winProt?'window_protection':econ&&cool?'deferred_post_compaction_cooldown':econ?'economic':
    h===null?'horizon_unavailable':breakeven===null?'cache_ratio_unavailable':!first&&baseEcon&&!margin?'deferred_subsequent_margin':!first&&baseEcon&&!debtOpen?'deferred_carried_debt':'deferred_economic';
  return {postCompactionTokens:post,incrementalCacheCostRatio:incr,breakevenRequests:breakeven,combinedBreakevenRequests:combBreak,effectiveHorizonRequests:effH,
    expectedRemainingRequests:h?h.expectedRemainingRequests:null,windowRequestUpperBound:h?h.windowRequestUpperBound:null,
    unboundedExpectedRemainingRequests:h?h.unboundedExpectedRemainingRequests:null,requestsPerBoundaryMean:h?h.requestsPerBoundaryMean:null,compact,reason};
}
if(typeof module!=='undefined')module.exports={occDecide,occEstimate,OCC_ECON};
