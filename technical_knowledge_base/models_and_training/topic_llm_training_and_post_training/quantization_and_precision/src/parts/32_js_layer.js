// ---- Tab: one real layer, every scheme (whole-layer results from src/quant_lab.py) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('ly'))return;
  const L=window.QD.lab,S=L.schemes,W8=L.w8a8;
  const GRP={int8_tensor:'8',int8_channel:'8',fp8_tensor:'8',fp8_channel:'8',mxfp8:'8',int4_tensor:'4',int4_channel:'4',int4_g128:'4',int4_g32:'4',q4k:'4',nf4_b64:'4',nf4_dq:'4',mxfp4:'4',nvfp4:'4',gptq_g128:'c',gptq_g128_actorder:'c',awq_g128:'c'};
  const COL={'8':'var(--c1)','4':'var(--c2)','c':'var(--c3)'};
  const SHORT={int8_tensor:'INT8 tensor',int8_channel:'INT8 channel',fp8_tensor:'FP8 tensor',fp8_channel:'FP8 channel',mxfp8:'MXFP8',int4_tensor:'INT4 tensor',int4_channel:'INT4 channel',int4_g128:'INT4 g128',int4_g32:'INT4 g32',q4k:'Q4_K*',nf4_b64:'NF4',nf4_dq:'NF4+DQ',mxfp4:'MXFP4',nvfp4:'NVFP4',gptq_g128:'GPTQ',gptq_g128_actorder:'GPTQ act-order',awq_g128:'AWQ'};
  let metric='out',band='4';
  function scatter(){
    const el=$('lyS'),W=RD.width(el),H=Math.round(Math.min(340,Math.max(250,W*0.5)));
    const pl=46,pr=14,pt=12,pb=30,iw=W-pl-pr,ih=H-pt-pb;
    const keys=Object.keys(S).filter(k=>band==='all'||GRP[k]===band||(band==='4'&&GRP[k]==='c'));
    const v=k=>metric==='out'?S[k].out_relerr:S[k].w_relerr;
    const xs=keys.map(k=>S[k].bpw),ys=keys.map(v);
    let x0=Math.min(...xs)-0.08,x1=Math.max(...xs)+0.08;if(x1-x0<0.6){x0-=0.2;x1+=0.2}
    const ly=Math.log10,yl=Math.min(...ys)*0.8,yh=Math.max(...ys)*1.25;
    const x=a=>pl+(a-x0)/(x1-x0)*iw,y=a=>pt+(ly(yh)-ly(a))/(ly(yh)-ly(yl))*ih;
    let s='';
    [0.005,0.01,0.02,0.05,0.1,0.2,0.5,1].filter(t=>t>=yl&&t<=yh).forEach(t=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(y(t)+4)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+(100*t)+'%</text>'});
    const step=(x1-x0)>2?1:0.25;for(let t=Math.ceil(x0/step)*step;t<=x1;t+=step)s+='<text x="'+x(t)+'" y="'+(H-14)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+(+t.toFixed(2))+'</text>';
    s+='<text x="'+(pl+iw/2)+'" y="'+(H-2)+'" font-size="10" text-anchor="middle" fill="var(--mute)">bits per weight (elements plus scales)</text>';
    // labels: simple collision avoidance by vertical nudging
    const pts=keys.map(k=>({k,X:x(S[k].bpw),Y:y(v(k))})).sort((a,b)=>a.Y-b.Y);const used=[];
    pts.forEach(p=>{s+='<circle cx="'+p.X+'" cy="'+p.Y+'" r="4" fill="'+COL[GRP[p.k]]+'"/>';
      let ty=p.Y+4,right=p.X<pl+iw*0.62;for(let t=0;t<8;t++){if(used.some(u=>Math.abs(u.y-ty)<11&&Math.abs(u.x-p.X)<80))ty+=11;else break}used.push({x:p.X,y:ty});
      s+='<text x="'+(right?p.X+7:p.X-7)+'" y="'+ty+'" font-size="10.5" text-anchor="'+(right?'start':'end')+'">'+SHORT[p.k]+'</text>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Error against bits per weight">'+s+'</svg>';
  }
  function table(){
    $('lyT').innerHTML='<div class="tw"><table><thead><tr><th>Scheme</th><th class="num">Bits per weight</th><th class="num">Weight error</th><th class="num">SQNR</th><th class="num">Output error</th></tr></thead><tbody>'+
      Object.keys(S).map(k=>'<tr><td>'+S[k].label+'</td><td class="num">'+S[k].bpw.toFixed(3)+'</td><td class="num">'+(100*S[k].w_relerr).toFixed(2)+'%</td><td class="num">'+S[k].sqnr_db.toFixed(1)+' dB</td><td class="num"><b>'+(100*S[k].out_relerr).toFixed(2)+'%</b></td></tr>').join('')+'</tbody></table></div>';
    const r=[['INT8 W8A8, activations per tensor, static (calibrated max)',W8.int8_tensor_static],['INT8 W8A8, activations per tensor, dynamic',W8.int8_tensor_dynamic],['INT8 W8A8, activations per token, dynamic',W8.int8_token_dynamic],
      ['FP8 E4M3, weights and activations per tensor',W8.fp8_tensor],['FP8-dynamic (weights per channel, activations per token)',W8.fp8_dynamic]];
    let b=W8.smoothquant_curve[0];W8.smoothquant_curve.forEach(c=>{if(c[1]<b[1])b=c});
    r.push(['SmoothQuant + INT8 per-tensor static, best α = '+b[0].toFixed(2),b[1]]);
    $('lyW').innerHTML='<div class="bars">'+r.map(x=>'<div class="row"><span class="nm" title="'+x[0]+'">'+x[0]+'</span><span class="track"><span class="fill" style="width:'+(100*x[1]/0.06)+'%;background:var(--c1)"></span></span><span class="val">'+(100*x[1]).toFixed(2)+'%</span></div>').join('')+'</div>';
  }
  function curve(el,pts,xl,base,baseLbl){
    const W=RD.width(el),H=190,pl=46,pr=10,pt=10,pb=28,iw=W-pl-pr,ih=H-pt-pb;
    const ys=pts.map(p=>p[1]).concat(base);const yh=Math.max(...ys)*1.1,yl=0;
    const x=a=>pl+a*iw,y=a=>pt+(1-(a-yl)/(yh-yl))*ih;
    let s='';[0,0.25,0.5,0.75,1].forEach(t=>{s+='<text x="'+x(t)+'" y="'+(H-14)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+t+'</text>'});
    s+='<text x="'+(pl+iw/2)+'" y="'+(H-2)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+xl+'</text>';
    const nt=4;for(let i=0;i<=nt;i++){const t=yh*i/nt;s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(y(t)+4)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+(100*t).toFixed(1)+'%</text>'}
    s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(base)+'" y2="'+y(base)+'" stroke="var(--c2)" stroke-dasharray="5 3"/><text x="'+(W-pr)+'" y="'+(y(base)-4)+'" font-size="10" text-anchor="end" fill="var(--c2)">'+baseLbl+'</text>';
    s+='<polyline fill="none" stroke="var(--c1)" stroke-width="2" points="'+pts.map(p=>x(p[0])+','+y(p[1])).join(' ')+'"/>';
    let b=pts[0];pts.forEach(p=>{if(p[1]<b[1])b=p});s+='<circle cx="'+x(b[0])+'" cy="'+y(b[1])+'" r="4" fill="var(--c1)"/><text x="'+(x(b[0]))+'" y="'+(y(b[1])+16)+'" font-size="10" text-anchor="middle">best '+b[0].toFixed(2)+'</text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img">'+s+'</svg>'}
  function curves(){
    const sq=W8.smoothquant_curve.filter(p=>p[1]<0.06);
    curve($('lySQ'),sq,'migration strength α (curve starts where the error falls below 6%)',W8.int8_tensor_static,'no smoothing '+(100*W8.int8_tensor_static).toFixed(2)+'%');
    curve($('lyAW'),L.stats.awq_curve.map(p=>[p[0],p[2]]),'AWQ exponent α (output error on evaluation text)',S.int4_g128.out_relerr,'plain INT4 g128 '+(100*S.int4_g128.out_relerr).toFixed(2)+'%');
  }
  function all(){scatter();table();curves()}
  $('lyM').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;metric=b.dataset.m;$('lyM').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));scatter()});
  $('lyB').addEventListener('click',e=>{const b=e.target.closest('button[data-b]');if(!b)return;band=b.dataset.b;$('lyB').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));scatter()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-layer']=window.TAB_RENDER['t-layer']||[]).push(all);
  addEventListener('resize',()=>{if($('t-layer')&&!$('t-layer').hidden)all()});
  all();
})();
