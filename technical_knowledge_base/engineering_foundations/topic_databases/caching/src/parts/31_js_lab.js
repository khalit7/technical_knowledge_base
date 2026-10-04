// ---- Cache lab tab: measured Redis runs and exact simulations, with a cost-weighted hit ratio ----
(function(){
  const X=window.CAEV;if(!X||!document.getElementById('lab-work'))return;
  const c1m=CA.sim.costs_ms.cheap,c2m=CA.sim.costs_ms.expensive;
  const COSTS=[0.05,0.1,c1m,0.5,1,2,5,c2m,20,50,100].sort((a,b)=>a-b);
  const $=id=>document.getElementById(id);
  $('lab-work').innerHTML=X.WORK.map(w=>'<option value="'+w[0]+'">'+w[1]+'</option>').join('');
  ['lab-c1','lab-c2'].forEach(id=>$(id).max=COSTS.length-1);$('lab-c1').value=COSTS.indexOf(c1m);$('lab-c2').value=COSTS.indexOf(c2m);
  // policies: Redis (measured) then simulations
  const P=X.POL.map(p=>({k:p[0],name:'Redis '+p[1],color:p[2],sim:0})).concat(X.SIMP.map(p=>({k:p[0],name:p[1]+' (simulated)',color:p[2],sim:1})));
  let pol='allkeys-lfu';
  const pb=$('lab-pol');
  function rec(p,w,c){return p.sim?X.sim(w,p.k,c):X.get(w,p.k,c)}
  function render(){
    const w=$('lab-work').value,cap=X.SIZES[+$('lab-cap').value],c1=COSTS[+$('lab-c1').value],c2=COSTS[+$('lab-c2').value];
    $('lab-capv').textContent=cap.toLocaleString('en-US')+' keys (about '+((CA.ev.base_bytes+cap*CA.ev.bytes_per_key)/1048576).toFixed(1)+' MB)';
    $('lab-c1v').textContent=c1<1?c1.toFixed(c1<0.1?2:3):c1.toFixed(1);$('lab-c2v').textContent=c2<1?c2.toFixed(c2<0.1?2:3):c2.toFixed(1);
    const avail=P.filter(p=>rec(p,w,X.SIZES[0]));
    if(!avail.find(p=>p.k===pol))pol=avail[0].k;
    pb.innerHTML=avail.map(p=>'<button data-k="'+p.k+'"'+(p.k===pol?' class="on"':'')+'>'+p.name+'</button>').join('');
    const p=avail.find(q=>q.k===pol),r=rec(p,w,cap);
    const cw=X.cw(r,c1,c2),e=r.exp_share,costAll=(1-e)*c1+e*c2;
    const saved=cw*costAll;
    $('lab-out').innerHTML=RD.stat('Hit ratio',(r.hit*100).toFixed(1)+'%',p.sim?'exact simulation':'measured on Redis '+CA.ev.redis)+
      RD.stat('Cost-weighted hit ratio',(cw*100).toFixed(1)+'%','share of backend work removed')+
      RD.stat('Hits on expensive keys',(r.hit_exp*100).toFixed(1)+'%','against '+(r.hit_cheap*100).toFixed(1)+'% on cheap ones')+
      RD.stat('Backend time per request','<span>'+(costAll-saved).toFixed(3)+' ms</span>','from '+costAll.toFixed(3)+' ms with no cache')+
      (p.sim?RD.stat('Keys held',cap.toLocaleString('en-US'),'exact capacity'):RD.stat('Keys Redis held',r.keys_held.toLocaleString('en-US'),r.mb+' MB limit; '+r.evicted.toLocaleString('en-US')+' evictions'+(r.set_errors?', <b style="color:var(--bad)">'+r.set_errors.toLocaleString('en-US')+' failed SETs</b>':'')));
    // chart
    const series=avail.map(q=>({name:q.name,color:q.color,dash:q.sim,pts:X.SIZES.map(c=>{const z=rec(q,w,c);return [c,z?z.hit:null]})}));
    const sel=series.find(s=>s.name===p.name);
    X.chart($('lab-svg'),series.filter(s=>s!==sel).map(s=>Object.assign({},s,{color:s.color}))
      .concat([Object.assign({},sel,{dash:0})]),{label:'Hit ratio by size for every policy'});
    $('lab-leg').innerHTML=series.map(s=>'<span style="--sw:'+s.color+'">'+s.name+'</span>').join('');
    // bars at this size
    const rows=avail.map(q=>{const z=rec(q,w,cap);return {q,h:z.hit,cw:X.cw(z,c1,c2)}}).sort((a,b)=>b.cw-a.cw);
    $('lab-bars').innerHTML=rows.map(o=>'<div class="row'+(o.q.k===pol?' hl':'')+'"><span class="nm">'+o.q.name+'</span><span class="track"><span class="fill" style="width:'+(o.h*100).toFixed(1)+'%;background:'+o.q.color+'"></span></span><span class="val">'+(o.h*100).toFixed(1)+'% / <b>'+(o.cw*100).toFixed(1)+'%</b></span></div>').join('');
  }
  pb.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;pol=b.dataset.k;render()});
  ['lab-work','lab-cap','lab-c1','lab-c2'].forEach(id=>$(id).addEventListener('input',render));
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-lab']=[render];
  addEventListener('resize',()=>{const t=$('t-lab');if(t&&!t.hidden)render()});
})();
