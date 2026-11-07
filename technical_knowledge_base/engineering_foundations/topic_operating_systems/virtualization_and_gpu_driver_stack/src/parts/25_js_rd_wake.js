// ---- Reading s5 (Fig. 5): one cross-CPU wake-up, step by step: this VM (target idle or busy) against bare hardware ----
// The explanation of each step is the ol.sx list on the left (sx-wk-idle, sx-wk-busy, sx-wk-bm); the card draws who acts at each step
// as swimlanes (a step is a block in its lane, an exit a red link down to QEMU), the counters, and the measured one-way totals to scale.
(function(){
  const lanesEl=document.getElementById('wk-lanes');if(!lanesEl)return;
  const V=window.VD,f1=x=>(+x).toFixed(1),f2=x=>(+x).toFixed(2);
  const ex=f2(V.hvf.mmio_med);
  // each step: [kind, short label, lane]; lanes 0 vCPU 1, 1 QEMU, 2 macOS host, 3 vCPU 2 (bare hardware: CPU 1, interrupt controller, -, CPU 2)
  const S={
    idle:[['guest','pipe write',0],['exit','exit 1: send',0],['host','QEMU: GIC',1],['wake','wake thread',2],['host','inject IRQ',1],['exit','exit 2: ack',3],['exit','exit 3: end',3],['guest','B runs',3]],
    busy:[['guest','pipe write',0],['exit','exit 1: send',0],['host','QEMU: GIC',1],['kick','force exit',2],['host','inject IRQ',1],['exit','exit 2: ack',3],['exit','exit 3: end',3],['guest','B runs',3]],
    bm:[['guest','pipe write',0],['hw','IPI sent',1],['hw','wfi ends',3],['hw','ack, end',3],['guest','B runs',3]]};
  const LANES={vm:['vCPU 1 (guest)','QEMU, EL2','macOS host','vCPU 2 (guest)'],bm:['CPU 1','interrupt controller','','CPU 2']};
  const TOT={idle:V.ipi.idle_one_way_med,busy:V.ipi.busy_one_way_med,bm:V.hvf.pipe_one_way_med};
  const NAME={idle:'This VM, target idle',busy:'This VM, target busy',bm:'Bare hardware (macOS)'};
  const COL={guest:'var(--c1)',exit:'var(--bad)',host:'var(--c5)',wake:'var(--c4)',kick:'var(--c4)',hw:'var(--good)'};
  let mode='idle',cur=0;
  function bars(){const mx=Math.max(TOT.idle,TOT.busy,TOT.bm);let h='';
    ['bm','busy','idle'].forEach(k=>{h+='<div class="r'+(k===mode?' on':' off')+'"><span class="lbl">'+NAME[k]+'</span><span><span class="bar" style="display:block;width:'+Math.max(1,TOT[k]/mx*100)+'%;--bc:'+(k==='bm'?'var(--good)':k==='busy'?'var(--c5)':'var(--bad)')+'"></span></span><span class="num">'+f1(TOT[k])+' µs</span></div>'});
    document.getElementById('wk-bars').innerHTML='<div class="small mute">One-way hand-off, measured medians, to scale</div>'+h}
  function lanes(i){const st=S[mode],W=RD.width(lanesEl),nar=W<480,lx=nar?0:112,top=nar?16:4,lh=nar?48:40,rh=nar?30:32,n=st.length,cw=(W-lx-4)/n,L=LANES[mode==='bm'?'bm':'vm'];let b='';
    L.forEach((t,r)=>{const y=top+r*lh;if(!t&&mode==='bm'){b+='<rect x="'+lx+'" y="'+y+'" width="'+(W-lx-2)+'" height="'+rh+'" rx="5" fill="none" stroke="var(--line)" stroke-dasharray="3 4"/>';return}
      b+='<rect x="'+lx+'" y="'+y+'" width="'+(W-lx-2)+'" height="'+rh+'" rx="5" fill="'+(r===1||r===2?'var(--soft)':'var(--bg)')+'" stroke="var(--line)"/>';
      b+=RD.t(nar?lx+4:2,nar?y-4:y+rh/2+4,t,{fs:nar?11:11.5,fill:'var(--mute)'})});
    let prev=null;
    st.forEach((s,k)=>{if(k>i)return;const x=lx+k*cw+2,y=top+s[2]*lh+3,w=cw-4,h=rh-6,on=k===i,c=COL[s[0]];
      if(prev){const px=prev[0],py=prev[1];b+='<path d="M'+px.toFixed(1)+' '+py.toFixed(1)+' L'+(x+2).toFixed(1)+' '+(y+h/2).toFixed(1)+'" stroke="'+(s[0]==='exit'||st[k-1][0]==='exit'?'var(--bad)':'var(--mute)')+'" stroke-width="1.5" fill="none"'+(s[0]==='exit'?'':' stroke-dasharray="3 3"')+'/>'}
      b+='<g'+(on?' class="rd-new"':'')+'><rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="4" fill="'+c+'" fill-opacity="'+(on?.9:.35)+'" stroke="'+(on?'var(--ink)':'none')+'" stroke-width="1.5"/>';
      if(!nar||on)b+=RD.t(x+w/2,y+h/2+4,nar?String(k+1):s[1],{a:'middle',fs:nar?11:Math.min(11.5,Math.max(9.5,cw/7)),fill:'var(--ink)',w:on?600:null});
      b+='</g>';prev=[x+w-2,y+h/2]});
    const H=top+3*lh+rh+4;lanesEl.innerHTML=RD.svg(W,H,b,'Swimlanes: which part of the system acts at each step of the wake-up')}
  function draw(i){cur=i;const st=S[mode],d=st.slice(0,i+1);lanes(i);
    const exits=d.filter(s=>s[0]==='exit').length,wakes=d.filter(s=>s[0]==='wake').length,kicks=d.filter(s=>s[0]==='kick').length;
    document.getElementById('wk-cnt').innerHTML=RD.stat('VM exits',exits,mode==='bm'?'none on hardware':'each about '+ex+' µs')+RD.stat('Host thread wake-ups',wakes+kicks,wakes?'idle vCPU woken':kicks?'running vCPU kicked':'')+RD.stat('One way, measured',i===st.length-1?f1(TOT[mode])+' µs':'...','median of 3 runs');
    bars()}
  const a=RD.anim({card:'wk-card',ctl:'wk-ctl',n:S.idle.length,draw,ms:3600,label:'Wake-up step',list:'sx-wk-idle'});
  RD.seg(document.getElementById('wk-mode'),m=>{mode=m;['idle','busy','bm'].forEach(x=>{document.getElementById('sx-wk-'+x).hidden=x!==m});a.reset(S[m].length,'sx-wk-'+m)});
  RD.onResize(()=>lanes(cur));
})();
