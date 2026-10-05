// ---- CPU budget lab tab: the measured grid of torch threads x DataLoader workers under three quotas ----
(function(){
  const $=id=>document.getElementById(id);if(!$('sc-b-hm'))return;
  const G=window.SC_DATA.grid,f=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const med=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
  const TS=[1,2,4,5],WS=[0,1,2,4];let q=1,metric='med',sel=null;
  const val=(c,m)=>m==='med'?c.med:m==='thr'?(c.per?c.thr/c.per:0):m==='wait'?c.wait:c.inv;
  const fmt=(v,m)=>m==='med'?f(v,1):m==='inv'?f(v):f(v*100)+'%';
  const runs=(T,W)=>G.filter(c=>c.q===q&&c.T===T&&c.W===W).sort((a,b)=>a.rep-b.rep);
  function draw(){const cells={};TS.forEach(T=>WS.forEach(W=>{const r=runs(T,W);if(r.length)cells[T+'_'+W]=med(r.map(c=>val(c,metric)))}));
    const vs=Object.values(cells),lo=Math.min(...vs),hi=Math.max(...vs);
    const col=v=>{let t;if(metric==='med')t=(Math.log(v)-Math.log(lo))/Math.max(1e-9,Math.log(hi)-Math.log(lo));else t=hi>lo?(v-lo)/(hi-lo):0;const h=130-120*t;return 'hsla('+h.toFixed(0)+',62%,48%,.38)'};
    let h='<thead><tr><th class="mh">torch threads ↓ / workers →</th>'+WS.map(W=>'<th>'+W+(W===0?'<small>main process decodes</small>':'<small>worker'+(W>1?'s':'')+'</small>')+'</th>').join('')+'</tr></thead><tbody>';
    TS.forEach(T=>{h+='<tr><th class="mh">'+T+(T===5?' <small>PyTorch default here</small>':'')+'</th>'+WS.map(W=>{const k=T+'_'+W,v=cells[k];
      return v==null?'<td class="na">n/a</td>':'<td class="v'+(sel===k?' on':'')+'" data-k="'+k+'" tabindex="0" role="button" aria-label="threads '+T+', workers '+W+'" style="background:'+col(v)+'">'+fmt(v,metric)+'</td>'}).join('')+'</tr>'});
    $('sc-b-hm').innerHTML=h+'</tbody>';
    $('sc-b-leg').innerHTML='<span>green: best in this quota; red: worst'+(metric==='med'?' (log scale)':'')+'</span><span>click a cell for every repeat</span>';
    detail()}
  function detail(){if(!sel){$('sc-b-det').innerHTML='';return}const [T,W]=sel.split('_').map(Number),r=runs(T,W);
    $('sc-b-det').innerHTML='<div class="tw"><table class="tbl-sm"><caption class="small mute" style="text-align:left">quota '+q+' CPU'+(q>1?'s':'')+', '+T+' thread'+(T>1?'s':'')+', '+W+' worker'+(W===1?'':'s')+': each repeat</caption><thead><tr><th>repeat</th><th class="num">VM load</th><th class="num">median step, ms</th><th class="num">slowest step, ms</th><th class="num">waiting for data</th><th class="num">throttled / periods</th><th class="num">throttled, ms</th><th class="num">CPU used, ms</th><th class="num">involuntary (main)</th></tr></thead><tbody>'+
      r.map(c=>'<tr><td>'+c.rep+'</td><td class="num">'+f(c.load,2)+'</td><td class="num">'+f(c.med,1)+'</td><td class="num">'+f(c.max,1)+'</td><td class="num">'+f(c.wait*100)+'%</td><td class="num">'+c.thr+' / '+c.per+'</td><td class="num">'+f(c.thr_ms)+'</td><td class="num">'+f(c.use_ms)+'</td><td class="num">'+f(c.inv)+'</td></tr>').join('')+'</tbody></table></div>'}
  $('sc-b-hm').addEventListener('click',e=>{const td=e.target.closest('td.v');if(!td)return;sel=sel===td.dataset.k?null:td.dataset.k;draw()});
  $('sc-b-hm').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('td.v')){e.preventDefault();e.target.click()}});
  RD.seg($('sc-b-q'),m=>{q=+m;draw()});RD.seg($('sc-b-m'),m=>{metric=m;draw()});
  // findings, computed from the grid
  const qs=[...new Set(G.map(c=>c.q))].sort((a,b)=>a-b),cellM=(qq,T,W)=>med(G.filter(c=>c.q===qq&&c.T===T&&c.W===W).map(c=>c.med));
  const best=qq=>{let b=null;TS.forEach(T=>WS.forEach(W=>{const v=cellM(qq,T,W);if(!b||v<b.v)b={T,W,v}}));return b};
  const worst=qq=>{let b=null;TS.forEach(T=>WS.forEach(W=>{const v=cellM(qq,T,W);if(!b||v>b.v)b={T,W,v}}));return b};
  $('sc-b-find').innerHTML='<ul class="tight">'+qs.map(qq=>{const b=best(qq),w=worst(qq),d=cellM(qq,5,2);
    return '<li><b>'+qq+' CPU'+(qq>1?'s':'')+':</b> best '+b.T+' thread'+(b.T>1?'s':'')+' and '+b.W+' worker'+(b.W===1?'':'s')+' at '+f(b.v,1)+' ms per step; worst '+w.T+' threads and '+w.W+' worker'+(w.W===1?'':'s')+' at '+f(w.v,1)+' ms ('+f(w.v/b.v,1)+'×); the default 5 threads with 2 workers '+f(d,1)+' ms.</li>'}).join('')+
    '<li><b>The pattern:</b> the fastest cells keep compute threads plus busy workers near the quota; every configuration with more busy threads than the quota was throttled in nearly every period (switch the metric to "periods throttled"), and its main thread was preempted far more often (switch the metric to involuntary switches).</li>'+
    '<li><b>With 0 workers</b> the main thread decodes every batch itself (waiting for data half the step or more); workers remove that wait only if there is quota left to run them.</li></ul>';
  const b1=best(1);$('sc-b-ans').innerHTML='With one CPU of quota the best was '+b1.T+' thread'+(b1.T>1?'s':'')+' and no workers ('+f(b1.v,1)+' ms). Workers are more busy threads competing for the same 100 ms per period; on a single CPU they cannot overlap with anything, so they only add throttling and switching.';
  $('sc-b-load').textContent=[...new Map(G.map(c=>[c.rep+'/'+c.q,c])).values()].map(c=>'repeat '+c.rep+', quota '+c.q+': '+f(c.load,2)).join('; ');
  document.querySelectorAll('#t-budget .drill').forEach(d=>{const bs=[...d.querySelectorAll('.ch button')],ans=d.querySelector('.ans');
    bs.forEach(b=>b.addEventListener('click',()=>{bs.forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.ok)x.classList.add('right')});if(!b.dataset.ok)b.classList.add('wrong');ans.hidden=false}))});
  draw();
})();
