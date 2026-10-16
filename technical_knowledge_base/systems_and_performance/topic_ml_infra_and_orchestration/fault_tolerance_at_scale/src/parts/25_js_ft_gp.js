// ---- Reading, Goodput accounting: badput of three measured Slurm runs (window.FT.fl.replay, from the root Failure lab) ----
(function(){
const $=id=>document.getElementById(id), E=RD.esc;
if(!$('gp-card'))return;
const P=window.FT.fl.replay;
function draw(){
  const el=$('gp-chart'),w=RD.width(el),narrow=w<560,lw=narrow?0:230,rowH=narrow?44:30;
  const mx=Math.max(...P.rows.map(r=>r.measured_s));const bw=w-lw-60;let s='';
  const rows=P.rows.map(r=>{const waste=r.redone*P.step_ms/1000;return {r,useful:P.base_s,waste,rec:r.R_s,rem:r.measured_s-P.base_s-waste-r.R_s}});
  rows.forEach((x,i)=>{const y=i*rowH+(narrow?16:4);
    s+=RD.t(narrow?2:lw-6,narrow?y-3:y+14,E(x.r.label),{fs:11.5,a:narrow?'start':'end'});
    let acc=0;[[x.useful,'var(--good)'],[x.waste,'var(--bad)'],[x.rec,'var(--c5)'],[Math.max(0,x.rem),'var(--line)']].forEach(([v,c])=>{
      s+='<rect x="'+(lw+acc/mx*bw).toFixed(1)+'" y="'+y+'" width="'+Math.max(0.5,v/mx*bw).toFixed(1)+'" height="18" fill="'+c+'"/>';acc+=v});
    s+=RD.t(lw+acc/mx*bw+4,y+14,x.r.measured_s.toFixed(1)+' s',{fs:11,fill:'var(--mute)'});
  });
  el.innerHTML=RD.svg(w,rows.length*rowH+8,s,'Wall-clock of three measured runs split into useful time, wasted progress, recovery and remainder');
  $('gp-cap').innerHTML=rows.map(x=>'<b>'+E(x.r.label)+'</b>: goodput '+(100*x.useful/x.r.measured_s).toFixed(1)+'% ('+x.useful.toFixed(1)+' s useful of '+x.r.measured_s.toFixed(1)+' s); wasted progress '+x.waste.toFixed(1)+' s ('+x.r.redone+' steps), detection and recovery '+x.rec.toFixed(1)+' s, remainder '+x.rem.toFixed(1)+' s.').join('<br>')+'<br>At this toy scale the recovery dominates and the rework is seconds; at 16,384 GPUs the same three buckets are minutes to tens of minutes each, which is the {{Recovery designs|#t-rec}} tab\'s subject.';
}
RD.onRender(draw);RD.onResize(draw);draw();RD.tabLinks($('gp-card'));
})();
