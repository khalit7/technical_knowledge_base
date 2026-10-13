// ---- Tool map: release and status timeline (events by year, animated; latest release by tool) ----
(function(){
  const M=window.MAP,D=M.D,$=M.$,esc=M.esc;
  const LANES=[['store','Stores and indexes'],['lexical','Lexical'],['embed','Embedding models'],['late','Late interaction'],['fw','Frameworks and RAG'],['graph','GraphRAG'],['eval','Evaluation']];
  const KIND={paper:['paper','var(--c1)'],release:['release','var(--c3)'],corp:['ownership or licence','var(--c4)'],status:['last release before a silence','var(--bad)']};
  const Y0=2016,Y1=2026;const YEARS=[];for(let y=Y0;y<=Y1;y++)YEARS.push(y);
  let view='ev',yi=YEARS.length-1,A=null;
  const tfrac=d=>{const t=Date.parse(d.length===7?d+'-15':d);return (t-Date.UTC(Y0,0,1))/(Date.UTC(Y1+1,0,1)-Date.UTC(Y0,0,1))};
  function evPlot(){
    const el=$('map-tl-plot'),W=M.width(el),lw=W<520?84:128,pr=10,lh=W<520?34:30,top=18,H=top+LANES.length*lh+8;
    const x=d=>lw+tfrac(d)*(W-lw-pr);
    let s='';
    YEARS.forEach(y=>{const xx=x(y+'-01-01');s+='<line class="map-ax" x1="'+xx+'" x2="'+xx+'" y1="'+top+'" y2="'+(H-6)+'"/>';if(W>=520||y%2===0)s+='<text class="map-axt" x="'+(xx+2)+'" y="12">'+(W<520?"'"+String(y).slice(2):y)+'</text>'});
    const upto=YEARS[yi];
    LANES.forEach((l,i)=>{const yy=top+i*lh+lh/2;s+='<text x="4" y="'+(yy+4)+'" font-size="'+(W<520?10.5:12)+'" fill="var(--mute)">'+esc(W<520?l[1].split(' ')[0]:l[1])+'</text><line class="map-ax" x1="'+lw+'" x2="'+(W-pr)+'" y1="'+yy+'" y2="'+yy+'"/>'});
    D.timeline.forEach((e,j)=>{const li=LANES.findIndex(l=>l[0]===e.lane);const yy=top+li*lh+lh/2;const yr=+e.d.slice(0,4);const on=yr<=upto,cur=yr===upto;
      s+='<circle cx="'+x(e.d).toFixed(1)+'" cy="'+yy+'" r="'+(cur?6:4.5)+'" fill="'+KIND[e.k][1]+'" opacity="'+(on?(cur?1:.55):.08)+'" stroke="var(--bg)" stroke-width="1" data-j="'+j+'" style="cursor:pointer"><title>'+esc(e.d+': '+e.t)+'</title></circle>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Timeline of retrieval tools and papers, 2016 to 2026">'+s+'</svg>';
    $('map-tl-leg').innerHTML=Object.values(KIND).map(k=>'<span><i style="background:'+k[1]+'"></i>'+esc(k[0])+'</span>').join('');
  }
  function agePlot(){
    const el=$('map-tl-plot'),W=M.width(el);
    const rows=D.atlas.map(a=>({a,d:a.date&&a.date.length>=7?a.date:null})).filter(r=>r.d).sort((p,q)=>p.d<q.d?-1:p.d>q.d?1:0);
    const lw=W<520?118:190,pr=12,rh=15,top=18,H=top+rows.length*rh+6,X0=2022;
    const x=d=>{const t=Date.parse(d.length===7?d+'-15':d);return lw+(t-Date.UTC(X0,0,1))/(Date.UTC(Y1+1,0,1)-Date.UTC(X0,0,1))*(W-lw-pr)};
    let s='';for(let y=X0;y<=Y1;y++){const xx=x(y+'-01-01');s+='<line class="map-ax" x1="'+xx+'" x2="'+xx+'" y1="'+top+'" y2="'+(H-4)+'"/><text class="map-axt" x="'+(xx+2)+'" y="12">'+y+'</text>'}
    const asof=x(D.asof);s+='<line x1="'+asof+'" x2="'+asof+'" y1="'+top+'" y2="'+(H-4)+'" stroke="var(--acc)" stroke-dasharray="3 3"/>';
    rows.forEach((r,i)=>{const yy=top+i*rh+rh/2,a=r.a,L=M.layerOf(a.layer),hollow=a.ver==='docs';
      const nm=a.name.length>(W<520?17:30)?a.name.slice(0,W<520?15:28)+'...':a.name;
      s+='<text x="4" y="'+(yy+4)+'" font-size="'+(W<520?10:11)+'" fill="'+(a.status==='quiet'?'var(--bad)':'var(--ink)')+'" data-id="'+a.id+'" style="cursor:pointer">'+esc(nm)+'</text>'+
        '<line x1="'+x(r.d)+'" x2="'+asof+'" y1="'+yy+'" y2="'+yy+'" stroke="'+L[3]+'" stroke-opacity=".35"/>'+
        '<circle cx="'+x(r.d).toFixed(1)+'" cy="'+yy+'" r="4" fill="'+(hollow?'var(--bg)':L[3])+'" stroke="'+L[3]+'" data-id="'+a.id+'" style="cursor:pointer"><title>'+esc(a.name+': '+a.ver+' '+a.date)+'</title></circle>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Latest release date for each tool in the atlas">'+s+'</svg>';
    $('map-tl-leg').innerHTML=M.LAYERS.map(l=>'<span><i style="background:'+l[3]+'"></i>'+esc(l[1])+'</span>').join('')+'<span><i style="border:1px solid var(--mute)"></i>hosted API: docs read date</span><span style="color:var(--bad)">red name: quiet</span>';
  }
  function draw(){if(view==='ev')evPlot();else agePlot()}
  function cap(i){yi=i;const y=YEARS[i];const ev=D.timeline.filter(e=>+e.d.slice(0,4)===y);
    $('map-tl-cap').innerHTML='<b>'+y+'</b> . '+(ev.length?ev.map(e=>esc(e.t)).join('; '):'no event recorded')+'.';if(view==='ev')evPlot()}
  function init(){
    $('map-tl-view').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('map-tl-view').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));view=b.dataset.m;
      $('map-tl-evctl').hidden=view!=='ev';draw()});
    $('map-tl-plot').addEventListener('click',e=>{const c=e.target.closest('[data-j],[data-id]');if(!c)return;
      if(c.dataset.j!=null){const ev=D.timeline[+c.dataset.j];$('map-tl-tip').innerHTML='<b>'+esc(ev.d)+'</b> . '+esc(ev.t)+' <span class="mute">('+esc(KIND[ev.k][0])+')</span> '+M.link('source',ev.src)}
      else{const a=M.byId[c.dataset.id];$('map-tl-tip').innerHTML='<b>'+esc(a.name)+'</b>: latest '+esc(a.ver==='docs'?'(docs read)':a.ver)+' on '+esc(a.date)+' . '+M.st(a.status)+' <a href="#" data-tool="'+a.id+'">open in the atlas</a>'}});
    A=M.anim({n:YEARS.length,draw:cap,ms:1500,play:'map-tl-play',back:'map-tl-back',fwd:'map-tl-fwd',scrub:'map-tl-scrub',speed:'map-tl-speed',card:'map-tl-card',autoplay:false});
    A.reset(YEARS.length,YEARS.length-1);
    M.onRender(draw);
  }
  init();
})();
