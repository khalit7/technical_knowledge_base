// ---- Session simulator: one illustrative agent session replayed under Pi and under each SoL-Pi mechanism ----
// What is from the paper or the released code: the rules and constants of the four mechanisms (thresholds, full sends,
// excerpt size, receipt verification and fallback, the compaction gate in 14_js_occ.js, Pi's keep-recent tail and
// window reserve), and the price list (Opus 5 list prices, recovered exactly from Table 4 by recompute.py).
// What is illustrative: the session itself (actions, their sizes, how often an edit is followed by a test run), the
// reducer's receipt size, success rate and price, the recall rate, and the 200K context window.
const SIM_P={input:5,cache_read:0.5,cache_write:6.25,output:25};   // $ per million tokens (Opus 5)
const SIM_SIDE={input:1,output:5};                                  // illustrative reducer-model price, $ per million
const SIM_K={SYS:9000,KEEP:20000,MEMO:1000,SUMMARY:1000,WINDOW:200000,RESERVE:16384,
  OP_TH:2560,      // 10 KiB at the code's 4 characters per token
  OP_FULL:2,       // provider requests that still carry the full payload
  OP_STUB:350,     // header plus 1,024-byte head/tail excerpt, in tokens
  EPR_MIN:1024,    // 4 KiB build or test log
  RECEIPT:450, EPR_OK:0.9, RECALL_P:0.12, RECALL_TOK:3000, FUSE_OUT:40, CONT:60, RATIO:12.5};
const SIM_MODES=[['pi','Pi'],['af','+ Action Fusion'],['occ','+ Online Context Compact'],['epr','+ Evidence-Preserving Reducer'],['op','+ ObservationPack'],['all','SoL-Pi (all four)']];
function simRng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// One session: plan steps, each a list of actions. The same session (same seed) is replayed in every mode.
function simSession(seed,steps){
  const R=simRng(seed),U=(a,b)=>Math.round(a+(b-a)*R()),S=[];
  for(let s=0;s<steps;s++){const A=[],n=U(9,16);
    for(let j=0;j<n;j++){const x=R();
      if(x<0.30){A.push({k:'read',out:U(120,350),res:R()<0.25?U(4000,12000):U(500,2400),u:R()})}
      else if(x<0.45){A.push({k:'search',out:U(100,250),res:U(300,1500),u:R()})}
      else if(x<0.75){A.push({k:'edit',out:U(400,1400),res:U(60,160),u:R()});
        if(R()<0.7)A.push({k:'run',out:U(80,160),res:R()<0.6?U(1200,7000):U(150,800),u:R(),v:R()})}
      else A.push({k:'think',out:U(300,900),res:U(200,900),u:R()})}
    A.push({k:'plan',out:120,res:60,u:R()});S.push(A)}
  return S}
