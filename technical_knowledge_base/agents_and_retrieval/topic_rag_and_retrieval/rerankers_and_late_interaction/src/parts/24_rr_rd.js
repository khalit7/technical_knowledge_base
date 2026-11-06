// ---- Reading tab (t-read), part 1: predict widgets, token view, training table, depth chart (the bi-encoder against cross-encoder figure is the 3D scene 31_sc_be.js) ----
(function(){
  const R=window.RR;if(!R)return;const $=id=>document.getElementById(id),esc=RRL.esc;
  const draws=[];const reg=f=>{draws.push(f);RD.onRender(f)};RD.onResize(()=>draws.forEach(f=>{try{f()}catch(e){window.__jsErr&&window.__jsErr(e.message)}}));
  // ---------- predict widgets
  document.querySelectorAll('#t-read .prd').forEach(p=>p.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{const ok=b.dataset.k===p.dataset.ans;
    p.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.k===p.dataset.ans)x.classList.add('right')});if(!ok)b.classList.add('wrong');
    const a=p.querySelector('.ans');a.hidden=false;const v=a.querySelector('.verdict');if(v)v.textContent=ok?'Right. ':'Not quite. '})));
  const tok=R.ce_view.tokens,segm=R.ce_view.segment,SPECIAL=t=>t==='[CLS]'||t==='[SEP]';
  // ---------- what the cross-encoder sees
  reg(()=>{const el=$('rr-tokview');el.innerHTML=tok.slice(0,60).map((t,i)=>'<span class="rr-tok'+(segm[i]===0?' q':'')+(SPECIAL(t)?' sp':'')+'">'+esc(t)+'</span>').join('')+' <span class="small mute">... '+(tok.length-60)+' more</span>'});
  // ---------- tiny training run
  reg(()=>{const el=$('rr-train');const T=R.train;if(!T||!T.runs){el.innerHTML='<span class="small mute">Run pending.</span>';return}
    const rows=[['zero-shot','Released MS MARCO model (no SciFact training)'],['random','+ SciFact train, random negatives'],['hard','+ SciFact train, BM25 hard negatives']];
    let h='<div class="tw"><table><thead><tr><th>Model</th><th class="num">nDCG@10, BM25 top 30</th><th class="num">nDCG@10, hybrid top 30</th><th class="num">Seeds</th></tr></thead><tbody>';
    rows.forEach(([v,lab])=>{const rs=T.runs.filter(r=>r.variant===v);if(!rs.length)return;const m=f=>rs.reduce((s,r)=>s+r[f],0)/rs.length;
      const sp=f=>rs.length>1?' <span class="mute small">('+rs.map(r=>r[f].toFixed(3)).join(', ')+')</span>':'';
      h+='<tr><td>'+lab+'</td><td class="num">'+m('bm25').toFixed(3)+sp('bm25')+'</td><td class="num">'+m('hybrid').toFixed(3)+sp('hybrid')+'</td><td class="num">'+(rs[0].seed===null?'n/a':rs.length)+'</td></tr>'});
    el.innerHTML=h+'</tbody></table></div>'+'<p class="small mute">First stages alone: BM25 '+R.depth.first.bm25.ndcg10.toFixed(3)+', hybrid '+R.depth.first.hybrid.ndcg10.toFixed(3)+'.</p>'});
  // ---------- depth chart
  const RN=['ce-minilm-l6','bge-reranker-v2-m3','qwen3-reranker-0.6b'];
  function depth(){const fs=$('rr-depth-fs').querySelector('.on').dataset.m,el=$('rr-depth-svg');const D=R.depth;
    const ser=RN.map(n=>({name:RRL.NM[n],color:RRL.C[n],pts:Object.entries(D.sweep[fs][n]).map(([k,v])=>[+k,v.ndcg10,RRL.NM[n]+', K '+k+': nDCG@10 '+v.ndcg10.toFixed(3)+', '+v.win+' claims better, '+v.loss+' worse'])}));
    const cb=R.colbert_rerank[fs];ser.push({name:'ColBERT MaxSim',color:RRL.C.colbert,dash:true,pts:[[1,cb.first_ndcg10,'first stage']].concat(Object.entries(cb.sweep).map(([k,v])=>[+k,v.ndcg10,'ColBERT, K '+k+': '+v.ndcg10.toFixed(3)]))});
    ser.push({name:'first-stage recall@K',color:'var(--mute)',dash:true,dots:false,pts:Object.entries(D.first[fs].recallK).filter(([k])=>+k>=3).map(([k,v])=>[+k,v])});
    RRL.chart(el,ser,{xlog:true,x0:1,x1:100,y0:0.66,y1:1.0,xticks:[1,3,10,30,100],xfmt:v=>String(v),yticks:[0.7,0.75,0.8,0.85,0.9,0.95,1.0],yfmt:v=>v.toFixed(2),xlabel:'rerank depth K',ylabel:'nDCG@10 (lines), recall@K (grey)',hlines:[[D.first[fs].ndcg10,RRL.FS[fs]+' alone '+D.first[fs].ndcg10.toFixed(3)]]});
    RRL.legend($('rr-depth-leg'),ser.map(s=>[s.name,s.color,s.dash]))}
  reg(depth);RD.seg($('rr-depth-fs'),depth);
})();
