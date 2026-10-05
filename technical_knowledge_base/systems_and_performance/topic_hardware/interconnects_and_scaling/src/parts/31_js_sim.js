// ---- Collective simulator tab (t-sim) ----
(function(){
  const D=window.IC,$=id=>document.getElementById(id),esc=RD.esc;
  const fB=b=>b>=1e9?(b/1e9).toFixed(b>=1e10?1:2)+' GB':b>=1e6?(b/1e6).toFixed(b>=1e7?0:1)+' MB':b>=1e3?(b/1e3).toFixed(b>=1e4?0:1)+' KB':Math.round(b)+' B';
  const fT=s=>s>=1?s.toFixed(2)+' s':s>=1e-3?(s*1e3).toFixed(s>=0.1?0:1)+' ms':(s*1e6).toFixed(s>=1e-4?0:1)+' µs';
  const ALGS={ar:[['ring','Ring'],['rd','Recursive doubling'],['rab','Halving-doubling'],['switch','In-switch (NVLS, SHARP)']],ag:[['ring','Ring'],['rd','Recursive doubling']],a2a:[['pair','Pairwise exchange']]};
  const COL={ring:'var(--c1)',rd:'var(--c2)',rab:'var(--c3)',switch:'var(--c4)',pair:'var(--c1)'};
  $('sim-link').innerHTML=D.links.map((l,i)=>'<option value="'+l.id+'"'+(l.id==='nvl4'?' selected':'')+'>'+esc(l.nm)+'</option>').join('');
  const st={coll:'ar',alg:'ring',n:8,link:'nvl4',S:2**24,run:null,ym:'t'};
  function ab(){const l=D.links.find(x=>x.id===st.link);if(l.per_n){const p=l.per_n[String(Math.min(8,st.n))];return [p.alpha*1e-6,p.beta*1e9]}return [l.alpha*1e-6,l.beta*1e9]}
  function fillAlg(){$('sim-alg').innerHTML=ALGS[st.coll].map(a=>'<option value="'+a[0]+'">'+a[1]+'</option>').join('');st.alg=ALGS[st.coll][0][0]}
  fillAlg();
  function cap(i){const r=st.run;if(i===0)return st.coll==='a2a'?'Start: GPU g holds a different piece for every other GPU. Grid: row = receiving GPU, column = sender; a filled cell has arrived.':st.coll==='ag'?'Start: each GPU holds only its own chunk (the diagonal).':'Start: every GPU holds only its own contribution in every chunk (pale).';
    return 'Step '+i+' of '+r.steps+(i===r.steps?': done.':'.')+' Arrows show this step’s messages.'}
  function draw(i){const r=st.run,n=st.n,host=$('sim-svg'),W=Math.min(860,RD.width(host)),cw=Math.min(52,(W-16)/n),gap=Math.max(2,cw*0.16),cellW=cw-gap,ch=Math.max(6,Math.min(12,150/n)),top=50;
    const H=top+n*(ch+2)+(st.alg==='switch'?62:18),x0=(W-n*cw)/2,sn=r.snaps[i];let s='';
    if(i>0)sn.tr.forEach(([a,b])=>{if(a===-1||b===-1){const g=a===-1?b:a,x=x0+g*cw+cellW/2,y1=top+n*(ch+2)+3,y2=y1+20;s+='<line x1="'+x+'" y1="'+(a===-1?y2:y1)+'" x2="'+x+'" y2="'+(a===-1?y1:y2)+'" stroke="var(--acc)" stroke-width="1.3" marker-end="url(#sim-ah)"/>';return}
      const xa=x0+a*cw+cellW/2,xb=x0+b*cw+cellW/2,h=Math.min(40,8+Math.abs(b-a)*4);s+='<path d="M'+xa+','+(top-4)+' Q'+((xa+xb)/2)+','+(top-4-h)+' '+xb+','+(top-4)+'" fill="none" stroke="var(--acc)" stroke-width="1.1" opacity=".75" marker-end="url(#sim-ah)"/>'});
    for(let g=0;g<n;g++){const x=x0+g*cw;if(n<=8||g%2===0)s+=RD.t(x+cellW/2,H-4,String(g),{a:'middle',fs:10});
      for(let c=0;c<n;c++){let f;if(st.coll==='a2a')f=sn.rx[g][c];else if(st.coll==='ag')f=sn.have[g][c]?1:0;else f=ICSIM.pop(sn.have[g][c])/n;
        s+='<rect x="'+x+'" y="'+(top+c*(ch+2))+'" width="'+cellW+'" height="'+ch+'" rx="1.5" fill="'+COL[st.alg]+'" fill-opacity="'+(0.1+0.9*f).toFixed(2)+'"/>'}}
    if(st.alg==='switch'){const y=top+n*(ch+2)+25;s+='<rect x="'+x0+'" y="'+y+'" width="'+(n*cw-gap)+'" height="16" rx="4" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(x0+(n*cw-gap)/2,y+12,'switch',{a:'middle',fs:10})}
    host.innerHTML=RD.svg(W,H,'<defs><marker id="sim-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--acc)"/></marker></defs>'+s,'Collective state, step '+i);
    $('sim-cap').textContent=cap(i);
    const [a,b]=ab(),fin=i===r.steps,t=fin?r.time:sn.t,bf=ICSIM.BUSF[st.coll](n);
    $('sim-out').innerHTML=RD.stat('Steps',i+' / '+r.steps,'latencies paid')+RD.stat('Sent per GPU',fB(sn.sent),'total '+fB(r.sent)+' = '+(r.sent/st.S).toFixed(3)+' × buffer')+
      RD.stat('Time',fT(t),fin?'final':'so far')+RD.stat('algbw / busbw',(st.S/r.time/1e9).toFixed(1)+' / '+(st.S/r.time*bf/1e9).toFixed(1)+' GB/s','busbw = algbw × '+bf.toFixed(3));
  }
  let A=null;
  function rebuild(){const [a,b]=ab();st.run=ICSIM.run(st.coll,st.alg,st.n,st.S,a,b);if(A)A.reset(st.run.snaps.length);bars();curve()}
  function bars(){const [a,b]=ab(),L=ALGS[st.coll].map(x=>[x[1],ICSIM.closed(st.coll,x[0],st.n,st.S,a,b),COL[x[0]]]),mx=Math.max(...L.map(x=>x[1]));
    $('sim-bars').innerHTML=L.map(x=>'<div class="row"><span class="nm">'+esc(x[0])+'</span><span class="track"><span class="fill" style="width:'+(x[1]/mx*100).toFixed(1)+'%;background:'+x[2]+'"></span></span><span class="val">'+fT(x[1])+'</span></div>').join('')}
  function curve(){const host=$('sim-curve'),W=Math.min(860,RD.width(host)),H=Math.max(230,Math.min(320,W*0.5)),L=56,R=10,T=10,B=36,[a,b]=ab(),n=st.n,bf=ICSIM.BUSF[st.coll](n);
    const Ss=[];for(let e=3;e<=34;e+=0.25)Ss.push(Math.pow(2,e));
    const val=(alg,S)=>{const t=ICSIM.closed(st.coll,alg,n,S,a,b);return st.ym==='t'?t:S/t*bf/1e9};
    const series=ALGS[st.coll].map(x=>[x[0],x[1],Ss.map(S=>val(x[0],S))]);
    const pts=[];// overlays
    const l=D.links.find(x=>x.id===st.link);
    if(st.coll==='ar'&&st.link==='nvl4'&&n===8)D.sweep_h200.sizes.forEach((S,j)=>pts.push([S,st.ym==='t'?D.sweep_h200.t_us[j]*1e-6:D.sweep_h200.busbw[j],'8 x H200, nccl-tests (Bekman)']));
    if(st.coll==='ar'&&st.link==='laptop'&&n<=8){const m=D.meas.ns[String(n)];D.meas.sizes.forEach((S,j)=>['ring','rd'].forEach(k=>{const t=m.data[k].med[j];if(t)pts.push([S,st.ym==='t'?t:S/t*bf/1e9,'measured here ('+k+')'])}))}
    const all=series.flatMap(s=>s[2]).concat(pts.map(p=>p[1])).filter(v=>v>0&&isFinite(v));
    const lo=Math.min(...all),hi=Math.max(...all),yl=Math.log10(lo)-0.1,yh=Math.log10(hi)+0.1;
    const x=S=>L+(Math.log2(S)-3)/31*(W-L-R),y=v=>T+(yh-Math.log10(v))/(yh-yl)*(H-T-B);
    let s='';for(let e=Math.ceil(yl);e<=Math.floor(yh);e++){const v=Math.pow(10,e);s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,y(v)+4,st.ym==='t'?fT(v):(v>=1?v:v.toPrecision(1))+'',{a:'end',fs:10})}
    [8,1024,2**20,2**30].forEach((S,k)=>{s+=RD.t(x(S),H-B+14,fB(S),{a:k===0?'start':'middle',fs:10})});
    s+=RD.t((L+W-R)/2,H-4,'buffer size (log)'+(st.ym==='bw'?'; y: busbw, GB/s':''),{a:'middle',fs:10,fill:'var(--mute)'});
    series.forEach(sr=>{s+='<polyline points="'+sr[2].map((v,j)=>x(Ss[j]).toFixed(1)+','+y(v).toFixed(1)).join(' ')+'" fill="none" stroke="'+COL[sr[0]]+'" stroke-width="1.8"/>'});
    pts.forEach(p=>{s+='<circle cx="'+x(p[0])+'" cy="'+y(p[1])+'" r="3.5" fill="none" stroke="var(--ink)" stroke-width="1.4"><title>'+esc(p[2])+'</title></circle>'});
    const X=x(st.S);s+='<line x1="'+X+'" x2="'+X+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>';
    host.innerHTML=RD.svg(W,H,s,'Collective time against size')+'<div class="hmleg">'+series.map(sr=>'<span><svg width="16" height="10"><line x1="0" y1="5" x2="16" y2="5" stroke="'+COL[sr[0]]+'" stroke-width="2"/></svg>'+esc(sr[1])+'</span>').join('')+(pts.length?'<span><svg width="12" height="12"><circle cx="6" cy="6" r="4" fill="none" stroke="var(--ink)"/></svg>'+esc(pts[0][2].replace(/ \(.*/,''))+'</span>':'')+'</div>';
    let note='Dashed line: the size you chose. ';
    if(st.coll==='ar'){const xo=[];const al=ALGS.ar.map(z=>z[0]).filter(z=>z!=='switch');for(let k=1;k<Ss.length;k++){const p=al.map(z=>ICSIM.closed('ar',z,n,Ss[k-1],a,b)),q=al.map(z=>ICSIM.closed('ar',z,n,Ss[k],a,b));const bp=al[p.indexOf(Math.min(...p))],bq=al[q.indexOf(Math.min(...q))];if(bp!==bq)xo.push(bp+' to '+bq+' near '+fB(Ss[k]))}
      note+=xo.length?'Fastest point-to-point algorithm changes: '+xo.join('; ')+'. ':'One point-to-point algorithm is fastest at every size here. ';}
    if(pts.length&&st.link==='nvl4')note+='Circles: 8 H200s in one server, nccl-tests all-reduce (NCCL’s own choice of algorithm), from Bekman’s ML Engineering. At large sizes they sit near the ring and above it (NVLS); at small sizes they beat the ring’s 14 latencies, as NCCL’s trees and LL protocol intend.';
    else if(pts.length)note+='Circles: this page’s measurements (median of 3 runs).';
    else if(st.coll==='ar')note+='Published curves are overlaid for NVLink 4 with 8 GPUs and for the laptop link.';
    $('sim-cnote').textContent=note;
  }
  rebuild();
  A=RD.anim({card:'sim-card',ctl:'sim-ctl',n:st.run.snaps.length,draw,ms:900,label:'Step',tab:'t-sim'});
  const upd=()=>{$('sim-Sv').textContent=fB(st.S)};upd();
  $('sim-coll').addEventListener('change',e=>{st.coll=e.target.value;fillAlg();rebuild()});
  $('sim-alg').addEventListener('change',e=>{st.alg=e.target.value;rebuild()});
  $('sim-n').addEventListener('change',e=>{st.n=+e.target.value;rebuild()});
  $('sim-link').addEventListener('change',e=>{st.link=e.target.value;rebuild()});
  $('sim-S').addEventListener('input',e=>{st.S=Math.pow(2,+e.target.value);upd();rebuild()});
  RD.seg($('sim-ym'),m=>{st.ym=m;curve()});
  RD.onRender(()=>{curve();A.redraw()},'t-sim');RD.onResize(()=>{curve();A.redraw()},'t-sim');
})();
