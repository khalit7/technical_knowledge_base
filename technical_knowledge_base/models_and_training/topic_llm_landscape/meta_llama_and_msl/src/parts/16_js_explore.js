// ---- Overtraining explorer: minimise 6ND + 2NT on a curve of equal loss (Sardana et al.) ----
(function(){
  if(!$('t-exp'))return;
  const FITS={sard:[1.69,406.4,410.7,0.336,0.283,'Hoffmann (Sardana)'],hr:[1.69,406.4,410.7,0.34,0.28,'Hoffmann rounded'],hp:[1.6934,406.4,410.7,0.3392,0.2849,'Hoffmann precise'],ep:[1.8172,482.01,2085.43,0.3478,0.3658,'Epoch refit']};
  const FC={sard:'var(--c1)',hr:'var(--c6)',hp:'var(--c4)',ep:'var(--c2)'};
  const PRE={s4:{loss:1.96,T:5e12,n:'loss 1.96'},l8:{N:8e9,D:15e12,T:15e12,n:'Llama 3 8B'},l70:{N:70e9,D:15e12,T:15e12,n:'Llama 3 70B'},l1:{N:7e9,D:1e12,T:1e12,n:'Llama 1 7B'},l405:{N:405e9,D:15.6e12,T:15e12,n:'Llama 3.1 405B'}};
  const L=(f,N,D)=>f[0]+f[1]/Math.pow(N,f[3])+f[2]/Math.pow(D,f[4]);
  const Dfor=(f,N,l)=>{const r=l-f[0]-f[1]/Math.pow(N,f[3]);return r>0?Math.pow(f[2]/r,1/f[4]):Infinity};
  const Nmin=(f,l)=>Math.pow(f[1]/(l-f[0]),1/f[3]);
  function opt(f,l,T){let lo=Math.log(Nmin(f,l))+1e-6,hi=lo+14;const c=x=>{const n=Math.exp(x);return 6*n*Dfor(f,n,l)+2*n*T};const g=(Math.sqrt(5)-1)/2;
    let a=hi-g*(hi-lo),b=lo+g*(hi-lo);for(let i=0;i<120;i++){if(c(a)<c(b))hi=b;else lo=a;a=hi-g*(hi-lo);b=lo+g*(hi-lo)}const n=Math.exp((lo+hi)/2);return {N:n,D:Dfor(f,n,l),C:c((lo+hi)/2)}}
  const B=v=>v>=1e12?(v/1e12).toFixed(2)+'T':v>=1e9?(v/1e9).toFixed(v<1e10?2:1)+'B':(v/1e6).toFixed(0)+'M';
  function draw(){const pk=$('exQ').value,fk=$('exF').value,f=FITS[fk],pr=PRE[pk],T=Math.pow(10,+$('exT').value);
    $('exTv').textContent=B(T)+' tokens';
    const l=pr.loss!=null?pr.loss:L(f,pr.N,pr.D);
    const c0=opt(f,l,0),c1=opt(f,l,T),cc=6*c0.N*c0.D+2*c0.N*T,meta=pr.N?{N:pr.N,D:pr.D,C:6*pr.N*pr.D+2*pr.N*T}:null;
    // chart 1: total compute along the iso-loss curve
    const narrow=$('exSvg').clientWidth<560,W=narrow?360:760,H=narrow?260:320,n0=Nmin(f,l)*1.08,n1=Math.max(n0*3000,1e12);
    const pts=[],ptr=[];let ymin=Infinity,ymax=0;for(let i=0;i<=160;i++){const n=n0*Math.pow(n1/n0,i/160),d=Dfor(f,n,l),c=6*n*d+2*n*T,ct=6*n*d;pts.push([n,c]);ptr.push([n,ct]);ymin=Math.min(ymin,ct);ymax=Math.max(ymax,Math.min(c,ymin*1e4))}
    const yl=Math.pow(10,Math.floor(Math.log10(ymin))),yh=Math.pow(10,Math.ceil(Math.log10(Math.min(ymax,ymin*300))));
    const xt=[];for(let e=Math.ceil(Math.log10(n0));e<=Math.log10(n1);e++)xt.push([Math.pow(10,e),B(Math.pow(10,e))]);
    const yt=[];for(let e=Math.log10(yl);e<=Math.log10(yh);e++)yt.push([Math.pow(10,e),'10'+sup(e)]);
    const fr=logFrame({W,H,pl:narrow?40:52,pr:14,pt:12,pb:36,x:[n0,n1],y:[yl,yh],xt,yt,xl:'Parameters N (training tokens set by the curve of equal loss)',yl:'FLOPs'});
    const cy=v=>fr.ly(Math.min(Math.max(v,yl),yh));let s=fr.s;
    const line=(a,col,dash)=>'<polyline points="'+a.filter(p=>p[1]<=yh*1.01).map(p=>fr.lx(p[0]).toFixed(1)+','+cy(p[1]).toFixed(1)).join(' ')+'" fill="none" stroke="'+col+'" stroke-width="2"'+(dash?' stroke-dasharray="5 4"':'')+'/>';
    s+=line(ptr,'var(--mute)',1)+line(pts,FC[fk]);
    const dot=(n,c,col,lab,dy)=>{if(n<n0||n>n1)return '';const x=fr.lx(n),y=cy(c);return '<circle cx="'+x+'" cy="'+y+'" r="6" fill="'+col+'" stroke="var(--bg)" stroke-width="1.5"/><text x="'+(x+8)+'" y="'+(y+(dy||-8))+'" font-size="11" fill="'+col+'" font-weight="600">'+lab+'</text>'};
    s+=dot(c0.N,cc,'var(--mute)','Chinchilla-style',14)+dot(c1.N,c1.C,FC[fk],'best with serving');if(meta)s+=dot(meta.N,meta.C,'var(--mus)','Meta\'s choice',narrow?24:-8);
    $('exSvg').innerHTML=svgEl(W,H,s,'Total compute along the curve of equal loss');
    $('exLeg').innerHTML='<span><i style="background:'+FC[fk]+'"></i>training + serving, 6ND + 2NT</span><span><i style="background:var(--mute)"></i>training only, 6ND (dashed)</span>';
    const sav=100*(1-c1.C/cc);
    $('exOut').innerHTML=stat('Quality target','loss '+l.toFixed(3),pr.loss!=null?'Sardana et al. Table 2':pr.n+' under the '+f[5]+' law')+
      stat('Chinchilla-style (training only)',B(c0.N)+' on '+B(c0.D),fmt(c0.D/c0.N)+' tokens per parameter; total '+sci(cc))+
      stat('Best once serving counts',B(c1.N)+' on '+B(c1.D),fmt(c1.D/c1.N)+' tokens per parameter; total '+sci(c1.C))+
      stat('Saving against Chinchilla-style',sav.toFixed(1)+'%','of training + serving FLOPs')+
      (meta?stat('Meta\'s choice',B(meta.N)+' on '+B(meta.D),fmt(meta.D/meta.N)+' per parameter; '+(100*(meta.C/c1.C-1)).toFixed(1)+'% above the best'):'');
    const isRep=pk==='s4'&&fk==='sard'&&Math.abs(Math.log10(T)-Math.log10(5e12))<0.01;
    $('exRep').innerHTML=isRep?'<b>Defaults reproduce Sardana et al.\'s Table 2 (5T served, loss 1.96) independently:</b> Chinchilla-style '+B(c0.N)+' on '+B(c0.D)+' (published 30B on 1.56T, total 5.80×10²³ against '+sci(cc)+' here) and the compute-optimal '+B(c1.N)+' on '+B(c1.D)+' (published 16.4B on 3.27T, 4.86×10²³ against '+sci(c1.C)+'), a saving of '+sav.toFixed(1)+'% (published 16%). The gaps of 2 to 4% come from the loss being published to two decimals. '+A('https://arxiv.org/abs/2401.00448','Sardana et al.'):'Recomputed for the settings above. Return to the Sardana preset, its fit and 5T served to see the published row reproduced.';
    // chart 2: optimal tokens per parameter against T, each fit
    const W2=W,H2=narrow?230:270,ts=[];for(let i=0;i<=50;i++)ts.push(Math.pow(10,10+5*i/50));
    const series={};let r1=1e9,r0=10;Object.keys(FITS).forEach(q=>{const ff=FITS[q],ll=pr.loss!=null?pr.loss:L(ff,pr.N,pr.D);series[q]=ts.map(t=>{const o=opt(ff,ll,t);return [t,o.D/o.N]});series[q].forEach(p=>{r1=Math.min(r1,p[1])})});
    const yl2=Math.pow(10,Math.floor(Math.log10(Math.min(r1,meta?meta.D/meta.N:1e9)))),yh2=Math.pow(10,Math.ceil(Math.log10(Math.max(...Object.values(series).map(a=>a[a.length-1][1]),meta?meta.D/meta.N:1))));
    const yt2=[];for(let e=Math.log10(yl2);e<=Math.log10(yh2);e++)yt2.push([Math.pow(10,e),fmt(Math.pow(10,e))]);
    const f2=logFrame({W:W2,H:H2,pl:narrow?46:56,pr:14,pt:12,pb:36,x:[1e10,1e15],y:[yl2,yh2],xt:[[1e10,'10B'],[1e11,'100B'],[1e12,'1T'],[1e13,'10T'],[1e14,'100T'],[1e15,'1,000T']],yt:yt2,xl:'Lifetime tokens served T',yl:'tokens per parameter'});
    let s2=f2.s;Object.keys(series).forEach(q=>{s2+='<polyline points="'+series[q].map(p=>f2.lx(p[0]).toFixed(1)+','+f2.ly(p[1]).toFixed(1)).join(' ')+'" fill="none" stroke="'+FC[q]+'" stroke-width="'+(q===fk?3:1.5)+'" opacity="'+(q===fk?1:.6)+'"/>';});
    if(meta){const y=f2.ly(meta.D/meta.N);s2+='<line x1="'+f2.lx(1e10)+'" x2="'+f2.lx(1e15)+'" y1="'+y+'" y2="'+y+'" stroke="var(--mus)" stroke-dasharray="5 4"/><text x="'+(f2.lx(1e10)+4)+'" y="'+(y-5)+'" font-size="10.5" fill="var(--mus)">'+pr.n+': '+fmt(meta.D/meta.N)+' per parameter</text>'}
    const tx=f2.lx(T);s2+='<line x1="'+tx+'" x2="'+tx+'" y1="12" y2="'+(H2-36)+'" stroke="var(--ink)" stroke-width="1"/>';
    $('exSvg2').innerHTML=svgEl(W2,H2,s2,'Optimal tokens per parameter against lifetime tokens served');
    $('exLeg2').innerHTML=Object.keys(FITS).map(q=>'<span><i style="background:'+FC[q]+';height:'+(q===fk?4:2)+'px"></i>'+FITS[q][5]+'</span>').join('')+(meta?'<span><i style="background:var(--mus)"></i>'+pr.n+' (dashed)</span>':'');
  }
  $('exQ').addEventListener('change',()=>{$('exT').value=Math.log10(PRE[$('exQ').value].T).toFixed(4);draw()});$('exF').addEventListener('change',draw);$('exT').addEventListener('input',draw);
  onTab('t-exp',draw);
})();
