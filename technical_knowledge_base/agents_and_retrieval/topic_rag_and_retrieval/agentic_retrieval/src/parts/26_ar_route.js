// ---- Router lab, inline in Reading section 5 ----
(function(){
  if(!document.getElementById('rt-plot'))return;
  const A=ARL.A, O=A.out, R=O.res, NM=ARL.NAMES, f3=ARL.f3, n=O.type.length;
  const cheap=document.getElementById('rt-cheap'),exp=document.getElementById('rt-exp'),sig=document.getElementById('rt-sig'),sh=document.getElementById('rt-sh');
  const opt=(arr,def)=>arr.map(s=>'<option value="'+s+'"'+(s===def?' selected':'')+'>'+NM[s]+'</option>').join('');
  cheap.innerHTML=opt(['closed','single_k2','single_k5','single_k10'],'single_k5');
  exp.innerHTML=opt(['react','decomp','single_k10','longctx'],'react');
  const R0=ARL.rng(7),rnd=Array.from({length:n},()=>R0());
  function score(i){const s=sig.value;
    if(s==='ce1')return -O.ce1[i];if(s==='ce2')return -O.ce2[i];if(s==='s1')return -O.s1[i];if(s==='ov')return -O.ov[i]-1e-3*O.ce2[i];
    if(s==='gap')return -O.gap[i];if(s==='lr')return A.rt.p_gain[i];if(s==='cmp')return O.cue_cmp[i];return rnd[i]}
  // escalate the top `share` of questions by score (ties broken by index); the comparison rule ignores the share
  function choose(share,sg){const c=Array(n).fill(cheap.value);
    if((sg||sig.value)==='cmp'){for(let i=0;i<n;i++)if(O.cue_cmp[i])c[i]=exp.value;return c}
    const ord=[...Array(n).keys()].sort((a,b)=>score(b)-score(a)||a-b),m=Math.round(share*n);
    for(let j=0;j<m;j++)c[ord[j]]=exp.value;return c}
  const evalC=c=>{const f=c.map((s,i)=>R[s].f1[i]);return{f1:ARL.mean(f),em:ARL.mean(c.map((s,i)=>R[s].em[i])),tok:ARL.mean(c.map((s,i)=>R[s].tok[i])),
    sec:ARL.mean(c.map((s,i)=>R[s].sec[i])),share:c.filter(s=>s!==cheap.value).length/n,f}};
  const plot=document.getElementById('rt-plot'),out=document.getElementById('rt-out'),note=document.getElementById('rt-note');
  function render(){const share=+sh.value/100;document.getElementById('rt-shv').textContent=(sig.value==='cmp'?ARL.mean(O.cue_cmp)*100:share*100).toFixed(0)+'%';
    const c=choose(share),E=evalC(c),ci=ARL.bootCI(E.f,500,11);
    out.innerHTML=RD.stat('F1',f3(E.f1),'95% CI '+f3(ci[0])+' to '+f3(ci[1]))+RD.stat('Exact match',f3(E.em),'')+RD.stat('Tokens per question',ARL.fmtInt(E.tok),'billed, recorded')+RD.stat('Seconds per question',E.sec.toFixed(2),'recorded, this laptop')+RD.stat('Escalated',(100*E.share).toFixed(0)+'%','to '+NM[exp.value]);
    out.dataset.f1=E.f1.toFixed(4);
    // curve over shares, random line, fixed points, oracle
    const curve=[],randl=[];for(let k=0;k<=20;k++){const s=k/20;curve.push(evalC(choose(s)));}
    const ca=evalC(Array(n).fill(cheap.value)),ce=evalC(Array(n).fill(exp.value));
    const orc=evalC([...Array(n).keys()].map(i=>R[exp.value].f1[i]>R[cheap.value].f1[i]?exp.value:cheap.value));
    const W=RD.width(plot),H=Math.min(340,Math.max(240,W*.55)),ml=46,mr=12,mt=12,mb=40;
    const toks=Object.keys(R).map(s=>ARL.mean(R[s].tok)),xmin=Math.log10(40),xmax=Math.log10(Math.max(...toks)*1.3);
    const X=t=>ml+(W-ml-mr)*(Math.log10(t)-xmin)/(xmax-xmin),Y=f=>mt+(H-mt-mb)*(1-(f-.1)/.5);
    let g='';[.1,.2,.3,.4,.5,.6].forEach(v=>{g+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(ml-6,Y(v)+4,v.toFixed(1),{a:'end',fill:'var(--mute)'})});
    [50,100,300,1000,3000,10000].forEach(v=>{if(Math.log10(v)<xmax)g+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--line)"/>'+RD.t(X(v),H-mb+14,v>=1000?(v/1000)+'k':v,{a:'middle',fill:'var(--mute)'})});
    g+=RD.t((ml+W-mr)/2,H-6,'tokens per question (log scale)',{a:'middle',fill:'var(--mute)'})+RD.t(12,mt+8,'F1',{fill:'var(--mute)'});
    g+='<line x1="'+X(ca.tok)+'" y1="'+Y(ca.f1)+'" x2="'+X(ce.tok)+'" y2="'+Y(ce.f1)+'" stroke="var(--dim)" stroke-width="3"/>';
    if(sig.value!=='cmp')g+='<polyline fill="none" stroke="var(--c2)" stroke-width="1.5" opacity=".7" points="'+curve.map(p=>X(p.tok).toFixed(1)+','+Y(p.f1).toFixed(1)).join(' ')+'"/>';
    Object.keys(R).forEach(s=>{const p=evalC(Array(n).fill(s));const x=X(p.tok),y=Y(p.f1);const right=x>W*.62;
      g+='<circle cx="'+x+'" cy="'+y+'" r="4" fill="var(--mute)"><title>'+NM[s]+'</title></circle>';if(s===cheap.value)g+=RD.t(x-7,y+15,NM[s],{a:'end',fs:11,fill:'var(--mute)'});if(s===exp.value)g+=RD.t(right?x-7:x+7,y-8,NM[s],{a:right?'end':'start',fs:11,fill:'var(--mute)'})});
    g+='<circle cx="'+X(orc.tok)+'" cy="'+Y(orc.f1)+'" r="6" fill="var(--c3)"><title>oracle</title></circle>'+RD.t(X(orc.tok)+8,Y(orc.f1)+4,'oracle '+f3(orc.f1),{fs:11,fill:'var(--c3)'});
    g+='<circle cx="'+X(E.tok)+'" cy="'+Y(E.f1)+'" r="7" fill="var(--c2)" stroke="var(--bg)" stroke-width="2"><title>your policy</title></circle>';
    plot.innerHTML=RD.svg(W,H,g,'F1 against tokens per question for routing policies');
    const rl=ca.f1+(ce.f1-ca.f1)*(E.share);
    note.textContent='A random split sending the same '+(100*E.share).toFixed(0)+'% to '+NM[exp.value]+' would score about '+f3(rl)+' (the grey line); your policy scores '+f3(E.f1)+'. The oracle picks, per question, whichever of the two paths scored higher.'}
  [cheap,exp,sig].forEach(e=>e.addEventListener('change',render));sh.addEventListener('input',render);
  RD.onRender(render);RD.onResize(render);
})();
