// ---- Reading, PTQ: GPTQ's column-by-column compensation on one illustrative row of four weights (stepper; numbers from QV.gptq) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-gq'))return;
  const R=window.QV.gptq(),G=R.G,n=4,f=(x,d)=>(x<0?'−':'')+Math.abs(x).toFixed(d==null?2:d);
  const lo=-1.12,hi=0.82;
  function svg(st){
    const W=RD.width($('rd-gqP')),Ht=210,pl=40,pr=6,pt=10,pb=22,iw=W-pl-pr,ih=Ht-pt-pb,cw=iw/n;
    const y=v=>pt+(hi-v)/(hi-lo)*ih;let s='';
    for(let k=-4;k<=3;k++){const t=k*G.step;s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="'+(k===0?'var(--mute)':'var(--c4)')+'" stroke-opacity="'+(k===0?1:.45)+'"/>'+RD.t(pl-4,y(t)+4,f(t),{a:'end',fs:10.5,fill:'var(--mute)'})}
    const S=R.states[st];
    for(let j=0;j<n;j++){const cx=pl+cw*j+cw/2,bw=Math.min(34,cw*0.36),done=j<st,orig=G.w[j],cur=S.cur[j];
      // original value: grey outline
      s+='<rect x="'+(cx-bw/2-6).toFixed(1)+'" y="'+Math.min(y(0),y(orig)).toFixed(1)+'" width="'+(bw+12).toFixed(1)+'" height="'+Math.abs(y(orig)-y(0)).toFixed(1)+'" fill="none" stroke="var(--mute)" stroke-dasharray="3 2"/>';
      // current value (after compensation so far)
      if(!done)s+='<rect x="'+(cx-bw/2).toFixed(1)+'" y="'+Math.min(y(0),y(cur)).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.abs(y(cur)-y(0)).toFixed(1)+'" fill="var(--c1)"/>';
      else{const qv=R.Q[j];s+='<rect x="'+(cx-bw/2).toFixed(1)+'" y="'+Math.min(y(0),y(qv)).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.abs(y(qv)-y(0)).toFixed(1)+'" fill="var(--c3)"/>'}
      // the column just quantised and the shift it pushed into the later columns
      if(st>0&&j>=st&&Math.abs(S.moved[j])>1e-4){const y0=y(cur-S.moved[j]),y1=y(cur);s+='<line x1="'+(cx+bw/2+9)+'" x2="'+(cx+bw/2+9)+'" y1="'+y0.toFixed(1)+'" y2="'+y1.toFixed(1)+'" stroke="var(--acc)" stroke-width="2"/><path d="M'+(cx+bw/2+5)+','+(y1+(y1>y0?-5:5)).toFixed(1)+' L'+(cx+bw/2+9)+','+y1.toFixed(1)+' L'+(cx+bw/2+13)+','+(y1+(y1>y0?-5:5)).toFixed(1)+'" fill="none" stroke="var(--acc)" stroke-width="2"/>'}
      if(st===n){const r=R.rtn[j];s+='<line x1="'+(cx-bw/2-8)+'" x2="'+(cx+bw/2+8)+'" y1="'+y(r)+'" y2="'+y(r)+'" stroke="var(--bad)" stroke-width="2.5"/>'}
      s+=RD.t(cx,Ht-6,'w'+(j+1)+' '+(done?f(R.Q[j]):f(cur,3)),{a:'middle',fs:11,w:done?600:400})}
    return RD.svg(W,Ht,s,'Four weights, the grid, and the values GPTQ stores')}
  function cap(i){
    if(i===0)return ['Four weights, a grid with step '+G.step,'One output row of four weights (dashed outlines) and six calibration inputs in which input channels 1 and 2 rise and fall together. Round-to-nearest would store '+R.rtn.map(x=>f(x)).join(', ')+'.'];
    const j=i-1,S=R.states[i],nx=R.states[j].cur[j];
    let t='Quantise w'+(j+1)+': '+f(nx,3)+' → '+f(R.Q[j])+', an error of '+f(nx-R.Q[j],3)+'.';
    if(j<n-1){const k=S.moved.findIndex((m,x)=>x>j&&Math.abs(m)===Math.max(...S.moved.slice(j+1).map(Math.abs)));
      t+=' GPTQ moves the columns not yet quantised to cancel it, weighted by the inverse Hessian (arrows); the largest move is w'+(k+1)+' by '+f(S.moved[k],3)+(j===0?', because input channel 2 carries almost the same signal as channel 1':'')+'.'}
    if(j===1)t+=' w2 now rounds to '+f(R.Q[1])+', where round-to-nearest gives '+f(R.rtn[1])+'.';
    if(j===n-1)t+=' Orange ticks: what round-to-nearest stores.';
    return ['Column '+(j+1)+' of '+n,t]}
  function draw(i){
    $('rd-gqP').innerHTML=svg(i);const c=cap(i);$('rd-gqT').textContent=(i+1)+' of '+(n+1)+' · '+c[0];$('rd-gqC2').textContent=c[1];
    const end=i===n;
    $('rd-gqN').innerHTML=RD.stat('Stored so far',R.Q.slice(0,i).map(x=>f(x)).join(', ')||'none','')+
      RD.stat('Weight error',end?(100*R.wGPTQ).toFixed(1)+'%':'?','round-to-nearest '+(100*R.wRTN).toFixed(1)+'%')+
      RD.stat('Output error on the calibration inputs',end?(100*R.outGPTQ).toFixed(1)+'%':'?','round-to-nearest '+(100*R.outRTN).toFixed(1)+'%')}
  const A=RD.anim({card:'rd-gq',ctl:'rd-gqC',n:n+1,draw,ms:2600,label:'Step'});
  RD.onResize(()=>A.redraw());
})();
