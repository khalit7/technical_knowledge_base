// Reading: GPT-3 Pareto keep curve (qc-pareto), predict-then-reveal widgets (.pr); the fastText steps are Fig. 1 (34_js_sc_ft.js)
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
  // the fastText step animation is now the 3D stage Fig. 1 (34_js_sc_ft.js)
})();
