// ---- Figures of the Reading tab (prefix du): the hero (per-token jitter on one layer), token 1's estimate, the compute per
// update, the gap to backprop, Tables 1 and 2, the model-size gaps and the cosines at 16k. Data: window.ARTICLE.fig
// (written by src/recompute.py) and window.ARTICLE.toy (written by src/toy/record.mjs). All drawn at the card's width.
(function(){
  if(!window.RD||!window.ARTICLE||!window.ARTICLE.fig)return;
  const $=id=>document.getElementById(id),t=RD.t,F=window.ARTICLE.fig,TY=window.ARTICLE.toy;
  const fmt=(n,d)=>Number(n).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const sg=(n,d)=>(n>0?'+':n<0?'−':'')+Math.abs(n).toFixed(d==null?3:d);
  const line=(x1,y1,x2,y2,c,w,da)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+c+'" stroke-width="'+(w||1)+'"'+(da?' stroke-dasharray="'+da+'"':'')+'/>';
  const rect=(x,y,w,h,f,o)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" fill="'+f+'"'+(o||'')+'/>';
  const dot=(x,y,r,f,s)=>'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r+'" fill="'+f+'"'+(s?' stroke="'+s+'" stroke-width="1.6"':'')+'/>';
  const D='var(--c4)',GR='var(--mute)',INK='var(--ink)',LN='var(--line)';
  const th=(x,y,str,o)=>t(x,y,str,o).replace('<text ','<text paint-order="stroke" stroke="var(--card)" stroke-width="4" stroke-linejoin="round" ');  // a label with a halo, readable over lines

  // ---------- hero: six tokens, one draw ----------
  function hero(){const el=$('du-hero-svg');if(!el)return;const W=RD.width(el),nar=W<480,lw=nar?84:118,x0=lw,x1=W-6,n=6,cw=(x1-x0)/n;
    const words=['The','cat','sat','on','the','mat'],r=window.DUT?window.DUT.rng(7):null,nz=()=>r?r.n():0;
    const rows=[['input xₜ','stored by the forward'],['output yₜ + σaₜ','own noise per token'],['loss change','scores that token only'],['estimate ĝₜ','mean over K draws']];
    const rh=nar?50:54,top=26,H=top+rows.length*rh+(nar?108:86);let s='';
    words.forEach((w,i)=>{s+=t(x0+cw*(i+.5),16,w,{fs:12.5,a:'middle',fill:INK,w:600})});
    rows.forEach((rw,k)=>{const y=top+k*rh;s+=t(2,y+20,rw[0],{fs:12.5,fill:k===1||k===3?D:INK,w:600})+t(2,y+36,rw[1],{fs:11,fill:GR});
      s+=line(x0,y+rh-4,x1,y+rh-4,LN,1)});
    const cells=4,cs=Math.min(10,(cw-10)/cells);
    words.forEach((w,i)=>{const cx=x0+cw*(i+.5),bx=cx-cells*cs/2;
      for(let j=0;j<cells;j++){const v=nz();s+=rect(bx+j*cs,top+12,cs-1.5,cs*1.6,GR,' opacity="'+(0.35+0.15*Math.abs(Math.sin(i*3+j)))+'"');
        s+=rect(bx+j*cs,top+rh+12+(v<0?0:-Math.min(10,v*6)),cs-1.5,Math.min(10,Math.abs(v)*6)+2,D,' opacity="0.85"')}
      const dl=nz()*0.8,y2=top+2*rh+24;s+=line(cx-12,y2,cx+12,y2,LN,1)+rect(cx-6,dl<0?y2:y2-Math.min(14,Math.abs(dl)*12),12,Math.min(14,Math.abs(dl)*12),dl<0?'var(--c3)':'var(--c2)');
      const a=nz()*0.5,y3=top+3*rh+24;s+=line(cx-10,y3+5*a,cx+10,y3-5*a,D,2.4)+dot(cx+10,y3-5*a,2.6,D)});
    const yb=top+rows.length*rh+8;
    s+='<rect x="'+x0+'" y="'+yb+'" width="'+(x1-x0)+'" height="52" rx="8" fill="none" stroke="'+D+'" stroke-width="1.4"/>';
    s+=t(x0+10,yb+20,'weight update Ĝ = Σₜ ĝₜ xₜᵀ',{fs:13,fill:D,w:600})+t(x0+10,yb+40,nar?'backprop’s outer product, measured error':'the outer product backprop forms; only the error is measured',{fs:11.5,fill:GR});
    s+=t(2,yb+20,'one update',{fs:12,fill:INK,w:600})+t(2,yb+38,'per layer',{fs:11,fill:GR});
    s+=t(nar?2:x0,yb+74,nar?'Weight-space ES instead: one noisy copy of W per':'Weight-space ES instead: one noisy copy of W per pass, one reward for the batch',{fs:11.5,fill:GR});
    if(nar)s+=t(2,yb+92,'pass, one reward for the whole batch',{fs:11.5,fill:GR});
    el.innerHTML=RD.svg(W,H,s,'Per-token jitter of one layer over six tokens, scored by each token’s own loss change')}

  // ---------- token 1's estimate against the exact error ----------
  function tok(){const el=$('du-tok-tab');if(!el||!TY||!TY.tok0)return;const ks=[[16,4],[256,8],[4096,12]],ex=TY.tok0.exact;
    let h='<table class="du-tab"><thead><tr><th>Entry</th><th class="n">exact</th>'+ks.map(k=>'<th class="n">K = '+fmt(k[0])+'</th>').join('')+'</tr></thead><tbody>';
    for(let j=0;j<4;j++)h+='<tr><td>'+(j+1)+'</td><td class="n"><b>'+sg(ex[j])+'</b></td>'+ks.map(k=>'<td class="n">'+sg(TY.tok0.est[k[1]][j])+'</td>').join('')+'</tr>';
    const cs=ks.map(k=>{const e=TY.tok0.est[k[1]];let ab=0,aa=0,bb=0;for(let j=0;j<4;j++){ab+=e[j]*ex[j];aa+=e[j]*e[j];bb+=ex[j]*ex[j]}return ab/Math.sqrt(aa*bb)});
    h+='<tr><td>cosine (4 entries)</td><td class="n">1</td>'+cs.map(c=>'<td class="n">'+c.toFixed(2)+'</td>').join('')+'</tr></tbody></table>';el.innerHTML=h}

  // ---------- log axis helper ----------
  const L10=Math.log10;
  function logX(v,a,b,x0,x1){return x0+(L10(v)-L10(a))/(L10(b)-L10(a))*(x1-x0)}

  // ---------- compute per update ----------
  function cost(){const el=$('du-cost-svg');if(!el)return;const W=RD.width(el),nar=W<480,lw=nar?96:132,x0=lw,x1=W-14,c=F.cost;
    const rows=[['Backprop',3,3,INK],...F.pops.map(K=>['Dust, '+(K>=1024?fmt(K/1024)+'k':K)+' draws',c.per_update*K/16384,null,D]),['EGGROLL to match',64*3100,64*23000,GR]];
    const rh=nar?30:32,top=8,H=top+rows.length*rh+34,lo=1,hi=3e6,X=v=>logX(v,lo,hi,x0,x1);let s='';
    [1,10,100,1e3,1e4,1e5,1e6].forEach(v=>{const x=X(v);s+=line(x,top,x,top+rows.length*rh,LN,1,'2 3');
      if(!nar||[1,100,1e4,1e6].includes(v))s+=t(x,H-12,v>=1e6?'1M':v>=1e3?fmt(v/1e3)+'k':String(v),{fs:11.5,a:'middle',fill:GR})});
    rows.forEach((r,i)=>{const y=top+i*rh+rh/2;s+=t(2,y+4,r[0],{fs:12,fill:r[3]===D?D:INK,w:600});
      if(r[2]&&r[2]!==r[1]){s+=rect(X(r[1]),y-6,X(r[2])-X(r[1]),12,GR,' opacity="0.45" rx="3"');s+=t(X(r[1])-6,y+4,nar?'200k to 1.5M':'about 200k to 1.5M',{fs:11.5,fill:GR,a:'end'})}
      else{s+=rect(x0,y-6,X(r[1])-x0,12,r[3],' opacity="'+(r[3]===D?0.8:0.9)+'" rx="3"');const v=r[1];s+=t(Math.min(X(v)+6,x1-40),y+4,fmt(Math.round(v)),{fs:11.5,fill:INK})}});
    el.innerHTML=RD.svg(W,H,s,'Forward-pass equivalents per update, log scale')}

  // ---------- gap to backprop by token budget ----------
  function gap(){const el=$('du-gap-svg');if(!el)return;const W=RD.width(el),nar=W<480,x0=44,x1=W-(nar?12:20),top=12,y1=nar?230:250,B=F.budgets;
    const lo=-0.1,hi=0.7,Y=v=>top+(hi-v)/(hi-lo)*(y1-top),X=i=>x0+(i+.5)*(x1-x0)/B.length;let s='';
    for(let v=-0.1;v<=0.701;v+=0.1){const y=Y(v);s+=line(x0,y,x1,y,Math.abs(v)<1e-9?INK:LN,Math.abs(v)<1e-9?1.4:1,Math.abs(v)<1e-9?'':'2 3')+t(x0-6,y+4,sg(Math.round(v*10)/10,1).replace('+0.0','0').replace('−0.0','0'),{fs:11.5,a:'end',fill:GR})}
    
    B.forEach((b,i)=>{s+=t(X(i),y1+16,b,{fs:12,a:'middle',fill:INK,w:600})+t(X(i),y1+31,fmt(F.steps[b])+' upd.',{fs:11,a:'middle',fill:GR})});
    const p16=B.map((b,i)=>[X(i),Y(F.gap16[b])]),p64=B.map((b,i)=>[X(i),Y(F.gap64[b])]);
    s+='<polyline points="'+p64.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="'+D+'" stroke-width="1.4" stroke-dasharray="4 3"/>';
    s+='<polyline points="'+p16.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="'+D+'" stroke-width="2"/>';
    p64.forEach(p=>s+=dot(p[0],p[1],4.5,'var(--card)',D));p16.forEach(p=>s+=dot(p[0],p[1],4.8,D));
    s+=th(p64[3][0]-8,p64[3][1]-9,'64 draws',{fs:11.5,a:'end',fill:D});s+=th(p16[3][0]-8,p16[3][1]-10,'16k draws',{fs:11.5,a:'end',fill:D});
    const xa=X(1)+14,ya=Y(F.adam.dust[5]-F.adam.bp);s+=rect(xa-4.5,ya-4.5,9,9,D)+th(xa+8,ya-6,'Adam',{fs:11.5,fill:D});
    const xn=X(2)+16;s+='<path d="M'+xn+' '+(Y(F.noise_gap.adam)-6)+' l6 6 l-6 6 l-6 -6z" fill="'+INK+'"/>'+th(xn+9,Y(F.noise_gap.adam)+4,nar?'Adam (Noise)':'Adam, Noise',{fs:11.5,fill:INK});
    s+='<path d="M'+xn+' '+(Y(F.noise_gap.sgd)-6)+' l6 6 l-6 6 l-6 -6z" fill="'+INK+'"/>'+th(xn+9,Y(F.noise_gap.sgd)-8,nar?'SGD (Noise)':'SGD, Noise',{fs:11.5,fill:INK});
    el.innerHTML=RD.svg(W,y1+36,s,'Dust minus backprop loss by token budget')}

  // ---------- Tables 1 and 2 ----------
  function tables(){const a=$('du-t1');if(a){const B=F.budgets,P=F.pops.map(k=>k>=1024?fmt(k/1024)+'k':String(k));
      let h='<table class="du-tab"><thead><tr><th>Method</th><th class="n">Population</th>'+B.map(b=>'<th class="n">'+b+'</th>').join('')+'</tr></thead><tbody>';
      P.forEach((p,i)=>h+='<tr><td class="du-d">Dust</td><td class="n">'+p+'</td>'+B.map(b=>'<td class="n">'+F.t1.dust[b][i].toFixed(3)+'</td>').join('')+'</tr>');
      h+='<tr><td class="du-d">Dust, fit limit</td><td class="n">∞</td>'+B.map(b=>'<td class="n">'+F.t1.dust_fit[b].toFixed(3)+'</td>').join('')+'</tr>';
      P.forEach((p,i)=>h+='<tr><td class="du-e">EGGROLL</td><td class="n">'+p+'</td>'+B.map(b=>'<td class="n">'+F.t1.egg[b][i].toFixed(3)+'</td>').join('')+'</tr>');
      h+='<tr><td class="du-b">Backprop</td><td></td>'+B.map(b=>'<td class="n"><b>'+F.t1.bp[b].toFixed(3)+'</b></td>').join('')+'</tr>';
      h+='<tr><td>Updates</td><td></td>'+B.map(b=>'<td class="n">'+fmt(F.steps[b])+'</td>').join('')+'</tr></tbody></table>';
      a.innerHTML=h+'<p class="small">Test loss at the validation-selected checkpoint, SGD with momentum, means of three seeds (Appendix C, Table 1). Population: draws for Dust, forward passes of the batch for EGGROLL. Updates: the budget divided by the 16,384-token batch (calculated).</p>'}
    const b=$('du-t2');if(b){let h='<table class="du-tab"><thead><tr><th>Fit of EGGROLL’s five cells</th><th class="n">1M</th><th class="n">10M</th><th class="n">20M</th></tr></thead><tbody>';
      F.t2.forEach(r=>h+='<tr><td>'+r[0]+'</td><td class="n">'+r[1]+'</td><td class="n">'+r[2]+'</td><td class="n">'+r[3]+'</td></tr>');
      b.innerHTML=h+'</tbody></table><p class="small">Multiples of 64 draws; "no match": a refit whose floor lies above Dust’s loss (Appendix D).</p>'}}

  // ---------- model size: gap to same-size backprop against population ----------
  function size(){const el=$('du-size-svg');if(!el)return;const W=RD.width(el),nar=W<480,x0=44,x1=W-(nar?16:20),top=12,y1=nar?210:230;
    const P=F.pops,lo=-0.05,hi=0.76,Y=v=>top+(hi-v)/(hi-lo)*(y1-top),X=i=>x0+i*(x1-x0)/(P.length-1);let s='';
    [0,0.2,0.4,0.6].forEach(v=>{const y=Y(v);s+=line(x0,y,x1,y,v===0?INK:LN,v===0?1.4:1,v===0?'':'2 3')+t(x0-6,y+4,v===0?'0':'+'+v.toFixed(1),{fs:11.5,a:'end',fill:GR})});
    s+=th(x0+4,Y(0)-6,'backprop, same size',{fs:11.5,fill:INK});
    P.forEach((p,i)=>s+=t(X(i),y1+16,p>=1024?fmt(p/1024)+'k':String(p),{fs:11.5,a:'middle',fill:GR}));
    s+=t((x0+x1)/2,y1+32,'draws per update',{fs:11.5,a:'middle',fill:GR});
    const op=[0.35,0.55,0.75,1];
    F.sizes.names.forEach((nm,j)=>{const pts=P.map((_,i)=>[X(i),Y(F.size_gap[i][j])]);
      s+='<polyline points="'+pts.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')+'" fill="none" stroke="'+D+'" stroke-opacity="'+op[j]+'" stroke-width="'+(j===3?2.6:1.8)+'"/>';
      pts.forEach(p=>s+=dot(p[0],p[1],3.2,D).replace('/>',' fill-opacity="'+op[j]+'"/>'))});
    // size labels at the right edge, ordered by the gap at 16k draws and pushed apart
    s+=th(X(0)+8,Y(F.size_gap[0][3])+4,'243M',{fs:11.5,fill:D,w:600});
    let lx=x1;['243M','38M','7.3M','2.0M'].forEach((nm,k)=>{const j=3-k;s+=th(lx,top+8,nm,{fs:11.5,fill:D,a:'end',w:j===3?600:400}).replace('<text ','<text fill-opacity="'+Math.max(.55,op[j])+'" ');lx-=nm.length*7+16});
    s+=th(lx,top+8,'lighter to darker:',{fs:11.5,fill:GR,a:'end'});
    el.innerHTML=RD.svg(W,y1+38,s,'Gap to same-size backprop against population, four model sizes')}

  // ---------- cosines at 16k ----------
  function cosb(){const el=$('du-cos-svg');if(!el)return;const W=RD.width(el),nar=W<480,lw=nar?104:128,x0=lw,x1=W-(nar?54:66),rows=F.t8;
    const rh=24,top=22,H=top+rows.length*rh+30,X=v=>x0+v*(x1-x0);let s=t(x1+6,12,'c',{fs:11.5,fill:GR,w:600})+t(x0,12,'cosine at 16k (bar), ceiling (tick)',{fs:11.5,fill:GR});
    [0,0.25,0.5,0.75,1].forEach(v=>{const x=X(v);s+=line(x,top,x,top+rows.length*rh,LN,1,'2 3')+t(x,H-10,String(v),{fs:11.5,a:'middle',fill:GR})});
    rows.forEach((r,i)=>{const y=top+i*rh+rh/2,cv=F.cos16[i][1];s+=t(2,y+4,r[0],{fs:12,fill:INK});
      s+=rect(x0,y-7,X(r[1])-x0,14,D,' opacity="0.18" rx="3"')+rect(x0,y-7,X(cv)-x0,14,D,' opacity="0.85" rx="3"');
      s+=line(X(r[1]),y-9,X(r[1]),y+9,D,2);
      s+=t(x1+6,y+4,r[2]>=1000?fmt(r[2]/1000)+'k':String(r[2]),{fs:11.5,fill:GR})});
    el.innerHTML=RD.svg(W,H,s,'Cosine to backprop at 16k draws per layer type')}

  function all(){hero();tok();cost();gap();tables();size();cosb()}
  window.DUF={all};
  all();RD.onRender(all);RD.onResize(all);
})();
