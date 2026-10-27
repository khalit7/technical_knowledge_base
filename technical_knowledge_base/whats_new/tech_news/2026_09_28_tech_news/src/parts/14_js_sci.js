// ---- What a checkable result cost: dollars per result on a log axis ----
(function(){
  const card=$('v-sci');if(!card)return;
  const R=[
    {n:'Nine loops, either route',lo:1000,hi:2000,c:'var(--c1)',wk:'this week'},
    {n:'Bootstrap compute',lo:100,hi:100,c:'var(--c6)',wk:'part of a route',approx:true},
    {n:'Navier-Stokes swarm',lo:2e6,hi:22.5e6,c:'var(--c2)',wk:'last week',ns:true}];
  function lab(v){return v>=1e6?'$'+(v/1e6)+'m':v>=1e3?'$'+(v/1e3)+'k':'$'+v}
  function draw(){
    const ns=$('sciNS').checked,rows=R.filter(r=>ns||!r.ns);
    const box=$('sciSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<560;
    const pl=narrow?8:190,pr=26,rh=narrow?50:36,top=10,H=top+rows.length*rh+40;
    const x0=10,x1=ns?1e8:1e4,lg=Math.log10,X=v=>pl+(W-pl-pr)*(lg(v)-lg(x0))/(lg(x1)-lg(x0));
    let s='';
    for(let e=1;e<=lg(x1);e++){const v=10**e,x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+top+'" y2="'+(H-34)+'" stroke="var(--line)"/>';
      if(!narrow||e%2===0||!ns)s+='<text x="'+x+'" y="'+(H-20)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+lab(v)+'</text>'}
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-5)+'" font-size="11" text-anchor="middle" fill="var(--mute)">dollars per checked result (log scale)</text>';
    rows.forEach((r,i)=>{const y=top+i*rh+(narrow?30:rh/2);
      const ty=narrow?y-14:y+4;
      s+='<text x="'+(narrow?pl:pl-8)+'" y="'+ty+'" font-size="12" text-anchor="'+(narrow?'start':'end')+'">'+r.n+' <tspan fill="var(--mute)" font-size="11">('+r.wk+')</tspan></text>';
      const a=X(r.lo),b=X(r.hi);
      if(r.hi>r.lo){s+='<rect x="'+a+'" y="'+(y-6)+'" width="'+Math.max(3,b-a)+'" height="12" rx="3" fill="'+r.c+'" opacity=".85"/>'}
      else s+='<circle cx="'+a+'" cy="'+y+'" r="6" fill="'+r.c+'"/>';
      const t=(r.approx?'about ':'')+lab(r.lo)+(r.hi>r.lo?' to '+lab(r.hi):'');
      const right=b+10+t.length*6.2<W-pr;
      s+='<text x="'+(right?b+10:a-10)+'" y="'+(y+4)+'" font-size="11.5" text-anchor="'+(right?'start':'end')+'" fill="var(--ink)">'+t+'</text>'});
    box.innerHTML=svgEl(W,H,s,'Cost per checked result');
    const st=$('sciStats');
    if(ns){const lo=Math.log10(2e6/2000),hi=Math.log10(22.5e6/1000),hc=Math.log10(22.5e6/100);
      st.innerHTML=stat('Route against swarm, smallest gap',lo.toFixed(1)+' orders','$2m / $2,000 = 1,000x')+stat('Route against swarm, largest gap',hi.toFixed(2)+' orders','$22.5m / $1,000 = 22,500x')+stat('Only against the $100 compute part',hc.toFixed(2)+' orders','$22.5m / $100: how "five" is reached')}
    else st.innerHTML=stat('Compute share of the bootstrap route','5% to 10%','$100 / ($1,000 to $2,000)')+stat('The same result','two routes','computed independently, Dixon verified');
  }
  $('sciNS').addEventListener('change',draw);
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth;if(w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,draw);
})();
