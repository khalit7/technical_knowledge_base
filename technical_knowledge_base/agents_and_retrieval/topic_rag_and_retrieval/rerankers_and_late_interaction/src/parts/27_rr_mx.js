// ---- Reading section 8 (moved from the MaxSim lab tab, 2026-10-24): one claim and one abstract, token by token, against the single-vector cosine ----
(function(){
  const R=window.RR;if(!R)return;const $=id=>document.getElementById(id),esc=RRL.esc;
  const sel=$('rr-mx-pair');R.mx.forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent='Claim '+p.qid+': '+p.claim.slice(0,50)+(p.claim.length>50?'...':'');sel.appendChild(o)});
  let mode='maxsim';
  const P=()=>R.mx[+sel.value];const useMask=()=>$('rr-mx-mask').checked;
  const qlist=()=>P().qtok.map((t,i)=>i).filter(i=>useMask()||P().qtok[i]!=='[MASK]');
  function nsteps(){return mode==='single'?4:qlist().length+2}
  const SCAP=['Two texts, encoded separately. A single-vector model turns the whole abstract into one vector (Qwen3-Embedding keeps the final state of its last token). Tokens shown are ColBERT\'s, for comparison.','The claim becomes one vector the same way.','One cosine for the pair; token-level matches are averaged away.','Rescoring the claim\'s top 10 by cosine: the relevant abstract is not first.'];
  function draw(st){const p=P(),ql=qlist();const box=$('rr-mx-q'),db=$('rr-mx-d');
    let cur=-1,done=[];if(mode==='maxsim'&&st>=1&&st<=ql.length){cur=ql[st-1];done=ql.slice(0,st-1)}else if(mode==='maxsim'&&st>ql.length)done=ql;
    box.innerHTML=p.qtok.map((t,i)=>'<span class="tk'+(t==='[MASK]'?' mask':'')+(i===cur?' cur':'')+(done.includes(i)?' done':'')+'"'+(mode==='single'&&st>=1?' style="background:color-mix(in srgb,var(--c1) 30%,var(--bg))"':'')+'>'+esc(t)+'</span>').join('');
    let row=null,lo=0,hi=1;if(cur>=0){row=p.sim[cur];lo=Math.min(...row);hi=Math.max(...row)}
    db.innerHTML=p.dtok.map((t,j)=>{let st2='';if(row){const a=(row[j]-lo)/Math.max(1,hi-lo);st2=' style="background:color-mix(in srgb,var(--c1) '+Math.round(5+85*a*a)+'%,var(--bg))"'}else if(mode==='single'&&st>=0)st2=' style="background:color-mix(in srgb,var(--c3) 22%,var(--bg))"';
      return '<span class="tk'+(row&&j===p.best[cur]?' best':'')+'"'+st2+(row?' title="'+(row[j]/100).toFixed(2)+'"':'')+'>'+esc(t)+'</span>'}).join('');
    const sum=done.reduce((s,i)=>s+p.best_sim[i],0)+(cur>=0?p.best_sim[cur]:0);
    const relC=p.cands.find(c=>c.rel);
    if(mode==='maxsim'){$('rr-mx-stats').innerHTML=RD.stat('Running MaxSim',sum.toFixed(2),(done.length+(cur>=0?1:0))+' of '+ql.length+' claim tokens')+RD.stat('This token\'s best',cur>=0?esc(p.dtok[p.best[cur]])+' '+p.best_sim[cur].toFixed(2):'-',cur>=0?'for "'+esc(p.qtok[cur])+'"':'');
      $('rr-mx-cap').textContent=st===0?'Each claim token will scan all '+p.dtok.length+' abstract token vectors for its highest dot product.':cur>=0?('"'+p.qtok[cur]+'" scans the abstract: its best match is "'+p.dtok[p.best[cur]]+'" at '+p.best_sim[cur].toFixed(2)+(p.qtok[cur]==='[MASK]'?'. An expansion token: it matches something generic in every abstract, so it adds almost the same amount to every candidate.':'.')):
        'Sum of the maxima: '+sum.toFixed(2)+'. Rescoring the claim\'s top 10 the same way puts the relevant abstract '+(1+rank('maxsim'))+(useMask()?'':' (expansion tokens left out)')+'.'}
    else{$('rr-mx-stats').innerHTML=RD.stat('Cosine',st>=2?relC.cos.toFixed(3):'-','one vector each')+RD.stat('Dot products','1','for the pair');$('rr-mx-cap').textContent=SCAP[st]}
    const showRank=(mode==='single'&&st>=3)||(mode==='maxsim'&&st>ql.length);
    if(showRank){const k=mode==='single'?'cos':(useMask()?'maxsim':'maxsim_real');const L=p.cands.slice().sort((a,b)=>b[k]-a[k]);
      $('rr-mx-rank').innerHTML='<tr><th>#</th><th>abstract</th><th class="num">'+(mode==='single'?'cosine':'MaxSim')+'</th></tr>'+L.map((c,i)=>'<tr class="'+(c.rel?'rel':'')+'"><td>'+(i+1)+'</td><td>'+esc(c.title.slice(0,44))+(c.title.length>44?'...':'')+'</td><td class="num">'+c[k].toFixed(mode==='single'?3:2)+'</td></tr>').join('')}
    else $('rr-mx-rank').innerHTML='<tr><td class="small mute">The ranking of the claim\'s top 10 appears at the last step.</td></tr>'}
  function rank(m){const p=P(),k=m==='maxsim'?(useMask()?'maxsim':'maxsim_real'):'cos';return p.cands.slice().sort((a,b)=>b[k]-a[k]).findIndex(c=>c.rel)}
  const A=RD.anim({card:'rr-mx-card',ctl:'rr-mx-ctl',n:nsteps(),ms:900,draw,label:'Step'});
  const reset=()=>{A.reset(nsteps())};
  RD.seg($('rr-mx-mode'),m=>{mode=m;reset()});sel.addEventListener('change',reset);$('rr-mx-mask').addEventListener('change',reset);
})();
