// ---- Rule workbench ----
(function(){
  const H=EFH,E=window.EF,$=H.$,W=E.wb;if(!W||!$('ef-w-sl'))return;
  const N=W.n,A=W.alpha,R=W.rules;
  const K=R.map(r=>{const s=W.enc[r.k],a=new Uint8Array(N);for(let i=0;i<N;i++)a[i]=A.indexOf(s[i]);return a});
  const FW=new Uint8Array(N);for(let i=0;i<N;i++)FW[i]=W.fw[i]==='1'?1:0;
  const LAB=W.lab;const rowByDoc={};(E.labels.rows||[]).forEach(r=>{if(r.d>=0)(rowByDoc[r.d]=rowByDoc[r.d]||[]).push(r)});
  const good=c=>c==='W'||c==='K',bad=c=>c==='R'||c==='J';
  const st=R.map(r=>({on:r.k!=='alpha_words_ws',j:r.grid.indexOf(r.dft)}));
  const isBool=r=>r.k==='c4_lorem'||r.k==='c4_curly';
  function fails(ri,i){const r=R[ri],s=st[ri];if(!s.on)return false;const k=K[ri][i];return r.dir==='gt'?s.j<k:s.j>=k}
  function preset(m){R.forEach((r,ri)=>{const s=st[ri];s.j=r.grid.indexOf(r.dft);
    if(m==='none'){s.on=false;return}
    if(m==='gopher'){s.on=r.fam.startsWith('Gopher')&&r.k!=='alpha_words_ws';return}
    if(m==='paper'){s.on=r.k!=='alpha_words'&&r.k!=='list_ratio';if(r.paper!=null)s.j=r.grid.indexOf(r.paper);return}
    s.on=r.k!=='alpha_words_ws'});}
  // the default decision, for the "changed" list
  preset('dt');const DEF=new Uint8Array(N);for(let i=0;i<N;i++){let d=0;for(let ri=0;ri<R.length;ri++)if(fails(ri,i)){d=1;break}DEF[i]=d}
  // sliders
  const fam=[...new Set(R.map(r=>r.fam))];
  $('ef-w-sl').innerHTML=fam.map(f=>'<div class="ef-grp">'+f+'</div>'+R.map((r,ri)=>r.fam!==f?'':'<div class="ef-sl" id="ef-w-r'+ri+'"><span class="nm"><label><input type="checkbox" data-ri="'+ri+'" class="ef-w-on"> '+H.esc(r.label)+'</label> <span class="mute small" id="ef-w-a'+ri+'"></span></span>'+(isBool(r)?'<span class="small mute">drop the document</span>':'<input type="range" min="0" max="'+(r.grid.length-1)+'" data-ri="'+ri+'" class="ef-w-r" aria-label="'+H.esc(r.label)+'">')+'<span class="v" id="ef-w-v'+ri+'"></span></div>').join('')).join('');
  function syncUI(){R.forEach((r,ri)=>{const s=st[ri];const cb=document.querySelector('.ef-w-on[data-ri="'+ri+'"]');cb.checked=s.on;
    const sl=document.querySelector('.ef-w-r[data-ri="'+ri+'"]');if(sl){sl.value=s.j;sl.disabled=!s.on}
    $('ef-w-v'+ri).textContent=isBool(r)?(s.on?'on':'off'):(s.on?(r.dir==='gt'?'> ':'< ')+r.grid[s.j]:'off');
    $('ef-w-r'+ri).classList.toggle('chg',s.on!==(r.k!=='alpha_words_ws')||s.j!==r.grid.indexOf(r.dft))})}
  let show='lost';
  function compute(){const drop=new Uint8Array(N),alone=new Int32Array(R.length);let kept=0,keptFw=0,fwLost=0,gd=0,gt=0,bk=0,bt=0,chg=0;
    for(let i=0;i<N;i++){let d=0;for(let ri=0;ri<R.length;ri++){if(fails(ri,i)){d=1;alone[ri]++}}drop[i]=d;
      if(!d){kept++;if(FW[i])keptFw++}else if(FW[i])fwLost++;
      const c=LAB[i];if(good(c)){gt++;if(d)gd++}if(bad(c)){bt++;if(!d)bk++}if(d!==DEF[i])chg++}
    R.forEach((r,ri)=>{$('ef-w-a'+ri).textContent=st[ri].on?'('+H.n(alone[ri])+')':''});
    $('ef-w-cnt').innerHTML=H.stat('Kept',H.n(kept),'of '+H.n(N)+' (run0: '+H.n(W.run0_kept)+')')+H.stat('Kept and in FineWeb',H.n(keptFw),'FineWeb documents dropped: '+H.n(fwLost))+H.stat('Labelled worth keeping, dropped',gd+' of '+gt,'')+H.stat('Labelled junk, kept',bk+' of '+bt,'')+H.stat('Decisions changed',H.n(chg),'against the defaults');
    $('ef-w-note').innerHTML='Counts in brackets: documents each rule would drop on its own. "In FineWeb": the document is one of the 2,425 FineWeb kept from this WARC file; '+H.n(FW.reduce((a,b)=>a+b,0))+' of the 6,971 are. Labels: '+H.n(gt+bt)+' documents labelled here or in the Pipeline lab <span class="ef-lbl lab">hand-labelled</span>. Rules not shown: more than 100,000 words (no document here) and C4\'s line edits, which are fixed (the statistics after them were computed once with datatrove\'s 3 words per line).';
    // list
    const out=[];for(let i=0;i<N&&out.length<40;i++){const c=LAB[i];if(c==='.')continue;
      const ok=show==='lost'?(good(c)&&drop[i]):show==='gain'?(bad(c)&&!drop[i]):(drop[i]!==DEF[i]);if(!ok)continue;
      const rr=(rowByDoc[i]||[])[0];const why=R.map((r,ri)=>fails(ri,i)?r.label:null).filter(Boolean).slice(0,2).join('; ');
      out.push('<div class="ef-row"><div class="h"><span class="ef-l '+c+'">'+c+'</span><b>'+H.esc(rr&&rr.host||'(Pipeline lab label)')+'</b><span>'+(drop[i]?'dropped by: '+H.esc(why):'kept')+'</span></div><div class="tx">'+(rr&&rr.t?H.esc(rr.t):'<span class="mute">'+(rr&&rr.f?'excerpt withheld (adult or private page)':'excerpt shown in the root\'s Pipeline lab')+'</span>')+'</div></div>')}
    $('ef-w-list').innerHTML=out.length?out.join(''):'<p class="mute small">None with these settings.</p>'}
  document.getElementById('ef-w-sl').addEventListener('input',e=>{const t=e.target;if(!t.classList.contains('ef-w-r'))return;st[+t.dataset.ri].j=+t.value;syncUI();compute()});
  document.getElementById('ef-w-sl').addEventListener('change',e=>{const t=e.target;if(!t.classList.contains('ef-w-on'))return;const ri=+t.dataset.ri;st[ri].on=t.checked;
    if(R[ri].k==='alpha_words'&&t.checked)st[R.findIndex(r=>r.k==='alpha_words_ws')].on=false;if(R[ri].k==='alpha_words_ws'&&t.checked)st[R.findIndex(r=>r.k==='alpha_words')].on=false;syncUI();compute()});
  H.chips($('ef-w-pre'),m=>{preset(m);syncUI();compute()});
  H.chips($('ef-w-show'),m=>{show=m;compute()});
  preset('dt');syncUI();compute();
})();
