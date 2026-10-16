// ---- Scheduling lab, sections 5 to 7: the Kubernetes gang and borrowing runs, the Ray placement groups ----
// Each run is a list of steps prepared by src/sched/scripts/parse_k8s_ray.py from the recorded kubectl output:
// {t (s since start), cap (caption, HTML), nodes: {worker: pod or null, ...}, jobs: [[name, status, kind]]}
(function(){
  const $=SC.$,D=window.SC_DATA;if(!D||!D.k1)return;
  const NODES=[['worker','worker'],['worker2','worker2'],['worker3','worker3']];
  const JC={'sc-a':'var(--c1)','sc-b':'var(--c2)','sc-c':'var(--c3)','sc-a1':'var(--c1)','sc-a2':'var(--c1)','sc-a3':'var(--c1)','sc-b1':'var(--c2)','team a':'var(--c1)','team b':'var(--c2)'};
  const KC={run:'var(--good)',wait:'var(--bad)',queue:'var(--mute)',done:'var(--acc)',pend:'var(--bad)'};
  function draw(box,st){
    const W=SC.width(box),narrow=W<520,nw=narrow?(W-16)/3:Math.min(190,(W-40)/3),gx=narrow?8:16,H=90;
    let b='';NODES.forEach(([k,lab],i)=>{const x0=gx/2+i*(nw+gx/2+(narrow?0:6));
      b+=SC.rect(x0,6,nw-4,78,'var(--soft)',{stroke:'var(--line)',rx:6})+SC.t(x0+6,20,lab,{fs:11,w:600});
      const p=st.nodes[k];for(let g=0;g<4;g++){const cx=x0+6+g*((nw-16)/4);b+=SC.rect(cx,28,(nw-16)/4-3,24,p?JC[p.js]||'var(--c4)':'var(--bg)',{stroke:'var(--line)',rx:3,op:p&&p.idle?0.5:1})}
      b+=SC.t(x0+(nw-4)/2,72,p?(p.label+(p.idle?' (idle)':'')):'4 fake GPUs free',{a:'middle',fs:10.5,fill:p?'var(--ink)':'var(--mute)'})});
    box.innerHTML=SC.svg(W,H,b,'Cluster state')+'<div class="sc-jobs">'+st.jobs.map(([n,s,k])=>'<div><i style="background:'+(JC[n]||'var(--c4)')+'"></i><b>'+n+'</b>: <span style="color:'+(KC[k]||'var(--ink)')+'">'+s+'</span></div>').join('')+'</div>';
  }
  function player(card,svg,ctl,cap,seq){let steps=seq();
    const an=SC.anim({card,ctl,n:steps.length,ms:1700,label:'Event',draw:i=>{const s=steps[i];draw($(svg),s);$(cap).innerHTML='<b class="t">'+(s.t!=null?'t = '+s.t+' s. ':'')+'</b>'+s.cap}});
    return {an,set(f){seq=f;steps=seq();an.reset(steps.length);an.go(0)}}}
  if($('sc-gang-card')){let mode='k1';
    const p=player('sc-gang-card','sc-gang-svg','sc-gang-ctl','sc-gang-cap',()=>D[mode].steps);
    SC.seg($('sc-gang-mode'),m=>{mode=m;p.set(()=>D[mode].steps)})}
  if($('sc-bor-card')&&D.k3)player('sc-bor-card','sc-bor-svg','sc-bor-ctl','sc-bor-cap',()=>D.k3.steps);
  // Ray placement groups: a table of the recorded placements
  if($('sc-ray-out')&&D.ray){let h='<div class="tw"><table><thead><tr><th>Placement group</th><th>Strategy</th><th class="num">bundles</th><th>State after waiting</th><th>Bundle i on node</th></tr></thead><tbody>';
    D.ray.forEach(r=>{h+='<tr><td><code>'+SC.esc(r.name)+'</code>'+(r.note?' <span class="small mute">('+SC.esc(r.note)+')</span>':'')+'</td><td>'+r.strategy+'</td><td class="num">'+r.n+'</td><td'+(r.ready?'':' style="color:var(--bad);font-weight:600"')+'>'+r.state+'</td><td>'+r.nodes.map(n=>n||'&ndash;').join(', ')+'</td></tr>'});
    $('sc-ray-out').innerHTML=h+'</tbody></table></div>'}
})();
