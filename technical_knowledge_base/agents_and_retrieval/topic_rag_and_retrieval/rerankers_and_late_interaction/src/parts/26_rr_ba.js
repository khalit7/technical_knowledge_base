// ---- Reading section 4 (moved from the Before/after lab tab, 2026-10-24): one real candidate list, reranked; rows slide to their new places when the reader presses After ----
(function(){
  const R=window.RR;if(!R)return;const ORD=["rescued","hurt","disagree","multi","ceiling","maxsim-1"];R.ex.claims.sort((a,b)=>ORD.indexOf(a.why)-ORD.indexOf(b.why));const E=R.ex,$=id=>document.getElementById(id),esc=RRL.esc;
  const WHY={rescued:'Rescued: the relevant abstract sits deep in BM25\'s list.',hurt:'Hurt: BM25 had the relevant abstract first.',disagree:'Disagreement: on the hybrid list MiniLM pushes the relevant abstract down while Qwen3-Reranker puts it first.',
    ceiling:'Ceiling: no first stage has a relevant abstract in its top 30, so no reranker can help.',multi:'Several relevant abstracts.','maxsim-1':'Claim 1180, the pair used in sections 1 and 8.'};
  const sel=$('rr-ba-claim');E.claims.forEach((c,i)=>{const o=document.createElement('option');o.value=i;o.textContent=c.qid+' ('+c.why+'): '+c.claim.slice(0,60)+(c.claim.length>60?'...':'');sel.appendChild(o)});
  const RH=28;let phase='before';
  const RNM=['MiniLM-L6 CE','bge-reranker-v2-m3','Qwen3-Reranker-0.6B','ColBERT MaxSim'];
  const st=()=>({c:E.claims[+sel.value],fs:$('rr-ba-fs').querySelector('.on').dataset.m,rr:+$('rr-ba-rr').querySelector('.on').dataset.m,K:+$('rr-ba-k').value});
  const score=(c,d,rr)=>rr===3?c.docs[d].colbert:c.docs[d].s[rr];
  function ndcg(order,c){let dcg=0;order.slice(0,10).forEach((d,i)=>{if(c.docs[d].rel)dcg+=1/Math.log2(i+2)});let id=0;for(let i=0;i<Math.min(10,c.n_rel);i++)id+=1/Math.log2(i+2);return id?dcg/id:0}
  function orders(){const s=st(),L=s.c.lists[s.fs];const head=L.slice(0,s.K).slice().sort((a,b)=>score(s.c,b,s.rr)-score(s.c,a,s.rr));return {s,before:L,after:head.concat(L.slice(s.K))}}
  let built='';
  function draw(){const O=orders(),s=O.s,c=s.c,L=O.before;$('rr-ba-kv').textContent=s.K;
    const key=sel.value+'|'+s.fs;const box=$('rr-ba-list');
    if(built!==key){built=key;box.style.height=(L.length*RH+4)+'px';
      box.innerHTML=L.map(d=>'<div class="row'+(c.docs[d].rel?' rel':'')+'" data-d="'+d+'"><span class="rk"></span><span class="tt">'+esc(c.docs[d].t)+'</span><span class="bar"><i></i><b></b></span></div>').join('')+'<div class="cut"></div>';
      box.querySelectorAll('.row').forEach(r=>r.addEventListener('click',()=>{const d=c.docs[r.dataset.d];$('rr-ba-snip').innerHTML='<b>'+esc(d.t)+'</b> '+(d.rel?'<span class="meas">relevant</span> ':'')+esc(d.x)}))}
    const ord=phase==='after'?O.after:O.before;const sc=L.slice(0,s.K).map(d=>score(c,d,s.rr));const lo=Math.min(...sc),hi=Math.max(...sc);
    box.querySelectorAll('.row').forEach(r=>{const d=r.dataset.d,i=ord.indexOf(d);r.style.transform='translateY('+(i*RH)+'px)';r.querySelector('.rk').textContent=i+1;
      const inK=L.indexOf(d)<s.K;r.classList.toggle('out',!inK);const v=score(c,d,s.rr);
      r.querySelector('.bar i').style.width=inK?(hi>lo?(8+92*(v-lo)/(hi-lo)):100).toFixed(1)+'%':'0';r.querySelector('.bar b').textContent=inK?(s.rr===1?v.toFixed(3):v.toFixed(2)):''});
    box.querySelector('.cut').style.transform='translateY('+(s.K*RH)+'px)';
    const rk=o=>{const i=o.findIndex(d=>c.docs[d].rel);return i<0?'not in top 30':String(i+1)};
    $('rr-ba-why').innerHTML='<b>Claim '+c.qid+':</b> "'+esc(c.claim)+'" '+c.n_rel+' relevant abstract'+(c.n_rel>1?'s':'')+'. '+esc(WHY[c.why]||'');
    $('rr-ba-stats').innerHTML=RD.stat('First relevant, before',rk(O.before),RRL.FS[s.fs])+RD.stat('First relevant, after',rk(O.after),RNM[s.rr]+', K '+s.K)+
      RD.stat('nDCG@10, before',ndcg(O.before,c).toFixed(3),'this claim')+RD.stat('nDCG@10, after',ndcg(O.after,c).toFixed(3),'this claim')}
  // a new claim, first stage or reranker starts again from Before; nothing moves until the reader presses After
  function go(){phase='before';$('rr-ba-ph').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m==='before'));draw()}
  RD.seg($('rr-ba-ph'),m=>{phase=m;draw()});RD.seg($('rr-ba-fs'),go);RD.seg($('rr-ba-rr'),go);
  sel.addEventListener('change',go);$('rr-ba-k').addEventListener('input',draw);
  RD.onRender(draw);
  draw();
})();
