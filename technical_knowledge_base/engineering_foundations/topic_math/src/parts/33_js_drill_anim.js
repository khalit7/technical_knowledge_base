// ---- Practice drills: softmax cross-entropy to p - y, animated term by term (two routes, same input, same scale) ----
// Uses RD.anim from 21_js_rd_common.js (play, pause, step, scrub, speed; only on screen; paused under reduced motion).
(function(){
  const card=document.getElementById('pd-an');if(!card||!window.RD)return;
  const z=[2,1,0],y=[0,0,1],T=2,ez=z.map(Math.exp),sum=ez.reduce((a,b)=>a+b,0),p=ez.map(v=>v/sum);
  const L=-Math.log(p[T]),J=p.map((pi,i)=>p.map((pk,k)=>pi*((i===k?1:0)-pk)));
  const f3=v=>(v<0?'−':'')+Math.abs(v).toFixed(3);
  const vec=a=>'('+a.map(f3).join(', ')+')';
  const g=p.map((v,k)=>v-y[k]),dLdp=y.map((v,i)=>-v/p[i]);
  const NAMES=['cat','dog','sat'];
  // what each step draws: series of bars (same scale throughout) or the Jacobian grid
  const R={
    lse:[
      {bars:[['p (softmax)',p,'--c1']],cap:'The loss is the surprise at the correct token sat: −ln '+p[T].toFixed(3)+' = '+L.toFixed(3)+' nats. The bars show the model\'s probabilities p.',built:0},
      {bars:[['p (softmax)',p,'--c1']],cap:'Write p_y out in full, so the loss depends on the logits z directly.',built:0},
      {bars:[['p (softmax)',p,'--c1']],cap:'The log of a ratio is a difference of logs. Check with numbers: z_sat = 0, so L = 0 + ln '+sum.toFixed(3)+' = '+Math.log(sum).toFixed(3)+' = '+L.toFixed(3)+'.',built:0},
      {bars:[['−y (first term)',y.map(v=>-v),'--c2']],cap:'The first term involves only the correct logit: its derivative is −1 for sat and 0 for cat and dog, that is −y.',built:0},
      {bars:[['−y (first term)',y.map(v=>-v),'--c2'],['+p (second term)',p,'--c1']],cap:'The derivative of log-sum-exp is the softmax itself: every logit is pushed up in proportion to its probability.',built:0},
      {bars:[['p − y (gradient)',g,'--c3']],cap:'Add the two: p − y = '+vec(g)+'. Descent subtracts it: the correct logit (sat) goes up, each wrong one goes down by the probability it took; the entries sum to zero. These are the Reading\'s numbers.',built:0}],
    jac:[
      {bars:[['p (softmax)',p,'--c1']],cap:'The same loss, written as a sum over all classes with the one-hot target y = (0, 0, 1).',built:0},
      {bars:[['∂L/∂p = −y/p',dLdp,'--c2']],cap:'Differentiate the log: ∂L/∂p_i = −y_i/p_i = '+vec(dLdp)+'. Only sat is nonzero, and it is large because the model gave sat only '+p[T].toFixed(3)+' (drawn on a longer scale).',built:0},
      {grid:'all',cap:'The softmax Jacobian: how each probability p_i moves when each logit z_k moves. A 3 × 3 matrix, 9 numbers to build.',built:9},
      {grid:'row',cap:'Chain rule: multiply −y/p into the Jacobian. Only row sat survives (y is zero elsewhere), and its p_sat cancels against the 1/p_sat.',built:9},
      {bars:[['−y',y.map(v=>-v),'--c2'],['p · Σy',p,'--c1']],cap:'Split the sum into −y_k and p_k times the sum of the target.',built:9},
      {bars:[['p − y (gradient)',g,'--c3']],cap:'The one-hot target sums to 1, so the answer is p − y = '+vec(g)+' again, after building a K × K matrix. With a 50,000-token vocabulary that matrix has 2.5 billion entries per position, which is why libraries take raw logits (PyTorch\'s cross_entropy) and use the short route.',built:9}]};
  let route='lse';
  const fig=document.getElementById('pd-an-fig'),cap=document.getElementById('pd-an-cap'),stats=document.getElementById('pd-an-stats');
  const col=v=>'var('+v+')';
  function bars(series,W){
    const mn=Math.min(...series.map(se=>Math.min(...se[1]))),lo=mn<-1.05?mn*1.08:-1.05,hi=1.0,H=170,top=22,bot=150,y0=top+(hi/(hi-lo))*(bot-top),sc=(bot-top)/(hi-lo);
    const left=8,gw=(W-left-8)/3,ns=series.length,bw=Math.min(34,(gw-16)/ns);
    let s='<line x1="'+left+'" x2="'+(W-8)+'" y1="'+y0+'" y2="'+y0+'" stroke="var(--mute)" stroke-width="1"/>';
    for(let k=0;k<3;k++){const cx=left+gw*k+gw/2;
      s+=RD.t(cx,H-4,'token '+NAMES[k],{a:'middle',fs:11.5,fill:'var(--mute)'});
      series.forEach((se,j)=>{const v=se[1][k],x=cx-(ns*bw)/2+j*bw,h=Math.abs(v)*sc,yy=v>=0?y0-h:y0;
        s+='<rect x="'+(x+1).toFixed(1)+'" y="'+yy.toFixed(1)+'" width="'+(bw-2).toFixed(1)+'" height="'+Math.max(h,0.5).toFixed(1)+'" fill="'+col(se[2])+'" rx="2"/>';
        s+=RD.t(x+bw/2,(v>=0?yy-4:yy+h+12).toFixed(1),f3(v),{a:'middle',fs:10.5})})}
    let lg='';series.forEach((se,j)=>{lg+='<tspan fill="'+col(se[2])+'">■</tspan> '+RD.esc(se[0])+(j<series.length-1?'   ':'')});
    s+='<text x="'+left+'" y="12" font-size="11.5">'+lg+'</text>';
    return RD.svg(W,H,s,'Bar chart: '+series.map(se=>se[0]+' '+vec(se[1])).join('; '))}
  function grid(mode,W){
    const H=170,cw=Math.min(70,(W-60)/3),ch=36,x0=Math.max(40,(W-3*cw)/2),y0=34;
    let s=RD.t(x0+1.5*cw,14,'∂p_i/∂z_k = p_i(δ_ik − p_k)',{a:'middle',fs:11.5});
    for(let k=0;k<3;k++)s+=RD.t(x0+cw*k+cw/2,y0-4,'z_'+NAMES[k],{a:'middle',fs:10.5,fill:'var(--mute)'});
    for(let i=0;i<3;i++){s+=RD.t(x0-6,y0+ch*i+ch/2+4,'p_'+NAMES[i],{a:'end',fs:10.5,fill:'var(--mute)'});
      for(let k=0;k<3;k++){const v=J[i][k],live=mode==='all'||i===T,a=Math.min(1,Math.abs(v)/0.25);
        s+='<rect x="'+(x0+cw*k+1)+'" y="'+(y0+ch*i+1)+'" width="'+(cw-2)+'" height="'+(ch-2)+'" rx="3" fill="var('+(v>=0?'--c1':'--c2')+')" fill-opacity="'+(live?(0.15+0.5*a).toFixed(2):'0.06')+'"/>';
        s+=RD.t(x0+cw*k+cw/2,y0+ch*i+ch/2+4,f3(v),{a:'middle',fs:11,fill:live?undefined:'var(--dim)'})}}
    if(mode==='row')s+='<rect x="'+(x0-1)+'" y="'+(y0+ch*T-1)+'" width="'+(3*cw+2)+'" height="'+(ch+2)+'" fill="none" stroke="var(--ink)" stroke-width="1.5" rx="4"/>';
    return RD.svg(W,H,s,'Softmax Jacobian, 3 by 3')}
  function draw(i){
    const seq=R[route],d=seq[i];
    document.querySelectorAll('#pd-lines-'+route+' .pd-ln').forEach(n=>{const k=+n.dataset.s;n.classList.toggle('past',k<i);n.classList.toggle('cur',k===i);n.classList.toggle('fut',k>i)});
    const W=Math.min(420,RD.width(fig));
    fig.innerHTML=d.grid?grid(d.grid,W):bars(d.bars,W);
    cap.textContent='Step '+(i+1)+' of '+seq.length+'. '+d.cap;
    stats.innerHTML=RD.stat('Loss',L.toFixed(3)+' nats','−ln p_sat')+RD.stat('Matrix entries built',String(d.built),route==='lse'?'never forms a matrix':'the 3 × 3 Jacobian')+
      RD.stat('Gradient',i===seq.length-1?vec(g):'not yet',i===seq.length-1?'sums to '+f3(g.reduce((a,b)=>a+b,0)).replace('−',''):'')}
  const ctl=RD.anim({card:'pd-an',ctl:'pd-an-ctl',n:6,draw,ms:2600,label:'Derivation step'});
  RD.seg(document.getElementById('pd-an-route'),m=>{route=m;
    document.getElementById('pd-lines-lse').hidden=m!=='lse';document.getElementById('pd-lines-jac').hidden=m!=='jac';ctl.reset(6);ctl.play()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-drill']=window.TAB_RENDER['t-drill']||[]).push(()=>ctl.redraw());
  let t=0;addEventListener('resize',()=>{const r=document.getElementById('t-drill');if(!r||r.hidden)return;clearTimeout(t);t=setTimeout(()=>ctl.redraw(),80)});
})();
