// ---- Quantizer playground: the eleven trained tokenizers (recorded data in AVD.quant, images in AVD.img) ----
(function(){
  const Q=AVD.quant.runs,IMG=AVD.img,esc=RD.esc;
  const ROWS=[
    ['vq_plain','VQ, plain (lab)','small'],['vq_restart','VQ + restarts (lab)','small'],['q_vq_ema','VQ, EMA codebook','small'],
    ['q_vq_l2','VQ, L2-normalised','small'],['q_fsq125','FSQ [5, 5, 5]','small'],['q_lfq7','LFQ, 7 bits','small'],['q_lfq7_noent','LFQ, 7 bits, no entropy loss','small'],
    ['q_vq1024_plain','VQ, plain','large'],['q_vq1024_restart','VQ + restarts','large'],['q_fsq1000','FSQ [8, 5, 5, 5]','large'],['q_lfq10','LFQ, 10 bits','large']];
  const NAME={};ROWS.forEach(r=>NAME[r[0]]=r[1]);
  const COL={vq_plain:'var(--c1)',vq_restart:'var(--c2)',q_vq_ema:'var(--c3)',q_vq_l2:'var(--c4)',q_fsq125:'var(--c5)',q_lfq7:'var(--c6)',q_lfq7_noent:'var(--mute)',
    q_vq1024_plain:'var(--c1)',q_vq1024_restart:'var(--c2)',q_fsq1000:'var(--c5)',q_lfq10:'var(--c6)'};
  let size='small',sel='vq_plain',img=0;
  const tab=document.getElementById('avq-tab');
  function rows(){return ROWS.filter(r=>size==='all'||r[2]===size).filter(r=>Q[r[0]])}
  function drawTable(){
    let h='<thead><tr><th>Quantizer</th><th class="num">Codes K</th><th class="num">Used (test)</th><th class="num">Perplexity</th><th class="num">Bits per image</th><th class="num">PSNR dB</th><th class="num">LPIPS</th><th class="num">rFD</th></tr></thead><tbody>';
    rows().forEach(([k,nm])=>{const r=Q[k];h+='<tr data-k="'+k+'" style="cursor:pointer'+(k===sel?';background:var(--acc2)':'')+'"><td>'+esc(nm)+'</td><td class="num">'+r.K.toLocaleString('en-GB')+'</td><td class="num">'+r.codes_used_test.toLocaleString('en-GB')+' <span class="av-note">('+Math.round(100*r.usage_share)+'%)</span></td><td class="num">'+r.perplexity+'</td><td class="num">'+r.bits_per_image+'</td><td class="num">'+r.test_psnr_db.toFixed(2)+'</td><td class="num">'+r.lpips_2000.toFixed(3)+'</td><td class="num">'+r.rfd.toFixed(1)+'</td></tr>'});
    tab.innerHTML=h+'</tbody>';
  }
  tab.addEventListener('click',e=>{const tr=e.target.closest('tr[data-k]');if(!tr)return;sel=tr.dataset.k;all()});
  function lineChart(el,series,opt){
    const W=RD.width(el),H=200,ml=40,mr=8,mt=8,mb=26,x0=0,x1=opt.xmax;
    const ymax=opt.ymax;const X=v=>ml+(v-x0)/(x1-x0)*(W-ml-mr),Y=v=>mt+(1-(opt.log?Math.log10(Math.max(v,1))/Math.log10(ymax):v/ymax))*(H-mt-mb);
    let b='';(opt.yt||[]).forEach(t=>{b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(t)+'" y2="'+Y(t)+'" stroke="var(--line)"/>'+RD.t(ml-4,Y(t)+4,t.toLocaleString('en-GB'),{a:'end',fs:10})});
    const xt=opt.xt||[];xt.forEach((t,i)=>{b+=RD.t(X(t),H-12,t.toLocaleString('en-GB'),{a:i===xt.length-1?'end':i===0?'start':'middle',fs:10})});
    b+=RD.t(W-mr,H-1,opt.xl||'',{a:'end',fs:10});
    series.forEach(s=>{if(!s.pts.length)return;b+='<polyline fill="none" stroke="'+s.col+'" stroke-width="'+(s.hl?2.6:1.3)+'" opacity="'+(s.hl?1:.55)+'" points="'+s.pts.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>'});
    el.innerHTML=RD.svg(W,H,b,opt.label||'chart');
  }
  function drawAlive(){
    const rs=rows(),Kmax=Math.max(...rs.map(r=>Q[r[0]].K));
    lineChart(document.getElementById('avq-alive'),rs.map(([k])=>({col:COL[k],hl:k===sel,pts:(Q[k].alive_log||[]).map(p=>[p[0],p[1]])})),
      {xmax:5000,ymax:Kmax*1.05,yt:Kmax>200?[0,256,512,768,1024]:[0,32,64,96,128],xt:[0,1000,2000,3000,4000,5000],xl:'step',label:'Codes used per 100-step window'});
    document.getElementById('avq-alive-leg').innerHTML=rs.map(([k,nm])=>'<span style="--sw:'+COL[k]+';'+(k===sel?'font-weight:600;color:var(--ink)':'')+'">'+esc(nm)+'</span>').join('');
  }
  function drawUsage(){
    const r=Q[sel],u=r.usage_sorted,K=r.K,el=document.getElementById('avq-usage');
    const W=RD.width(el),H=200,ml=40,mr=8,mt=8,mb=26,mx=Math.max(...u);
    const X=i=>ml+i/K*(W-ml-mr),Y=v=>mt+(1-Math.log10(v+1)/Math.log10(mx+1))*(H-mt-mb);
    let b='';[1,10,100,1000,10000,100000].filter(t=>t<=mx).forEach(t=>{b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(t)+'" y2="'+Y(t)+'" stroke="var(--line)"/>'+RD.t(ml-4,Y(t)+4,t.toLocaleString('en-GB'),{a:'end',fs:10})});
    const bw=Math.max(.6,(W-ml-mr)/K);
    u.forEach((v,i)=>{if(v>0)b+='<rect x="'+X(i).toFixed(2)+'" y="'+Y(v).toFixed(1)+'" width="'+bw.toFixed(2)+'" height="'+(H-mb-Y(v)).toFixed(1)+'" fill="'+COL[sel]+'"/>'});
    b+=RD.t(ml,H-10,'most used',{fs:10})+RD.t(W-mr,H-10,'code '+K.toLocaleString('en-GB')+' (least used)',{a:'end',fs:10});
    el.innerHTML=RD.svg(W,H,b,'Sorted code frequencies');
    const even=640000/K;
    document.getElementById('avq-usage-note').innerHTML=esc(NAME[sel])+': '+r.codes_used_test.toLocaleString('en-GB')+' of '+K.toLocaleString('en-GB')+' codes appear in the 640,000 test tokens; perfectly even use would give each code '+Math.round(even).toLocaleString('en-GB')+'. The most used code appears '+u[0].toLocaleString('en-GB')+' times.';
  }
  const im=(src,alt)=>'<img class="av-img" src="'+src+'" alt="'+esc(alt)+'">';
  function drawRec(){
    document.getElementById('avq-orig').innerHTML=IMG.orig16.map((s,i)=>im(s,'test image '+(i+1))).join('');
    document.getElementById('avq-rec').innerHTML=(IMG.quant[sel]||[]).map((s,i)=>im(s,'reconstruction '+(i+1))).join('');
    document.getElementById('avq-rec-lab').textContent=NAME[sel]+': reconstructions (PSNR '+Q[sel].test_psnr_db.toFixed(2)+' dB on the test set)';
    const pk=document.getElementById('avq-imgpick');
    pk.innerHTML=IMG.orig16.map((s,i)=>'<button data-i="'+i+'" class="'+(i===img?'on':'')+'" style="padding:1px;width:34px"><img class="av-img" src="'+s+'" alt="pick image '+(i+1)+'"></button>').join('');
    drawTok();
  }
  document.getElementById('avq-imgpick').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;img=+b.dataset.i;drawRec()});
  function drawTok(hl){
    const t=Q[sel].tokens16[img],el=document.getElementById('avq-tokgrid');
    const n=new Set(t).size;
    let h='<div style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:2px;max-width:420px">';
    t.forEach((v,j)=>{const on=hl!==undefined&&v===hl;h+='<div data-v="'+v+'" class="av-num" style="font-size:11px;text-align:center;padding:4px 0;border-radius:3px;border:1px solid var(--line);background:'+(on?'var(--acc2)':'var(--soft)')+';'+(on?'font-weight:700':'')+'">'+v+'</div>'});
    el.innerHTML=h+'</div><p class="av-note">'+n+' distinct tokens among this image\'s 64.</p>';
  }
  document.getElementById('avq-tokgrid').addEventListener('mouseover',e=>{const d=e.target.closest('[data-v]');if(d)drawTok(+d.dataset.v)});
  document.getElementById('avq-tokgrid').addEventListener('click',e=>{const d=e.target.closest('[data-v]');if(d)drawTok(+d.dataset.v)});
  function all(){drawTable();drawAlive();drawUsage();drawRec()}
  RD.seg(document.getElementById('avq-size'),v=>{size=v;if(!rows().some(r=>r[0]===sel))sel=rows()[0][0];all()});
  RD.onRender(all,'t-avq');RD.onResize(()=>{drawAlive();drawUsage()},'t-avq');
  all();
})();
