// ---- Reading section 6: the tile loop with 1 to 4 shared-memory stages, animated on one timeline drawn to scale ----
(function(){
  const M=window.MHM,f=MC.fmtN,L=479,C=200,N=8;
  let S=1,r=M.pipeline(S,L,C,N);
  const scale=M.pipeline(1,L,C,N).total;// every mode drawn on the synchronous loop's time axis
  const el=document.getElementById('rd-psvg'),cnt=document.getElementById('rd-pcnt'),cap=document.getElementById('rd-pcap');
  const COL=['var(--c1)','var(--c3)','var(--c4)','var(--c5)'];
  function draw(i){
    // step i shows the timeline up to the end of tile i-1's math (step 0: nothing yet)
    const t=i===0?0:r.ce[i-1];
    const W=RD.width(el),Lm=W<500?62:84,R=10,lanes=Math.max(1,S),rh=W<500?13:16,gap=4;
    const top=16,copyH=lanes*(rh+gap),H=top+copyH+rh+gap+34;
    const X=v=>Lm+v/scale*(W-Lm-R);let s='';
    s+=RD.t(Lm-6,top+copyH/2+4,'copies',{a:'end',fs:11,fill:'var(--mute)'});
    s+=RD.t(Lm-6,top+copyH+rh-3,'SM math',{a:'end',fs:11,fill:'var(--mute)'});
    s+='<rect x="'+Lm+'" y="'+(top+copyH)+'" width="'+(W-Lm-R)+'" height="'+rh+'" style="fill:var(--soft)"/>';
    for(let k=0;k<N;k++){
      if(r.issue[k]>t)continue;
      const y=top+(k%lanes)*(rh+gap),x0=X(r.issue[k]),x1=X(Math.min(t,r.land[k]));
      s+='<rect x="'+x0.toFixed(1)+'" y="'+y+'" width="'+Math.max(1,x1-x0).toFixed(1)+'" height="'+rh+'" rx="2" style="fill:'+COL[k%4]+';opacity:.35;stroke:'+COL[k%4]+'"/>';
      if(x1-x0>18)s+=RD.t(x0+4,y+rh-4,'tile '+k,{fs:10});
      if(r.cs[k]<t){const a=X(r.cs[k]),b=X(Math.min(t,r.ce[k]));s+='<rect x="'+a.toFixed(1)+'" y="'+(top+copyH)+'" width="'+Math.max(1,b-a).toFixed(1)+'" height="'+rh+'" style="fill:'+COL[k%4]+'"/>'}
    }
    const xt=X(t);s+='<line x1="'+xt+'" x2="'+xt+'" y1="'+(top-6)+'" y2="'+(top+copyH+rh+2)+'" style="stroke:var(--bad)"/>';
    // axis
    const ay=top+copyH+rh+gap+8;s+='<line x1="'+Lm+'" x2="'+(W-R)+'" y1="'+ay+'" y2="'+ay+'" style="stroke:var(--line)"/>';
    for(let v=0;v<=scale;v+=1000){const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+ay+'" y2="'+(ay+4)+'" style="stroke:var(--mute)"/>'+RD.t(x,ay+15,f(v,0),{a:'middle',fs:10,fill:'var(--mute)'})}
    s+=RD.t(W-R,ay+27,'cycles',{a:'end',fs:10,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Copy and compute timeline');
    const done=i,busy=done*C;
    cnt.innerHTML=RD.stat('Cycles so far',f(t,0),i===N?'finished':'')+RD.stat('Tiles computed',done+' of '+N,'')+RD.stat('SM busy',t?f(100*busy/t,0)+'%':'-','math time / elapsed')+RD.stat('Shared memory',S+' tile buffer'+(S>1?'s':''),'the cost of the stages');
    let tt,p;
    if(i===0){tt=S===1?'Synchronous: load, wait, compute, repeat':S+' stages: up to '+S+' tile copies in flight';
      p=S===1?'Each tile\'s copy starts only after the previous tile\'s math, so every tile pays the full '+L+'-cycle latency.':'Copies for the next tiles start before the current tile is computed, as long as a buffer is free.'}
    else if(i<N){const k=i-1,wait=r.cs[k]-(k?r.ce[k-1]:0);tt='Tile '+k+' computed at cycle '+f(r.ce[k],0);
      p=wait>0?'The SM waited '+f(wait,0)+' cycles for this tile\'s copy to land.':'Its copy had already landed: no waiting.'}
    else{const sync=M.pipeline(1,L,C,N).total;tt=(S===1?'Synchronous: ':S+' stages: ')+f(r.total,0)+' cycles, SM busy '+f(100*r.busy,0)+'%';
      p=S===1?'Try 2, 3 and 4 stages on the same axis.':f(sync/r.total,2)+' times faster than synchronous. The floor is one latency plus all the math: '+f(L+N*C,0)+' cycles.'}
    cap.innerHTML='<div class="t">'+tt+'</div><p>'+p+'</p>';
  }
  const an=RD.anim({card:'rd-pcard',ctl:'rd-pctl',n:N+1,draw:draw,ms:900,label:'Tile'});
  RD.seg(document.getElementById('rd-pseg'),v=>{S=+v;r=M.pipeline(S,L,C,N);an.reset(N+1);an.play()});
  RD.onResize(()=>an.redraw());
})();
