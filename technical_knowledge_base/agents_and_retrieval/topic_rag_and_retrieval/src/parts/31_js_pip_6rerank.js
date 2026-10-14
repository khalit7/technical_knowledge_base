// ---- Pipeline lab: rerank depth sweep, where the answer gets lost (K and k slider), latency ----
(function(){
  const P=window.PIP,R=P.D.rerank,$=P.$,esc=P.esc;
  if(R){
    let fs='hybrid',met='ndcg10';
    const RN=[['ce-minilm-l6','CE MiniLM-L6 (22 M)','var(--c5)'],['bge-reranker-v2-m3','bge-reranker-v2-m3 (568 M)','var(--c2)'],['qwen3-reranker-0.6b','Qwen3-Reranker-0.6B','var(--c4)']];
    function draw(){
      const S=R.sweep[fs],F=R.first[fs],Ks=['1','3','5','10','20','30','50','100'];
      const ser=RN.map(r=>({name:r[1],color:r[2],ys:Ks.map(k=>S[r[0]]&&S[r[0]][k]?S[r[0]][k][met]:null)}));
      ser.push({name:'no reranker',color:'var(--mute)',ys:Ks.map(()=>F[met==='ndcg10'?'ndcg10':'r10']),dash:1});
      const all=ser.flatMap(s=>s.ys).filter(v=>v!=null);const lo=Math.min(...all),hi=Math.max(...all),pad=(hi-lo)*.15||.01;
      P.lines({el:$('pip-rr-chart'),xs:Ks,series:ser,ymin:Math.max(0,lo-pad),ymax:Math.min(1,hi+pad),xlab:'rerank depth K',label:'rerank depth sweep',h:220});
      $('pip-rr-ceil').innerHTML='First-stage recall at K (the ceiling: a reranker can only reorder what it is given): '+Ks.map(k=>'K '+k+': <b>'+P.f3(F.recallK[k])+'</b>').join(', ')+'.';
      const miss=RN.filter(r=>Ks.some(k=>!(S[r[0]]&&S[r[0]][k]))).map(r=>r[1]+' (K '+Ks.filter(k=>!(S[r[0]]&&S[r[0]][k])).join(', ')+')');
      $('pip-rr-miss').textContent=miss.length?'Not measured: '+miss.join('; ')+'. See the limits below.':'';
    }
    P.seg($('pip-rr-fs'),v=>{fs=v;draw()});P.seg($('pip-rr-met'),v=>{met=v;draw()});P.onRender(draw);
  }
  // ---- where the answer gets lost
  const E=P.D.e2e;
  if(E){
    const cl=E.claims.filter(c=>c[1]!=='N'),N=cl.length,CI=Object.fromEntries(E.conds.map((c,i)=>[c,i]));
    let K=30,k=3,rer=true;
    const Kopts=E.KS.slice();
    $('pip-lo-K').max=Kopts.length-1;$('pip-lo-K').value=Kopts.indexOf(30);
    $('pip-lo-k').innerHTML=E.smallk.map(v=>'<button data-v="'+v+'"'+(v===3?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>'+v+'</button>').join('');
    function draw(){
      const cond=rer?'rr'+K+'@'+k:'first@'+k,ci=CI[cond],Ki=E.KS.indexOf(K);
      const KK=rer?K:k;
      const inK=c=>c[2]&&c[2]<=KK,ink=c=>rer?(c[3][Ki]&&c[3][Ki]<=k):(c[2]&&c[2]<=k);
      const r=cl.filter(inK).length,p=cl.filter(ink).length,g=cl.filter(c=>ink(c)&&c[4][ci]===2).length;
      const len=cl.filter(c=>c[4][ci]>=1).length,lucky=cl.filter(c=>!ink(c)&&c[4][ci]>=1).length;
      $('pip-lo-Kv').textContent=rer?K:'(no reranker: K = k = '+k+')';
      $('pip-lo-K').disabled=!rer;
      const parts=[[N-r,'retrieval miss','var(--bad)'],[r-p,'ranking miss','var(--c5)'],[p-g,'generation miss','var(--c4)'],[g,'correct','var(--good)']];
      $('pip-lo-buck').innerHTML=parts.map(a=>'<span style="flex-basis:'+(100*a[0]/N).toFixed(2)+'%;background:'+a[2]+'" title="'+a[1]+': '+a[0]+'">'+(a[0]/N>.07?a[0]:'')+'</span>').join('');
      $('pip-lo-leg').innerHTML=parts.map(a=>'<span><i style="background:'+a[2]+'"></i>'+a[1]+' <b>'+a[0]+'</b></span>').join('');
      const rK=r/N,pk=r?p/r:0,gg=p?g/p:0;
      $('pip-lo-fx').innerHTML='A = r<sub>K</sub> &times; p<sub>k|K</sub> &times; g = '+rK.toFixed(3)+' &times; '+pk.toFixed(3)+' &times; '+gg.toFixed(3)+' = <b>'+(g/N).toFixed(3)+'</b> ('+g+' of '+N+' claims)';
      $('pip-lo-cnt').innerHTML=[['r_K: evidence in the top '+(rer?K:k),r+' of '+N],['p_k|K: still there in the top '+k,p+' of '+r],['g: answered right (cites evidence)',g+' of '+p],
        ['Label right, any reason',len+' of '+N],['...of which with no evidence in the prompt',lucky]].map(a=>'<div class="stat"><div class="k">'+a[0]+'</div><div class="v">'+a[1]+'</div></div>').join('');
    }
    $('pip-lo-K').addEventListener('input',e=>{K=Kopts[+e.target.value];draw()});
    P.seg($('pip-lo-k'),v=>{k=+v;draw()});
    P.seg($('pip-lo-rr'),v=>{rer=v==='on';draw()});
    draw();
  }
  // ---- latency
  const LA=P.D.latency;
  if(LA&&E){
    const S=LA.stages,g=E.gen_cost;
    const rows=[['BM25 (CPU, 1 thread)','bm25'],['Embed the query (Qwen3-Emb, MPS)','embed'],['Exact search, 5,183 vectors (CPU)','search'],['RRF fusion','fuse'],
      ['Rerank 30, CE MiniLM','rerank-ce-minilm-l6-30'],['Rerank 30, bge-reranker-v2-m3','rerank-bge-reranker-v2-m3-30'],['Rerank 30, Qwen3-Reranker','rerank-qwen3-reranker-0.6b-30']].filter(r=>S[r[1]]);
    rows.push(['Generate (Qwen3-1.7B, median prompt '+P.n0(g.median_in_tokens)+' tokens)',null,1000*g.median_s]);
    const v=r=>r[1]?S[r[1]].p50_ms:r[2];
    const mx=Math.max(...rows.map(v));
    let scale='log';
    function draw(){
      const f=x=>scale==='log'?Math.log10(1+x)/Math.log10(1+mx):x/mx;
      $('pip-la-bars').innerHTML=rows.map(r=>'<div class="row"><span class="nm" title="'+esc(r[0])+'">'+esc(r[0])+'</span><span class="track"><span class="fill" style="width:'+(100*f(v(r))).toFixed(1)+'%;background:'+(r[1]&&r[1].startsWith('rerank')?'var(--c4)':r[1]?'var(--c1)':'var(--c2)')+'"></span></span><span class="val">'+(v(r)>=1000?(v(r)/1000).toFixed(2)+' s':v(r)>=10?v(r).toFixed(0)+' ms':v(r).toFixed(2)+' ms')+'</span></div>').join('');
    }
    P.seg($('pip-la-scale'),x=>{scale=x;draw()});draw();
  }
})();
