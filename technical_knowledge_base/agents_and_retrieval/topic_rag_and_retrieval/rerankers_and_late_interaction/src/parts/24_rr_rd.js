// ---- Reading tab (t-read), part 1: predict widgets, bi-encoder vs cross-encoder animation, token view, training table, depth chart ----
(function(){
  const R=window.RR;if(!R)return;const $=id=>document.getElementById(id),esc=RRL.esc;
  const draws=[];const reg=f=>{draws.push(f);RD.onRender(f)};RD.onResize(()=>draws.forEach(f=>{try{f()}catch(e){window.__jsErr&&window.__jsErr(e.message)}}));
  // ---------- predict widgets
  document.querySelectorAll('#t-read .prd').forEach(p=>p.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{const ok=b.dataset.k===p.dataset.ans;
    p.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.k===p.dataset.ans)x.classList.add('right')});if(!ok)b.classList.add('wrong');
    const a=p.querySelector('.ans');a.hidden=false;const v=a.querySelector('.verdict');if(v)v.textContent=ok?'Right. ':'Not quite. '})));
  // ---------- bi-encoder vs cross-encoder on one real pair
  const V=R.ce_view,tok=V.tokens,segm=V.segment;
  const SPECIAL=t=>t==='[CLS]'||t==='[SEP]';
  const qIdx=tok.map((t,i)=>i).filter(i=>segm[i]===0);
  const dIdx=tok.map((t,i)=>i).filter(i=>segm[i]===1);
  const NSHOW=56;const dShow=dIdx.slice(0,NSHOW);
  // strongest abstract targets of each claim token, special tokens excluded, only those drawn
  const links=[];qIdx.forEach((qi,k)=>{if(SPECIAL(tok[qi]))return;V.claim_to_doc_top6[k].slice(0,6).filter(x=>Array.isArray(x)&&!SPECIAL(tok[x[0]])).slice(0,2).forEach(x=>{if(dShow.includes(x[0]))links.push([qi,x[0],x[1]])})});
  const targets=new Set(links.map(l=>l[1]));
  const bi=R.bi.slice().sort((a,b)=>b.cos-a.cos),ce=R.ce_checks.slice().sort((a,b)=>b.predict-a.predict);
  const ntok=R.ce_checks.reduce((s,c)=>s+c.n_tokens,0);
  const relCE=R.ce_checks.find(c=>c.rel),relBI=R.bi.find(c=>c.rel);
  let mode='bi';
  const CAP={bi:['Two separate texts: claim 1180 and the abstract that supports it.',
    'Offline, once per corpus: the abstract goes through the encoder on its own and is summarised into one vector of 1,024 numbers (Qwen3-Embedding keeps the final state of the last token), stored before any query exists.',
    'At query time the claim goes through the same encoder on its own: one more vector.',
    'One dot product of two unit vectors: cosine '+relBI.cos.toFixed(3)+'. The model never saw the two texts together.',
    'Against the claim\'s other top-10 candidates the relevant abstract ranks '+(1+bi.findIndex(b=>b.rel))+': five near-miss abstracts about RIG-I and MDA5 have higher cosines.'],
    ce:['One input sequence: [CLS] claim [SEP] abstract [SEP], '+relCE.n_tokens+' tokens; the claim has segment id 0 (blue), the abstract 1.',
    'Every layer is self-attention over all '+relCE.n_tokens+' tokens, so claim tokens read abstract tokens directly. Lines: each claim token\'s two strongest abstract targets in the last layer (mean of 12 heads).',
    'The strongest targets are the words that matter: '+[...new Set(links.sort((a,b)=>b[2]-a[2]).map(l=>tok[l[1]]))].slice(0,6).join(', ')+'. About '+Math.round(100*V.share_to_doc_mean)+'% of a claim token\'s attention lands on the abstract.',
    'The [CLS] vector goes through dense, tanh and one linear layer: logit '+relCE.predict.toFixed(2)+'.',
    'The whole pass is repeated for every candidate: 10 passes for the top 10. The relevant abstract now ranks '+(1+ce.findIndex(c=>c.rel))+'.']};
  function chips(arr,cls){return arr.map(i=>'<span class="rr-tok '+cls+(SPECIAL(tok[i])?' sp':'')+'" data-i="'+i+'">'+esc(tok[i])+'</span>').join('')}
  function drawBE(st){const box=$('rr-be-svg');
    const showQ=mode==='ce'||st===0||st>=2,showD=true;
    let h='<div style="position:relative" id="rr-be-wrap"><div class="small mute">Claim</div><div>'+chips(qIdx,'q')+'</div>';
    if(mode==='bi'&&st>=2)h+='<div class="small" style="margin:4px 0"><b>claim vector</b> <span class="pool" style="display:inline-block;width:120px;height:10px;border-radius:3px;background:linear-gradient(90deg,var(--acc2),var(--c1));vertical-align:middle"></span></div>';
    h+='<div style="height:'+(mode==='ce'&&st>=1&&st<=2?46:14)+'px"></div><div class="small mute">Abstract (first '+NSHOW+' of '+dIdx.length+' tokens)</div><div>'+chips(dShow,'')+' <span class="small mute">...</span></div>';
    if(mode==='bi'&&st>=1)h+='<div class="small" style="margin:4px 0"><b>abstract vector (stored)</b> <span style="display:inline-block;width:120px;height:10px;border-radius:3px;background:linear-gradient(90deg,var(--open2),var(--c3));vertical-align:middle"></span></div>';
    if((mode==='bi'&&st>=3)||(mode==='ce'&&st>=3))h+='<div class="stat" style="display:inline-block;margin:6px 0"><div class="k">'+(mode==='bi'?'cosine':'cross-encoder logit')+'</div><div class="v">'+(mode==='bi'?relBI.cos.toFixed(3):relCE.predict.toFixed(2))+'</div></div>';
    if(st>=4){const L=mode==='bi'?bi.map(b=>[b.cos.toFixed(3),b.rel]):ce.map(c=>[c.predict.toFixed(2),c.rel]);
      h+='<div class="small" style="margin-top:4px">Top 10 rescored: '+L.map((x,i)=>'<span class="rr-tok'+(x[1]?' hot':'')+'">'+(i+1)+'. '+x[0]+(x[1]?' relevant':'')+'</span>').join('')+'</div>'}
    h+='<svg id="rr-be-lines" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible"></svg></div>';
    box.innerHTML=h;
    const wrap=$('rr-be-wrap');
    wrap.querySelectorAll('.rr-tok[data-i]').forEach(e=>{const i=+e.dataset.i;
      if(mode==='bi'){if((st===1&&segm[i]===1)||(st===2&&segm[i]===0))e.classList.add('hot')}
      else if(st===2&&targets.has(i))e.classList.add('hot')});
    if(mode==='ce'&&(st===1||st===2)){const svg=$('rr-be-lines'),wr=wrap.getBoundingClientRect();const mxw=Math.max(...links.map(l=>l[2]));let s='';
      links.forEach(l=>{const a=wrap.querySelector('[data-i="'+l[0]+'"]'),b=wrap.querySelector('[data-i="'+l[1]+'"]');if(!a||!b)return;const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
        s+='<line x1="'+(ra.left+ra.width/2-wr.left).toFixed(1)+'" y1="'+(ra.bottom-wr.top).toFixed(1)+'" x2="'+(rb.left+rb.width/2-wr.left).toFixed(1)+'" y2="'+(rb.top-wr.top).toFixed(1)+'" stroke="var(--c1)" stroke-opacity="'+(0.25+0.75*l[2]/mxw).toFixed(2)+'" stroke-width="1.3"/>'});svg.innerHTML=s}
    $('rr-be-cap').textContent=CAP[mode][st];
    $('rr-be-ctr').innerHTML=mode==='bi'?'<span>Model passes per query: <b>'+(st>=2?1:0)+'</b> (the claim)</span><span>Precomputed vectors: <b>5,183</b></span><span>Work per candidate: <b>'+(st>=3?'1 dot product of 1,024 numbers':'none yet')+'</b></span>'
      :'<span>Model passes per query: <b>'+(st>=4?10:1)+'</b> (one per candidate)</span><span>Tokens processed: <b>'+(st>=4?ntok.toLocaleString('en-US'):relCE.n_tokens)+'</b></span><span>Precomputed: <b>nothing</b></span>'}
  const beA=RD.anim({card:'rr-be-card',ctl:'rr-be-ctl',n:5,ms:2600,draw:drawBE,label:'Step'});
  RD.seg($('rr-be-mode'),m=>{mode=m;beA.reset(5);beA.play()});
  RD.onResize(()=>beA.redraw());
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
