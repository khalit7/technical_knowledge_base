// ---- Reading sections 0 and 1: code blocks, the clip-to-tokens animation, VAE table, the measured VAE viewer ----
(function(){
  const U=window.VAU,V=U.V,$=id=>document.getElementById(id),esc=RD.esc;
  U.fill(document.getElementById('t-read'));
  // real source, quoted from the pinned clones (inputs/source_lines.json)
  const S=V.src;
  $('va-code-wanvae').textContent=S.wan_vae_loop.text;
  $('va-wanvae-lines').innerHTML='<a href="'+S.wan_vae_loop.url+'" target="_blank" rel="noopener noreferrer">'+S.wan_vae_loop.line+' to '+S.wan_vae_loop.last+'</a>';
  $('va-code-rvq').textContent=S.enc_rvq_encode.text;
  $('va-rvq-lines').innerHTML='<a href="'+S.enc_rvq_encode.url+'" target="_blank" rel="noopener noreferrer">'+S.enc_rvq_encode.line+' to '+S.enc_rvq_encode.last+'</a>';
  $('va-dist-line').textContent=S.enc_dist.line;$('va-bw-line').textContent=S.enc_bw_per_q.line;
  $('va-code-run').textContent=V.runcode+'\n\n# printed (speech and music; first, eighth and last row of each codec):\n'+V.runout;

  // ---------- animation: one clip, three compressors ----------
  const MODES={img:{n:'image VAE per frame',ct:1,cs:8,p:2,first:false},wan:{n:'Wan 2.1 video VAE',ct:4,cs:8,p:2,first:true},ltx:{n:'LTX-Video VAE',ct:8,cs:32,p:1,first:true}};
  const F=81,H=480,W=832;let mode='wan';
  function counts(m){const lf=m.first?1+(F-1)/m.ct:F/m.ct;const th=H/m.cs/m.p,tw=W/m.cs/m.p;return {lf,th,tw,s:th*tw,N:lf*th*tw}}
  const cv=$('va-patch-cv'),cap=$('va-patch-cap'),cnt=$('va-patch-cnt');
  const CAPS=[
    ['The clip','81 frames of 480 &times; 832 pixels (about 5 s at 16 frames a second): 97 million numbers. A disc moves across it; neighbouring frames are almost identical.'],
    ['Group the frames in time',''],
    ['Shrink each latent frame in space',''],
    ['Cut into patches',''],
    ['One sequence of tokens','']];
  function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888'}
  function draw(i){
    const m=MODES[mode],c=counts(m),w=RD.width(cv.parentElement),h=Math.round(Math.max(250,Math.min(320,w*0.38)));
    const dpr=window.devicePixelRatio||1;cv.width=w*dpr;cv.height=h*dpr;cv.style.height=h+'px';
    const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
    const ink=css('--ink'),mute=css('--mute'),acc=css('--acc'),c2=css('--c2'),c3=css('--c3'),soft=css('--soft'),line=css('--line');
    x.font='11px system-ui,sans-serif';x.fillStyle=ink;
    // row of 81 frames
    const fw=(w-20)/F,fy=18,fh=Math.min(46,h*0.18);
    for(let f=0;f<F;f++){const gx=10+f*fw;
      let g=m.first?(f===0?0:1+Math.floor((f-1)/m.ct)):Math.floor(f/m.ct);
      x.fillStyle=i>=1?(g%2?c2:acc):mute;x.globalAlpha=i>=1?0.55:0.35;x.fillRect(gx,fy,Math.max(1,fw-0.6),fh);
      x.globalAlpha=1;x.fillStyle=ink;const cx=gx+fw/2,cy=fy+fh*(0.2+0.6*f/F);x.beginPath();x.arc(cx,cy,Math.max(1,fw*0.35),0,7);x.fill()}
    x.fillStyle=mute;x.fillText('81 frames (time runs left to right)',10,12);
    if(i>=1){x.fillStyle=ink;x.fillText(c.lf+' latent frames'+(m.first?' (frame 0 alone, then groups of '+m.ct+')':''),10,fy+fh+14)}
    // one latent frame, to scale against the pixel frame
    const by=fy+fh+26,bh=h-by-24;
    if(i>=2){const sc=Math.min((w*0.42)/W,(bh-4)/H);const pw=W*sc,ph=H*sc;
      x.fillStyle=mute;x.fillText('one frame, 480 x 832 px',10,by+10);const bx=by+14;x.strokeStyle=mute;x.strokeRect(10,bx,pw,ph);
      const lw=W/m.cs,lh=H/m.cs,cw=pw/lw,ch=ph/lh;
      x.strokeStyle=i>=3?acc:line;x.globalAlpha=0.7;const step=i>=3?m.p:1;
      for(let a=0;a<=lw;a+=step){x.beginPath();x.moveTo(10+a*cw,bx);x.lineTo(10+a*cw,bx+ph);x.stroke()}
      for(let b=0;b<=lh;b+=step){x.beginPath();x.moveTo(10,bx+b*ch);x.lineTo(10+pw,bx+b*ch);x.stroke()}
      x.globalAlpha=1;x.fillStyle=ink;x.fillText(i>=3?(c.th+' x '+c.tw+' = '+U.int(c.s)+(w<560?' per frame':' per latent frame')):(lh+' x '+lw+' latent grid'),10,Math.min(h-3,bx+ph+13));
    }
    // the sequence: one square per 390 tokens (one LTX latent frame), same scale in all modes
    if(i>=4){const unit=390,nsq=Math.round(c.N/unit),lab=c.th+' x '+c.tw+' = '+U.int(c.s)+(w<560?' per frame':' per latent frame'),x0=Math.max(w*0.47,14+Math.min(w*0.42,x.measureText(lab).width)),aw=w-x0-8;
      let side=12,per=1;for(;side>2;side--){per=Math.max(1,Math.floor(aw/(side+1)));if(Math.ceil(nsq/per)*(side+1)<=bh+6)break}per=Math.max(1,Math.floor(aw/(side+1)));
      for(let k=0;k<nsq;k++){x.fillStyle=k%2?acc:c3;x.fillRect(x0+(k%per)*(side+1),by+14+Math.floor(k/per)*(side+1),side,side)}
      x.fillStyle=ink;x.fillText(U.int(c.N)+' tokens (square = 390)',x0,by+10)}
  }
  const an=RD.anim({card:'va-c-patch',ctl:'va-patch-ctl',n:5,ms:1700,label:'Step',draw:i=>{
    const m=MODES[mode],c=counts(m);
    const t=[CAPS[0][1],
      m.first?('Frame 0 is encoded alone, then every '+m.ct+' frames share one latent frame, with a cache of features from earlier frames only (causal): 1 + 80 / '+m.ct+' = '+c.lf+' latent frames.'):'An image VAE has no time axis: every one of the 81 frames gets its own latent frame, however similar it is to the last.',
      'Space shrinks '+m.cs+' times per side: 480 x 832 becomes '+H/m.cs+' x '+W/m.cs+'.'+(mode==='ltx'?' LTX packs 4 x 4 pixel patches into the VAE input and keeps 128 channels to hold the detail.':' The latent keeps 16 channels per position.'),
      m.p>1?('The denoiser groups '+m.p+' x '+m.p+' latent positions into one token: '+c.th+' x '+c.tw+' = '+U.int(c.s)+' tokens per latent frame.'):'LTX-Video uses 1 x 1 patches: patching already happened inside the VAE. '+U.int(c.s)+' tokens per latent frame.',
      U.int(c.lf)+' x '+U.int(c.s)+' = '+U.int(c.N)+' tokens. Full attention forms '+U.int(c.N*c.N/1e6)+' million pairs per head per layer'+(mode==='wan'?'.':', against 1,073 million for Wan\'s VAE.')][i];
    cap.innerHTML='<div class="t">'+(i+1)+'. '+CAPS[i][0]+' ('+m.n+')</div><p>'+t+'</p>';
    cnt.innerHTML=RD.stat('Frames',81)+RD.stat('Latent frames',i>=1?c.lf:'?')+RD.stat('Tokens per latent frame',i>=3?U.int(c.s):'?')+RD.stat('Tokens',i>=4?U.int(c.N):'?')+RD.stat('Pairs per head',i>=4?U.int(c.N*c.N/1e6)+'M':'?');
    draw(i)}});
  RD.seg($('va-patch-mode'),v=>{mode=v;an.redraw()});
  RD.onResize(()=>an.redraw());RD.onRender(()=>an.redraw());

  // ---------- VAE table ----------
  const rows=V.models.map(m=>{const c=U.calc(m);return '<tr><td>'+esc(m.n)+'</td><td>'+m.ct+' x '+m.cs+' x '+m.cs+'</td><td>'+m.ch+'</td><td>'+U.fx(c.vae,0)+'</td><td>'+m.pt+' x '+m.ph+' x '+m.ph+'</td><td>'+U.int(c.ppt)+'</td></tr>'});
  $('va-vae-table').innerHTML='<thead><tr><th>Model</th><th>VAE time x height x width</th><th>Channels</th><th>Ratio</th><th>Patch</th><th>Pixels per token</th></tr></thead><tbody>'+rows.join('')+'</tbody>';
  $('va-vae-repro').innerHTML='Published figures recomputed from the factors: '+V.reproduce.map(r=>{const m=U.mById[r.model],c=U.calc(m);
    const got=r.kind==='ratio'?c.ppt:r.kind==='vae_ratio'?c.vae:c.N;const ok=r.kind?Math.abs(got-r.stated)<0.5:Math.abs(got-r.stated)/r.stated<0.02;
    return '<a href="'+r.src+'" target="_blank" rel="noopener noreferrer">'+esc(r.what)+'</a>: '+U.int(got)+(ok?' (reproduces, independently)':' (does not reproduce)')}).join('; ')+'. Mochi\'s card also says "128x smaller"; its own factors give 3 x 8 x 8 x 6 / 12 = 96.';

  // ---------- measured VAE viewer ----------
  let clip='slow',fi=0;const trio=$('va-vae-trio');
  trio.innerHTML=['Original','Reconstruction','Difference x4'].map((t,i)=>'<figure style="margin:0;text-align:center;font-size:11px;color:var(--mute)"><canvas id="va-vae-c'+i+'" width="96" height="96" style="width:100%;border-radius:4px;background:var(--soft)"></canvas>'+t+'</figure>').join('');
  const imgs={};function img(src){if(!imgs[src]){const im=new Image();im.src=src;imgs[src]=im}return imgs[src]}
  function showFrame(){const c=V.vae.clips[clip],a=img(c.orig[fi]),b=img(c.recon[fi]);$('va-vae-fi').textContent=fi+' (PSNR '+U.fx(c.psnr[fi],1)+' dB)';
    const go=()=>{if(!a.complete||!b.complete)return;const ctx=[0,1,2].map(i=>$('va-vae-c'+i).getContext('2d'));ctx[0].drawImage(a,0,0,96,96);ctx[1].drawImage(b,0,0,96,96);
      try{const A=ctx[0].getImageData(0,0,96,96),Bd=ctx[1].getImageData(0,0,96,96),O=ctx[2].createImageData(96,96);
        for(let k=0;k<A.data.length;k+=4){const d=(Math.abs(A.data[k]-Bd.data[k])+Math.abs(A.data[k+1]-Bd.data[k+1])+Math.abs(A.data[k+2]-Bd.data[k+2]))/3*4;O.data[k]=O.data[k+1]=O.data[k+2]=Math.min(255,d);O.data[k+3]=255}
        ctx[2].putImageData(O,0,0)}catch(e){}};
    a.onload=b.onload=go;go();chart()}
  function chart(){const el=$('va-vae-chart'),w=RD.width(el),h=170,L=34,R=8,T=8,Bm=24;const lo=26,hi=40;
    const X=i=>L+(w-L-R)*i/16,Y=v=>T+(h-T-Bm)*(hi-v)/(hi-lo);let s='';
    for(let v=lo;v<=hi;v+=2){s+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(v)+4,v,{a:'end',fill:'var(--mute)'})}
    for(let g=1;g<=16;g+=4){s+='<rect x="'+X(g-0.5)+'" y="'+T+'" width="'+(X(g+3.5)-X(g-0.5))+'" height="'+(h-T-Bm)+'" fill="var(--soft)" opacity="'+(g%8===1?0.9:0)+'"/>'}
    ['slow','fast'].forEach(k=>{const p=V.vae.clips[k].psnr,on=k===clip;s+='<polyline fill="none" stroke="'+(k==='slow'?'var(--c3)':'var(--c2)')+'" stroke-width="'+(on?2.4:1.2)+'" opacity="'+(on?1:0.5)+'" points="'+p.map((v,i)=>X(i)+','+Y(v)).join(' ')+'"/>'+
      p.map((v,i)=>'<circle cx="'+X(i)+'" cy="'+Y(v)+'" r="'+(on&&i===fi?4:on?2.2:1.4)+'" fill="'+(k==='slow'?'var(--c3)':'var(--c2)')+'"/>').join('')});
    for(let i=0;i<=16;i+=4)s+=RD.t(X(i),h-8,i,{a:'middle',fill:'var(--mute)'});
    s+=RD.t(L-6,h-8,'frame',{a:'end',fill:'var(--mute)',fs:10});
    el.innerHTML=RD.svg(w,h,s,'PSNR per frame');
    $('va-vae-note').innerHTML='Shaded bands: frames 1 to 4 and 9 to 12, two of the four groups that share a latent frame (frame 0 is alone). Green: slow pan, orange: fast pan. Latent '+V.vae.clips[clip].latent_shape.slice(1).join(' x ')+'; Wan 2.1 VAE, '+U.int(V.vae.params)+' parameters, revision '+V.vae.revision.slice(0,7)+'.'}
  $('va-vae-f').addEventListener('input',e=>{fi=+e.target.value;showFrame()});
  RD.seg($('va-vae-clip'),v=>{clip=v;showFrame()});
  RD.onRender(showFrame);RD.onResize(chart);

  // ---------- predict: doubling the frames ----------
  const m13=U.mById.wan13,a=U.calc(m13),b=U.calc(m13,{F:161});
  U.setAns('va-pr-frames','Tokens: '+U.int(a.N)+' to '+U.int(b.N)+' ('+U.fx(b.N/a.N,2)+' times: 41 latent frames against 21). Self-attention FLOPs grow with the square: '+U.fx(b.att/a.att,2)+' times. The whole pass grows '+U.fx(b.per/a.per,2)+' times, because the linear layers only double. Duration is the expensive axis.');
})();
