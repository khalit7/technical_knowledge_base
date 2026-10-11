// ---- Reading section 7: the simulated grid summarised from window.DDP (same goodput rule as the lab) ----
window.DDGP=function(P,w,k,i,j){const W=P.workloads[w],rs=W.res[k],NT=P.tpots.length;let g=0;for(let r=0;r<rs.length;r++){if(rs[r][i*NT+j]>=0.9)g=W.rates[r];else break}return g};
window.DDBEST=function(P,w,i,j,x){let b=0,kb='';for(let p=1;p<P.gpus;p++){const k=p+'P'+(P.gpus-p)+'D:'+(x||'nic400'),g=window.DDGP(P,w,k,i,j);if(g>b){b=g;kb=k}}return {g:b,k:kb}};
(function(){
  const P=window.DDP,el=document.getElementById('dd-s7-tbl');if(!P||!el)return;
  const fmt=(x,d)=>(+x).toLocaleString('en-GB',{maximumFractionDigits:d==null?1:d});
  const nm=k=>k.split(':')[0].replace('P',' prefill + ').replace('D',' decode');
  const i2=P.ttfts.indexOf(2),i05=P.ttfts.indexOf(0.5),T=j=>P.tpots.indexOf(j);
  let h='<tr><th>Per-token target</th><th class="num">8 colocated</th><th class="num">Best split</th><th>Which split</th><th class="num">Split against colocated</th></tr>';
  P.tpots.forEach((t,j)=>{const c=window.DDGP(P,'chat','co',i2,j),b=window.DDBEST(P,'chat',i2,j);
    h+='<tr><td>'+Math.round(t*1000)+' ms</td><td class="num">'+fmt(c)+' req/s</td><td class="num">'+fmt(b.g)+' req/s</td><td>'+nm(b.k)+'</td><td class="num">'+(c>0?(b.g>=c?'+':'')+Math.round(100*(b.g/c-1))+'%':'n/a')+'</td></tr>'});
  el.innerHTML=h;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  const c25=window.DDGP(P,'chat','co',i2,T(0.025)),b25=window.DDBEST(P,'chat',i2,T(0.025)),c75=window.DDGP(P,'chat','co',i2,T(0.075)),b75=window.DDBEST(P,'chat',i2,T(0.075));
  set('dd-s7-l1','at 25 ms the best split serves '+fmt(b25.g/c25)+' times as many requests as eight colocated engines ('+fmt(b25.g)+' against '+fmt(c25)+' per second); at 75 ms colocated serves more ('+fmt(c75)+' against '+fmt(b75.g)+').');
  const c05=window.DDGP(P,'chat','co',i05,T(0.05)),b05=window.DDBEST(P,'chat',i05,T(0.05));
  set('dd-s7-l2','with a 0.5 s first-token target and 50 ms per token, colocated serves '+fmt(c05)+' requests per second against '+fmt(b05.g)+' for the best split.');
  const rc=window.DDGP(P,'rag','co',i2,T(0.025)),rb=window.DDBEST(P,'rag',i2,T(0.025)),rs=window.DDBEST(P,'rag',i2,T(0.025),'nic50');
  const r1=Math.max(window.DDGP(P,'rag','co',P.ttfts.indexOf(1),T(0.075)),window.DDBEST(P,'rag',P.ttfts.indexOf(1),T(0.075)).g);
  set('dd-s7-l4','with 8,000-token documents no layout meets a 1 s first-token target ('+(r1>0?'except at '+fmt(r1):'none at any rate tried')+'), because one H200 needs about 1.8 s for such a prompt: that is a job for tensor parallelism inside the prefill engines. At 2 s and 25 ms per token the split wins ('+fmt(rb.g)+' against '+fmt(rc)+' requests per second), but over a 50 Gb/s link the 2.6 GB caches take about 420 ms each to move and '+(rs.g>0?'the best split serves '+fmt(rs.g)+' per second.':'no split meets the targets at any rate tried.'));
})();