function simRun(S,mode){
  const on={af:mode==='af'||mode==='all',occ:mode==='occ'||mode==='all',epr:mode==='epr'||mode==='all',op:mode==='op'||mode==='all'};
  const K=SIM_K,P=SIM_P;let msgs=[],nid=0,prev=[];
  const T={req:0,read:0,write:0,input:0,out:0,sideIn:0,sideOut:0,compact:0,fused:0,stubbed:0,reduced:0,recalls:0,occEval:0,occYes:0};
  const series=[],stepEnd=[],events=[],stepT=[];
  const st={requestCount:0,lastContextTokens:null,posTot:0,posCnt:0,debt:0,repay:0,lastBoundary:0,counts:[],compactions:0,lastCompaction:null};
  const disp=m=>m.big&&on.op&&m.sends>=K.OP_FULL?K.OP_STUB:m.tok;
  const ctxTok=()=>K.SYS+msgs.reduce((t,m)=>t+disp(m),0);
  function request(outTok,step,ev,noState){
    // the prompt the provider sees, as (message id, displayed size) segments; the cached prefix is what matches the previous prompt
    if(on.op&&msgs.some(m=>m.big&&m.sends===K.OP_FULL))ev=(ev?ev+' ':'')+'stub';
    const seg=[['sys',K.SYS]].concat(msgs.map(m=>[m.id+(disp(m)!==m.tok?'s':''),disp(m)]));
    let i=0,read=0;while(i<seg.length&&i<prev.length&&seg[i][0]===prev[i][0]){read+=seg[i][1];i++}
    let total=0;seg.forEach(x=>total+=x[1]);const write=total-read;
    prev=seg;T.req++;T.read+=read;T.write+=write;T.out+=outTok;
    msgs.forEach(m=>{if(m.big)m.sends++});
    series.push({read,write,out:outTok,step,ev:ev||''});
    if(noState)return total;
    // Online Context Compact's bookkeeping (state.ts recordProviderRequest)
    const c=total,d=st.lastContextTokens===null?0:c-st.lastContextTokens;
    st.requestCount++;st.lastContextTokens=c;st.posTot+=Math.max(0,d);st.posCnt+=d>0?1:0;
    st.debt=Math.max(0,st.debt-st.repay);if(st.debt===0)st.repay=0;
    return total}
  function add(tok,kind,big){msgs.push({id:'m'+(nid++),tok,kind,big:!!big,sends:0})}
  function tail(){let k=msgs.length,t=0;while(k>0&&t<K.KEEP){k--;t+=disp(msgs[k])}return k}   // first kept index
  function compact(step,why){
    const k=tail();const archive=msgs.slice(0,k).reduce((t,m)=>t+disp(m),0);if(archive<=0)return 0;
    request(K.SUMMARY,step,'compact',true);T.req--;T.compact++;               // the summarisation call reads the whole context
    msgs=[{id:'sum'+(nid++),tok:K.SUMMARY,kind:'sum',big:false,sends:0}].concat(msgs.slice(k));
    events.push({at:series.length-1,step,k:'compact',why});return archive}
  function nearWindow(step){if(ctxTok()>=K.WINDOW-K.RESERVE){compact(step,'window');st.lastContextTokens=null}}
  S.forEach((A,step)=>{
    for(let j=0;j<A.length;j++){const a=A[j];let out=a.out,res=a.res,ev='';
      const nx=A[j+1];
      if(on.af&&a.k==='edit'&&nx&&nx.k==='run'){out+=K.FUSE_OUT;res+=simReduce(nx,on,T);j++;T.fused++;ev='fuse'}
      else if(a.k==='run')res=simReduce(a,on,T);
      request(out,step,ev);
      add(out,'asst');
      const big=res>K.OP_TH;add(res,a.k,big);
      if(big&&on.op){T.stubbed++;if(a.u<K.RECALL_P){T.recalls++;request(150,step,'recall');add(150,'asst');add(K.RECALL_TOK,'recall')}}
      if(a.k==='plan'){
        st.counts.push(st.requestCount-st.lastBoundary);st.lastBoundary=st.requestCount;
        if(on.occ){
          const k=tail(),w=ctxTok(),arch=msgs.slice(0,k).reduce((t,m)=>t+disp(m),0);
          const dec=occDecide({writeTokens:w,archiveTokens:arch,memoTokens:K.MEMO,contextTokens:w,completedBoundaryRequestCounts:st.counts.slice(),
            remainingBoundaries:S.length-1-step,averageContextTokenIncrement:st.posCnt?st.posTot/st.posCnt:null,contextWindowTokens:K.WINDOW,
            priorCompactionCount:st.compactions,requestsSinceLastCompaction:st.lastCompaction===null?null:st.requestCount-st.lastCompaction,
            carriedDebtTokens:st.debt,cacheDebtRepaymentTokens:st.repay,cacheWriteReadRatio:K.RATIO});
          T.occEval++;events.push({at:series.length-1,step,k:'gate',dec,ctx:w,arch});
          if(dec.compact&&arch>0){T.occYes++;compact(step,'gate');
            st.compactions++;st.lastCompaction=st.requestCount;st.lastContextTokens=null;
            st.debt+=dec.postCompactionTokens*(dec.incrementalCacheCostRatio??0);st.repay+=Math.max(0,arch-K.MEMO);
            add(K.CONT,'cont')}
        }
      }
      nearWindow(step)}
    stepEnd.push(series.length);stepT.push(Object.assign({},T))});
  const cost=(T.read*P.cache_read+T.write*P.cache_write+T.out*P.output)/1e6,side=(T.sideIn*SIM_SIDE.input+T.sideOut*SIM_SIDE.output)/1e6;
  return {T,series,stepEnd,stepT,events,cost,side,total:T.read+T.write+T.out}}
// Evidence-Preserving Reducer: a build or test log of at least 4 KiB goes to the cheaper model; the receipt is kept only if verification passes.
function simReduce(a,on,T){if(!on.epr||a.res<SIM_K.EPR_MIN)return a.res;
  T.sideIn+=a.res;T.sideOut+=SIM_K.RECEIPT;
  if(a.v<SIM_K.EPR_OK){T.reduced++;return SIM_K.RECEIPT}return a.res}
if(typeof module!=='undefined')module.exports={simSession,simRun,SIM_MODES,SIM_K,SIM_P};
