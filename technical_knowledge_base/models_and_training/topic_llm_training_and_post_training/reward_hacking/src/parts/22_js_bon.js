// ---- Reading, "The curve": Gao et al. Table 2, one prompt under best-of-n (real scores) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('bx')||!window.RHD)return;
  const D=RHD.BON_EX,N=D.length;
  const cap=[
    ['n = 1: one sample','With a single sample there is nothing to choose: a rambling answer about mussels and clams. Both scores are negative (below the average of the starting policy).'],
    ['n = 3: the proxy prefers a fluent guess','Best of 3 by the proxy: a sentence about a pipe. Proxy up, gold up a little.'],
    ['n = 10: the right answer','"A sponge". Gold peaks here at +0.48. The proxy likes it too, but not as much as it will like later answers.'],
    ['n = 30: proxy up, gold down','A confident sentence that misreads the riddle. The proxy rises to 0.65; the gold falls below zero.'],
    ['n = 100 to 1,000: fluent and wrong','Ten times more samples buy a fluent paragraph about tornadoes. The proxy is at 0.90; the gold is at −0.34, worse than n = 3.'],
    ['n = 3,000 to 10,000','A bore hole: plausible, still not the riddle\'s answer. The proxy barely moves; the gold recovers to +0.27.'],
    ['n = 30,000','A pothole, "a structural vulnerability that allows water to penetrate". Proxy 0.95, its highest; gold 0.55, a defensible answer. At every step the proxy rose; the gold went up and down.']];
  function draw(i){
    const box=$('bxSvg'),W=RD.width(box),H=Math.round(Math.min(230,Math.max(170,W*.34))),ml=34,mr=12,mt=10,mb=30;
    const x=k=>ml+(W-ml-mr)*k/(N-1),ymin=-0.6,ymax=1.0,y=v=>mt+(H-mt-mb)*(ymax-v)/(ymax-ymin);
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Proxy and gold score of the chosen answer as n grows">';
    for(let v=-0.5;v<=1.0001;v+=0.5)s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="'+(Math.abs(v)<1e-9?'var(--mute)':'var(--line)')+'"/><text x="'+(ml-5)+'" y="'+(y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v.toFixed(1)+'</text>';
    D.forEach((d,k)=>{const lab=d.n.replace(' to ','-').replace(/,000/g,'k');s+='<text x="'+x(k)+'" y="'+(H-12)+'" font-size="10" text-anchor="middle" fill="'+(k===i?'var(--ink)':'var(--mute)')+'">'+(W<480&&k%2&&k!==i?'':lab)+'</text>'});
    s+='<text x="'+(W-mr)+'" y="'+(H-1)+'" font-size="10" text-anchor="end" fill="var(--mute)">n (samples, best kept by the proxy)</text>';
    const pl=(key,n)=>D.slice(0,n+1).map((d,k)=>(k?'L':'M')+x(k).toFixed(1)+' '+y(d[key]).toFixed(1)).join('');
    s+='<path d="'+pl('proxy',i)+'" fill="none" stroke="var(--c2)" stroke-width="2.4" stroke-dasharray="6 4"/>';
    s+='<path d="'+pl('gold',i)+'" fill="none" stroke="var(--c3)" stroke-width="2.6"/>';
    for(let k=0;k<=i;k++){s+='<circle cx="'+x(k)+'" cy="'+y(D[k].proxy)+'" r="'+(k===i?4.5:3)+'" fill="var(--c2)" stroke="var(--bg)"/><circle cx="'+x(k)+'" cy="'+y(D[k].gold)+'" r="'+(k===i?4.5:3)+'" fill="var(--c3)" stroke="var(--bg)"/>'}
    box.innerHTML='<div class="lg"><span><i style="background:var(--c2)"></i>proxy score (12M reward model, what BoN maximises)</span><span><i style="background:var(--c3)"></i>gold score (6B reward model, standing in for people)</span></div>'+s+'</svg>';
    const d=D[i];$('bxT').textContent=cap[i][0];$('bxP').textContent=cap[i][1];
    const best=D.slice(0,i+1).reduce((a,b)=>b.gold>a.gold?b:a,D[0]);
    $('bxN').innerHTML=RD.stat('Answer picked','<span style="font-size:14px;font-weight:500">'+RD.esc(d.ans)+'</span>','n = '+d.n)+
      RD.stat('Proxy score',(d.proxy>=0?'+':'')+d.proxy.toFixed(2),'')+RD.stat('Gold score',(d.gold>=0?'+':'')+d.gold.toFixed(2),'best so far '+(best.gold>=0?'+':'')+best.gold.toFixed(2)+' at n = '+best.n);
  }
  const an=RD.anim({card:'bx',ctl:'bxC',n:N,start:N-1,draw,ms:1500,label:'Best-of-n step'});
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>an.redraw(),120)});
})();
