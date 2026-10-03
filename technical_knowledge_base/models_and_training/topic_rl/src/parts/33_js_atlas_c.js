// ---- Method atlas (t-atlas), part c: the three axes as a map, and the lineage graph ----
(function(){
const A=window.ATLAS,AT=window.AT,esc=AT.esc;
const SVGNS='http://www.w3.org/2000/svg';
// ---------- map ----------
const mst={model:'all'};
function drawMap(){
  const ctl=document.getElementById('at-map-ctl');
  ctl.innerHTML='<span class="lb">Model</span><div class="chips" id="at-map-m">'+[['all','All']].concat(A.fams.model).map(f=>'<button data-v="'+f[0]+'" class="'+(mst.model===f[0]?'on':'')+'">'+esc(f[1])+'</button>').join('')+'</div>';
  const xs=A.fams.data,ys=A.fams.store,el=document.getElementById('at-map');
  el.style.gridTemplateColumns=(innerWidth<520?'minmax(0,3.4em)':'minmax(0,5.2em)')+' repeat('+xs.length+',minmax(0,1fr))';
  let h='<div></div>'+xs.map(x=>'<div class="hd">'+esc(x[1].replace(' (no samples)',''))+'</div>').join('');
  ys.forEach(y=>{h+='<div class="rh">'+esc(y[1])+'</div>';
    xs.forEach(x=>{const ms=A.rows.filter(r=>r.cells.store.f===y[0]&&r.cells.data.f===x[0]&&(mst.model==='all'||r.cells.model.f===mst.model));
      h+='<div class="cell'+(ms.length?'':' empty')+'" aria-label="'+esc(y[1]+', '+x[1])+'">'+ms.map(r=>'<button class="mc m-'+r.cells.model.f+(AT.visible(r)?'':' dim')+(AT.sel===r.id?' sel':'')+'" data-r="'+r.id+'" title="'+esc(r.name+', '+AT.year(r))+'">'+esc(r.short)+'</button>').join('')+'</div>'})});
  el.innerHTML=h}
// ---------- lineage ----------
const lst={edge:null};
function layout(W){
  const lanes=A.lanes.map(l=>l[0]);const LW=Math.max(38,(W-34)/lanes.length);
  const fs=Math.max(8.5,Math.min(11,LW/5.4));const rowH=fs*2.1;
  const rows=A.rows.slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:lanes.indexOf(a.lane)-lanes.indexOf(b.lane));
  const pos={},yr={};let maxRow=-1;const years=[...new Set(rows.map(r=>AT.year(r)))];
  years.forEach(y=>{const start=maxRow+1;const used={};rows.filter(r=>AT.year(r)===y).forEach(r=>{const k=used[r.lane]||0;used[r.lane]=k+1;pos[r.id]={row:start+k,lane:lanes.indexOf(r.lane)};maxRow=Math.max(maxRow,start+k)});yr[y]=start});
  for(const id in pos){const p=pos[id];p.x=34+LW*(p.lane+.5);p.y=30+rowH*p.row+rowH/2}
  return {pos,yr,LW,fs,rowH,H:30+rowH*(maxRow+1)+8,lanes}}
function drawLin(){
  const box=document.getElementById('at-lin');const W=Math.max(300,box.clientWidth||600);const L=layout(W);
  const svg=document.createElementNS(SVGNS,'svg');svg.setAttribute('viewBox','0 0 '+W+' '+L.H);svg.setAttribute('role','img');svg.setAttribute('aria-label','Lineage graph of the atlas methods by year and family');
  let h='';
  // lane headers and guides
  L.lanes.forEach((l,i)=>{const x=34+L.LW*(i+.5);h+='<line x1="'+x+'" y1="26" x2="'+x+'" y2="'+(L.H-4)+'" stroke="var(--line)" stroke-dasharray="2 4"/>'});
  const short={cls:'Classical',val:'Value nets',pg:'Policy nets',mb:'Search, models',off:'Imitation, offline',llm:'Language models'};
  L.lanes.forEach((l,i)=>{const x=34+L.LW*(i+.5);const words=(L.LW<70?short[l].split(/,? /):[short[l]]);words.forEach((w,j)=>{h+='<text x="'+x+'" y="'+(10+j*(L.fs))+'" text-anchor="middle" font-size="'+(L.fs*.92).toFixed(1)+'" fill="var(--mute)">'+esc(w)+'</text>'})});
  Object.entries(L.yr).forEach(([y,row])=>{h+='<text x="2" y="'+(30+L.rowH*row+L.rowH*.62)+'" font-size="'+(L.fs*.92).toFixed(1)+'" fill="var(--mute)">'+y+'</text>'});
  // edges
  const sel=AT.sel,anc=new Set(),des=new Set();
  if(sel){const up=id=>{(AT.byId[id].cells.fixed.from||[]).forEach(p=>{if(!anc.has(p)){anc.add(p);up(p)}})};up(sel);
    const down=id=>{A.rows.forEach(r=>{if((r.cells.fixed.from||[]).includes(id)&&!des.has(r.id)){des.add(r.id);down(r.id)}})};down(sel)}
  const rel=new Set([sel,...anc,...des]);
  A.rows.forEach(r=>{(r.cells.fixed.from||[]).forEach(p=>{const a=L.pos[p],b=L.pos[r.id];const my=(a.y+b.y)/2;
    const d='M'+a.x.toFixed(1)+','+(a.y+L.rowH*.32).toFixed(1)+' C'+a.x.toFixed(1)+','+my.toFixed(1)+' '+b.x.toFixed(1)+','+my.toFixed(1)+' '+b.x.toFixed(1)+','+(b.y-L.rowH*.32).toFixed(1);
    const on=lst.edge&&lst.edge[0]===p&&lst.edge[1]===r.id;const up=new Set([sel,...anc]),dn=new Set([sel,...des]);const hl=sel&&((up.has(p)&&up.has(r.id))||(dn.has(p)&&dn.has(r.id)));
    h+='<path class="ed'+(on?' on':hl?' hl':'')+'" d="'+d+'"/><path class="eh" data-e="'+p+'>'+r.id+'" d="'+d+'"><title>'+esc(AT.byId[p].name+' to '+r.name)+'</title></path>'})});
  // nodes
  A.rows.forEach(r=>{const p=L.pos[r.id];const w=Math.min(L.LW-4,r.short.length*L.fs*.62+10),hh=L.rowH*.66;
    const cls='nd'+(r.id===sel?' sel':rel.has(r.id)&&sel?' hl':'')+(AT.visible(r)?'':' dim');
    h+='<g class="'+cls+'" data-r="'+r.id+'" tabindex="0" role="button" aria-label="'+esc(r.name)+'"><rect x="'+(p.x-w/2).toFixed(1)+'" y="'+(p.y-hh/2).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+hh.toFixed(1)+'" rx="4"/><text x="'+p.x.toFixed(1)+'" y="'+(p.y+L.fs*.36).toFixed(1)+'" text-anchor="middle" font-size="'+L.fs.toFixed(1)+'">'+esc(r.short)+'</text><title>'+esc(r.name+', '+AT.year(r))+'</title></g>'});
  svg.innerHTML=h;box.innerHTML='';box.appendChild(svg)}
function edgeCap(p,c){const r=AT.byId[c],x=r.cells.fixed;
  return '<b>'+esc(AT.byId[p].name)+' to '+esc(r.name)+'</b> ('+AT.year(r)+'). Problem fixed: '+esc(x.v)+'.'+(x.q?' <i>"'+esc(x.q)+'"</i>':'')+' <span class="small">'+AT.srcLink(x.s,x.l)+'</span>'+(x.n?' <span class="small mute">'+esc(x.n)+'</span>':'')}
function nodeCap(id){const r=AT.byId[id];const fr=r.cells.fixed.from||[];const kids=A.rows.filter(z=>(z.cells.fixed.from||[]).includes(id));
  return '<b>'+esc(r.name)+'</b> ('+AT.year(r)+'). '+(fr.length?'Fixed '+fr.map(p=>esc(AT.byId[p].short)).join(', ')+': '+esc(r.cells.fixed.v)+'.':'A starting point: '+esc(r.cells.fixed.v)+'.')+(kids.length?' Fixed in turn by '+kids.map(z=>esc(z.short)).join(', ')+'.':' Nothing in the atlas fixes it yet.')+' Click an edge for its source.'}
function wire(){
  document.getElementById('at-map-ctl').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mst.model=b.dataset.v;drawMap()});
  document.getElementById('at-map').addEventListener('click',e=>{const b=e.target.closest('.mc');if(!b)return;AT.select(b.dataset.r);AT.detail(b.dataset.r);document.getElementById('at-det').scrollIntoView({block:'nearest'})});
  const box=document.getElementById('at-lin');
  box.addEventListener('click',e=>{const ed=e.target.closest('.eh');if(ed){const [p,c]=ed.dataset.e.split('>');lst.edge=[p,c];document.getElementById('at-lin-cap').innerHTML=edgeCap(p,c);drawLin();return}
    const g=e.target.closest('g.nd');if(g){lst.edge=null;AT.select(g.dataset.r);document.getElementById('at-lin-cap').innerHTML=nodeCap(g.dataset.r)}});
  box.addEventListener('keydown',e=>{if(e.key==='Enter'){const g=e.target.closest('g.nd');if(g){lst.edge=null;AT.select(g.dataset.r);document.getElementById('at-lin-cap').innerHTML=nodeCap(g.dataset.r)}}});
  document.getElementById('at-lin-leg').innerHTML='<span>Edges: from the method whose problem was fixed to the one that fixed it. Blue: the selected method\'s ancestors and descendants; orange: the edge you clicked.</span>';
  AT.selectHooks.push(()=>{drawMap();drawLin()});
  AT.filterHooks.push(()=>{drawMap();drawLin()});
  let lastW=0;addEventListener('resize',()=>{const t=document.getElementById('t-atlas');if(t.hidden)return;const w=box.clientWidth;if(w&&w!==lastW){lastW=w;drawLin()}})}
let done=false;
function render(){if(!done){done=true;wire();AT.sel=AT.sel||'ppo';document.getElementById('at-lin-cap').innerHTML=nodeCap(AT.sel)}drawMap();drawLin()}
window.TAB_RENDER['t-atlas'].push(render);
})();
