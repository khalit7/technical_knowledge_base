// ---- Then and now: the same budgets spent by Kaplan's rule and by Chinchilla's ----
(function(){const T=PAPER.tables,PFD=8.64e19;
  const kapN=C=>1.3e9*Math.pow(C/2/PFD,0.73),chinN=C=>Math.sqrt(C/120);
  const Lch=(N,D)=>1.69+406.4/Math.pow(N,0.34)+410.7/Math.pow(D,0.28);
  const B=[{C:1e21,nm:'10²¹ FLOPs',c:'Chinchilla\'s head-to-head budget (its Appendix D.4): Kaplan\'s rule says 4.68B parameters; Chinchilla trained 2.80B and 4.74B models and the smaller one, its own prediction, won.'},
    {C:3.14e23,nm:'GPT-3\'s budget, 3.14 × 10²³',c:'GPT-3 (175B, 300B tokens) sits between the rules: smaller than Kaplan\'s rule asks for, far larger than Chinchilla\'s. OpenAI cited this paper for training "much larger models on many fewer tokens than is typical" (GPT-3 Figure 2.2).'},
    {C:5.76e23,nm:'Gopher\'s budget, 5.76 × 10²³',c:'Gopher (280B, 300B tokens) and Chinchilla (70B, 1.4T tokens) used the same compute; Chinchilla, 4× smaller on 4× more data, won across the board (Chinchilla §1). Kaplan\'s rule would have gone bigger still.'},
    {C:3.8e25,nm:'Llama 3 405B\'s budget, 3.8 × 10²⁵',c:'Meta fitted its own isoFLOP law and chose 405B on 15.6T tokens, about 38 tokens per parameter, near its fit\'s 402B on 16.55T (Llama 3 §3.2.1). Kaplan\'s rule would ask for a 10-trillion-parameter model on under a trillion tokens.'}];
  const steps0=(m)=>[{t:'Two rules for one question',c:m==='kap'?'Kaplan\'s Table 6: grow parameters as <i>C</i><sup>0.73</sup> and data as <i>C</i><sup>0.27</sup>, so tokens per parameter fall as the budget grows.':'Chinchilla: grow both as about <i>C</i><sup>0.5</sup>, so tokens per parameter stay near 20 at every budget.'}].concat(B.map(b=>({t:b.nm,c:b.c})));
  const modes={kap:steps0('kap'),chin:steps0('chin')};
  const X=[1e8,3e13],Y=[1e10,1.5e14];
  const M=T.models.rows;$('thxSrc').innerHTML=M.map(r=>'<a href="'+r[3]+'" target="_blank" rel="noopener noreferrer">'+r[0]+'</a>').join(', ')+' (DeepSeek-V3 drawn at its 37B active parameters).';
  function draw(m,k,e,w){const H=Math.min(380,Math.max(280,w*.62));
    const F=logFrame({W:w,H,pl:46,pr:14,pt:14,pb:40,x:X,y:Y,xt:decTicks(X[0],X[1],w<500?2:1),yt:decTicks(Y[0],Y[1],1),xl:'parameters N',yl:'training tokens D'});
    let s=F.s;const clipX=v=>Math.max(F.lx(X[0]),Math.min(F.lx(X[1]),v)),Cs=[1e21,1e23,1e25];
    Cs.forEach(C=>{const n0=Math.max(X[0],C/6/Y[1]),n1=Math.min(X[1],C/6/Y[0]);if(n0<n1){s+=ln2(F.lx(n0),F.ly(C/6/n0),F.lx(n1),F.ly(C/6/n1),'var(--dim)',{sw:1});s+=tx(F.lx(n1)-2,F.ly(C/6/n1)-5,'10'+sup(Math.round(Math.log10(C)))+' FLOPs',{fs:11,a:'end',c:'var(--mute)'})}});
    const cg=geo(1e19,1e26,80),path=(fn,c,op,sw)=>pth(pathOf(cg.map(C=>[F.lx(fn(C)),F.ly(C/6/fn(C))]).filter(p=>p[0]>=F.lx(X[0])-1&&p[0]<=F.lx(X[1])+1&&p[1]>=F.ly(Y[1])-1&&p[1]<=F.ly(Y[0])+1)),c,{sw:sw,op});
    s+=path(kapN,'var(--c2)',m==='kap'?1:.3,m==='kap'?3:2)+path(chinN,'var(--c1)',m==='chin'?1:.3,m==='chin'?3:2);
    const pts=M.map(r=>({x:F.lx(r[1]),y:F.ly(r[2]),t:r[0],fs:11}));placeLabels(pts,w,H);
    pts.forEach(p=>{s+=dot(p.x,p.y,4,'var(--ink)',{f:'var(--bg)'})+tx(p.lx,p.ly,p.t,{fs:11,a:p.la,c:'var(--mute)'})});
    if(k>0){const prev=k>1?B[k-2].C:B[0].C,cur=B[k-1].C,C=k>1?prev*Math.pow(cur/prev,e):cur,fn=m==='kap'?kapN:chinN,n=fn(C),d=C/6/n;
      s+=dot(clipX(F.lx(n)),Math.max(F.pt||14,F.ly(d)),7,m==='kap'?'var(--c2)':'var(--c1)')}
    const lg=legend([['Kaplan 2020','var(--c2)'],['Chinchilla 2022','var(--c1)']],52,24,w-60);s+=lg.s;
    return svgW(w,H,s,'Parameters against tokens for each rule')}
  function counters(m,k){if(k===0)return '<div class="cnt2">'+stat('Kaplan at 10²³ FLOPs',sci(kapN(1e23),2)+' params',(1e23/6/kapN(1e23)/kapN(1e23)).toFixed(2)+' tokens per parameter')+stat('Chinchilla at 10²³ FLOPs',sci(chinN(1e23),2)+' params','20 tokens per parameter')+'</div>';
    const C=B[k-1].C,nk=kapN(C),nc=chinN(C),n=m==='kap'?nk:nc,d=C/6/n,o=m==='kap'?nc:nk;
    return '<div class="cnt2">'+stat('Budget',sci(C,2)+' FLOPs',(C/PFD).toExponential(1).replace('e+','e')+' PF-days')+stat('Parameters N',sci(n,2),(m==='kap'?'Kaplan':'Chinchilla')+' rule')+stat('Tokens D',sci(d,2),(d/n).toFixed(d/n<1?2:1)+' per parameter')+
      stat('Chinchilla-fit loss',Lch(n,d).toFixed(3),'other rule: '+Lch(o,C/6/o).toFixed(3))+'</div>'}
  window.THX=makeAnim({id:'thx',modes,mode:'kap',draw,counters,dur:2600});
  $('thP').innerHTML='<thead><tr><th>Step</th><th>Exponent a in N* ∝ C<sup>a</sup></th></tr></thead><tbody>'+T.porian.rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join('')+'</tbody>';
  $('thC').innerHTML='<thead><tr><th>Approach</th><th>a (N<sub>opt</sub> ∝ C<sup>a</sup>)</th><th>b (D<sub>opt</sub> ∝ C<sup>b</sup>)</th></tr></thead><tbody>'+T.chin_t2.rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>').join('')+'</tbody>';
})();
