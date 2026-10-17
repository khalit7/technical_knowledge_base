// ---- VLM lab: token-budget calculator (SmolVLM's processor arithmetic, checked against the real processor) ----
(function(){
  const V=window.VL;if(!V||!V.D)return;const D=V.D,$=V.$;
  const P=[['512x512','512 × 512 (the test images)'],['64x64','64 × 64 icon'],['1920x1080','1920 × 1080 photo or screen'],['1080x1920','1080 × 1920 phone screenshot'],['2480x3508','2480 × 3508 A4 page at 300 dpi'],['2048x512','2048 × 512 banner']];
  const sel=$('vl-bd-pre'),w=$('vl-bd-w'),h=$('vl-bd-h'),n=$('vl-bd-n'),sp=$('vl-bd-split'),nq=$('vl-bd-q');
  if(!sel)return;
  sel.innerHTML=P.map(p=>'<option value="'+p[0]+'">'+p[1]+'</option>').join('');
  sel.addEventListener('change',()=>{const a=sel.value.split('x');w.value=a[0];h.value=a[1];run()});
  [w,h,n,sp,nq].forEach(e=>e.addEventListener('input',run));
  function qwen(W,H){const r=x=>Math.max(28,Math.round(x/28)*28);return (r(H)/28)*(r(W)/28)}
  function run(){
    const W=Math.max(1,Math.min(10000,+w.value||1)),H=Math.max(1,Math.min(10000,+h.value||1)),N=+n.value,split=sp.checked,q=Math.max(0,+nq.value||0);
    $('vl-bd-nv').textContent=N+' × 512 = '+V.comma(N*512)+' px';n.disabled=!split;
    const c=V.smol(W,H,N,split),tot=c.img+c.markup+q,ctx=8192;
    $('vl-bd-out').innerHTML=V.stat('Image tokens',V.comma(c.img),c.tiles+' view'+(c.tiles>1?'s':'')+' × 64')+
      V.stat('Prompt tokens',V.comma(tot),'image + '+c.markup+' tile markers + '+q+' text')+
      V.stat('Share of the 8,192 context',V.pct(tot/ctx,1),tot>ctx?'<b style="color:var(--bad)">does not fit</b>':V.comma(ctx-tot)+' left for the answer and history')+
      V.stat('Grid',c.rows?c.rows+' × '+c.cols+' + global':'one view',split?'resized to '+c.w+' × '+c.h:'squashed to 512 × 512');
    const notes=[];
    if(split&&Math.abs(c.stretch-1)>0.02)notes.push('The tile grid changes the shape: height-to-width is stretched by '+V.pct(c.stretch-1,0).replace(/^(\d)/,'+$1')+' (resize_for_vision_encoder rounds both sides up to whole tiles, without padding).');
    if(!split&&W!==H)notes.push('With splitting off, the image is squashed to a 512 × 512 square: aspect ratio is lost.');
    if(split&&Math.max(W,H)<N*512)notes.push('The input is smaller than '+V.comma(N*512)+' px on its long side, so it is <b>upscaled</b>: more tokens, no new detail.');
    if(c.badTags)notes.push('<b style="color:var(--bad)">More than 6 rows or columns:</b> tags like &lt;row_7_col_1&gt; are not in the vocabulary and split into 9 ordinary text tokens; the model never saw them in training.');
    $('vl-bd-notes').innerHTML=notes.map(s=>'<li>'+s+'</li>').join('')||'<li>Nothing unusual.</li>';
    // other models for the same image (derived from configs; see the Model map)
    const others=[['SmolVLM-500M (this setting)',c.img,'measured rule'],['LLaVA-1.5',576,'fixed: (336/14)²'],['Qwen2-VL',qwen(W,H),'about (H/28)(W/28); ignores its pixel limits'],['Gemma 4',280,'default soft tokens']];
    const mx=Math.max(...others.map(o=>o[1]));
    $('vl-bd-bars').innerHTML=others.map((o,i)=>'<div class="row'+(i?'':' hl')+'"><span class="nm">'+o[0]+'<span class="vl-sub">'+o[2]+'</span></span><span class="track"><span class="fill" style="width:'+(100*o[1]/mx)+'%;background:var(--'+(i?'c2':'c1')+')"></span></span><span class="val">'+V.comma(o[1])+'</span></div>').join('');
    drawTiles(c,W,H);
  }
  function drawTiles(c,W,H){const cv=$('vl-bd-cv');const bw=Math.min(V.width(cv.parentNode),360),dpr=window.devicePixelRatio||1;
    const sc=Math.min((bw-10)/Math.max(c.w,1),180/Math.max(c.h,1)),pw=Math.max(8,c.w*sc),ph=Math.max(8,c.h*sc),hh=ph+22;
    cv.width=bw*dpr;cv.height=hh*dpr;cv.style.width=bw+'px';cv.style.height=hh+'px';const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,bw,hh);
    x.fillStyle=V.css('--acc2');x.fillRect(0,0,pw,ph);x.strokeStyle=V.css('--acc');x.lineWidth=1.5;
    const r=Math.max(1,c.rows),k=Math.max(1,c.cols);for(let i=0;i<=k;i++){x.beginPath();x.moveTo(i*pw/k,0);x.lineTo(i*pw/k,ph);x.stroke()}for(let i=0;i<=r;i++){x.beginPath();x.moveTo(0,i*ph/r);x.lineTo(pw,i*ph/r);x.stroke()}
    x.fillStyle=V.css('--mute');x.font='12px ui-sans-serif,-apple-system,Segoe UI,Helvetica,Arial,sans-serif';x.fillText(c.w+' × '+c.h+(c.rows?' in '+c.rows*c.cols+' tiles of 512':''),0,ph+15)}
  // measured table
  function table(){const T=D.tokens,rows=[];
    T.square_default.forEach(r=>rows.push([r.w+' × '+r.h,'default (N = 4)',r.tiles,r.image_tokens,r.total_tokens]));
    T.aspect_default.forEach(r=>rows.push([r.w+' × '+r.h,'default (N = 4)',r.tiles,r.image_tokens,r.total_tokens]));
    T.knob.filter(r=>r.input==='512x512').forEach(r=>rows.push(['512 × 512',r.splitting?'N = '+r.N:'splitting off',r.tiles,r.image_tokens,r.total_tokens]));
    $('vl-bd-tab').innerHTML='<table><thead><tr><th>Input</th><th>Setting</th><th class="num">Views</th><th class="num">Image tokens</th><th class="num">Prompt tokens</th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="num">'+r[2]+'</td><td class="num">'+V.comma(r[3])+'</td><td class="num">'+V.comma(r[4])+'</td></tr>').join('')+'</tbody></table>'}
  table();V.onRender(run);run();
  window.addEventListener('resize',()=>{if(sel.offsetParent)run()});
})();
