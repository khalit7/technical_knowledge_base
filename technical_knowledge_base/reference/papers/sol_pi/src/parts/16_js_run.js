// ---- Replay a session: the step animation over plan steps, the totals table, and the compaction-gate explorer ----
(function(){
const STEPS=12;let seed=42,R={},S=null;
const PAPER_D={sol:{af:[11.9,7.8],occ:[40.2,30.2],epr:[10.0,10.4],op:[6.1,5.1],all:[49.0,33.2]},opus:{af:[11.3,7.8],occ:[19.2,11.7],epr:[19.3,16.4],op:[39.2,32.5],all:[44.7,33.5]}};
const modes={};
function run(){S=simSession(seed,STEPS);SIM_MODES.forEach(([m])=>{R[m]=simRun(S,m)});
  SIM_MODES.forEach(([m,n])=>{const r=R[m],p=R.pi;modes[m]=modes[m]||[];modes[m].length=0;
    for(let k=0;k<STEPS;k++){const a=k?r.stepEnd[k-1]:0,b=r.stepEnd[k],pa=k?p.stepEnd[k-1]:0,pb=p.stepEnd[k];
      const T=r.stepT[k],T0=k?r.stepT[k-1]:{req:0,fused:0,stubbed:0,reduced:0,compact:0,recalls:0};
      const ser=r.series.slice(a,b),mxp=Math.max(...ser.map(x=>x.read+x.write));
      const bits=[];
      if(T.fused>T0.fused){const n=T.fused-T0.fused;bits.push(n+(n>1?' edit and test pairs':' edit and test pair')+' fused into single calls')};
      if(T.reduced>T0.reduced){const n=T.reduced-T0.reduced;bits.push(n+(n>1?' long build or test logs':' long build or test log')+' replaced by verified receipts')};
      const st=ser.filter(x=>/stub/.test(x.ev)).length;if(st)bits.push(st+' request'+(st>1?'s':'')+' where a large result became a 1 KB stub (that request re-writes the cache after it)');
      if(T.recalls>T0.recalls){const n=T.recalls-T0.recalls;bits.push(n+(n>1?' stubbed results':' stubbed result')+' paged back with obs_recall')};
      r.events.filter(e=>e.step===k).forEach(e=>{
        if(e.k==='gate'){const d=e.dec;bits.push('at the step boundary the gate '+(d.compact?'<b>compacts</b>':'waits')+': rewriting pays back in '+(d.breakevenRequests==null?'n/a':d.breakevenRequests.toFixed(1))+' requests, '+(d.effectiveHorizonRequests==null?'':(d.compact?'within':'beyond')+' the '+fmt(d.effectiveHorizonRequests,0)+' expected')+' ('+d.reason.replace(/_/g,' ')+')')}
        if(e.k==='compact'&&e.why==='window')bits.push('the context reached the window minus the 16,384-token reserve, so Pi\'s native compaction ran');});
      modes[m].push({t:'plan step '+(k+1)+': '+(b-a)+' requests'+(m==='pi'?'':' (Pi: '+(pb-pa)+')')+', largest prompt '+fmt(mxp/1000,0)+'K tokens',
        c:(bits.length?bits.join('; ')+'.':(m==='pi'?'Pi re-sends the whole conversation on every request; only the new text at the end is a cache write.':'No mechanism fired in this step.'))})}})}
function axes(){let mxR=0,mxY=0;SIM_MODES.forEach(([m])=>{mxR=Math.max(mxR,R[m].series.length);R[m].series.forEach(x=>{mxY=Math.max(mxY,x.read+x.write)})});return {mxR,mxY}}
function draw(m,k,e,W){const r=R[m],p=R.pi,{mxR,mxY}=axes(),H=Math.max(230,Math.min(300,W*.5)),pl=46,pr=10,pt=18,pb=30;
  const bw=(W-pl-pr)/mxR,Y=v=>pt+(H-pt-pb)*(1-v/mxY);
  const a=k?r.stepEnd[k-1]:0,b=r.stepEnd[k],upto=a+Math.round((b-a)*e);
  let s='';const ys=mxY>400000?200000:mxY>150000?50000:25000;
  for(let v=0;v<=mxY;v+=ys){s+=ln2(pl,Y(v),W-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,fmt(v/1000,0)+'K',{fs:11,a:'end',c:'var(--mute)'})}
  // plan-step bands
  for(let j=0;j<=k;j++){const x0=pl+(j?r.stepEnd[j-1]:0)*bw;if(j%2)s+=rc(x0,pt,(r.stepEnd[j]-(j?r.stepEnd[j-1]:0))*bw,H-pt-pb,'var(--soft)',{r:0})}
  for(let i=0;i<upto;i++){const q=r.series[i],x=pl+i*bw,w=Math.max(.6,bw-.4);
    s+=rc(x,Y(q.read),w,Y(0)-Y(q.read),'var(--c1)',{r:0})+rc(x,Y(q.read+q.write),w,Y(q.read)-Y(q.read+q.write),'var(--c2)',{r:0});
    if(/compact/.test(q.ev))s+=tx(x+w/2,pt-4,'▼',{fs:11,a:'middle',c:'var(--bad)'});
    if(/fuse/.test(q.ev))s+=tx(x+w/2,Y(q.read+q.write)-3,'◆',{fs:11,a:'middle',c:'var(--c3)'});
    if(/stub/.test(q.ev))s+=tx(x+w/2,Y(q.read+q.write)-3,'■',{fs:11,a:'middle',c:'var(--c4)'})}
  if(m!=='pi'){const pu=Math.round((k?p.stepEnd[k-1]:0)+(p.stepEnd[k]-(k?p.stepEnd[k-1]:0))*e);let d='';
    for(let i=0;i<pu;i++){const q=p.series[i];d+=(i?'L':'M')+(pl+i*bw).toFixed(1)+','+Y(q.read+q.write).toFixed(1)+'H'+(pl+(i+1)*bw).toFixed(1)}
    if(d)s+='<path d="'+d+'" fill="none" stroke="var(--mute)" stroke-width="1.4" stroke-dasharray="4 3"/>'}
  s+=tx((pl+W-pr)/2,H-6,'model request, in order (shaded bands are plan steps)',{fs:11,a:'middle',c:'var(--mute)'});
  s+='<text x="11" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+((pt+H-pb)/2)+')">prompt tokens</text>';
  return svgW(W,H,s,'Prompt size of every request in the session')}
function cum(r,k,e){const a=k?r.stepEnd[k-1]:0,b=r.stepEnd[k],n=a+Math.round((b-a)*e);let rd=0,wr=0,o=0;for(let i=0;i<n;i++){const q=r.series[i];rd+=q.read;wr+=q.write;o+=q.out}
  const T=r.stepT[k],side=(T.sideIn*1+T.sideOut*5)/1e6;return {n,tok:rd+wr+o,rd,cost:(rd*SIM_P.cache_read+wr*SIM_P.cache_write+o*SIM_P.output)/1e6+(e>=1?side:0)}}
function counters(m,k,e){const c=cum(R[m],k,e),p=cum(R.pi,k,e);
  const dt=p.tok?100*(1-c.tok/p.tok):0,dc=p.cost?100*(1-c.cost/p.cost):0;
  return stat('Model calls so far',fmt(c.n),(m==='pi'?'':'Pi: '+fmt(p.n)+'; ')+'compaction calls included')+stat('Recorded traffic',(c.tok/1e6).toFixed(2)+' M',m==='pi'?(c.tok?(100*c.rd/c.tok).toFixed(1):'0')+'% cache reads':(dt>=0?dt.toFixed(1)+'% less than Pi':(-dt).toFixed(1)+'% more than Pi'))+
    stat('Cost at Opus 5 prices','$'+c.cost.toFixed(2),m==='pi'?'cache read $0.50, write $6.25, output $25 per M':(dc>=0?dc.toFixed(1)+'% less than Pi':(-dc).toFixed(1)+'% more than Pi'))}
function totals(){const p=R.pi;let h='<table><thead><tr><th>Mode</th><th class="num">Requests</th><th class="num">Compactions</th><th class="num">Traffic (M)</th><th class="num">Cache reads</th><th class="num">Cache writes (K)</th><th class="num">Cost</th><th class="num">vs Pi: tokens / cost</th><th class="num">Paper, Opus 5</th><th class="num">Paper, GPT-5.6 Sol</th></tr></thead><tbody>';
  SIM_MODES.forEach(([m,n])=>{const r=R[m],c=r.cost+r.side,dt=100*(1-r.total/p.total),dc=100*(1-c/p.cost);
    const pd=k=>m==='pi'?'':'-'+PAPER_D[k][m][0].toFixed(1)+'% / -'+PAPER_D[k][m][1].toFixed(1)+'%';
    h+='<tr><td>'+n+'</td><td class="num">'+r.T.req+'</td><td class="num">'+r.T.compact+'</td><td class="num">'+(r.total/1e6).toFixed(2)+'</td><td class="num">'+(100*r.T.read/r.total).toFixed(1)+'%</td><td class="num">'+fmt(r.T.write/1000,0)+'</td><td class="num">$'+c.toFixed(2)+(r.side?' <span class="mute">(incl. $'+r.side.toFixed(2)+' reducer)</span>':'')+'</td><td class="num">'+(m==='pi'?'':(dt>=0?'-':'+')+Math.abs(dt).toFixed(1)+'% / '+(dc>=0?'-':'+')+Math.abs(dc).toFixed(1)+'%')+'</td><td class="num">'+pd('opus')+'</td><td class="num">'+pd('sol')+'</td></tr>'});
  $('ssTot').innerHTML=h+'</tbody></table>';
  const w=+$('ssWin').value;$('ssTotNote').innerHTML='Illustrative session '+$('ssSeed').selectedOptions[0].text+', '+(w>=1e6?'1M':(w/1000)+'K')+'-token window. The last two columns are the paper\'s measured changes against Pi on EdgeBench (Table 4), for comparison of direction only: the simulated session is not an EdgeBench task. '+(w===200000?'With a 200K window Pi compacts on its own when the context fills, which already removes old large results; a mechanism that keeps the context smaller can postpone that compaction and so save less, or even cost more, over the session. That interaction is real but its size depends on the task.':'With a 1M window Pi never compacts in this session, so every mechanism that shrinks the context saves.');}
SIM_K.WINDOW=+$('ssWin').value;
run();
const A=makeAnim({id:'ss',modes,mode:'pi',draw,counters,dur:2600});
const seg=$('ssM');
// build the mode buttons once (makeAnim binds them when it starts, so add them before it binds: rebind here)
SIM_MODES.forEach(([m,n],i)=>{const b=document.createElement('button');b.dataset.m=m;b.textContent=m==='pi'?'Pi':n.replace('+ ','');if(!i)b.classList.add('on');b.setAttribute('aria-pressed',i?'false':'true');seg.appendChild(b);
  b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});A.st.m=m;A.st.k=0;A.st.t=RM?1:0;if(!RM)A.st.play=true;A.st.lk=-1;A.draw();A.kick()})});
