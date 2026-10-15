// Classifier replay (t-qctr): reference examples, top words, logit strip of run0, token-level pushes of one document
(function(){
  const Q=window.QC, T=Q&&Q.tr; if(!T)return;
  const $=id=>document.getElementById(id), esc=RD.esc, f2=x=>(Math.abs(x)>=100?x.toFixed(0):Math.abs(x)>=10?x.toFixed(1):x.toFixed(2));
  const sm=$('tr-mod'), sd=$('tr-doc');
  sm.innerHTML=T.models.map(m=>'<option value="'+m.key+'">'+esc(m.label)+'</option>').join('');
  sd.innerHTML=T.docs.map(d=>'<option value="'+d.key+'">'+esc(d.label)+'</option>').join('');
  const col=v=>{const a=Math.min(1,Math.abs(v)/Q.ex_scale);return v>=0?'rgba(63,160,90,'+(0.12+0.6*a).toFixed(2)+')':'rgba(214,100,60,'+(0.12+0.6*a).toFixed(2)+')'};
  function strip(m,di){
    const el=$('tr-strip'),W=Math.min(RD.width(el),860),H=86,L=10,R=10,iw=W-L-R;
    const lg=T.logits[m.key];let lo=Infinity,hi=-Infinity;lg.forEach(v=>{if(v<lo)lo=v;if(v>hi)hi=v});lo=Math.min(lo,m.cut_logit-1);hi=Math.max(hi,m.cut_logit+1);
    const x=v=>L+(v-lo)/(hi-lo)*iw;let g='';
    lg.forEach(v=>{g+='<line x1="'+x(v).toFixed(1)+'" x2="'+x(v).toFixed(1)+'" y1="24" y2="52" stroke="'+(v>=m.cut_logit?'var(--good)':'var(--bad)')+'" stroke-opacity=".28"/>'});
    g+='<line x1="'+x(m.cut_logit)+'" x2="'+x(m.cut_logit)+'" y1="14" y2="62" stroke="var(--ink)" stroke-dasharray="4 3"/>';
    const kept=lg.filter(v=>v>=m.cut_logit).length;
    g+=RD.t(Math.min(W-R,x(m.cut_logit)+4),14,'cut: '+kept+' kept',{fs:11});
    const dv=lg[di];g+='<line x1="'+x(dv)+'" x2="'+x(dv)+'" y1="8" y2="68" stroke="var(--acc)" stroke-width="3"/>';
    const ticks=[];for(let t=Math.ceil(lo/5)*5;t<=hi;t+=5)ticks.push(t);ticks.forEach(t=>g+=RD.t(x(t),82,t,{a:'middle',fs:10.5,fill:'var(--mute)'}));
    el.innerHTML=RD.svg(W,H,g,'Logits of all run0 documents with the cut');
  }
  function render(){
    const m=T.models.find(x=>x.key===sm.value), d=T.docs.find(x=>x.key===sd.value), e=Q.ex[d.key][m.key];
    $('tr-desc').innerHTML=m.desc;
    $('tr-ref').innerHTML=m.refs.map(r=>'<div class="tr-ref">'+esc(r)+'</div>').join('');
    $('tr-words').innerHTML='<div><b class="pos">toward high quality</b><span></span></div><div><b class="neg">toward crawl</b><span></span></div>'+
      m.top.map((t,i)=>{const b=m.bot[i]||['',0];return '<div><b class="pos" title="'+esc(t[0])+'">'+esc(t[0])+'</b><span>'+f2(t[1])+'</span></div><div><b class="neg" title="'+esc(b[0])+'">'+esc(b[0])+'</b><span>'+f2(b[1])+'</span></div>'}).join('');
    strip(m,d.i);
    $('tr-out').innerHTML=RD.stat('Features',(e.nU+e.nB).toLocaleString('en-GB'),e.nU+' words, '+e.nB+' bigrams')+RD.stat('Logit',f2(e.logit),'cut '+f2(m.cut_logit))+
      RD.stat('P(high quality)',e.p<0.001?e.p.toExponential(1):e.p.toFixed(3),'<b style="color:'+(e.logit>=m.cut_logit?'var(--good)">kept':'var(--bad)">dropped')+'</b>')+RD.stat('Hand label',d.lab||'not labelled',d.labnote||'');
    let h='';e.toks.forEach((t,k)=>{const u=e.uni[k],v=(u===null?0:u)+e.big[k];h+='<span title="'+(u===null?'not in vocabulary':'word '+f2(u))+', bigram share '+f2(e.big[k])+'" style="background:'+col(v)+(u===null?';color:var(--mute)':'')+'">'+esc(t)+'</span>'});
    if(e.more)h+='<span class="mute"> ... '+e.more+' more tokens</span>';
    $('tr-text').innerHTML=h;
  }
  sm.addEventListener('change',render);sd.addEventListener('change',render);
  RD.onTab('t-qctr',render);RD.onResize(render,'t-qctr');render();
})();
