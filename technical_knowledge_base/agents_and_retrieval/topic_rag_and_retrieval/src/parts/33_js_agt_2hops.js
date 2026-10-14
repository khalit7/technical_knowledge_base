// ---- Agentic lab: why one search is not enough (both gold paragraphs in the top k, per retriever) ----
(function(){
  const P=window.AGT,D=P.D&&P.D.hops,$=P.$;
  if(!D){return}
  const SYS=[['bge-small','bge-small (the search tool)','var(--c1)'],['gte-modernbert','gte-modernbert','var(--c3)'],['qwen3-emb-0.6b','Qwen3-Emb-0.6B (in-domain)','var(--c4)'],['bm25','BM25','var(--c2)'],['minilm-l6','MiniLM-L6','var(--c5)']];
  const KS=['1','2','3','5','10','20','50','100'];
  let which='both';
  function draw(){
    const el=$('agt-hops-chart');
    P.lines({el,xs:KS,series:SYS.map(s=>({name:s[1],color:s[2],ys:KS.map(k=>D.systems[s[0]][which][k]/D.n)})),
      ymin:0,ymax:1,fmt:v=>Math.round(100*v)+'%',xlab:'paragraphs retrieved for the question (k)',h:230,
      label:'Share of the 200 questions with '+(which==='both'?'both gold paragraphs':'at least one gold paragraph')+' in the top k'});
    const b=D.systems['bge-small'],m=D.systems['bm25'];
    $('agt-hops-note').innerHTML='bge-small: at least one gold paragraph in the top 10 for <b>'+b.any['10']+'</b> of 200 questions, both for <b>'+b.both['10']+'</b>; in the top 3 (a typical prompt): both for '+b.both['3']+'. BM25: both in the top 10 for '+m.both['10']+'. The median rank of the second gold paragraph is '+b.second_rank_median+' with bge-small and '+m.second_rank_median+' with BM25.';
  }
  P.seg($('agt-hops-which'),v=>{which=v;draw()});
  P.onRender(draw);
})();
