// ---- The paper tab: the two-chain animation, the autoencoder explorer, Figure 3, the f sweep, predict reveals ----
// shared drawing helpers (also used by the Generate tab)
const IMG={
  // an image (3 x 32 x 32 in [-1, 1]) to a canvas data URL, nearest-neighbour scaled by k
  url(img,k){const c=document.createElement('canvas');c.width=c.height=32*k;const g=c.getContext('2d'),d=g.createImageData(32,32);
    for(let i=0;i<1024;i++){for(let ch=0;ch<3;ch++)d.data[i*4+ch]=Math.max(0,Math.min(255,Math.round((img[ch*1024+i]+1)*127.5)));d.data[i*4+3]=255}
    const o=document.createElement('canvas');o.width=o.height=32;o.getContext('2d').putImageData(d,0,0);g.imageSmoothingEnabled=false;g.drawImage(o,0,0,32*k,32*k);return c.toDataURL()},
  // one channel plane (h x h numbers) drawn one cell per number, diverging colours over [-lim, lim]
  plane(x,ch,h,cs,lim){const c=document.createElement('canvas');c.width=c.height=h*cs;const g=c.getContext('2d');
    for(let y=0;y<h;y++)for(let xx=0;xx<h;xx++){const v=Math.max(-1,Math.min(1,x[ch*h*h+y*h+xx]/lim));const a=Math.abs(v);
      const gg=Math.round(255*(1-a)*0.95+60*a);
      g.fillStyle='rgb('+(v>0?Math.round(255-a*40):Math.round(255-a*200))+','+gg+','+(v<0?Math.round(255-a*40):Math.round(255-a*200))+')';g.fillRect(xx*cs,y*cs,cs,cs)}
    return c.toDataURL()},
  svgImg(x,y,w,h,u,op){return '<image x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w+'" height="'+h+'" href="'+u+'" style="image-rendering:pixelated"'+(op!=null&&op<1?' opacity="'+op.toFixed(3)+'"':'')+'/>'}};
const CHK=(r,cb)=>{const ok=r.valid&&r.colour===cb[0]&&r.shape===cb[1]&&r.pos===cb[2];return {ok,txt:r.valid?(TOY.COL[r.colour]+' '+TOY.SH[r.shape]+', '+TOY.POS[r.pos]):'no clean single shape found'}};
const pname=cb=>TOY.COL[cb[0]]+' '+TOY.SH[cb[1]]+', '+TOY.POS[cb[2]];
const HELD=(window.LDM_W&&LDM_W.held)||[];
const isHeld=cb=>HELD.some(h=>h[0]===cb[0]&&h[1]===cb[1]&&h[2]===cb[2]);
(function(){const RC=PAPER.rc||{},D=RC.derived||{},TY=RC.toy||{};
  const put=(id,v)=>{const e=$(id);if(e)e.innerHTML=v};
  put('pDays',D.adm_days?D.adm_days.toFixed(1):'4.8');
  put('pq2Drop',D.t2_guidance?D.t2_guidance.drop.toFixed(0):'46');
  put('aeScale',TY.ae4?TY.ae4.scale.toFixed(3)+' (σ̂ = '+(1/TY.ae4.scale).toFixed(3)+'; the toy has no KL pressure to speak of, like the paper\'s 10<sup>−6</sup>)':'(not trained)');

  // ---- the two chains, to scale ----
  const S=20,G=4,NG=S/G,SEED0=3;let prompt=[0,0,0],seed=SEED0,chains={},busy=false;
  const cs0=w=>Math.max(2,Math.min(4,Math.floor((w-24)/(3*32+12))));
  function compute(cb){chains={};busy=true;$('ldxProg').hidden=false;const ids=TOY.tokens(...cb),jobs=['dm_pix','dm_f4'];let ji=0,ch=null,rec=null;
    function slice(){if(ji>=jobs.length){busy=false;$('ldxProg').hidden=true;A0&&A0.draw();return}
      const nm=jobs[ji];if(!ch){LDM.resetMacs();ch=LDM.chain(nm,ids,{S,scale:3,seed});rec={x:[Float32Array.from(ch.x)],x0:[null],macs:[0],ms:[0],prev:[null]};rec.t0=performance.now()}
      const t1=performance.now();const st=ch.next();rec.ms.push(performance.now()-t1);rec.x.push(Float32Array.from(st.x));rec.macs.push(st.macs);rec.x0.push(st.x0);
      if(st.j%G===0){const m0=LDM.macs;rec.prev[st.j]=LDM.toImage(nm,st.x0)}
      if(st.j>=S){const m0=LDM.macs,t2=performance.now();rec.img=LDM.toImage(nm,st.x);rec.decMs=performance.now()-t2;rec.decMacs=nm==='dm_f4'?LDM.macs-m0:0;rec.chk=TOY.check(rec.img);chains[nm]=rec;ji++;ch=null}
      $('ldxProg').firstChild.style.width=(100*(ji*S+(ch?ch.j:0))/(2*S)).toFixed(0)+'%';setTimeout(slice,0)}
    slice()}
  const caps={pix:[
    ['The space','Pixel-space diffusion works on the image itself: 32 × 32 × 3 = 3,072 numbers here (196,608 at 256² in the paper). Every cell is one number.'],
    ['Start from noise','<i>x<sub>T</sub></i> is 3,072 numbers of pure Gaussian noise. Every denoising step must process all of them.'],
    ['Denoise: steps 1 to 4','The UNet predicts the noise in all 3,072 numbers, twice per step (with and without the prompt, for guidance). The small image is the current guess of the clean image, x̂<sub>0</sub>.'],
    ['Denoise: steps 5 to 8','Coarse layout appears first: where the shape is and its colour.'],
    ['Denoise: steps 9 to 12','The same network keeps refining every pixel, including the background grain nobody can see.'],
    ['Denoise: steps 13 to 16','The edges sharpen. Most of the remaining work is perceptual detail.'],
    ['Denoise: steps 17 to 20','The last steps change the image very little, yet cost as much as the first.'],
    ['Nothing to decode','The final <i>x</i><sub>0</sub> is already the image. All the cost was in the 20 steps.'],
    ['Check','The deterministic checker reads the shape, colour and position from the pixels.']],
   lat:[
    ['The space','Latent diffusion works on <i>z</i> = ℰ(<i>x</i>): 8 × 8 × 3 = 192 numbers here, drawn at the same cell size (12,288 at 256² for LDM-4). The image itself is never touched until the end.'],
    ['Start from noise','<i>z<sub>T</sub></i> is 192 numbers of noise: 16 times fewer than the pixel chain.'],
    ['Denoise: steps 1 to 4','The UNet predicts the noise in the latent. The small image is 𝒟(ẑ<sub>0</sub>), the current guess decoded for display only (not counted).'],
    ['Denoise: steps 5 to 8','The latent already encodes the layout; there is no pixel-level grain to model.'],
    ['Denoise: steps 9 to 12','Each step is a fraction of a pixel step: fewer positions, though more channels per position.'],
    ['Denoise: steps 13 to 16','The latent settles.'],
    ['Denoise: steps 17 to 20','The chain ends in latent space.'],
    ['Decode once','One pass of the decoder 𝒟 turns 192 numbers into the 3,072-number image (§3.2).'],
    ['Check','The same checker reads the decoded image.']]};
  const mk=m=>caps[m].map(([t,c])=>({t,c}));
  let A0=null;
  function draw(m,k,e,w){const nm=m==='pix'?'dm_pix':'dm_f4',R=chains[nm],cs=cs0(w),lat=m==='lat',h=lat?8:32,c=3,pw=h*cs,gap=6;
    const Hh=32*cs,wide=w>=3*32*cs+2*gap+150,prevS=wide?Math.min(128,Hh*1.0):96,H=(wide?Hh:Hh+prevS+30)+34;
    let s='';s+=tx(0,13,(lat?'z: 3 planes of 8 × 8':'x: 3 planes (R, G, B) of 32 × 32')+', one cell per number',{fs:12,c:'var(--mute)'});
    // the outline of the pixel-sized planes, so the latent is seen at scale
    for(let p=0;p<3;p++){const x0=p*(32*cs+gap);s+=rc(x0,20,32*cs,32*cs,'none',{s:'var(--line)',r:2,da:lat?'3 3':''})}
    if(!R){s+=tx(8,20+Hh/2,busy?'Running both toy models in your browser…':'Waiting to run',{fs:12,c:'var(--mute)'});return svgW(w,H,s)}
    const j=k<=1?0:k<=6?Math.min(S,(k-1)*G):S,jp=k<=1?0:k===2?0:Math.min(S,(k-2)*G),lim=lat?2.5:1.5;
    const st=k===0?null:R.x[j],sp=k===0?null:R.x[jp];
    for(let p=0;p<c;p++){const x0=p*(32*cs+gap);
      if(st){if(sp&&e<1&&jp!==j)s+=IMG.svgImg(x0,20,pw,pw,IMG.plane(sp,p,h,cs,lim),1);s+=IMG.svgImg(x0,20,pw,pw,IMG.plane(st,p,h,cs,lim),jp!==j?e:1)}
      s+=tx(x0,20+Hh+12,lat?'channel '+(p+1):['R','G','B'][p],{fs:11,c:'var(--mute)'})}
    const px=wide?3*(32*cs+gap)+14:0,py=wide?20:20+Hh+22;
    s+=tx(px,py-6,k>=7?(lat?'𝒟(z): the image':'the image'):k>=2?(lat?'𝒟(ẑ₀), display only':'x̂₀, the current guess'):'',{fs:11,c:'var(--mute)'});
    const im=k>=7?R.img:(k>=2?R.prev[j]:null);
    if(im){s+=IMG.svgImg(px,py,prevS,prevS,IMG.url(im,4),k===7?e:1)}else s+=rc(px,py,prevS,prevS,'var(--soft)',{s:'var(--line)'});
    if(k===8){const v=CHK(R.chk,prompt);s+=tx(px,py+prevS+16,(v.ok?'✓ ':'✗ ')+v.txt,{fs:12,c:v.ok?'var(--good)':'var(--bad)',w:600})}
    return svgW(w,H,s,'The '+(lat?'latent':'pixel')+' chain at step '+(k+1))}
  function counters(m,k){const nm=m==='pix'?'dm_pix':'dm_f4',R=chains[nm],lat=m==='lat',j=k<=1?0:k<=6?Math.min(S,(k-1)*G):S;
    if(!R)return stat('numbers per step',lat?'192':'3,072','');const mac=R.macs[j]+(k>=7?R.decMacs:0),ms=R.ms.slice(0,j+1).reduce((a,b)=>a+b,0)+(k>=7&&lat?R.decMs:0);
    const other=chains[lat?'dm_pix':'dm_f4'];
    return stat('numbers per step',lat?'192':'3,072',lat?'paper LDM-4: 12,288':'paper 256²: 196,608')+stat('network evaluations',fmt(2*j),j+' DDIM steps × 2 (guidance)')+
      stat('multiply-adds so far',(mac/1e6).toFixed(0)+' M',other?'whole chain: '+((R.macs[S]+R.decMacs)/1e6).toFixed(0)+' M against '+((other.macs[S]+other.decMacs)/1e6).toFixed(0)+' M':'')+stat('time in your browser',ms.toFixed(0)+' ms',k>=7&&lat?'incl. decoder '+R.decMs.toFixed(0)+' ms':'')}
  function newPrompt(r){const g=mulberry32(r);prompt=[Math.floor(g()*4),Math.floor(g()*3),Math.floor(g()*9)];seed=1+Math.floor(g()*1000);
    $('ldxP').textContent=pname(prompt);$('ldxSeed').textContent=seed;compute(prompt)}
  prompt=[0,0,0];$('ldxP').textContent=pname(prompt);$('ldxSeed').textContent=seed;
  A0=makeAnim({id:'ldx',mode:'pix',dur:2600,modes:{pix:mk('pix'),lat:mk('lat')},draw,counters});
  let started=false;const go=()=>{if(!started){started=true;compute(prompt)}};
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{if(es[es.length-1].isIntersecting)go()},{threshold:.05}).observe($('ldx'));else go();
  let nn=1;$('ldxNew').addEventListener('click',()=>newPrompt(1000+nn++));
  window.LDX={get chains(){return chains},get busy(){return busy}};

  // ---- the autoencoder explorer ----
  (function(){const host=$('aex');if(!host)return;const fs=Object.keys(LDM_W.models).filter(k=>/^ae\d+$/.test(k)).map(k=>+k.slice(2)).sort((a,b)=>a-b);
    const st={c:2,s:0,p:4,size:6,f:4,seed:11};
    host.innerHTML='<div class="card"><div class="chips" id="aexC">'+TOY.COL.map((n,i)=>'<button data-i="'+i+'">'+n+'</button>').join('')+'</div><div class="chips" id="aexS">'+TOY.SH.map((n,i)=>'<button data-i="'+i+'">'+n+'</button>').join('')+'</div>'+
      '<div class="ctl"><label>Position <select id="aexP">'+TOY.POS.map((n,i)=>'<option value="'+i+'">'+n+'</option>').join('')+'</select></label><label>Size <b id="aexZv"></b><input type="range" id="aexZ" min="4.5" max="7" step="0.25" value="6" aria-label="Shape size"></label></div>'+
      (fs.length>1?'<div class="seg" id="aexF" role="group" aria-label="Downsampling factor">'+fs.map(f=>'<button data-m="'+f+'"'+(f===4?' class="on"':'')+'>f = '+f+'</button>').join('')+'</div>':'')+
      '<div id="aexSvg"></div><div class="out" id="aexO"></div><p class="small mute">The toy autoencoders are trained with an L1 loss and the paper\'s 10<sup>−6</sup> KL weight, without the perceptual and adversarial losses (no pretrained network can be used offline), so they blur edges more than the paper\'s would. Decoding uses the mean of ℰ, as the paper does at test time.</p></div>';
    const chips=(id,key)=>{const el=$(id);el.querySelectorAll('button').forEach(b=>{b.addEventListener('click',()=>{st[key]=+b.dataset.i;run()})})};
    chips('aexC','c');chips('aexS','s');$('aexP').value=st.p;$('aexP').addEventListener('change',e=>{st.p=+e.target.value;run()});$('aexZ').addEventListener('input',e=>{st.size=+e.target.value;run()});
    if($('aexF'))segBind('aexF',m=>{st.f=+m;run()});
    function run(){[['aexC','c'],['aexS','s']].forEach(([id,k])=>$(id).querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.i===st[k])));$('aexZv').textContent=st.size.toFixed(2)+' px';
      const p={shape:st.s,size:st.size,cx:TOY.CEN[st.p%3],cy:TOY.CEN[(st.p/3)|0],bg:[0.82,0.81,0.80],col:TOY.RGB[st.c],seed:st.seed},img=TOY.render(p);
      LDM.resetMacs();const e=LDM.aeEncode('ae'+st.f,img),m1=LDM.macs,rec=LDM.aeDecode('ae'+st.f,e.mu),m2=LDM.macs-m1;
      let mse=0;for(let i=0;i<img.length;i++){const a=(img[i]+1)/2,b=(Math.max(-1,Math.min(1,rec[i]))+1)/2;mse+=(a-b)**2}mse/=img.length;const psnr=10*Math.log10(1/mse);
      const ck=CHK(TOY.check(rec),[st.c,st.s,st.p]);host.__last={psnr,ok:ck.ok};
      fit($('aexSvg'),w=>{const k=Math.max(2,Math.min(4,Math.floor((w-40)/(32*2+8+e.c*32/st.f+8*(e.c-1))))),I=32*k,lw=e.h*k;let s='',x=0;
        s+=tx(0,12,'image x',{fs:11,c:'var(--mute)'})+IMG.svgImg(0,18,I,I,IMG.url(img,k));x=I+14;
        s+=tx(x,12,'latent z = ℰ(x): '+e.c+' × '+e.h+' × '+e.h,{fs:11,c:'var(--mute)'});
        for(let c=0;c<e.c;c++){s+=IMG.svgImg(x,18,lw,lw,IMG.plane(e.mu,c,e.h,k,2.5));x+=lw+6}
        x+=8;const ry=w<x+I?18+I+24:18;const rx=w<x+I?0:x;s+=tx(rx,ry-6,'reconstruction 𝒟(z)',{fs:11,c:'var(--mute)'})+IMG.svgImg(rx,ry,I,I,IMG.url(rec,k));
        $('aexSvg').innerHTML=svgW(w,ry+I+6,s,'Image, latent and reconstruction')});
      $('aexO').innerHTML=stat('numbers','3,072 → '+fmt(e.c*e.h*e.h),(3072/(e.c*e.h*e.h)).toFixed(0)+'× fewer')+stat('reconstruction PSNR',psnr.toFixed(1)+' dB','paper f = '+st.f+' (KL): '+({2:'32.47',4:'27.53',8:'24.19',16:'24.08 (c 16), 21.94 (c 8)'}[st.f]||'')+' dB on ImageNet')+
        stat('checker on 𝒟(z)',(ck.ok?'✓ ':'✗ ')+ck.txt,'')+stat('multiply-adds','encode '+(m1/1e6).toFixed(1)+' M, decode '+(m2/1e6).toFixed(1)+' M','')}
    run();window.AEX={run,st}})();

  // ---- Figure 3, redrawn ----
  fit($('fig3'),w=>{const v=w<620;let s='';const B=(x,y,ww,hh,cls,lines)=>bx(x,y,ww,hh,cls,lines,12);
    if(!v){const y=40,h=44;s+=B(0,y,70,h,'boxa',['x','image'])+ar(70,y+h/2,92,y+h/2)+B(92,y,40,h,'boxc',['ℰ'])+ar(132,y+h/2,152,y+h/2)+B(152,y,58,h,'boxo',['z','latent'])+ar(210,y+h/2,232,y+h/2)+
      B(232,y,96,h,'boxc',['diffusion','z to z(T)'])+ar(328,y+h/2,350,y+h/2)+B(350,y,w-350-170,h,'boxa',['εθ: UNet, T steps','cross-attention: Q from the map, K, V from τθ(y)'])+ar(w-170,y+h/2,w-150,y+h/2)+B(w-150,y,40,h,'boxc',['𝒟'])+ar(w-110,y+h/2,w-90,y+h/2)+B(w-90,y,90,h,'boxa',['x̃','image']);
      s+=B(350,y+80,w-350-170,40,'boxo',['τθ(y): text, layout, class'])+ar(350+(w-520)/2,y+80,350+(w-520)/2,y+h,'')+tx(0,16,'Pixel space',{fs:11,c:'var(--mute)'})+tx(152,16,'Latent space',{fs:11,c:'var(--mute)'})+tx(232,y+h+30,'concat for aligned inputs (maps, low-res images)',{fs:11,c:'var(--mute)'});
      $('fig3').innerHTML=svgEl(w,y+130,s)}
    else{let y=6;const rows=[['x: image','boxa'],['ℰ: encoder','boxc'],['z: latent (training: noised to z(T))','boxo'],['εθ: UNet × T steps, cross-attention to τθ(y)','boxa'],['𝒟: decoder, one pass','boxc'],['x̃: image','boxa']];
      rows.forEach(([t,c],i)=>{s+=B(0,y,w,30,c,[t]);if(i<rows.length-1)s+=ar(w/2,y+30,w/2,y+44);y+=44});s+=tx(0,y+6,'τθ(y): text, layout or class tokens feed every cross-attention layer',{fs:11,c:'var(--mute)'});$('fig3').innerHTML=svgEl(w,y+14,s)}});

  // ---- the f sweep from Tables 8, 13 and 14 ----
  const T8=PAPER.tables.T8.rows.map(r=>{const f=parseInt(r[0]),kl=r[1]==='KL',ref=/VQGAN|DALL/.test(r[0]);return {f,kl,ref,c:r[2],z:r[1],rfid:parseFloat(r[3]),psnr:parseFloat(r[5]),lab:r[0]}});
  let fm='rfid';segBind('fswM',m=>{fm=m;refit($('fsw'))});
  fit($('fsw'),w=>{const H=260,pl=46,pr=34,pt=14,pb=40,fx=[1,2,4,8,16,32];const X=f=>pl+(w-pl-pr)*(Math.log2(f))/5;let s='';
    if(fm==='batch'){const B13=D.t13_batch||{},B14={1:9,2:11,4:48,8:96,16:128,32:128},mx=140,Y=v=>pt+(H-pt-pb)*(1-v/mx);
      [0,40,80,120].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
      fx.forEach(f=>{const b=(B13[f]||{}).batch,x=X(f);s+=tx(x,H-pb+16,'LDM-'+f,{fs:11,a:'middle',c:'var(--mute)'});
        if(b){s+=rc(x-14,Y(b),12,Y(0)-Y(b),'var(--acc)',{r:2})+tx(x-8,Y(b)-4,b,{fs:11,a:'middle'})}s+=rc(x+2,Y(B14[f]),12,Y(0)-Y(B14[f]),'var(--acc2)',{r:2})+tx(x+8,Y(B14[f])-4,B14[f],{fs:11,a:'middle'})});
      const L=legend([['ImageNet, Table 13','var(--acc)'],['CelebA-HQ, Table 14','var(--acc2)']],pl,H-6,w-pl);s+=L.s;
      $('fsw').innerHTML=svgW(w,H+L.h,s,'Batch size per f');$('fswNote').innerHTML='Batch size each LDM trained with on one A100 at about the same parameter count: a direct read of how much cheaper each step is. LDM-8 fits '+(B13[8]?B13[8].x:'9.1')+' times the batch of LDM-1 on ImageNet. The paper does not say how the batch sizes were chosen; read them as "what fit", not as a measured cost.';return}
    const lg=fm==='rfid',lo=lg?0.05:16,hi=lg?40:34,Y=v=>pt+(H-pt-pb)*(1-(lg?(Math.log10(v)-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo)):(v-lo)/(hi-lo)));
    (lg?[0.1,0.3,1,3,10,30]:[18,22,26,30,34]).forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    fx.forEach(f=>{s+=tx(X(f),H-pb+16,'f = '+f,{fs:11,a:'middle',c:'var(--mute)'})});
    const pts=[];T8.forEach(p=>{const v=p[fm];if(!(v>0))return;const x=X(p.f)+(p.kl?6:-6),y=Y(v),col=p.ref?'var(--bad)':p.kl?'var(--acc)':'var(--good)';
      s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4.5" fill="'+col+'"><title>'+p.lab+' |Z| '+p.z+', c = '+p.c+': '+v+'</title></circle>';if(p.ref)pts.push({x,y,t:p.lab.replace(/^\d+ /,'').replace(/ \[\d+\]/,''),fs:11})});
    placeLabels(pts,w,H).forEach(p=>{s+=tx(p.lx,p.ly,p.t,{fs:11,a:p.la,c:'var(--bad)'})});
    s+=tx(12,(pt+H-pb)/2,lg?'reconstruction FID (log)':'PSNR, dB',{fs:11,a:'middle',c:'var(--mute)'}).replace('<text','<text transform="rotate(-90 12 '+((pt+H-pb)/2)+')"');
    const L=legend([['KL-reg.','var(--acc)'],['VQ-reg.','var(--good)'],['earlier tokenizers','var(--bad)']],pl,H-6,w-pl);s+=L.s;
    $('fsw').innerHTML=svgW(w,H+L.h,s,'Autoencoder quality against f');
    $('fswNote').innerHTML='Every autoencoder of Table 8 (trained on OpenImages, evaluated on ImageNet validation; hover a point for its codebook size and channels). Quality falls steadily with f; at f = 16 and 32 more channels buy some of it back. Good reconstruction is necessary, not sufficient: Figure 6\'s point is that f = 1 and 2 reconstruct best and still train worst.'});

  // ---- predict reveals ----
  const bars=(host,rows,unit,note)=>fit($(host),w=>{const mx=Math.max(...rows.map(r=>r[1]))*1.15,lw=Math.min(190,w*0.42),bh=20;let s='';
    rows.forEach((r,i)=>{const y=i*(bh+8),bw=(w-lw-60)*r[1]/mx;s+=tx(lw-6,y+14,r[0],{fs:11,a:'end'})+rc(lw,y,bw,bh,r[2]||'var(--acc)',{r:3})+tx(lw+bw+5,y+14,(r[3]||r[1])+unit,{fs:11})});
    $(host).innerHTML=svgW(w,rows.length*(bh+8)+4,s)+(note?'<p class="small mute">'+note+'</p>':'')});
  PRED_REVEAL.pq1=()=>{const t=D.t6||{},k=t['KL w/ attn']||{};
    // time one guided network evaluation of each toy in this browser
    const ids=TOY.tokens(0,0,0),tm=nm=>{const W=LDM.weights(nm),n=W.cfg.cin*W.cfg.res*W.cfg.res,x=LDM.randn(n,5);LDM.unet(nm,x,500,ids);const t0=performance.now();let r=0;for(let i=0;i<3;i++){LDM.unet(nm,x,500,ids);r++}return (performance.now()-t0)/r};
    const a=tm('dm_pix'),b=tm('dm_f4');window.PQ1={a,b};
    bars('pq1Out',[['paper: training throughput',k.train||2.91],['paper: sampling at 256²',k.s256||3.73],['paper: sampling at 512²',k.s512||4.86],['toy: positions',16,'var(--acc2)','16'],['toy: time per evaluation here',a/b,'var(--acc2)',(a/b).toFixed(1)]],'×','Paper: LDM-4 (KL, with attention) against LDM-1, Table 6. Toy: one network evaluation of the pixel model took '+a.toFixed(1)+' ms and of the latent model '+b.toFixed(1)+' ms in this browser; their multiply-adds differ by '+((TY.pix&&TY.f4)?(TY.pix.macs/TY.f4.macs).toFixed(1):'4.3')+' times.')};
  PRED_REVEAL.pq2=()=>{const ev=(TY.eval_report||{}).dm||{},row=(n,s)=>((ev[n]||{})['held_s'+s]||{}).all;
    bars('pq2Out',[['paper: LDM-KL-8, no guidance',23.31,'var(--mute)'],['paper: LDM-KL-8-G, s = 1.5',12.63],['GLIDE (s = 3)',12.24,'var(--acc2)'],['Make-A-Scene (s = 5)',11.84,'var(--acc2)']],' FID','Table 2, MS-COCO 256², lower is better.');
    const h=$('pq2Out');const t=document.createElement('div');t.className='out';t.innerHTML=stat('toy latent model, s = 1',row('f4',1)!=null?(100*row('f4',1)).toFixed(0)+'%':'n/a','held-out prompts fully right')+stat('toy latent model, s = 3',row('f4',3)!=null?(100*row('f4',3)).toFixed(0)+'%':'n/a','same prompts and seeds')+stat('toy pixel model, s = 1 → 3',row('pix',1)!=null?(100*row('pix',1)).toFixed(0)+'% → '+(100*row('pix',3)).toFixed(0)+'%':'n/a','');setTimeout(()=>h.appendChild(t),0)};
  PRED_REVEAL.pq3=()=>bars('pq3Out',[['ADM-G (pixel), 250 steps',962,'var(--mute)'],['ADM (pixel), no classifier',916,'var(--mute)'],['LDM-4-G (latent)',271],['LDM-8-G (latent)',91]],' V100-days','Table 18, training compute; LDM figures converted from A100-days at 2.2×. FID: 4.59, 10.94, 3.60, 8.11.');
})();
