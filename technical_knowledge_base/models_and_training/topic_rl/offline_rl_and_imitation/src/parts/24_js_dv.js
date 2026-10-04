// ---- Reading: behaviour cloning against DAgger on the lane-keeping task (before/after animation), and cost against horizon ----
(function(){
  const E=window.OF,$=id=>document.getElementById(id);
  const A=$('dv-A'),S=$('dv-S'),Tt=$('dv-T'),Px=$('dv-P'),N=$('dv-N');
  let mode='bc',st=null;
  const HEAD={'-1':'turning left','0':'straight','1':'turning right'};
  const laneName=x=>x===0?'its own lane':(Math.abs(x)+' lane'+(Math.abs(x)>1?'s':'')+' to the '+(x<0?'left':'right'));
  // the displayed car: the first seed whose behaviour-cloning run first leaves the lane between 15% and 40% of the horizon (same draws for both learners)
  function carSeed(ds,eps,T){for(let s=1;s<40;s++){const v=E.sample(ds[0],eps,T,s),f=v.findIndex(i=>E.SX(i)!==0);if(f>=Math.round(T*0.15)&&f<=Math.round(T*0.4))return s}return 1}
  function compute(){const eps=+$('dv-E').value,T=+$('dv-H').value,R=+$('dv-R').value;
    const ds=E.dagger(eps,T,8,5,7),seed=carSeed(ds,eps,T);
    const mk=d=>{const ex=E.exact(d,eps,T);const cum=[0];ex.per.forEach((v,t)=>cum.push(cum[t]+v));return {data:d,ex,cum,car:E.sample(d,eps,T,seed)}};
    st={eps,T,R,seed,bc:mk(ds[0]),dag:mk(ds[R-1]),ds}}
  function draw(i){const c=st[mode],o=st[mode==='bc'?'dag':'bc'],T=st.T,eps=st.eps;
    // road: lanes across, time upward
    let W=RD.width(A),H=320,l=8,r=8,t=16,b=20;const cw=(W-l-r)/9,rh=(H-t-b)/(T+1);let s='';
    for(let k=0;k<9;k++){const x=l+k*cw;s+='<rect x="'+x.toFixed(1)+'" y="'+t+'" width="'+cw.toFixed(1)+'" height="'+(H-t-b)+'" fill="'+(k===4?'var(--soft)':'var(--bg)')+'" stroke="var(--line)"/>'}
    for(let tt=0;tt<=i;tt++){const P=c.ex.dist[tt],y=H-b-(tt+1)*rh;
      for(let k=0;k<9;k++){let p=0;for(let h=0;h<3;h++)p+=P[k*3+h];if(p>1e-4)s+='<rect x="'+(l+k*cw+1).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(cw-2).toFixed(1)+'" height="'+Math.max(0.6,rh).toFixed(2)+'" fill="'+(k===4?'var(--c1)':'var(--c2)')+'" opacity="'+Math.min(1,0.08+0.92*Math.sqrt(p)).toFixed(3)+'"/>'}}
    const pts=[];for(let tt=0;tt<=i;tt++){const x=E.SX(c.car[tt]);pts.push((l+(x+4.5)*cw).toFixed(1)+','+(H-b-(tt+0.5)*rh).toFixed(1))}
    s+='<polyline fill="none" stroke="var(--ink)" stroke-width="1.8" points="'+pts.join(' ')+'"/>';
    const cx=E.SX(c.car[i]);s+='<circle cx="'+(l+(cx+4.5)*cw).toFixed(1)+'" cy="'+(H-b-(i+0.5)*rh).toFixed(1)+'" r="5" fill="var(--ink)"/>';
    s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+(H-b-(i+1)*rh).toFixed(1)+'" y2="'+(H-b-(i+1)*rh).toFixed(1)+'" stroke="var(--ink)" stroke-dasharray="3 3" opacity=".6"/>';
    s+=RD.t(l+4.5*cw,H-6,'own lane',{a:'middle',fs:10,fill:'var(--mute)'})+RD.t(l+2,H-6,'left',{fs:10,fill:'var(--mute)'})+RD.t(W-r-2,H-6,'right',{a:'end',fs:10,fill:'var(--mute)'})+RD.t(l+2,t-4,'step '+T+' (top)',{fs:10,fill:'var(--mute)'});
    A.innerHTML=RD.svg(W,H,s,'Probability of each lane at each step');
    // state grid: 9 lanes by 3 headings
    W=RD.width(S);const H2=186,l2=62,t2=20,b2=22,gw=(W-l2-8)/9,gh=(H2-t2-b2)/3,P=c.ex.dist[i],inD=new Set(c.data);s='';
    for(let h=1;h>=-1;h--){const y=t2+(1-h)*gh;s+=RD.t(l2-6,y+gh/2+4,HEAD[h].replace('turning ',''),{a:'end',fs:10,fill:'var(--mute)'});
      for(let x=-4;x<=4;x++){const k=E.SI(x,h),X=l2+(x+4)*gw,has=inD.has(k);
        s+='<rect x="'+(X+1).toFixed(1)+'" y="'+(y+1).toFixed(1)+'" width="'+(gw-2).toFixed(1)+'" height="'+(gh-2).toFixed(1)+'" rx="3" fill="'+(has?'var(--acc2)':'var(--bg)')+'" stroke="'+(has?'var(--acc)':'var(--line)')+'"/>';
        if(P[k]>1e-4){const rad=Math.max(1.5,Math.min(gw,gh)*0.45*Math.sqrt(P[k]));s+='<circle cx="'+(X+gw/2).toFixed(1)+'" cy="'+(y+gh/2).toFixed(1)+'" r="'+rad.toFixed(1)+'" fill="'+(has?'var(--c1)':'var(--bad)')+'" opacity=".85"/>'}
        if(k===c.car[i])s+='<rect x="'+(X+3).toFixed(1)+'" y="'+(y+3).toFixed(1)+'" width="'+(gw-6).toFixed(1)+'" height="'+(gh-6).toFixed(1)+'" rx="2" fill="none" stroke="var(--ink)" stroke-width="1.6"/>'}}
    for(let x=-4;x<=4;x+=2)s+=RD.t(l2+(x+4.5)*gw,H2-b2+14,x===0?'own':(x<0?'L'+(-x):'R'+x),{a:'middle',fs:10,fill:'var(--mute)'});
    S.innerHTML=RD.svg(W,H2,s,'States, labels and probability');
    // caption
    const name=mode==='bc'?'Behaviour cloning':'DAgger after '+st.R+' rounds',out=i>0?c.ex.per[i-1]:0,unl=i>0?c.ex.unl[i-1]:0;
    const ck=c.car[i],x=E.SX(ck),h=E.SH(ck),lab=E.label(ck,c.data),has=inD.has(ck);
    if(i===0){Tt.textContent=name+': the car starts in its own lane, heading straight';
      Px.innerHTML=mode==='bc'?'The expert never leaves the centre, so its demonstrations contain one state: own lane, heading straight, label "straight". Everywhere else the learner copies that label, because the centre is the nearest state it knows.':'Round 1 was the expert\'s data (behaviour cloning); each later round ran the learner, asked the expert what to do at every state it visited, and retrained. The learner now has expert labels for '+c.data.length+' of the 27 states (blue squares), including the states a slip leads to.'}
    else{Tt.textContent='Step '+i+': '+name+', P(out of lane) = '+RD.n(out,3);
      let p='The sampled car is in '+laneName(x)+', '+HEAD[h]+(has?', a state with an expert label':', a state with <b>no label</b>')+'; the learner\'s prediction there is "'+(lab<0?'turn left':lab>0?'turn right':'straight')+'"'+(has?'':' (copied from the nearest labelled state)')+'. ';
      if(mode==='bc')p+=unl>0.001?RD.pct(unl,1)+' of the probability is on unlabelled states (red), where "straight" keeps the car drifting: a slip almost always becomes permanent.':'All the probability is still on the one labelled state; each step it slips with probability ε.';
      else p+=unl>0.001?RD.pct(unl,1)+' of the probability is on states the learner has never been taught.':'Less than 0.1% of the probability is on states without a label: a slip is corrected within a few steps.';
      Px.innerHTML=p}
    const bnd=mode==='bc'?eps*i*i:eps*i;
    N.innerHTML=RD.stat('Step',String(i),'of '+T)+RD.stat('P(out of lane)',RD.n(out,3),'at this step')+RD.stat('Expected cost so far',RD.n(c.cum[i],2),'Σ P(out of lane)')+
      RD.stat(mode==='bc'?'εt² (bound)':'εt',RD.n(bnd,2),mode==='bc'?'Ross and Bagnell, J* = 0':'for comparison')+RD.stat(mode==='bc'?'DAgger, same step':'Behaviour cloning, same step',RD.n(o.cum[i],2),'expected cost so far')+RD.stat('Labelled states',c.data.length+' of 27','blue squares')}
  compute();
  const an=RD.anim({card:'dv',ctl:'dv-C',n:st.T+1,ms:110,draw,label:'Step'});
  $('dv-M').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));an.redraw()});
  ['dv-E','dv-H','dv-R'].forEach(id=>$(id).addEventListener('change',()=>{const n0=st.T;compute();if(st.T!==n0)an.reset(st.T+1);else an.redraw()}));
  RD.onResize(()=>an.redraw());

  // ---- cost against horizon, log-log ----
  const HZ=$('hz-A'),Ts=[5,10,20,40,80,160,320],eps=0.02;let rows=null;
  function hz(){if(!rows)rows=Ts.map(T=>{const ds=E.dagger(eps,T,8,5,7);return {T,bc:E.exact(ds[0],eps,T).J,dag:E.exact(ds[ds.length-1],eps,T).J}});
    const W=RD.width(HZ),H=250,l=44,r=12,t=12,b=34,lx0=Math.log10(4),lx1=Math.log10(400),ly0=-2,ly1=Math.log10(3000);
    const X=v=>l+(W-l-r)*(Math.log10(v)-lx0)/(lx1-lx0),Y=v=>t+(H-t-b)*(ly1-Math.max(ly0,Math.min(ly1,Math.log10(v))))/(ly1-ly0);let s='';
    [0.01,0.1,1,10,100,1000].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,String(v),{a:'end',fs:10,fill:'var(--mute)'})});
    Ts.forEach(T=>{s+=RD.t(X(T),H-b+14,String(T),{a:'middle',fs:10,fill:'var(--mute)'})});
    s+=RD.t((l+W-r)/2,H-4,'horizon T (steps)',{a:'middle',fs:10.5,fill:'var(--mute)'})+RD.t(l+4,t+10,'expected cost J',{fs:10.5,fill:'var(--mute)'});
    const line=(f,col,dash,w)=>{const p=[];for(let k=0;k<=40;k++){const T=Math.pow(10,lx0+(lx1-lx0)*k/40);p.push(X(T).toFixed(1)+','+Y(f(T)).toFixed(1))}return '<polyline fill="none" stroke="'+col+'" stroke-width="'+(w||1.4)+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+' points="'+p.join(' ')+'"/>'};
    s+=line(T=>eps*T*T,'var(--c2)','5 4')+line(T=>eps*T,'var(--c1)','5 4')+line(T=>T,'var(--mute)','2 3',1);
    const ser=(k,col)=>'<polyline fill="none" stroke="'+col+'" stroke-width="2.4" points="'+rows.map(o=>X(o.T).toFixed(1)+','+Y(o[k]).toFixed(1)).join(' ')+'"/>'+rows.map(o=>'<circle cx="'+X(o.T).toFixed(1)+'" cy="'+Y(o[k]).toFixed(1)+'" r="3.2" fill="'+col+'"><title>T = '+o.T+': J = '+RD.n(o[k],2)+'</title></circle>').join('');
    s+=ser('bc','var(--c2)')+ser('dag','var(--c1)');
    HZ.innerHTML=RD.svg(W,H,s,'Expected cost against horizon');
    $('hz-L').innerHTML='<span><i style="background:var(--c2)"></i>Behaviour cloning (exact)</span><span><i style="background:var(--c1)"></i>DAgger, 8 rounds (exact)</span><span><i style="background:var(--c2);height:1px"></i>dashed: εT² bound</span><span><i style="background:var(--c1);height:1px"></i>dashed: εT</span><span><i style="background:var(--mute);height:1px"></i>dotted: J = T (out of lane every step)</span>'}
  hz();RD.onResize(hz);
})();