function rerun(){run();A.st.lk=-1;A.draw();totals()}
$('ssSeed').addEventListener('change',e=>{seed=+e.target.value;rerun()});
$('ssWin').addEventListener('change',e=>{SIM_K.WINDOW=+e.target.value;rerun()});
onTab('t-run',()=>{totals();refit($('ssSvg'));drawGate()});
// ---- the gate explorer ----
const PRIOR={0:{c:0,rs:null,debt:0,rep:0},1:{c:1,rs:10,debt:300000,rep:90000},3:{c:3,rs:1,debt:0,rep:0}};
const WHY={economic:'the rewrite pays for itself within the expected remaining requests',window_protection:'the context is within 16,384 tokens of the window, so it compacts regardless of price',
  deferred_economic:'the rewrite would take longer to pay back than the requests expected to remain',deferred_subsequent_margin:'a later compaction must pay back within two thirds of the horizon (a 1.5× margin), and this one does not',
  deferred_carried_debt:'the cost of earlier rewrites has not been repaid yet, and the combined debt does not fit the horizon',deferred_post_compaction_cooldown:'it would pay, but the last compaction was under 2 requests ago (cooldown)',
  non_positive_saving:'the summary would not be shorter than what it replaces',horizon_unavailable:'no plan history yet',cache_ratio_unavailable:'no cache price ratio set'};
