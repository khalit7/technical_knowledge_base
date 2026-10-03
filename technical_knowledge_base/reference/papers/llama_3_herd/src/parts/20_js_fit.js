// ---- Refit the forecast: Figures 2, 3 and 4 rebuilt from their vector points ----
(function(){if(!$('isoSvg'))return;
  const BUD=Object.keys(FG.fig2),bcol=i=>'hsl('+(205-i*16)+',58%,'+(58-i*2.6)+'%)';
  const sty=(id,f)=>{const el=$(id);el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});f(b.dataset.m)}))};
  setH('isoMax',RC.iso_max_tok_diff_pct.toFixed(2)+'%');
  // Step 1: IsoFLOPs
  function iso(w){const H=Math.min(320,Math.max(240,w*.6)),all=$('isoAll').checked,bi=+$('isoB').value,b=BUD[bi];
    const fr=logFrame({W:w,H,pl:46,pr:10,pt:10,pb:34,x:[1.5e9,2e12],y:[0.68,0.97],xlin:false,xt:[[1e10,'10B'],[1e11,'100B'],[1e12,'1T']],yt:[],xl:'Training tokens',yl:'Validation loss'});
    const ly=v=>10+(H-44)*(1-(v-.68)/(.97-.68));let s=fr.s;
    [.7,.75,.8,.85,.9,.95].forEach(v=>{s+=ln2(46,ly(v),w-10,ly(v),'var(--line)')+tx(40,ly(v)+4,v.toFixed(2),{fs:11,a:'end',c:'var(--mute)'})});
    BUD.forEach((k,i)=>{if(!all&&k!==b)return;const r=RC.iso[k],c=bcol(i),op=k===b?1:.45,pts=FG.fig2[k].points;
      const xs=pts.map(p=>lg10(p[0])),x0=Math.min(...xs)-.08,x1=Math.max(...xs)+.08;let p='';
      for(let j=0;j<=40;j++){const lx=x0+j*(x1-x0)/40,v=r.c[0]+r.c[1]*lx+r.c[2]*lx*lx;if(v>.97||v<.68)continue;p+=(p?'L':'M')+fr.lx(10**lx).toFixed(1)+','+ly(v).toFixed(1)}
      s+='<g opacity="'+op+'"><path d="'+p+'" fill="none" stroke="'+c+'" stroke-width="'+(k===b?2.2:1.4)+'"/>';
      pts.forEach(q=>{if(q[1]<=.97)s+='<circle cx="'+fr.lx(q[0]).toFixed(1)+'" cy="'+ly(q[1]).toFixed(1)+'" r="'+(k===b?3.2:2.4)+'" fill="'+c+'"/>'});
      const dx=fr.lx(r.drawn_min_tokens),dy=ly(r.drawn_min_loss);s+='<path d="M'+dx+','+(dy-6)+'L'+(dx+6)+','+dy+'L'+dx+','+(dy+6)+'L'+(dx-6)+','+dy+'Z" fill="none" stroke="var(--c4)" stroke-width="1.6"/></g>'});
    $('isoSvg').innerHTML=svgW(w,H,s,'IsoFLOPs curves, Figure 2 rebuilt');
    const r=RC.iso[b];$('isoBv').textContent=sci(+b,0)+' FLOPs';
    $('isoOut').innerHTML=stat('Refitted minimum',bil(r.min_tokens)+' tokens','drawn: '+bil(r.drawn_min_tokens)+' ('+(r.tok_diff_pct>0?'+':'')+r.tok_diff_pct.toFixed(2)+'%)')+stat('Loss at the minimum',r.min_loss.toFixed(4),'drawn: '+r.drawn_min_loss.toFixed(4))+stat('Curvature',r.c[2].toFixed(3),'per (log₁₀ tokens)²; '+r.n+' runs at this budget')}
  ['isoAll','isoB'].forEach(i=>$(i).addEventListener('input',()=>refit($('isoSvg'))));
  // Step 2: power law with residuals
  let plm='refit';const PST=[1e23,3e23,1e24,3e24,1e25,2e25,3e25,3.8e25,4e25,5e25,1e26];const K={text:[.53,.29],legend:[.537,.299],refit:[RC.fit.alpha,RC.fit.A]};
  function pl(w){const C=PST[+$('plC').value],[al,A]=K[plm],D=c=>A*c**al,H=Math.min(300,Math.max(230,w*.55));
    const fr=logFrame({W:w,H,pl:46,pr:10,pt:10,pb:34,x:[1e18,2e26],y:[1e9,1e14],xt:[[1e18,'10¹⁸'],[1e20,'10²⁰'],[1e22,'10²²'],[1e24,'10²⁴'],[1e26,'10²⁶']],yt:[[1e9,'1B'],[1e10,'10B'],[1e11,'100B'],[1e12,'1T'],[1e13,'10T'],[1e14,'100T']],xl:'Training compute, FLOPs',yl:'Optimal training tokens'});
    let s=fr.s;const seg=(a,b,da)=>{let p='';for(let i=0;i<=40;i++){const c=10**(a+i*(b-a)/40);p+=(i?'L':'M')+fr.lx(c).toFixed(1)+','+fr.ly(D(c)).toFixed(1)}return '<path d="'+p+'" fill="none" stroke="var(--c1)" stroke-width="2"'+(da?' stroke-dasharray="5 4"':'')+'/>'};
    s+=seg(18,22)+seg(22,26.3,1);FG.fig3_points.forEach(([c,d])=>{s+='<circle cx="'+fr.lx(c).toFixed(1)+'" cy="'+fr.ly(d).toFixed(1)+'" r="4" fill="var(--c4)"/>'});
    s+='<rect x="'+(fr.lx(3.8e25)-5).toFixed(1)+'" y="'+(fr.ly(16.55e12)-5).toFixed(1)+'" width="10" height="10" fill="none" stroke="var(--c2)" stroke-width="2"/>';
    const x=fr.lx(C);s+=ln2(x,10,x,H-34,'var(--mute)',{da:'3 3'})+'<circle cx="'+x.toFixed(1)+'" cy="'+fr.ly(D(C)).toFixed(1)+'" r="5.5" fill="var(--c1)" stroke="var(--bg)" stroke-width="1.5"/>';
    s+=legend([['law','var(--c1)'],['paper: 16.55T at 3.8 × 10²⁵','var(--c2)']],52,24,w-60).s;
    $('plSvg').innerHTML=svgW(w,H,s,'Figure 3 rebuilt');
    // residuals
    const RH=110,rl=v=>8+(RH-30)*(1-(v+40)/80);let r='';[-40,-20,0,20,40].forEach(v=>{r+=ln2(46,rl(v),w-10,rl(v),v?'var(--line)':'var(--mute)')+tx(40,rl(v)+4,(v>0?'+':'')+v+'%',{fs:11,a:'end',c:'var(--mute)'})});
    FG.fig3_points.forEach(([c,d])=>{const e=(d/D(c)-1)*100,xx=fr.lx(c),yy=rl(Math.max(-40,Math.min(40,e)));r+=ln2(xx,rl(0),xx,yy,'var(--c4)',{sw:2})+'<circle cx="'+xx.toFixed(1)+'" cy="'+yy.toFixed(1)+'" r="3.5" fill="var(--c4)"/>'});
    r+=tx(46,RH-4,'Residual: measured tokens over the law, minus 1',{fs:11,c:'var(--mute)'});$('plRes').innerHTML=svgW(w,RH,r,'Residuals');
    const Dv=D(C),N=C/(6*Dv),res=FG.fig3_points.map(([c,d])=>Math.abs(d/D(c)-1)*100);$('plCv').textContent=sci(C,C===3.8e25?1:0)+' FLOPs';
    $('plOut').innerHTML=stat('Optimal tokens',tril(Dv),'α = '+al.toFixed(4)+', A = '+A.toFixed(4))+stat('Parameters, C / 6D',bil(N),(Dv/N).toFixed(1)+' tokens per parameter')+stat('Largest residual',Math.max(...res).toFixed(1)+'%','mean '+(res.reduce((a,b)=>a+b,0)/res.length).toFixed(1)+'% over the 10 points')}
  sty('plM',m=>{plm=m;refit($('plSvg'))});$('plC').addEventListener('input',()=>refit($('plSvg')));
  // Step 3: ARC Challenge two-stage forecast
  let am='fixed';const AST=[1e20,3e20,1e21,3e21,1e22,3e22,1e23,3e23,1e24,3e24,1e25,2e25,3.8e25,1e26];const ac=$('arC');ac.max=AST.length-1;ac.value=12;
  const A=RC.arc,SG={fixed:A.sigmoid_fixed,free:A.sigmoid_refit,drawn:A.sigmoid_drawn};
  const sig=(p,x)=>p.lo+(p.hi-p.lo)/(1+Math.exp(p.k*(x-p.x0)));const nll=c=>A.stage1_slope*lg10(c)+A.stage1_icpt;
  setH('arP',(sig(SG.fixed,nll(3.8e25))*100).toFixed(1)+'%');setH('arF',(sig(SG.free,nll(3.8e25))*100).toFixed(1)+'%');
  const dia=(x,y,c)=>'<path d="M'+x+','+(y-5)+'L'+(x+5)+','+y+'L'+x+','+(y+5)+'L'+(x-5)+','+y+'Z" fill="'+c+'"/>';
  const tri=(x,y,c)=>'<path d="M'+x+','+(y-6)+'L'+(x+6)+','+(y+5)+'L'+(x-6)+','+(y+5)+'Z" fill="'+c+'"/>';
  const sq=(x,y,c)=>'<rect x="'+(x-5)+'" y="'+(y-5)+'" width="10" height="10" fill="'+c+'"/>';
  function arcL(w){const C=AST[+ac.value],H=230,pl=44,pr=8,pt=10,pb=34,X0=19.5,X1=26.2,Y0=1.17,Y1=1.41,lx=v=>pl+(w-pl-pr)*(v-X0)/(X1-X0),ly=v=>pt+(H-pt-pb)*(1-(v-Y0)/(Y1-Y0));
    let s='';[20,22,24,26].forEach(v=>{s+=ln2(lx(v),pt,lx(v),H-pb,'var(--line)')+tx(lx(v),H-pb+15,'10'+sup(v),{fs:11,a:'middle',c:'var(--mute)'})});
    [1.2,1.25,1.3,1.35,1.4].forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)')+tx(pl-4,ly(v)+4,v.toFixed(2),{fs:11,a:'end',c:'var(--mute)'})});
    s+=ln2(lx(19.7),ly(nll(10**19.7)),lx(22),ly(nll(1e22)),'var(--c1)',{sw:2})+ln2(lx(22),ly(nll(1e22)),lx(26.1),ly(nll(10**26.1)),'var(--c1)',{sw:2,da:'5 4'});
    FG.fig4_left.scaling_law_models.forEach(([x,y])=>{s+=dia(lx(x),ly(y),'var(--c4)')});
    s+=tri(lx(FG.fig4_left.prediction[0][0]),ly(FG.fig4_left.prediction[0][1]),'var(--c6)')+sq(lx(FG.fig4_left.llama3_405b[0][0]),ly(FG.fig4_left.llama3_405b[0][1]),'var(--c2)');
    const x=lx(lg10(C));s+=ln2(x,pt,x,H-pb,'var(--mute)',{da:'3 3'})+'<circle cx="'+x.toFixed(1)+'" cy="'+ly(nll(C)).toFixed(1)+'" r="5" fill="var(--c1)" stroke="var(--bg)" stroke-width="1.5"/>';
    s+=tx(pl,H-3,'Compute, FLOPs',{fs:11,c:'var(--mute)'})+tx(w-pr-4,pt+12,'NLL of the correct answer',{fs:11,a:'end',c:'var(--mute)'});
    $('arL').innerHTML=svgW(w,H,s,'Stage 1')}
  function arcR(w){const C=AST[+ac.value],p=SG[am],H=230,pl=40,pr=8,pt=10,pb=34,X0=1.42,X1=1.16,lx=v=>pl+(w-pl-pr)*(v-X0)/(X1-X0),ly=v=>pt+(H-pt-pb)*(1-(v-.2)/.82);
    let s='';[1.4,1.3,1.2].forEach(v=>{s+=ln2(lx(v),pt,lx(v),H-pb,'var(--line)')+tx(lx(v),H-pb+15,v.toFixed(1),{fs:11,a:'middle',c:'var(--mute)'})});
    [.25,.5,.75,1].forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)')+tx(pl-4,ly(v)+4,(v*100)+'%',{fs:11,a:'end',c:'var(--mute)'})});
    let q='';for(let i=0;i<=60;i++){const v=X0+i*(X1-X0)/60;q+=(i?'L':'M')+lx(v).toFixed(1)+','+ly(sig(p,v)).toFixed(1)}s+='<path d="'+q+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    FG.fig4_right.scaling_law_models.forEach(([x,y])=>{s+=dia(lx(x),ly(y),'var(--c4)')});FG.fig4_right.llama2_models.forEach(([x,y])=>{s+='<circle cx="'+lx(x).toFixed(1)+'" cy="'+ly(y).toFixed(1)+'" r="4.5" fill="var(--c5)"/>'});
    s+=tri(lx(FG.fig4_right.prediction[0][0]),ly(FG.fig4_right.prediction[0][1]),'var(--c6)')+sq(lx(FG.fig4_right.llama3_405b[0][0]),ly(FG.fig4_right.llama3_405b[0][1]),'var(--c2)');
    const n=nll(C),x=lx(Math.max(X1,Math.min(X0,n)));s+=ln2(x,pt,x,H-pb,'var(--mute)',{da:'3 3'})+'<circle cx="'+x.toFixed(1)+'" cy="'+ly(sig(p,n)).toFixed(1)+'" r="5" fill="var(--c1)" stroke="var(--bg)" stroke-width="1.5"/>';
    s+=tx(pl,H-3,'NLL (lower is better) →',{fs:11,c:'var(--mute)'})+tx(pl+4,ly(.62),'ARC-C accuracy',{fs:11,c:'var(--mute)'});
    $('arR').innerHTML=svgW(w,H,s,'Stage 2');$('arCv').textContent=sci(C,C===3.8e25?1:0)+' FLOPs';
    $('arOut').innerHTML=stat('Predicted NLL',n.toFixed(3),'drawn prediction 1.201; actual 1.190')+stat('Predicted accuracy',(sig(p,n)*100).toFixed(1)+'%','drawn prediction 95.8%; actual 96.0%')+stat('Sigmoid',p.lo.toFixed(2)+' to '+p.hi.toFixed(2),'slope '+p.k.toFixed(1)+', midpoint NLL '+p.x0.toFixed(3))}
  ac.addEventListener('input',()=>{refit($('arL'));refit($('arR'))});sty('arM',m=>{am=m;refit($('arR'))});
  onTab('t-fit',()=>{fit($('isoSvg'),iso);fit($('plSvg'),pl);fit($('arL'),arcL);fit($('arR'),arcR)});})();
