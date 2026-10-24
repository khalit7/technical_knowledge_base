// ---- Reading figures: the hero ladder (top), goodput bars (section 5), alert timeline (section 7),
// fragmentation diagram (section 8), cost per useful hour and per token with one slider (section 10).
// Static figures redraw at the measured width; nothing moves by itself. Numbers come from window.OC and OCP. ----
(function(){
  const $=id=>document.getElementById(id),D=window.OC;if(!D||!$('t-read'))return;
  const T=RD.t,f0=(x,d)=>(+x).toLocaleString('en-US',{maximumFractionDigits:d||0,minimumFractionDigits:d||0});
  const rect=(x,y,w,h,fill,o)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+h+'" rx="'+((o&&o.rx)||2)+'" fill="'+fill+'"'+(o&&o.stroke?' stroke="'+o.stroke+'"':'')+(o&&o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o&&o.op!=null?' opacity="'+o.op+'"':'')+'/>';
  const draws=[];const reg=f=>{draws.push(f);f()};
  RD.onRender(()=>draws.forEach(f=>f()));RD.onResize(()=>draws.forEach(f=>f()));

  // ---- hero: one GPU-hour, seven meters ----
  const rungs=[
    ['Paid: every GPU-hour of capacity','the bill','$ per GPU-hour, owned or rented','c4',1],
    ['Allocated to a job','scheduler: sacct, Kueue','Meta RSC: 83%, 85% allocated','c4',.86],
    ['A kernel running','GPU util (DCGM 203, nvidia-smi)','Acme: median 97%, 99%','c1',.82],
    ['SMs with a resident warp','SM active (DCGM 1002)','Acme: median about 40%','c1',.44],
    ['Tensor pipes busy','tensor active (DCGM 1004)','the counter closest to MFU','c1',.4],
    ['Model FLOPs at the dense peak','MFU, from the step log','Llama 3 405B: 38 to 43%','c3',.38],
    ['Kept in a checkpoint','MFU x runtime goodput','planner default: 40% x 85.5% = 34%','c3',.34]];
  reg(function(){const el=$('oc-hero-svg');if(!el)return;const W=RD.width(el),nar=W<620;
    const lw=nar?0:232,rw=nar?0:206,bw=W-lw-rw-(nar?0:16),rh=nar?52:30;let s='';
    rungs.forEach((r,i)=>{const y=i*rh+4,x0=lw+(nar?0:8),c='var(--'+r[3]+')';
      if(nar){s+=T(0,y+11,(i+1)+'. '+r[0],{fs:12,w:600,fill:c});
        s+=rect(0,y+16,bw*r[4],12,c,{op:.28})+rect(0,y+16,bw*r[4],12,'none',{stroke:c});
        s+=T(0,y+42,r[1]+'; '+r[2],{fs:11,fill:'var(--mute)'})}
      else{s+=T(lw-4,y+12,(i+1)+'. '+r[0],{a:'end',fs:12,w:600,fill:c})+T(lw-4,y+25,r[1],{a:'end',fs:11,fill:'var(--mute)'});
        s+=rect(x0,y+3,bw*r[4],18,c,{op:.28})+rect(x0,y+3,bw*r[4],18,'none',{stroke:c});
        s+=T(x0+bw+8,y+16,r[2],{fs:11.5})}});
    el.innerHTML=RD.svg(W,rungs.length*rh+6,s,'One GPU-hour read by seven meters, each usually at most the one above it')});

  // ---- goodput: allocated seconds split by what became of them ----
  reg(function(){const el=$('oc-gp-svg');if(!el)return;const W=RD.width(el),nar=W<560,G=D.gp;
    const parts=[['startup_s','start-up','var(--dim)'],['saved_s','progress kept','var(--good)'],['wasted_s','progress lost','var(--bad)'],['after_s','after the last step (the hang)','var(--c5)']];
    const mx=Math.max(...G.map(g=>g.alloc_s)),lw=nar?0:168,bw=W-lw-8,sc=bw/mx;let s='',y=4;
    G.forEach(g=>{const lab=(g.run==='oc-base'?'healthy, 400 steps':'hung at step '+g.last_step)+': '+f0(g.rg*100)+'%';
      if(nar){s+=T(0,y+11,lab,{fs:12,w:600});y+=16}else s+=T(lw-6,y+15,lab,{a:'end',fs:12,w:600});
      let x=lw;parts.forEach(p=>{const w=(g[p[0]]||0)*sc;s+=rect(x,y,w,20,p[2],{rx:1});if(w>34)s+=T(x+w/2,y+14,f0(g[p[0]],0)+' s',{a:'middle',fs:11,fill:'var(--bg)',w:600});x+=w});
      y+=30});
    let lx=0;parts.forEach(p=>{const t=p[1];s+=rect(lx,y+2,10,10,p[2])+T(lx+14,y+11,t,{fs:11});lx+=24+t.length*6.2;if(lx>W-90&&nar){lx=0;y+=16}});
    el.innerHTML=RD.svg(W,y+18,s,'Allocated seconds of two runs split into start-up, kept, lost and after the last step')});

  // ---- alert timeline: seconds after the event ----
  const S={};D.scen.forEach(x=>S[x.id]=x);
  const fire=(x,n)=>{const a=x.alerts.find(a=>a[0]===n&&a[2]==='firing');return a?a[3]:null};
  const mk=(x,re)=>x.marks.find(m=>re.test(m[2]))[0];
  const hz=mk(S.hang,/sigstop/),tz=mk(S.slow,/throttle/);
  const rows=[['Hang: rank 3 frozen',[[fire(S.hang,'TrainingStalled')-hz,'TrainingStalled','var(--acc)'],[fire(S.hang,'GpusHeldNoProgress')-hz,'GpusHeldNoProgress','var(--acc)'],[mk(S.hang,/terminal/)-hz,'job ended (45 s timeout)','var(--bad)']],'NCCL default 600 s, gloo 1,800 s'],
    ['Slow node: pod capped',[[fire(S.slow,'TrainingSlowdown')-tz,'TrainingSlowdown','var(--acc)'],[mk(S.slow,/rule-fixed/)-tz,'rule fixed','var(--mute)'],[fire(S.slow,'PodThrottled')-tz,'PodThrottled','var(--c4)']],'no default ever fires']];
  reg(function(){const el=$('oc-al-svg');if(!el)return;const W=RD.width(el),nar=W<560,L=nar?6:150,R=nar?10:16,xm=90,xs=v=>L+v/xm*(W-L-R);let s='',y=4;
    const rowH=nar?96:80,yEnd=4+rows.length*rowH+(nar?16:0);
    for(let v=0;v<=xm;v+=nar?30:15)s+='<line x1="'+xs(v)+'" x2="'+xs(v)+'" y1="4" y2="'+yEnd+'" stroke="var(--line)"/>';
    rows.forEach(r=>{let y0=y;if(nar){s+=T(0,y+11,r[0],{fs:12,w:600});y0+=16}
      const ax=y0+3*14+8;if(!nar)s+=T(L-12,ax+4,r[0],{a:'end',fs:12,w:600});
      s+=rect(xs(0),ax-1.5,xs(xm)-xs(0),3,'var(--line)')+'<circle cx="'+xs(0)+'" cy="'+ax+'" r="4" fill="var(--ink)"/>';
      r[1].forEach((e,k)=>{const x=xs(e[0]),ly=y0+11+k*14,lab=e[1]+' '+f0(e[0])+' s',right=x>W*0.62;
        s+='<line x1="'+x+'" x2="'+x+'" y1="'+(ly+3)+'" y2="'+(ax+7)+'" stroke="'+e[2]+'" stroke-width="2"/>';
        s+=T(right?x-4:x+4,ly,lab,{a:right?'end':'start',fs:11,fill:e[2]})});
      s+=T(W-R,ax+20,'off the chart: '+r[2],{a:'end',fs:11,fill:'var(--mute)'});y+=rowH});
    for(let v=0;v<=xm;v+=nar?30:15)s+=T(xs(v),yEnd+12,v+' s',{a:v===0?'start':v===xm?'end':'middle',fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,yEnd+18,s,'Seconds from the event to each alert, against the default timeouts')});

  // ---- fragmentation: Kueue quota bars and Slurm GPU slots ----
  reg(function(){const el=$('oc-fr-svg');if(!el)return;const W=RD.width(el),nar=W<620,pw=nar?W:(W-24)/2;let s='';
    // Kueue: used by the admitted job, requested by the next one
    const q=[['GPUs',4,12,4,'4 of 12'],['CPUs',2,4,2,'2 of 4'],['memory (MiB)',1800,3072,1800,'1,800 of 3,072']];
    s+=T(0,13,nar?'Kueue: the next job (dashed) misses on memory':'Kueue: the next job (dashed) fits GPUs and CPUs, not memory',{fs:12,w:600});
    const kx=nar?0:0,lw=92,bw=pw-lw-6;q.forEach((r,i)=>{const y=24+i*30,sc=bw/Math.max(r[2],r[1]+r[3]),over=r[1]+r[3]>r[2];
      s+=T(kx,y+13,r[0],{fs:11.5})+rect(kx+lw,y,r[2]*sc,18,'var(--soft)',{stroke:'var(--line)'})+rect(kx+lw,y,r[1]*sc,18,'var(--c1)',{op:.4});
      s+=rect(kx+lw+r[1]*sc,y+2,r[3]*sc,14,'none',{stroke:over?'var(--bad)':'var(--good)',dash:'4 3'});
      if(over)s+='<line x1="'+(kx+lw+r[2]*sc).toFixed(1)+'" x2="'+(kx+lw+r[2]*sc).toFixed(1)+'" y1="'+(y-3)+'" y2="'+(y+21)+'" stroke="var(--bad)" stroke-width="2"/>';
      s+=T(kx+lw+4,y+13,r[4]+' used',{fs:11,fill:'var(--ink)',w:600});
      if(over)s+=T(kx+lw+bw,y+30,'528 Mi short',{a:'end',fs:11,fill:'var(--bad)',w:600})});
    // Slurm: 3 nodes x 4 GPUs
    const ox=nar?0:pw+24,oy=nar?130:0,nodes=[['A','A','',''],['A','A','',''],['B','B','B','B']],cw=Math.min(34,(pw-70)/4);
    s+=T(ox,oy+13,'Slurm: 4 GPUs free, none on one node',{fs:12,w:600});
    nodes.forEach((n,i)=>{const y=oy+24+i*(cw+8);s+=T(ox,y+cw/2+4,'node '+(i+1),{fs:11.5});
      n.forEach((g,k)=>{const x=ox+52+k*(cw+4);s+=rect(x,y,cw,cw,g?(g==='A'?'var(--c1)':'var(--c4)'):'var(--soft)',{stroke:g?'none':'var(--good)',op:g?.75:1});
        s+=T(x+cw/2,y+cw/2+4,g||'free',{a:'middle',fs:11,fill:g?'var(--bg)':'var(--good)',w:600})})});
    const yb=oy+24+3*(cw+8);s+=T(ox,yb+12,'A: 2-node job, B: 1-node job; job C wants 4 on one node',{fs:11,fill:'var(--mute)'});
    s+=T(ox,yb+28,'C waits 66 s (reason Resources); 8 of 12 allocated = 67%',{fs:11,fill:'var(--bad)',w:600});
    el.innerHTML=RD.svg(W,Math.max(nar?yb+36:Math.max(120,yb+36),130),s,'Two kinds of fragmentation measured on Kueue and Slurm')});

  // ---- cost per useful GPU-hour against the busy share, and per token ----
  if(!window.OCP||!D.buy)return;
  const o=OCP.own(D.buy),pr=D.prices,pick=(p,k)=>pr.find(x=>x.provider===p&&x.gpu==='H100'&&x.kind.indexOf(k)===0);
  const cb=pick('AWS','reserved').usd,od=pick('AWS','on-demand').usd,sp=pick('Azure','spot').usd;
  const m=OCP.MODELS.l405,k={params:m[1],tokens_t:15.6,gpu:'h100',mfu:.4,price:cb,rate_k:+OCP.LLAMA_RATE.toFixed(3),stall_s:60,restart_min:10,idle:0};
  const n=OCP.gpusFor(90,k),run=OCP.runYD(k,n),tph=15.6e12/run.paid_h;
  window.OCC={own_h:o.per_hour,tph:tph,cb:cb,od:od,sp:sp};
  const L=[['owned',u=>o.per_hour/u,'var(--c3)','owned'],['reserved (Capacity Block)',u=>cb/u,'var(--c1)','reserved'],['on demand',()=>od,'var(--c2)','on demand'],['spot, before evictions',()=>sp,'var(--c4)','spot']];
  const uEl=$('oc-co-u');
  reg(function(){const el=$('oc-co-svg');if(!el)return;const u=(+uEl.value||70)/100,W=RD.width(el),nar=W<560,H=nar?220:240,Lm=40,R=nar?10:112,Tm=8,B=34,ymax=20;
    const xs=v=>Lm+(v-.1)/.9*(W-Lm-R),ys=v=>Tm+(1-Math.min(v,ymax)/ymax)*(H-Tm-B);let s='';
    for(let v=0;v<=ymax;v+=5)s+='<line x1="'+Lm+'" x2="'+(W-R)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="var(--line)"/>'+T(Lm-4,ys(v)+4,'$'+v,{a:'end',fs:11,fill:'var(--mute)'});
    [.1,.25,.5,.75,1].forEach(v=>{s+=T(xs(v),H-B+15,Math.round(v*100)+'%',{a:v>=1?'end':v<=.1?'start':'middle',fs:11,fill:'var(--mute)'})});
    s+=T((Lm+W-R)/2,H-3,'share of paid hours doing useful work',{a:'middle',fs:11,fill:'var(--mute)'});
    s+='<defs><clipPath id="oc-co-clip"><rect x="'+Lm+'" y="'+Tm+'" width="'+(W-Lm-R)+'" height="'+(H-Tm-B)+'"/></clipPath></defs>';
    L.forEach(l=>{let p='';for(let i=0;i<=60;i++){const v=.1+.9*i/60;p+=(i?'L':'M')+xs(v).toFixed(1)+' '+ys(l[1](v)).toFixed(1)}
      s+='<path d="'+p+'" fill="none" stroke="'+l[2]+'" stroke-width="2" clip-path="url(#oc-co-clip)"/>';
});
    if(!nar){const ls=L.map(l=>({l,y:ys(l[1](1))+4})).sort((a,b)=>a.y-b.y);for(let i=1;i<ls.length;i++)ls[i].y=Math.max(ls[i].y,ls[i-1].y+13);
      ls.forEach(q=>{s+=T(W-R+6,q.y,q.l[3]+' $'+q.l[1](1).toFixed(2),{fs:11,fill:q.l[2]})})}
    s+='<line x1="'+xs(u)+'" x2="'+xs(u)+'" y1="'+Tm+'" y2="'+(H-B)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    L.forEach(l=>{s+='<circle cx="'+xs(u)+'" cy="'+ys(l[1](u))+'" r="3.5" fill="'+l[2]+'"/>'});
    el.innerHTML=RD.svg(W,H,s,'Cost per useful GPU-hour against the busy share');
    $('oc-co-uv').textContent=Math.round(u*100)+'%';
    $('oc-co-out').innerHTML=L.map(l=>RD.stat('<span style="color:'+l[2]+'">'+l[0]+'</span>','$'+l[1](u).toFixed(2)+' / useful h','$'+(l[1](u)/tph*1e6).toFixed(2)+' per million training tokens')).join('')});
  uEl.addEventListener('input',()=>draws[draws.length-1]());
})();
