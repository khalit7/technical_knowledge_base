// ---- Reading: the whole-layer results of src/quant_lab.py (one real layer, every scheme), drawn beside the claims they prove ----
// #rd-lyS error against bits (section 2), #rd-lyF weight error against output error (section 3), #rd-lyT the table (closed),
// #rd-lyW W8A8 recipes and #rd-lySQ SmoothQuant's alpha (section 4), #rd-lyAW AWQ's alpha (closed).
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-lyS'))return;
  const L=window.QD.lab,S=L.schemes,W8=L.w8a8;
  const GRP={int8_tensor:'8',int8_channel:'8',fp8_tensor:'8',fp8_channel:'8',mxfp8:'8',int4_tensor:'4',int4_channel:'4',int4_g128:'4',int4_g32:'4',q4k:'4',nf4_b64:'4',nf4_dq:'4',mxfp4:'4',nvfp4:'4',gptq_g128:'c',gptq_g128_actorder:'c',awq_g128:'c'};
  const COL={'8':'var(--c1)','4':'var(--c2)','c':'var(--c3)'};
  const SHORT={int8_tensor:'INT8 tensor',int8_channel:'INT8 channel',fp8_tensor:'FP8 tensor',fp8_channel:'FP8 channel',mxfp8:'MXFP8',int4_tensor:'INT4 tensor',int4_channel:'INT4 channel',int4_g128:'INT4 g128',int4_g32:'INT4 g32',q4k:'Q4_K*',nf4_b64:'NF4',nf4_dq:'NF4+DQ',mxfp4:'MXFP4',nvfp4:'NVFP4',gptq_g128:'GPTQ',gptq_g128_actorder:'GPTQ act-order',awq_g128:'AWQ'};
  let band='4';
  function scatter(){
    const el=$('rd-lyS'),W=RD.width(el),H=Math.round(Math.min(340,Math.max(250,W*0.5)));
    if(W<520){ // phone: the same points as bars on a log scale, sorted by bits, labels never collide
      const ks=Object.keys(S).filter(k=>band==='all'||GRP[k]===band||(band==='4'&&GRP[k]==='c')).sort((a,b)=>S[a].bpw-S[b].bpw||S[a].out_relerr-S[b].out_relerr);
      const lg=v=>Math.max(2,100*(Math.log10(v)+2.5)/2.5);
      el.innerHTML='<div class="small mute">Output error (bar on a log scale, 0.3% to 100%), sorted by bits per weight</div><div class="bars">'+ks.map(k=>'<div class="row"><span class="nm">'+SHORT[k]+' <span class="mute">'+S[k].bpw.toFixed(2)+'</span></span><span class="track"><span class="fill" style="width:'+lg(S[k].out_relerr).toFixed(1)+'%;background:'+COL[GRP[k]]+'"></span></span><span class="val">'+(100*S[k].out_relerr).toFixed(1)+'%</span></div>').join('')+'</div>';
      return}
    const pl=46,pr=14,pt=12,pb=30,iw=W-pl-pr,ih=H-pt-pb;
    const keys=Object.keys(S).filter(k=>band==='all'||GRP[k]===band||(band==='4'&&GRP[k]==='c'));
    const v=k=>S[k].out_relerr;
    const xs=keys.map(k=>S[k].bpw),ys=keys.map(v);
    let x0=Math.min(...xs)-0.08,x1=Math.max(...xs)+0.08;if(x1-x0<0.6){x0-=0.2;x1+=0.2}
    const ly=Math.log10,yl=Math.min(...ys)*0.8,yh=Math.max(...ys)*1.25;
    const x=a=>pl+(a-x0)/(x1-x0)*iw,y=a=>pt+(ly(yh)-ly(a))/(ly(yh)-ly(yl))*ih;
    let s='';
    [0.005,0.01,0.02,0.05,0.1,0.2,0.5,1].filter(t=>t>=yl&&t<=yh).forEach(t=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(y(t)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+(100*t)+'%</text>'});
    const step=(x1-x0)>2?1:0.25;for(let t=Math.ceil(x0/step)*step;t<=x1;t+=step)s+='<text x="'+x(t)+'" y="'+(H-14)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(+t.toFixed(2))+'</text>';
    s+='<text x="'+(pl+iw/2)+'" y="'+(H-2)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">bits per weight (elements plus scales)</text>';
    const pts=keys.map(k=>({k,X:x(S[k].bpw),Y:y(v(k))})).sort((a,b)=>a.Y-b.Y);const used=[];
    pts.forEach(p=>{s+='<circle cx="'+p.X+'" cy="'+p.Y+'" r="4" fill="'+COL[GRP[p.k]]+'"/>';
      let ty=p.Y+4,right=p.X<pl+iw*0.62;for(let t=0;t<8;t++){if(used.some(u=>Math.abs(u.y-ty)<11&&Math.abs(u.x-p.X)<80))ty+=11;else break}used.push({x:p.X,y:ty});
      s+='<text x="'+(right?p.X+7:p.X-7)+'" y="'+ty+'" font-size="11" text-anchor="'+(right?'start':'end')+'">'+SHORT[p.k]+'</text>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Output error against bits per weight">'+s+'</svg>';
  }
  // weight error against output error for the 4.25-bit schemes: the calibrated methods flip
  function flip(){
    const ks=['int4_g128','awq_g128','gptq_g128','gptq_g128_actorder'],nm={int4_g128:'Round to nearest, g128',awq_g128:'AWQ',gptq_g128:'GPTQ',gptq_g128_actorder:'GPTQ act-order'};
    const mx=0.2,row=(lab,val,col)=>'<div class="row"><span class="nm">'+lab+'</span><span class="track"><span class="fill" style="width:'+(100*val/mx).toFixed(1)+'%;background:'+col+'"></span></span><span class="val">'+(100*val).toFixed(1)+'%</span></div>';
    $('rd-lyF').innerHTML='<div class="small"><b>Weight error</b> ‖Ŵ − W‖ / ‖W‖</div><div class="bars">'+ks.map(k=>row(nm[k],S[k].w_relerr,'var(--c2)')).join('')+'</div>'+
      '<div class="small" style="margin-top:8px"><b>Output error</b> on 511 evaluation tokens</div><div class="bars">'+ks.map(k=>row(nm[k],S[k].out_relerr,'var(--c3)')).join('')+'</div>';
  }
  function table(){
    $('rd-lyT').innerHTML='<div class="tw"><table><thead><tr><th>Scheme</th><th class="num">Bits per weight</th><th class="num">Weight error</th><th class="num">SQNR</th><th class="num">Output error</th></tr></thead><tbody>'+
      Object.keys(S).map(k=>'<tr><td>'+S[k].label+'</td><td class="num">'+S[k].bpw.toFixed(3)+'</td><td class="num">'+(100*S[k].w_relerr).toFixed(2)+'%</td><td class="num">'+S[k].sqnr_db.toFixed(1)+' dB</td><td class="num"><b>'+(100*S[k].out_relerr).toFixed(2)+'%</b></td></tr>').join('')+'</tbody></table></div>';
  }
  function w8(){
    const r=[['INT8, activations per tensor, static',W8.int8_tensor_static],['INT8, per tensor, dynamic',W8.int8_tensor_dynamic],['INT8, per token, dynamic',W8.int8_token_dynamic],
      ['FP8 E4M3, per tensor',W8.fp8_tensor],['FP8-dynamic',W8.fp8_dynamic]];
    let b=W8.smoothquant_curve[0];W8.smoothquant_curve.forEach(c=>{if(c[1]<b[1])b=c});
    r.push(['SmoothQuant (α '+b[0].toFixed(2)+') + INT8 static',b[1]]);
    $('rd-lyW').innerHTML='<div class="bars">'+r.map(x=>'<div class="row"><span class="nm" title="'+x[0]+'">'+x[0]+'</span><span class="track"><span class="fill" style="width:'+(100*x[1]/0.06)+'%;background:var(--c1)"></span></span><span class="val">'+(100*x[1]).toFixed(2)+'%</span></div>').join('')+'</div>';
  }
  function curve(el,pts,xl,base,baseLbl){
    if(!el||el.offsetParent===null)return;
    const W=RD.width(el),H=190,pl=46,pr=10,pt=10,pb=28,iw=W-pl-pr,ih=H-pt-pb;
    const ys=pts.map(p=>p[1]).concat(base);const yh=Math.max(...ys)*1.1,yl=0;
    const x=a=>pl+a*iw,y=a=>pt+(1-(a-yl)/(yh-yl))*ih;
    let s='';[0,0.25,0.5,0.75,1].forEach(t=>{s+='<text x="'+x(t)+'" y="'+(H-14)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+t+'</text>'});
    s+='<text x="'+(pl+iw/2)+'" y="'+(H-2)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+xl+'</text>';
    const nt=4;for(let i=0;i<=nt;i++){const t=yh*i/nt;s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(y(t)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+(100*t).toFixed(1)+'%</text>'}
    s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(base)+'" y2="'+y(base)+'" stroke="var(--c2)" stroke-dasharray="5 3"/><text x="'+(W-pr)+'" y="'+(y(base)-4)+'" font-size="10.5" text-anchor="end" fill="var(--c2)">'+baseLbl+'</text>';
    s+='<polyline fill="none" stroke="var(--c1)" stroke-width="2" points="'+pts.map(p=>x(p[0])+','+y(p[1])).join(' ')+'"/>';
    let b=pts[0];pts.forEach(p=>{if(p[1]<b[1])b=p});s+='<circle cx="'+x(b[0])+'" cy="'+y(b[1])+'" r="4" fill="var(--c1)"/><text x="'+(x(b[0]))+'" y="'+(y(b[1])+16)+'" font-size="10.5" text-anchor="middle">best '+b[0].toFixed(2)+'</text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img">'+s+'</svg>'}
  function curves(){
    curve($('rd-lySQ'),W8.smoothquant_curve.filter(p=>p[1]<0.06),'migration strength α (from where the error falls below 6%)',W8.int8_tensor_static,'no smoothing '+(100*W8.int8_tensor_static).toFixed(2)+'%');
    curve($('rd-lyAW'),L.stats.awq_curve.map(p=>[p[0],p[2]]),'AWQ exponent α (output error on evaluation text)',S.int4_g128.out_relerr,'plain INT4 g128 '+(100*S.int4_g128.out_relerr).toFixed(2)+'%');
  }
  function all(){scatter();flip();table();w8();curves()}
  RD.seg($('rd-lyB'),m=>{band=m;scatter()});
  document.querySelectorAll('#t-read details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)curves()}));
  RD.onRender(all);RD.onResize(()=>{scatter();curves()});all();
})();
