// ---- Shared metric functions (mirrored by src/recompute.py) and the Reading's rank-list calculator ----
window.RM=(function(){
  const lg=i=>Math.log2(i+2);
  // grades: array of grades in rank order (0 = not relevant); all: every relevant grade for the query (in or out of the list)
  function dcg(gs,exp){let s=0;gs.forEach((g,i)=>{s+=(exp?Math.pow(2,g)-1:g)/lg(i)});return s}
  function one(grades,all,k,exp){
    const top=grades.slice(0,k),nrel=all.length;
    const hits=top.filter(g=>g>0).length;
    const ideal=all.slice().sort((a,b)=>b-a).slice(0,k);
    const idcg=dcg(ideal,exp);
    const fi=grades.findIndex(g=>g>0);
    // context precision@k (RAGAS form) with binary verdicts: mean of precision@i over the relevant positions in the top k
    let cp=0,seen=0;top.forEach((g,i)=>{if(g>0){seen++;cp+=seen/(i+1)}});
    return {recall:nrel?hits/nrel:NaN,prec:hits/k,hit:hits>0?1:0,rr:fi>=0&&fi<k?1/(fi+1):0,ndcg:idcg>0?dcg(top,exp)/idcg:NaN,cp:seen?cp/seen:0,dcgv:dcg(top,exp),idcg};
  }
  return {dcg,one};
})();

(function(){
  const $=id=>document.getElementById(id);
  const list=$('mc-list'),out=$('mc-out'),note=$('mc-note');if(!list)return;
  // the old RAG evaluation page's worked example: A=3, B=2, C=1 relevant; X, Y, Z... irrelevant
  const P={
    first:{lab:['X','B','Y','C','Z','U','V','A','W','T'],g:[0,2,0,1,0,0,0,3,0,0]},
    rerank:{lab:['A','B','X','C','Y','Z','U','V','W','T'],g:[3,2,0,1,0,0,0,0,0,0]},
    pad:{lab:['A','X','Y','Z','U','V','W','T','S','R'],g:[3,0,0,0,0,0,0,0,0,0]}
  };
  let cur='first',lab=P.first.lab.slice(),g=P.first.g.slice(),extra=[];
  function allRel(){
    // the query's relevant set: A, B, C in the two worked presets; whatever is marked in the list plus nothing else for a custom list
    if(cur==='custom')return g.filter(x=>x>0);
    if(cur==='pad')return [3];
    return [3,2,1];
  }
  function draw(){
    const k=+$('mc-k').value,exp=$('mc-gain').value==='exp';
    list.innerHTML=lab.map((l,i)=>'<button data-i="'+i+'" class="g'+g[i]+(i>=k?' cut':'')+'" aria-label="Rank '+(i+1)+', passage '+l+', grade '+g[i]+'">'+l+'<small>#'+(i+1)+' g'+g[i]+'</small></button>').join('');
    const all=allRel();const m=RM.one(g,all,k,exp);
    const f=x=>isFinite(x)?x.toFixed(3):'n/a';
    out.innerHTML=RD.stat('recall@'+k,f(m.recall),'relevant in top '+k+' / '+all.length+' relevant')+RD.stat('precision@'+k,f(m.prec),'relevant in top '+k+' / '+k)+
      RD.stat('hit@'+k,m.hit,'any relevant in top '+k)+RD.stat('RR',f(m.rr),'1 / rank of first hit')+
      RD.stat('nDCG@'+k,f(m.ndcg),'DCG '+m.dcgv.toFixed(3)+' / IDCG '+m.idcg.toFixed(3))+RD.stat('context precision@'+k,f(m.cp),'RAGAS form, binary verdicts');
    note.textContent=cur==='custom'?'Custom list: the relevant set is whatever you have marked, so recall counts only passages in this list.':
      cur==='pad'?'One relevant passage at rank 1 and nine misses: context precision stays 1.0 at any k, precision@10 is 0.1. Padding the prompt is invisible to context precision.':
      'Preset from the worked example. Click any slot to change its grade; the list then becomes a custom one.';
  }
  list.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const i=+b.dataset.i;
    if(cur!=='custom'){cur='custom';$('mc-preset').querySelectorAll('button').forEach(x=>x.classList.remove('on'))}
    g[i]=(g[i]+1)%4;draw()});
  RD.seg($('mc-preset'),m=>{cur=m;lab=P[m].lab.slice();g=P[m].g.slice();draw()});
  $('mc-k').addEventListener('change',draw);$('mc-gain').addEventListener('change',draw);
  draw();
})();
