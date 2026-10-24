// Reading: fastText step animation (qc-a1), GPT-3 Pareto keep curve (qc-pareto), predict-then-reveal widgets (.pr)
(function(){
  const D=window.QC, esc=RD.esc, f2=x=>(Math.abs(x)>=100?x.toFixed(0):Math.abs(x)>=10?x.toFixed(1):x.toFixed(2));
  // ---------- predict then reveal ----------
  document.querySelectorAll('#t-read .pr').forEach(pr=>{
    const key=pr.id, ans=(D.pr||{})[key]; if(!ans)return;
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.a===ans.right)x.classList.add('right')});
      if(+b.dataset.a!==ans.right)b.classList.add('wrong');
      const a=pr.querySelector('.ans');a.hidden=false;a.innerHTML=ans.html.replace(/All four lists are in the <a href='#' data-tab='t-qctr'>Classifier replay<\/a> tab\./,'Every classifier\'s lists are in section 3.');
    }));
  });
  // ---------- Pareto keep curve ----------
  function pareto(){
    const el=document.getElementById('qc-pareto');if(!el)return;
    const W=Math.min(RD.width(el),640),H=180,L=46,R=12,T=12,B=34,iw=W-L-R,ih=H-T-B;
    const x=s=>L+s*iw,y=p=>T+ih-p*ih;
    let pts=[];for(let i=0;i<=100;i++){const s=i/100;pts.push(x(s).toFixed(1)+','+y(Math.pow(2-s,-9)).toFixed(1))}
    let g='<rect x="'+L+'" y="'+T+'" width="'+iw+'" height="'+ih+'" fill="none" stroke="var(--line)"/>';
    [0,0.25,0.5,0.75,1].forEach(v=>{g+=RD.t(x(v),H-B+14,v,{a:v===1?'end':'middle',fs:10.5})+RD.t(L-6,y(v)+4,(v*100)+'%',{a:'end',fs:10.5})+'<line x1="'+L+'" x2="'+(L+iw)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'});
    g+='<polyline fill="none" stroke="var(--acc)" stroke-width="2" points="'+pts.join(' ')+'"/>';
    // histogram of the GPT-3-style classifier's scores on run0, if present
    const h=D.gpt3_hist; if(h){const mx=Math.max(...h.counts);h.counts.forEach((c,i)=>{const bw=iw/h.counts.length;g+='<rect x="'+(L+i*bw+1).toFixed(1)+'" y="'+(T+ih-c/mx*ih*0.45).toFixed(1)+'" width="'+(bw-2).toFixed(1)+'" height="'+(c/mx*ih*0.45).toFixed(1)+'" fill="var(--c5)" opacity=".45"/>'})}
    g+=RD.t(L+iw/2,H-4,'classifier score s',{a:'middle',fs:11})+RD.t(L+6,T+14,'P(keep) = (2 - s)^-9',{fs:11,fill:'var(--acc)'});
    if(h)g+=RD.t(L+6,T+30,'bars: run0 scores (GPT-3-style model)',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,g,'Probability that GPT-3 keeps a document as a function of its classifier score');
  }
  RD.onRender(pareto);RD.onResize(pareto);pareto();
  // ---------- fastText step animation ----------
  const A=D.a1; if(!A)return;
  let doc=A.docs[0].key, mod=A.models[0].key;
  const segD=document.getElementById('qc-a1-doc'), segM=document.getElementById('qc-a1-mod');
  segD.innerHTML=A.docs.map((d,i)=>'<button data-m="'+d.key+'"'+(i?'':' class="on"')+'>'+esc(d.label)+'</button>').join('');
  segM.innerHTML=A.models.map((m,i)=>'<button data-m="'+m.key+'"'+(i?'':' class="on"')+'>'+esc(m.label)+'</button>').join('');
  const view=document.getElementById('qc-a1-view'), cap=document.getElementById('qc-a1-cap'), cnt=document.getElementById('qc-a1-cnt');
  const STEPS=[
    ['The page as extracted','This is what the classifier receives after the pipeline: extracted text, several lines. Nothing about the page (its URL, its layout) reaches the classifier except these characters.'],
    ['One line, cut at whitespace','Lines are joined with a space and the line is cut at ASCII whitespace. Case and punctuation stay attached: "Why" and "why?" are different tokens. "</s>" marks the end.'],
    ['Word features','Each token in the vocabulary looks up its own 100-number row. The colour is that row\'s push toward high quality (green) or crawl (red). Tokens outside the vocabulary (grey) add nothing here.'],
    ['Bigram features','Every neighbouring pair is hashed into a bucket with its own row (2,000,000 buckets for DCLM, 500,000 for the classifiers trained here). Bigram pushes are added (split between the two tokens). Now every feature of the page is counted.'],
    ['Average, then a straight line','The page vector is the average of all its feature rows, so the logit is the total push divided by the number of features. Long pages are averaged as hard as short ones.'],
    ['Probability and the cut','A sigmoid of the logit gives P(high quality). The page is kept if P clears the cut: the published 0.018112 for DCLM, or for the classifiers trained here the top 10% of 18,478 held-out RefinedWeb pages.']];
  function cur(){return A.ex[doc][mod]}
  function col(v,on){if(!on)return 'transparent';const a=Math.min(1,Math.abs(v)/A.scale);return v>=0?'rgba(63,160,90,'+(0.12+0.6*a).toFixed(2)+')':'rgba(214,100,60,'+(0.12+0.6*a).toFixed(2)+')'}
  function draw(i){
    const e=cur(), m=A.models.find(x=>x.key===mod);
    cap.innerHTML='<div class="t">Step '+(i+1)+' of '+STEPS.length+': '+STEPS[i][0]+'</div><p>'+STEPS[i][1]+'</p>';
    if(i===0){view.innerHTML='<div class="rd-doc">'+esc(A.docs.find(d=>d.key===doc).text)+'</div>'}
    else{
      let h='<div class="rd-doc" style="line-height:1.9">';
      e.toks.forEach((t,k)=>{const u=e.uni[k], b=e.big[k];
        const v=i<2?0:(i===2?(u===null?0:u):((u===null?0:u)+b));
        const oov=i>=2&&u===null;
        h+='<span title="'+(u===null?'not in vocabulary':'word push '+f2(u))+(i>=3?', bigram share '+f2(b):'')+'" style="display:inline-block;max-width:100%;overflow-wrap:anywhere;padding:0 2px;border-radius:3px;margin:0 3px 2px 0;background:'+col(v,i>=2)+(oov?';color:var(--mute);text-decoration:line-through':'')+'">'+esc(t)+'</span>'});
      if(e.more)h+='<span class="mute"> ... '+e.more+' more tokens</span>';
      view.innerHTML=h+'</div>';
    }
    const st=(k,v,d)=>RD.stat(k,v,d);
    let c=st('Tokens',e.ntok,'incl. &lt;/s&gt;');
    if(i>=2)c+=st('Word features',e.nU,'push total '+f2(e.sumU));
    if(i>=3)c+=st('Bigram features',e.nB,'push total '+f2(e.sumB));
    if(i>=4)c+=st('Logit',f2(e.logit),'('+f2(e.sumU)+' + '+f2(e.sumB)+') / '+(e.nU+e.nB));
    if(i>=5)c+=st('P(high quality)',e.p<0.001?e.p.toExponential(1):e.p.toFixed(3),'cut '+m.cut.toPrecision(3)+': <b style="color:'+(e.p>=m.cut?'var(--good)">kept':'var(--bad)">dropped')+'</b>');
    cnt.innerHTML=c;
  }
  const an=RD.anim({card:'qc-a1',ctl:'qc-a1-ctl',n:STEPS.length,draw,ms:2200,label:'fastText step'});
  RD.seg(segD,v=>{doc=v;an.redraw()});RD.seg(segM,v=>{mod=v;an.redraw()});
})();
