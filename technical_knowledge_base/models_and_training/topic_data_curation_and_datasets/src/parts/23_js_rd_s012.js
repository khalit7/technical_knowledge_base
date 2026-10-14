// ---- Reading tab: sections 0 to 2 (prediction drills, filter bars, corpus size chart) ----
(function(){
  const D=window.RDD,esc=RD.esc;
  // predict-then-reveal drills: every .pr in the Reading tab
  document.querySelectorAll('#t-read .pr').forEach(pr=>{
    const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.r==='1')x.classList.add('right')});
      if(b.dataset.r!=='1')b.classList.add('wrong');ans.hidden=false}));
  });
  // generic horizontal bars: rows [[name,value,(hl)]], max, fmt
  RD.bars=function(el,rows,max,fmt,col){
    el.innerHTML=rows.map(r=>'<div class="'+(r[2]?'hl':'')+'"><span class="nm">'+esc(r[0])+'</span><span class="tr"><span style="width:'+Math.max(0,Math.min(100,100*r[1]/max)).toFixed(1)+'%;background:'+(r[3]||col||'var(--acc)')+'"></span></span><span class="v">'+fmt(r[1])+'</span></div>').join('');
  };
  // DCLM Table 4
  const fb=document.getElementById('rd-filt-bars');
  if(fb)RD.bars(fb,D.filt.map(r=>[r[0],r[1],/fastText/.test(r[0]),/fastText/.test(r[0])?'var(--c3)':(/no model/.test(r[0])?'var(--dim)':'var(--acc)')]),32,v=>v.toFixed(1));

  // corpus size against year
  const host=document.getElementById('rd-lin-svg'),cap=document.getElementById('rd-lin-cap');
  if(!host)return;
  let mode='all',sel=-1;
  const col={web:'var(--c1)',mixed:'var(--c2)',pdf:'var(--c4)'};
  function fmtT(n){return n>=1e12?(n/1e12).toFixed(n>=1e13?0:1).replace(/\.0$/,'')+'T':(n/1e9).toFixed(0)+'B'}
  function draw(){
    const W=RD.width(host),H=W<500?300:330,L=46,R=W<500?10:20,T=14,B=30;
    const x=y=>L+(y-2019)/(2026.3-2019)*(W-L-R),lo=11,hi=Math.log10(3e14),y=t=>T+(hi-Math.log10(t))/(hi-lo)*(H-T-B);
    let s='';
    [1e11,1e12,1e13,1e14].forEach(t=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)"/>'+RD.t(L-4,y(t)+4,fmtT(t),{a:'end',fill:'var(--mute)'})});
    for(let yr=2019;yr<=2026;yr++){s+=RD.t(x(yr+0.5>2026.3?yr:yr+0.5),H-10,yr===2026?'':String(yr),{a:'middle',fill:'var(--mute)'})+'<line x1="'+x(yr)+'" x2="'+x(yr)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'}
    s+=RD.t(4,T+2,'tokens',{fill:'var(--mute)',fs:10});
    D.lin.forEach((c,i)=>{
      const on=mode==='all'||(mode==='web'&&c[3]==='web')||(mode==='sel'&&c[4]);
      const cx=x(c[1]),cy=y(c[2]),r=W<500?5:6;
      s+='<g data-i="'+i+'" style="cursor:pointer;opacity:'+(on?1:.18)+'"><circle cx="'+cx+'" cy="'+cy+'" r="'+(r+5)+'" fill="transparent"/>'+
        '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+col[c[3]]+'"'+(c[4]?' stroke="var(--c3)" stroke-width="3"':'')+(i===sel?' stroke="var(--ink)" stroke-width="2.5"':'')+'/>';
      if(W>=640||i===sel){const right=cx<W-130;s+=RD.t(right?cx+r+4:cx-r-4,cy+4,esc(c[0]),{a:right?'start':'end',fs:10.5,w:i===sel?600:400})}
      s+='</g>';
    });
    host.innerHTML=RD.svg(W,H,s,'Open pretraining corpora by year and size in tokens, log scale');
    host.querySelectorAll('g[data-i]').forEach(g=>g.addEventListener('click',()=>{sel=+g.dataset.i;draw();show()}));
  }
  function show(){const c=D.lin[sel];if(!c)return;
    cap.innerHTML='<div class="t">'+esc(c[0])+' &middot; '+fmtT(c[2])+' tokens &middot; '+Math.floor(c[1])+(c[4]?' &middot; kept only a top slice by a quality model':'')+'</div><p>'+esc(c[5])+' <a href="'+c[6]+'" target="_blank" rel="noopener noreferrer">source</a></p>'}
  RD.seg(document.getElementById('rd-lin-mode'),m=>{mode=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
