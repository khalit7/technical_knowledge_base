// ---- Week at a glance: one mark per item, rows by section, days across; filter and click for detail ----
(function(){
  const box=$('stripSvg');if(!box||!window.ISSUE)return;
  const D=ISSUE,secs=D.sections,items=D.items;
  const day=s=>Math.round((Date.parse(s+'T00:00:00Z')-Date.parse(D.issue.axis[0]+'T00:00:00Z'))/864e5);
  const nDays=day(D.issue.axis[1])+1;
  const colOf=d=>d?Math.max(-1,Math.min(nDays-1,day(d)))+1:nDays+1;
  const d0=new Date(D.issue.axis[0]+'T00:00:00Z');const dom=c=>new Date(d0.getTime()+c*864e5).getUTCDate();
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
  function draw(){
    const narrow=box.clientWidth<560;
    const W=narrow?Math.max(300,Math.round(box.clientWidth||340)):760,lw=narrow?66:150,cols=nDays+2,cw=(W-lw-8)/cols,top=narrow?34:40;
    const R=narrow?4.4:5.6,pitch=2*R+2,perRow=Math.max(1,Math.floor((cw-2)/pitch));
    // marks stack within a cell, so each section row is as tall as its fullest cell needs
    const cell={};
    items.forEach(it=>{const c=colOf(it.d),r=secs.findIndex(q=>q.id===it.sec);const k=c+'|'+r;(cell[k]=cell[k]||[]).push(it)});
    const rhs=secs.map((q,r)=>{let m=1;Object.entries(cell).forEach(([k,a])=>{if(+k.split('|')[1]===r)m=Math.max(m,Math.ceil(a.length/perRow))});return Math.max(28,m*pitch+10)});
    const y0=[];let acc=top;rhs.forEach(h=>{y0.push(acc);acc+=h});const rowsH=acc-top;
    const H=top+rowsH+26;
    const x=c=>lw+cw*(c+.5),xd=d=>x(colOf(d)),y=r=>y0[r]+rhs[r]/2;
    let s='';
    // window band
    const w0=day(D.issue.window[0]),w1=day(D.issue.window[1]);
    s+='<rect x="'+(lw+cw*(w0+1))+'" y="'+(top-4)+'" width="'+(cw*(w1-w0+1))+'" height="'+(rowsH+8)+'" fill="var(--acc2)" opacity=".55" rx="4"/>';
    s+='<text x="'+(lw+cw*(w0+1+(w1-w0+1)/2))+'" y="'+(H-6)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(narrow?'window, ':'the issue\'s window, ')+dd(D.issue.window[0])+' to '+dd(D.issue.window[1])+'</text>';
    for(let c=0;c<cols;c++){const lab=c===0?'<':c<=nDays?String(dom(c-1)):'?';s+='<text x="'+x(c)+'" y="'+(top-12)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+lab+'</text>';}
    s+='<text x="'+(lw-6)+'" y="'+(top-12)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+MON[d0.getUTCMonth()]+'</text>';
    s+='<line x1="'+(lw+cw)+'" x2="'+(lw+cw)+'" y1="'+(top-4)+'" y2="'+(top+rowsH+4)+'" stroke="var(--line)" stroke-dasharray="3 3"/><line x1="'+(lw+cw*(nDays+1))+'" x2="'+(lw+cw*(nDays+1))+'" y1="'+(top-4)+'" y2="'+(top+rowsH+4)+'" stroke="var(--line)" stroke-dasharray="3 3"/>';
    secs.forEach((q,r)=>{s+='<line x1="'+lw+'" x2="'+(W-8)+'" y1="'+(y0[r]+rhs[r])+'" y2="'+(y0[r]+rhs[r])+'" stroke="var(--line)"/>';
      s+='<text x="'+(lw-6)+'" y="'+(y(r)+4)+'" font-size="'+(narrow?11:12)+'" text-anchor="end" fill="'+(on[q.id]?'var(--ink)':'var(--dim)')+'">'+esc(narrow?q.short:q.name)+'</text>'});
    Object.entries(cell).forEach(([k,arr])=>{const [c,r]=k.split('|').map(Number);const n=arr.length;
      arr.forEach((it,j)=>{const q=secs[r];const rowsN=Math.ceil(n/perRow),rr=Math.floor(j/perRow),inRow=Math.min(perRow,n-rr*perRow),jj=j-rr*perRow;const cx=x(c)+(jj-(inRow-1)/2)*pitch,cy=y(r)+(rr-(rowsN-1)/2)*pitch;
        const vis=on[q.id],isS=sel&&sel.n===it.n;
        // other dates: hollow rings joined by a line
        (it.also||[]).forEach(([d2])=>{const c2=day(d2);if(c2<0||c2>=nDays||!vis)return;const x2=x(c2+1);s+='<line x1="'+x2+'" x2="'+cx+'" y1="'+cy+'" y2="'+cy+'" stroke="var(--'+q.c+')" stroke-width="1.3" opacity=".6"/><circle cx="'+x2+'" cy="'+cy+'" r="'+(R-1.5)+'" fill="var(--bg)" stroke="var(--'+q.c+')" stroke-width="1.5"/>'});
        s+='<circle class="mk" data-n="'+it.n+'" cx="'+cx+'" cy="'+cy+'" r="'+(isS?R+2:R)+'" fill="var(--'+q.c+')" opacity="'+(vis?1:.12)+'" stroke="'+(isS?'var(--ink)':'var(--bg)')+'" stroke-width="'+(isS?2:1)+'"><title>'+esc(dd(it.d)+': '+it.t)+'</title></circle>'})});
    // items before Aug 14 (none now) would be clamped; note the undated column
    
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
      '<h3>'+esc(it.t)+'</h3><p class="small" style="margin:2px 0">'+esc(it.x)+(it.x.length>=220?'...':'')+'</p>'+
      '<p class="small" style="margin:4px 0 0"><a href="#i-'+it.id+'" data-jump="i-'+it.id+'">Read it in full, with its sources and checks, in its tab</a></p>';
    bindJumps(el)}
  let rw=box.clientWidth;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(box.closest('.tab').id,draw);draw();
})();
