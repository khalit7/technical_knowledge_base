// ---- Scene: Fig. 3, one real candidate list reranked (renderer v2; replaces the 2D Before/after list of 2026-10-24). Every bar is a recorded score:
// the first stage's scores (RR.ex first_scores), the three cross-encoders' and ColBERT's scores for each pair (e_examples.py). Changing the claim,
// first stage, reranker or K replays the figure (a mode toggle). The readout under the step list gives the ranks, nDCG@10 and the top five. ----
(function(){
  const R0=window.RR;if(!R0||!document.getElementById('stg-rr'))return;const {at,mix,lerp,ease}=S3,$=id=>document.getElementById(id),esc=RRL.esc;
  const ORD=["rescued","hurt","disagree","multi","ceiling","maxsim-1"];R0.ex.claims.sort((a,b)=>ORD.indexOf(a.why)-ORD.indexOf(b.why));const E=R0.ex;
  const WHY={rescued:'Rescued: the relevant abstract sits deep in BM25\'s list.',hurt:'Hurt: BM25 had the relevant abstract first.',disagree:'Disagreement: on the hybrid list MiniLM pushes the relevant abstract down while Qwen3-Reranker puts it first.',
    ceiling:'Ceiling: no first stage has a relevant abstract in its top 30, so no reranker can help.',multi:'Several relevant abstracts.','maxsim-1':'Claim 1180, the pair used in sections 1 and 8.'};
  const RNM=['MiniLM-L6 CE','bge-reranker-v2-m3','Qwen3-Reranker-0.6B','ColBERT MaxSim'];
  const sel=$('rr-ba-claim');E.claims.forEach((c,i)=>{const o=document.createElement('option');o.value=i;o.textContent=c.qid+' ('+c.why+'): '+c.claim.slice(0,60)+(c.claim.length>60?'...':'');sel.appendChild(o)});
  const state=()=>({c:E.claims[+sel.value],fs:$('rr-ba-fs').querySelector('.on').dataset.m,rr:+$('rr-ba-rr').querySelector('.on').dataset.m,K:+$('rr-ba-k').value});
  const score=(c,d,rr)=>rr===3?c.docs[d].colbert:c.docs[d].s[rr];
  function ndcg(order,c){let dcg=0;order.slice(0,10).forEach((d,i)=>{if(c.docs[d].rel)dcg+=1/Math.log2(i+2)});let id=0;for(let i=0;i<Math.min(10,c.n_rel);i++)id+=1/Math.log2(i+2);return id?dcg/id:0}
  function orders(){const s=state(),L=s.c.lists[s.fs];const head=L.slice(0,s.K).slice().sort((a,b)=>score(s.c,b,s.rr)-score(s.c,a,s.rr));return {s,before:L,after:head.concat(L.slice(s.K))}}
  const N=30,XS=.38,x=i=>(i-(N-1)/2)*XS,ZB=0,ZQ=2.2,HM=1.5;
  function draw(R,k,e){const P=R.P,O=orders(),s=O.s,c=s.c,L=O.before,K=s.K;R.grid(-6.6,6.6,-1.6,2.8,.5);
    const fsS=c.first_scores&&c.first_scores[s.fs],f0=fsS?Math.min(...fsS):0,f1=fsS?Math.max(...fsS):1;
    const sc=L.slice(0,K).map(d=>score(c,d,s.rr)),lo=Math.min(...sc),hi=Math.max(...sc);
    const h1=i=>fsS?.15+HM*(fsS[i]-f0)/Math.max(1e-9,f1-f0):HM*(1-i/N),h2=d=>.15+HM*(hi>lo?(score(c,d,s.rr)-lo)/(hi-lo):1);
    const morph=k<2?0:k===2?e:1,slide=k<3?0:k===3?e:1;
    L.forEach((d,i)=>{const inK=i<K,j=O.after.indexOf(d),xx=lerp(x(i),x(j),inK?slide:0),hh=inK?lerp(h1(i),h2(d),morph):h1(i),rel=c.docs[d].rel;
      const a=!inK&&k>=1?.25:1;R.box([xx,0,ZB],[XS*.72,hh,.5],{fill:rel?P.good:mix(P.paper,P.c1,inK&&k>=2?.35:.12),a,shadow:false});
      if(rel){const r=1+(k>=3&&inK?j:i);R.label([xx,hh,ZB],'relevant · rank '+r,{fs:12.5,b:1,mono:true,dy:-12,c:P.good,a:Math.max(.5,a),grp:'rel'})}});
    (k===4?[1,10]:[1,10,20,30]).forEach(r=>R.label([x(r-1),0,ZB+.25],String(r),{fs:12,mono:true,dy:14,c:P.mute}));
    R.label([x(0)-.3,.4,ZB],k>=2?RNM[s.rr]+' score':RRL.FS[s.fs]+' score',{al:'right',dx:-6,fs:12.5,c:P.mute,wide:1});
    // the cut at K
    const ca=at(k,e,1);if(ca>0&&K<N){const xc=(x(K-1)+x(K))/2;R.glass([xc,0,ZB-.7],[0,0,1.4],[0,HM+.4,0],{c:P.c2,a:ca,nu:3,nv:4,th:.02});R.label([xc,HM+.4,ZB],'K = '+K,{fs:13,b:1,mono:true,dy:-10,c:P.c2,a:ca})}
    // the claim reads every pair in the top K
    const qa=k===2?Math.min(1,e*1.5):k===1?.4*e:k>=3?.3:0;R.ball([0,.25,ZQ],.16,{c:P.q,a:Math.max(.25,qa)});R.label([0,.25,ZQ],'claim '+c.qid,{fs:12.5,b:1,dy:22,c:P.q,a:Math.max(.5,qa)});
    if(k===2)for(let i=0;i<K;i++)R.flowArc([0,.35,ZQ],[x(i),h1(i)*(1-e)+h2(L[i])*e,ZB+.25],.6,{c:P.q,a:e*.85,n:3,r:.045,speed:1.6});
    if(k===4){const rk=o=>{const i=o.findIndex(d=>c.docs[d].rel);return i<0?'none in top 30':String(i+1)};
      R.label([x(0),HM+.55,ZB],'nDCG@10 '+ndcg(O.before,c).toFixed(3)+' → '+ndcg(O.after,c).toFixed(3),{al:'left',fs:13.5,b:1,mono:true,c:P.ink,a:e})}
  }
  function readout(){const O=orders(),s=O.s,c=s.c;$('rr-ba-kv').textContent=s.K;
    const rk=o=>{const i=o.findIndex(d=>c.docs[d].rel);return i<0?'not in top 30':String(i+1)};
    $('rr-ba-why').innerHTML='<b>Claim '+c.qid+':</b> "'+esc(c.claim)+'" '+c.n_rel+' relevant abstract'+(c.n_rel>1?'s':'')+'. '+esc(WHY[c.why]||'');
    $('rr-ba-stats').innerHTML=RD.stat('First relevant, before',rk(O.before),RRL.FS[s.fs])+RD.stat('First relevant, after',rk(O.after),RNM[s.rr]+', K '+s.K)+
      RD.stat('nDCG@10, before',ndcg(O.before,c).toFixed(3),'this claim')+RD.stat('nDCG@10, after',ndcg(O.after,c).toFixed(3),'this claim');
    const top=O.after.slice(0,5),d0=c.docs[top[0]];
    $('rr-ba-top').innerHTML='<div class="small mute">The top five after reranking (green: relevant)</div><table>'+top.map((d,i)=>'<tr class="'+(c.docs[d].rel?'rel':'')+'"><td>'+(i+1)+'</td><td title="'+esc(c.docs[d].t)+'">'+esc(c.docs[d].t)+'</td><td class="num">'+(s.rr===1?score(c,d,s.rr).toFixed(3):score(c,d,s.rr).toFixed(2))+'</td></tr>').join('')+'</table>'+
      '<div class="small" style="margin-top:4px"><b>First:</b> '+esc(d0.x)+'</div>'}
  const st=S3.stage({id:'stg-rr',list:'sx-rr',fig:'Fig. 3 · one real candidate list, reranked',cam:[.12,.5],bounds:[[-6.2,0,-.6],[6.2,2.1,2.4]],aspect:.5,dur:1500,hold:4600,draw,
    margin:w=>w<520?[14,8,12,8]:[20,16,16,120],
    view:k=>k===4?{cam:[.2,.45],bounds:[[x(0)-.4,0,-.6],[x(11),2.1,2.6]]}:null});
  readout();
  const replay=()=>{readout();if(st)st.list('sx-rr')};
  RD.seg($('rr-ba-fs'),replay);RD.seg($('rr-ba-rr'),replay);sel.addEventListener('change',replay);
  $('rr-ba-k').addEventListener('input',()=>{readout();if(st)st.draw()});$('rr-ba-k').addEventListener('change',replay);
})();
