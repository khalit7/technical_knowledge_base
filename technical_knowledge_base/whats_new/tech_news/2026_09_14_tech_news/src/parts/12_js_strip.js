// ---- Week at a glance: one mark per item, rows by section, days across; filter and click for detail ----
(function(){
  const box=$('stripSvg');if(!box||!window.ISSUE)return;
  const D=ISSUE,secs=D.sections,items=D.items;
  const day=s=>Math.round((Date.parse(s+'T00:00:00Z')-Date.parse(D.issue.axis[0]+'T00:00:00Z'))/864e5);
  const nDays=day(D.issue.axis[1])+1;
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd=s=>{if(!s)return 'undated';const p=s.split('-');return MON[+p[1]-1]+' '+(+p[2])};
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const on={};secs.forEach(s=>on[s.id]=true);
  let sel=null;
  // filter chips
  const F=$('stripF');
  F.innerHTML='<button class="on" data-s="all">All sections</button>'+secs.map(s=>'<button class="'+s.c+'" data-s="'+s.id+'"><span class="sw"></span>'+esc(s.short)+' '+items.filter(i=>i.sec===s.id).length+'</button>').join('');
  F.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    const s=b.dataset.s;
    if(s==='all'){secs.forEach(x=>on[x.id]=true)}
    else{const only=secs.every(x=>on[x.id]);if(only){secs.forEach(x=>on[x.id]=x.id===s)}else{on[s]=!on[s];if(!secs.some(x=>on[x.id]))secs.forEach(x=>on[x.id]=true)}}
    F.querySelectorAll('button').forEach(x=>{const k=x.dataset.s;x.classList.toggle('on',k==='all'?secs.every(y=>on[y.id]):(on[k]&&!secs.every(y=>on[y.id])));x.classList.toggle('off',k!=='all'&&!on[k])});
    if(sel&&!on[sel.sec])sel=null;draw();detail()}));
  // Columns: an "earlier" column when any item predates the axis, one column per day of the axis, then "undated"
  const early=items.some(i=>i.d&&day(i.d)<0)?1:0;
  const colOf=d=>!d?early+nDays:(day(d)<0?0:early+Math.min(day(d),nDays-1));
  function draw(){
    const narrow=box.clientWidth<560;
    const W=narrow?Math.max(300,Math.round(box.clientWidth||340)):760,lw=narrow?66:132,cols=early+nDays+1,cw=(W-lw-8)/cols,rh=30,top=narrow?34:40;
    const H=top+secs.length*rh+26;
    const x=c=>lw+cw*(c+.5),y=r=>top+rh*(r+.5);
    let s='';
    // window band
    const w0=early+day(D.issue.window[0]),w1=early+day(D.issue.window[1]);
    s+='<rect x="'+(lw+cw*w0)+'" y="'+(top-4)+'" width="'+(cw*(w1-w0+1))+'" height="'+(secs.length*rh+8)+'" fill="var(--acc2)" opacity=".55" rx="4"/>';
    s+='<text x="'+(lw+cw*(w0+(w1-w0+1)/2))+'" y="'+(H-6)+'" font-size="11" text-anchor="middle" fill="var(--mute)">the issue\'s window, '+dd(D.issue.window[0])+' to '+(+D.issue.window[1].split('-')[2])+'</text>';
    const a0=Date.parse(D.issue.axis[0]+'T00:00:00Z');
    for(let c=0;c<cols;c++){let lab;if(early&&c===0)lab='<';else if(c<early+nDays){lab=String(new Date(a0+(c-early)*864e5).getUTCDate())}else lab='?';
      s+='<text x="'+x(c)+'" y="'+(top-12)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+lab+(early&&c===0?'<title>earlier than '+dd(D.issue.axis[0])+'</title>':'')+'</text>';}
    s+='<text x="'+(lw-6)+'" y="'+(top-12)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+MON[+D.issue.axis[0].split('-')[1]-1]+'</text>';
    if(early)s+='<line x1="'+(lw+cw)+'" x2="'+(lw+cw)+'" y1="'+(top-4)+'" y2="'+(top+secs.length*rh+4)+'" stroke="var(--line)" stroke-dasharray="3 3"/>';
    s+='<line x1="'+(lw+cw*(early+nDays))+'" x2="'+(lw+cw*(early+nDays))+'" y1="'+(top-4)+'" y2="'+(top+secs.length*rh+4)+'" stroke="var(--line)" stroke-dasharray="3 3"/>';
    secs.forEach((q,r)=>{s+='<line x1="'+lw+'" x2="'+(W-8)+'" y1="'+(top+rh*(r+1))+'" y2="'+(top+rh*(r+1))+'" stroke="var(--line)"/>';
      s+='<text x="'+(lw-6)+'" y="'+(y(r)+4)+'" font-size="'+(narrow?11:12)+'" text-anchor="end" fill="'+(on[q.id]?'var(--ink)':'var(--dim)')+'">'+esc(narrow?q.short:q.name)+'</text>'});
    // marks, stacked within a cell (two rows when a cell is crowded)
    const cell={};
    items.forEach(it=>{const c=colOf(it.d),r=secs.findIndex(q=>q.id===it.sec);const k=c+'|'+r;(cell[k]=cell[k]||[]).push(it)});
    const R=narrow?4.2:5.6;
    Object.entries(cell).forEach(([k,arr])=>{const [c,r]=k.split('|').map(Number);const n=arr.length,rows=n>3?2:1,per=Math.ceil(n/rows);
      arr.forEach((it,j)=>{const q=secs[r];const jr=Math.floor(j/per),jc=j%per,nn=rows>1?per:n;const step=Math.min(cw/nn,2*R+1.5);
        const cx=x(c)+(nn>1?(jc-(nn-1)/2)*step:0),cy=y(r)+(rows>1?(jr-.5)*(2*R+1.5):0);
        const vis=on[q.id],isS=sel&&sel.n===it.n;
        (it.also||[]).forEach(([d2])=>{const c2=colOf(d2);if(!vis||c2===c)return;const x2=x(c2);s+='<line x1="'+x2+'" x2="'+cx+'" y1="'+cy+'" y2="'+cy+'" stroke="var(--'+q.c+')" stroke-width="1.3" opacity=".6"/><circle cx="'+x2+'" cy="'+cy+'" r="'+(R-1.5)+'" fill="var(--bg)" stroke="var(--'+q.c+')" stroke-width="1.5"/>'});
        s+='<circle class="mk" data-n="'+it.n+'" cx="'+cx+'" cy="'+cy+'" r="'+(isS?R+2:R)+'" fill="var(--'+q.c+')" opacity="'+(vis?1:.12)+'" stroke="'+(isS?'var(--ink)':'var(--bg)')+'" stroke-width="'+(isS?2:1)+'"><title>'+esc(dd(it.d)+': '+it.t)+'</title></circle>'})});
    if(!narrow)s+='<text x="'+x(early+nDays)+'" y="'+(top-24)+'" font-size="11" text-anchor="middle" fill="var(--mute)">undated</text>';
    if(!narrow&&early)s+='<text x="'+x(0)+'" y="'+(top-24)+'" font-size="11" text-anchor="middle" fill="var(--mute)">earlier</text>';
    box.innerHTML=svgEl(W,H,s,'Items of the issue by day and section');
    box.querySelectorAll('.mk').forEach(m=>m.addEventListener('click',()=>{const it=items.find(i=>i.n===+m.dataset.n);if(!on[it.sec])return;sel=it;draw();detail()}));
    // busiest days
    const per={};items.filter(i=>i.d&&on[i.sec]).forEach(i=>per[i.d]=(per[i.d]||0)+1);
    const top3=Object.entries(per).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,3);
    $('stripBusy').textContent=top3.map(([d,n])=>dd(d)+' ('+n+')').join(', ')+'; '+items.filter(i=>!i.d&&on[i.sec]).length+' undated';
  }
  function detail(){
    const el=$('stripDet');
    if(!sel){el.innerHTML='<span class="mute small">Click a mark.</span>';return}
    const q=secs.find(s=>s.id===sel.sec),it=sel;
    const hn=it.hn||{};let b='';if(hn.p)b+=' <span class="hn">'+fmt(hn.p)+(hn.plus?'+':'')+' points</span>';if(hn.c)b+=' <span class="hn">'+fmt(hn.c)+(hn.plus?'+':'')+' comments</span>';
    el.innerHTML='<div class="ih" style="display:flex;flex-wrap:wrap;gap:4px 8px;font-size:12px;color:var(--mute)"><span class="dt">'+dd(it.d)+'</span><span class="sc '+q.c+'">'+esc(q.short)+'</span>'+(it.dnote?'<span>'+esc(it.dnote)+'</span>':'')+b+'</div>'+
      '<h3>'+esc(it.t)+'</h3><p class="small" style="margin:2px 0">'+esc(it.x)+'</p>'+
      '<p class="small" style="margin:4px 0 0">Sources: '+(it.src.length?it.src.map(x=>A(x.u,esc(x.t))).join(', '):'<span class="mute">none given in the issue</span>')+' · <a href="#i-'+it.id+'" data-jump="i-'+it.id+'">read it in its tab</a></p>';
    bindJumps(el)}
  let rw=box.clientWidth;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(box.closest('.tab').id,draw);draw();
})();
