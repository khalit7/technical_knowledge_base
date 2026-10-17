// ---- Tokens and cost tab (t-vecalc) ----
window.VEcalc=(function(){
  // SigLIP 2 NaFlex: transformers models/siglip2/image_processing_siglip2.py get_image_size_for_max_num_patches (v5.20.1)
  function naflex(h,w,ps,maxp,eps){eps=eps||1e-5;const sc=(s,size)=>Math.max(ps,Math.ceil(size*s/ps)*ps);
    let lo=eps/10,hi=100.0;while((hi-lo)>=eps){const s=(lo+hi)/2,th=sc(s,h),tw=sc(s,w),n=(th/ps)*(tw/ps);if(n<=maxp)lo=s;else hi=s}
    return [sc(lo,h),sc(lo,w)]}
  // Python's round() (half to even), as smart_resize uses it
  function pyround(x){const f=Math.floor(x),d=x-f;if(Math.abs(d-0.5)<1e-12)return f%2===0?f:f+1;return Math.round(x)}
  // Qwen2-VL / Qwen2.5-VL: transformers models/qwen2_vl/image_processing_qwen2_vl.py smart_resize (v5.20.1)
  function smart(h,w,factor,minp,maxp){if(Math.max(h,w)/Math.min(h,w)>200)return null;
    let hb=pyround(h/factor)*factor,wb=pyround(w/factor)*factor;
    if(hb*wb>maxp){const b=Math.sqrt((h*w)/maxp);hb=Math.max(factor,Math.floor(h/b/factor)*factor);wb=Math.max(factor,Math.floor(w/b/factor)*factor)}
    else if(hb*wb<minp){const b=Math.sqrt(minp/(h*w));hb=Math.ceil(h*b/factor)*factor;wb=Math.ceil(w*b/factor)*factor}
    return [hb,wb]}
  return {naflex,smart,pyround};
})();
(function(){
  const $=id=>document.getElementById(id),E=RD.esc,U=VEU,PS=VE.presets;
  $('vk-pre').innerHTML=PS.map((p,i)=>'<option value="'+i+'">'+E(p.label)+'</option>').join('');
  const ids=['R','P','D','L','F','X'];
  function load(i){const p=PS[i];$('vk-R').value=p.R;$('vk-P').value=p.P;$('vk-D').value=p.D;$('vk-L').value=p.L;$('vk-F').value=p.F;$('vk-X').value=p.extra;$('vk-G').checked=!!p.glu;draw()}
  const get=()=>({R:+$('vk-R').value,P:Math.max(1,+$('vk-P').value),D:+$('vk-D').value,L:+$('vk-L').value,F:+$('vk-F').value,X:+$('vk-X').value,G:$('vk-G').checked});
  const G9=x=>(x/1e9>=100?(x/1e9).toFixed(0):(x/1e9).toFixed(2));
  function draw(){const c=get(),m=U.macs(c.R,c.P,c.D,c.L,c.F,c.X,c.G),g=Math.floor(c.R/c.P);$('vk-Rv').textContent=c.R;
    const params=c.L*(4*c.D*c.D+(c.G?3:2)*c.D*c.F)+3*c.P*c.P*c.D;
    $('vk-out').innerHTML=RD.stat('Grid',g+' &times; '+g,(c.R%c.P?(c.R-g*c.P)+' px cut off':'')+'')+RD.stat('Tokens',U.fmt(m.T),'patches '+U.fmt(m.N)+(c.X?' + '+c.X:''))+
      RD.stat('GMACs per image',G9(m.total),'without the N&sup2; terms: '+G9(m.total-m.scores))+RD.stat('Attention-score share',U.pct(m.scores/m.total),'')+RD.stat('Weights in the blocks',(params/1e6).toFixed(1)+'M','matrices only');
    const parts=[[m.patch,'var(--c5)','patch'],[m.proj,'var(--c1)','projections'],[m.scores,'var(--c2)','scores'],[m.mlp,'var(--c3)','MLP']];
    $('vk-bar').innerHTML=parts.map(p=>'<span style="width:'+(p[0]/m.total*100)+'%;background:'+p[1]+'" title="'+p[2]+' '+U.pct(p[0]/m.total)+'">'+(p[0]/m.total>0.09?p[2]+' '+U.pct(p[0]/m.total,0):'')+'</span>').join('');
    // residual against the published figures this shape matches
    const pi=+$('vk-pre').value,lab=PS[pi].label;let r='';
    const same=(R,P,D,L,F,X)=>c.R===R&&c.P===P&&c.D===D&&c.L===L&&c.F===F&&c.X===X&&!c.G;
    if(same(224,16,768,12,3072,1))r='Reproduces the timm card for ViT-B/16 at 224 (16.9 GMACs) when the N&sup2; terms are left out: '+G9(m.total-m.scores)+' (with them '+G9(m.total)+'). A FLOP counter with PyTorch\'s fused attention also leaves them out (16.85) <span class="indep">third-party</span> <span class="meas">measured</span>.';
    else if(same(518,14,768,12,3072,1))r='Reproduces the timm card for DINOv2 ViT-B/14 at 518 (151.7 GMACs) with the N&sup2; terms included: '+G9(m.total)+' (without them '+G9(m.total-m.scores)+'); the same library\'s ViT-B/16 card counts the other way <span class="indep">third-party</span>.';
    else r='No published count for this exact shape is reproduced here; the formula matches PyTorch\'s FLOP counter with eager attention exactly on every shape checked in <code>src/runs/flops.py</code> <span class="meas">measured</span>.';
    $('vk-resid').innerHTML=r+' <span class="small mute">(source: '+E(PS[pi].src)+')</span>';
    // cost curve
    const el=$('vk-curve'),W=RD.width(el),H=170,l=46,rr=46,t=10,b=28,R0=56,R1=1792,X=R=>l+Math.log(R/R0)/Math.log(R1/R0)*(W-l-rr);
    let pts=[],mx=0,mn=1e30;for(let R=R0;R<=R1;R=Math.round(R*1.06)+1){const q=U.macs(R,c.P,c.D,c.L,c.F,c.X,c.G);pts.push([R,q.total,q.scores/q.total]);mx=Math.max(mx,q.total);mn=Math.min(mn,q.total)}
    const Y=v=>t+(Math.log(mx)-Math.log(v))/(Math.log(mx)-Math.log(mn)+1e-9)*(H-t-b),Ys=s=>t+(1-s)*(H-t-b);
    let s='';[64,128,224,448,896,1792].forEach(R=>{s+='<line x1="'+X(R)+'" y1="'+t+'" x2="'+X(R)+'" y2="'+(H-b)+'" stroke="var(--line)"/>'+RD.t(X(R),H-b+14,R,{a:'middle',fill:'var(--mute)',fs:10.5})});
    s+='<path d="'+pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join('')+'" fill="none" stroke="var(--acc)" stroke-width="2.2"/>';
    s+='<path d="'+pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Ys(p[2]).toFixed(1)).join('')+'" fill="none" stroke="var(--c2)" stroke-width="1.6" stroke-dasharray="4 3"/>';
    s+='<circle cx="'+X(Math.max(R0,c.R))+'" cy="'+Y(m.total)+'" r="4" fill="var(--acc)"/>';
    s+=RD.t(l-4,Y(mx)+4,G9(mx),{a:'end',fill:'var(--acc)',fs:10.5})+RD.t(l-4,Y(mn)+4,G9(mn),{a:'end',fill:'var(--acc)',fs:10.5})+RD.t(W-rr+4,Ys(1)+4,'100%',{fill:'var(--c2)',fs:10.5})+RD.t(W-rr+4,Ys(0)+4,'0%',{fill:'var(--c2)',fs:10.5});
    s+=RD.t((l+W-rr)/2,H-2,'input side (pixels, log)',{a:'middle',fill:'var(--mute)',fs:10.5});
    el.innerHTML=RD.svg(W,H,s,'GMACs against input side')+'<div class="leg"><span style="--sw:var(--acc)">GMACs (left, log)</span><span style="--sw:var(--c2)">attention-score share (right)</span></div>'}
  $('vk-pre').addEventListener('change',e=>load(+e.target.value));
  ids.forEach(k=>$('vk-'+k).addEventListener('input',draw));$('vk-G').addEventListener('change',draw);
  // aspect-ratio rules
  function rules(){const w=Math.max(16,+$('vk-w').value||16),h=Math.max(16,+$('vk-h').value||16),nf=+$('vk-nf').value;
    const short=Math.min(w,h),long=Math.max(w,h);
    const nfz=VEcalc.naflex(h,w,16,nf),qz=VEcalc.smart(h,w,28,3136,12845056);
    const rows=[
      ['CLIP B/32 (short side to 224, centre crop)',[224,224],49,'',short/long,1],
      ['CLIP L/14-336, LLaVA-1.5 (short side to 336, crop)',[336,336],576,'576 (no merge)',short/long,1],
      ['SigLIP 2 B/16 fixed (squash to 224)',[224,224],196,'',1,(w/h)],
      ['SigLIP 2 NaFlex, patch 16, budget '+nf,nfz,(nfz[0]/16)*(nfz[1]/16),'',1,(w/h)/(nfz[1]/nfz[0])],
      ['Qwen2.5-VL (patch 14, 2 &times; 2 merge)',qz,qz?(qz[0]/14)*(qz[1]/14):0,qz?U.fmt((qz[0]/14)*(qz[1]/14)/4):'',1,qz?(w/h)/(qz[1]/qz[0]):1]];
    let tb='<table><thead><tr><th>Rule</th><th class="num">Encoder input (w &times; h)</th><th class="num">Patches</th><th class="num">LM tokens</th><th class="num">Image kept</th><th class="num">Aspect distortion</th></tr></thead><tbody>';
    rows.forEach(r=>{const z=r[1];tb+='<tr><td>'+r[0]+'</td><td class="num">'+(z?z[1]+' &times; '+z[0]:'refused')+'</td><td class="num">'+U.fmt(r[2])+'</td><td class="num">'+(r[3]||'<span class="mute">n/a</span>')+'</td><td class="num">'+U.pct(r[4],0)+'</td><td class="num">'+(Math.abs(r[5]-1)<0.005?'none':((r[5]>1?'squashed ':'stretched ')+U.pct(Math.abs(1-r[5]),0)))+'</td></tr>'});
    $('vk-rules').innerHTML=tb+'</tbody></table>';
    // shapes to scale
    const el=$('vk-shapes'),W=RD.width(el),H=200,sc=Math.min((W-20)/Math.max(w,qz?qz[1]:w,1),(H-30)/Math.max(h,qz?qz[0]:h,1));let s='';
    const box=(x,y,bw,bh,col,dash,lbl)=>'<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" fill="none" stroke="'+col+'" stroke-width="2"'+(dash?' stroke-dasharray="5 3"':'')+'/>'+(lbl?RD.t(x+3,y+12,lbl,{fill:col,fs:10.5}):'');
    s+=box(10,20,w*sc,h*sc,'var(--mute)',true,'original '+w+' &times; '+h);
    if(qz)s+=box(10,20,qz[1]*sc,qz[0]*sc,'var(--c3)',false,'');
    const cs=short*sc;s+=box(10+(w*sc-cs)/2,20+(h*sc-cs)/2,cs,cs,'var(--c1)',false,'');
    const nfw=nfz[1]*sc*(w/nfz[1]),nfh=nfz[0]*sc*(h/nfz[0]);
    s+=RD.t(10,13,'',{});
    el.innerHTML=RD.svg(W,H,s,'Image shapes to scale')+'<div class="leg"><span style="--sw:var(--mute)">original</span><span style="--sw:var(--c1)">CLIP\'s centre crop (what survives, before the resize)</span><span style="--sw:var(--c3)">Qwen2.5-VL\'s resized input, at its own scale</span></div>'}
  ['vk-w','vk-h'].forEach(i=>$(i).addEventListener('input',rules));$('vk-nf').addEventListener('change',rules);
  RD.onRender(()=>{draw();rules()},'t-vecalc');
  load(0);rules();
})();
