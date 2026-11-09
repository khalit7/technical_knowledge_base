// Numbers for the Reading tab: the running swap (claude-v1 champion, claude-instant-v1 challenger) on MT-Bench's released GPT-4 grades, computed by
// window.PEC (21_js_common.js) from window.PE. Fills the .pe-v spans in the prose (identical text sits in the static HTML so the ledger can see it)
// and collects in window.PES what the four 3D stages draw, so check_stages.mjs can compare the step lists with it. recompute.py checks the same numbers.
(function(){
const D=window.PE,C=window.PEC;if(!D||!C)return;
const CH='claude-v1',CL='claude-instant-v1',A=C.byName[CH].s,B=C.byName[CL].s;
const O={aggTol:.25,sliceTol:.5,conf:.95,escalate:true,aggSig:false};
const G=C.gate(A,B,O),sl=c=>G.slices.find(r=>r.cat===c);
const JT=D.judge_tokens,callCost=(JT.prompt*C.PRICE['gpt-4'][0]+JT.completion*C.PRICE['gpt-4'][1])/1e6/JT.calls;
const failIdx=B.findIndex(x=>x===null),nAll=C.models.reduce((s,m)=>s+m.s.filter(x=>x===null).length,0);
const ciSum=B.filter(x=>x!==null).reduce((s,x)=>s+x,0),sumLen=k=>D.items.reduce((s,it)=>s+it[k],0);
// error analysis on the swap: a trace is one of the challenger's graded turns; it "fails" when it scored below the champion on the same turn.
// MT-Bench's category stands in for the failure mode axial coding would name (labelled so on the page).
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const traces=[];for(let i=0;i<160;i++)if(B[i]!==null)traces.push(i);
const rnd=mulberry32(1);
function shuffle(){const a=traces.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));const t=a[i];a[i]=a[j];a[j]=t}return a}
function satur(order){const seen=new Set(),pos=[];order.forEach((i,n)=>{if(B[i]<A[i]&&!seen.has(C.catOf[i])){seen.add(C.catOf[i]);pos.push(n+1)}});return pos}
const order=shuffle(),satPos=satur(order);           // the reading order the stage draws: the first of the 1,000 seeded orders
const lasts=[satPos[satPos.length-1]];for(let k=1;k<1000;k++){const p=satur(shuffle());lasts.push(p[p.length-1])}
const srt=lasts.slice().sort((a,b)=>a-b),med=(srt[499]+srt[500])/2,p90=srt[899],w100=lasts.filter(x=>x<=100).length;
const fails=traces.filter(i=>B[i]<A[i]);
const modes=C.CATS.map(c=>({c,n:fails.filter(i=>C.catOf[i]===c).length})).filter(m=>m.n>0).sort((a,b)=>b.n-a.n);
const worst=D.items.map((it,i)=>({it,i,d:B[i]===null?0:B[i]-A[i]})).filter(x=>x.it.c==='writing'&&x.d<0).sort((a,b)=>a.d-b.d).slice(0,3);
const V={aggd:C.f(G.agg.mean),wrd:C.n(-sl('writing').mean),wrci:C.n(sl('writing').lo)+' to '+C.n(sl('writing').hi),exd:C.n(-sl('extraction').mean),
  cimean:C.mean(B).toFixed(3),cimean160:((ciSum-1)/160).toFixed(3),failq:D.order[failIdx][0]+' ('+C.catOf[failIdx]+', turn '+D.order[failIdx][1]+')',failall:String(nAll),
  tokcall:Math.round((JT.prompt+JT.completion)/JT.calls).toLocaleString('en-US')+' ('+Math.round(JT.prompt/JT.calls)+' prompt, '+Math.round(JT.completion/JT.calls)+' completion)',
  judgecost:'$'+(callCost*JT.calls).toFixed(2)+' for the two models, or $'+callCost.toFixed(3)+' per call'};
document.querySelectorAll('.pe-v').forEach(e=>{if(V[e.dataset.k]!==undefined&&e.textContent!==V[e.dataset.k]){console.error('pe-v '+e.dataset.k+': static "'+e.textContent+'" but computed "'+V[e.dataset.k]+'"');e.textContent=V[e.dataset.k]}});
const wl=document.getElementById('ga-wd-l');if(wl)wl.innerHTML=worst.map(x=>'<li><b>Question '+x.it.q+', turn '+x.it.t+'</b> ('+A[x.i]+' → '+B[x.i]+'): "'+C.esc(x.it.p.slice(0,90))+(x.it.p.length>90?'...':'')+'"'+(x.it.jb?'<br><span class="mute">Judge: "'+C.esc(x.it.jb.slice(0,300))+'..."</span>':'<br><span class="mute">(no judge explanation in the file for this turn)</span>')+'</li>').join('');
window.PES={A,B,G,O,CH,CL,V,sl,callCost,calls:JT.calls,failIdx,
  champMean:C.mean(A).toFixed(2),challMean:C.mean(B).toFixed(2),
  price:{a:C.PRICE[CH],b:C.PRICE[CL],pr:(C.PRICE[CH][0]/C.PRICE[CL][0]).toFixed(1),cr:(C.PRICE[CH][1]/C.PRICE[CL][1]).toFixed(1),shorter:Math.round(100*(1-sumLen('lb')/sumLen('la')))},
  ea:{traces,order,fails,modes,satPos,satN:satPos[satPos.length-1],med,p90,w100,worst:worst.map(x=>({q:x.it.q,t:x.it.t,a:A[x.i],b:B[x.i],i:x.i}))}};
})();
