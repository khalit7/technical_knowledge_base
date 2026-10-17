// ---- VLM lab: one image through SmolVLM-500M (real vectors) or LLaVA-1.5 (config-derived, illustrative colours) ----
(function(){
  const V=window.VL;if(!V||!V.D)return;const D=V.D,$=V.$,T=D.trace;
  const cv=$('vl-pipe-cv');if(!cv)return;
  let mode='smol';const img=new Image();img.src=D.cat;img.onload=()=>A.redraw();
  const rgb=a=>'rgb('+a[0]+','+a[1]+','+a[2]+')';
  const SM={steps:[
    ['The image','One 512 &#215; 512 photo (the running example&#8217;s cat, <code>p01_cat</code>): 786,432 numbers (512 &#215; 512 &#215; 3).'],
    ['Resize and tile','The processor scales the long side to 2,048 (<code>size.longest_edge</code>), cuts a 4 &#215; 4 grid of 512-pixel tiles, and adds the whole image shrunk to 512 as a 17th &#8220;global&#8221; view. A 512-pixel input is <b>upscaled four times</b> first.'],
    ['Patches','Each tile is cut into 16-pixel patches: 32 &#215; 32 = 1,024 per tile, 17,408 in all. Shown: the global view.'],
    ['Vision encoder','The SigLIP encoder (12 layers, 86.4M parameters) turns every patch into a 768-number vector that has looked at the whole tile. Colours: the first three principal components of the <b>real</b> 1,024 output vectors of the global view.'],
    ['Pixel shuffle','Each 4 &#215; 4 block of neighbouring vectors is concatenated into one: 1,024 vectors of 768 become 64 vectors of 12,288. Nothing is averaged or dropped; positions move into channels (<code>pixel_shuffle</code>, modeling_idefics3.py line 398).'],
    ['Projector','One linear layer (12,288 &#8594; 960, no bias, 11.8M parameters) maps each vector into the language model&#8217;s embedding width. Colours: principal components of the real 64 projected vectors.'],
    ['Into the sequence','The 17 &#215; 64 = 1,088 projected vectors replace the 1,088 <code>&lt;image&gt;</code> placeholders in the prompt; with the tile markers and the question the language model reads <b>1,142</b> tokens.']],
    counters:[[786432,'numbers','',''],[17,'views (16 tiles + global)','',''],[17408,'patches','16 &#215; 16 px',''],[17408,'vectors','width 768',''],[1088,'vectors','width 12,288',''],[1088,'image tokens','width 960',''],[1142,'tokens in the prompt','of 8,192 context','']]};
  const LL={steps:[
    ['The image','The same photo.'],
    ['Resize, no tiles','LLaVA-1.5 resizes (or pads) the image to one 336 &#215; 336 view. No tiles: fine detail is lost to resolution.'],
    ['Patches','CLIP ViT-L/14 cuts 14-pixel patches: (336 / 14)&#178; = 24 &#215; 24 = 576.'],
    ['Vision encoder','576 vectors of 1,024 from the encoder&#8217;s second-to-last layer. <span class="vl-ill">Colours are patch mean colours, illustrative: LLaVA was not run here.</span>'],
    ['No merging','LLaVA-1.5 keeps every patch vector: no pixel shuffle, so 576 stays 576.'],
    ['Projector','A two-layer MLP (GELU) maps each 1,024-vector to the 4,096 width of Vicuna-7B.'],
    ['Into the sequence','576 image tokens plus the question: fewer tokens than SmolVLM&#8217;s 1,088 for a model 14 times larger, but one low-resolution view.']],
    counters:[[786432,'numbers','',''],[1,'view','',''],[576,'patches','14 &#215; 14 px',''],[576,'vectors','width 1,024',''],[576,'vectors','width 1,024',''],[576,'image tokens','width 4,096',''],[576+15,'tokens (with a short question)','derived','']]};
  const cur=()=>mode==='smol'?SM:LL;
  function grid(ctx,x,y,s,n,cols,lw){ctx.strokeStyle=cols;ctx.lineWidth=lw||1;ctx.beginPath();
    for(let i=0;i<=n;i++){const p=Math.round(x+i*s/n)+.5;ctx.moveTo(p,y);ctx.lineTo(p,y+s);const q=Math.round(y+i*s/n)+.5;ctx.moveTo(x,q);ctx.lineTo(x+s,q)}ctx.stroke()}
  function cells(ctx,x,y,s,n,col){const c=s/n;for(let i=0;i<n;i++)for(let j=0;j<n;j++){ctx.fillStyle=rgb(col[i*n+j]);ctx.fillRect(x+j*c,y+i*c,Math.ceil(c),Math.ceil(c))}}
  function blockMean(src,n,b){const m=n/b,out=[];for(let I=0;I<m;I++)for(let J=0;J<m;J++){let s=[0,0,0];for(let i=0;i<b;i++)for(let j=0;j<b;j++){const v=src[(I*b+i)*n+J*b+j];s[0]+=v[0];s[1]+=v[1];s[2]+=v[2]}out.push(s.map(x=>Math.round(x/(b*b))))}return out}
  function seqBar(ctx,x,y,w,h,runs,total){let p=0;const col={text:V.css('--c3'),special:V.css('--mute'),wrap:V.css('--c5'),pos:V.css('--c4'),image:V.css('--c1')};
    runs.forEach(r=>{const k=r[0],n=r[2];ctx.fillStyle=col[k];const a=x+w*p/total,b=Math.max(1,w*n/total-(k==='image'?1:0));ctx.fillRect(a,y,b,h);p+=n})}
  function draw(i){
    const W=V.width(cv.parentNode),narrow=W<560,dpr=window.devicePixelRatio||1;
    const S=narrow?Math.min(W-8,300):Math.min(300,(W-40)/2),H=narrow?S*2+70:S+70;
    cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';
    const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
    const C=cur(),ink=V.css('--ink'),mute=V.css('--mute'),line=V.css('--line');
    const lx=narrow?(W-S)/2:Math.max(0,(W-2*S-30)/2),ly=0,rx=narrow?lx:lx+S+30,ry=narrow?S+24:0;
    ctx.font='12px ui-sans-serif,-apple-system,Segoe UI,Helvetica,Arial,sans-serif';ctx.fillStyle=mute;
    // left panel: the image (with tiling grid at step 1+)
    if(img.complete&&img.naturalWidth)ctx.drawImage(img,lx,ly,S,S);
    if(i>=1){if(mode==='smol'){grid(ctx,lx,ly,S,4,'#fff',2);ctx.fillStyle=mute;ctx.fillText(i===1?'tiles at 2,048 px: 4 × 4 of 512':'16 tiles + 1 global view',lx,ly+S+15)}
      else{ctx.fillStyle=mute;ctx.fillText('one view at 336 px',lx,ly+S+15)}}
    else ctx.fillText('input: 512 × 512',lx,ly+S+15);
    // right panel
    const n=mode==='smol'?32:24;
    if(i===1&&mode==='smol'){const g=S*0.62;if(img.complete&&img.naturalWidth)ctx.drawImage(img,rx+(S-g)/2,ry+(S-g)/2,g,g);ctx.strokeStyle=V.css('--acc');ctx.lineWidth=2;ctx.strokeRect(rx+(S-g)/2,ry+(S-g)/2,g,g);ctx.fillStyle=mute;ctx.fillText('the 17th view: whole image at 512',rx,ry+S+15)}
    else if(i===1){if(img.complete&&img.naturalWidth)ctx.drawImage(img,rx,ry,S,S);ctx.fillText('336 × 336',rx,ry+S+15)}
    else if(i===2){if(img.complete&&img.naturalWidth)ctx.drawImage(img,rx,ry,S,S);grid(ctx,rx,ry,S,n,'rgba(255,255,255,.75)',1);ctx.fillStyle=mute;ctx.fillText(n+' × '+n+' patches'+(mode==='smol'?' (global view)':''),rx,ry+S+15)}
    else if(i===3||i===4&&mode!=='smol'){cells(ctx,rx,ry,S,n,mode==='smol'?T.pca_vision_global:D.llava_patch);ctx.fillStyle=mute;ctx.fillText(n*n+' vectors'+(mode==='smol'?' (real, PCA colours)':' (illustrative)'),rx,ry+S+15)}
    else if(i===4){cells(ctx,rx,ry,S,8,blockMean(T.pca_vision_global,32,4));grid(ctx,rx,ry,S,8,V.css('--bg'),2);ctx.fillStyle=mute;ctx.fillText('64 vectors, each = 16 neighbours side by side',rx,ry+S+15)}
    else if(i===5){if(mode==='smol')cells(ctx,rx,ry,S,8,T.pca_proj_global);else cells(ctx,rx,ry,S,24,D.llava_patch);grid(ctx,rx,ry,S,mode==='smol'?8:24,V.css('--bg'),mode==='smol'?2:1);ctx.fillStyle=mute;ctx.fillText(mode==='smol'?'64 projected vectors (real, PCA colours)':'576 projected vectors (illustrative)',rx,ry+S+15)}
    else if(i>=6){// sequence bar
      const runs=mode==='smol'?D.seq:[['special','',1],['text','',2],['image','',576],['text','',12]],tot=runs.reduce((a,r)=>a+r[2],0);
      const by=ry+8,bw=narrow?S:S;ctx.fillStyle=ink;ctx.fillText(V.comma(tot)+' tokens, left to right',rx,by-0);
      const rowsN=8,per=Math.ceil(tot/rowsN);// wrap the bar over 8 rows for legibility
      let k=0,rem=runs.map(r=>r.slice());for(let r=0;r<rowsN&&k<rem.length;r++){let left=per,out=[];while(left>0&&k<rem.length){const t=Math.min(left,rem[k][2]);out.push([rem[k][0],'',t]);rem[k][2]-=t;left-=t;if(!rem[k][2])k++}
        seqBar(ctx,rx,by+10+r*(S-40)/rowsN,bw,(S-40)/rowsN-6,out,per)}
      const lg=[['image','image',V.css('--c1')],['pos','tile tag',V.css('--c4')],['wrap','wrapper',V.css('--c5')],['text','text',V.css('--c3')]];
      let lxp=rx;lg.forEach(l=>{ctx.fillStyle=l[2];ctx.fillRect(lxp,ry+S-18,10,10);ctx.fillStyle=mute;ctx.fillText(l[1],lxp+13,ry+S-9);lxp+=ctx.measureText(l[1]).width+28})}
    else{ctx.strokeStyle=line;ctx.strokeRect(rx+.5,ry+.5,S-1,S-1);ctx.fillStyle=mute;ctx.fillText('press Play or step',rx+10,ry+S/2)}
    const st=C.steps[i],c=C.counters[i];
    $('vl-pipe-cap').innerHTML='<b>'+(i+1)+'. '+st[0]+'.</b> '+st[1];
    $('vl-pipe-cnt').innerHTML=V.stat('Now',V.comma(c[0]),c[1]+(c[2]?', '+c[2]:''))+V.stat('Image tokens at the end',mode==='smol'?'1,088':'576',mode==='smol'?'measured (processor)':'derived from the config')+V.stat('Model',mode==='smol'?'SmolVLM-500M':'LLaVA-1.5 7B',mode==='smol'?'run here':'not run here');
  }
  const A=V.anim({card:'vl-pipe',ctl:'vl-pipe-ctl',n:7,label:'Pipeline step',draw});
  V.seg($('vl-pipe-mode'),[['smol','SmolVLM-500M (run here)'],['llava','LLaVA-1.5 (config only)']],'smol',v=>{mode=v;A.redraw()});
  window.addEventListener('resize',()=>{if(cv.offsetParent)A.redraw()});
})();
