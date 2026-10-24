// ---- Reading section 8: the VQ runs (recorded data in AVD.quant, images in AVD.img); the table is static HTML,
// a click selects the run whose usage curve, reconstructions and tokens are shown. Moved from the old Quantizer playground tab ----
(function(){
  const tab=document.getElementById('avq-vq-tab');if(!tab)return;
  const Q=AVD.quant.runs,IMG=AVD.img,esc=RD.esc,$=id=>document.getElementById(id);
  const NAME={vq_plain:'VQ, plain, K = 128',vq_restart:'VQ + restarts, K = 128',q_vq_ema:'VQ, EMA codebook',q_vq_l2:'VQ, L2-normalised',q_vq1024_plain:'VQ, plain, K = 1,024',q_vq1024_restart:'VQ + restarts, K = 1,024'};
  const COL={vq_plain:'var(--c1)',vq_restart:'var(--c2)',q_vq_ema:'var(--c3)',q_vq_l2:'var(--c4)',q_vq1024_plain:'var(--c5)',q_vq1024_restart:'var(--c6)'};
  const KEYS=Object.keys(NAME).filter(k=>Q[k]);
  let sel='q_vq1024_plain',img=0;
  tab.addEventListener('click',e=>{const tr=e.target.closest('tr[data-k]');if(!tr)return;sel=tr.dataset.k;all()});
  function drawTable(){tab.querySelectorAll('tr[data-k]').forEach(tr=>tr.classList.toggle('sel',tr.dataset.k===sel))}
  function drawAlive(){
    const el=$('avq-alive'),W=RD.width(el),H=210,ml=40,mr=8,mt=8,mb=26,ymax=1024*1.05;
    const X=v=>ml+v/5000*(W-ml-mr),Y=v=>mt+(1-Math.sqrt(v/ymax))*(H-mt-mb);
    let b='';[0,32,128,512,1024].forEach(t=>{b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(t)+'" y2="'+Y(t)+'" stroke="var(--line)"/>'+RD.t(ml-4,Y(t)+4,t.toLocaleString('en-GB'),{a:'end',fs:11})});
    const xt=W<520?[0,2500,5000]:[0,1000,2000,3000,4000,5000];
    xt.forEach((t,i)=>{b+=RD.t(X(t),H-10,t.toLocaleString('en-GB'),{a:i===xt.length-1?'end':i===0?'start':'middle',fs:11})});
    KEYS.forEach(k=>{const pts=Q[k].alive_log||[];if(!pts.length)return;const hl=k===sel;
      b+='<polyline fill="none" stroke="'+COL[k]+'" stroke-width="'+(hl?2.8:1.3)+'" opacity="'+(hl?1:.5)+'" points="'+pts.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>'});
    el.innerHTML=RD.svg(W,H,b,'Codes used per 100-step window, square-root scale');
    $('avq-alive-leg').innerHTML=KEYS.map(k=>'<span style="--sw:'+COL[k]+';'+(k===sel?'font-weight:600;color:var(--ink)':'')+'">'+esc(NAME[k])+'</span>').join('')+'<span class="av-note">square-root scale, so 128 and 1,024 fit one axis</span>';
  }
  function drawUsage(){
    const r=Q[sel],u=r.usage_sorted,K=r.K,el=$('avq-usage');if(!u)return;
    const W=RD.width(el),H=200,ml=40,mr=8,mt=8,mb=26,mx=Math.max(...u);
    const X=i=>ml+i/K*(W-ml-mr),Y=v=>mt+(1-Math.log10(v+1)/Math.log10(mx+1))*(H-mt-mb);
    let b='';[1,10,100,1000,10000,100000].filter(t=>t<=mx).forEach(t=>{b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(t)+'" y2="'+Y(t)+'" stroke="var(--line)"/>'+RD.t(ml-4,Y(t)+4,t.toLocaleString('en-GB'),{a:'end',fs:11})});
    const bw=Math.max(.6,(W-ml-mr)/K);
    u.forEach((v,i)=>{if(v>0)b+='<rect x="'+X(i).toFixed(2)+'" y="'+Y(v).toFixed(1)+'" width="'+bw.toFixed(2)+'" height="'+(H-mb-Y(v)).toFixed(1)+'" fill="'+COL[sel]+'"/>'});
    b+=RD.t(ml,H-10,'most used',{fs:11})+RD.t(W-mr,H-10,'code '+K.toLocaleString('en-GB'),{a:'end',fs:11});
    el.innerHTML=RD.svg(W,H,b,'Sorted code frequencies, log scale');
    $('avq-usage-note').innerHTML=esc(NAME[sel])+' (select a run in the table): '+r.codes_used_test.toLocaleString('en-GB')+' of '+K.toLocaleString('en-GB')+' codes appear in the 640,000 test tokens; perfectly even use would give each code '+Math.round(640000/K).toLocaleString('en-GB')+'. The most used code appears '+u[0].toLocaleString('en-GB')+' times. Log scale.';
  }
  const im=(src,alt)=>'<img class="av-img" src="'+src+'" alt="'+esc(alt)+'">';
  function drawRec(){
    $('avq-rec').innerHTML=(IMG.quant[sel]||[]).slice(0,8).map((s,i)=>im(s,'reconstruction '+(i+1))).join('');
    $('avq-rec-lab').textContent=NAME[sel]+': reconstructions of the first 8 test images (PSNR '+Q[sel].test_psnr_db.toFixed(2)+' dB on the test set)';
    $('avq-imgpick').innerHTML=IMG.orig16.slice(0,8).map((s,i)=>'<button data-i="'+i+'" class="'+(i===img?'on':'')+'" style="padding:1px;width:34px" aria-label="image '+(i+1)+'"><img class="av-img" src="'+s+'" alt=""></button>').join('');
    drawTok();
  }
  $('avq-imgpick').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;img=+b.dataset.i;drawRec()});
  function drawTok(hl){
    const t=Q[sel].tokens16[img],el=$('avq-tokgrid'),n=new Set(t).size;
    let h='<div style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:2px;max-width:420px">';
    t.forEach(v=>{const on=hl!==undefined&&v===hl;h+='<div data-v="'+v+'" class="av-num" style="font-size:11px;text-align:center;padding:4px 0;border-radius:3px;border:1px solid var(--line);background:'+(on?'var(--acc2)':'var(--soft)')+';'+(on?'font-weight:700':'')+'">'+v+'</div>'});
    el.innerHTML=h+'</div><p class="av-note">'+n+' distinct tokens among this image\'s 64.</p>';
  }
  $('avq-tokgrid').addEventListener('mouseover',e=>{const d=e.target.closest('[data-v]');if(d)drawTok(+d.dataset.v)});
  $('avq-tokgrid').addEventListener('click',e=>{const d=e.target.closest('[data-v]');if(d)drawTok(+d.dataset.v)});
  const det=$('avq-usage').closest('details');if(det)det.addEventListener('toggle',()=>{if(det.open)drawUsage()});
  function all(){drawTable();drawAlive();drawUsage();drawRec()}
  RD.onRender(all);RD.onResize(()=>{drawAlive();drawUsage()});
  all();
})();
