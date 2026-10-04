// ---- Benchmark atlas (t-atlas), part c: family x status map, defence lanes ----
(function(){
  const A=window.BENCH_ATLAS,AT=window.AT;if(!A||!AT)return;
  const R=A.rows,EN=A.enums,esc=AT.esc,$=id=>document.getElementById(id);
  const STO=['active','saturating','saturated','retired'];
  // ---- map ----
  const fams=Object.keys(EN.fam).filter(f=>R.some(r=>r.fam===f));
  function drawMap(){
    const m=$('at-map');m.style.gridTemplateColumns='minmax(6.5em,8.5em) repeat(4,minmax(0,1fr))';
    let h='<div class="hd"></div>'+STO.map(s=>'<div class="hd"><i class="sw" style="background:var(--s-'+s+')"></i>'+EN.st[s][0]+' <span style="font-weight:400">('+R.filter(r=>r.st===s&&AT.vis.has(r.id)).length+')</span></div>').join('');
    fams.forEach(f=>{h+='<div class="fl">'+esc(EN.fam[f])+'</div>';
      STO.forEach(s=>{const rs=R.filter(r=>r.fam===f&&r.st===s);
        h+='<div class="cell'+(rs.length?'':' empty')+'" data-st="'+EN.st[s][0]+'">'+rs.map(r=>'<button data-id="'+r.id+'" class="'+(AT.vis.has(r.id)?'':'dim')+(AT.cur===r.id?' sel':'')+'" style="border-color:var(--s-'+s+')" title="'+esc(r.n)+', '+r.yr+'">'+esc(r.n.replace(/ \(.*\)$/,''))+'</button>').join('')+'</div>'})});
    m.innerHTML=h}
  $('at-map').addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(b){AT.show(b.dataset.id,false);$('at-det').scrollIntoView({block:'start',behavior:'smooth'})}});
  // ---- defence lanes ----
  const CDO=Object.keys(EN.cd);
  function drawDef(){
    const box=$('at-def');const W=Math.max(300,Math.min(box.clientWidth||600,900));
    const y0=2008,y1=2027,pl=8,pr=8,x=y=>pl+(y-y0)/(y1-y0)*(W-pl-pr);
    const r=W<520?4:5,step=r*2+1.5;
    let svg='',yy=6;
    CDO.forEach(cd=>{const rs=R.filter(o=>o.cd.indexOf(cd)>=0);
      const by={};rs.forEach(o=>{(by[o.yr]=by[o.yr]||[]).push(o)});
      const maxs=Math.max(1,...Object.values(by).map(a=>a.length));
      // wrap tall stacks into two columns per year when needed
      const cols=maxs>10?2:1,hgt=Math.ceil(maxs/cols)*step+4;
      svg+='<text x="'+pl+'" y="'+(yy+11)+'" font-weight="600">'+esc(EN.cd[cd][0])+'</text><text x="'+(W-pr)+'" y="'+(yy+11)+'" text-anchor="end" fill="var(--mute)">'+rs.length+' rows, '+rs.filter(o=>o.st==='active').length+' active</text>';
      const base=yy+16+hgt;
      svg+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+(base+2)+'" y2="'+(base+2)+'" stroke="var(--line)"/>';
      Object.keys(by).forEach(yr=>{by[yr].sort((a,b)=>STO.indexOf(a.st)-STO.indexOf(b.st)).forEach((o,i)=>{
        const c=i%cols,k=Math.floor(i/cols);const cx=x(+yr+0.5)+(cols>1?(c?r+0.8:-r-0.8):0),cy=base-r-k*step;
        svg+='<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+r+'" fill="var(--s-'+o.st+')" stroke="'+(o.cont?'var(--bad)':(AT.cur===o.id?'var(--ink)':'var(--bg)'))+'" stroke-width="'+(o.cont||AT.cur===o.id?2:1)+'" opacity="'+(AT.vis.has(o.id)?1:0.18)+'" data-id="'+o.id+'" style="cursor:pointer"><title>'+esc(o.n)+', '+o.yr+', '+EN.st[o.st][0]+'</title></circle>'})});
      yy=base+10});
    // axis
    const ticks=W<520?[2010,2014,2018,2022,2026]:[2009,2012,2015,2018,2020,2022,2024,2026];
    svg+=ticks.map(t=>'<text x="'+x(t+0.5).toFixed(1)+'" y="'+(yy+8)+'" text-anchor="middle" fill="var(--mute)">'+t+'</text>').join('');
    box.innerHTML='<svg viewBox="0 0 '+W+' '+(yy+14)+'" width="'+W+'" height="'+(yy+14)+'" role="img" aria-label="Benchmarks by contamination defence and year, coloured by status">'+svg+'</svg>';
    // stats: share active, median year, per lane
    $('at-def-stats').innerHTML=CDO.map(cd=>{const rs=R.filter(o=>o.cd.indexOf(cd)>=0);const ys=rs.map(o=>o.yr).sort((a,b)=>a-b);const med=ys.length?ys[Math.floor((ys.length-1)/2)]:'';
      const act=rs.filter(o=>o.st==='active').length;
      return '<div class="stat"><div class="k">'+esc(EN.cd[cd][0])+'</div><div class="v">'+(rs.length?Math.round(100*act/rs.length):0)+'% active</div><div class="d">'+act+' of '+rs.length+' rows; median year '+med+'</div></div>'}).join('');
  }
  $('at-def-leg').innerHTML=STO.map(s=>'<span><i class="sw" style="background:var(--s-'+s+')"></i>'+EN.st[s][0]+'</span>').join('')+'<span><i class="sw" style="background:var(--bg);border:2px solid var(--bad)"></i>contamination documented</span>';
  $('at-def').addEventListener('click',e=>{const c=e.target.closest('[data-id]');if(c){AT.show(c.getAttribute('data-id'),false);$('at-def-tip').textContent='Opened '+AT.byId[c.getAttribute('data-id')].n+' in the grid above.';$('at-det').scrollIntoView({block:'start',behavior:'smooth'})}});
  function all(){drawMap();drawDef()}
  AT.listeners.push(all);
  window.TAB_RENDER=window.TAB_RENDER||{};(window.TAB_RENDER['t-atlas']=window.TAB_RENDER['t-atlas']||[]).push(all);
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(!$('t-atlas').hidden)drawDef()},120)});
  all();
})();
