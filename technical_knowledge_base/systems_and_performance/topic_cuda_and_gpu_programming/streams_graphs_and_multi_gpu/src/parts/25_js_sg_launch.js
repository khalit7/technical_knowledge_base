// ---- Launch overhead with and without a CUDA graph: 20 kernels, values fitted to NVIDIA's 2019 post ----
window.SGL=(function(){
  // returns events [lane, start, end, label] in microseconds for n kernels
  function model(mode,B){const n=B.n,K=B.kernel,L=B.launch_cpu,Sy=B.sync_cost,G=B.graph_gap,ev=[];let t=0;
    if(mode==='sync'){for(let k=0;k<n;k++){ev.push(['cpu',t,t+L,'launch']);ev.push(['gpu',t+L,t+L+K,'k'+(k+1)]);ev.push(['wait',t+L,t+L+K+Sy,'wait']);t=t+L+K+Sy}}
    else if(mode==='stream'){let g=0;for(let k=0;k<n;k++){ev.push(['cpu',k*L,(k+1)*L,'launch']);const s=Math.max((k+1)*L,g);g=s+K;ev.push(['gpu',s,g,'k'+(k+1)])}ev.push(['wait',n*L,g,'wait']);t=g}
    else{ev.push(['cpu',0,L,'graph launch']);let g=L;for(let k=0;k<n;k++){const s=g+(k?G:0);g=s+K;ev.push(['gpu',s,g,'k'+(k+1)])}ev.push(['wait',L,g,'wait']);t=g}
    return {ev,total:t};
  }
  // steady state over many steps: what NVIDIA's per-kernel figures measure
  function steady(mode,B){return mode==='sync'?B.launch_cpu+B.kernel+B.sync_cost:mode==='stream'?Math.max(B.launch_cpu,B.kernel):B.kernel+B.graph_gap}
  return {model,steady};
})();
(function(){
  const $=id=>document.getElementById(id);if(!$('sg-ln-card'))return;const B=SG.blog;
  let mode='sync',res=null,an=null;
  const tmax=Math.max(...['sync','stream','graph'].map(m=>SGL.model(m,B).total))*1.02;
  const kEnds=()=>res.ev.filter(e=>e[0]==='gpu').map(e=>e[2]);
  function draw(i){const el=$('sg-ln-fig');const ends=kEnds(),t=i===0?0:ends[i-1];
    const ev=res.ev.map(e=>{const vis=e[1]<t||(i===0&&false);const col=e[0]==='cpu'?'var(--c4)':e[0]==='gpu'?'var(--c1)':'var(--dim)';
      return [e[0]==='wait'?'cpu':e[0],e[1],Math.min(e[2],Math.max(t,e[1])),'',col,!(e[1]<t)]});
    const evAll=res.ev.map(e=>[e[0]==='wait'?'cpu':e[0],e[1],e[2],'',e[0]==='cpu'?'var(--c4)':e[0]==='gpu'?'var(--c1)':'var(--dim)',true]);
    SGT.lanes({el,lanes:[['cpu','CPU thread'],['gpu','GPU']],ev:evAll.concat(ev.filter(e=>!e[5])),tmax,unit:'µs',lw:84,marks:i?[[t,t.toFixed(1)+' µs']]:[],label:'launch timeline'});
    const busy=res.ev.filter(e=>e[0]==='gpu'&&e[2]<=t+1e-9).length*B.kernel;
    const txt={sync:['Launch, then wait, every kernel','The CPU spends '+B.launch_cpu+' µs launching, then sleeps until the kernel ('+B.kernel+' µs) is done and it has woken up (about '+B.sync_cost+' µs). The GPU works less than a third of the time.'],
      stream:['Launch all 20, wait once','The CPU queues kernels back to back. Each launch ('+B.launch_cpu+' µs) takes longer than each kernel ('+B.kernel+' µs), so the GPU still waits for the CPU before every kernel: launch-bound.'],
      graph:['One graph launch for all 20','One call submits the whole sequence; the GPU runs the kernels with about '+B.graph_gap+' µs between them, and the CPU is free after the first few microseconds.']}[mode];
    $('sg-ln-capt').innerHTML='<div class="t">'+(i===0?'Start':'Kernel '+i+' of '+B.n+' done')+': '+txt[0]+'</div><p>'+txt[1]+'</p>';
    $('sg-ln-cnt').innerHTML=RD.stat('Elapsed',t.toFixed(1)+' µs','')+RD.stat('GPU busy',t?(100*busy/t).toFixed(0)+'%':'0%',busy.toFixed(1)+' µs of kernels')+
      RD.stat('Per kernel, steady state',SGL.steady(mode,B).toFixed(1)+' µs','this step alone '+(res.total/B.n).toFixed(1)+'; NVIDIA measured '+B[{sync:'sync_each',stream:'stream',graph:'graph'}[mode]]+' µs');
  }
  res=SGL.model(mode,B);
  an=RD.anim({card:'sg-ln-card',ctl:'sg-ln-ctl',n:B.n+1,ms:420,label:'Kernel',draw});
  RD.seg($('sg-ln-seg'),m=>{mode=m;res=SGL.model(mode,B);an.reset(B.n+1);an.play()});
  RD.onResize(()=>an.redraw());
})();
