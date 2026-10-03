// ---- Collapse lab: eleven toy runs, two at a time, played through training ----
(function(){
  const card=document.getElementById('cl-card');if(!card||!window.CSD)return;
  const T=CSD.tc,R=T.runs,$=id=>document.getElementById(id);
  const NM={infonce:'InfoNCE (negatives)',pos_only:'Positives only',simsiam:'SimSiam',simsiam_nosg:'SimSiam without stop-gradient',simsiam_nopred:'SimSiam without predictor',
    byol:'BYOL',dino:'DINO',dino_nocenter:'DINO without centering',dino_nosharp:'DINO without sharpening',vicreg:'VICReg',vicreg_novar:'VICReg without the variance term'};
  const PAIRS=[
    {id:'neg',a:'infonce',b:'pos_only',t:'Negatives',cap:'Both runs pull two views of a digit together. Only the left one also pushes the other 510 views in the batch away. Without that push, nothing stops every digit from landing on the same point, which satisfies "two views agree" perfectly.'},
    {id:'sg',a:'simsiam',b:'simsiam_nosg',t:'SimSiam, stop-gradient',cap:'Same encoder, same predictor, same loss (negative cosine between the prediction from one view and the output for the other). The left run treats the second branch as a constant target (stop-gradient); the right lets the gradient flow through both branches, and finds the trivial solution.'},
    {id:'pred',a:'simsiam',b:'simsiam_nopred',t:'SimSiam, predictor',cap:'The right run keeps the stop-gradient but drops the small predictor MLP: the two branches become the same function, and the loss is minimised by a constant output.'},
    {id:'byol',a:'byol',b:'pos_only',t:'BYOL',cap:'BYOL (left) has no negatives either: an online network with a predictor chases a slowly moving target network, an exponential moving average of the online weights. The right run is the same "views agree" goal with no such machinery.'},
    {id:'dc',a:'dino',b:'dino_nocenter',t:'DINO, centering',cap:'DINO\'s student matches the teacher\'s softmax over 32 prototypes. Remove centering (right) and one prototype wins for every input: the teacher\'s entropy goes to 0 and the batch-mean distribution sits on one prototype (KL from uniform = ln 32). Full DINO (left) stayed healthy in this seed but drifted towards the uniform collapse in the other two; see the table below.'},
    {id:'ds',a:'dino',b:'dino_nosharp',t:'DINO, sharpening',cap:'Remove sharpening (right: teacher temperature equal to the student\'s 0.1 instead of 0.04) and centering wins alone: the teacher\'s output flattens towards uniform for every input, the other collapse.'},
    {id:'vic',a:'vicreg',b:'vicreg_novar',t:'VICReg, variance',cap:'VICReg (left) keeps each output dimension\'s standard deviation above 1 over the batch with a hinge, and decorrelates the dimensions. Drop the variance term (right) and the invariance term pulls everything together.'}];
  const st={p:PAIRS[0]};
  $('cl-pair').innerHTML=PAIRS.map((p,i)=>'<button data-i="'+i+'"'+(i?'':' class="on"')+' aria-pressed="'+(i?'false':'true')+'">'+p.t+'</button>').join('');
  const S=T.snap_steps;
  function tri(cm){const M=[...Array(10)].map(()=>Array(10).fill(0));let q=0;for(let a=0;a<10;a++)for(let b=a;b<10;b++){M[a][b]=M[b][a]=cm[q++]/1000}return M}
  function panel(name,i,el,cnt){
    const r=R[name],s=r.snaps[i],M=tri(r.kept[i]);
    const W=Math.min(RD.width(el),400),hm=Math.min(W*0.64,260),c=(hm-22)/10;
    let h='';const col=PF.css('--c1');
    for(let a=0;a<10;a++){h+='<text x="8" y="'+(a*c+c/2+4)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+a+'</text><text x="'+(22+a*c+c/2)+'" y="'+(hm+0)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+a+'</text>';
      for(let b=0;b<10;b++){const v=Math.max(0,M[a][b]);h+='<rect x="'+(22+b*c).toFixed(1)+'" y="'+(a*c).toFixed(1)+'" width="'+(c-0.6).toFixed(1)+'" height="'+(c-0.6).toFixed(1)+'" fill="'+col+'" fill-opacity="'+(0.05+0.95*v).toFixed(3)+'"><title>digits '+a+' and '+b+': mean cosine '+M[a][b].toFixed(2)+'</title></rect>'}}
    // per-dimension std bars
    const bx=hm+14,bw=W-bx-4,pd=s.pds,mx=0.5;let bars='';
    if(bw>60){const bwi=bw/pd.length;
      bars+='<line x1="'+bx+'" x2="'+(bx+bw)+'" y1="'+(hm-12)+'" y2="'+(hm-12)+'" stroke="var(--line)"/>';
      const y25=(hm-12)-(0.25/mx)*(hm-30);bars+='<line x1="'+bx+'" x2="'+(bx+bw)+'" y1="'+y25+'" y2="'+y25+'" stroke="var(--mute)" stroke-dasharray="2 3"/><text x="'+(bx+bw)+'" y="'+(y25-3)+'" font-size="10" text-anchor="end" fill="var(--mute)">0.25</text>';
      pd.forEach((v,k)=>{const hh=Math.min(1,v/mx)*(hm-30);bars+='<rect x="'+(bx+k*bwi+1).toFixed(1)+'" y="'+((hm-12)-hh).toFixed(1)+'" width="'+Math.max(1,bwi-2).toFixed(1)+'" height="'+hh.toFixed(1)+'" fill="var(--c4)"/>'});
      bars+='<text x="'+(bx+bw/2)+'" y="'+hm+'" font-size="10" text-anchor="middle" fill="var(--mute)">std per dimension</text>'}
    el.innerHTML=PF.svg(W,hm+4,'Class-mean cosine matrix and per-dimension std for '+NM[name],h+bars);
    const col2=s.std<0.05?'warn':'ok';
    let extra='';if(s.t_entropy!=null)extra=RD.stat('teacher entropy',s.t_entropy.toFixed(2),'per input; 0: one prototype, ln 32 = 3.47: uniform')+RD.stat('batch-mean KL from uniform',s.kl_mean_unif.toFixed(2),'0: prototypes used evenly; 3.47: one prototype for all');
    cnt.innerHTML=RD.stat('embedding std','<span class="'+col2+'">'+s.std.toFixed(3)+'</span>','0.25 spread, 0 collapsed')+RD.stat('effective rank',s.std<0.02?'n/a':s.erank.toFixed(1),s.std<0.02?'collapsed: rank of a residual speck':'of 16 dimensions')+
      RD.stat('5-NN accuracy',(100*s.knn).toFixed(0)+'%','digit class; chance 10%')+RD.stat('loss',s.loss==null?'not yet':s.loss.toFixed(3),'its own objective')+extra;
  }
  function draw(i){const p=st.p;
    $('cl-h0').innerHTML=NM[p.a]+' <small>keeps its defence</small>';$('cl-h1').innerHTML=NM[p.b]+' <small>defence removed</small>';
    panel(p.a,i,$('cl-p0'),$('cl-c0'));panel(p.b,i,$('cl-p1'),$('cl-c1'));
    const sa=R[p.a].snaps[i],sb=R[p.b].snaps[i];
    $('cl-cap').innerHTML='<div class="t">Step '+S[i].toLocaleString('en-US')+' of '+T.steps.toLocaleString('en-US')+(i===0?': random initialisation':'')+'</div>'+(i===0?p.cap:(sb.std<0.02&&sa.std>0.1?'<b>Collapsed on the right</b> (std '+sb.std.toFixed(3)+'). ':'')+p.cap);
    stdChart(i);
  }
  function stdChart(i){
    const el=$('cl-std'),W=RD.width(el),H=210,L=40,Rr=12,Tt=10,B=30;
    const lx=v=>Math.log10(Math.max(1,v)),X=v=>L+lx(v)/lx(T.steps)*(W-L-Rr),Y=v=>Tt+(1-v/0.3)*(H-Tt-B);
    let h='';[0,0.1,0.2,0.3].forEach(v=>{h+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(L-5)+'" y="'+(Y(v)+4)+'" text-anchor="end" font-size="11" fill="var(--mute)">'+v.toFixed(1)+'</text>'});
    [1,10,100,1000].forEach(v=>{if(v<=T.steps)h+='<text x="'+X(v)+'" y="'+(H-B+14)+'" text-anchor="middle" font-size="11" fill="var(--mute)">'+v.toLocaleString('en-US')+'</text>'});
    h+='<text x="'+((L+W-Rr)/2)+'" y="'+(H-3)+'" text-anchor="middle" font-size="11" fill="var(--mute)">training step (log scale; step 0 drawn at 1)</text>';
    for(const k in R){const on=k===st.p.a||k===st.p.b;const c=on?(k===st.p.a?'var(--c3)':'var(--c2)'):'var(--dim)';
      h+='<polyline fill="none" stroke="'+c+'" stroke-width="'+(on?2.6:1.2)+'" points="'+R[k].snaps.map(s=>X(s.step).toFixed(1)+','+Y(Math.min(0.3,s.std)).toFixed(1)).join(' ')+'"/>'}
    if(i!=null){const x=X(S[i]);h+='<line x1="'+x+'" x2="'+x+'" y1="'+Tt+'" y2="'+(H-B)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'}
    el.innerHTML=PF.svg(W,H,'Embedding std over training for every run',h)+'<div class="lg" style="padding:0 8px 6px"><span><i class="ln" style="background:var(--c3)"></i>'+NM[st.p.a]+'</span><span><i class="ln" style="background:var(--c2)"></i>'+NM[st.p.b]+'</span><span><i class="ln" style="background:var(--dim)"></i>the other runs</span></div>';
  }
  function table(){
    const f=(a,k,d)=>{const v=a.map(x=>x[k]);const m=v.reduce((s,x)=>s+x,0)/v.length;return Math.abs(m)<0.005?0:m};
    const rg=(a,k,m)=>{const v=a.map(x=>x[k]*m);return Math.min(...v).toFixed(m>1?0:3)+' to '+Math.max(...v).toFixed(m>1?0:3)};
    $('cl-tbl').innerHTML='<tr><th>Run</th><th class="num">Embedding std</th><th class="num">Effective rank</th><th class="num">5-NN accuracy, %</th><th class="num">Alignment</th><th class="num">Uniformity</th><th class="num">DINO teacher entropy, per seed</th></tr>'+
      Object.keys(R).map(k=>{const a=R[k].final_seeds;return '<tr><td>'+NM[k]+'</td><td class="num">'+rg(a,'std',1)+'</td><td class="num">'+f(a,'erank').toFixed(1)+'</td><td class="num">'+rg(a,'knn',100)+'</td><td class="num">'+f(a,'align').toFixed(2)+'</td><td class="num">'+f(a,'unif').toFixed(2)+'</td><td class="num">'+(a[0].t_entropy!=null?a.map(x=>x.t_entropy.toFixed(2)).join(', '):'n/a')+'</td></tr>'}).join('')+
      '<tr><td>Raw pixels, no training</td><td class="num">n/a</td><td class="num">n/a</td><td class="num">'+(100*T.raw_knn).toFixed(0)+'</td><td class="num">n/a</td><td class="num">n/a</td><td class="num">n/a</td></tr>';
    $('cl-about').innerHTML=T.about;
  }
  const A=RD.anim({card:'cl-card',ctl:'cl-ctl',n:S.length,draw,ms:900,label:'Training snapshot',tab:'t-collapse'});
  $('cl-pair').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.p=PAIRS[+b.dataset.i];
    [...$('cl-pair').querySelectorAll('button')].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});A.reset(S.length);A.play()});
  table();
  addEventListener('resize',()=>{if(card.offsetParent)A.redraw()});
})();
