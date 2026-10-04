// ---- Load-test lab (t-lab): sweeps utilisation for each balancing policy with CP.lbSim ----
(function(){
  const $=id=>document.getElementById(id);if(!$('t-lab'))return;
  const POL=[['random','Random','var(--c2)'],['rr','Round robin','var(--c5)'],['p2c','Two choices','var(--c1)'],['lor','Least outstanding','var(--c3)'],['shared','One shared queue','var(--c4)']];
  const GRID=[0.1,0.2,0.3,0.4,0.5,0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.93,0.95,0.97,0.98];
  const on={random:1,rr:1,p2c:1,lor:1,shared:0};let q='p99';
  $('lab-pol').innerHTML=POL.map(p=>'<label><input type="checkbox" data-p="'+p[0]+'"'+(on[p[0]]?' checked':'')+'> <span style="color:'+p[2]+'">&#9632;</span> '+p[1]+'</label>').join('');
  const PRE=[['Measured setup (8 servers, exponential)',{n:8,s:22,u:90,d:'exp',slow:0}],['One slow server',{n:8,s:22,u:75,d:'exp',slow:1}],['Heavy-tailed requests (cv 2)',{n:8,s:22,u:80,d:'ln2',slow:0}],['32 servers',{n:32,s:22,u:90,d:'exp',slow:0}],['One server: the hockey stick',{n:1,s:11,u:80,d:'exp',slow:0}]];
  $('lab-pre').innerHTML=PRE.map((p,i)=>'<button data-i="'+i+'">'+p[0]+'</button>').join('');
  $('lab-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const v=PRE[+b.dataset.i][1];
    $('lab-n').value=v.n;$('lab-s').value=v.s;$('lab-u').value=v.u;$('lab-d').value=v.d;$('lab-slow').checked=!!v.slow;compute()});
  const ms=v=>!isFinite(v)?'&infin;':v>=1000?(v/1000).toFixed(v>=10000?0:1)+' s':v>=100?Math.round(v)+' ms':v>=10?v.toFixed(0)+' ms':v.toFixed(1)+' ms';
  let res={},cfg=null,job=0;
  function settings(){const d=$('lab-d').value;return{n:+$('lab-n').value,S:+$('lab-s').value,u:+$('lab-u').value/100,dist:d==='ln2'||d==='ln4'?'lognormal':d,cv:d==='ln4'?4:2,dkey:d,
    slow:$('lab-slow').checked?3:1,N:+$('lab-N').value,seed:+$('lab-seed').value}}
  function labels(){const s=settings();$('lab-nv').textContent=s.n;$('lab-sv').textContent=s.S+' ms';$('lab-uv').textContent=Math.round(s.u*100)+'%'}
  function key(s){return [s.n,s.dist,s.cv,s.slow,s.N,s.seed].join('|')}
  function compute(){labels();const s=settings();const k=key(s);
    if(cfg===k){POL.forEach(([p])=>{if(res[p]&&!cur(p,s.u)&&(s.n>1||p==='random'))res[p][s.u.toFixed(3)]=CP.lbSummary({n:s.n,rho:s.u,policy:p,N:s.N,warm:Math.floor(s.N/10),seed:s.seed,dist:s.dist,cv:s.cv,slow:s.slow})});draw();return}
    cfg=k;res={};const my=++job;const todo=[];
    POL.forEach(p=>{if(s.n===1&&p[0]!=='random')return;GRID.concat([s.u]).forEach(r=>todo.push([p[0],r]))});
    let i=0;$('lab-busy').textContent='Simulating...';
    (function step(){if(my!==job)return;const t0=performance.now();
      while(i<todo.length&&performance.now()-t0<40){const [p,r]=todo[i++];
        const o={n:s.n,rho:r,policy:p,N:s.N,warm:Math.floor(s.N/10),seed:s.seed,dist:s.dist,cv:s.cv,slow:s.slow};
        (res[p]=res[p]||{})[r.toFixed(3)]=CP.lbSummary(o)}
      $('lab-busy').textContent=i<todo.length?'Simulating... '+Math.round(100*i/todo.length)+'%':'';
      draw();if(i<todo.length)setTimeout(step,0)})();
  }
  function cur(p,u){const r=res[p];if(!r)return null;return r[u.toFixed(3)]||null}
  function draw(){const s=settings();labels();const el=$('lab-chart');if(!el||$('t-lab').hidden)return;
    const ser=[];let ymax=4;
    POL.forEach(([p,lab,col])=>{if(!on[p]||!res[p])return;if(s.n===1&&p!=='random')return;
      const pts=GRID.filter(r=>res[p][r.toFixed(3)]).map(r=>[r*100,res[p][r.toFixed(3)][q]*s.S]);
      pts.forEach(x=>ymax=Math.max(ymax,x[1]));ser.push({pts,color:col,w:2.2});ser.push({pts,color:col,dots:1,r:2.4})});
    const th=$('lab-th').checked&&s.dist==='exp'&&s.slow===1;
    if(th){const qq={p50:.5,p99:.99,p999:.999}[q];
      const f=(c)=>GRID.map(r=>[r*100,(q==='mean'?CP.mmc(r,c,1).W:CP.mmcQuantile(qq,r,c,1))*s.S]);
      if(on.random||s.n===1)ser.push({pts:f(1),color:'var(--c2)',dash:'5 4',w:1.3});
      if(on.shared&&s.n>1)ser.push({pts:f(s.n),color:'var(--c4)',dash:'5 4',w:1.3})}
    // measured points from Experiment 3
    const M=window.CPD&&CPD.lb||[];let shown=0;
    if(s.n===8&&s.dist==='exp'&&q!=='mean'){M.forEach(x=>{if(!!x.slow_server!==(s.slow===3)||!on[x.policy])return;const col=POL.find(p=>p[0]===x.policy)[2];
      ser.push({pts:[[x.util*100,x[q]/x.typical_service_ms*s.S]],color:col,dots:1,r:5.5,stroke:1});shown++})}
    ymax=Math.max(ymax,...ser.filter(z=>z.dots&&z.r>5).map(z=>z.pts[0][1]));
    const lo=Math.max(0.05*s.S,(q==='p50'?0.3:0.8)*s.S);
    CH.draw(el,{series:ser,xmin:0,xmax:100,ymin:lo,ymax:Math.min(ymax*1.15,s.S*2000),logy:1,band:[60,80],vline:{x:s.u*100,label:Math.round(s.u*100)+'%'},
      xlab:'utilisation of the whole pool',ylab:q.replace('p999','p99.9')+' latency (log scale)',xfmt:v=>v+'%',yfmt:v=>ms(v).replace('&infin;','inf'),label:'Latency against utilisation for each policy'});
    $('lab-leg').innerHTML=CH.leg(POL.filter(p=>on[p[0]]&&(s.n>1||p[0]==='random')).map(p=>[p[2],p[1]]))+(th?'<span class="mute">dashed: theory (M/M/1 for random, M/M/'+s.n+' for one shared queue)</span>':'')+(shown?'<span class="mute">large dots: measured, Experiment 3</span>':'');
    // table at the marked utilisation
    let h='<thead><tr><th>At '+Math.round(s.u*100)+'% busy</th><th class="num">p50</th><th class="num">p99</th><th class="num">p99.9</th><th class="num">mean</th></tr></thead><tbody>';
    const rows=POL.filter(p=>on[p[0]]&&cur(p[0],s.u)&&(s.n>1||p[0]==='random'));
    const best=rows.length?Math.min(...rows.map(p=>cur(p[0],s.u).p99)):0;
    rows.forEach(([p,lab])=>{const c=cur(p,s.u);h+='<tr><td>'+lab+'</td><td class="num">'+ms(c.p50*s.S)+'</td><td class="num'+(c.p99===best?' best':'')+'">'+ms(c.p99*s.S)+'</td><td class="num">'+ms(c.p999*s.S)+'</td><td class="num">'+ms(c.mean*s.S)+'</td></tr>'});
    $('lab-tab').innerHTML=h+'</tbody>';
    $('lab-note').textContent=(s.n===1?'With one server every policy is the same, so only one curve is drawn. ':'')+(s.slow===3?'One server is three times slower; utilisation is of the pool\'s real capacity ('+(s.n-1)+' + 1/3 servers). ':'')+'Each point: '+s.N.toLocaleString('en-US')+' requests, seed '+s.seed+'. Latency = (simulated multiple of the mean service time) x '+s.S+' ms.';
  }
  $('lab-pol').addEventListener('change',e=>{const c=e.target.closest('input');if(!c)return;on[c.dataset.p]=c.checked?1:0;draw()});
  ['lab-n','lab-d','lab-N','lab-seed','lab-slow'].forEach(i=>$(i).addEventListener('change',compute));
  $('lab-n').addEventListener('input',labels);
  ['lab-s','lab-th'].forEach(i=>$(i).addEventListener('input',draw));$('lab-th').addEventListener('change',draw);
  $('lab-u').addEventListener('input',()=>{labels()});$('lab-u').addEventListener('change',compute);
  RD.seg($('lab-q'),m=>{q=m;draw()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-lab']=window.TAB_RENDER['t-lab']||[]).push(()=>{if(!cfg)compute();else draw()});
  let rt=0;addEventListener('resize',()=>{if($('t-lab').hidden)return;clearTimeout(rt);rt=setTimeout(draw,80)});
})();
