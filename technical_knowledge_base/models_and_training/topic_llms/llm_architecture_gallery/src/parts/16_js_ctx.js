// ---- Cache at context: memory per request against context, across models ----
(function(){
  if(!$('t-ctx'))return;
  const R=GAL.filter(r=>r.mix&&r.per);
  const DEF=['Llama 3.1 70B','Gemma 3 27B','GPT-OSS 120B','DeepSeek V3','Qwen3 Next 80B-A3B','Kimi Linear 48B-A3B'];
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--ink)','var(--mute)'];
  let on=DEF.slice();
  function mem(r,T,b,credit,state){let s=0;[...r.mix].forEach(m=>{const p=r.per[m]||0;s+=p*(credit&&m==='S'&&r.W?Math.min(T,r.W):T)});s*=(r.passes||1)*b/2;
    if(state&&r.st){s+=[...r.mix].filter(m=>m==='L').length*r.st*b}return s}
  function chips(){$('ctxM').innerHTML=R.map(r=>'<button data-n="'+r.n+'"'+(on.includes(r.n)?' class="on"':'')+'>'+r.n+'</button>').join('');
    $('ctxM').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const n=b.dataset.n;if(on.includes(n))on=on.filter(x=>x!==n);else{on.push(n);if(on.length>8)on.shift()}chips();go()}))}
  ['ctxT','ctxN','ctxG','ctxB','ctxW','ctxS'].forEach(i=>$(i).addEventListener('input',go));
  function go(){const T=Math.round(2**+$('ctxT').value),N=+$('ctxN').value,Gb=+$('ctxG').value,b=+$('ctxB').value,cw=$('ctxW').checked,cs=$('ctxS').checked;
    $('ctxTv').textContent=fmt(T)+' tokens';$('ctxNv').textContent=N;$('ctxGv').textContent=Gb+' GiB';
    const W=Math.max(320,Math.min(860,($('ctxPlot').clientWidth||800))),H=320,pl=58,pr=12,pt=12,pb=34,lg=Math.log10;
    const xa=1024,xb=1048576,ya=MiB,yb=1024*GiB,X=v=>pl+(W-pl-pr)*(lg(v)-lg(xa))/(lg(xb)-lg(xa)),Y=v=>pt+(H-pt-pb)*(1-(lg(Math.min(yb,Math.max(ya,v)))-lg(ya))/(lg(yb)-lg(ya)));
    let s='';[[MiB,'1 MiB'],[16*MiB,'16 MiB'],[256*MiB,'256 MiB'],[4*GiB,'4 GiB'],[64*GiB,'64 GiB'],[1024*GiB,'1 TiB']].forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    [[1024,'1K'],[8192,'8K'],[32768,'32K'],[131072,'128K'],[524288,'512K'],[1048576,'1M']].forEach(([v,l])=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(H-pb)+'" y2="'+(H-pb+4)+'" stroke="var(--mute)"/><text x="'+X(v)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-3)+'" font-size="11" text-anchor="middle" fill="var(--mute)">context per request (tokens, log)</text><text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">cache per request (log)</text>';
    s+='<line x1="'+X(T)+'" x2="'+X(T)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--ink)" stroke-dasharray="3 3" opacity=".6"/>';
    const sel=on.map(n=>R.find(r=>r.n===n)).filter(Boolean),ends=[];
    sel.forEach((r,i)=>{const c=COL[i%COL.length];let d='',dg='';for(let j=0;j<=48;j++){const t=xa*2**(j*10/48);d+=(j?'L':'M')+X(t).toFixed(1)+' '+Y(mem(r,t,b,cw,cs)).toFixed(1);dg+=(j?'L':'M')+X(t).toFixed(1)+' '+Y(mem(r,t,b,false,false)).toFixed(1)}
      if((cw&&/S/.test(r.mix))||(cs&&r.st))s+='<path d="'+dg+'" fill="none" stroke="'+c+'" stroke-width="1.2" stroke-dasharray="5 4" opacity=".7"/>';
      s+='<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2.2"/>';
      if(r.ctx&&r.ctx>=xa&&r.ctx<=xb)s+='<circle cx="'+X(r.ctx).toFixed(1)+'" cy="'+Y(mem(r,r.ctx,b,cw,cs)).toFixed(1)+'" r="3.5" fill="'+c+'"><title>'+r.n+': max positions '+fmt(r.ctx)+'</title></circle>';
      ends.push({y:Y(mem(r,xb,b,cw,cs)),c,n:r.n.replace(/ \d+(\.\d+)?[BT](-A[\d.]+B)?$/,''),how:r.n})});
    const lx=W-pr-4;let last=-99;ends.sort((a,b)=>a.y-b.y).forEach(e=>{e.ly=Math.max(e.y-6,last+12);last=e.ly;s+='<text x="'+lx+'" y="'+e.ly.toFixed(1)+'" font-size="10.5" text-anchor="end" fill="'+e.c+'">'+e.n+'</text>'});
    $('ctxPlot').innerHTML=svgEl(W,H,s,'Cache per request against context')+'<div class="leg"><span><i style="background:var(--ink)"></i>solid: as configured above</span><span><i style="background:repeating-linear-gradient(90deg,var(--mute) 0 4px,transparent 4px 7px)"></i>dashed: gallery convention (windows not credited, no state)</span></div>';
    let h='<thead><tr><th>Model</th><th class="num">Headline / token</th><th class="num">Per request</th><th class="num">Effective / token</th><th class="num">× '+N+' requests</th><th class="num">Requests in '+Gb+' GiB</th></tr></thead><tbody>';
    sel.forEach((r,i)=>{const m=mem(r,T,b,cw,cs),fit=Math.floor(Gb*GiB/m);h+='<tr><td><span class="sw" style="background:'+COL[i%COL.length]+'"></span>'+r.n+'</td><td class="num">'+fmtBytes(r.kv*b/2)+'</td><td class="num"><b>'+fmtBytes(m)+'</b></td><td class="num">'+fmtBytes(m/T)+'</td><td class="num">'+fmtBytes(m*N)+'</td><td class="num">'+(fit>=1e6?'over a million':fmt(fit))+'</td></tr>'});
    $('ctxTab').innerHTML=h+'</tbody>'}
  chips();onTab('t-ctx',go);
  let rw=0;addEventListener('resize',()=>{const w=$('ctxPlot').clientWidth;if(w&&Math.abs(w-rw)>40){rw=w;go()}});
})();
