// ---- Cost calculator (t-grcost) ----
(function(){
  const D=window.GR,$=id=>document.getElementById(id),F=GRL.fmt;
  if(!$('cc-card'))return;
  const P_GR=D.prompts.graphrag_extract_graph.o200k, P_CONT=D.prompts.graphrag_continue.o200k, P_REP=D.prompts.graphrag_community_report.o200k,
        P_MAP=D.prompts.graphrag_global_map.o200k, P_RED=D.prompts.graphrag_global_reduce.o200k;
  const ls=D.lr_stub.insert, P_LR=Math.round(ls.tok_in/ls.calls)-D.extract_dry.paragraph_tokens_median; // per-call overhead, derived from the stub run
  const PRE=320,DEC=41; // Qwen3-4B Q4_K_M llama-server on this Mac, tokens/s (RAG in production child, measured)
  function calc(){
    const cl=(v,a,b)=>Math.min(b,Math.max(a,v));const m=$('cc-m').value,N=cl(+$('cc-n').value||0,1000,1e10),c=+$('cc-c').value,g=+$('cc-g').value,o=cl(+$('cc-o').value||0,0,8000),k=cl(+$('cc-k').value||0,0,10);
    const [rin,rout]=$('cc-r').value.split(',').map(Number),[pin,pout]=$('cc-p').value.split(',').map(Number);
    const ch=Math.ceil(N/Math.max(1,c-100));
    let exIn=0,exOut=0,repIn=0,repOut=0,calls=0;
    if(m==='gr'){for(let r=0;r<=g;r++){exIn+=ch*(P_GR+c+r*(o+P_CONT))}exOut=ch*o*(1+g);calls+=ch*(1+g)}
    if(m==='lr'){exIn=ch*(1+g)*(P_LR+c)+ch*g*o;exOut=ch*o*(1+g);calls+=ch*(1+g)}
    if(m==='gr'||m==='fast'){const nc=Math.round(ch*k);repIn=nc*(P_REP+rin);repOut=nc*rout;calls+=nc}
    const tin=exIn+repIn,tout=exOut+repOut,usd=tin/1e6*pin+tout/1e6*pout,hrs=(tin/PRE+tout/DEC)/3600;
    $('cc-out').innerHTML=RD.stat('chunks',F(ch),'corpus / (chunk - 100 overlap)')+RD.stat('LLM calls to index',F(calls),'')+RD.stat('prompt tokens',F(tin),(tin/N).toFixed(1)+' per corpus token')+RD.stat('output tokens',F(tout),'')+
      RD.stat('at list price','$'+(usd<10?usd.toFixed(2):F(usd)),'')+RD.stat('local Qwen3-4B, this Mac',hrs<1?F(hrs*60)+' min':GRL.fmt1(hrs)+' h','no prompt caching, one stream');
    const mx=Math.max(1,exIn,exOut,repIn,repOut),bar=(n,v,col)=>'<div class="row"><span>'+n+'</span><div class="tr"><div class="f" style="width:'+(100*v/mx).toFixed(1)+'%;background:'+col+'"></div></div><span class="v">'+F(v)+'</span></div>';
    $('cc-bars').innerHTML=bar('extraction, prompt',exIn,'var(--c1)')+bar('extraction, output',exOut,'var(--c2)')+bar('reports, prompt',repIn,'var(--c3)')+bar('reports, output',repOut,'var(--c4)');
    const rows=[['extraction prompt per chunk, round r',m==='gr'?'P + c + r (o + '+P_CONT+'), P = '+F(P_GR)+' (graphrag prompt, measured)':m==='lr'?'P + c (+ o in gleaning), P = '+F(P_LR)+' per call (derived from the LightRAG stub run)':'none'],
      ['report calls','chunks x communities per chunk ('+k+'; GraphRAG paper Table 2: 2,680 communities over 1,669 chunks)'],
      ['report prompt','report prompt '+F(P_REP)+' tokens (measured) + context '+F(rin)],
      ['not included','entity description summaries, claims (off by default), embeddings, retries: a lower bound']];
    $('cc-tab').innerHTML='<table class="gr-t"><tbody>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join('')+'</tbody></table>';
    // one global question
    const lf=+$('cc-l').value,nc=Math.max(1,Math.round(ch*k*lf));
    const qIn=nc*(P_MAP+rout)+P_RED+4000,qOut=nc*200+500,vIn=10*c+500,vOut=300;
    const qUsd=qIn/1e6*pin+qOut/1e6*pout,vUsd=vIn/1e6*pin+vOut/1e6*pout;
    $('cc-q').innerHTML=(m==='vec'?'':RD.stat('global search','$'+qUsd.toFixed(3),F(nc+1)+' calls, '+F(qIn)+' prompt tokens'))+RD.stat('vector RAG, top 10 chunks','$'+vUsd.toFixed(4),'1 call, '+F(vIn)+' prompt tokens')+(m==='vec'?'':RD.stat('ratio',F(qUsd/vUsd)+'x','global / vector'));
    $('cc-note').innerHTML='Global search: one map call per community at the level read (map prompt '+F(P_MAP)+' tokens, measured, plus one report; 200 output tokens each, <span class="as">assumption</span>) and one reduce call (prompt '+F(P_RED)+' plus 4,000 tokens of points, <span class="as">assumption</span>). Published anchors, not reproduced (inputs differ): GraphRAG indexed about 1 M podcast tokens in 281 minutes with gpt-4-turbo (Edge et al.); on MuSiQue HippoRAG 2\'s authors measured 115.5 M prompt and 36.1 M output tokens for GraphRAG over 11,656 passages, about 9,900 and 3,100 per passage (their Table 12) <span class="pub">published</span>. Prefix caching (the extraction instructions are the same in every call) would cut the local prefill time and, at providers that discount cached input, the price; '+(D.extract_1_7b?'measured here: see section 3.':'its effect here is measured by the <span class="gr-pend">pending</span> extraction run (n_in_new).');
  }
  ['cc-m','cc-n','cc-c','cc-g','cc-o','cc-k','cc-r','cc-p','cc-l'].forEach(id=>$(id).addEventListener('input',calc));
  ['cc-m','cc-c','cc-g','cc-r','cc-p','cc-l'].forEach(id=>$(id).addEventListener('change',calc));
  calc();
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-grcost']=[calc];
})();
