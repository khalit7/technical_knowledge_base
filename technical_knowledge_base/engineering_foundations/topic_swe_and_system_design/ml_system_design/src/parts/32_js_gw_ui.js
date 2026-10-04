// ---- Gateway lab UI (tab t-gw) ----
(function(){
  const G=window.MSD_GW;if(!document.getElementById('t-gw'))return;
  const $=id=>document.getElementById('gw-'+id);
  let P=Object.assign({},G.D,G.PRESETS.tuned);
  const opt=(sel,keys)=>{sel.innerHTML=keys.map(k=>'<option value="'+k+'">'+G.TIERS[k].name+'</option>').join('')};
  opt($('big'),['sonnet','gpt61sol']);opt($('small'),['haiku','luna','llama']);opt($('fbm'),['gpt61sol','sonnet']);
  const pct=v=>(v*100).toFixed(v<0.1&&v>0?1:0)+'%';
  const money=v=>v>=1e6?'$'+(v/1e6).toFixed(2)+'M':v>=1e3?'$'+(v/1e3).toFixed(0)+'k':'$'+v.toFixed(0);
  const sec=v=>v<1?Math.round(v*1000)+' ms':v.toFixed(2)+' s';
  function sync(){
    $('rps').value=P.rps;$('easy').value=P.easy;$('tin').value=String(P.tin);$('tout').value=String(P.tout);
    $('big').value=P.big;$('small').value=P.small;$('router').checked=P.router;$('acc').value=P.router_acc;
    $('exact').value=P.exact;$('prefix').value=P.prefix;$('sem').checked=P.sem;$('semhit').value=P.sem_hit;$('semfalse').value=P.sem_false;
    $('outage').value=P.outage;$('fb').checked=P.fallback;$('fbm').value=P.fb;$('det').value=P.detect_s}
  function read(){
    P.rps=+$('rps').value;P.easy=+$('easy').value;P.tin=+$('tin').value;P.tout=+$('tout').value;P.big=$('big').value;P.small=$('small').value;
    P.router=$('router').checked;P.router_acc=+$('acc').value;P.exact=+$('exact').value;P.prefix=+$('prefix').value;P.sem=$('sem').checked;
    P.sem_hit=+$('semhit').value;P.sem_false=+$('semfalse').value;P.outage=+$('outage').value;P.fallback=$('fb').checked;P.fb=$('fbm').value;P.detect_s=+$('det').value}
  const COL={exact:'var(--c3)',sem:'var(--c6)',small:'var(--c1)',big:'var(--c4)',fb:'var(--c5)',err:'var(--bad)'};
  const LAB={exact:'exact cache',sem:'semantic cache',small:'small model',big:'large model',fb:'fallback provider',err:'error'};
  function bar(el,leg,parts){const tot=parts.reduce((s,p)=>s+p[1],0)||1;
    el.innerHTML=parts.filter(p=>p[1]>0).map(p=>'<span style="width:'+(100*p[1]/tot)+'%;background:'+p[2]+'" title="'+p[0]+'"></span>').join('');
    leg.innerHTML=parts.map(p=>'<span><i style="background:'+p[2]+'"></i>'+p[0]+' '+(100*p[1]/tot).toFixed(1)+'%</span>').join('')}
  function render(){
    ['rps','easy','acc','exact','prefix','semhit','semfalse','outage','det'].forEach(k=>{const v=+$(k).value,o=$(k+'-v');if(!o)return;
      o.textContent=k==='rps'?Math.round(v).toLocaleString('en-US'):k==='det'?v.toFixed(1)+' s':pct(v)});
    $('acc').disabled=!P.router;$('semhit').disabled=!P.sem;$('semfalse').disabled=!P.sem;$('fbm').disabled=!P.fallback;
    const r=G.run(P),b=G.run(Object.assign({},P,G.PRESETS.naive));// naive and healthy: same traffic, everything to the large model, no caches, no outage
    $('out').innerHTML=
      RD.stat('Cost per 1,000 requests','$'+r.per_k.toFixed(2),Math.abs(r.per_k-b.per_k)>1e-9?((r.per_k-b.per_k)/b.per_k*100).toFixed(0)+'% vs naive, healthy ($'+b.per_k.toFixed(2)+')':'the naive baseline')+
      RD.stat('Per month',money(r.monthly),'at the average rate, 730 hours')+
      RD.stat('Mean time to first token',sec(r.ttft),'naive '+sec(b.ttft))+
      RD.stat('Mean full response',sec(r.full),'naive '+sec(b.full))+
      RD.stat('Errors',pct(r.err),r.err>0?'requests that fail outright':'none')+
      RD.stat('Worse or wrong answers',pct(r.wrong),'semantic false hits + hard requests sent small');
    const s=r.share;bar($('bar'),$('leg'),['exact','sem','small','big','fb','err'].map(k=>[LAB[k],s[k],COL[k]]));
    const pp=r.parts;bar($('cbar'),$('cleg'),[['small model',s.small*pp.cS,COL.small],['large model',s.big*pp.cB,COL.big],['fallback provider',s.fb*pp.cF,COL.fb]]);
  }
  ['rps','easy','acc','exact','prefix','semhit','semfalse','outage','det'].forEach(k=>$(k).addEventListener('input',()=>{read();clearPre();render()}));
  ['tin','tout','big','small','router','sem','fb','fbm'].forEach(k=>$(k).addEventListener('change',()=>{read();clearPre();render()}));
  const pre=document.getElementById('gw-pre');
  function clearPre(){pre.querySelectorAll('button').forEach(b=>b.classList.remove('on'))}
  pre.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;clearPre();b.classList.add('on');
    P=Object.assign({},G.D,G.PRESETS[b.dataset.p]);sync();render()});
  sync();render();
})();
