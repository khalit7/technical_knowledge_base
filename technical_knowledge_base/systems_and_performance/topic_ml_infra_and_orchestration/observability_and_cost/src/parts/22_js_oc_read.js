// ---- Reading tab: predict-then-reveal, the healthy/hung animation in explained stretches (section 1), the Prometheus sizing calculator (section 6) ----
(function(){
  const $=id=>document.getElementById(id),E=RD.esc,D=window.OC;if(!D||!$('t-read'))return;
  const f0=(x,d)=>(+x).toLocaleString('en-US',{maximumFractionDigits:d||0,minimumFractionDigits:d||0});
  document.querySelectorAll('.oc-pr').forEach(pr=>pr.querySelector('.opts').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    pr.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.r==='1');if(x===b&&x.dataset.r!=='1')x.classList.add('wrong')});
    pr.classList.add('done')}));
  const sc={};D.scen.forEach(s=>sc[s.id]=s);
  // Prometheus sizing
  function ps(){const g=+$('oc-ps-gpu').value||0,gpn=Math.max(1,+$('oc-ps-gpn').value||1),sg=+$('oc-ps-sg').value||0,sn=+$('oc-ps-sn').value||0,it=Math.max(1,+$('oc-ps-int').value||1),ret=Math.max(1,+$('oc-ps-ret').value||1);
    const nodes=Math.ceil(g/gpn),ser=g*sg+nodes*sn,sps=ser/it,disk=sps*ret*86400;
    $('oc-ps-out').innerHTML=RD.stat('Series',f0(ser),f0(g*sg)+' GPU + '+f0(nodes*sn)+' node and container')+RD.stat('Samples per second',f0(sps))+RD.stat('Disk for '+f0(ret)+' days',f0(disk/1e9,1)+' to '+f0(2*disk/1e9,1)+' GB','at 1 to 2 bytes per sample');
    $('oc-ps-note').textContent='derived: series = GPUs x GPU series + nodes x node series; samples/s = series / interval; disk = retention x samples/s x bytes per sample (Prometheus storage docs). Labels that change per job add series on top.'}
  document.querySelectorAll('#oc-rd-ps input').forEach(e=>e.addEventListener('input',ps));ps();
  // healthy against hung: three meters over the same recorded time
  const base=sc.base,hang=sc.hang,ST=hang.step,N=Math.max(base.n,hang.n);let mode='hang';
  const mean=o=>{const k=Object.keys(o);return i=>{const v=k.map(x=>o[x][i]).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null}};
  const cpuB=mean(base.s.cpu),cpuH=mean(hang.s.cpu),off=(base.marks[0][0]-hang.marks[0][0])/ST;
  function vals(s,i,cpu){const j=Math.round(i+(s===base?off:0));if(j<0)return null;if(j>=s.n)return {ended:1,held:0,cpu:0,sps:null};
    const sps=Object.values(s.s.sps)[0][j],gpu=s.s.kq_gpu[j];return {sps:sps,cpu:cpu(j),held:gpu,run:sps!=null};}
  // the recording is grouped into explained stretches (the long-replay rule, 2026-11-06): one step-list item per stretch, and each stretch
  // plays its 5-second frames during its step (forward steps and autoplay); back, the scrubber and reduced motion jump to the stretch's end
  const S0=hang.marks[0][0],FZ=hang.marks[1][0],END=(N-1)*ST;
  const STR={hang:[[0,S0+5],[S0+5,FZ],[FZ,FZ+35],[FZ+35,hang.marks[2][0]-5],[hang.marks[2][0]-5,END]],
    base:[[0,S0+5],[S0+5,S0+50],[S0+50,base.marks[1][0]-base.marks[0][0]+S0+5],[base.marks[1][0]-base.marks[0][0]+S0+5,END]]};
  window.OC_HB={STR,ST,N,S0};
  function draw(i){const el=$('oc-rd-hb-svg'),W=RD.width(el),a=vals(mode==='hang'?hang:base,i,mode==='hang'?cpuH:cpuB),b=vals(mode==='hang'?base:hang,i,mode==='hang'?cpuB:cpuH);
    const t=i*ST;
    const gpuUtil=v=>v&&v.held>0&&v.sps!=null?1:0;
    const rowsM=[['1. Scheduler: GPUs held (of 4)',v=>v&&v.held!=null?v.held/4:0,v=>v&&v.ended?'ended':v&&v.held!=null?f0(v.held)+' of 4':'n/a'],
      ['2a. Device, measured: pod CPU (cores, of 0.6)',v=>v&&v.cpu!=null?v.cpu/.6:0,v=>v&&v.ended?'ended':v&&v.cpu!=null?f0(v.cpu,2):'n/a'],
      ['2b. Device on a GPU: utilisation',v=>gpuUtil(v),v=>gpuUtil(v)?'100%':'0%'],
      ['3. Training log: steps per second (of 8)',v=>v&&v.sps!=null?v.sps/8:0,v=>v&&v.ended?'ended':v&&v.sps!=null?f0(v.sps,1):'n/a']];
    const nar=W<520,lw=nar?0:250,bw=W-lw-70,rh=nar?44:30,top=22;let s=RD.t(0,13,Math.max(0,Math.round(t-S0))+' s after submission, '+(mode==='hang'?'hung run':'healthy run'),{fs:12,w:600});
    rowsM.forEach((r,k)=>{const y=top+k*rh+(nar?14:4);s+=RD.t(nar?0:lw-8,nar?y-2:y+13,r[0],{a:nar?'start':'end',fs:nar?12:11.5});
      const va=Math.min(1,r[1](a)),vb=Math.min(1,r[1](b));
      s+='<rect x="'+lw+'" y="'+y+'" width="'+bw+'" height="10" rx="2" fill="var(--soft)" stroke="var(--line)"/><rect x="'+lw+'" y="'+y+'" width="'+(va*bw).toFixed(1)+'" height="10" rx="2" fill="'+(mode==='hang'?'var(--bad)':'var(--good)')+'"/>';
      s+='<rect x="'+lw+'" y="'+(y+12)+'" width="'+(vb*bw).toFixed(1)+'" height="5" rx="1" fill="var(--mute)" opacity=".6"/>';
      s+=RD.t(lw+bw+6,y+10,r[2](a),{fs:12,w:600})});
    el.innerHTML=RD.svg(W,top+rowsM.length*rh+(nar?14:8),s,'Three meters, healthy against hung')}
  let raf=0;
  function stretch(k){cancelAnimationFrame(raf);const r=STR[mode][Math.min(k,STR[mode].length-1)],fa=Math.round(r[0]/ST),fb=Math.min(N-1,Math.round(r[1]/ST));
    if(RD.RM||!$('oc-rd-hb').classList.contains('rd-fwd')||fb<=fa){draw(fb);return}
    const t0=performance.now(),dur=(fb-fa)*260;draw(fa);
    const f=now=>{const u=Math.min(1,(now-t0)/dur);draw(Math.round(fa+(fb-fa)*u));if(u<1)raf=requestAnimationFrame(f)};raf=requestAnimationFrame(f)}
  const A=RD.anim({card:'oc-rd-hb',ctl:'oc-rd-hb-ctl',n:STR.hang.length,ms:5200,draw:stretch,list:'sx-hb',label:'Stretch of the recording'});
  RD.seg($('oc-rd-hb-m'),m=>{mode=m;$('sx-hb').hidden=m!=='hang';$('sx-hb-base').hidden=m==='hang';A.reset(STR[m].length,m==='hang'?'sx-hb':'sx-hb-base')});
  RD.onResize(()=>A.redraw());
})();
