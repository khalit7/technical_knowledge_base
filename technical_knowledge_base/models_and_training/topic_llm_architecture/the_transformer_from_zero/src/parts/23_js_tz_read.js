// Reading tab: predict-then-reveal drills, the training-snapshot animation, the sampling explorer (data: window.TZD)
(function(){
  if(!window.TZD||!window.RD)return;
  const D=window.TZD,$=id=>document.getElementById(id),esc=RD.esc;
  // shared helpers for every tab of this page
  window.TZ={
    // loss colour: 0 nats green-ish to 8 nats red-ish, via CSS variables mixed in HSL space
    lossColor(l){const t=Math.max(0,Math.min(1,l/8));const h=130-130*t;return 'hsla('+h.toFixed(0)+',70%,50%,'+(0.18+0.55*t).toFixed(2)+')'},
    diffColor(d){const t=Math.max(-1,Math.min(1,d/3));return t>=0?'hsla(10,75%,50%,'+(0.08+0.6*t).toFixed(2)+')':'hsla(205,75%,50%,'+(0.08-0.6*t).toFixed(2)+')'},
    tokens(el,pieces,vals,col,title){
      let h='';for(let i=1;i<pieces.length;i++){const p=pieces[i];const v=vals[i-1];
        if(p.indexOf('\n')>=0){h+='<span class="nl"></span>';continue}
        h+='<span data-i="'+i+'" style="background:'+col(v)+'" title="'+esc(title(i,v))+'">'+esc(p)+'</span>'}
      el.innerHTML=h},
    fmt(v,d){return v==null?'n/a':v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})}
  };
  // drills
  document.querySelectorAll('#t-read .pr').forEach(pr=>{pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
    pr.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.ok==='1');x.classList.toggle('wrong',x===b&&x.dataset.ok!=='1')});
    pr.querySelector('.ans').hidden=false}))});
  const leg=$('tz-trn-leg');if(leg){let g=[];for(let i=0;i<=8;i++)g.push(TZ.lossColor(i)+' '+(i*12.5)+'%');leg.style.background='linear-gradient(90deg,'+g.join(',')+')'}
  // training snapshots animation
  if($('tz-trn')){
    const S=D.snaps,F=D.floors;
    function plot(i){
      const el=$('tz-trn-plot'),W=RD.width(el),H=205,m={l:40,r:12,t:26,b:26};
      const X=s=>m.l+(W-m.l-m.r)*Math.sqrt(s/1500),Y=v=>m.t+(H-m.t-m.b)*(9-v)/(9-1.5);
      let b='';
      [2,4,6,8].forEach(v=>{b+='<line x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(m.l-5,Y(v)+4,v,{a:'end',fill:'var(--mute)'})});
      [0,50,250,500,1000,1500].forEach(s=>{b+=RD.t(X(s),H-8,s.toLocaleString('en-US'),{a:s===1500?'end':s===0?'start':'middle',fill:'var(--mute)'})});
      [['uniform',F.uniform],['unigram',F.unigram],['bigram',F.bigram]].forEach(([n,v])=>{b+='<line x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--c5)" stroke-dasharray="4 3"/>'+RD.t(W-m.r-2,Y(v)-3,n+' '+v.toFixed(2),{a:'end',fill:'var(--c5)'})});
      b+='<polyline fill="none" stroke="var(--c1)" stroke-width="2" points="'+S.map(s=>X(s.step).toFixed(1)+','+Y(s.val).toFixed(1)).join(' ')+'"/>';
      S.forEach((s,j)=>{b+='<circle cx="'+X(s.step)+'" cy="'+Y(s.val)+'" r="'+(j===i?5.5:3)+'" fill="'+(j===i?'var(--c2)':'var(--c1)')+'"/>'});
      b+=RD.t(m.l-30,12,'held-out loss (nats) against step (square-root axis)',{fill:'var(--mute)'});
      el.innerHTML=RD.svg(W,H,b,'Held-out loss over training with the selected snapshot')}
    function draw(i){
      const s=S[i];plot(i);
      const below=s.val<F.bigram?'below the bigram line':s.val<F.unigram?'below the unigram line':'above the unigram line';
      $('tz-trn-cnt').innerHTML=RD.stat('Step',s.step.toLocaleString('en-US'),(s.step*8192/1e6).toFixed(1)+'M tokens seen')+RD.stat('Held-out loss',s.val.toFixed(3),below)+RD.stat('Running sequence',s.seq.toFixed(3),'mean nats per token');
      TZ.tokens($('tz-trn-tok'),D.pieces,s.tok,TZ.lossColor,(j,v)=>'position '+j+': '+v.toFixed(2)+' nats');
      $('tz-trn-gen').innerHTML='<b>Greedy, prompt 7:</b> '+esc(D.prompt7)+' <span style="color:var(--c3);font-weight:600">'+esc(s.greedy.slice(0,230))+'</span>';
    }
    RD.anim({card:'tz-trn',ctl:'tz-trn-ctl',n:S.length,draw,ms:1700,label:'Training snapshot'});
    $('tz-trn-tok').addEventListener('click',e=>{const sp=e.target.closest('span[data-i]');if(sp)$('tz-trn-info').textContent='"'+D.pieces[+sp.dataset.i]+'" at '+sp.title})
    RD.onResize(()=>{const sc=document.getElementById('tz-trn-ctl-s');if(sc)plot(+sc.value)});
  }
  // sampling explorer
  if($('tz-smp')){
    const P=D.smp.points;let pi=0;
    $('tz-smp-pt').innerHTML=P.map((p,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>...'+esc(p.context.slice(-24))+'</button>').join('');
    RD.seg($('tz-smp-pt'),m=>{pi=+m;draw()});
    function draw(){
      const p=P[pi],T=+$('tz-smp-t').value/100,k=+$('tz-smp-k').value;$('tz-smp-tv').textContent=T.toFixed(2);
      const L=p.logits,n=L.length,idx=[...Array(n).keys()].sort((a,b)=>L[b]-L[a]);
      const keep=new Set(k?idx.slice(0,k):idx);let mx=-1e9;idx.forEach(i=>{if(keep.has(i))mx=Math.max(mx,L[i]/T)});
      const pr=new Float64Array(n);let Z=0;for(let i=0;i<n;i++){if(keep.has(i)){pr[i]=Math.exp(L[i]/T-mx);Z+=pr[i]}}
      let H=0;for(let i=0;i<n;i++){pr[i]/=Z;if(pr[i]>0)H-=pr[i]*Math.log(pr[i])}
      let top12=0;idx.slice(0,12).forEach(i=>top12+=pr[i]);
      $('tz-smp-cnt').innerHTML=RD.stat('True next token','"'+esc(p.next_true)+'"','p = '+(pr[p.true_id]*100).toFixed(1)+'%')+RD.stat('Entropy',H.toFixed(2)+' nats','perplexity '+Math.exp(H).toFixed(1))+RD.stat('Outside the 12 shown',((1-top12)*100).toFixed(1)+'%','of the probability');
      $('tz-smp-bars').innerHTML='<div class="small mute" style="margin:2px 0 4px">Context: ...'+esc(p.context)+'</div>'+idx.slice(0,12).map(i=>'<div class="row'+(keep.has(i)?'':' cut')+(i===p.true_id?' true':'')+'"><span class="nm">'+esc(JSON.stringify(p.names[i]||'?').slice(1,-1))+'</span><span class="tr"><span style="width:'+(pr[i]*100).toFixed(1)+'%"></span></span><span class="v">'+(pr[i]*100).toFixed(1)+'%</span></div>').join('');
    }
    $('tz-smp-t').addEventListener('input',draw);$('tz-smp-k').addEventListener('change',draw);
    RD.onRender(draw);draw();
  }
})();
