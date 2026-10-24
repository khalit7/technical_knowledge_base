// ---- Reading section 9: needle grids of graded replies (SVG, one cell per call; tap for the reply) ----
(function(){
const card=document.getElementById('hnr-card');if(!card)return;
const H=window.HCTX,E=RD.esc,$=id=>document.getElementById(id);
const fmt=n=>Math.round(n).toLocaleString('en-US');
const DATA={haiku:H.needle_haiku,local:H.needle_local};
const TN={lit:'Literal',nolit:'Non-literal',track:'Tracking',know:'Knowledge check'};
let cur='haiku',sel=null;
function grid(){
  const D=DATA[cur],el=$('hnr-grid');
  if(!D||!D.rows.length){el.innerHTML='<p class="mute">No results for this model.</p>';$('hnr-note').textContent='';return}
  const R=D.rows.filter(r=>r.task!=='know');
  const lens=[...new Set(R.map(r=>r.target))].sort((a,b)=>a-b);
  const tok=t=>{const x=R.filter(r=>r.target===t&&r.input_tokens).map(r=>r.input_tokens);return x.length?Math.round(x.reduce((a,b)=>a+b,0)/x.length):null};
  const rows=[];
  ['lit','nolit'].forEach(t=>{rows.push({head:TN[t]+' needle, by depth'});[...new Set(R.filter(r=>r.task===t).map(r=>r.depth))].sort((a,b)=>a-b).forEach(d=>rows.push({lab:'depth '+Math.round(d*100)+'%',find:r=>r.task===t&&r.depth===d}))});
  rows.push({head:'Tracking, by seed'});
  [...new Set(R.filter(r=>r.task==='track').map(r=>r.id.split('_s')[1]))].sort((a,b)=>a-b).forEach(s=>rows.push({lab:'seed '+s,find:r=>r.task==='track'&&r.id.endsWith('_s'+s)}));
  const W=RD.width(el),lw=W<520?78:110,cw=Math.min(90,(W-lw-4)/lens.length),rh=19,hh=34;
  let g='',y=hh;
  lens.forEach((L,j)=>{const x=lw+j*cw+cw/2;g+=RD.t(x,14,tok(L)?fmt(tok(L)):'',{fs:11,a:'middle',w:600})+RD.t(x,28,'tokens',{fs:11,a:'middle',fill:'var(--mute)'})});
  rows.forEach(rd=>{
    if(rd.head){g+=RD.t(2,y+14,E(rd.head),{fs:11.5,w:600});y+=20;return}
    g+=RD.t(lw-6,y+rh/2+4,E(rd.lab),{fs:11,a:'end',fill:'var(--mute)'});
    lens.forEach((L,j)=>{const r=R.find(x=>x.target===L&&rd.find(x)),x=lw+j*cw+2;
      if(!r){g+='<rect x="'+x+'" y="'+(y+1)+'" width="'+(cw-4)+'" height="'+(rh-3)+'" rx="3" fill="var(--soft)"/>';return}
      g+='<g data-id="'+E(r.id)+'" style="cursor:pointer"><rect x="'+x+'" y="'+(y+1)+'" width="'+(cw-4)+'" height="'+(rh-3)+'" rx="3" fill="'+(r.ok?'var(--good)':'var(--bad)')+'"'+(sel===r.id?' stroke="var(--ink)" stroke-width="2"':'')+'><title>'+E(r.id)+'</title></rect>'+RD.t(x+(cw-4)/2,y+rh/2+4,r.ok?'&#10003;':'&#10007;',{fs:11,a:'middle',fill:'var(--bg)',w:600})+'</g>'});
    y+=rh});
  el.innerHTML=RD.svg(W,y+4,g,'Needle results: one cell per call, rows by task and depth or seed, columns by haystack length');
  const kn=D.rows.find(r=>r.task==='know'),T=['lit','nolit','track'].map(t=>{const x=R.filter(r=>r.task===t);return TN[t]+' '+x.filter(r=>r.ok).length+' of '+x.length}).join(', ');
  $('hnr-note').innerHTML='Green right, red wrong; columns are haystack lengths (mean measured prompt tokens). '+T+'. '+(kn?'Knowledge check with no haystack ("In which city is the Semperoper?"): '+(kn.ok?'answered Dresden':'wrong: '+E(kn.reply.slice(0,60)))+'.':'');
}
$('hnr-grid').addEventListener('click',e=>{const gEl=e.target.closest('g[data-id]');if(!gEl)return;sel=gEl.dataset.id;
  const r=DATA[cur].rows.find(x=>x.id===sel);grid();
  $('hnr-rep').innerHTML='<b>'+E(TN[r.task])+', '+fmt(r.input_tokens||0)+' tokens'+(r.depth!=null?', depth '+Math.round(r.depth*100)+'%':'')+'.</b> Expected: '+E(r.answer)+(r.values_in_order?' (assignments in order: '+r.values_in_order.join(', ')+')':'')+(r.final!=null?'; graded answer: '+E(r.final):'')+(r.listed?'; the reply listed '+r.listed+' of the 5 assignments':'')+'\nReply: '+E(r.reply||'(none)')});
RD.seg($('hnr-model'),m=>{cur=m;sel=null;grid();$('hnr-rep').textContent='Tap a cell to read the model\'s reply.'});
grid();RD.onRender(grid);RD.onResize(grid);
})();
