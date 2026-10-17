// ---- Tab: Token and cache budget. Rules ported from transformers v5.20.1 and checked by runs/check_rules.mjs ----
window.VMB=(function(){
  // SmolVLM (Idefics3 processor): copied from the root VLM lab's port (src/parts/35_js_vl_1core.js), checked there on 36 counts
  function smol(W,H,N){const tile=512,split=N>1;let w=W,h=H;
    if(split){const L=N*tile,ar=w/h;if(w>=h){w=L;h=Math.floor(w/ar);if(h%2)h++}else{h=L;w=Math.floor(h*ar);if(w%2)w++}
      h=Math.max(h,1);w=Math.max(w,1);if(w>=h&&w>4096){const a=w/h;w=4096;h=Math.floor(w/a)}else if(h>w&&h>4096){const a=w/h;h=4096;w=Math.floor(h*a)}
      const a2=w/h;if(w>=h){w=Math.ceil(w/tile)*tile;h=Math.floor(w/a2);h=Math.ceil(h/tile)*tile}else{h=Math.ceil(h/tile)*tile;w=Math.floor(h*a2);w=Math.ceil(w/tile)*tile}}
    let tiles=1,rows=0,cols=0;if(split&&(w>tile||h>tile)){rows=Math.ceil(h/tile);cols=Math.ceil(w/tile);tiles=rows*cols+1}
    return {tokens:tiles*64,views:tiles,rows,cols}}
  // Python round(), half to even, as smart_resize uses it
  const pyround=x=>{const f=Math.floor(x),d=x-f;if(Math.abs(d-0.5)<1e-12)return f%2===0?f:f+1;return Math.round(x)};
  // Qwen: models/qwen2_vl/image_processing_qwen2_vl.py smart_resize (line 63), factor = patch 16 x merge 2 for Qwen3.5
  function smart(h,w,factor,minp,maxp){let hb=pyround(h/factor)*factor,wb=pyround(w/factor)*factor;
    if(hb*wb>maxp){const b=Math.sqrt((h*w)/maxp);hb=Math.max(factor,Math.floor(h/b/factor)*factor);wb=Math.max(factor,Math.floor(w/b/factor)*factor)}
    else if(hb*wb<minp){const b=Math.sqrt(minp/(h*w));hb=Math.ceil(h*b/factor)*factor;wb=Math.ceil(w*b/factor)*factor}return [hb,wb]}
  function qwen(W,H,maxTok){const r=smart(H,W,32,65536,(maxTok||16384)*1024);return {tokens:r[0]*r[1]/1024,h:r[0],w:r[1]}}
  // InternVL: models/got_ocr2/image_processing_got_ocr2.py get_all_supported_aspect_ratios (line 51), get_optimal_tiled_canvas
  // (line 86); 448-pixel tiles, 1 to 12, a thumbnail when more than one tile; 256 tokens per tile (pixel shuffle 0.5)
  function ivl(W,H,minT,maxT){minT=minT||1;maxT=maxT||12;const ar=[];for(let a=1;a<=maxT;a++)for(let b=1;b<=maxT;b++)if(a*b<=maxT&&a*b>=minT)ar.push([a,b]);
    ar.sort((x,y)=>x[0]*x[1]-y[0]*y[1]);const asp=W/H,area=W*H;let best=Infinity,grid=[1,1];
    for(const g of ar){const d=Math.abs(asp-g[0]/g[1]);if(d<best){best=d;grid=g}else if(d===best){if(area>0.5*448*448*g[0]*g[1])grid=g}}
    const n=grid[0]*grid[1],views=n===1?1:n+1;return {tokens:views*256,views,cols:grid[0],rows:grid[1]}}
  // Qwen3.5 video: models/qwen3_vl/video_processing_qwen3_vl.py (sample_frames from line 140, smart_resize line 75,
  // cap_pixels_per_frame line 203, used here as the reference qwen-vl-utils behaviour); factor 32, temporal patch 2
  function vrule(s,f,w,h){const nf=Math.min(Math.max(Math.floor(s*f),4),768),fc=768*1024,ppf=Math.max(Math.min(fc,Math.floor(25165824/nf)),Math.floor(4096*1.05)),maxp=ppf*nf;
    let hb=pyround(h/32)*32,wb=pyround(w/32)*32;const tb=pyround(nf/2)*2;
    if(tb*hb*wb>maxp){const b=Math.sqrt(nf*h*w/maxp);hb=Math.max(32,Math.floor(h/b/32)*32);wb=Math.max(32,Math.floor(w/b/32)*32)}
    else if(tb*hb*wb<4096){const b=Math.sqrt(4096/(nf*h*w));hb=Math.ceil(h*b/32)*32;wb=Math.ceil(w*b/32)*32}
    const groups=Math.ceil(nf/2);return {nf,groups,hb,wb,per:hb*wb/1024,tok:groups*hb*wb/1024}}
  return {smol,qwen,ivl,smart,pyround,vrule};
})();
(function(){
  const V=VM,B=VMB,el=V.$('t-vmbud');if(!el)return;const TAB='t-vmbud';
  const R=(V.D.runs||{}),kvS=R.smol&&R.smol.kv,kvQ=R.qwen&&R.qwen.kv;
  // cache per token: configs (derived); for the two models run here, measured by summing the cache after prefill
  function perTok(kv,fallback){if(!kv||kv.runs.length<2)return fallback;const a=kv.runs[0],b=kv.runs[kv.runs.length-1];
    const slope=(b.total_bytes-a.total_bytes)/(b.prompt_tokens-a.prompt_tokens),fixed=a.total_bytes-slope*a.prompt_tokens;return {slope:Math.round(slope),fixed:Math.max(0,Math.round(fixed)),meas:true}}
  const M=[
    {k:'smol',name:'SmolVLM-500M',ctx:8192,kv:perTok(kvS,{slope:40960,fixed:0}),cfg:'2 x 32 layers x 5 KV heads x 64 x 2 bytes = 40,960'},
    {k:'qwen',name:'Qwen3.5-0.8B',ctx:262144,kv:perTok(kvQ,{slope:12288,fixed:0}),cfg:'attention layers only: 2 x 6 x 2 x 256 x 2 = 12,288, plus a fixed linear-attention state'},
    {k:'ivl',name:'InternVL3-1B',ctx:32768,kv:{slope:12288,fixed:0},cfg:'2 x 24 x 2 x 64 x 2 = 12,288 (config)'},
    {k:'llava',name:'LLaVA-1.5-7B',ctx:4096,kv:{slope:524288,fixed:0},cfg:'2 x 32 x 32 x 128 x 2 = 524,288 (config; Llama defaults)'}];
  const PRE=[['64x64','icon 64 x 64'],['512x512','photo 512 x 512'],['1920x1080','1,920 x 1,080'],['1170x2532','phone 1,170 x 2,532'],['1240x1754','A4 page at 150 dpi'],['3840x2160','4K frame']];
  V.seg(V.$('vm-bd-pre'),PRE,'1920x1080',v=>{const p=v.split('x');V.$('vm-bd-w').value=p[0];V.$('vm-bd-h').value=p[1];draw()});
  ['vm-bd-w','vm-bd-h','vm-bd-n','vm-bd-sn','vm-bd-qm','vm-bd-vs','vm-bd-vf','vm-bd-vw','vm-bd-vh'].forEach(id=>V.$(id).addEventListener('input',draw));
  const mb=b=>b>=1e9?(b/1e9).toFixed(2)+' GB':(b/1e6).toFixed(1)+' MB';
  const num=(id,lo,hi,d)=>{const x=+V.$(id).value;return isFinite(x)&&x>0?Math.max(lo,Math.min(hi,Math.round(x))):d};
  function draw(){const W=num('vm-bd-w',16,20000,1920),H=num('vm-bd-h',16,20000,1080),n=num('vm-bd-n',1,200,1),sn=+V.$('vm-bd-sn').value,qm=+V.$('vm-bd-qm').value;
    if(Math.max(W,H)/Math.min(W,H)>200){V.$('vm-bd-tab').innerHTML='<tr><td>Aspect ratio over 200: the Qwen processor refuses such images (ValueError in smart_resize).</td></tr>';return}
    const s=B.smol(W,H,sn),q=B.qwen(W,H,qm),iv=B.ivl(W,H),rows=[
      [M[0],s.tokens,s.views+(s.views>1?' views':' view')+(s.rows?' ('+s.rows+' rows x '+s.cols+' columns + global)':''),s.rows>6||s.cols>6?'tile tags past 6 are not single tokens':''],
      [M[1],q.tokens,'resized to '+q.w+' x '+q.h,''],[M[2],iv.tokens,iv.views+(iv.views>1?' views ('+iv.rows+' rows x '+iv.cols+' columns + thumbnail)':' view'),''],[M[3],576,'squashed to 336 x 336','']];
    let h='<thead><tr><th>Model</th><th class="num">Tokens per image</th><th>How</th><th class="num">All images</th><th class="num">Share of context</th><th class="num">Cache</th></tr></thead><tbody>';
    rows.forEach(r=>{const tot=r[1]*n,kv=r[0].kv.slope*tot,share=tot/r[0].ctx;
      h+='<tr><td>'+r[0].name+'</td><td class="num">'+V.comma(r[1])+'</td><td>'+r[2]+(r[3]?' <span class="der">'+r[3]+'</span>':'')+'</td><td class="num">'+V.comma(tot)+'</td><td class="num">'+(share>1?'<b>'+V.pct(share)+' (over)</b>':V.pct(share,1))+'</td><td class="num">'+mb(kv)+(r[0].kv.fixed?' + '+mb(r[0].kv.fixed)+' fixed':'')+'</td></tr>'});
    V.$('vm-bd-tab').innerHTML=h+'</tbody>';
    V.$('vm-bd-stats').innerHTML=RD.stat('Pixels',V.comma(W*H),'')+RD.stat('Qwen3.5 patches',V.comma(q.tokens*4),'16 x 16 pixels each')+RD.stat('One token covers (Qwen3.5)','32 x 32 px','of the resized image');
    bars(rows,n);
    V.$('vm-bd-note').innerHTML='Cache per token: '+M.map(m=>m.name+' '+V.comma(m.kv.slope)+' bytes'+(m.kv.meas?' <span class="meas">measured</span>':' <span class="der">config</span>')).join('; ')+'. Config arithmetic: '+M.map(m=>m.name+': '+m.cfg).join('; ')+
      '. Context windows from the configs (max_position_embeddings): 8,192, 262,144, 32,768, 4,096. InternVL as its processor tiles by default (crop_to_patches true in InternVLProcessor); LLaVA-1.5 always squashes to one 336 view. Flamingo-style models put 64 visual tokens per image outside the context instead.';
    video()}
  function bars(rows,n){const fig=V.$('vm-bd-fig'),W=Math.min(V.width(fig),760),lh=24,H=rows.length*lh*2+34,{g}=V.canvas(fig,W,H);const lab=W<480?96:130,bw=W-lab-70;
    const mt=Math.max(...rows.map(r=>r[1]*n)),mk=Math.max(...rows.map(r=>r[0].kv.slope*r[1]*n+(r[0].kv.fixed||0)));
    g.fillStyle=V.css('--mute');g.fillText('image tokens (top) and cache bytes (bottom), each scaled to its largest',4,10);
    rows.forEach((r,i)=>{const y=22+i*lh*2;g.fillStyle=V.css('--ink');g.fillText(r[0].name,4,y+lh/2);
      const t=r[1]*n,k=r[0].kv.slope*t+(r[0].kv.fixed||0);g.fillStyle=V.css('--acc');g.fillRect(lab,y+3,Math.max(1,bw*t/mt),lh-8);g.fillStyle=V.css('--c4');g.fillRect(lab,y+lh,Math.max(1,bw*k/mk),lh-8);
      g.fillStyle=V.css('--ink');g.fillText(V.comma(t),lab+Math.max(1,bw*t/mt)+4,y+lh/2);g.fillText(mb(k),lab+Math.max(1,bw*k/mk)+4,y+lh*1.5-2)})}
  function video(){const s=num('vm-bd-vs',1,7200,60),f=+V.$('vm-bd-vf').value,w=num('vm-bd-vw',32,4000,640),h=num('vm-bd-vh',32,4000,360);
    const r=B.vrule(s,f,w,h),vq=(V.D.runs&&V.D.runs.qwen&&V.D.runs.qwen.video)||null,ts=V.D.videoTs||0;
    V.$('vm-bd-vid').innerHTML=RD.stat('Frames sampled',V.comma(r.nf),'4 to 768')+RD.stat('Temporal patches',V.comma(r.groups),'2 frames each')+RD.stat('Tokens per patch',V.comma(r.per),r.wb+' x '+r.hb+' per frame')+
      RD.stat('Video tokens',V.comma(r.tok),ts?'plus about '+V.comma(r.groups*ts)+' timestamp tokens':'')+RD.stat('Qwen3.5 cache',mb(r.tok*M[1].kv.slope),'attention layers');
    V.$('vm-bd-vnote').innerHTML='Qwen3.5&#8217;s video processor ported: frames = seconds x fps, clamped to 4 to 768; each frame resized by smart_resize under a per-frame budget of min(768 tokens, 25,165,824 pixels / frames) (the reference behaviour, cap_pixels_per_frame on); one token per 2 frames x 32 x 32 pixels. Checked against the processor on the clip shapes in out/token_rules.json'+(vq?'; on this page&#8217;s 4-second 320 x 240 clips at 2 fps the processor gave '+vq.rows[0].video_tokens+' video tokens <span class="meas">measured</span>':'')+'. SmolVLM-500M (this checkpoint) and LLaVA-1.5 take no video input.'}
  // accuracy against tokens, measured
  function acc(){const fig=V.$('vm-bd-acc'),pts=V.D.accPts||[];if(!pts.length){fig.innerHTML='<p class="vm-small">Measurements pending.</p>';return}
    const W=Math.min(V.width(fig),760),H=260,{g}=V.canvas(fig,W,H),L=44,Bm=34,T=12,Rr=W-12,lx=t=>L+(Math.log(t)-Math.log(30))/(Math.log(2600)-Math.log(30))*(Rr-L),ly=a=>H-Bm-(a/30)*(H-Bm-T);
    g.strokeStyle=V.css('--line');g.fillStyle=V.css('--mute');[0,10,20,30].forEach(a=>{g.beginPath();g.moveTo(L,ly(a));g.lineTo(Rr,ly(a));g.stroke();g.fillText(a,L-18,ly(a))});
    [32,64,128,256,512,1024].forEach(t=>{g.fillText(t,lx(t)-8,H-Bm+12)});g.fillText('image tokens (log scale)',L,H-6);g.save();g.translate(10,H/2);g.rotate(-Math.PI/2);g.fillText('right of 30',-24,0);g.restore();
    const col={smol:V.css('--acc'),cut:V.css('--c5'),qwen:V.css('--c4')};
    pts.forEach(p=>{g.fillStyle=col[p.g]||V.css('--ink');g.beginPath();g.arc(lx(p.t),ly(p.a),p.g==='cut'?3.5:5,0,7);g.fill();if(p.lab&&(W>=560||p.g!=='cut')&&!(W<560&&p.g!=='cut'&&p.t<1000)){g.fillStyle=V.css('--ink');g.font='10px system-ui';g.fillText(p.lab,lx(p.t)+6,ly(p.a)+(p.g==='qwen'?-7:p.g==='smol'?7:-6));g.font='11px system-ui'}});
    V.$('vm-bd-accnote').innerHTML=(W<560?'Labels shown at wider widths. ':'')+(V.D.accNote||'')}
  V.onRender(()=>{draw();acc()},TAB);addEventListener('resize',()=>{if(!V.$(TAB).hidden){draw();acc()}});
})();
