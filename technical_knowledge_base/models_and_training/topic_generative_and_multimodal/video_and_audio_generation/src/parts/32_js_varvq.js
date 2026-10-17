// ---- Tab: RVQ codec explorer ----
(function(){
  const U=window.VAU,V=U.V,$=id=>document.getElementById(id),esc=RD.esc;
  const KS={encodec:[1,2,3,4,6,8,12,16,24,32],dac:[1,2,3,4,5,6,7,8,9],mimi:[1,2,4,8,16,32]};
  let ym='mel';const imgs={};
  function img(src){if(!imgs[src]){const im=new Image();im.src=src;imgs[src]=im}return imgs[src]}
  function cur(){const clip=$('rq-clip').value,codec=$('rq-codec').value,ks=KS[codec];const sl=$('rq-k');sl.max=ks.length-1;if(+sl.value>ks.length-1)sl.value=ks.length-1;return {clip,codec,k:ks[+sl.value]}}
  function diff(a,b){const c=$('rq-diff');if(!a.complete||!b.complete||!a.naturalWidth)return;c.width=a.naturalWidth;c.height=a.naturalHeight;const x=c.getContext('2d');
    try{x.drawImage(a,0,0);const A=x.getImageData(0,0,c.width,c.height);x.drawImage(b,0,0);const Bd=x.getImageData(0,0,c.width,c.height);
      for(let i=0;i<A.data.length;i+=4){const d=Math.min(255,3*Math.abs(A.data[i]-Bd.data[i]));A.data[i]=d;A.data[i+1]=Math.round(d*0.6);A.data[i+2]=Math.round(d*0.2);A.data[i+3]=255}x.putImageData(A,0,0)}catch(e){}}
  function draw(){const {clip,codec,k}=cur(),R=V.codecs[clip][codec].rows[k-1],S=V.spec[clip],cd=U.CODEC[codec];
    $('rq-kl').textContent=k+' of '+cd.max;
    const a=img(S.ref),b=img(S[codec+k]);$('rq-ref').src=S.ref;$('rq-rec').src=S[codec+k];$('rq-rl').textContent='Reconstruction: '+cd.n+', first '+k+' codebook'+(k>1?'s':'');
    a.onload=b.onload=()=>diff(a,b);diff(a,b);
    $('rq-stats').innerHTML=RD.stat('Bitrate',U.fx(R.kbps,R.kbps<1?3:2)+' kbps')+RD.stat('Tokens per second',U.int(cd.fr*k))+RD.stat('Spectral error',U.fx(R.mel_l1,3))+RD.stat('SNR',U.fx(R.snr_db,1)+' dB')+
      (R.resid!=null?RD.stat('Unexplained latent energy',U.pct(R.resid,codec==='dac'?0:2),codec==='dac'?'full latent; see Reading 7':''):RD.stat('Decode time',U.fx(R.dec_s,2)+' s','laptop CPU'));
    const A=V.audio[clip],keys=Object.keys(A).filter(x=>x!=='wrongrate');
    const nm=x=>x==='ref'?'Original':x==='opus6'?'Opus 6 kbps':x.replace(/^(encodec|dac|mimi)(\d+)$/,(m,c,n)=>U.CODEC[c].n.split(' ')[0]+' k='+n);
    $('rq-play').innerHTML=keys.map(x=>'<button data-a="'+x+'"'+(x===codec+k?' class="here"':'')+'>&#9654; '+nm(x)+'</button>').join('');
    chart(clip,codec,k)}
  $('rq-play').addEventListener('click',e=>{const b=e.target.closest('button');if(b)U.play(V.audio[$('rq-clip').value][b.dataset.a],b)});
  function chart(clip,codec,k){const el=$('rq-chart'),w=RD.width(el),h=Math.max(220,Math.min(280,w*0.42)),L=44,R=12,T=10,B=30;const C=V.codecs[clip];
    const f=r=>ym==='mel'?r.mel_l1:r.snr_db;const allv=[];['encodec','dac','mimi'].forEach(c=>C[c].rows.forEach(r=>allv.push(f(r))));allv.push(f(C.opus6),f(C.opus12));
    let lo=Math.min(...allv),hi=Math.max(...allv);if(ym==='mel'){lo=0;hi=Math.ceil(hi*5)/5}else{lo=Math.floor(lo/5)*5;hi=Math.ceil(hi/5)*5}
    const xl=Math.log2(0.1),xh=Math.log2(30),X=v=>L+(w-L-R)*(Math.log2(v)-xl)/(xh-xl),Y=v=>T+(h-T-B)*(hi-v)/(hi-lo);let s='';
    const step=ym==='mel'?(hi>1?0.2:0.1):5;for(let v=lo;v<=hi+1e-9;v+=step)s+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(v)+4,ym==='mel'?v.toFixed(1):v,{a:'end',fill:'var(--mute)',fs:10});
    [0.125,0.25,0.5,1,2,4,8,16].forEach(v=>{s+=RD.t(X(v),h-B+14,v,{a:'middle',fill:'var(--mute)',fs:10})});s+=RD.t(w-R,h-4,'kbps (log scale)',{a:'end',fill:'var(--mute)',fs:10});
    ['encodec','dac','mimi'].forEach(c=>{const on=c===codec;s+='<polyline fill="none" stroke="'+U.COL[c]+'" stroke-width="'+(on?2.6:1.4)+'" points="'+C[c].rows.map(r=>X(r.kbps).toFixed(1)+','+Y(f(r)).toFixed(1)).join(' ')+'"/>'});
    [[6,C.opus6],[12,C.opus12]].forEach(([b,o])=>{s+='<rect x="'+(X(b)-4)+'" y="'+(Y(f(o))-4)+'" width="8" height="8" fill="'+U.COL.opus+'"/>'});
    const r=C[codec].rows[k-1];s+='<circle cx="'+X(r.kbps)+'" cy="'+Y(f(r))+'" r="6" fill="'+U.COL[codec]+'" stroke="var(--bg)" stroke-width="2"/>';
    el.innerHTML=RD.svg(w,h,s,'Error against bitrate');
    $('rq-leg').innerHTML='<span style="color:'+U.COL.encodec+'">EnCodec</span> &middot; <span style="color:'+U.COL.dac+'">DAC</span> &middot; <span style="color:'+U.COL.mimi+'">Mimi</span> &middot; <span style="color:'+U.COL.opus+'">Opus (squares)</span>. '+(ym==='mel'?'Lower is closer in spectrum.':'Higher is closer in waveform; note how little SNR says about how a neural codec sounds.')}
  // token-rate table (frame rate x codebooks x bits), with each source's stated bitrate
  const RATES=[['SoundStream (6 kbps)',75,8,1024,'6 kbps','https://arxiv.org/abs/2107.03312'],['EnCodec 24 kHz, 1.5 kbps',75,2,1024,'1.5 kbps','https://arxiv.org/abs/2210.13438'],['EnCodec 24 kHz, 6 kbps (VALL-E)',75,8,1024,'6 kbps','https://arxiv.org/abs/2301.02111'],['EnCodec 24 kHz, 24 kbps',75,32,1024,'24 kbps','https://arxiv.org/abs/2210.13438'],
    ['AudioLM semantic (w2v-BERT k-means)',25,1,1024,'250 bps','https://arxiv.org/abs/2209.03143'],['AudioLM acoustic (SoundStream at 16 kHz)',50,12,1024,'6000 bps','https://arxiv.org/abs/2209.03143'],['MusicGen (EnCodec 32 kHz)',50,4,2048,'not stated','https://arxiv.org/abs/2306.05284'],
    ['DAC 44.1 kHz',44100/512,9,1024,'"8kbps"','https://arxiv.org/abs/2306.06546'],['Mimi (Moshi, 8 codebooks)',12.5,8,2048,'1.1 kbps','https://arxiv.org/abs/2410.00037']];
  $('rq-rates').innerHTML='<thead><tr><th>Codec, setting</th><th>Frames per second</th><th>Codebooks x size</th><th>Tokens per second</th><th>Bitrate (computed)</th><th>Stated</th></tr></thead><tbody>'+
    RATES.map(r=>'<tr><td><a href="'+r[5]+'" target="_blank" rel="noopener noreferrer">'+esc(r[0])+'</a></td><td>'+(r[1]%1?U.fx(r[1],2):r[1])+'</td><td>'+r[2]+' x '+U.int(r[3])+'</td><td>'+U.int(r[1]*r[2])+'</td><td>'+U.int(r[1]*r[2]*Math.log2(r[3]))+' bps</td><td>'+r[4]+'</td></tr>').join('')+'</tbody>';
  ['rq-clip','rq-codec'].forEach(id=>$(id).addEventListener('change',draw));$('rq-k').addEventListener('input',draw);
  RD.seg($('rq-ym'),v=>{ym=v;draw()});RD.onResize(draw,'t-varvq');RD.onRender(draw,'t-varvq');
})();
