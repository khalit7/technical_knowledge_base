// ---- Launch lab: section 5 environment-variable explorer (real dumps from every rank) ----
(function(){
  const H=window.LA_H,D=window.LA;if(!H||!D||!D.env)return;const {$,esc}=H;
  const st={sys:'slurm',rank:0};
  const WHO={sched:['scheduler','var(--c1)'],torchrun:['torchrun','var(--c2)'],ray:['Ray Train','var(--c4)'],script:['the job script','var(--c5)'],image:['the image','var(--mute)'],k8s:['Kubernetes','var(--c1)'],lab:['this lab','var(--mute)']};
  function rankBtns(){const el=$('la-env-rank'),rs=D.env[st.sys]||[];
    el.innerHTML=rs.map((r,i)=>'<button data-m="'+i+'"'+(i===st.rank?' class="on"':'')+'>rank '+r.rank+' ('+esc(r.host)+')</button>').join('')}
  function draw(){
    const rs=D.env[st.sys]||[],r=rs[st.rank];const el=$('la-env');if(!r){el.innerHTML='';return}
    const ED=st.sys==='ray'?D.envdoc_ray:D.envdoc;
    const keys=Object.keys(r.vars).sort((a,b)=>{const da=ED[a],db=ED[b];const oa=da?da[2]:99,ob=db?db[2]:99;return oa-ob||a.localeCompare(b)});
    let h='<div class="row hd"><span>variable</span><span>set by</span><span class="ex">value, and what it means</span></div>';
    keys.forEach(k=>{const v=r.vars[k],doc=ED[k]||['image','',99],w=WHO[doc[0]]||WHO.image;
      const diff=rs.some(o=>o.vars[k]!==v);
      h+='<div class="row'+(diff?' diff':'')+'"><code>'+esc(k)+'</code><span class="who" style="color:'+w[1]+';border-color:'+w[1]+'">'+w[0]+'</span><span class="ex"><code>'+esc(v)+'</code>'+(doc[1]?' : '+doc[1]:'')+'</span></div>'});
    el.innerHTML=h;
    $('la-env-note').innerHTML=esc(D.envnote[st.sys]||'')+(r.n_env?' '+r.n_env+' variables in this process in all; '+keys.length+' shown.':' '+keys.length+' variables shown (those with launch-related prefixes).');
  }
  function init(){if(!$('la-env-card'))return;
    H.seg($('la-env-sys'),m=>{st.sys=m;st.rank=0;rankBtns();draw()});
    H.seg($('la-env-rank'),m=>{st.rank=+m;draw()});
    rankBtns();draw();}
  init();
})();
