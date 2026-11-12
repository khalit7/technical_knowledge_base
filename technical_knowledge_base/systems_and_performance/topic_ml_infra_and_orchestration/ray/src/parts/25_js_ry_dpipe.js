// ---- Ray child page: Reading, Ray Data block timeline (moved from its tab, 2026-10-24) ----
(function(){
const Y=window.RY,E=RD.esc,$=id=>document.getElementById(id),U=window.RYU,f2=U.f2;
const reg=f=>{RD.onRender(f);RD.onResize(f)};
const vis=()=>{const t=$('t-read');return t&&!t.hidden};
const COL={encode:'var(--c1)',window:'var(--c3)',train:'var(--c5)'};
const NAME={streaming:'Streaming, fused: encode and window in one task per block',pipelined:'Streaming, two operators: window asks for 0.5 CPU, so it is not fused',staged:'Staged: materialize() after encode, then window'};
let mode='streaming';
const T=()=>Math.max(...['streaming','pipelined','staged'].map(m=>Y.data[m].total))+0.3;
function lanes(d){const ws=[...new Set(d.blocks.filter(b=>b.st!=='train').map(b=>b.h+' pid '+b.p))].sort();return ws.concat(['driver: training loop'])}
// stretches (2026-11-06 long-replay rule): each step sweeps the run's clock from the previous boundary to its own; the boundaries come
// from the run's blocks (window.RY_DPB, checked against the step lists): first task, first batch (staged: materialize first), last block, end
function bounds(m){const d=Y.data[m],w=d.blocks.filter(b=>b.st!=='train'),w0=Math.min(...w.map(b=>b.s)),lw=Math.max(...w.map(b=>b.e));
  return m==='staged'?[w0,d.materialized,d.first,d.total]:[w0,d.first,lw,d.total]}
window.RY_DPB=bounds;
let cur=0,sweep=1,raf=0;
function frame(){const B=bounds(mode),t0=cur?B[cur-1]:0;drawAt(t0+(B[cur]-t0)*sweep)}
function draw(i){const fwd=i===cur+1&&$('ry-dp-card').classList.contains('rd-fwd');cur=i;cancelAnimationFrame(raf);
  if(!fwd||RD.RM){sweep=1;frame();return}
  const s0=performance.now();sweep=0;const go=now=>{sweep=Math.min(1,(now-s0)/2000);frame();if(sweep<1)raf=requestAnimationFrame(go)};raf=requestAnimationFrame(go)}
function drawAt(now){
  const el=$('ry-dp');if(!el)return;const d=Y.data[mode];const w=RD.width(el);const TT=T();
  const ls=lanes(d);const L=Math.min(130,w*0.32),R=8,top=8,lh=22,H=top+ls.length*lh+30;const sx=t=>L+(w-L-R)*t/TT;
  let s='';
  for(let k=0;k<=TT;k+=1){s+='<line x1="'+sx(k)+'" y1="'+top+'" x2="'+sx(k)+'" y2="'+(H-24)+'" stroke="var(--line)"/>';if(k%2===0)s+=RD.t(sx(k),H-10,k+' s',{fs:10,a:'middle',fill:'var(--mute)'})}
  ls.forEach((ln,k)=>{const host=ln.split(' ')[0];s+=RD.t(L-5,top+k*lh+15,E(ln),{fs:10.5,a:'end',fill:U.NODE_COL[host]||'var(--mute)'})});
  d.blocks.forEach(b=>{if(b.s>now)return;const ln=b.st==='train'?'driver: training loop':b.h+' pid '+b.p;const k=ls.indexOf(ln);const e=Math.min(b.e,now);
    s+='<rect x="'+sx(b.s)+'" y="'+(top+k*lh+3)+'" width="'+Math.max(1,sx(e)-sx(b.s)-0.5)+'" height="'+(lh-7)+'" rx="2" fill="'+COL[b.st]+'" opacity="'+(e<b.e?0.55:0.9)+'"/>'});
  [['first',d.first,'first batch'],['total',d.total,'done']].forEach(([k,v,l])=>{if(now>=v){s+='<line x1="'+sx(v)+'" y1="'+top+'" x2="'+sx(v)+'" y2="'+(H-24)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'}});
  if(d.materialized&&now>=d.materialized)s+='<line x1="'+sx(d.materialized)+'" y1="'+top+'" x2="'+sx(d.materialized)+'" y2="'+(H-24)+'" stroke="var(--bad)" stroke-dasharray="5 3"/>';
  s+='<line x1="'+sx(Math.min(now,TT))+'" y1="'+top+'" x2="'+sx(Math.min(now,TT))+'" y2="'+(H-24)+'" stroke="var(--acc)" stroke-width="1.5"/>';
  el.innerHTML=RD.svg(w,H,s,'Every block of the pipeline on the workers timeline');
  const enc=d.blocks.filter(b=>b.st==='encode'&&b.e<=now).length,win=d.blocks.filter(b=>b.st==='window'&&b.e<=now).length,tr=d.blocks.filter(b=>b.st==='train'&&b.e<=now).length;
  $('ry-dp-live').innerHTML='<b>t = '+(Math.min(now,TT)).toFixed(2)+' s.</b> Blocks encoded '+enc+' of 24, windowed '+win+' of 24, training batches '+tr+' of '+d.batches+'.';
}
const anim=RD.anim({card:'ry-dp-card',ctl:'ry-dp-ctl',n:4,draw:draw,ms:4400,label:'Stretch of the run',list:'sx-dp-streaming'});
function setMode(m){mode=m;cur=0;$('ry-dp-title').innerHTML=E(NAME[m])+' <span class="ry-meas">measured</span>';document.querySelectorAll('.sx-dp').forEach(l=>l.hidden=l.id!=='sx-dp-'+m);anim.reset(bounds(m).length,'sx-dp-'+m)}
RD.seg($('ry-dp-mode'),setMode);
$('ry-dp-leg').innerHTML=['encode','window','train'].map(k=>'<span><i style="background:'+COL[k]+'"></i>'+(k==='train'?'training step (driver)':k)+'</span>').join('')+'<span>dashed: first batch and end</span>';
function statics(){
  $('ry-dp-title').innerHTML=E(NAME[mode])+' <span class="ry-meas">measured</span>';
  const D=Y.data;
  if($('ry-dp-stats'))$('ry-dp-stats').innerHTML=['streaming','pipelined','staged'].map(m=>RD.stat({streaming:'Fused',pipelined:'Two operators',staged:'Staged'}[m],f2(D[m].first)+' s to first batch','total '+f2(D[m].total)+' s; '+D[m].ops.reduce((a,o)=>a+o.tasks,0)+' tasks')).join('');
  $('ry-dp-ops').querySelector('tbody').innerHTML=['streaming','pipelined','staged'].map(m=>D[m].ops.map((o,j)=>'<tr><td>'+(j?'':({streaming:'Fused',pipelined:'Two operators',staged:'Staged'}[m]))+'</td><td><code>'+E(o.name)+'</code></td><td class="num">'+o.tasks+'</td><td class="num">'+o.secs.toFixed(2)+' s</td></tr>').join('')).join('');
}
function all(){if(!vis())return;statics();frame()}
reg(all);
statics();
})();
