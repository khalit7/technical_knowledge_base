// ---- Hero: one call, three machines (static annotated diagram, drawn at the measured width) ----
(function(){
const $=id=>document.getElementById(id), el=$('tda-hero');if(!el)return;
const S=window.TDA.dsp, mmT=S.tables['aten::mm'];
const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+'/>'};
const tx=(x,y,s,c,a)=>'<text x="'+x+'" y="'+y+'"'+(a?' text-anchor="'+a+'"':'')+(c?' class="'+c+'"':'')+'>'+s+'</text>';
const MK={'var(--mute)':'m','var(--acc)':'a','var(--good)':'g'};
const arrow=(x1,y1,x2,y2,col)=>{col=col||'var(--mute)';return '<path d="M'+x1+' '+y1+' L'+x2+' '+y2+'" stroke="'+col+'" stroke-width="1.6" fill="none" marker-end="url(#tda-h-'+MK[col]+')"/>'};
const defs='<defs>'+Object.entries(MK).map(([c,k])=>'<marker id="tda-h-'+k+'" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="'+c+'"/></marker>').join('')+'</defs>';
function p1(x,y,w){let s=tx(x,y+12,'1. The tensor x','b');
  s+=box(x,y+22,w,62,{fill:'var(--soft)'});
  s+=tx(x+10,y+40,'shape (8, 256)','mono')+tx(x+10,y+57,'strides (256, 1), offset 0','mono')+tx(x+10,y+74,'dtype float32','mono');
  s+=arrow(x+w/2,y+86,x+w/2,y+108);
  const sw=w, cw=sw/8;
  for(let r=0;r<8;r++)s+='<rect x="'+(x+r*cw)+'" y="'+(y+110)+'" width="'+(cw-1)+'" height="20" fill="var(--acc2)" stroke="var(--line)"/>';
  s+=tx(x,y+146,'storage: 8,192 bytes, 8 rows of 256 floats','m');
  s+=tx(x,y+162,'x.t() would write a new header only','m');
  return s}
function p2(x,y,w){let s=tx(x,y+12,'2. The dispatcher walks the keys','b');
  const rows=[['AutocastCPU','excluded by the thread','skip'],['AutogradCPU','records MmBackward0','on'],['ADInplaceOrView',(mmT.ADInplaceOrView&&mmT.ADInplaceOrView.kind)||'fallthrough','skip'],['CPU','the arithmetic','run']];
  rows.forEach(([k,d,st],i)=>{const yy=y+22+i*34;
    s+=box(x+14,yy,w-14,28,{fill:st==='on'?'var(--acc2)':'var(--bg)',stroke:st==='on'?'var(--acc)':'var(--line)',dash:st==='skip'});
    s+='<text x="'+(x+22)+'" y="'+(yy+18)+'" class="mono b"'+(st==='skip'?' style="text-decoration:line-through;opacity:.6"':'')+'>'+k+'</text>';
    const kw=k.length*7.2+30;
    if(22+kw+d.length*6.1<w)s+=tx(x+22+kw,yy+18,d,'m')});
  s+=arrow(x+6,y+28,x+6,y+150,'var(--acc)');
  s+=tx(x+14,y+170,'higher keys first; each redispatches below','m');
  return s}
function p3(x,y,w){let s=tx(x,y+12,'3. Autograd records, backward runs','b');
  s+=box(x,y+22,w*0.42,28,{})+tx(x+8,y+40,'y = x @ w','mono');
  s+=box(x,y+70,w,40,{fill:'var(--acc2)',stroke:'var(--acc)',sw:1.5})+tx(x+8,y+86,'MmBackward0','mono b')+tx(x+8,y+103,'saves x and w (the formula needs both)','m');
  s+=arrow(x+w*0.21,y+50,x+w*0.21,y+68,'var(--acc)')+tx(x+w*0.21+8,y+63,'grad_fn','m');
  s+=box(x,y+130,w,28,{stroke:'var(--good)',sw:1.5})+tx(x+8,y+148,'AccumulateGrad: writes w.grad','mono');
  s+=arrow(x+w*0.5,y+112,x+w*0.5,y+128,'var(--good)')+tx(x+w*0.5+8,y+124,'backward()','m');
  return s}
function draw(){const W=RD.width(el), wide=W>=840, gap=18;let s=defs;let H;
  if(wide){const pw=(W-2*gap)/3;s+=p1(0,0,pw)+p2(pw+gap,0,pw)+p3(2*(pw+gap),0,pw);H=180}
  else{const pw=Math.min(W,440);s+=p1(0,0,pw)+p2(0,182,pw)+p3(0,364,pw);H=530}
  el.innerHTML=RD.svg(W,H,s,'A tensor header over storage, the dispatch keys mm walks through, and the autograd node it records')}
RD.onRender(draw);RD.onResize(draw);draw();
})();
