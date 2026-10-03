// ---- Defaults across models (t-defaults), part b: recipe morph, flip timeline, convergence plot, disclosure bars, corrections ----
(function(){
  const A=window.DF_A;if(!A)return;
  const {ROWS,COLS,FAMI,famCol,esc,link,fmtDate,KN,LANE}=A;
  const $=id=>document.getElementById(id);
  const tab=()=>$('t-defaults');
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const byId=id=>ROWS.find(r=>r.id===id);
  const col=id=>COLS.find(c=>c.id===id);
  const yr=d=>{const p=d.split('-');return +p[0]+(+p[1]-1)/12+(+p[2]-1)/365};
  const svgW=el=>Math.max(280,Math.floor(el.clientWidth||0));
  const famName=(k,f)=>{const x=(DF.fams[k]||[]).find(a=>a[0]===f);return x?x[1]:f};
  // first model (by date) in the table to use each family of a column
  const firstUse=(k,f)=>ROWS.filter(r=>r.cells[k].fam===f&&r.cells[k].kind!=='nd').sort((a,b)=>a.date<b.date?-1:1)[0];

  // ======== recipe morph ========
  const SL=['act','ffn','norm','place','init','opt','betas','warm','sched','wd','drop','clip','loss','prec'];
  const PRE=[['alexnet','smollm3','AlexNet to SmolLM3'],['transformer','olmo2','Transformer to OLMo 2'],['gpt3','kimik2','GPT-3 to Kimi K2']];
  const mo={a:'alexnet',b:'smollm3',k:0,play:false,t:null,onScreen:true};
  const label=k=>col(k).short;
  const norm=x=>x.v.toLowerCase().replace(/\s+/g,' ').trim();
  const changed=(x,y)=>{if(x.fam&&y.fam)return x.fam!==y.fam;if(y.kind==='nd'||x.kind==='nd')return true;return norm(x)!==norm(y)};
  function moInit(){
    const opts=ROWS.map(r=>'<option value="'+r.id+'">'+esc(r.model)+' ('+r.date.slice(0,4)+')</option>').join('');
    $('df-mo-a').innerHTML=opts;$('df-mo-b').innerHTML=opts;
    $('df-mo-pre').innerHTML=PRE.map((p,i)=>'<button data-i="'+i+'"'+(i===0?' class="on"':'')+'>'+esc(p[2])+'</button>').join('');
    $('df-mo-scr').max=SL.length;
    $('df-mo-a').value=mo.a;$('df-mo-b').value=mo.b;
    $('df-mo-a').addEventListener('change',()=>{mo.a=$('df-mo-a').value;mo.k=0;preOn();moDraw()});
    $('df-mo-b').addEventListener('change',()=>{mo.b=$('df-mo-b').value;mo.k=0;preOn();moDraw()});
    $('df-mo-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=PRE[+b.dataset.i];mo.a=p[0];mo.b=p[1];mo.k=0;$('df-mo-a').value=mo.a;$('df-mo-b').value=mo.b;preOn();moDraw()});
    $('df-mo-back').addEventListener('click',()=>{stop();mo.k=Math.max(0,mo.k-1);moDraw()});
    $('df-mo-fwd').addEventListener('click',()=>{stop();mo.k=Math.min(SL.length,mo.k+1);moDraw()});
    $('df-mo-scr').addEventListener('input',()=>{stop();mo.k=+$('df-mo-scr').value;moDraw()});
    $('df-mo-play').addEventListener('click',()=>{if(mo.play){stop();return}if(mo.k>=SL.length)mo.k=0;mo.play=true;$('df-mo-play').innerHTML='&#10073;&#10073; Pause';moDraw();sched()});
    if('IntersectionObserver' in window)new IntersectionObserver(es=>{mo.onScreen=es[0].isIntersecting}).observe($('df-mo'));
  }
  function preOn(){[...$('df-mo-pre').children].forEach((b,i)=>b.classList.toggle('on',PRE[i][0]===mo.a&&PRE[i][1]===mo.b))}
  function stop(){mo.play=false;clearTimeout(mo.t);$('df-mo-play').innerHTML='&#9654; Play'}
  const visible=()=>mo.onScreen&&!tab().hidden&&!document.hidden;
  function sched(){clearTimeout(mo.t);if(!mo.play)return;
    const sp=+$('df-mo-sp').value||1;
    mo.t=setTimeout(()=>{if(!mo.play)return;if(visible()){mo.k++;moDraw();if(mo.k>=SL.length){stop();return}}sched()},(reduce?2600:1700)/sp)}
  function moDraw(){
    const ra=byId(mo.a),rb=byId(mo.b);if(!ra||!rb)return;
    $('df-mo-scr').value=mo.k;
    let h='<div class="hd">Block</div><div class="hd">'+esc(ra.model)+' <small>'+ra.date.slice(0,4)+'</small></div><div class="hd">'+esc(rb.model)+' <small>'+rb.date.slice(0,4)+'</small></div>';
    let nChanged=0,nSilent=0;
    SL.forEach((k,i)=>{const x=ra.cells[k],y=rb.cells[k],done=i<mo.k,cur=i===mo.k-1;
      const ch=changed(x,y);if(done&&ch&&y.kind!=='nd')nChanged++;if(done&&y.kind==='nd')nSilent++;
      h+='<div class="sl">'+esc(label(k))+'</div>';
      h+='<div class="k-'+x.kind+'">'+esc(x.v)+'</div>';
      const cls='nw'+(done?'':' pend')+(cur?' cur':'')+(done&&!ch?' same':'')+(done&&y.kind==='nd'?' k-nd':'');
      h+='<div class="'+cls+'"'+(reduce?' style="transition:none"':'')+'>'+(done?esc(y.v)+(ch?'':'<small>unchanged</small>'):'&middot;&middot;&middot;')+'</div>'});
    $('df-mo').innerHTML=h;
    const gap=Math.round(yr(rb.date)-yr(ra.date));
    $('df-mo-out').innerHTML=st('Step',mo.k+' of '+SL.length,'one building block per step')+st('Blocks changed',String(nChanged),'of '+Math.min(mo.k,SL.length)+' shown')+st('Not disclosed by '+rb.model,String(nSilent),'blocks with nothing to copy')+st('Years apart',String(Math.abs(gap)),fmtDate(ra.date)+' to '+fmtDate(rb.date));
    $('df-mo-cap').innerHTML=caption(ra,rb);
  }
  const st=(k,v,d)=>'<div class="stat"><div class="k">'+esc(k)+'</div><div class="v">'+esc(v)+'</div><div class="d">'+esc(d)+'</div></div>';
  function caption(ra,rb){
    if(mo.k===0)return 'The left column is '+esc(ra.model)+'\'s recipe as published. Press play or step forward to swap in '+esc(rb.model)+'\'s choices one block at a time.';
    const k=SL[mo.k-1],x=ra.cells[k],y=rb.cells[k],c=col(k);
    let s='<b>'+esc(label(k))+':</b> '+esc(x.v)+' ('+esc(ra.model)+') becomes '+esc(y.v)+' ('+esc(rb.model)+'). ';
    if(y.kind==='nd'){s+=esc(rb.model)+' does not disclose it, so this block of its recipe cannot be copied.'}
    else if(!changed(x,y)){s+='Same choice, '+Math.abs(Math.round(yr(rb.date)-yr(ra.date)))+' years apart.'}
    else if(y.fam&&DF.fams[k]){const f=firstUse(k,y.fam);if(f)s+='First in this table to use '+esc(famName(k,y.fam))+': '+esc(f.model)+' ('+fmtDate(f.date)+', '+link(f.cells[k].src||f.report.url,f.cells[k].sl||f.report.title)+').'}
    else if(y.src){s+='Source: '+link(y.src,y.sl)+'.'}
    if(y.note&&y.kind!=='nd')s+=' <span class="mute">'+esc(y.note)+'</span>';
    if(mo.k===SL.length)s+=' <b>Done:</b> that is the whole of what the two reports let you compare.';
    return s}

  // ======== flip timeline ========
  const LN=['act','norm','place','opt','sched'];
  let tlSel=null;
  function timeline(){
    const el=$('df-tl');if(!el||tab().hidden)return;
    const W=svgW(el),narrow=W<520,L=narrow?74:104,R=10,lh=32,top=6,H=top+LN.length*lh+22;
    const rs=ROWS.slice().sort((a,b)=>a.date<b.date?-1:1),n=rs.length,X=i=>L+8+(W-L-R-16)*i/(n-1);
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="When each default flipped, models in date order">';
    let lastY='',lastLx=-99;rs.forEach((r,i)=>{const y=r.date.slice(0,4);if(y===lastY)return;lastY=y;
      s+='<line x1="'+(X(i)-((W-L-R-16)/(n-1))/2)+'" x2="'+(X(i)-((W-L-R-16)/(n-1))/2)+'" y1="'+top+'" y2="'+(H-20)+'" stroke="var(--line)"/>';
      if(X(i)-lastLx>=(narrow?30:34)){s+='<text x="'+X(i)+'" y="'+(H-6)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(narrow?"'"+y.slice(2):y)+'</text>';lastLx=X(i)}});
    LN.forEach((k,i)=>{const cy=top+i*lh+lh/2;
      s+='<text x="2" y="'+(cy+4)+'" font-size="'+(narrow?10:11.5)+'" fill="var(--ink)">'+esc(narrow?LANE[k].replace('Norm placement','Placement').replace('LR schedule','Schedule'):LANE[k])+'</text>';
      s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+cy+'" y2="'+cy+'" stroke="var(--line)" stroke-dasharray="2 3"/>';
      rs.forEach((r,ri)=>{const x=r.cells[k],px=X(ri),dy=0;
        const on=tlSel&&tlSel.r===r.id&&tlSel.k===k;
        const t=esc(r.model+' ('+r.date.slice(0,7)+'): '+x.v+', '+KN[x.kind]);
        if(x.kind==='nd'||!x.fam){s+='<circle cx="'+px+'" cy="'+(cy+dy)+'" r="4.5" fill="var(--bg)" stroke="var(--bad)" stroke-dasharray="2 1.5" data-r="'+r.id+'" data-k="'+k+'" style="cursor:pointer"><title>'+t+'</title></circle>'}
        else{const fi=FAMI[k][x.fam];s+='<circle cx="'+px+'" cy="'+(cy+dy)+'" r="'+(on?7:5.5)+'" fill="'+famCol(fi)+'"'+(x.kind==='inh'||x.kind==='unc'?' fill-opacity=".45"':'')+' stroke="'+(on?'var(--ink)':'var(--bg)')+'" stroke-width="'+(on?2:1)+'" data-r="'+r.id+'" data-k="'+k+'" style="cursor:pointer"><title>'+t+'</title></circle>'}
      })});
    s+='</svg>';
    el.innerHTML=s+'<p class="small" id="df-tl-cap">'+tlCap()+'</p>';
    let lg='';
    LN.forEach(k=>{const fs=DF.fams[k].map(f=>[f,firstUse(k,f[0])]).filter(a=>a[1]).sort((a,b)=>a[1].date<b[1].date?-1:1);
      lg+='<div class="tll"><b>'+esc(LANE[k])+':</b> '+fs.map(a=>'<span class="ch"><i class="fl" style="background:'+famCol(FAMI[k][a[0][0]])+'"></i>'+esc(a[0][1])+'</span> '+esc(a[1].model)+' '+a[1].date.slice(0,4)).join(', then ')+'</div>'});
    lg+='<p class="small mute">First use in this table, which is adoption by a landmark model, not invention: each choice was published in a paper of its own before these models used it. Pale dots are inherited or unconfirmed values; the dots are evenly spaced in date order, with a line where the year changes.</p>';
    $('df-tl-leg').innerHTML=lg;
  }
  function tlCap(){if(!tlSel)return '<span class="mute">Tap a dot for the model and its choice.</span>';
    const r=byId(tlSel.r),x=r.cells[tlSel.k];return '<b>'+esc(r.model)+'</b> ('+fmtDate(r.date)+'), '+esc(LANE[tlSel.k])+': '+esc(x.v)+' <span class="tag k-'+x.kind+'">'+KN[x.kind]+'</span>'+(x.src?' '+link(x.src,x.sl):'')}

  // ======== convergence plot ========
  const CV=[
    {k:'betas',name:'Beta2 or momentum',log:false,lo:0.88,hi:1.01,tk:[0.9,0.95,0.98,0.999],ex:[],cap:'SGD\'s momentum 0.9 (AlexNet, ResNet-50) survives as Adam\'s beta1 0.9 in every Adam row. Beta2 went from 0.999 (BERT, ViT) and 0.98 (Transformer, CLIP) to 0.95 with GPT-3, and every model here that states it since uses 0.95.'},
    {k:'oeps',name:'Adam epsilon',log:true,lo:1e-10,hi:1e-4,ex:[],cap:'No consensus: 1e-9 (Transformer), 1e-6 (BERT, CLIP), 1e-5 (Llama 2), 1e-8 (GPT-3, OLMo 2, SmolLM3). OLMo 2 measured that 1e-5 slows early training. Most LLM reports do not give it at all.'},
    {k:'neps',name:'Norm epsilon',log:true,lo:1e-13,hi:1e-4,ex:['alexnet'],cap:'BERT\'s 1e-12 is the outlier. Since then models sit at 1e-5 (GPT-2, CLIP, Llama 1 to 3, Mistral) or 1e-6 (T5, ViT, and every 2024 to 2025 model here). AlexNet\'s LRN offset k = 2 is left off: it is a different quantity.'},
    {k:'wd',name:'Weight decay',log:true,lo:5e-5,hi:0.5,ex:[],cap:'Coupled L2 at 1e-4 to 5e-4 for the convnets, decoupled 0.01 for GPT and BERT, then 0.1 from GPT-3 on (CLIP 0.2). The two sides are not the same knob: decoupled decay is multiplied by the learning rate each step, L2 by the gradient\'s path through the optimiser.'},
    {k:'lr',name:'Peak learning rate',log:true,lo:3e-5,hi:0.3,ex:[],cap:'Recorded, not ranked: SGD runs at 0.01 to 0.1 and Adafactor at 0.01 are not on the same scale as Adam. Within the Adam-family LLMs, bigger models get smaller rates: 6e-5 for GPT-3 175B, 8e-5 for Llama 3 405B, 3e-4 for OLMo 2 7B.'},
    {k:'fin',name:'Final LR, % of peak',log:false,lo:0,hi:25,tk:[0,5,10,15,20,25],ex:[],cap:'Where the rate ends. 10% was the cosine default from GPT-3 to Llama 2. Recent runs go to 0 (OLMo 2, SmolLM3, Llama 3\'s final anneal) or a few percent after a stable phase (DeepSeek-V3, Kimi K2). Inverse square root never reaches 0: the Transformer ends at 20% only because it stopped at 100k steps.'},
    {k:'drop',name:'Dropout',log:false,lo:0,hi:0.6,tk:[0,0.1,0.2,0.3,0.4,0.5,0.6],ex:[],cap:'0.5 in AlexNet\'s classifier, 0.1 from the Transformer to T5, then 0 for large pretraining runs (ViT on JFT, OLMo 2). Most LLM reports no longer mention it; one epoch over a huge corpus leaves little to overfit.'},
    {k:'clip',name:'Gradient clip',log:false,lo:0,hi:1.5,tk:[0,0.5,1,1.5],ex:[],cap:'Every model that states a gradient-norm clip uses 1.0, from BERT\'s released code (2018) to SmolLM3. Kimi K2 clips weights (QK-Clip) instead and does not mention a gradient clip.'},
    {k:'ffn',name:'FFN width / d',log:true,lo:0.2,hi:100,ex:[],cap:'4x was universal until gated FFNs. SwiGLU models run 2.7x to 5.4x (three matrices instead of two), MoE experts 0.29x to 0.375x each, and T5-11B is the 64x outlier.'},
    {k:'istd',name:'Init std',log:true,lo:0.003,hi:0.05,ex:[],cap:'GPT\'s N(0, 0.02) of 2018 survives in OLMo 2 and SmolLM3; DeepSeek-V3 used 0.006 although its config says 0.02. Most reports do not say how they initialised.'},
  ];
  let cvK='betas',cvSel=null;
  function cvInit(){
    $('df-cv-ch').innerHTML=CV.map(p=>'<button data-k="'+p.k+'"'+(p.k===cvK?' class="on"':'')+'>'+esc(p.name)+'</button>').join('');
    $('df-cv-ch').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cvK=b.dataset.k;cvSel=null;[...$('df-cv-ch').children].forEach(x=>x.classList.toggle('on',x===b));conv()});
    $('df-cv').addEventListener('click',e=>{const c=e.target.closest('circle[data-r]');if(!c)return;cvSel=c.dataset.r;conv()});
    $('df-tl').addEventListener('click',e=>{const c=e.target.closest('circle[data-r]');if(!c)return;tlSel={r:c.dataset.r,k:c.dataset.k};timeline()});
  }
  const fmtN=(v,log)=>{if(v===0)return '0';if(log&&(v<1e-3||v>=1e3)){const e=Math.floor(Math.log10(v)),m=v/Math.pow(10,e);return (Math.abs(m-1)<1e-9?'':(+m.toPrecision(2))+'x')+'1e'+e}return String(+v.toPrecision(3))};
  function conv(){
    const el=$('df-cv');if(!el||tab().hidden)return;
    const p=CV.find(x=>x.k===cvK),W=svgW(el),narrow=W<520,L=narrow?44:52,R=12,T=10,B=24,H=narrow?210:240;
    const pts=ROWS.filter(r=>p.ex.indexOf(r.id)<0&&r.cells[p.k].kind!=='nd'&&r.cells[p.k].kind!=='na'&&typeof r.cells[p.k].n==='number').map(r=>({r,x:r.cells[p.k]}));
    const silent=ROWS.filter(r=>p.ex.indexOf(r.id)<0&&!(r.cells[p.k].kind!=='nd'&&r.cells[p.k].kind!=='na'&&typeof r.cells[p.k].n==='number'));
    const x0=2012,x1=2026,X=y=>L+(W-L-R)*(y-x0)/(x1-x0);
    const f=v=>p.log?Math.log10(Math.max(v,p.lo)):v,lo=f(p.lo),hi=f(p.hi),Y=v=>T+(H-T-B)*(1-(f(v)-lo)/(hi-lo));
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(p.name)+' by year">';
    const ticks=[];if(p.log){for(let e=Math.ceil(lo);e<=Math.floor(hi);e++)ticks.push(Math.pow(10,e))}else{const st=(p.hi-p.lo)/4;for(let i=0;i<=4;i++)ticks.push(+(p.lo+st*i).toPrecision(3))}
    const tk=p.tk||(p.log&&ticks.length>6?ticks.filter((t,i)=>i%2===0):ticks);
    tk.forEach(t=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(t)+'" y2="'+Y(t)+'" stroke="var(--line)"/><text x="'+(L-4)+'" y="'+(Y(t)+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+fmtN(t,p.log)+'</text>'});
    for(let y=x0;y<=x1;y+=(narrow?4:2))s+='<text x="'+X(y)+'" y="'+(H-6)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+y+'</text>';
    const seen={};
    pts.forEach(o=>{const px=X(yr(o.r.date)),key=Math.round(px/8)+':'+Math.round(Y(o.x.n)/6);seen[key]=(seen[key]||0)+1;const off=(seen[key]-1)*5;
      const on=cvSel===o.r.id,hol=o.x.kind!=='pub';
      s+='<circle cx="'+(px+off)+'" cy="'+Y(o.x.n)+'" r="'+(on?7:5.5)+'" fill="'+(hol?'var(--bg)':'var(--acc)')+'" stroke="'+(on?'var(--ink)':'var(--acc)')+'" stroke-width="'+(on?2.2:1.6)+'" data-r="'+o.r.id+'" style="cursor:pointer"><title>'+esc(o.r.model+': '+o.x.v+' ('+KN[o.x.kind]+')')+'</title></circle>'});
    s+='</svg>';
    let lst=pts.slice().sort((a,b)=>a.r.date<b.r.date?-1:1).map(o=>'<span class="ch">'+esc(o.r.model)+' '+o.r.date.slice(0,4)+': <b>'+esc(fmtN(o.x.n,p.log))+'</b>'+(o.x.kind!=='pub'?' <span class="mute">('+KN[o.x.kind]+')</span>':'')+'</span>').join('; ');
    let selTxt='';if(cvSel){const r=byId(cvSel),x=r.cells[p.k];selTxt='<p class="small"><b>'+esc(r.model)+'</b>: '+esc(x.v)+' <span class="tag k-'+x.kind+'">'+KN[x.kind]+'</span>'+(x.src?' '+link(x.src,x.sl):'')+(x.f?' <span class="mute">'+esc(x.f)+'</span>':'')+'</p>'}
    el.innerHTML=s+selTxt+'<div class="tll">'+lst+'</div>'+(silent.length?'<div class="tll mute">Not disclosed or not applicable: '+silent.map(r=>esc(r.model)).join(', ')+'.</div>':'');
    $('df-cv-cap').innerHTML=esc(p.cap);
  }

  // ======== disclosure bars ========
  const KO=['pub','der','inh','unc','nd','na'];
  const KC={pub:'var(--acc)',der:'color-mix(in srgb,var(--acc) 55%,var(--bg))',inh:'var(--dim)',unc:'color-mix(in srgb,var(--bad) 45%,var(--bg))',nd:'repeating-linear-gradient(135deg,var(--bad) 0 3px,color-mix(in srgb,var(--bad) 30%,var(--bg)) 3px 6px)',na:'var(--soft)'};
  let dView='col';
  function disc(){
    const rs=A.shownRows();
    const bar=(cnt,tot)=>'<div class="dsbar">'+KO.map(k=>cnt[k]?'<span style="width:'+(100*cnt[k]/tot)+'%;background:'+KC[k]+'" title="'+KN[k]+': '+cnt[k]+'"></span>':'').join('')+'</div>';
    let h='<div class="dfctl"><span><span class="lb">Bars per</span><span class="seg" id="df-dv"><button data-v="col"'+(dView==='col'?' class="on"':'')+'>Column</button><button data-v="row"'+(dView==='row'?' class="on"':'')+'>Model</button></span></span></div>';
    const lines=[];
    if(dView==='col'){COLS.forEach(c=>{const cnt={};rs.forEach(r=>{const k=r.cells[c.id].kind;cnt[k]=(cnt[k]||0)+1});const ap=rs.length-(cnt.na||0),ok=(cnt.pub||0)+(cnt.der||0);lines.push({nm:c.short,cnt,tot:rs.length,pc:ap?ok/ap:0})})}
    else{rs.forEach(r=>{const cnt={};COLS.forEach(c=>{const k=r.cells[c.id].kind;cnt[k]=(cnt[k]||0)+1});const ap=COLS.length-(cnt.na||0),ok=(cnt.pub||0)+(cnt.der||0);lines.push({nm:r.model,cnt,tot:COLS.length,pc:ap?ok/ap:0})})}
    lines.forEach(l=>h+='<div class="dsrow"><span class="nm" title="'+esc(l.nm)+'">'+esc(l.nm)+'</span>'+bar(l.cnt,l.tot)+'<span class="pc">'+Math.round(100*l.pc)+'%</span></div>');
    h+='<div class="hmleg">'+KO.map(k=>'<span><i class="lg" style="background:'+KC[k]+'"></i>'+KN[k]+'</span>').join('')+'</div>';
    $('df-disc').innerHTML=h;
    const srt=lines.slice().sort((a,b)=>b.pc-a.pc);
    const tops=srt.filter(l=>l.pc===srt[0].pc).map(l=>l.nm),bots=srt.filter(l=>l.pc===srt[srt.length-1].pc).map(l=>l.nm);
    $('df-disc-cap').innerHTML=rs.length?(dView==='col'?'Over the '+rs.length+' models shown, the most disclosed: '+esc(tops.join(', '))+' ('+Math.round(100*srt[0].pc)+'%); the least: '+esc(bots.join(', '))+' ('+Math.round(100*srt[srt.length-1].pc)+'%).':'Most open recipe: '+esc(tops.join(', '))+' ('+Math.round(100*srt[0].pc)+'%); least: '+esc(bots.join(', '))+' ('+Math.round(100*srt[srt.length-1].pc)+'%). Architecture columns are almost always answerable from a config file; training columns are where labs go quiet.'):'';
    $('df-dv').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;dView=b.dataset.v;disc()});
  }

  // ======== corrections ========
  function corr(){
    $('df-corr').innerHTML=DF.corrections.map(c=>'<div class="corr"><div class="cl">'+esc(c.claim)+'</div><div class="pr">'+esc(c.primary)+' '+link(c.src,'Source')+(c.src2?', '+link(c.src2,'second source'):'')+'. <span class="mute">Rows: '+c.rows.map(id=>esc(byId(id).model)).join(', ')+'.</span></div></div>').join('');
  }

  moInit();cvInit();moDraw();corr();disc();
  let shown=false;
  function render(){if(tab().hidden)return;shown=true;timeline();conv()}
  window.TAB_RENDER=window.TAB_RENDER||{};(window.TAB_RENDER['t-defaults']=window.TAB_RENDER['t-defaults']||[]).push(render);
  let rt=null;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(!tab().hidden)render()},120)});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&mo.play)sched()});
  window.DF_B={disc,render,moDraw};
})();
