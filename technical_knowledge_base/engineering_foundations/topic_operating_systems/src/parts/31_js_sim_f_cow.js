// ---- OS simulators, 3: copy-on-write after fork (page grid animation and the real smaps_rollup count) ----
(function(){
const SC=window.SIMCORE,A=window.SIMA,D=window.SIMDATA;if(!document.getElementById('sim-cow-card'))return;
const $=id=>document.getElementById(id);
const C={kind:'list',n:1000000,act:'iterate'};const STEPS=42;
function fixAct(){// numpy has no meaningful len/sum difference for the model; list.sum is not a list method
  const b=$('sim-cow-act').querySelectorAll('button');b.forEach(x=>{x.disabled=(C.kind==='list'&&x.dataset.m==='sum')});
  if(C.kind==='list'&&C.act==='sum'){C.act='iterate';b.forEach(x=>x.classList.toggle('on',x.dataset.m==='iterate'))}}
const nf=x=>x.toLocaleString('en-US');
function draw(i){const reg=SC.cowRegions(C.n,C.kind),total=SC.cowCopied(C.n,C.kind,C.act),el=$('sim-cow-svg'),W=Math.max(290,Math.min(760,A.width(el)));
  const nar=W<520,names=C.kind==='list'?[['header',nar?'list object':'list object (header, refcount)'],['pointers',nar?'pointers':'pointer array (8 bytes per element)'],['objects',nar?'int objects':'the int objects (128 per page)']]:[['header',nar?'array object':'array object (header, refcount)'],['data',nar?'numbers':'the numbers (8 bytes each)']];
  const prog=i<=1?0:(i-1)/(STEPS-2);// fraction of elements the child has touched
  const cols=Math.max(20,Math.floor((W-10)/11)),cs=(W-10)/cols;let y=4,o='',copied=0;
  names.forEach(([k,lab])=>{const pages=reg[k];let cp=0;
    if(i>=2){if(k==='header')cp=1;else if(k==='objects'&&C.act==='iterate')cp=Math.min(pages,Math.ceil(prog*C.n/128))}
    copied+=cp;
    const cells=Math.min(pages,cols*4),per=pages/cells,rowsN=Math.ceil(cells/cols);
    o+=A.T(4,y+11,lab+': '+nf(pages)+' page'+(pages>1?'s':'')+(per>1.01?(nar?' (1 square = ':' (one square = ')+(per<10?per.toFixed(1):Math.round(per))+(nar?')':' pages)'):''),{fs:11,fill:'var(--mute)'});y+=16;
    for(let c=0;c<cells;c++){const x=5+(c%cols)*cs,yy=y+Math.floor(c/cols)*cs,lo=c*per,f=Math.max(0,Math.min(1,(cp-lo)/per));
      o+=A.R(x,yy,cs-1.5,cs-1.5,i===0?'var(--c1)':'var(--acc2)',{st:i===0?'none':'var(--c1)',sw:0.6});
      if(f>0)o+=A.R(x,yy,(cs-1.5)*f,cs-1.5,'var(--c2)')}
    y+=rowsN*cs+8});
  el.innerHTML=A.svg(W,y+2,o,'Pages of the parent, shared or copied by the child');
  const mb=copied*4096/1e6;
  $('sim-cow-stats').innerHTML='<div class="stat"><div class="k">Pages copied so far</div><div class="v">'+nf(copied)+'</div><div class="d">one page fault and one 4 KiB copy each</div></div>'+
    '<div class="stat"><div class="k">Memory the child now owns</div><div class="v">'+mb.toFixed(1)+' MB</div><div class="d">model, at the end: '+(total*4096/1e6).toFixed(1)+' MB</div></div>'+
    '<div class="stat"><div class="k">Still shared</div><div class="v">'+nf(Object.values(reg).reduce((a,b)=>a+b,0)-copied)+' pages</div><div class="d">of '+nf(Object.values(reg).reduce((a,b)=>a+b,0))+'</div></div>';
  const what=C.act==='len'?'len(data)':C.act==='sum'?'data.sum()':'for x in data';
  $('sim-cow-cap').innerHTML=i===0?'Before <code>fork()</code>: the parent alone owns its pages (solid).':
    i===1?'Right after <code>fork()</code>: the child shares every page (outlined: mapped by both, read-only). Nothing has been copied.':
    '<code>'+what+'</code> in the child, '+Math.round(prog*100)+'% done: '+(C.kind==='list'&&C.act==='iterate'?'each element read writes its object\'s reference count, so each page of objects is copied (orange) the first time any object on it is read. The pointer array is only read and stays shared.':C.act==='len'?'only the list object\'s own reference count is written: one page.':'numpy reads the raw numbers in C; only the array object\'s reference count changes: one page.')}
const an=A.anim({card:'sim-cow-card',ctl:'sim-cow-ctl',n:STEPS,draw,ms:160,label:'Step'});an.go(STEPS-1);
A.seg($('sim-cow-kind'),m=>{C.kind=m;if(m==='numpy'&&C.act==='iterate'){}fixAct();an.go(0);an.play()});
A.seg($('sim-cow-act'),m=>{C.act=m;an.go(0);an.play()});
$('sim-cow-n').addEventListener('change',e=>{C.n=+e.target.value;an.redraw()});
fixAct();A.onResize(()=>an.redraw());
// real
(function(){const rows=D.raw.cow.map(l=>{const m=l.match(/^(list|numpy)\s+(\w+)\s+child.*copied\s+(\d+) kB =\s+(\d+) pages/);return m?{kind:m[1],act:m[2],kb:+m[3],pages:+m[4]}:null}).filter(Boolean);
  const mx=Math.max(...rows.map(r=>Math.max(r.pages,SC.cowCopied(1e6,r.kind,r.act))));
  let h='<div class="bars">';rows.forEach(r=>{const model=SC.cowCopied(1e6,r.kind,r.act),lab=(r.kind==='list'?'list, ':'numpy, ')+(r.act==='iterate'?'for x in':r.act==='len'?'len()':'.sum()');
    h+='<div class="row"><span class="nm">'+lab+' model</span><span class="track"><span class="fill" style="width:'+(100*model/mx)+'%;background:var(--sim-sim)"></span></span><span class="val">'+model.toLocaleString('en-US')+'</span></div>'+
      '<div class="row hl"><span class="nm">'+lab+' real</span><span class="track"><span class="fill" style="width:'+(100*r.pages/mx)+'%;background:var(--sim-real)"></span></span><span class="val">'+r.pages.toLocaleString('en-US')+'</span></div>'});
  $('sim-cow-real').innerHTML=h+'</div><p class="sim-note">Pages copied by the child, n = 1,000,000. The real counts include 30 to 70 pages the interpreter itself writes whatever the child does (compare <code>len()</code>, which the model counts as 1 page), so the model and the kernel agree to within that baseline. The numpy "for x in" case creates a new scalar object per element in the child\'s own memory and frees it; the shared buffer is never written.</p>';
  $('sim-cow-raw').textContent=D.raw.cow.join('\n')})();
})();
