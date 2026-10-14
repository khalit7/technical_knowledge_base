// ---- Depth chooser (t-rrdepth): nDCG@10 against measured per-claim rerank time, every reranker and K ----
(function(){
  const R=window.RR;if(!R)return;const $=id=>document.getElementById(id);
  const HW=[null,10,50,100,200,400];
  const RN=['ce-minilm-l6','bge-reranker-v2-m3','qwen3-reranker-0.6b','colbert'];
  const TK={'ce-minilm-l6':'ce-minilm-l6','bge-reranker-v2-m3':'bge-reranker-v2-m3','qwen3-reranker-0.6b':'qwen3-reranker-0.6b','colbert':'maxsim'};
  function quality(fs,m){return m==='colbert'?R.colbert_rerank[fs].sweep:R.depth.sweep[fs][m]}
  // per-claim milliseconds at K: measured, or a least-squares line through the measured K, or K / measured pairs per second
  function ms(m,K){const hw=HW[+$('rr-dc-hw').value];
    if(hw&&m!=='colbert'){const g=R.tokens[m].gflop_per_pair;return {v:K*g/hw,kind:'derived'}}
    const T=R.timings[TK[m]];const meas=T&&T.K?Object.entries(T.K).map(([k,v])=>[+k,v.p50_ms]):[];
    const hit=meas.find(x=>x[0]===K);if(hit)return {v:hit[1],kind:'measured'};
    if(meas.length>=2){const n=meas.length,sx=meas.reduce((s,x)=>s+x[0],0),sy=meas.reduce((s,x)=>s+x[1],0),sxx=meas.reduce((s,x)=>s+x[0]*x[0],0),sxy=meas.reduce((s,x)=>s+x[0]*x[1],0);
      const b=(n*sxy-sx*sy)/(n*sxx-sx*sx),a=(sy-b*sx)/n;return {v:Math.max(0.05,a+b*K),kind:'interpolated'}}
    if(m==='colbert')return {v:K*0.05,kind:'interpolated'};
    return {v:1000*K/R.tokens[m].pairs_per_s_measured,kind:'from throughput'}}
  function kopts(){const fs=$('rr-dc-fs').querySelector('.on').dataset.m,m=$('rr-dc-rr').querySelector('.on').dataset.m;const s=$('rr-dc-k'),old=s.value;
    const ks=Object.keys(quality(fs,m)).map(Number).sort((a,b)=>a-b);s.innerHTML=ks.map(k=>'<option value="'+k+'">'+k+'</option>').join('');s.value=ks.includes(+old)?old:String(ks.includes(20)?20:ks[ks.length-1])}
  function draw(){const fs=$('rr-dc-fs').querySelector('.on').dataset.m,m=$('rr-dc-rr').querySelector('.on').dataset.m,K=+$('rr-dc-k').value;
    const hw=HW[+$('rr-dc-hw').value];$('rr-dc-hwv').textContent=hw?hw+' (derived)':'this laptop, measured';
    const Q=quality(fs,m)[String(K)],first=R.depth.first[fs],t=ms(m,K);
    $('rr-dc-stats').innerHTML=RD.stat('nDCG@10',Q.ndcg10.toFixed(3),(Q.ndcg10>=first.ndcg10?'+':'')+(Q.ndcg10-first.ndcg10).toFixed(3)+' over '+RRL.FS[fs]+' alone')+
      RD.stat('Ceiling: recall@'+K,first.recallK[String(K)]!==undefined?first.recallK[String(K)].toFixed(3):'-','share of relevant abstracts the reranker can see')+
      RD.stat('Time per claim',t.v>=1000?(t.v/1000).toFixed(2)+' s':t.v.toFixed(t.v<10?2:0)+' ms',t.kind+(m==='colbert'?', one CPU thread':', one batch of K'))+
      RD.stat('Claims per second, one device',(1000/t.v)>=10?Math.round(1000/t.v).toLocaleString('en-US'):(1000/t.v).toFixed(2),'serial, no concurrency')+
      (Q.win!==undefined?RD.stat('Claims better / worse',Q.win+' / '+Q.loss,'of 300, against the first stage'):'');
    const ser=RN.map(r=>{const q=quality(fs,r);return {name:RRL.NM[r],color:RRL.C[r],pts:Object.keys(q).map(Number).sort((a,b)=>a-b).map(k=>{const tt=ms(r,k);return [Math.max(0.05,tt.v),q[String(k)].ndcg10,RRL.NM[r]+', K '+k+': '+q[String(k)].ndcg10.toFixed(3)+', '+tt.v.toFixed(1)+' ms ('+tt.kind+')',tt.kind==='measured'||tt.kind==='derived'?'':'h',(r===m&&k===K)?6:0]})}});
    const allx=ser.flatMap(s=>s.pts.map(p=>p[0]));const x0=Math.pow(10,Math.floor(Math.log10(Math.min(...allx))*2)/2),x1=Math.pow(10,Math.ceil(Math.log10(Math.max(...allx))*2)/2);
    const ticks=[];for(let e=Math.ceil(Math.log10(x0));e<=Math.floor(Math.log10(x1));e++)ticks.push(Math.pow(10,e));
    RRL.chart($('rr-dc-svg'),ser,{xlog:true,x0,x1,y0:0.66,y1:0.8,xticks:ticks,xfmt:v=>v>=1000?(v/1000)+' s':v+' ms',yticks:[0.68,0.7,0.72,0.74,0.76,0.78,0.8],yfmt:v=>v.toFixed(2),xlabel:'time to rerank one claim\'s K candidates',ylabel:'nDCG@10',hlines:[[first.ndcg10,RRL.FS[fs]+' alone']]});
    RRL.legend($('rr-dc-leg'),ser.map(s=>[s.name,s.color]))}
  RD.seg($('rr-dc-fs'),()=>{kopts();draw()});RD.seg($('rr-dc-rr'),()=>{kopts();draw()});
  $('rr-dc-k').addEventListener('change',draw);$('rr-dc-hw').addEventListener('input',draw);
  kopts();(window.TAB_RENDER=window.TAB_RENDER||{})['t-rrdepth']=[draw];
})();
