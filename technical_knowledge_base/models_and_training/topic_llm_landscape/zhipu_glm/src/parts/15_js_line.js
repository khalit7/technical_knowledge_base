// ---- Lineage (inline in Reading): every GLM release on one axis; the release notes are static HTML in a closed block ----
(function(){if(!$('lnSvg'))return;
  // lane: f flagship text, s Flash and small, v vision, d derivative, c corporate. p: total parameters (B), a: active (B)
  const R=[
    {d:'2022-10-05',n:'GLM-130B',l:'f',p:130,a:130},
    {d:'2023-03-13',n:'ChatGLM-6B',l:'s',p:6,a:6,lic:'open weights'},
    {d:'2024-06-04',n:'GLM-4 (GLM-4-9B open)',l:'f',p:9,a:9},
    {d:'2025-01-15',mo:1,n:'US Entity List',l:'c'},
    {d:'2025-04-14',n:'GLM-4-32B-0414 and GLM-Z1',l:'s',p:32,a:32,lic:'open weights'},
    {d:'2025-07-28',n:'GLM-4.5 and GLM-4.5-Air',l:'f',p:355,a:32,ctx:'128K',lic:'MIT'},
    {d:'2025-08-11',n:'GLM-4.5V',l:'v',p:108,lic:'MIT'},
    {d:'2025-09-30',n:'GLM-4.6',l:'f',p:355,a:32,ctx:'200K',lic:'MIT'},
    {d:'2025-12-08',n:'GLM-4.6V',l:'v',p:108,ctx:'128K',lic:'MIT'},
    {d:'2025-12-22',n:'GLM-4.7',l:'f',p:355,a:32,ctx:'200K',lic:'MIT'},
    {d:'2026-01-08',n:'Hong Kong listing',l:'c'},
    {d:'2026-01-19',n:'GLM-4.7-Flash',l:'s',p:30,a:3,ctx:'200K',lic:'MIT'},
    {d:'2026-02-12',n:'GLM-5',l:'f',p:744,a:40,ctx:'200K',lic:'MIT'},
    {d:'2026-04-07',n:'GLM-5.1',l:'f',p:744,a:40,ctx:'200K',lic:'MIT'},
    {d:'2026-06-16',n:'GLM-5.2',l:'f',p:744,a:40,ctx:'1M',lic:'MIT'},
    {d:'2026-08-14',n:'GLM-5.3',l:'f',p:744,a:40,ctx:'1M',lic:'GLM-5.3 License'},
    {d:'2026-08-26',n:'GLM-5.3-Flash',l:'s',p:320,a:18,ctx:'1M',lic:'MIT'},
    {d:'2026-09-11',n:'Atria Dawn Preview',l:'d',p:744,ctx:'256K',lic:'MIT'},
    {d:'2026-10-12',n:'GLM-Legal',l:'s',ctx:'',lic:'closed, by application'}];
  const LANES=[['f','Flagship'],['s','Flash and small'],['v','Vision'],['d','Built on GLM'],['c','Corporate']],LC={f:'var(--c1)',s:'var(--c3)',v:'var(--c4)',d:'var(--c2)',c:'var(--mute)'};
  const t=s=>new Date(s+'T00:00:00Z').getTime();
  let zoom=false,sel=null;
  function mark(){document.querySelectorAll('#lnNotes .tl-item').forEach(c=>c.classList.toggle('sel',c.id===sel))}
  function draw(){const el=$('lnSvg'),cw=el.clientWidth,W=cw<520?Math.max(300,cw):680,nar=W<500,pl=nar?Math.ceil(Math.max(...LANES.map(q=>textW(q[1],11))))+14:104,pr=14,lh=nar?40:44,H=24+LANES.length*lh+24;
    const a=zoom?t('2025-06-15'):t('2022-08-01'),b=t('2026-10-25'),x=v=>pl+(W-pl-pr)*(t(v)-a)/(b-a);
    let s='';LANES.forEach(([k,n],i)=>{const y=24+i*lh+lh/2;s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(pl-8)+'" y="'+(y+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+n+'</text>'});
    const yrs=zoom?['2025-07-01','2025-10-01','2026-01-01','2026-04-01','2026-07-01','2026-10-01']:['2023-01-01','2024-01-01','2025-01-01','2026-01-01'];
    yrs.forEach(v=>{const X=x(v);s+='<line x1="'+X+'" x2="'+X+'" y1="20" y2="'+(H-20)+'" stroke="var(--line)" stroke-dasharray="2 3"/><text x="'+X+'" y="'+(H-6)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(zoom?new Date(t(v)).toLocaleDateString('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'}):v.slice(0,4))+'</text>'});
    R.forEach((r,i)=>{if(t(r.d)<a)return;const li=LANES.findIndex(q=>q[0]===r.l),y=24+li*lh+lh/2,X=x(r.d),rad=r.p?Math.max(3.5,13*Math.sqrt(r.p/744)):5,id='ln'+i;
      s+=r.l==='c'?'<path class="lnd" data-id="'+id+'" d="M'+X+' '+(y-6)+'l6 6l-6 6l-6-6z" fill="'+LC[r.l]+'"'+(sel===id?' stroke="var(--ink)" stroke-width="2"':'')+'><title>'+r.n+', '+(r.mo?r.d.slice(0,7):r.d)+'</title></path>'
        :'<circle class="lnd" data-id="'+id+'" cx="'+X.toFixed(1)+'" cy="'+y+'" r="'+rad.toFixed(1)+'" fill="'+LC[r.l]+'" fill-opacity=".75" stroke="'+(sel===id?'var(--ink)':'var(--bg)')+'" stroke-width="'+(sel===id?2:1)+'"><title>'+r.n+', '+r.d+'</title></circle>';
      if(zoom&&!nar&&r.l!=='c')s+='<text x="'+X.toFixed(1)+'" y="'+(y-rad-4).toFixed(1)+'" font-size="9.5" text-anchor="middle" fill="var(--mute)">'+r.n.replace(' and GLM-4.5-Air','').replace(' Preview','')+'</text>'});
    el.innerHTML=svgEl(W,H,s,'GLM releases on a time axis');
    el.querySelectorAll('.lnd').forEach(d=>d.addEventListener('click',()=>{sel=d.dataset.id;draw();$('lnNotes').open=true;mark();const c=$(sel);if(c)c.scrollIntoView({block:'nearest'})}))}
  const seg=$('lnR');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(q=>q.classList.toggle('on',q===b));zoom=b.dataset.m==='z';draw()}));
  onTab('t-read',draw);draw();
  let w=0;addEventListener('resize',()=>{const n=$('lnSvg').clientWidth;if(n&&(Math.abs(n-w)>30||(n<520)!==(w<520))){w=n;if(!$('t-read').hidden)draw()}});
})();
