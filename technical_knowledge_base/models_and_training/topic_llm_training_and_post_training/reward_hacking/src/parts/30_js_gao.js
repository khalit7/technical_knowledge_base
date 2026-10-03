// ---- Over-optimisation curves tab: Gao et al. 2022 gold-reward fits by RM size (coefficients read from Figure 3) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('t-gao')||!window.RHD)return;
  const G=RHD.GAO,R=G.rows,NS=R.length;
  let method=0,size=0,bsrc='fig1',aRL=G.a_rl;
  const COLS=['#9a5fd6','#7f68d8','#5f7bd6','#3f90c6','#2ea3a6','#38b487','#68c163','#a3cb40','#d6c22a']; // viridis-like, mid-tone so both themes read
  const bRL=r=>bsrc==='fig1'?r.b_rl*G.rl_scale:r.b_rl;
  const bon=(r,d)=>d*(r.a_bon-r.b_bon*d), rl=(r,d)=>d>0?d*(aRL-bRL(r)*Math.log(d)):0;
  const peak=(r,m)=>{if(m===0){const d=r.a_bon/(2*r.b_bon);return{d,g:bon(r,d),z:r.a_bon/r.b_bon}}const b=bRL(r),d=Math.exp(aRL/b-1);return{d,g:b*d,z:Math.exp(aRL/b)}};
  const KMAX=()=>method===0?20:method===1?160:160, MEAS=m=>m===0?10:100;
  const fmt=(v,p)=>v.toLocaleString('en-US',{maximumFractionDigits:p,minimumFractionDigits:p});
  $('gxM').innerHTML=['Best-of-n','RL (PPO)','Both, one size'].map((t,i)=>'<button data-i="'+i+'" class="'+(i?'':'on')+'">'+t+'</button>').join('');
  function curPath(r,m,x,y,kmax,meas){let a='',b='';const N=160;
    for(let j=0;j<=N;j++){const kl=kmax*j/N,d=Math.sqrt(kl),g=m===0?bon(r,d):rl(r,d);const p=x(kl).toFixed(1)+' '+y(g).toFixed(1);
      if(kl<=meas+1e-9)a+=(a?'L':'M')+p; if(kl>=meas-1e-9)b+=(b?'L':'M')+p}return [a,b]}
  function draw(){
    $('gxM').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',i===method));
    $('gxRL').style.display=method===0?'none':'';
    const r=R[size],kmax=KMAX(),kl=kmax*(+$('gxK').value)/1000;
    $('gxSL').textContent=r.size;$('gxKL').textContent=fmt(kl,1);$('gxAL').textContent=aRL.toFixed(2);
    const box=$('gxSvg'),W=RD.width(box),H=Math.round(Math.min(340,Math.max(240,W*.5))),ml=38,mr=12,mt=12,mb=36;
    const sq=Math.sqrt,x=k=>ml+(W-ml-mr)*sq(Math.max(0,k))/sq(kmax),ymin=-0.4,ymax=1.5,y=v=>mt+(H-mt-mb)*(ymax-Math.max(ymin,Math.min(ymax,v)))/(ymax-ymin);
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Gold reward against KL distance">';
    for(let v=-0.4;v<=1.4001;v+=0.2){const z=Math.abs(v)<1e-9;s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="'+(z?'var(--mute)':'var(--line)')+'"/><text x="'+(ml-5)+'" y="'+(y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v.toFixed(1)+'</text>'}
    const ticks=kmax<=20?[0,1,2,4,6,8,10,15,20]:[0,5,10,20,40,60,80,100,130,160];
    ticks.forEach(t=>{if(t>kmax)return;const tx=x(t);if(W<480&&(t===1||t===15||t===5||t===130))return;s+='<line x1="'+tx+'" x2="'+tx+'" y1="'+(H-mb)+'" y2="'+(H-mb+4)+'" stroke="var(--mute)"/><text x="'+tx+'" y="'+(H-mb+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+t+'</text>'});
    s+='<text x="'+(W-mr)+'" y="'+(H-3)+'" font-size="10" text-anchor="end" fill="var(--mute)">KL from the initial policy, nats (square-root scale)</text>';
    s+='<text x="'+(ml+4)+'" y="'+(mt+9)+'" font-size="10" fill="var(--mute)">gold reward (σ)</text>';
    const meas0=x(Math.min(kmax,MEAS(method===2?1:method)));
    if(method!==2)s+='<line x1="'+meas0+'" x2="'+meas0+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--dim)" stroke-dasharray="2 3"/><text x="'+(meas0-3)+'" y="'+(mt+20)+'" font-size="9.5" text-anchor="end" fill="var(--mute)">measured range ends</text>';
    const ms=method===2?[0,1]:[method];
    if(method!==2&&$('gxAll').checked)R.forEach((q,i)=>{if(i===size)return;const p=curPath(q,method,x,y,kmax,MEAS(method));s+='<path d="'+p[0]+'" fill="none" stroke="'+COLS[i]+'" stroke-width="1.3" opacity=".35"/><path d="'+p[1]+'" fill="none" stroke="'+COLS[i]+'" stroke-width="1.1" opacity=".25" stroke-dasharray="4 4"/>'});
    ms.forEach(m=>{const p=curPath(r,m,x,y,kmax,MEAS(m)),c=method===2?(m?'var(--c4)':'var(--c2)'):COLS[size];
      s+='<path d="'+p[0]+'" fill="none" stroke="'+c+'" stroke-width="3"/><path d="'+p[1]+'" fill="none" stroke="'+c+'" stroke-width="2.4" stroke-dasharray="6 4"/>';
      const pk=peak(r,m),pkl=pk.d*pk.d;if(pkl<=kmax)s+='<circle cx="'+x(pkl)+'" cy="'+y(pk.g)+'" r="5" fill="'+c+'" stroke="var(--bg)" stroke-width="1.5"/><text x="'+(x(pkl))+'" y="'+(y(pk.g)-9)+'" font-size="10.5" text-anchor="middle">'+(method===2?(m?'RL':'BoN')+' ':'')+'peak</text>';});
    const kx=x(kl);s+='<line x1="'+kx+'" x2="'+kx+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--acc)" stroke-width="1.5"/>';
    ms.forEach(m=>{const g=m===0?bon(r,Math.sqrt(kl)):rl(r,Math.sqrt(kl));s+='<circle cx="'+kx+'" cy="'+y(g)+'" r="4" fill="var(--bg)" stroke="var(--acc)" stroke-width="2"/>'});
    let lg='<div class="lg">';if(method===2)lg+='<span><i style="background:var(--c2)"></i>best-of-n</span><span><i style="background:var(--c4)"></i>RL</span>';else lg+='<span><i style="background:'+COLS[size]+'"></i>'+r.size+' proxy RM</span>'+($('gxAll').checked?'<span><i style="background:'+COLS[0]+';opacity:.5"></i>3M … <i style="background:'+COLS[8]+';opacity:.5;margin-left:4px"></i>3B, the other sizes</span>':'');
    lg+='<span>solid: measured range; dashed: extrapolated</span></div>';
    box.innerHTML=lg+s+'</svg>';
    // stats
    let st='';
    ms.forEach(m=>{const pk=peak(r,m),nm=m?'RL':'BoN',g=m===0?bon(r,Math.sqrt(kl)):rl(r,Math.sqrt(kl));
      st+=RD.stat(nm+': gold peak',fmt(pk.g,2)+' σ','at KL '+fmt(pk.d*pk.d,1)+' nats'+(m===0?' (n ≈ '+nOf(pk.d*pk.d)+')':''))+
        RD.stat(nm+': gold at KL '+fmt(kl,1),fmt(g,2)+' σ',g<pk.g-0.005?(kl>pk.d*pk.d?'past the peak: over-optimised':'still rising'):'at the peak')+
        RD.stat(nm+': gold back to 0 at',fmt(pk.z*pk.z,0)+' nats',(pk.z*pk.z>MEAS(m)?'beyond the measured range':'inside the measured range'))});
    if(method!==2)st+=RD.stat('Coefficients ('+r.size+')',method===0?'α '+r.a_bon+', β '+r.b_bon:'α '+aRL.toFixed(2)+', β '+fmt(bRL(r),3),'<i class="nl r">read from figure</i>'+(method===1&&bsrc==='fig1'?' × 0.88':''));
    $('gxN').innerHTML=st;
    table();
  }
  function nOf(kl){let lo=1,hi=1e9;for(let i=0;i<80;i++){const m=Math.sqrt(lo*hi);(Math.log(m)-(m-1)/m<kl)?lo=m:hi=m}const n=Math.round(lo);return n>=1e6?(n/1e6).toFixed(1)+' million':n.toLocaleString('en-US')}
  function table(){
    let h='<thead><tr><th>Proxy RM</th><th class="num">α<sub>bon</sub></th><th class="num">β<sub>bon</sub></th><th class="num">β<sub>RL</sub> (Fig. 3c)</th><th class="num">BoN peak KL</th><th class="num">BoN peak gold</th><th class="num">RL peak KL*</th><th class="num">RL peak gold*</th></tr></thead><tbody>';
    R.forEach((r,i)=>{const b=peak(r,0),q=peak(r,1);h+='<tr class="'+(i===size?'cur':'')+'" data-i="'+i+'" style="cursor:pointer"><td>'+r.size+'</td><td class="num">'+r.a_bon.toFixed(3)+'</td><td class="num">'+r.b_bon.toFixed(4)+'</td><td class="num">'+r.b_rl.toFixed(3)+'</td><td class="num">'+fmt(b.d*b.d,1)+'</td><td class="num">'+fmt(b.g,2)+'</td><td class="num">'+fmt(q.d*q.d,0)+'</td><td class="num">'+fmt(q.g,2)+'</td></tr>'});
    $('gxT').innerHTML=h+'</tbody>';
  }
  $('gxT').addEventListener('click',e=>{const t=e.target.closest('tr[data-i]');if(!t)return;size=+t.dataset.i;$('gxS').value=size;draw()});
  $('gxM').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(!b)return;method=+b.dataset.i;draw()});
  $('gxS').addEventListener('input',e=>{size=+e.target.value;draw()});
  $('gxK').addEventListener('input',draw);$('gxAll').addEventListener('change',draw);
  $('gxB').addEventListener('change',e=>{bsrc=e.target.value;draw()});
  $('gxA').addEventListener('input',e=>{aRL=+e.target.value/100;draw()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-gao']=window.TAB_RENDER['t-gao']||[]).push(draw);
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(!$('t-gao').hidden)draw()},120)});
  draw();
})();
