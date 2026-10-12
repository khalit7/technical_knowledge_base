// ---- Ecosystem map: release timeline 2.0 to 2.14, events lane, status snapshot by date, replacement table ----
(function(){
  const M=window.MAP,D=M.D,$=M.$,esc=M.esc;
  const t0=Date.parse('2023-01-15'),tNow=Date.parse(D.asof),t1=tNow+20*864e5;
  const days=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/864e5);
  let selR=D.rel.length-1,cur=tNow,playT=0;
  const KC={born:'--c3',release:'--c1',status:'--bad',foundation:'--c4'};
  function svg(){
    const el=$('map-t-svg'),W=M.width(el),narrow=W<560;
    const L=narrow?8:16,R=W-(narrow?8:16),x=t=>L+(R-L)*(t-t0)/(t1-t0);
    const yR=60,yB=152,yE=196,H=yE+70,rr=narrow?4.5:6;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="PyTorch releases and ecosystem events, 2023 to 2026">';
    for(let y=2023;y<=2026;y++){const xx=x(Date.parse(y+'-01-01'));if(xx>=L){s+='<line x1="'+xx+'" x2="'+xx+'" y1="14" y2="'+(H-8)+'" class="map-ax"/><text x="'+(xx+3)+'" y="12" class="map-axt">'+y+'</text>'}}
    s+='<text x="'+L+'" y="30" class="map-axt" font-weight="600">PyTorch minor releases</text>';
    s+='<line x1="'+L+'" x2="'+R+'" y1="'+yR+'" y2="'+yR+'" class="map-ax"/>';
    // cadence bars
    s+='<text x="'+L+'" y="'+(yB+14)+'" class="map-axt" font-weight="600">bars: days since the previous release</text>';
    D.rel.forEach((r,i)=>{if(!i)return;const g=days(D.rel[i-1].d,r.d),xa=x(Date.parse(D.rel[i-1].d)),xb=x(Date.parse(r.d)),h=g/220*44;
      s+='<rect x="'+(xa+1)+'" y="'+(yB-h)+'" width="'+Math.max(1,xb-xa-2)+'" height="'+h+'" fill="var(--c1)" opacity=".18"/>';
      if(!narrow||i%2===0)s+='<text x="'+((xa+xb)/2)+'" y="'+(yB-h-2)+'" text-anchor="middle" font-size="9.5" class="map-axt">'+g+'</text>'});
    D.rel.forEach((r,i)=>{const xx=x(Date.parse(r.d)),on=i===selR,past=Date.parse(r.d)<=cur;
      s+='<g data-r="'+i+'" style="cursor:pointer"><circle cx="'+xx+'" cy="'+yR+'" r="'+(on?rr+2:rr)+'" fill="'+(past?'var(--c1)':'var(--bg)')+'" stroke="var(--c1)" stroke-width="'+(on?3:1.5)+'"/>'+
        '<text x="'+xx+'" y="'+(yR+(i%2?-11:20))+'" text-anchor="middle" font-size="'+(narrow?9.5:11)+'"'+(on?' font-weight="700"':'')+'>'+r.v+'</text><rect x="'+(xx-9)+'" y="'+(yR-20)+'" width="18" height="44" fill="transparent"/></g>'});
    s+='<text x="'+L+'" y="'+(yE-8)+'" class="map-axt" font-weight="600">around PyTorch (click a mark)</text><line x1="'+L+'" x2="'+R+'" y1="'+yE+'" y2="'+yE+'" class="map-ax"/>';
    D.events.forEach((e,i)=>{const xx=x(Date.parse(e[0])),row=i%3;
      s+='<g data-e="'+i+'" style="cursor:pointer"><rect x="'+(xx-4)+'" y="'+(yE+6+row*16)+'" width="8" height="12" rx="2" fill="var('+KC[e[2]]+')" opacity="'+(Date.parse(e[0])<=cur?1:.25)+'"/><line x1="'+xx+'" x2="'+xx+'" y1="'+yE+'" y2="'+(yE+6+row*16)+'" stroke="var('+KC[e[2]]+')" opacity=".5"/><rect x="'+(xx-8)+'" y="'+yE+'" width="16" height="'+(20+row*16)+'" fill="transparent"/></g>'});
    const xc=x(cur);s+='<line x1="'+xc+'" x2="'+xc+'" y1="18" y2="'+(H-6)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>';
    s+='</svg>';
    el.innerHTML=s;
    el.querySelectorAll('[data-r]').forEach(g=>g.addEventListener('click',()=>{selR=+g.dataset.r;svg();rdet()}));
    el.querySelectorAll('[data-e]').forEach(g=>g.addEventListener('click',()=>{const e=D.events[+g.dataset.e];
      $('map-t-cap').innerHTML='<b>'+esc(e[0])+'</b> '+esc(e[1])+' . '+M.link('source',e[3])}));
  }
  function rdet(){
    const r=D.rel[selR],prev=selR?D.rel[selR-1]:null;
    $('map-t-det').innerHTML='<div class="map-det" style="margin:0"><h3>PyTorch '+esc(r.v)+' <span class="mute small" style="font-weight:400">'+esc(r.d)+(prev?', '+days(prev.d,r.d)+' days after '+prev.v:'')+'</span></h3>'+
      '<div class="small mute">Highlights (release notes)</div><ul class="tight">'+r.h.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
      '<div class="small mute">Deprecated or removed</div><ul class="tight">'+r.dep.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
      '<div class="small">'+(r.c?esc(r.c)+' . ':'')+M.link('release notes',r.url)+'</div></div>';
  }
  function snap(){
    const d=new Date(cur).toISOString().slice(0,10);
    $('map-t-date').textContent=d;
    const rows=D.atlas.map(a=>[a,M.statusAt(a,d)]).filter(x=>x[1]!=='unborn');
    const cnt={};rows.forEach(([a,s])=>cnt[s]=(cnt[s]||0)+1);
    const unborn=D.atlas.length-rows.length;
    const latest=D.rel.filter(r=>r.d<=d).pop();
    $('map-t-snap').innerHTML='<div class="small mute">As of '+d+': latest PyTorch '+(latest?latest.v:'1.13')+'. '+rows.length+' of the atlas\'s '+D.atlas.length+' libraries had a release on PyPI by then'+(unborn?' ('+unborn+' not yet)':'')+'.</div><div style="margin:6px 0">'+
      M.STATUS.filter(s=>cnt[s]).map(s=>M.st(s)+' '+cnt[s]).join(' &nbsp; ')+'</div><div>'+
      rows.map(([a,s])=>'<button class="map-chip" data-sel="'+a.id+'" style="border-left:3px solid currentColor" title="'+esc(s)+'"><span class="s-'+s+'">'+esc(a.name.replace(' / Megatron-LM','').replace(' (MosaicML)','').replace(' (torch)',''))+'</span></button>').join('')+'</div>'+
      '<div class="small mute">Dated status changes known: torchtune (2025-07-15), torchaudio maintenance (2.9, 2025-10-15), TorchServe and torchtext archived (dated by GitHub\'s last push), NeMo split (3.0.0). A quiet library is drawn quiet from one year after its last release. Other libraries show today\'s status from their first release on.</div>';
    $('map-t-snap').querySelectorAll('[data-sel]').forEach(b=>b.addEventListener('click',()=>{M.selectLib(b.dataset.sel);document.getElementById('map-s-atlas').scrollIntoView({block:'start'})}));
  }
  function setCur(v){cur=Math.min(v,tNow);$('map-t-scrub').value=Math.round(1000*(cur-t0)/(tNow-t0));svg();snap()}
  function play(){
    if(playT){clearInterval(playT);playT=0;$('map-t-play').textContent='Play through time';return}
    if(cur>=tNow-864e5)cur=t0;
    $('map-t-play').textContent='Pause';
    playT=setInterval(()=>{if(!M.visible())return;cur+=864e5*12;if(cur>=tNow){cur=tNow;clearInterval(playT);playT=0;$('map-t-play').textContent='Play through time'}
      const r=D.rel.findIndex(x=>Math.abs(Date.parse(x.d)-cur)<864e5*6);if(r>=0){selR=r;rdet()}setCur(cur)},80);
  }
  function repl(){
    $('map-t-repl').querySelector('tbody').innerHTML=D.repl.map(r=>'<tr><td>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td><td>'+M.link(r[2],r[3])+'</td></tr>').join('');
  }
  function init(){
    $('map-t-play').addEventListener('click',play);
    $('map-t-scrub').addEventListener('input',e=>{if(playT)play();setCur(t0+(tNow-t0)*(+e.target.value)/1000)});
    $('map-t-cap').innerHTML='Release cadence: '+D.rel.slice(1).map((r,i)=>days(D.rel[i].d,r.d)).join(', ')+' days between consecutive minor releases (2.0 to 2.1 first). Since 2.10 a release has come every 7 to 9 weeks ('+D.rel.slice(11).map((r,i)=>days(D.rel[10+i].d,r.d)).join(', ')+' days), against 10 to 29 weeks between 2.0 and 2.10.';
    rdet();repl();
  }
  init();
  M.onRender(()=>{svg();snap()});
})();
