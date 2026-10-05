// ---- Reading section 1: language share of bytes in ML-stack repositories (GitHub linguist via the REST API, fetched by read/code/repo_langs/fetch.py) ----
(function(){
  const R=window.RDD&&window.RDD.repos,el=document.getElementById('rd-repos');if(!R||!el)return;
  const LC={Python:'var(--c1)','C++':'var(--c2)',C:'var(--c5)',Cuda:'var(--c3)',Rust:'var(--c4)',TypeScript:'var(--c6)',JavaScript:'var(--dim)'};
  const ORDER=['Python','C++','C','Cuda','Rust','TypeScript','JavaScript'];
  const GN={substrate:'Engines and kernels',python_tooling_rust:'Python\'s tools',llm_apps_agents:'LLM apps and agents'};
  let grp='all';
  function draw(){
    const rows=Object.entries(R.repos).filter(([,v])=>grp==='all'||v.group===grp);
    const W=RD.width(el),barW=Math.max(140,W-(W<520?112:158));let h='',last='';
    rows.forEach(([name,v])=>{const L=v.languages;if(L.error)return;const tot=Object.values(L).reduce((a,b)=>a+b,0)||1;
      if(v.group!==last){h+='<div class="band">'+GN[v.group]+'</div>';last=v.group}
      const parts=ORDER.map(k=>[k,(L[k]||0)/tot]).filter(([,f])=>f>0.004);const other=1-parts.reduce((a,[,f])=>a+f,0);
      const top=Object.entries(L).sort((a,b)=>b[1]-a[1])[0];
      h+='<div class="row"><div class="nm" title="'+name+'">'+RD.esc(name.split('/')[1])+'<span class="ml">'+RD.esc(name.split('/')[0])+'</span></div><div class="sb" role="img" aria-label="'+RD.esc(name)+' language shares">'+
        parts.map(([k,f])=>'<span style="width:'+(f*100).toFixed(2)+'%;background:'+LC[k]+'" title="'+k+' '+(f*100).toFixed(1)+'%">'+(f*barW>(k.length+4)*6.6+10?k+' '+(f*100).toFixed(0)+'%':'')+'</span>').join('')+
        (other>0.004?'<span style="width:'+(other*100).toFixed(2)+'%;background:var(--line)" title="other '+(other*100).toFixed(1)+'%"></span>':'')+'</div></div>'});
    el.innerHTML='<div class="repobars">'+h+'</div>';
  }
  document.getElementById('rd-repo-leg').innerHTML=ORDER.map(k=>'<span style="--sw:'+LC[k]+'">'+k+'</span>').join('')+'<span style="--sw:var(--line)">other</span>';
  RD.seg(document.getElementById('rd-repo-seg'),m=>{grp=m;draw()});
  draw();RD.onResize(draw);if(window.TAB_RENDER)(window.TAB_RENDER['t-read']=window.TAB_RENDER['t-read']||[]).push(draw);
})();
