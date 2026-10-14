// ---- Vector search lab: the 2-D map of real embeddings (PCA vs t-SNE) ----
(function(){
  const V=window.VEC,D=V.D.proj,$=V.$,esc=V.esc;
  const COL={s:'var(--c1)',n:'var(--c2)',h:'var(--c3)',p:'var(--c4)',c:'var(--ink)'};
  const NAME={s:'SciFact abstract',n:'NFCorpus document',h:'HotpotQA paragraph (Wikipedia)',p:'QASPER chunk (NLP paper)',c:'SciFact test claim (query)'};
  const pts=D.points,claims=D.claims;
  let proj='pca',ci=0,W=0,H=0,built=false;
  const sel=$('vec-map-q');
  sel.innerHTML=claims.map((c,i)=>'<option value="'+i+'">'+esc(c.text)+'</option>').join('');
  const xy=(p,pr)=>pr==='pca'?p.p:p.e;
  function sx(v){return 14+(v+1)/2*(W-28)} function sy(v){return 14+(1-(v+1)/2)*(H-28)}
  function build(){
    const el=$('vec-map');W=V.width(el);H=Math.round(Math.min(Math.max(W*0.78,Math.min(W*1.05,340)),470));
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="2-D projection of 705 real embedding vectors">';
    s+='<rect x="0" y="0" width="'+W+'" height="'+H+'" fill="none" stroke="var(--line)"/>';
    s+='<g id="vec-map-lines"></g>';
    pts.forEach((p,i)=>{const q=xy(p,proj);
      s+='<circle data-i="'+i+'" r="'+(p.s==='c'?5.5:3)+'" style="cx:'+sx(q[0]).toFixed(1)+'px;cy:'+sy(q[1]).toFixed(1)+'px" fill="'+COL[p.s]+'" fill-opacity="'+(p.s==='c'?1:.55)+'"></circle>'});
    s+='</svg><div class="vec-tip" hidden id="vec-map-tip"></div>';
    el.innerHTML=s;built=true;
    const svg=el.querySelector('svg'),tip=$('vec-map-tip');
    function show(e){const c=e.target.closest('circle');if(!c){tip.hidden=true;return}const p=pts[+c.dataset.i];
      tip.hidden=false;tip.innerHTML='<b>'+esc(NAME[p.s])+'</b><br>'+esc(p.t);
      const r=el.getBoundingClientRect(),cx=(e.clientX||0)-r.left,cy=(e.clientY||0)-r.top;
      tip.style.left=Math.max(0,Math.min(W-260,cx+10))+'px';tip.style.top=Math.max(0,cy+12)+'px'}
    svg.addEventListener('mousemove',show);svg.addEventListener('click',show);svg.addEventListener('mouseleave',()=>{tip.hidden=true});
    style();
  }
  function place(){const el=$('vec-map');el.querySelectorAll('circle[data-i]').forEach(c=>{const q=xy(pts[+c.dataset.i],proj);c.style.cx=sx(q[0]).toFixed(1)+'px';c.style.cy=sy(q[1]).toFixed(1)+'px'});lines()}
  function lines(){const g=$('vec-map-lines');if(!g)return;const c=claims[ci],q=xy(pts[c.i],proj);
    g.innerHTML=c.true.map(j=>{const p=xy(pts[j],proj);return '<line x1="'+sx(q[0]).toFixed(1)+'" y1="'+sy(q[1]).toFixed(1)+'" x2="'+sx(p[0]).toFixed(1)+'" y2="'+sy(p[1]).toFixed(1)+'" stroke="var(--mute)" stroke-dasharray="3 3" stroke-width="1"/>'}).join('');
    // lines are not animated: redraw them after the move
  }
  function style(){
    const c=claims[ci],T=new Set(c.true),R=new Set(c.rel);
    $('vec-map').querySelectorAll('circle[data-i]').forEach(el=>{const i=+el.dataset.i,p=pts[i];
      let r=p.s==='c'?5.5:3,st='none',sw=0,op=p.s==='c'?1:.5;
      if(i===c.i){r=8;st='var(--acc)';sw=3}
      else if(p.s==='c'){op=.3}
      if(T.has(i)){r=5.2;st='var(--ink)';sw=1.6;op=.95}
      if(R.has(i)){el.setAttribute('fill','var(--good)');r=6.2;st='var(--ink)';sw=2;op=1}else el.setAttribute('fill',COL[p.s]);
      el.setAttribute('r',r);el.setAttribute('stroke',st);el.setAttribute('stroke-width',sw);el.setAttribute('fill-opacity',op)});
    // bring highlighted points to the front
    const svg=$('vec-map').querySelector('svg');[...c.true,...c.rel,c.i].forEach(i=>{const e=svg.querySelector('circle[data-i="'+i+'"]');if(e)svg.appendChild(e)});
    lines();stats();
  }
  function stats(){
    const c=claims[ci],k=proj==='pca'?c.kept_pca:c.kept_tsne;
    $('vec-map-stats').innerHTML=
      '<div class="stat"><div class="k">Points</div><div class="v">'+D.n+'</div><div class="d">'+D.dims.toLocaleString('en-US')+' dims each</div></div>'+
      '<div class="stat"><div class="k">Variance kept by 2 PCA axes</div><div class="v">'+V.pc(D.pca_var2)+'</div><div class="d">50 axes: '+V.pc(D.pca_var50)+'</div></div>'+
      '<div class="stat"><div class="k">Trustworthiness at 10 <span class="vec-lbl m">measured</span></div><div class="v">'+D[proj==='pca'?'trust_pca':'trust_tsne'].toFixed(2)+'</div><div class="d">PCA '+D.trust_pca.toFixed(2)+', t-SNE '+D.trust_tsne.toFixed(2)+' (1 = no false neighbours)</div></div>'+
      '<div class="stat"><div class="k">This claim: true top 10 among its 10 nearest dots</div><div class="v">'+k+' of 10</div><div class="d">'+(proj==='pca'?'PCA':'t-SNE')+' map</div></div>';
    $('vec-map-note').innerHTML='Cosines of this claim to its 10 true neighbours: '+c.cos[0].toFixed(3)+' (nearest) to '+c.cos[9].toFixed(3)+' (10th). Median cosine of the six claims to the sampled texts of each corpus: '+
      Object.entries(D.median_claim_cos).map(([k,v])=>({scifact:'SciFact',nfcorpus:'NFCorpus',hotpotqa:'HotpotQA',qasper:'QASPER'})[k]+' '+v.toFixed(3)).join(', ')+
      '. Sample: every claim\'s true top 10 plus 160 random texts per corpus (seed 0). t-SNE: scikit-learn '+esc(D.tsne.sklearn)+', perplexity '+D.tsne.perplexity+', cosine, PCA initialisation, seed 0.';
  }
  const pr=$('vec-map-pr-ans');
  pr.innerHTML='On PCA, '+claims.map(c=>c.kept_pca).join(', ')+' of 10 for the six claims; on t-SNE, '+claims.map(c=>c.kept_tsne).join(', ')+'. Two straight axes keep only '+V.pc(D.pca_var2)+' of the variance, so neighbours in 1,024 dimensions scatter across the PCA map. t-SNE is built to keep each point\'s neighbourhood and does, but it distorts everything else: distances between clusters and cluster sizes on a t-SNE map mean nothing.';
  $('vec-map-warn').innerHTML='Both maps are of the same '+D.n+' vectors. PCA keeps '+V.pc(D.pca_var2)+' of the variance and puts most true neighbours far from their claim (trustworthiness '+D.trust_pca.toFixed(2)+'); t-SNE keeps neighbourhoods (trustworthiness '+D.trust_tsne.toFixed(2)+') by bending global geometry, so the gaps between its clusters are not distances.';
  $('vec-map-leg').innerHTML=['s','n','h','p','c'].map(k=>'<span><i style="background:'+COL[k]+'"></i>'+esc(NAME[k])+'</span>').join('')+'<span><i style="background:var(--good)"></i>relevant abstract</span><span>ring = true top 10</span>';
  V.seg($('vec-map-proj'),v=>{proj=v;place();setTimeout(lines,950);stats()});
  $('vec-map-morph').addEventListener('click',()=>{const b=$('vec-map-proj').querySelector('button[data-v="'+(proj==='pca'?'tsne':'pca')+'"]');b.click()});
  sel.addEventListener('change',()=>{ci=+sel.value;style()});
  V.predict($('vec-map-pr'));
  V.onRender(()=>{const w=V.width($('vec-map'));if(!built||Math.abs(w-W)>8)build()});
})();
