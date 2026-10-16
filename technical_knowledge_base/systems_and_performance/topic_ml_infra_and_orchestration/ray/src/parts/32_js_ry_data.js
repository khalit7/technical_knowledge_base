// ---- Ray child page: Ray Data pipeline tab (t-data) ----
(function(){
const Y=window.RY,E=RD.esc,$=id=>document.getElementById(id),U=window.RYU,f2=U.f2;
const reg=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-data']=window.TAB_RENDER['t-data']||[]).push(f)};
const vis=()=>{const t=$('t-data');return t&&!t.hidden};
const COL={encode:'var(--c1)',window:'var(--c3)',train:'var(--c5)'};
const NAME={streaming:'Streaming, fused: encode and window in one task per block',pipelined:'Streaming, two operators: window asks for 0.5 CPU, so it is not fused',staged:'Staged: materialize() after encode, then window'};
let mode='streaming';
const T=()=>Math.max(...['streaming','pipelined','staged'].map(m=>Y.data[m].total))+0.3;
function lanes(d){const ws=[...new Set(d.blocks.filter(b=>b.st!=='train').map(b=>b.h+' pid '+b.p))].sort();return ws.concat(['driver: training loop'])}
function draw(i){
  const el=$('ry-dp');if(!el)return;const d=Y.data[mode];const w=RD.width(el);const now=i/10;const TT=T();
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
  let c='<b>t = '+(Math.min(now,TT)).toFixed(1)+' s.</b> Blocks encoded '+enc+' of 24, windowed '+win+' of 24, training batches done '+tr+' of '+d.batches+'.';
  if(now>=d.first)c+=' First batch reached the training loop at <b>'+f2(d.first)+' s</b>.';
  if(d.materialized&&now>=d.materialized)c+=' materialize() returned at '+f2(d.materialized)+' s (red line): only then did window start.';
  if(now>=d.total)c+=' All done at <b>'+f2(d.total)+' s</b>.';
  $('ry-dp-cap').innerHTML=c;
}
const anim=RD.anim({card:'ry-dp-card',ctl:'ry-dp-ctl',n:Math.ceil(T()*10)+1,draw:draw,ms:90,label:'Time'});
function setMode(m){mode=m;$('ry-dp-title').innerHTML=E(NAME[m])+' <span class="ry-meas">measured</span>';anim.reset(Math.ceil(T()*10)+1);anim.play()}
RD.seg($('ry-dp-mode'),setMode);
$('ry-dp-leg').innerHTML=['encode','window','train'].map(k=>'<span><i style="background:'+COL[k]+'"></i>'+(k==='train'?'training step (driver)':k)+'</span>').join('')+'<span>dashed: first batch and end</span>';
function statics(){
  $('ry-dp-title').innerHTML=E(NAME[mode])+' <span class="ry-meas">measured</span>';
  const D=Y.data;
  $('ry-dp-stats').innerHTML=['streaming','pipelined','staged'].map(m=>RD.stat({streaming:'Fused',pipelined:'Two operators',staged:'Staged'}[m],f2(D[m].first)+' s to first batch','total '+f2(D[m].total)+' s; '+D[m].ops.reduce((a,o)=>a+o.tasks,0)+' tasks')).join('');
  $('ry-dp-ops').querySelector('tbody').innerHTML=['streaming','pipelined','staged'].map(m=>D[m].ops.map((o,j)=>'<tr><td>'+(j?'':({streaming:'Fused',pipelined:'Two operators',staged:'Staged'}[m]))+'</td><td><code>'+E(o.name)+'</code></td><td class="num">'+o.tasks+'</td><td class="num">'+o.secs.toFixed(2)+' s</td></tr>').join('')).join('');
}
function all(){if(!vis())return;statics();draw(anim.i)}
reg(all);addEventListener('resize',()=>{clearTimeout(all.t);all.t=setTimeout(all,80)});
statics();
})();
