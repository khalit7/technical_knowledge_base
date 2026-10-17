// ---- Reading sections 6 to 9 and the end: waveform and spectrogram, the RVQ animation, codebook orders, mistakes, reading time ----
(function(){
  const U=window.VAU,V=U.V,$=id=>document.getElementById(id);
  const A=V.audio.speech,SP=V.spec.speech;
  // ---------- section 6: waveform envelope and spectrogram ----------
  $('va-spec-img').src=SP.ref;
  $('va-spec-play').innerHTML='<button data-a="ref">&#9654; Play the sentence (24 kHz)</button>';
  $('va-spec-play').addEventListener('click',e=>{const b=e.target.closest('button');if(b)U.play(A[b.dataset.a],b)});
  function wave(){const el=$('va-wave'),w=RD.width(el),h=56,e=V.env.speech,n=e[0].length,X=i=>w*i/n,Y=v=>h/2-(h/2-2)*v/127;
    let top='',bot='';for(let i=0;i<n;i++){top+=X(i).toFixed(1)+','+Y(e[1][i]).toFixed(1)+' ';bot=X(i).toFixed(1)+','+Y(e[0][i]).toFixed(1)+' '+bot}
    el.innerHTML=RD.svg(w,h,'<polygon points="'+top+bot+'" fill="var(--acc)" opacity="0.7"/><line x1="0" x2="'+w+'" y1="'+h/2+'" y2="'+h/2+'" stroke="var(--line)"/>','Waveform envelope')}
  RD.onRender(wave);RD.onResize(wave);

  // ---------- section 7: the RVQ animation ----------
  const KS=[1,2,3,4,6,8,12,16,24,32];let mode='enc';
  const er=V.codecs.speech.encodec.rows,op=V.codecs.speech;
  $('va-rvq-ref').src=SP.ref;
  function chart(i){const el=$('va-rvq-bar'),w=RD.width(el),h=200,L=38,R=10,T=10,B=30;
    const xl=Math.log2(0.6),xh=Math.log2(30),X=k=>L+(w-L-R)*(Math.log2(k)-xl)/(xh-xl),ymax=0.5,Y=v=>T+(h-T-B)*(1-Math.min(v,ymax)/ymax);let s='';
    [0,0.1,0.2,0.3,0.4,0.5].forEach(v=>{s+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(v)+4,v.toFixed(1),{a:'end',fill:'var(--mute)',fs:10})});
    [0.75,1.5,3,6,12,24].forEach(k=>{s+=RD.t(X(k),h-B+14,k,{a:'middle',fill:'var(--mute)',fs:10})});
    s+=RD.t((L+w-R)/2,h-4,'kbps (log scale); spectral error, lower is better',{a:'middle',fill:'var(--mute)',fs:10});
    s+='<polyline fill="none" stroke="var(--c1)" stroke-width="2" points="'+er.map(r=>X(r.kbps)+','+Y(r.mel_l1)).join(' ')+'"/>';
    [[6,op.opus6.mel_l1],[12,op.opus12.mel_l1]].forEach(([k,v])=>{s+='<rect x="'+(X(k)-4)+'" y="'+(Y(v)-4)+'" width="8" height="8" fill="var(--c4)"/>'});
    if(mode==='enc'){const r=er[KS[i]-1];s+='<circle cx="'+X(r.kbps)+'" cy="'+Y(r.mel_l1)+'" r="6" fill="var(--c1)" stroke="var(--bg)" stroke-width="2"/>'}
    else{const k=i?12:6,v=i?op.opus12.mel_l1:op.opus6.mel_l1;s+='<rect x="'+(X(k)-7)+'" y="'+(Y(v)-7)+'" width="14" height="14" fill="none" stroke="var(--c4)" stroke-width="2.5"/>'}
    s+=RD.t(w-R,T+12,'EnCodec (line), Opus (squares)',{a:'end',fill:'var(--mute)',fs:10});
    el.innerHTML=RD.svg(w,h,s,'Spectral error against bitrate')}
  function playBtns(i){const keys=mode==='enc'?['ref','encodec1','encodec2','encodec8','encodec32']:['ref','opus6','encodec8'];
    const nm={ref:'Original',encodec1:'EnCodec k=1 (0.75 kbps)',encodec2:'k=2 (1.5)',encodec8:'k=8 (6)',encodec32:'k=32 (24)',opus6:'Opus 6 kbps'};
    $('va-rvq-play').innerHTML=keys.map(k=>'<button data-a="'+k+'">&#9654; '+nm[k]+'</button>').join('')}
  $('va-rvq-play').addEventListener('click',e=>{const b=e.target.closest('button');if(b)U.play(A[b.dataset.a],b)});
  function draw(i){if(mode==='enc'){const k=KS[i],r=er[k-1];$('va-rvq-img').src=SP['encodec'+k];$('va-rvq-lab').textContent='Reconstruction from the first '+k+' codebook'+(k>1?'s':'');
      const prev=i?er[KS[i-1]-1]:null;
      $('va-rvq-cap').innerHTML='<div class="t">k = '+k+': '+U.fx(r.kbps,2)+' kbps, '+k*75+' tokens a second</div><p>'+(i===0?'One codebook of 1,024 vectors per 13.3 ms frame: the harmonics of the voice are there but smeared, the high band is noise.':
        'Stages '+(KS[i-1]+1)+' to '+k+' quantize what the earlier stages left: unexplained energy '+U.pct(prev.resid,2)+' to '+U.pct(r.resid,2)+', spectral error '+U.fx(prev.mel_l1,3)+' to '+U.fx(r.mel_l1,3)+'.')+(k===8?' This is EnCodec at 6 kbps, the setting VALL-E used.':'')+(k===32?' The full 24 kbps: further stages would add little.':'')+'</p>';
      $('va-rvq-cnt').innerHTML=RD.stat('Codebooks',k)+RD.stat('Bitrate',U.fx(r.kbps,2)+' kbps')+RD.stat('Unexplained energy',U.pct(r.resid,2))+RD.stat('Spectral error',U.fx(r.mel_l1,3))+RD.stat('SNR',U.fx(r.snr_db,1)+' dB')}
    else{const k=i?12:6,o=i?op.opus12:op.opus6;$('va-rvq-img').src=SP['opus'+k];$('va-rvq-lab').textContent='Opus at '+k+' kbps (libopus via PyAV)';
      $('va-rvq-cap').innerHTML='<div class="t">Opus '+k+' kbps</div><p>'+(i?'At 12 kbps Opus reaches about EnCodec\'s 6 kbps spectral error ('+U.fx(o.mel_l1,3)+' against '+U.fx(er[7].mel_l1,3)+').':'At 6 kbps Opus keeps the low band and drops much of the rest: spectral error '+U.fx(o.mel_l1,3)+', twice EnCodec\'s '+U.fx(er[7].mel_l1,3)+' at the same bitrate.')+'</p>';
      $('va-rvq-cnt').innerHTML=RD.stat('Bitrate',k+' kbps')+RD.stat('Spectral error',U.fx(o.mel_l1,3))+RD.stat('SNR',U.fx(o.snr_db,1)+' dB')}
    chart(i);playBtns(i)}
  const an=RD.anim({card:'va-c-rvq',ctl:'va-rvq-ctl',n:KS.length,ms:1600,label:'Codebooks',draw});
  RD.seg($('va-rvq-mode'),v=>{mode=v;an.reset(v==='enc'?KS.length:2)});
  RD.onResize(()=>an.redraw());RD.onRender(()=>an.redraw());
  U.setAns('va-pr-tok','EnCodec: 75 frames a second x 8 codebooks = 600 tokens a second, so 6,000 for 10 s. Mimi: 12.5 x 8 = 100 a second, so 1,000. With a delay pattern or a depth transformer the model takes 75 or 12.5 big steps a second, not 600 or 100; Mimi\'s low frame rate is what lets Moshi run one 7B forward pass per 80 ms.');

  // ---------- section 8: three orders for 4 codebooks ----------
  let dm='delay';
  const DM={flat:{f:(t,k)=>t*4+k,cap:'Flatten: one token per step, frame by frame. Exact, but 4 steps per frame: 200 steps a second at 50 frames a second.'},
    par:{f:(t,k)=>t,cap:'Parallel: all 4 codebooks of a frame in one step. 50 steps a second, but the 4 tokens of a frame are predicted independently of each other.'},
    delay:{f:(t,k)=>t+k,cap:'Delay: codebook k is shifted k - 1 steps. Still one step per frame (plus 3 at the end), and each fine codebook is predicted after the coarser codebooks of the same frame. MusicGen: 30 s of audio in 1,500 steps.'}};
  function dDraw(){const el=$('va-delay-svg'),w=Math.min(RD.width(el),560),T=6,Fr=6,L=86,cw=(w-L-4)/Fr,rh=26,h=T+4*rh+22,f=DM[dm].f;let s='';
    for(let k=0;k<4;k++){s+=RD.t(L-6,T+k*rh+17,'codebook '+(k+1),{a:'end',fill:'var(--mute)',fs:10.5});
      for(let t=0;t<Fr;t++){const st=f(t,k);s+='<rect x="'+(L+t*cw+1)+'" y="'+(T+k*rh)+'" width="'+(cw-2)+'" height="'+(rh-3)+'" rx="3" fill="var(--acc)" opacity="'+(0.18+0.6*(1-st/27)).toFixed(2)+'"/>'+RD.t(L+t*cw+cw/2,T+k*rh+16,st+1,{a:'middle',fs:11})}}
    for(let t=0;t<Fr;t++)s+=RD.t(L+t*cw+cw/2,h-6,'frame '+(t+1),{a:'middle',fill:'var(--mute)',fs:10});
    el.innerHTML=RD.svg(w,h,s,'Step at which each token is generated');$('va-delay-cap').textContent=DM[dm].cap}
  RD.seg($('va-delay-mode'),v=>{dm=v;dDraw()});RD.onRender(dDraw);RD.onResize(dDraw);

  // ---------- mistakes: real messages ----------
  $('va-mis-frames').textContent=V.src.wan_frames_warn.text.replace(/^f"/,'').replace(/"$/,'')+' (pipeline_wan.py:'+V.src.wan_frames_warn.line+')';
  $('va-mis-hw').textContent=V.src.wan_hw_err.text+' (pipeline_wan.py:'+V.src.wan_hw_err.line+')';
  $('va-mis-proc').textContent=V.mist.processor_wrong_rate.replace(/\{[\s\S]*\}\n?/,'{...} ');
  $('va-mis-bw').textContent=V.mist.encodec_bandwidth_5;$('va-mis-mimi').textContent=V.mist.mimi_40_codebooks;
  $('va-mis-play').addEventListener('click',e=>U.play(A.wrongrate,e.currentTarget));

  // ---------- reading time and predict cards ----------
  (function(){const r=$('t-read');if(!r)return;const c=r.cloneNode(true);c.querySelectorAll('.rd-card,pre,style,script,nav,table,.pr,details').forEach(n=>n.remove());
    const words=(c.textContent.match(/\S+/g)||[]).length;$('va-time').textContent=Math.round(words/200);
    let qa=0;r.querySelectorAll('details').forEach(d=>{qa+=(d.textContent.match(/\S+/g)||[]).length});$('va-time-qa').textContent=Math.max(1,Math.round(qa/200));const mt=$('va-more-time');if(mt)mt.textContent='about '+Math.round(words/200)+' min, plus '+Math.max(1,Math.round(qa/200))+' for the folded answers'})();
  U.wirePredicts();
})();
