// ---- Reading section 4: what each corpus kept from the same WARC file (one cell per HTML page), animated ----
(function(){
  const K=window.PC&&PC.kept;if(!K||!document.getElementById('pc-kp'))return;
  const code=K.code,N=code.length,sc=K.edu_scores_measured,tk=K.fw_tokens_gpt2;
  // index of each FineWeb page among FineWeb pages (scores and tokens are stored per FineWeb page, in WARC order)
  const fwIdx=new Int32Array(N).fill(-1);let j=0;for(let i=0;i<N;i++)if(code[i]!=='0')fwIdx[i]=j++;
  const EI=K.edu_int||'';
  let mode=3;
  const fmt=n=>n.toLocaleString('en-US');
  function stats(sel){let p=0,t=0;for(let i=0;i<N;i++)if(sel(i)){p++;const k=fwIdx[i];if(k>=0&&tk[k])t+=tk[k]}return [p,t]}
  const inFW=i=>code[i]!=='0',pubEdu=i=>code[i]==='2',mine=i=>fwIdx[i]>=0&&+EI[fwIdx[i]]>=mode;
  const STEPS=[
    {cap:()=>'<b>The raw file.</b> '+fmt(N)+' HTML pages with status 200, out of '+fmt(K.responses)+' responses. Every cell is one page as the crawler stored it: markup, menus, scripts and, somewhere inside, text.',sel:()=>true,col:()=>'var(--mute)'},
    {cap:()=>'<b>FineWeb.</b> After URL filtering, extraction, English language ID, the Gopher, C4 and FineWeb rules and per-crawl MinHash deduplication, '+fmt(K.fineweb)+' pages survive ('+(100*K.fineweb/N).toFixed(1)+'%).',sel:inFW,col:i=>inFW(i)?'var(--c1)':'var(--dim)'},
    {cap:()=>mode===3?'<b>FineWeb-Edu as published.</b> Of FineWeb\'s pages, the '+K.fineweb_edu+' the classifier scored 3 or more ('+(100*K.fineweb_edu/N).toFixed(2)+'% of the raw pages).':'<b>A lenient cut, measured here.</b> The same classifier, run here on FineWeb\'s pages, keeping score 2 or more (FineWeb-Edu-score-2 uses this cut).',sel:i=>mode===3?pubEdu(i):mine(i),col:i=>(mode===3?pubEdu(i):mine(i))?'var(--c2)':inFW(i)?'var(--c1)':'var(--dim)'},
    {cap:()=>'<b>Checking the classifier here.</b> Run on CPU on all '+fmt(K.fineweb)+' FineWeb pages, the published classifier gives '+fmt(K.mine_ge3)+' of them a score of 3 or more, against '+K.fineweb_edu+' in FineWeb-Edu'+(K.mine_ge3===K.fineweb_edu?': the same count.':'.')+' Pages scoring 2 or more: '+fmt(stats(i=>fwIdx[i]>=0&&+EI[fwIdx[i]]>=2)[0])+'.',sel:i=>mine(i),col:i=>mine(i)?'var(--c2)':inFW(i)?'var(--c1)':'var(--dim)'}
  ];
  // Nemotron-CC v1, from the streamed scan of its CC-MAIN-2024-30 files (real buckets only; the scan may be partial)
  const NM=K.nemo,NR=NM?NM.real:'',NB=['','low','medium-low','medium','medium-high','high'],NC=['','var(--c5)','var(--c6)','var(--c3)','var(--c4)','var(--c2)'];
  if(NM){
    const real=Object.entries(NM.coverage).filter(([b])=>b.endsWith('/actual/actual'));
    const fd=real.reduce((a,[,v])=>a+v.files_done,0),ft=real.reduce((a,[,v])=>a+v.files,0);
    const est=real.reduce((a,[,v])=>a+(v.files_done?v.found*v.files/v.files_done:0),0);
    const nF=NR.split('').filter(c=>c!=='0').length,both=NR.split('').filter((c,i)=>c!=='0'&&code[i]!=='0').length;
    STEPS.push({cap:()=>'<b>Nemotron-CC, partial scan.</b> Its real-text files for this crawl were streamed here, '+fd+' of '+ft+' ('+(100*fd/ft).toFixed(0)+'%, round-robin over the five quality buckets): '+fmt(nF)+' of this file\'s pages found so far, coloured by bucket; '+fmt(both)+' of them are also in FineWeb. Scaled by each bucket\'s scanned share, the whole crawl would hold about '+fmt(Math.round(est/10)*10)+' of these pages (an estimate: files differ in size).',
      sel:i=>NR[i]!=='0',col:i=>NR[i]!=='0'?NC[+NR[i]]:inFW(i)?'var(--dim)':'var(--soft)'});
  }
  let step=0;
  function draw(i){step=i;const el=document.getElementById('pc-kp');const W=RD.width(el);
    const cs=Math.max(2,Math.floor(Math.sqrt(W*(W<500?300:400)/N))),cols=Math.floor(W/cs),rows=Math.ceil(N/cols),H=rows*cs;
    let cv=el.querySelector('canvas');if(!cv){cv=document.createElement('canvas');el.appendChild(cv)}
    const dpr=window.devicePixelRatio||1;cv.width=cols*cs*dpr;cv.height=H*dpr;cv.style.width=(cols*cs)+'px';cv.style.height=H+'px';
    const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cols*cs,H);
    const cssv=v=>getComputedStyle(document.documentElement).getPropertyValue(v.slice(4,-1)).trim()||'#888';
    const cache={};const st=STEPS[i];
    const hot=[];
    for(let k=0;k<N;k++){const c=st.col(k);if(c==='var(--c2)'||(i===4&&NR[k]!=='0'))hot.push(k);ctx.fillStyle=cache[c]||(cache[c]=cssv(c));ctx.fillRect((k%cols)*cs,Math.floor(k/cols)*cs,cs-(cs>2?1:0),cs-(cs>2?1:0))}
    // the few pages the educational filter keeps are drawn a little larger on top, so they stay visible on a phone
    if(cs<4)hot.forEach(k=>{const c=st.col(k);ctx.fillStyle=cache[c]||(cache[c]=cssv(c));ctx.fillRect((k%cols)*cs-1,Math.floor(k/cols)*cs-1,cs+2,cs+2)});
    const [p,t]=stats(st.sel),[,tAll]=stats(inFW);
    document.getElementById('pc-kp-cap').innerHTML=st.cap();
    const lg=document.getElementById('pc-kp-leg');if(lg)lg.innerHTML=i===4?NB.slice(1).map((b,j)=>'<span><i style="background:'+NC[j+1]+'"></i>Nemotron-CC '+b+'</span>').reverse().join('')+'<span><i style="background:var(--dim)"></i>FineWeb, not found in Nemotron-CC</span>':'<span><i style="background:var(--dim)"></i>dropped by FineWeb\'s pipeline</span><span><i style="background:var(--c1)"></i>in FineWeb</span><span><i style="background:var(--c2)"></i>kept by the educational filter</span>';
    document.getElementById('pc-kp-ctr').innerHTML='<span>pages <b>'+fmt(p)+'</b></span><span>share of the raw HTML pages <b>'+(100*p/N).toFixed(2)+'%</b></span>'+(i===4?'<span>also in FineWeb <b>'+fmt(stats(k=>NR[k]!=='0'&&inFW(k))[0])+'</b></span>':i>0?'<span>GPT-2 tokens <b>'+fmt(t)+'</b> ('+(100*t/tAll).toFixed(1)+'% of FineWeb\'s)</span>':'<span>GPT-2 tokens <b>not counted for raw HTML</b></span>');
  }
  const an=RD.anim({card:'pc-kp-card',ctl:'pc-kp-ctl',n:STEPS.length,ms:2200,label:'Step',draw});
  RD.seg(document.getElementById('pc-kp-seg'),m=>{mode=+m;an.reset(STEPS.length);an.go(2)});
  RD.onResize(()=>an.redraw());
})();
