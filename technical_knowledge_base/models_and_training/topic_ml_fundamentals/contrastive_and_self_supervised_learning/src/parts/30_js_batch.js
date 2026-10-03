// ---- One real batch: InfoNCE on real sentence cosines (BERT before and after SimCSE) ----
// Pure maths in CSI (also run by check_core.mjs against recompute.py).
window.CSI=(function(){
  // M: flat N0 x N0 cosines (row anchor i, column candidate j); use the first n rows/columns
  function cos(M,N0,i,j){return M[i*N0+j]/1000}
  function rowSoft(M,N0,n,tau,i){const z=[];let mx=-1e9;for(let j=0;j<n;j++){const v=cos(M,N0,i,j)/tau;z.push(v);if(v>mx)mx=v}
    let s=0;const e=z.map(v=>{const x=Math.exp(v-mx);s+=x;return x});return {p:e.map(x=>x/s),lse:mx+Math.log(s),z}}
  function colSoft(M,N0,n,tau,j){const z=[];let mx=-1e9;for(let i=0;i<n;i++){const v=cos(M,N0,i,j)/tau;z.push(v);if(v>mx)mx=v}
    let s=0;const e=z.map(v=>{const x=Math.exp(v-mx);s+=x;return x});return {p:e.map(x=>x/s),lse:mx+Math.log(s),z}}
  // mean InfoNCE over the n anchors: L_i = -s_ii/tau + logsumexp_j s_ij/tau ; symmetric = average with the column direction
  function loss(M,N0,n,tau,sym){let L=0,acc=0;
    for(let i=0;i<n;i++){const r=rowSoft(M,N0,n,tau,i);L+=r.lse-r.z[i];let am=0;for(let j=1;j<n;j++)if(r.z[j]>r.z[am])am=j;if(am===i)acc++}
    L/=n;if(!sym)return {L,acc:acc/n};
    let C=0;for(let j=0;j<n;j++){const c=colSoft(M,N0,n,tau,j);C+=c.lse-c.z[j]}C/=n;return {L:(L+C)/2,acc:acc/n}}
  // gradient of anchor i's row loss with respect to each cosine s_ij: (p_j - [j = i]) / tau
  function grad(M,N0,n,tau,i){const r=rowSoft(M,N0,n,tau,i);return r.p.map((p,j)=>(p-(j===i?1:0))/tau)}
  return {cos,rowSoft,loss,grad};
})();
(function(){
  const card=document.getElementById('rb-card');if(!card||!window.CSD)return;
  const D=CSD.rb,N0=D.s1.length,$=id=>document.getElementById(id);
  const st={m:'bert',tau:0.05,n:16,sym:false,a:0};
  const tauOf=v=>Math.pow(10,-2+2*v/100);
  const fmt=x=>x.toFixed(3);
  function stats(){
    const M=D.M[st.m],r=CSI.loss(M,N0,st.n,st.tau,st.sym),ch=Math.log(st.n);
    let pos=0,neg=0;for(let i=0;i<st.n;i++)for(let j=0;j<st.n;j++){const c=CSI.cos(M,N0,i,j);if(i===j)pos+=c;else neg+=c}
    pos/=st.n;neg/=(st.n*(st.n-1)||1);
    $('rb-stats').innerHTML=RD.stat('mean loss',fmt(r.L),'nats, '+(st.sym?'symmetric':'anchor to candidate'))+
      RD.stat('chance, ln N',fmt(ch),'a model that knows nothing')+
      RD.stat('ln N − loss',fmt(Math.max(0,ch-r.L)),'the InfoNCE lower bound on mutual information, nats')+
      RD.stat('anchors whose positive ranks first',Math.round(r.acc*st.n)+' of '+st.n,'top-1 retrieval in this batch')+
      RD.stat('mean cosine',fmt(pos)+' / '+fmt(neg),'positives / negatives');
  }
  function heat(){
    const el=$('rb-hm'),W=Math.min(RD.width(el)-2,440),n=st.n,c=W/n;
    const M=D.M[st.m];let h='';
    const col=PF.css('--c1');
    for(let i=0;i<n;i++){const r=CSI.rowSoft(M,N0,n,st.tau,i);
      for(let j=0;j<n;j++){h+='<rect x="'+(j*c).toFixed(2)+'" y="'+(i*c).toFixed(2)+'" width="'+(c+0.3).toFixed(2)+'" height="'+(c+0.3).toFixed(2)+'" fill="'+col+'" fill-opacity="'+(0.04+0.96*Math.sqrt(r.p[j])).toFixed(3)+'"><title>anchor '+(i+1)+', candidate '+(j+1)+': cosine '+fmt(CSI.cos(M,N0,i,j))+', p = '+r.p[j].toFixed(3)+'</title></rect>'}}
    for(let i=0;i<n;i++)h+='<rect x="'+(i*c+0.8).toFixed(2)+'" y="'+(i*c+0.8).toFixed(2)+'" width="'+Math.max(1,c-1.6).toFixed(2)+'" height="'+Math.max(1,c-1.6).toFixed(2)+'" fill="none" stroke="var(--c2)" stroke-width="'+(n>32?1.2:1.8)+'"/>';
    h+='<rect x="0.5" y="'+(st.a*c+0.5).toFixed(2)+'" width="'+(W-1)+'" height="'+(c-1).toFixed(2)+'" fill="none" stroke="var(--ink)" stroke-width="1.6"/>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+W+'" width="'+W+'" height="'+W+'" role="img" aria-label="Row softmax heat map" style="cursor:pointer">'+h+'</svg>';
    el.querySelector('svg').addEventListener('click',e=>{const b=e.currentTarget.getBoundingClientRect();const i=Math.floor((e.clientY-b.top)/b.height*n);if(i>=0&&i<n){st.a=i;draw()}});
  }
  function grad(){
    const M=D.M[st.m],n=st.n,i=st.a,g=CSI.grad(M,N0,n,st.tau,i),r=CSI.rowSoft(M,N0,n,st.tau,i);
    $('rb-ai').textContent=(i+1)+' of '+n;
    $('rb-anchor').innerHTML='<p style="margin:2px 0"><b>Anchor:</b> '+RD.esc(D.s1[i])+'</p><p style="margin:2px 0"><b>Positive:</b> '+RD.esc(D.s2[i])+' <span class="mute">(gold '+(D.gold[i]*5).toFixed(1)+' of 5)</span></p>';
    const ord=[...Array(n).keys()].sort((a,b)=>CSI.cos(M,N0,i,b)-CSI.cos(M,N0,i,a));
    const show=ord.slice(0,Math.min(n,8));if(!show.includes(i))show[show.length-1]=i;
    const mx=Math.max(...g.map(Math.abs));let negSum=0;g.forEach((v,j)=>{if(j!==i)negSum+=v});
    const hard=ord.filter(j=>j!==i);const top1=hard.length?g[hard[0]]/negSum:0,top3=hard.slice(0,3).reduce((s,j)=>s+g[j],0)/(negSum||1);
    $('rb-grad').innerHTML=show.map(j=>{const v=g[j],pos=j===i,w=Math.abs(v)/mx*100;
      return '<div class="row'+(pos?' hl':'')+'"><span class="nm" title="'+RD.esc(D.s2[j])+'">'+(pos?'positive: ':'')+RD.esc(D.s2[j])+'</span><span class="track"><span class="fill" style="width:'+w.toFixed(1)+'%;background:'+(pos?'var(--c3)':'var(--c2)')+'"></span></span><span class="val">'+(v>0?'+':'−')+Math.abs(v).toFixed(2)+'</span></div>'+
        '<div class="small mute" style="margin:-2px 0 4px">cosine '+fmt(CSI.cos(M,N0,i,j))+' · p = '+r.p[j].toFixed(3)+'</div>'}).join('');
    $('rb-gnote').innerHTML='Bars: ∂L/∂s, the push on each cosine (green, negative sign: the positive is pulled up; orange: each negative is pushed down by p/τ). The positive\'s pull equals the sum of the pushes. Of that push, the hardest negative takes <b>'+(100*top1).toFixed(0)+'%</b> and the three hardest <b>'+(100*top3).toFixed(0)+'%</b>'+(n>1?' (an even split would give '+(100/(n-1)).toFixed(0)+'% each)':'')+'. Candidates are sorted by cosine; the eight most similar are shown.';
  }
  function curve(){
    const el=$('rb-curve'),W=RD.width(el),H=200,L=44,R=12,T=10,B=34,n=st.n;
    const xs=[];for(let k=0;k<=60;k++)xs.push(-2+2*k/60);
    const X=v=>L+(v+2)/2*(W-L-R);
    const ys={bert:xs.map(v=>CSI.loss(D.M.bert,N0,n,Math.pow(10,v),st.sym).L),simcse:xs.map(v=>CSI.loss(D.M.simcse,N0,n,Math.pow(10,v),st.sym).L)};
    const ymax=Math.max(Math.log(n)*1.08,...ys.bert,...ys.simcse),Y=v=>T+(1-v/ymax)*(H-T-B);
    let h='';
    [0,ymax/2,ymax].forEach(v=>{h+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(L-5)+'" y="'+(Y(v)+4)+'" text-anchor="end" font-size="11" fill="var(--mute)">'+v.toFixed(1)+'</text>'});
    [-2,-1,0].forEach(v=>{h+='<text x="'+X(v)+'" y="'+(H-B+15)+'" text-anchor="middle" font-size="11" fill="var(--mute)">'+[0.01,0.1,1][v+2]+'</text>'});
    h+='<text x="'+((L+W-R)/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="11" fill="var(--mute)">temperature τ (log scale)</text>';
    h+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(Math.log(n))+'" y2="'+Y(Math.log(n))+'" stroke="var(--mute)" stroke-dasharray="2 3"/>';
    [['bert','var(--c2)','BERT'],['simcse','var(--c1)','after SimCSE']].forEach(([k,c,nm])=>{
      h+='<polyline fill="none" stroke="'+c+'" stroke-width="'+(st.m===k?2.6:1.4)+'" points="'+xs.map((v,q)=>X(v).toFixed(1)+','+Y(ys[k][q]).toFixed(1)).join(' ')+'"/>';
      const q=xs.length-1;h+='<text x="'+(W-R-2)+'" y="'+(Y(ys[k][q])+(k==='bert'?-6:14))+'" text-anchor="end" font-size="11" fill="'+c+'">'+nm+'</text>'});
    const lt=Math.log10(st.tau),cl=CSI.loss(D.M[st.m],N0,n,st.tau,st.sym).L;
    h+='<line x1="'+X(lt)+'" x2="'+X(lt)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--ink)" stroke-dasharray="3 3"/><circle cx="'+X(lt)+'" cy="'+Y(cl)+'" r="4.5" fill="var(--ink)"/>';
    el.innerHTML=PF.svg(W,H,'Mean loss against temperature',h);
  }
  function table(){
    const rows=D.tbl.map(r=>'<tr><td>'+RD.esc(r.name)+'</td><td>'+RD.esc(r.pool)+'</td><td class="num">'+r.sp.toFixed(2)+'</td><td class="num">'+r.al.toFixed(3)+'</td><td class="num">'+r.un.toFixed(3)+'</td><td class="num">'+r.mc.toFixed(3)+'</td></tr>').join('');
    $('rb-tbl').innerHTML='<tr><th>Model</th><th>Pooling</th><th class="num">STS-B Spearman × 100</th><th class="num">Alignment ↓</th><th class="num">Uniformity ↓</th><th class="num">Mean cosine, random pairs</th></tr>'+rows;
    $('rb-repro').innerHTML='<b>Defaults reproduce</b> three published STS-B test Spearman figures, independently, from the released checkpoints: unsup-SimCSE-BERT<sub>base</sub> '+D.tbl[3].sp.toFixed(2)+' against '+D.paper.simcse.toFixed(2)+' (<a href="https://arxiv.org/abs/2104.08821" target="_blank" rel="noopener noreferrer">Gao et al. 2021</a>, Table 5); BERT first-last avg. '+D.tbl[0].sp.toFixed(2)+' against '+D.paper.bert.toFixed(2)+' (Su et al. 2021, quoted in SimCSE Table B.2); and SimCSE\'s own Table 5 baseline, '+D.paper.bert_t5.toFixed(2)+', which this page matches to two decimals ('+D.tbl[1].sp.toFixed(2)+') only by averaging the <i>embedding</i> layer with the last layer, not the first transformer layer <i class="nl d">our finding</i>. The batch uses the first-last pooling. The temperature starts at SimCSE\'s τ = 0.05.';
  }
  function draw(){
    $('rb-tv').textContent=st.tau<0.1?st.tau.toFixed(3):st.tau.toFixed(2);$('rb-nv').textContent=st.n;
    if(st.a>=st.n)st.a=0;stats();heat();grad();curve();
  }
  $('rb-m').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.m=b.dataset.m;
    [...$('rb-m').querySelectorAll('button')].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});draw()});
  $('rb-t').addEventListener('input',e=>{st.tau=tauOf(+e.target.value);draw()});
  $('rb-n').addEventListener('input',e=>{st.n=+e.target.value;draw()});
  $('rb-sym').addEventListener('change',e=>{st.sym=e.target.checked;draw()});
  st.tau=tauOf(+$('rb-t').value);st.n=+$('rb-n').value;
  table();
  RD.onRender(draw,'t-batch');
  addEventListener('resize',()=>{if(card.offsetParent)draw()});
})();
