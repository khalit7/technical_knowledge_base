// ---- Who gets the growth: labour income = labour share x GDP, Anthropic's 2030 scenarios ----
(function(){
  const card=$('v-econ');if(!card)return;
  const BASE=44.4/1.324; // no-AI 2030 GDP, $T (derived)
  const S={none:{g:0,l:60.0,u:3.8,tl:0,tk:0,n:'No AI'},modest:{g:1.6,l:59.4,u:3.9,tl:0.6,tk:3.1,n:'Modest'},subst:{g:8.3,l:56.1,u:4.6,tl:1.4,tk:18.9,n:'Substantial'},extreme:{g:32.4,l:45.2,u:11.9,tl:0.5,tk:81.4,n:'Extreme'}};
  let preset='extreme';
  const pct=v=>(v>=0?'+':'')+v.toFixed(1)+'%';
  function draw(){const g=+$('ecG').value,l=+$('ecL').value;$('ecGv').textContent=g.toFixed(1)+'%';$('ecLv').textContent=l.toFixed(1)+'%';
    const el=$('ecSvg'),narrow=(el.clientWidth||340)<560,w=narrow?Math.max(300,Math.round(el.clientWidth||340)):760,lw=narrow?70:110,top=8,bh=30;
    const max=1.42,X=v=>(w-lw-10)*v/max;let s='';
    const row=(y,lab,gdp,share)=>{const L=gdp*share/100,K=gdp*(1-share/100);
      s+='<text x="'+(lw-8)+'" y="'+(y+bh/2-2)+'" font-size="12" text-anchor="end">'+lab+'</text><text x="'+(lw-8)+'" y="'+(y+bh/2+12)+'" font-size="11" text-anchor="end" fill="var(--mute)">$'+(BASE*gdp).toFixed(1)+'T</text>';
      s+='<rect x="'+lw+'" y="'+y+'" width="'+X(L)+'" height="'+bh+'" fill="var(--c1)"/><rect x="'+(lw+X(L))+'" y="'+y+'" width="'+X(K)+'" height="'+bh+'" fill="var(--c5)"/>';
      const lt=narrow?share.toFixed(1)+'%':'labour '+share.toFixed(1)+'%',kt=narrow?(100-share).toFixed(1)+'%':'capital '+(100-share).toFixed(1)+'%';
      if(X(L)>60)s+='<text x="'+(lw+6)+'" y="'+(y+bh/2+4)+'" font-size="11.5" fill="var(--bg)">'+lt+'</text>';
      if(X(K)>60)s+='<text x="'+(lw+X(L)+6)+'" y="'+(y+bh/2+4)+'" font-size="11.5" fill="var(--bg)">'+kt+'</text>'};
    row(top,'No AI',1,60);row(top+bh+14,'Scenario',1+g/100,l);
    const yl=top+2*bh+18,xl=lw+X(0.6);
    s+='<line x1="'+xl+'" x2="'+xl+'" y1="'+top+'" y2="'+(yl+6)+'" stroke="var(--ink)" stroke-dasharray="3 3"/><text x="'+xl+'" y="'+(yl+18)+'" font-size="11" text-anchor="middle" fill="var(--mute)">no-AI labour income</text>';
    el.innerHTML=svgEl(w,yl+24,s,'No-AI economy against the scenario, split between labour and capital')+'<div class="lgd"><span><i style="background:var(--c1)"></i>labour income</span><span><i style="background:var(--c5)"></i>capital income</span><span>bar length = GDP, to scale</span></div>';
    const dl=l*(1+g/100)/60*100-100,dk=(100-l)*(1+g/100)/40*100-100,p=Object.values(S).find(q=>Math.abs(q.g-g)<0.05&&Math.abs(q.l-l)<0.05);const isP=!!p;
    $('ecOut').innerHTML=stat('Labour income vs no AI',pct(dl),isP?'Table 3: '+pct(p.tl):'share x GDP / 0.60')+stat('Capital income vs no AI',pct(dk),isP?'Table 3: '+pct(p.tk):'(1 - share) x GDP / 0.40')+
      stat('Share of GDP moved to capital',(60-l).toFixed(1)+' points','60% minus the labour share')+stat('Unemployment, all workers',isP?p.u.toFixed(1)+'%':'not modelled here',isP?'Table 3 ('+p.n.toLowerCase().replace('no ai','no AI')+')':'pick a scenario')}
  const seg=$('ecS');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});preset=b.dataset.m;$('ecG').value=S[preset].g;$('ecL').value=S[preset].l;draw()}));
  ['ecG','ecL'].forEach(id=>$(id).addEventListener('input',()=>{seg.querySelectorAll('button').forEach(x=>{const q=S[x.dataset.m];const on=Math.abs(q.g-+$('ecG').value)<0.05&&Math.abs(q.l-+$('ecL').value)<0.05;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on?'true':'false')});draw()}));
  let rw=card.clientWidth;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,draw);draw();
})();
