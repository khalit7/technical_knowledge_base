// ---- Cross-attention viewer (t-ldxa) ----
(function(){
  const U=window.LDU,L=U.L,$=id=>document.getElementById(id),X=L.xa||{};const keys=Object.keys(X);if(!keys.length)return;
  const names={g01:'red bicycle',g01_blue:'blue bicycle',g06:'astronaut, horse',x08:'two cats, three dogs'};
  let P=keys[0],tok=null,mode='step',res='16';const imgCache={};
  const cv=$('xa-cv');
  function img(src,cb){if(imgCache[src]){cb(imgCache[src]);return}const im=new Image();im.onload=()=>{imgCache[src]=im;cb(im)};im.src=src}
  function words(v){const n=v.tokens.length;const r=[];for(let i=0;i<n;i++)r.push(i);return r}
  const clean=s=>s.replace('</w>','').replace('<|startoftext|>','[start]').replace('<|endoftext|>','[end]');
  function setPrompt(k){P=k;const v=X[k];const n=v.tokens.length;tok=tok!=null&&tok<n-2&&tok>0?tok:Math.min(n-3,v.tokens.findIndex((s,i)=>i>0&&/bicycle|horse|cats|dog/.test(s))>0?v.tokens.findIndex((s,i)=>i>0&&/bicycle|horse|cats|dog/.test(s)):1);
    $('xa-toks').innerHTML=words(v).map(i=>'<button data-i="'+i+'"'+(i===tok?' class="on"':'')+'>'+RD.esc(clean(v.tokens[i]))+'</button>').join('');
    an.reset(mode==='step'?v.steps.length:1);mass();an.go(mode==='step'?v.steps.length-1:0)}
  function draw(i){const v=X[P];if(!v||tok==null||tok>=v.tokens.length)return;const st=v.steps[Math.min(i,v.steps.length-1)];
    let map,side;if(mode==='step'){const m=U.b64u8(v.m16[st].b);const n=v.tokens.length;map=m.subarray(tok*256,(tok+1)*256);side=16}else{const m=U.b64u8(v.m32);map=m.subarray(tok*1024,(tok+1)*1024);side=32}
    const src=mode==='step'?v.x0[st]:v.img;
    img(src,im=>U.overlay(cv,im,map,side,0.75));
    $('xa-x0').src=src;
    $('xa-cap1').innerHTML='"'+RD.esc(clean(v.tokens[tok]))+'" '+(mode==='step'?'at step '+(st+1)+' of 25 (timestep '+v.timesteps[st]+')':'averaged over all 25 steps');
    $('xa-cap2').innerHTML=mode==='step'?'predicted clean image at step '+(st+1):'final image, seed '+v.seed;
    const mx=mode==='step'?v.m16[st].max[tok]:v.m32max[tok];
    $('xa-anc').innerHTML='<div class="t">'+RD.esc(v.prompt)+'</div><p>'+(mode==='step'?(st<3?'Early steps: the predicted image is a blur of the layout, and the word\'s map is already roughly where its object will be.':st<12?'Middle steps: the layout is fixed; maps sharpen around their objects.':'Late steps: detail is being added; the maps change little.'):'The run-average map at the 32 &times; 32 layers.')+' Strongest cell for this word: '+U.pct(mx,1)+' of a position\'s attention.</p>'}
  const an=RD.anim({card:'xa-card',ctl:'xa-ctl',n:7,draw,ms:1500,label:'Step',tab:'t-ldxa'});
  $('xa-prompt').innerHTML=keys.map((k,i)=>'<button data-m="'+k+'"'+(i===0?' class="on"':'')+'>'+(names[k]||k)+'</button>').join('');
  RD.seg($('xa-prompt'),k=>{tok=null;setPrompt(k)});
  $('xa-toks').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!b.isConnected||+b.dataset.i>=X[P].tokens.length)return;tok=+b.dataset.i;$('xa-toks').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));an.redraw()});
  RD.seg($('xa-mode'),m=>{mode=m;const v=X[P];an.reset(m==='step'?v.steps.length:1);an.go(m==='step'?v.steps.length-1:0)});
  function mass(){const v=X[P],m=v.mass[res];if(!m){$('xa-mass').innerHTML='';return}
    const rows=m.per_token.map((x,i)=>({name:RD.esc(clean(v.tokens[i]))+(i===v.tokens.length-1?' (first padding)':''),v:x,label:U.pct(x,1),color:i===0?'var(--c2)':i>=v.tokens.length-2?'var(--c6)':'var(--c1)',hl:i===tok}));
    U.bars($('xa-mass'),rows,Math.max(...rows.map(r=>r.v)));
    $('xa-mass-note').innerHTML='Share of the cross-attention of the '+res+' &times; '+res+' layers on each token, averaged over positions, heads, layers and all 25 steps. The start token: '+U.pct(m.start,0)+'; the words: '+U.pct(m.words,0)+'; the end token and all 64 padding positions together: '+U.pct(m.end_and_padding,0)+' (only the first padding position is listed). <span class="meas">measured</span>'}
  RD.seg($('xa-res'),r=>{res=r;mass()});
  // before / after: red vs blue
  (function(){const a=X.g01,b=X.g01_blue;if(!a||!b)return;const ia=a.tokens.findIndex(s=>s.startsWith('red')),ib=b.tokens.findIndex(s=>s.startsWith('blue')),ka=a.tokens.findIndex(s=>s.startsWith('bicycle'));
    const box=$('xa-cmp');box.innerHTML='<figure><img src="'+a.img+'" alt="red"><figcaption>"red", seed 0</figcaption></figure><figure><canvas width="220" height="220" id="xa-c1"></canvas><figcaption>map of "red"</figcaption></figure><figure><img src="'+b.img+'" alt="blue"><figcaption>"blue", seed 0</figcaption></figure><figure><canvas width="220" height="220" id="xa-c2"></canvas><figcaption>map of "blue"</figcaption></figure>';
    const ma=U.b64u8(a.m32),mb=U.b64u8(b.m32);
    img(a.img,im=>U.overlay($('xa-c1'),im,ma.subarray(ia*1024,(ia+1)*1024),32,0.75));img(b.img,im=>U.overlay($('xa-c2'),im,mb.subarray(ib*1024,(ib+1)*1024),32,0.75));
    $('xa-cmp-note').innerHTML='The same starting noise and settings; only the colour word differs. The colour word\'s map (run average, 32 &times; 32 layers) sits on the object it colours. Prompt-to-Prompt (Hertz et al. 2022, <a href="https://arxiv.org/abs/2208.01626" target="_blank" rel="noopener noreferrer">arXiv:2208.01626</a>) turns this into an editing method by reusing the first run\'s maps for the second. <span class="meas">measured</span>'})();
  setPrompt(P);
  RD.onRender(()=>an.redraw(),'t-ldxa');
})();
