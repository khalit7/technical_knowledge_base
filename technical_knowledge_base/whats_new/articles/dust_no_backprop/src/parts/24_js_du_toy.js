// ---- The toy's card (prefix du): recorded curves (window.ARTICLE.toy, mean of 8 seeds, written by src/toy/record.mjs with
// the code in 22_js_du_toy_core.js), one width and one population at a time; a button reruns seed 1 live with window.DUT.
// It opens at K = 1, where the three estimates are all poor, so the prediction prompt's answer is not on screen.
(function(){
  if(!window.RD||!window.ARTICLE||!window.ARTICLE.toy||!window.DUT)return;
  const $=id=>document.getElementById(id),t=RD.t,TY=window.ARTICLE.toy;if(!$('du-toy-svg'))return;
  const D='var(--c4)',GR='var(--mute)',INK='var(--ink)',LN='var(--line)',K=TY.K;
  const M=[['at','per-token credit',D,''],['w','weight noise',INK,''],['a1','activation noise, one batch reward',GR,'5 3']];
  const st={H:'32',ki:0,live:null};
  const th=(x,y,str,o)=>t(x,y,str,o).replace('<text ','<text paint-order="stroke" stroke="var(--card)" stroke-width="4" stroke-linejoin="round" ');
  const fmtK=k=>k>=1024?(k/1024)+'k':String(k);
  function draw(){const el=$('du-toy-svg'),W=RD.width(el),nar=W<480,x0=36,x1=W-12,top=10,y1=nar?210:240,Wd=TY.widths[st.H];
    const X=i=>x0+i*(x1-x0)/(K.length-1),Y=v=>top+(1-Math.max(0,v))*(y1-top);let s='';
    [0,0.25,0.5,0.75,1].forEach(v=>{const y=Y(v);s+='<line x1="'+x0+'" y1="'+y+'" x2="'+x1+'" y2="'+y+'" stroke="'+LN+'" stroke-dasharray="2 3"/>'+t(x0-5,y+4,String(v),{fs:11.5,a:'end',fill:GR})});
    K.forEach((k,i)=>{if(!nar||i%2===0)s+=t(X(i),y1+15,fmtK(k),{fs:11.5,a:'middle',fill:GR})});
    s+=t((x0+x1)/2,y1+30,'forward passes K (log scale)',{fs:11.5,a:'middle',fill:GR});
    s+='<line x1="'+X(st.ki)+'" y1="'+top+'" x2="'+X(st.ki)+'" y2="'+y1+'" stroke="var(--acc)" stroke-width="1.4"/>';
    M.forEach(([m,nm,c,da])=>{const ys=Wd.mean[m],f=Wd.fit[m];
      // the fitted law, dashed, over the same range
      let p='';for(let q=0;q<=60;q++){const lk=q/60*12,k=Math.pow(2,lk),v=1/Math.sqrt(1+f.c/k);p+=(q?' L':'M')+(x0+lk/12*(x1-x0)).toFixed(1)+' '+Y(v).toFixed(1)}
      s+='<path d="'+p+'" fill="none" stroke="'+c+'" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/>';
      s+='<polyline points="'+ys.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="2.2"'+(da?' stroke-dasharray="'+da+'"':'')+'/>';
      s+='<circle cx="'+X(st.ki)+'" cy="'+Y(ys[st.ki])+'" r="4.5" fill="'+c+'"/>';
      if(st.live&&st.live.H===st.H)st.live.cos[m].forEach((v,i)=>{s+='<rect x="'+(X(i)-3)+'" y="'+(Y(v)-3)+'" width="6" height="6" fill="none" stroke="'+c+'" stroke-width="1.3"/>'})});
    // line labels near the right end, pushed apart
    const lab=M.map(([m,nm,c])=>[nm,c,Y(Wd.mean[m][7])]).sort((a,b)=>a[2]-b[2]);let last=-1e9;
    lab.forEach(([nm,c,y])=>{let yy=y-6;if(yy-last<14)yy=last+14;last=yy;s+=th(X(7)+(nar?-4:6),yy,nar?nm.replace('activation noise, one batch reward','one batch reward'):nm,{fs:11.5,fill:c,w:600,a:nar?'end':'start'})});
    el.innerHTML=RD.svg(W,y1+36,s,'Cosine to the exact gradient against forward passes, three estimators');
    const k=K[st.ki],o=$('du-toy-out'),c=m=>Wd.mean[m][st.ki].toFixed(2);
    o.innerHTML=RD.stat('per-token credit','<span class="du-d">'+c('at')+'</span>','fitted c '+Math.round(Wd.fit.at.c))+RD.stat('weight noise',c('w'),'fitted c '+Math.round(Wd.fit.w.c))+RD.stat('one batch reward',c('a1'),'fitted c '+Math.round(Wd.fit.a1.c));
    $('du-toy-kv').textContent='K = '+k.toLocaleString('en-US')}
  RD.seg($('du-toy-w'),v=>{st.H=v;draw()});
  $('du-toy-k').addEventListener('input',e=>{st.ki=+e.target.value;draw()});
  $('du-toy-run').addEventListener('click',()=>{const b=$('du-toy-run'),out=$('du-toy-live');b.disabled=true;out.textContent='running ...';
    setTimeout(()=>{const t0=performance.now(),r=window.DUT.run(+st.H,1),ms=performance.now()-t0,rec=TY.widths[st.H].seed1;let worst=0;
      ['w','a1','at'].forEach(m=>r.cos[m].forEach((v,i)=>{worst=Math.max(worst,Math.abs(v-rec[m][i]))}));
      st.live={H:st.H,cos:r.cos};window.DUT_LAST={H:st.H,worst,cos:r.cos};
      out.textContent='seed 1 at width '+st.H+' in '+(ms/1000).toFixed(1)+' s: squares; largest difference from the recorded seed-1 values '+worst.toExponential(1);
      b.disabled=false;draw()},30)});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