function gateIn(){const ctx=+$('gCtx').value,arc=Math.round(Math.max(0,ctx-20000)*(+$('gArc').value)/100),P=PRIOR[$('gPrior').value];
  return {writeTokens:ctx,archiveTokens:arc,memoTokens:1000,contextTokens:ctx,completedBoundaryRequestCounts:[+$('gRps').value,+$('gRps').value,+$('gRps').value],remainingBoundaries:+$('gLeft').value,
    averageContextTokenIncrement:1500,contextWindowTokens:1000000,priorCompactionCount:P.c,requestsSinceLastCompaction:P.rs,carriedDebtTokens:P.debt,cacheDebtRepaymentTokens:P.rep,cacheWriteReadRatio:+$('gRat').value}}
function drawGate(){const i=gateIn(),d=occDecide(i);
  $('gCtxV').textContent=fmt(i.contextTokens/1000,0)+'K tokens';$('gArcV').textContent=fmt(i.archiveTokens/1000,1)+'K tokens';$('gRpsV').textContent=$('gRps').value;$('gLeftV').textContent=$('gLeft').value;$('gRatV').textContent=(+$('gRat').value).toFixed(1)+'×';
  $('gOut').innerHTML='<div class="dec '+(d.compact?'yes':'no')+'"><b>'+(d.compact?'Compact now':'Do not compact yet')+'</b> ('+d.reason.replace(/_/g,' ')+'): '+WHY[d.reason]+'.</div>';
  const el=$('gSvg'),W=el.clientWidth;if(!W)return;const H=96,pl=W<500?112:150,pr=W<500?118:140;const be=d.breakevenRequests,hz=d.compact&&d.reason==='window_protection'?d.expectedRemainingRequests:(i.priorCompactionCount===0?d.effectiveHorizonRequests:d.expectedRemainingRequests);
  const mx=Math.max(1,(be||0)*(i.priorCompactionCount?1.5:1),hz||0)*1.1,X=v=>pl+(W-pl-pr)*Math.min(v,mx)/mx;let s='';
  const row=(y,lab,v,c,note)=>tx(pl-8,y+12,lab,{fs:12,a:'end'})+rc(pl,y,X(v||0)-pl,18,c,{r:3})+tx(X(v||0)+5,y+13,v==null?'n/a':fmt(v,v<10?1:0)+(note||''),{fs:11});
  s+=row(12,'pays back after',be,'var(--c2)',' requests');
  s+=row(48,'requests expected',hz,'var(--c1)',i.priorCompactionCount===0?' (first: doubled)':'');
  el.innerHTML=svgW(W,H,s,'Payback against expected remaining requests');
  const c=PAPER.cs;$('gChk').textContent=fmt(c.identical)+' of '+fmt(c.checked)+' random inputs give identical decisions and reasons ('+c.date+')'}
['gCtx','gArc','gRps','gLeft','gRat'].forEach(id=>$(id).addEventListener('input',drawGate));$('gPrior').addEventListener('change',drawGate);
fit($('gSvg'),()=>drawGate());
})();
