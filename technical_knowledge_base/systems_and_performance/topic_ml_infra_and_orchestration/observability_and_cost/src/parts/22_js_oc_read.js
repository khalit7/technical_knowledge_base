// ---- Reading tab: predict-then-reveal, the healthy/hung animation (section 1), the Prometheus sizing calculator (section 6) ----
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
  function draw(i){const el=$('oc-rd-hb-svg'),W=RD.width(el),a=vals(mode==='hang'?hang:base,i,mode==='hang'?cpuH:cpuB),b=vals(mode==='hang'?base:hang,i,mode==='hang'?cpuB:cpuH);
    const t=i*ST,frozen=mode==='hang'?t>=hang.marks[1][0]:false;
    const gpuUtil=v=>v&&v.held>0&&v.sps!=null?1:0;
    const rowsM=[['1. Scheduler: GPUs held (of 4)',v=>v&&v.held!=null?v.held/4:0,v=>v&&v.ended?'ended':v&&v.held!=null?f0(v.held)+' of 4':'n/a','measured, Kueue'],
      ['2a. Device, measured: pod CPU (cores, of 0.6)',v=>v&&v.cpu!=null?v.cpu/.6:0,v=>v&&v.ended?'ended':v&&v.cpu!=null?f0(v.cpu,2):'n/a','measured, cAdvisor'],
      ['2b. Device on a GPU: utilisation',v=>gpuUtil(v),v=>gpuUtil(v)?'100%':'0%','derived from the definition'],
      ['3. Training log: steps per second (of 8)',v=>v&&v.sps!=null?v.sps/8:0,v=>v&&v.ended?'ended':v&&v.sps!=null?f0(v.sps,1):'n/a','measured, rank 0 log']];
    const lw=W<520?0:250,bw=W-lw-70,rh=W<520?44:30;let s='';
    rowsM.forEach((r,k)=>{const y=k*rh+(W<520?14:4);s+=RD.t(W<520?0:lw-8,W<520?y-2:y+13,r[0],{a:W<520?'start':'end',fs:11.5});
      const va=Math.min(1,r[1](a)),vb=Math.min(1,r[1](b));
      s+='<rect x="'+lw+'" y="'+y+'" width="'+bw+'" height="10" rx="2" fill="var(--soft)" stroke="var(--line)"/><rect x="'+lw+'" y="'+y+'" width="'+(va*bw).toFixed(1)+'" height="10" rx="2" fill="'+(mode==='hang'?'var(--bad)':'var(--good)')+'"/>';
      s+='<rect x="'+lw+'" y="'+(y+12)+'" width="'+(vb*bw).toFixed(1)+'" height="5" rx="1" fill="var(--mute)" opacity=".6"/>';
      s+=RD.t(lw+bw+6,y+10,r[2](a),{fs:11,w:600})});
    el.innerHTML=RD.svg(W,rowsM.length*rh+(W<520?14:8),s,'Three meters, healthy against hung');
    $('oc-rd-hb-cap').innerHTML='<b>'+Math.round(t)+' s after submission, '+(mode==='hang'?'hung run':'healthy run')+'</b> (thick bar; the thin grey bar is the '+(mode==='hang'?'healthy':'hung')+' run at the same moment). '+
      (mode==='hang'?(t<10?'Submitted; Kueue admits it at once and the pods start.':!frozen?'Training normally: all four meters agree with the healthy run.':t<hang.marks[2][0]-10?'Rank 3 is frozen. Meter 1 is still full (all 4 GPUs held), the measured CPU has fallen to almost nothing (gloo waits without spinning), a GPU would still read 100% (NCCL polls), and only meter 3 says the truth: no steps since the freeze (its 30-second rate window takes 30 s to fall to zero, which is why the alert in section 7 uses the time since the last step instead).':'The 45-second process-group timeout fired; the job fails and the GPUs are released.'):
      (t<10?'Submitted and admitted.':a&&a.ended?'The healthy run finished at '+f0(base.marks[1][0]-base.marks[0][0])+' s after submission and released its GPUs; the hung run (grey) is still holding all 4.':'A healthy run: GPUs held, CPU busy, steps advancing. In the hung run the same meters disagree.'));}
  const A=RD.anim({card:'oc-rd-hb',ctl:'oc-rd-hb-ctl',n:N,ms:700,draw,start:13,label:'Seconds after submission'});
  RD.seg($('oc-rd-hb-m'),m=>{mode=m;A.reset(N)});
  RD.onResize(()=>A.redraw());
})();
