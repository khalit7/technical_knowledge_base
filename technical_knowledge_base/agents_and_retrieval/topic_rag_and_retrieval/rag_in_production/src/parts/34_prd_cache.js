// ---- Semantic cache replay (Reading, section 8): semantic cache replay over SciFact claims ----
(function(){
if(!document.getElementById('prc-card'))return;
const P=window.PRD,C=P.cache,esc=RD.esc,$=id=>document.getElementById(id);
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
const KINDS=[['same','same verdict (right)','--c3'],['nei_same_doc','no verdict, same abstract','--c6'],['opposite','opposite verdict (wrong)','--c2'],['unrelated','unrelated (wrong)','--c4']];
function row(m,t){return C.models[m].answer_cache.find(r=>Math.abs(r.t-t)<1e-6)}
function draw(){
  const m=$('prc-m').value,t=+$('prc-t').value,r=row(m,t),n=C.n_claims;$('prc-tv').textContent=t.toFixed(2);
  const wrong=r.opposite+r.unrelated;
  $('prc-out').innerHTML=RD.stat('Served from cache',r.hits+' of '+n,(100*r.hits/n).toFixed(1)+'% of claims')+
    RD.stat('Opposite verdict',r.opposite,r.hits?(100*r.opposite/r.hits).toFixed(0)+'% of hits':'')+
    RD.stat('Same verdict',r.same,r.hits?(100*r.same/r.hits).toFixed(0)+'% of hits':'')+
    RD.stat('Wrong answers served',wrong,r.hits?(100*wrong/r.hits).toFixed(0)+'% of hits (opposite + unrelated)':'');
  $('prc-bar').innerHTML=r.hits?KINDS.map(k=>r[k[0]]?'<span style="width:'+(100*r[k[0]]/r.hits)+'%;background:var('+k[2]+')" title="'+k[1]+'">'+(r[k[0]]/r.hits>0.08?r[k[0]]:'')+'</span>':'').join(''):'<span style="width:100%;color:var(--mute)">no hits</span>';
  $('prc-leg').innerHTML=KINDS.map(k=>'<span><svg width="10" height="10"><rect width="10" height="10" fill="'+css(k[2])+'"/></svg>'+k[1]+'</span>').join('');
  // curve: hits by kind vs threshold (stacked area)
  const host=$('prc-curve'),W=RD.width(host),H=200,x0=40,x1=W-10,y0=10,y1=H-32,rows=C.models[m].answer_cache;
  const mx=Math.max(...rows.map(x=>x.hits)),X=v=>x0+(v-0.5)/0.5*(x1-x0),Y=v=>y1-v/mx*(y1-y0);let g='';
  [0,Math.round(mx/2),mx].forEach(v=>{g+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="'+css('--line')+'"/>'+RD.t(x0-4,Y(v)+4,v,{a:'end',fs:10,fill:css('--mute')})});
  let base=rows.map(()=>0);
  KINDS.forEach(k=>{const top=rows.map((x,i)=>base[i]+x[k[0]]);let d='';
    rows.forEach((x,i)=>d+=(i?'L':'M')+X(x.t).toFixed(1)+','+Y(top[i]).toFixed(1));
    for(let i=rows.length-1;i>=0;i--)d+='L'+X(rows[i].t).toFixed(1)+','+Y(base[i]).toFixed(1);
    g+='<path d="'+d+'Z" fill="'+css(k[2])+'" fill-opacity=".85"/>';base=top});
  g+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+y0+'" y2="'+y1+'" stroke="'+css('--ink')+'" stroke-dasharray="3 3"/>';
  [0.5,0.6,0.7,0.8,0.9,1.0].forEach(v=>g+=RD.t(X(v),y1+13,v.toFixed(1),{a:'middle',fs:10,fill:css('--mute')}));
  g+=RD.t((x0+x1)/2,y1+27,'threshold (claims served from cache, by kind of hit)',{a:'middle',fs:10.5,fill:css('--mute')});
  host.innerHTML=RD.svg(W,H,g,'Cache hits by kind against threshold');
  const rc=C.models[m].result_cache,rr=rc.rows.find(x=>Math.abs(x.t-t)<1e-6);
  $('prc-rc').innerHTML=RD.stat('nDCG@10 without cache',rc.ndcg_no_cache.toFixed(3),rc.n_test+' test claims')+RD.stat('nDCG@10 with result cache',rr.ndcg.toFixed(3),rr.hits+' served from cache')+
    RD.stat('Hits with a worse list',rr.hits_worse,'')+RD.stat('Hits with a better list',rr.hits_better,'');
  const vc=v=>v==='SUPPORT'?'sup':'con';
  $('prc-ex').innerHTML=C.models[m].examples.map(e=>'<div class="prc-ex"><div><span class="v '+vc(e.cached_v)+'">cached, '+esc(e.cached_v.toLowerCase())+':</span> '+esc(e.cached)+'</div><div><span class="v '+vc(e.new_v)+'">new, '+esc(e.new_v.toLowerCase())+':</span> '+esc(e.new)+'</div><div class="small mute">cosine '+e.sim.toFixed(3)+(e.sim>=t?': served from cache at this threshold, with the wrong verdict':': below this threshold')+'</div></div>').join('');
}
$('prc-m').addEventListener('change',draw);$('prc-t').addEventListener('input',draw);
RD.onRender(draw);RD.onResize(draw);draw();
})();
