// ---- Reading, forward against reverse KL: a one-bump student fitted to a two-mode teacher, exact gradient descent ----
(function(){
  const $=id=>document.getElementById(id);if(!$('kl'))return;
  const N=40,STEPS=40,C1=11,C2=29,SD=2.5,VAL=[16,24];
  let mode='f',traj=null;
  function teacher(w){const a=[];let s=0;for(let i=0;i<N;i++){const v=w*Math.exp(-((i-C1)**2)/(2*SD*SD))+(1-w)*Math.exp(-((i-C2)**2)/(2*SD*SD));a.push(v);s+=v}return a.map(v=>v/s)}
  function logq(mu,ls){const sg=Math.exp(ls),l=[];let m=-Infinity;for(let i=0;i<N;i++){const v=-((i-mu)**2)/(2*sg*sg);l.push(v);if(v>m)m=v}
    let z=0;l.forEach(v=>z+=Math.exp(v-m));z=m+Math.log(z);return l.map(v=>v-z)}
  const fkl=(p,mu,ls)=>{const lq=logq(mu,ls);let s=0;for(let i=0;i<N;i++)if(p[i]>0)s+=p[i]*(Math.log(p[i])-lq[i]);return s};
  const rkl=(p,mu,ls)=>{const lq=logq(mu,ls);let s=0;for(let i=0;i<N;i++){const q=Math.exp(lq[i]);s+=q*(lq[i]-Math.log(Math.max(p[i],1e-300)))}return s};
  function run(p,f,mu0){let mu=mu0,ls=Math.log(2);const out=[[mu,ls]];const h=1e-4;
    for(let k=0;k<STEPS;k++){const gm=(f(p,mu+h,ls)-f(p,mu-h,ls))/(2*h),gs=(f(p,mu,ls+h)-f(p,mu,ls-h))/(2*h);
      mu-=Math.max(-1.5,Math.min(1.5,8*gm));ls-=Math.max(-0.15,Math.min(0.15,0.15*gs));out.push([mu,ls])}return out}
  function compute(){const w=+$('klW').value,s0=+$('klS').value;$('klWv').textContent=w.toFixed(2);$('klSv').textContent=s0;
    const p=teacher(w);traj={p,w,s0,f:run(p,fkl,s0),r:run(p,rkl,s0)}}
  const mass=(arr,a,b)=>{let s=0;for(let i=a;i<=b;i++)s+=arr[i];return s};
  function draw(k){
    const el=$('klSvg'),W=RD.width(el),H=190,l=8,r=8,t=10,b=24,pw=W-l-r,ph=H-t-b,bw=pw/N;
    const p=traj.p,qs={};['f','r'].forEach(m=>{const [mu,ls]=traj[m][k];qs[m]=logq(mu,ls).map(Math.exp)});
    const show=mode==='b'?['f','r']:[mode];
    let mx=Math.max(...p);show.forEach(m=>mx=Math.max(mx,...qs[m]));mx*=1.08;
    const X=i=>l+i*bw,Y=v=>t+ph*(1-v/mx);
    let s='<rect x="'+X(VAL[0])+'" y="'+t+'" width="'+(bw*(VAL[1]-VAL[0]+1))+'" height="'+ph+'" fill="var(--soft)"/>';
    s+='<text x="'+(X(20)+bw/2)+'" y="'+(t+12)+'" text-anchor="middle" fill="var(--mute)">between the modes</text>';
    for(let i=0;i<N;i++)s+='<rect x="'+(X(i)+1)+'" y="'+Y(p[i])+'" width="'+Math.max(1,bw-2)+'" height="'+(t+ph-Y(p[i]))+'" fill="var(--dim)"/>';
    show.forEach(m=>{const q=qs[m];let d='';for(let i=0;i<N;i++)d+=(i?'L':'M')+(X(i)+bw/2).toFixed(1)+' '+Y(q[i]).toFixed(1);
      s+='<path d="'+d+'" fill="none" stroke="var('+(m==='f'?'--c1':'--c2')+')" stroke-width="2.5"/>'});
    [0,10,20,30,39].forEach(i=>s+='<text x="'+(X(i)+bw/2)+'" y="'+(H-8)+'" text-anchor="middle" fill="var(--mute)">'+i+'</text>');
    el.innerHTML=PF.svg(W,H,'Teacher distribution and the student fitted by '+(mode==='b'?'both objectives':mode==='f'?'forward KL':'reverse KL')+' at step '+k,s);
    // counters
    const st=m=>{const [mu,ls]=traj[m][k];return {mu,sg:Math.exp(ls),F:fkl(p,mu,ls),R:rkl(p,mu,ls),val:mass(qs[m],VAL[0],VAL[1])}};
    let h=RD.stat('Step',k+' / '+STEPS,'gradient steps on each objective');
    show.forEach(m=>{const v=st(m);h+=RD.stat((m==='f'?'Forward':'Reverse')+'-KL student','centre '+v.mu.toFixed(1)+', width '+v.sg.toFixed(1),'forward KL '+v.F.toFixed(3)+' · reverse KL '+v.R.toFixed(3)+' nats');
      h+=RD.stat('Its mass between the modes',PF.pct(v.val,1),'teacher: '+PF.pct(mass(p,VAL[0],VAL[1]),1)+' (tokens '+VAL[0]+' to '+VAL[1]+')')});
    $('klN').innerHTML=h;
    const left=traj.w,near=Math.abs(traj.s0-C1)<Math.abs(traj.s0-C2)?'left':'right';
    let T,P;
    if(k===0){T='Start: the same student for both objectives';P='One narrow bump at token '+traj.s0+'. The teacher has two modes, '+PF.pct(left,0)+' of its mass on the left and '+PF.pct(1-left,0)+' on the right. A one-bump student cannot match it exactly; the objective decides how it is wrong.'}
    else if(k<6){T='The first steps';P=mode==='r'?'Reverse KL weighs the error by the student\'s own probability, so only the region the student already covers matters: it slides toward the nearer mode ('+near+') and narrows.':mode==='f'?'Forward KL weighs the error by the teacher\'s probability: every token where the teacher has mass and the student has almost none costs a lot, so the student widens fast to reach both modes.':'Forward KL (blue) widens to reach both modes; reverse KL (orange) slides to the nearer one, the '+near+' mode, whatever its size.'}
    else if(k<STEPS){T='Settling';P=mode==='f'?'The forward-KL student sits between the modes, wide enough to cover both. Sampled, it would often produce tokens in the valley that the teacher almost never produces.':mode==='r'?'The reverse-KL student has locked onto one mode and matches it closely. It never produces what the teacher would not, and never produces the other mode either.':'Two different answers to the same impossible fit: cover everything, or commit to one thing.'}
    else{T='Converged';P='Forward KL: mass-covering, '+PF.pct(st('f').val,0)+' of the student between the modes where the teacher has '+PF.pct(mass(p,VAL[0],VAL[1]),0)+'. Reverse KL: mode-seeking, it picked the '+near+' mode because it started nearer'+((near==='left')===(left>=0.5)?', which here is also the larger one: move the start past the middle and it picks the smaller.':', even though that mode holds less of the teacher\'s mass.')+' Move the start or the weights and run it again.'}
    $('klT').textContent=T;$('klP').textContent=P;
  }
  compute();
  const A=RD.anim({card:'kl',ctl:'klC',n:STEPS+1,ms:260,label:'Gradient step',draw});
  $('klM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...$('klM').children].forEach(x=>x.classList.toggle('on',x===b));A.reset(STEPS+1);A.play()});
  ['klW','klS'].forEach(id=>$(id).addEventListener('input',()=>{compute();A.reset(STEPS+1)}));
  addEventListener('resize',()=>{if($('kl').offsetParent)A.redraw()});
})();
