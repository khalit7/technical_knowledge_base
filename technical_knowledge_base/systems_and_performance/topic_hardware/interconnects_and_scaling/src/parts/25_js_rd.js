// ---- Reading tab: ladder, half-bandwidth table, all-reduce animation, laptop chart, published table, parallelism widget ----
(function(){
  const D=window.IC,$=id=>document.getElementById(id),esc=RD.esc;
  const fB=b=>b>=1e9?(b/1e9).toFixed(b>=1e10?1:2)+' GB':b>=1e6?(b/1e6).toFixed(b>=1e7?0:1)+' MB':b>=1e3?(b/1e3).toFixed(b>=1e4?0:1)+' KB':Math.round(b)+' B';
  const fT=s=>s>=1?s.toFixed(2)+' s':s>=1e-3?(s*1e3).toFixed(s>=0.1?0:1)+' ms':(s*1e6).toFixed(s>=1e-4?0:1)+' µs';
  const fN=(x,d)=>x.toLocaleString('en-US',{maximumFractionDigits:d||0,minimumFractionDigits:d||0});
  const set=(id,h)=>{const e=$(id);if(e)e.innerHTML=h};

  // ---- ladder ----
  (function(){const mx=Math.log10(D.ladder[0].bw/5);
    $('ic-ladder').innerHTML=D.ladder.map((r,i)=>'<div class="row"><span class="nm">'+esc(r.nm)+'<span class="ml">'+esc(r.sub)+'</span></span><span class="track"><span class="fill" style="width:'+(Math.log10(r.bw/5)/mx*100).toFixed(1)+'%;background:'+(i===0?'var(--c4)':r.bw>=400?'var(--c3)':r.bw>=60?'var(--c5)':'var(--c2)')+'"></span></span><span class="val">'+(r.bw>=1000?fN(r.bw):r.bw)+' GB/s</span></div>').join('')+
      '<div class="small mute">Bars on a log scale.</div>';
    set('ic-g8',(D.ex.grad8/1e9).toFixed(2)+' GB');
  })();

  // ---- half-bandwidth table ----
  (function(){const rows=D.links.filter(l=>l.alpha);const pp={alpha:D.meas.pp_alpha*1e6,beta:D.meas.pp_beta/1e9};
    const tr=(nm,a,b,nh,note)=>'<tr><td>'+esc(nm)+'</td><td class="num">'+(a<10?a.toFixed(2):fN(a,0))+'</td><td class="num">'+(b<10?b.toFixed(1):fN(b,b<100?1:0))+'</td><td class="num">'+fB(nh)+'</td><td class="small">'+note+'</td></tr>';
    $('ic-nhalf').innerHTML='<thead><tr><th>Link</th><th class="num">&alpha;, &micro;s</th><th class="num">&beta;, GB/s each way</th><th class="num">n<sub>&frac12;</sub> = &alpha;&beta;</th><th>&alpha; from</th></tr></thead><tbody>'+
      rows.map(l=>tr(l.nm,l.alpha,l.beta,D.nhalf[l.id],/assumed/.test(l.src)?'assumed (illustrative)':(l.id==='nvl5'?'assumed equal to NVLink 4':'DeepSeek, Table 5'))).join('')+
      tr('This laptop: two processes, Gloo over loopback (measured)',pp.alpha,pp.beta,D.nhalf.laptop_pp,'ping-pong, measured here')+'</tbody>';
  })();

  // ---- all-reduce animation: same buffer, four algorithms ----
  (function(){
    const n=8;let alg='ring',link='nvl4',S=16060522496,run=null;
    const ab=()=>{if(link==='laptop'){const p=D.links.find(l=>l.id==='laptop').per_n['8'];return [p.alpha*1e-6,p.beta*1e9]}const l=D.links.find(x=>x.id===link);return [l.alpha*1e-6,l.beta*1e9]};
    const NM={ring:'Ring',rd:'Recursive doubling',rab:'Halving-doubling',switch:'In-switch'};
    function caption(i){
      if(i===0)return 'Start: every GPU holds its own gradients for all 8 chunks (pale). Goal: every GPU holds the sum of all 8 GPUs’ contributions in every chunk.';
      const K=run.steps;
      if(alg==='ring')return i<=n-1?'Reduce-scatter step '+i+' of '+(n-1)+': each GPU sends one chunk (1/8 of the buffer) to its right neighbour, which adds it to its own copy. After 7 steps each GPU owns one fully summed chunk.':'All-gather step '+(i-n+1)+' of '+(n-1)+': each GPU passes a finished chunk to the right, which overwrites its copy. Nothing is added; the sums just travel.';
      if(alg==='rd')return 'Step '+i+' of '+K+': each GPU swaps its whole buffer with the GPU at distance '+(1<<(i-1))+' and adds. Few steps, but the whole buffer moves every time.';
      if(alg==='rab')return i<=3?'Reduce-scatter by halving, step '+i+': swap half of the chunks still being summed with the GPU at distance '+(8>>i)+', keep and add the other half.':'All-gather by doubling, step '+(i-3)+': swap finished chunks with the GPU at distance '+(1<<(i-4))+'. Same bytes as the ring in 6 steps instead of 14.';
      return i===1?'Every GPU sends its whole buffer up to the NVSwitch, which adds the 8 copies as they arrive (shown in the switch row).':'The switch multicasts the sum back down. In hardware the up and down streams overlap in chunks, so the time is one buffer’s worth plus two latencies.';
    }
    function draw(i){
      const host=$('ic-arsvg'),W=Math.min(860,RD.width(host)),cw=Math.min(64,(W-20)/n),gap=Math.max(4,cw*0.18),cellW=cw-gap,ch=13,top=54,H=top+n*(ch+2)+(alg==='switch'?66:20);
      const x0=(W-n*cw)/2;const sn=run.snaps[i];let s='';
      // arrows for this step
      if(i>0){sn.tr.forEach(([a,b])=>{
        if(b===-1||a===-1){const g=a===-1?b:a,x=x0+g*cw+cellW/2,y1=top+n*(ch+2)+4,y2=y1+22;s+='<line x1="'+x+'" y1="'+(a===-1?y2:y1)+'" x2="'+x+'" y2="'+(a===-1?y1:y2)+'" stroke="var(--acc)" stroke-width="1.6" marker-end="url(#ic-ah)"/>';return}
        const xa=x0+a*cw+cellW/2,xb=x0+b*cw+cellW/2,h=Math.min(40,10+Math.abs(b-a)*6);
        s+='<path d="M'+xa+','+(top-4)+' Q'+((xa+xb)/2)+','+(top-4-h)+' '+xb+','+(top-4)+'" fill="none" stroke="var(--acc)" stroke-width="1.4" opacity=".8" marker-end="url(#ic-ah)"/>';});}
      for(let g=0;g<n;g++){const x=x0+g*cw;s+=RD.t(x+cellW/2,top+n*(ch+2)+(alg==='switch'?62:14),'GPU '+g,{a:'middle',fs:10});
        for(let c=0;c<n;c++){const k=ICSIM.pop(sn.have[g][c]),f=k/n;
          s+='<rect x="'+x+'" y="'+(top+c*(ch+2))+'" width="'+cellW+'" height="'+ch+'" rx="2" fill="var(--c1)" fill-opacity="'+(0.12+0.88*f).toFixed(2)+'"/>';
          if(cellW>26)s+=RD.t(x+cellW/2,top+c*(ch+2)+10,k+'/8',{a:'middle',fs:9,fill:f>0.5?'var(--bg)':'var(--ink)'});}}
      if(alg==='switch'){const y=top+n*(ch+2)+28;s+='<rect x="'+x0+'" y="'+y+'" width="'+(n*cw-gap)+'" height="18" rx="4" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(x0+(n*cw-gap)/2,y+13,'NVSwitch'+(sn.sw?': holds '+ICSIM.pop(sn.sw[0])+'/8 in every chunk':''),{a:'middle',fs:11})}
      host.innerHTML=RD.svg(W,H,'<defs><marker id="ic-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--acc)"/></marker></defs>'+s,'All-reduce of 8 chunks over 8 GPUs, '+NM[alg]+', step '+i);
      set('ic-arcap','<b>'+NM[alg]+'.</b> '+caption(i));
      const [a,b]=ab();const done=i===run.steps;const tt=done?run.time:sn.t;
      set('ic-arcnt',RD.stat('Step',i+' of '+run.steps,'each step costs one latency')+RD.stat('Sent per GPU so far',fB(sn.sent),'of '+fB(run.sent)+' in total')+
        RD.stat('Clock',fT(tt),done&&alg==='switch'?'2α + S/β (overlapped)':'α × steps + bytes / β')+
        RD.stat('Latency share',(100*(alg==='switch'?2*a:run.steps*a)/run.time).toFixed(S<1e6?0:2)+'%','of the final time'));
    }
    let A=null;
    function rebuild(){const [a,b]=ab();run=ICSIM.run('ar',alg,n,S,a,b);if(A)A.reset(run.snaps.length);}
    rebuild();
    A=RD.anim({card:'ic-arcard',ctl:'ic-arctl',n:run.snaps.length,draw,ms:1300,label:'All-reduce step'});
    RD.seg($('ic-aralg'),m=>{alg=m;rebuild()});RD.seg($('ic-arlink'),m=>{link=m;rebuild()});RD.seg($('ic-arsize'),m=>{S=+m;rebuild()});
    RD.onResize(()=>A.redraw());
  })();

  // ---- published table ----
  (function(){
    $('ic-pub').innerHTML='<thead><tr><th>System</th><th class="num">GPUs</th><th class="num">Size</th><th class="num">Model busbw</th><th class="num">Measured</th><th class="num">Measured / model</th><th>Source</th></tr></thead><tbody>'+
      D.pub.map(p=>'<tr><td>'+esc(p.sys)+'</td><td class="num">'+p.n+'</td><td class="num">'+(p.S/2**30)+' GiB</td><td class="num">'+fN(p.model)+' GB/s</td><td class="num">'+p.meas+' GB/s</td><td class="num">'+Math.round(100*p.frac)+'%</td><td class="small"><a href="'+p.src+'" target="_blank" rel="noopener noreferrer">'+esc(p.who)+'</a> <span class="pill '+p.lab+'">'+(p.lab==='i'?'independent':'vendor')+'</span></td></tr>').join('')+'</tbody>';
  })();

  // ---- laptop measurement chart ----
  (function(){let n='8';
    function draw(){const host=$('ic-mchart'),W=Math.min(860,RD.width(host)),H=Math.max(230,Math.min(320,W*0.5)),L=52,R=10,T=10,B=36;
      const M=D.meas,v=M.ns[n],S=M.sizes,x=s=>L+(Math.log10(s)-Math.log10(S[0]))/(Math.log10(S[S.length-1])-Math.log10(S[0]))*(W-L-R);
      const all=[];['ring','rd','gloo'].forEach(k=>{if(v.data[k])v.data[k].hi.forEach(t=>{if(t)all.push(t)})});
      const ymin=Math.min(...v.data.rd.lo.filter(t=>t))*0.7,ymax=Math.max(...all)*1.3,y=t=>T+(Math.log10(ymax)-Math.log10(t))/(Math.log10(ymax)-Math.log10(ymin))*(H-T-B);
      let s='';
      for(let e=-5;e<=0;e++){const t=Math.pow(10,e);if(t<ymin||t>ymax)continue;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)"/>'+RD.t(L-4,y(t)+4,fT(t),{a:'end',fs:10})}
      [4,1024,1048576,16777216].forEach((sz,k)=>{s+=RD.t(x(sz),H-B+14,fB(sz),{a:k===3?'end':k===0?'start':'middle',fs:10})});
      s+=RD.t((L+W-R)/2,H-4,'all-reduce buffer size (log)',{a:'middle',fs:10,fill:'var(--mute)'});
      const col={ring:'var(--c1)',rd:'var(--c2)',gloo:'var(--mute)'};
      ['ring','rd'].forEach(k=>{const pts=v.model[k].map((t,j)=>(k==='ring'&&!v.data.ring.med[j])?null:[x(S[j]),y(t)]).filter(p=>p);s+='<polyline points="'+pts.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="'+col[k]+'" stroke-width="1.5" stroke-dasharray="5 3"/>'});
      ['gloo','ring','rd'].forEach(k=>{const d=v.data[k];if(!d)return;d.med.forEach((t,j)=>{if(!t)return;const X=x(S[j]);s+='<line x1="'+X+'" x2="'+X+'" y1="'+y(d.lo[j])+'" y2="'+y(d.hi[j])+'" stroke="'+col[k]+'"/><circle cx="'+X+'" cy="'+y(t)+'" r="'+(k==='gloo'?2.5:3.4)+'" fill="'+col[k]+'"/>'})});
      if(v.xo_model&&n!=='2'){const X=x(v.xo_model);s+='<line x1="'+X+'" x2="'+X+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--c5)" stroke-dasharray="2 3"/>'+RD.t(X>W-110?X-4:X+4,T+12,'model crossover',{fs:10,fill:'var(--c5)',a:X>W-110?'end':'start'})}
      host.innerHTML=RD.svg(W,H,s,'Measured all-reduce time against size, '+n+' ranks')+
        '<div class="hmleg"><span><svg width="12" height="12"><circle cx="6" cy="6" r="4" fill="var(--c1)"/></svg>ring (measured)</span><span><svg width="12" height="12"><circle cx="6" cy="6" r="4" fill="var(--c2)"/></svg>recursive doubling (measured)</span><span><svg width="12" height="12"><circle cx="6" cy="6" r="3" fill="var(--mute)"/></svg>Gloo built-in</span><span><svg width="18" height="12"><line x1="0" y1="6" x2="18" y2="6" stroke="var(--ink)" stroke-dasharray="5 3"/></svg>alpha-beta model</span></div>';
      const rr=v.resid.ring.filter(r=>r!=null).map(Math.abs);
      set('ic-mnote',n+' ranks: &alpha; = '+fN(v.alpha*1e6)+' &micro;s per step, &beta; = '+(v.beta/1e9).toFixed(2)+' GB/s per rank (total '+(v.agg/1e9).toFixed(1)+' GB/s). Ring within '+Math.round(100*Math.max(...rr))+'% of the model at every size; median miss '+Math.round(100*rr.slice().sort((a,b)=>a-b)[Math.floor(rr.length/2)])+'%.'+(v.xo_model&&n!=='2'?' Model crossover '+fB(v.xo_model)+'; first measured size where the ring wins: '+fB(v.xo_meas)+'.':' With 2 ranks both algorithms send the same bytes, so recursive doubling (1 step against 2) never loses in the model.'));
    }
    RD.seg($('ic-msn'),m=>{n=m;draw()});RD.onRender(draw);RD.onResize(draw);draw();
    const M=D.meas.ns;
    set('ic-mratio',M['8'].step_ratio.toFixed(2)+' times');
    set('ic-mxo',fB(M['4'].xo_model)+' for 4 ranks and '+fB(M['8'].xo_model)+' for 8');
    set('ic-malist',['2','4','8'].map(k=>fN(M[k].alpha*1e6)+' &micro;s').join(', ')+' per step at 2, 4 and 8 ranks');
    set('ic-mblist',['2','4','8'].map(k=>(M[k].beta/1e9).toFixed(2)).join(', ')+' GB/s');
    set('ic-magg',(Math.min(M['4'].agg,M['8'].agg)/1e9).toFixed(1)+' to '+(Math.max(M['4'].agg,M['8'].agg)/1e9).toFixed(1)+' GB/s for 4 and 8 ranks');
    set('ic-corr1',(D.ex.ar8_ib).toFixed(2)+' s and '+(D.ex.ar8_nvl*1e3).toFixed(1)+' ms with 8 GPUs; the old formula gives '+D.ex.old_ib.toFixed(2)+' s and '+(D.ex.old_nvl*1e3).toFixed(0)+' ms');
  })();

  // ---- section 8 and 9 numbers ----
  (function(){const P=D.par;
    set('ic-epP',Math.round(100*P.ep.need_frac_fp8)+'%');
    set('ic-Inv',fN(P.nvl.I));set('ic-Iib',fN(P.ib.I));
    set('ic-dpT',fN(P.nvl.dp_tokens)+' / '+fN(P.ib.dp_tokens));
    set('ic-fsT',fN(P.nvl.fsdp_tokens)+' / '+fN(P.ib.fsdp_tokens));
    set('ic-tpR',Math.round(100*P.tp70.nvl)+'% / '+Math.round(100*P.tp70.ib)+'% of compute');
    set('ic-tpR2',Math.round(100*P.tp70.nvl)+'%');set('ic-tpW',Math.round(100*P.tp70.wait_ib)+'%');
    set('ic-tpS',Math.round(100*P.tp_simple.nvl)+'% and '+Math.round(100*P.tp_simple.ib)+'%');
    set('ic-ppR',(100*P.pp405.ratio).toFixed(2)+'% of compute (400G NIC)');
  })();

  // ---- parallelism widget ----
  (function(){const P=D.par;
    const CH=[['H100 SXM, BF16',989.5],['B200 (HGX), BF16',2250],['GB200 NVL72 GPU, BF16',2500],['MI300X, BF16',1307.4],['RTX 5090, BF16 (FP32 accumulate)',209.5]];
    const LK=[['NVLink 5 (900 GB/s each way)',900],['NVLink 4 (450)',450],['MI300X Infinity Fabric, all 7 links (448)',448],['800 Gb/s NIC (100)',100],['PCIe 5.0 x16 (63)',63],['400 Gb/s NIC (50)',50],['100 Gb/s Ethernet (12.5)',12.5]];
    $('ic-pchip').innerHTML=CH.map((c,i)=>'<option value="'+i+'">'+esc(c[0])+'</option>').join('');
    $('ic-plink').innerHTML=LK.map((c,i)=>'<option value="'+i+'"'+(i===1?' selected':'')+'>'+esc(c[0])+'</option>').join('');
    function draw(){const c=CH[+$('ic-pchip').value],l=LK[+$('ic-plink').value],m=+$('ic-pmfu').value;$('ic-pmfuv').textContent=Math.round(m*100)+'%';
      const F=c[1]*1e12*m,B=l[1]*1e9,I=F/B;
      const tp=(16*7/8*P.h70/B)/(6*P.lp70/(8*F));
      set('ic-pout',RD.stat('Link intensity I',fN(I)+' FLOP/B','F / β')+RD.stat('Data parallel break-even',fN(2*I/3)+' tokens','per replica per step')+
        RD.stat('FSDP break-even',fN(I)+' tokens','per replica per step')+RD.stat('TP 8, Llama 3.1 70B',Math.round(100*tp)+'%','of layer compute, not hideable'));
      set('ic-pnote','Thresholds assume large data-parallel groups (the (n−1)/n factors near 1) and bf16 gradients and weights. TP uses the 70B’s real layer ('+(P.lp70/1e6).toFixed(0)+'M parameters, h = '+fN(P.h70)+'), 8,192 tokens per micro-batch (the ratio does not depend on it). Peaks are dense vendor figures from the parent page’s Chip atlas.');
    }
    ['ic-pchip','ic-plink'].forEach(id=>$(id).addEventListener('change',draw));$('ic-pmfu').addEventListener('input',draw);draw();
  })();

  // ---- predict-then-reveal ----
  document.querySelectorAll('#t-read .pred').forEach(p=>{const right=p.dataset.right;p.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
    p.querySelectorAll('.opts button').forEach(x=>x.classList.toggle('right',x.dataset.a===right));if(b.dataset.a!==right)b.classList.add('wrong');p.classList.add('done')}))});
})();
