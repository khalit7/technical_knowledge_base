// ---- Reading tab: predict-then-reveal, tables filled from window.OC, the healthy/hung animation, the Prometheus sizing calculator ----
(function(){
  const $=id=>document.getElementById(id),E=RD.esc,D=window.OC;if(!D||!$('t-read'))return;
  const f0=(x,d)=>(+x).toLocaleString('en-US',{maximumFractionDigits:d||0,minimumFractionDigits:d||0});
  document.querySelectorAll('.oc-pr').forEach(pr=>pr.querySelector('.opts').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    pr.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.r==='1');if(x===b&&x.dataset.r!=='1')x.classList.add('wrong')});
    pr.classList.add('done')}));
  // published utilisation studies
  $('oc-rd-util').innerHTML=(D.util_studies||[]).map(u=>'<tr><td><a href="'+u.url+'" target="_blank" rel="noopener noreferrer">'+E(u.who)+'</a></td><td class="small">'+E(u.when)+'; '+E(u.size)+'</td><td class="small">'+E(u.metric)+'</td><td>'+E(u.val)+'</td></tr>').join('');
  // MFU measured
  const M=D.mfu,med=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];
  $('oc-rd-mfu').innerHTML='The ceiling came out at '+M.map(m=>f0(m.ceiling_median/1e9,1)).join(', ')+' GFLOP/s; the model’s step took a median '+f0(med(M.map(m=>m.step_s_median))*1000,1)+' ms for '+f0(M[0].tokens_per_step)+' tokens ('+f0(med(M.map(m=>m.tokens_per_s)))+' tokens/s), so MFU against that ceiling was <b>'+M.map(m=>f0(m.mfu_6N*100,1)+'%').join(', ')+'</b> by the 6N convention and '+M.map(m=>f0(m.mfu_6N_attn*100,1)+'%').join(', ')+' with the attention term.';
  // goodput of the recorded runs
  $('oc-rd-gp').innerHTML=D.gp.map(g=>'<tr><td>'+(g.run==='oc-base'?'healthy, 400 steps':'hung at step '+g.last_step)+'</td><td class="num">'+f0(g.alloc_s)+'</td><td class="num">'+f0(g.startup_s,1)+'</td><td class="num">'+f0(g.saved_s,1)+'</td><td class="num">'+f0(g.wasted_s,1)+'</td><td class="num">'+f0(g.after_s,1)+'</td><td class="num"><b>'+f0(g.rg*100,0)+'%</b></td></tr>').join('');
  // alert latencies from the recording
  const sc={};D.scen.forEach(s=>sc[s.id]=s);
  const firstFire=(s,name)=>{const a=s.alerts.filter(x=>x[0]===name&&x[2]==='firing');return a.length?a[0][3]:null};
  const mk=(s,re)=>s.marks.find(m=>re.test(m[2]))[0];
  const h=sc.hang,sl=sc.slow,hz=mk(h,/sigstop/),tz=mk(sl,/throttle/),hend=mk(h,/terminal/);
  const rows=[['rank 3 frozen (hang)','TrainingStalled',firstFire(h,'TrainingStalled')-hz,'process-group timeout (45 s here; NCCL 10 min, gloo 30 min by default): the job ended '+f0(hend-hz)+' s after the freeze'],
    ['rank 3 frozen (hang)','GpusHeldNoProgress',firstFire(h,'GpusHeldNoProgress')-hz,'none'],
    ['pod capped at 0.2 CPU (slow node)','TrainingSlowdown',firstFire(sl,'TrainingSlowdown')-tz,'none: a slow job never times out'],
    ['pod capped at 0.2 CPU (slow node)','PodThrottled',firstFire(sl,'PodThrottled')-tz,'none (rule fixed '+f0(mk(sl,/rule-fixed/)-tz)+' s after the cap, see Mistakes)']];
  $('oc-rd-al').innerHTML=rows.map(r=>'<tr><td>'+r[0]+'</td><td><code>'+r[1]+'</code></td><td class="num">'+f0(r[2])+'</td><td class="small">'+r[3]+'</td></tr>').join('');
  // Kueue waits
  const kw=D.kueue_events.filter(e=>e[1]==='QuotaReserved').map(e=>(e[2].match(/was (\d+)s/)||[])[1]).filter(Boolean);
  $('oc-rd-kw').textContent=kw.map(x=>x+' s').join(', ')+' (Kueue events)';
  // chargeback
  const PR=5.97;let tot={};
  $('oc-rd-ch').innerHTML=D.sacct.map(j=>{tot[j.acct]=(tot[j.acct]||0)+j.gpu*j.el;return '<tr><td>'+j.id+' '+E(j.name)+'</td><td>'+E(j.user)+' ('+E(j.acct)+')</td><td class="num">'+j.el+'</td><td class="small"><code>billing='+j.billing+',cpu='+j.cpu+',gres/gpu='+j.gpu+'</code></td><td class="num">'+f0(j.gpu*j.el)+'</td><td class="num">'+f0(j.billing*j.el)+'</td></tr>'}).join('');
  $('oc-rd-ch-note').innerHTML='Per account: '+Object.keys(tot).map(a=>a+' '+f0(tot[a])+' GPU-seconds').join(', ')+'. At an AWS Capacity Block’s $'+PR.toFixed(2)+' per GPU-hour (read 2026-10-16) a real 4-GPU job of the same length would bill '+Object.keys(tot).map(a=>a+' $'+f0(tot[a]/3600*PR,2)).join(' and ')+'. carol’s 66 s in the queue are not on anyone’s bill: waiting is the cost chargeback does not see. <span class="oc-meas">measured</span> accounting, <span class="oc-der">derived</span> prices.';
  // capacity numbers from the planner (same functions as the tab)
  if(window.OCP&&D.buy){const P=OCP,m=P.MODELS.l405,k={params:m[1],tokens_t:15.6,gpu:'h100',mfu:.4,price:5.97,rate_k:+P.LLAMA_RATE.toFixed(3),stall_s:60,restart_min:10,idle:0};
    const n=P.gpusFor(90,k),r=P.runYD(k,n),fl=P.fleet(n,r.paid_h,1,.5,.85),o=P.own(D.buy);
    const V={gpus:f0(n),goodput:f0(r.goodput*100,1)+'%',busy:f0(fl.demand_h/(fl.gpus*8760)*100,0)+'%',ownh:'$'+o.per_hour.toFixed(2),be:f0(o.per_hour/6.88*100,0)+'%'};
    document.querySelectorAll('.oc-cap-n').forEach(e=>{e.innerHTML='<b>'+V[e.dataset.k]+'</b>'})}
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
      (mode==='hang'?(t<10?'Submitted; Kueue admits it at once and the pods start.':!frozen?'Training normally: all four meters agree with the healthy run.':t<hang.marks[2][0]-10?'Rank 3 is frozen. Meter 1 is still full (all 4 GPUs held), the measured CPU has fallen to almost nothing (gloo waits without spinning), a GPU would still read 100% (NCCL polls), and only meter 3 says the truth: no steps since the freeze (its 30-second rate window takes 30 s to fall to zero, which is why the alert in section 9 uses the time since the last step instead).':'The 45-second process-group timeout fired; the job fails and the GPUs are released.'):
      (t<10?'Submitted and admitted.':a&&a.ended?'The healthy run finished at '+f0(base.marks[1][0]-base.marks[0][0])+' s after submission and released its GPUs; the hung run (grey) is still holding all 4.':'A healthy run: GPUs held, CPU busy, steps advancing. In the hung run the same meters disagree.'));}
  const A=RD.anim({card:'oc-rd-hb',ctl:'oc-rd-hb-ctl',n:N,ms:700,draw,start:13,label:'Seconds after submission'});
  RD.seg($('oc-rd-hb-m'),m=>{mode=m;A.reset(N);A.play()});
  RD.onResize(()=>A.redraw());
})();
