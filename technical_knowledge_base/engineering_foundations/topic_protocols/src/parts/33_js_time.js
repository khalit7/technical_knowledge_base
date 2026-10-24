// ---- Protocol atlas: timeline of versions (RFC and specification dates from the fetched metadata) ----
(function(){
  const A=window.AT,D=A.D,E=A.E,$=A.$,esc=A.esc;
  const COL={agent:'c4',auth:'c5',api:'c1',stream:'c6',http:'c2',security:'c3',naming:'c6',transport:'c1',net:'c2',fabric:'c5'};
  const groups=D.groups.filter(g=>D.timeline.some(t=>E[t.p].group===g.id));
  let on=new Set(groups.map(g=>g.id)),from=A.store.get('at-tfrom','2010');
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function bar(){
    let h='<span class="small mute">Show</span><span class="seg" role="group" aria-label="Years"><button type="button" data-from="1980"'+(from==='1980'?' class="on"':'')+'>All years</button><button type="button" data-from="2010"'+(from==='2010'?' class="on"':'')+'>Since 2010</button><button type="button" data-from="2024"'+(from==='2024'?' class="on"':'')+'>Since 2024</button></span>';
    h+='<span class="chips" role="group" aria-label="Layers">'+groups.map(g=>'<button type="button" data-g="'+g.id+'" class="'+(on.has(g.id)?'on':'')+'" aria-pressed="'+on.has(g.id)+'"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--'+COL[g.id]+');margin-right:4px"></span>'+esc(g.label)+'</button>').join('')+'</span>';
    $('at-tbar').innerHTML=h;
    $('at-tbar').querySelectorAll('[data-from]').forEach(b=>b.addEventListener('click',()=>{from=b.dataset.from;A.store.set('at-tfrom',from);render()}));
    $('at-tbar').querySelectorAll('[data-g]').forEach(b=>b.addEventListener('click',()=>{const g=b.dataset.g;
      if(on.has(g)&&on.size===1){on=new Set(groups.map(x=>x.id))}else if(on.size===groups.length){on=new Set([g])}else if(on.has(g))on.delete(g);else on.add(g);render()}));
  }
  function items(){return D.timeline.filter(t=>t.d.slice(0,4)>=from&&on.has(E[t.p].group))}
  function strip(list){
    const el=$('at-strip'),W=Math.max(260,el.offsetWidth||600),H=54,pad=14;
    if(!list.length){el.innerHTML='';return}
    const y0=Math.min(+from,+list[0].d.slice(0,4)),y1=2027;
    const x=d=>pad+((+d.slice(0,4)-y0)+(+d.slice(5,7)-0.5)/12)/(y1-y0)*(W-2*pad);
    let s='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Events per year"><line x1="'+pad+'" x2="'+(W-pad)+'" y1="30" y2="30" stroke="var(--line)"/>';
    const step=(y1-y0)>30?10:(y1-y0)>12?5:(W<480?2:1);
    for(let y=Math.ceil(y0/step)*step;y<=2026;y+=step){const xx=x(y+'-01')-((W-2*pad)/(y1-y0))/24;s+='<line x1="'+xx+'" x2="'+xx+'" y1="26" y2="34" stroke="var(--dim)"/><text x="'+xx+'" y="48" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+y+'</text>'}
    const stack={};
    list.forEach(t=>{const k=t.d.slice(0,4);stack[k]=(stack[k]||0)+1;const yy=30-((stack[k]-1)%5)*5-4;
      s+='<circle cx="'+x(t.d).toFixed(1)+'" cy="'+yy+'" r="3.2" fill="var(--'+COL[E[t.p].group]+')"><title>'+esc(t.d+' '+E[t.p].name+': '+t.l)+'</title></circle>'});
    el.innerHTML=s+'</svg>';
  }
  function render(){
    bar();const list=items();strip(list);
    let h='',yr='';
    list.forEach(t=>{const y=t.d.slice(0,4);
      if(y!==yr){if(yr)h+='</div></div>';yr=y;h+='<div class="at-yr"><div class="y">'+y+'</div><div>'}
      h+='<div class="at-ev"><span class="m">'+MON[+t.d.slice(5,7)-1]+'</span><button type="button" data-at-open="'+t.p+'" style="border-color:var(--'+COL[E[t.p].group]+')">'+esc(E[t.p].name)+'</button><a href="'+esc(t.u)+'" target="_blank" rel="noopener noreferrer">'+esc(t.l)+'</a></div>'});
    if(yr)h+='</div></div>';
    $('at-tl').innerHTML=(list.length?'<p class="small mute">'+list.length+' events. RFC months come from the RFC Editor\'s metadata and release dates from GitHub, fetched '+esc(D.checked)+'.</p>':'<p>No events for this filter.</p>')+h;
  }
  A.vrender.time=render;
  addEventListener('resize',()=>{if(A.visible()&&!$('at-v-time').hidden)strip(items())});
})();
