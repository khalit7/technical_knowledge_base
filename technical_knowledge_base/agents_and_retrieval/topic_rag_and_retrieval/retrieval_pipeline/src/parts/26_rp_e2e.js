// ---- Reading section 9: 188 SciFact claims as squares, coloured by the stage that lost the evidence (root lab's e2e run, window.RPE)
(function(){
  const $=id=>document.getElementById(id);const R=window.RPE;if(!$('rp-e2e-w')||!R)return;
  const st={K:'rr30',k:'3'};
  const COL={right:'var(--good)',gen:'var(--c5)',rank:'var(--c4)',ret:'var(--bad)'};
  const NAME={right:'answered right and cited',gen:'lost at generation (in the prompt, answered wrongly)',rank:'lost at ranking (in the top K, not the top k)',ret:'lost at retrieval (not in the top K)'};
  function draw(){
    const c=st.K==='first'?R.conds['first@'+st.k]:R.conds[st.K+'@'+st.k];if(!c)return;
    const n=c.n,b={right:c.correct_strict,gen:c.in_k-c.correct_strict,rank:c.in_K-c.in_k,ret:n-c.in_K};
    const el=$('rp-e2e-w'),W=Math.min(860,RD.width(el)),sz=W<520?12:15,gp=2,cols=Math.max(10,Math.floor((W+gp)/(sz+gp))),rows=Math.ceil(n/cols);
    let h='',j=0;['right','gen','rank','ret'].forEach(k=>{for(let i=0;i<b[k];i++,j++)h+='<rect x="'+(j%cols)*(sz+gp)+'" y="'+Math.floor(j/cols)*(sz+gp)+'" width="'+sz+'" height="'+sz+'" rx="2" fill="'+COL[k]+'"><title>'+NAME[k]+'</title></rect>'});
    el.innerHTML=RD.svg(cols*(sz+gp),Math.max(80,rows*(sz+gp)),h,'One square per claim, coloured by the stage that lost its evidence');
    $('rp-e2e-leg').innerHTML=['right','gen','rank','ret'].map(k=>'<span><i style="background:'+COL[k]+'"></i>'+NAME[k]+': <b>'+b[k]+'</b></span>').join('');
    const r=c.in_K/n,p=c.in_K?c.in_k/c.in_K:0,g=c.in_k?c.correct_strict/c.in_k:0,fails=n-c.correct_strict;
    $('rp-e2e-cap').innerHTML=(st.K==='first'?'First stage only, top '+c.k+' to the prompt':'Rerank the top '+c.K+', keep '+c.k)+
      ': r = '+c.in_K+'/'+n+' = '+r.toFixed(3)+', p = '+c.in_k+'/'+c.in_K+' = '+p.toFixed(3)+', g = '+c.correct_strict+'/'+c.in_k+' = '+g.toFixed(3)+
      ', A = '+(c.correct_strict/n).toFixed(3)+'. Of '+fails+' failures, '+b.gen+' are at generation. Ceiling with gold abstracts only (oracle): '+R.oracle.strict+' of '+n+'.';
  }
  RD.seg($('rp-e2e-K'),m=>{st.K=m;draw()});RD.seg($('rp-e2e-k'),m=>{st.k=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
