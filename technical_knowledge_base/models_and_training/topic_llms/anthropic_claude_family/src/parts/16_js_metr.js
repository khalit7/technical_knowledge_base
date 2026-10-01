// ---- Task length tab (METR time horizons) ----
(function(){
  const D=METR.map(a=>({n:a[0],d:new Date(a[1]+'T00:00:00Z'),ds:a[1],p:a[2],lo:a[3],hi:a[4],sota:!!a[5],cl:/^Claude/.test(a[0])}));
  let set='sota23';
  const sel=r=>{const long=$('mtLong').checked;if(!long&&r.p>960)return false;
    if(set==='sota23')return r.sota&&r.d.getUTCFullYear()>=2023;if(set==='sota')return r.sota;if(set==='all23')return r.d.getUTCFullYear()>=2023;return r.cl};
  const day=t=>t/864e5;
  function fit(pts){const xs=pts.map(r=>day(+r.d)),ys=pts.map(r=>Math.log2(r.p)),n=xs.length;if(n<2)return null;
    const mx=xs.reduce((a,b)=>a+b)/n,my=ys.reduce((a,b)=>a+b)/n;let sxy=0,sxx=0;xs.forEach((x,i)=>{sxy+=(x-mx)*(ys[i]-my);sxx+=(x-mx)**2});const b=sxy/sxx;return {b,a:my-b*mx,dbl:1/b,n}}
  const fmtMin=m=>m<1?Math.round(m*60)+' s':m<60?m.toFixed(m<10?1:0)+' min':(m/60).toFixed(m<600?1:0)+' h';
  function draw(){
    const pts=D.filter(sel),F=fit(pts);
    const narrow=$('mtSvg').clientWidth<560,W=narrow?380:860,H=narrow?360:400;
    const t0=Date.UTC(2019,0,1),t1=Date.UTC(2026,11,31);
    const fr=logFrame({W,H,pl:52,pr:14,pt:14,pb:36,x:[t0,t1],xlin:true,y:[0.02,4000],
      yt:[[0.1,'6 s'],[1,'1 min'],[10,'10 min'],[60,'1 h'],[480,'8 h'],[960,'16 h']],xt:[2019,2020,2021,2022,2023,2024,2025,2026].map(y=>[Date.UTC(y,0,1),String(y)]),yl:'50% time horizon (log)'});
    let s=fr.s;
    if(F){const xa=Math.max(t0,Math.min(...pts.map(r=>+r.d))),xb=t1,yA=2**(F.a+F.b*day(xa)),yB=2**(F.a+F.b*day(xb));
      s+='<line x1="'+fr.lx(xa)+'" x2="'+fr.lx(xb)+'" y1="'+fr.ly(Math.max(0.02,yA))+'" y2="'+fr.ly(Math.min(4000,yB))+'" stroke="var(--acc)" stroke-width="1.6" stroke-dasharray="5 4"/>'}
    D.forEach(r=>{const x=fr.lx(+r.d),y=fr.ly(r.p),on=sel(r),c=r.cl?'var(--c2)':'var(--mute)';
      s+='<line x1="'+x+'" x2="'+x+'" y1="'+fr.ly(Math.max(0.02,r.lo))+'" y2="'+fr.ly(Math.min(4000,r.hi))+'" stroke="'+c+'" stroke-opacity="'+(on?.55:.18)+'"/>';
      s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(r.cl?5:3.8)+'" fill="'+(on?c:'var(--bg)')+'" stroke="'+c+'" stroke-opacity="'+(on?1:.5)+'"><title>'+r.n+' ('+r.ds+'): '+fmtMin(r.p)+', 95% CI '+fmtMin(r.lo)+' to '+fmtMin(r.hi)+(r.sota?', record when released':'')+'</title></circle>';
      const DY={'Claude 3.5 Sonnet (Oct)':-8,'Claude Opus 4':-8,'Claude 3.5 Sonnet (Jun)':10,'Claude Opus 4.6':2,'Claude Mythos Preview (early)':-4};
      if(r.cl&&r.n!=='Claude Opus 4.1'&&(!narrow||/4\.6|Mythos|3 Opus|3\.7/.test(r.n)))s+='<text x="'+(x-7)+'" y="'+(y+4+(DY[r.n]||0))+'" font-size="10" text-anchor="end" fill="var(--ink)">'+r.n.replace('Claude ','').replace(' (early)','').replace('Opus 4','Opus 4, 4.1').replace('Opus 4, 4.1.','Opus 4.')+'</text>'});
    $('mtSvg').innerHTML=svgEl(W,H,s,'METR 50% time horizon by release date');
    $('mtStats').innerHTML=F?stat('Doubling time of the fit',fmt(F.dbl,1)+' days','about '+(F.dbl/30.44).toFixed(1)+' months')+stat('Points in the fit',String(F.n),'filled dots')+stat('Longest Claude horizon','Mythos Preview, '+fmtMin(1044.8),'95% CI 8.5 h to 55 h; above METR\'s 16 h cut-off'):'';
    const long=$('mtLong').checked;
    $('mtRep').innerHTML=set==='sota23'&&!long?'Defaults reproduce METR\'s stated doubling time of 128.744 days ("from 2023 on", record-setting points, horizons up to 16 h) <b>independently</b>, from its raw data: '+fmt(F.dbl,3)+' days.':
      set==='sota'&&!long?'Reproduces METR\'s all-time stitched figure of 187.778 days independently: '+fmt(F.dbl,3)+' days.':
      set==='claude'?'Claude models alone double faster than the field, every '+fmt(F.dbl,0)+' days, because the family started below the frontier in 2024 (3 Opus at 4 minutes) and led it by 2026. A fit over 8 or 9 points of one family is fragile.':'A different point set gives a different trend; METR\'s own choice is the first button.';
    $('mtTab').innerHTML='<tr><th>Claude model</th><th>Released</th><th class="num">50% horizon</th><th class="num">95% CI</th><th>Record?</th></tr>'+D.filter(r=>r.cl).sort((a,b)=>a.d-b.d).map(r=>'<tr><td>'+r.n.replace('Claude ','')+'</td><td>'+r.ds+'</td><td class="num">'+fmtMin(r.p)+'</td><td class="num">'+fmtMin(r.lo)+' to '+fmtMin(r.hi)+'</td><td>'+(r.sota?'yes':'')+'</td></tr>').join('');
  }
  segBind('mtSet',m=>{set=m;draw()});$('mtLong').addEventListener('change',draw);onTab('t-metr',draw);
})();
