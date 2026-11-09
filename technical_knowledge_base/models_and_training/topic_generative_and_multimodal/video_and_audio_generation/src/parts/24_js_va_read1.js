// ---- Reading sections 0 and 1: code blocks, VAE table, the measured VAE viewer (the clip-to-tokens stepper became the 3D stage Fig. 1, 28_js_sc1lat.js) ----
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
