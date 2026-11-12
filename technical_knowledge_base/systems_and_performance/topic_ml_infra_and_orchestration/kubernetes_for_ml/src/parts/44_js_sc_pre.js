// ---- Scene: priority and preemption (section 6). Data: window.KM.preempt.tl (pod timeline of run e5a: created, start, end, disrupted).
// Each pod asks for a whole worker's 4 fake GPUs. Step k shows the cluster at the recorded time T[k]; the queue is behind the workers. ----
(function(){
  if(!document.getElementById('stg-pre')||!window.KMG||!window.KM)return;const {mix,lerp}=S3,G=KMG,TL=KM.preempt.tl.pods;
  const T=[1.2,6.5,12.65,15.3],QX={'km-high-nopreempt':-1.5,'km-high':1.7},ZQ=-2.3;
  const PR={'km-low-1':'100','km-low-2':'100','km-low-3':'100','km-high':'1000','km-high-nopreempt':'1000, Never'};
  const byName={};TL.forEach(p=>byName[p.pod]=p);
  window.KM_PRE={T,tl:byName};
  const on=(p,t)=>p.start!=null&&p.start<=t&&(p.end==null||p.end>t),queued=(p,t)=>p.created<=t&&!(p.start!=null&&p.start<=t);
  function draw(R,k,e){const P=R.P,t=T[k],t0=k?T[k-1]:t,low=P.c1,high=P.c4;
    R.grid(-4.4,4.4,-3.2,1.4,.5);
    G.WX.forEach((x,i)=>{G.worker(R,[x,0,0]);R.label([x,0,.55],G.NAMES[i],{fs:12.5,dy:14,b:1})});
    R.label([-3.6,0,ZQ],'queue',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'side'});
    TL.forEach(p=>{const hi=/high/.test(p.pod),c=hi?high:low,nm=p.pod.replace('km-','').replace('high-nopreempt','nopreempt');
      if(on(p,t)){const w=G.WN[p.node],tgt=G.podAt([G.WX[w],0,0],0,4);let pos=tgt;
        if(!on(p,t0)){const q=[QX[p.pod]||0,0,ZQ];pos=[lerp(q[0],tgt[0],e),lerp(0,tgt[1],e)+Math.sin(Math.PI*e)*.7,lerp(ZQ,tgt[2],e)];if(e<1)R.flowArc(q,tgt,.7,{c,a:1-e*.5,r:.08,speed:1.6})}
        const dis=p.disrupted!=null&&p.disrupted<=t;
        G.pod(R,pos,4,{c:dis?mix(c,P.bad,.6):c,a:dis?.75:1});
        R.label([pos[0],pos[1]+.34,pos[2]],nm+' · '+PR[p.pod]+(dis?' · DisruptionTarget':''),{mono:true,fs:12,dy:-9,c:dis?P.bad:P.ink,b:hi})}
      else if(queued(p,t)){const q=[QX[p.pod],0,ZQ];G.pod(R,q,4,{c,a:queued(p,t0)?1:e});
        R.label([q[0],.34,ZQ],nm+' · '+PR[p.pod],{mono:true,fs:12,dy:-9,b:1,a:Math.max(.4,queued(p,t0)?1:e)});
        // the preemptor's nomination: it waits for the victim to leave
        if(p.pod==='km-high'&&TL.some(v=>v.disrupted!=null&&v.disrupted<=t)){const tgt=G.podAt([G.WX[G.WN[p.node]],0,0],0,4);
          R.arc([q[0],.34,ZQ],[tgt[0],tgt[1]+.34,tgt[2]],.8,{c:P.bad,w:1.8,t:e,a:.9});R.flowArc([q[0],.34,ZQ],[tgt[0],tgt[1]+.34,tgt[2]],.8,{c:P.bad,a:e,r:.07,speed:1.4})}}
      else if(p.end!=null&&p.end<=t&&p.end>t0){const tgt=G.podAt([G.WX[G.WN[p.node]],0,0],0,4);G.pod(R,tgt,4,{c:mix(c,P.bad,.6),a:1-e})}});
    R.label([0,0,-3.9],'t = '+t.toFixed(1)+' s',{mono:true,fs:13,b:1,c:P.acc,a:Math.max(.3,e)});
  }
  const st=S3.stage({id:'stg-pre',list:'sx-pre',fig:'Priority and preemption · run e5a, recorded',cam:[.22,.84],bounds:[[-3.6,0,-4.0],[3.6,1.2,.9]],aspect:.56,dur:1600,hold:4600,draw,
    margin:w=>w<520?[18,10,16,10]:[24,18,20,70]});
  (window.KMSTG=window.KMSTG||{})['stg-pre']=st;
})();
