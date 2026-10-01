// ---- Training log tab: Olmo 3 pretraining from W&B, checkpoints from Hugging Face; OLMo 1.7 against OLMo 2 stability ----
(function(){
  if(!window.TL)return;
  const POSTBS={m32:[4194304,8388608],m7:[2097152,4194304]}; // midtraining, long-context tokens per step (Olmo 3 report Table 35)
  const PRE={m32:{rep:'Olmo 3 report: pretraining "took about 9.5 days on 512 GPUs, followed by an additional 35 days on 1024 GPUs" (9.5 + 35 = 44.5 days), truncated at 5.5T tokens'},m7:{rep:'Olmo 3 report, Table 35: 5.93T pretraining tokens; the report gives no wall-clock time for the 7B'}};
  let m='m32',xm='tok',ym='loss',ow=false;
  const ME=['','MMLU','ARC-Challenge','Arithmetic'];
  function stepToH(M,step){const c=M.curve;let lo=0,hi=c.length-1;if(step<=c[0][0])return c[0][1];if(step>=c[hi][0])return c[hi][1];
    while(hi-lo>1){const mid=(lo+hi)>>1;if(c[mid][0]<=step)lo=mid;else hi=mid}const a=c[lo],b=c[hi];return a[1]+(b[1]-a[1])*(step-a[0])/(b[0]-a[0]||1)}
  function draw(){
    const M=TL[m],bs=M.bs,W=860,H=330,pl=54,pr=16,pt=16,pb=58;
    const segs=M.segs,last=segs[segs.length-1],maxStep=last[3],maxTok=maxStep*bs/1e12,maxDay=M.wallD;
    const X=xm==='tok'?(st=>st*bs/1e12):(st=>stepToH(M,st)/24);
    const xmax=xm==='tok'?Math.ceil(maxTok*2)/2:Math.ceil(maxDay/5)*5;
    let y0,y1,pts;
    if(ym==='loss'){pts=M.curve.map(c=>[c[0],c[2]]);y0=Math.floor((Math.min(...pts.map(p=>p[1]))-0.05)*10)/10;y1=Math.ceil(Math.max(...pts.map(p=>p[1]))*10)/10}
    else{const i=+ym;pts=M.ev.filter(e=>e[i]!=null).map(e=>[e[0],e[i]]);y0=0;y1=1}
    const sx=v=>pl+(W-pl-pr)*v/xmax,sy=v=>pt+(H-pt-pb)*(1-(v-y0)/(y1-y0));
    let s='';
    // restart segments
    segs.forEach((g,i)=>{const a=xm==='tok'?g[2]*bs/1e12:g[0]/24,b=xm==='tok'?g[3]*bs/1e12:g[1]/24;if(!ow)s+='<rect x="'+sx(a).toFixed(1)+'" y="'+pt+'" width="'+Math.max(0.6,sx(b)-sx(a)).toFixed(1)+'" height="'+(H-pt-pb)+'" fill="'+(i%2?'var(--acc2)':'var(--soft)')+'" opacity="0.8"/>'});
    // grid
    const yt=ym==='loss'?[...Array(Math.round((y1-y0)/0.2)+1)].map((_,i)=>+(y0+0.2*i).toFixed(1)).filter(v=>v<=y1+1e-9):[0,0.25,0.5,0.75,1];
    yt.forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+sy(v)+'" y2="'+sy(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(sy(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+(ym==='loss'?v.toFixed(1):Math.round(v*100)+'%')+'</text>'});
    const xstep=xm==='tok'?(xmax>4?1:0.5):5;for(let v=0;v<=xmax+1e-9;v+=xstep)s+='<line x1="'+sx(v)+'" x2="'+sx(v)+'" y1="'+(H-pb)+'" y2="'+(H-pb+4)+'" stroke="var(--mute)"/><text x="'+sx(v)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(xm==='tok'?v+'T':v)+'</text>';
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-pb+30)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(xm==='tok'?'tokens trained (step × '+fmt(bs)+')':'days since the first logged step ('+new Date(M.t0*1000).toISOString().slice(0,10)+')')+'</text>';
    s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">'+(ym==='loss'?'training cross-entropy loss':ME[+ym]+', in-loop')+'</text>';
    // checkpoint ticks
    const cy=H-pb+36;
    if(!ow){let p='';M.ck.stage1.forEach(k=>{const x=sx(X(k*1000));p+='M'+x.toFixed(1)+' '+cy+'v8'});s+='<path d="'+p+'" stroke="var(--open)" stroke-width="0.7"/><text x="'+pl+'" y="'+(cy+19)+'" font-size="10" fill="var(--open)">'+fmt(M.ck.stage1.length)+' public stage-1 checkpoints</text>'}
    else{s+='<text x="'+pl+'" y="'+(cy+19)+'" font-size="10" fill="var(--closed)">0 public checkpoints from this stage</text>'}
    // the curve
    if(!ow){const d=pts.filter(p=>X(p[0])<=xmax).map((p,i)=>(i?'L':'M')+sx(X(p[0])).toFixed(1)+' '+sy(Math.max(y0,Math.min(y1,p[1]))).toFixed(1)).join('');
      s+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="'+(ym==='loss'?1.6:1.2)+'"/>';
      if(m==='m32'&&xm==='tok'){const x=sx(5.5);s+='<line x1="'+x+'" x2="'+x+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--bad)" stroke-dasharray="4 3"/><text x="'+(x-4)+'" y="'+(pt+12)+'" font-size="10.5" text-anchor="end" fill="var(--bad)">5.5T: last stage-1 checkpoint</text>'}
    }else{
      s+='<rect x="'+pl+'" y="'+pt+'" width="'+(W-pl-pr)+'" height="'+(H-pt-pb)+'" fill="var(--closed2)"/><text x="'+((pl+W-pr)/2)+'" y="'+((pt+H-pb)/2-6)+'" font-size="13" text-anchor="middle">An open-weights release publishes none of this run.</text><text x="'+((pl+W-pr)/2)+'" y="'+((pt+H-pb)/2+14)+'" font-size="11.5" text-anchor="middle" fill="var(--mute)">No loss curve, no restarts, no checkpoints: one set of final weights after post-training.</text>';
      const x=sx(xmax);s+='<circle cx="'+(x-4)+'" cy="'+(H-pb)+'" r="5" fill="var(--closed)"/>'}
    $('lgPlot').innerHTML=svgEl(W,H+30,s,'Olmo 3 training log');
    $('lgLeg').innerHTML=ow?'':'<span><i style="background:var(--acc)"></i>'+(ym==='loss'?'loss, median per bin':ME[+ym]+' accuracy, every in-loop evaluation')+'</span><span><i style="background:var(--acc2);height:10px"></i>one band per launch of the job ('+segs.length+')</span><span><i style="background:var(--open)"></i>public checkpoints</span>';
    // stats
    const t0=M.t0,dayRate=(a,b)=>{const S=segs.filter(g=>g[0]>=a*24&&g[1]<=b*24);const st=S.reduce((q,g)=>q+g[3]-g[2],0),h=S.reduce((q,g)=>q+g[1]-g[0],0);return h?st/h:0};
    const tokRedo=M.redo*bs/1e9;
    let out=stat('Wall clock',fmt(M.wallD,1)+' days','first to last pretraining log row')+stat('Launches of the job',segs.length,(segs.length-1)+' relaunches; '+fmt(M.gapsH,1)+' h between them in all')+
      stat('Steps trained twice',fmt(M.redo),'about '+fmt(tokRedo,1)+'B tokens re-run after resuming (derived)')+stat('Last logged step',fmt(maxStep),'= '+fmt(maxTok,2)+'T tokens');
    if(m==='m32'){const hOct1=(Date.UTC(2025,9,1,21)/1000-t0)/3600/24,hOct5=(Date.UTC(2025,9,5)/1000-t0)/3600/24;const r1=dayRate(0,hOct1),r2=dayRate(hOct5,999);out+=stat('Steps per hour',fmt(r1)+' → '+fmt(r2),'before 1 Oct and after 5 Oct 2025: '+(r2/r1).toFixed(2)+'x, the move from 512 to 1,024 GPUs')}
    $('lgOut').innerHTML=ow?stat('Published by an open-weights release','nothing','of the '+segs.length+' launches, '+fmt(M.ck.stage1.length)+' checkpoints and '+fmt(M.ev.length)+' evaluations'):out;
    $('lgRep').innerHTML=m==='m32'?'<b>Defaults reproduce the report, independently.</b> Wall clock '+fmt(M.wallD,1)+' days from the logs against '+PRE.m32.rep+'. Step 656,000 × 8,388,608 = 5.50T, the 5.5T truncation, and it is the last stage-1 checkpoint on Hugging Face. The log continues to step '+fmt(maxStep)+' ('+fmt(maxTok,2)+'T); the report does not say what those steps were for.':'<b>Defaults reproduce the report, independently.</b> Last logged step '+fmt(maxStep)+' × 4,194,304 = '+fmt(maxTok,2)+'T against '+PRE.m7.rep+'. The 7B was trained over '+fmt(M.wallD,1)+' calendar days with '+fmt(M.gapsH,0)+' hours between launches; the logs do not say whether the gaps were failures or planned stops.';
    // after pretraining
    const P=M.post,cols=['var(--c3)','var(--c2)','var(--c5)','var(--c4)'];const W2=860,H2=220,pl2=54,pb2=40;
    const isLC=d=>/longcontext|lc_64k/.test(d);
    const mid=P.filter(p=>!isLC(p.dn)),lc=P.filter(p=>isLC(p.dn));
    const allp=[].concat(...P.map(p=>p.pts));const yy0=Math.floor(Math.min(...allp.map(p=>p[1]))*10)/10,yy1=Math.ceil(Math.max(...allp.map(p=>p[1]))*10)/10;
    const half=(W2-pl2-16)/2-10;let s2='';
    [[mid,'Stage 2: midtraining',0],[lc,'Stage 3: long context',1]].forEach(([runs,lab,j])=>{const ox=pl2+j*(half+20);const mxs=Math.max(...[].concat(...runs.map(r=>r.pts.map(p=>p[0]))));
      const fx=v=>ox+half*v/mxs,fy=v=>12+(H2-12-pb2)*(1-(v-yy0)/(yy1-yy0));
      s2+='<rect x="'+ox+'" y="12" width="'+half+'" height="'+(H2-12-pb2)+'" fill="none" stroke="var(--line)"/><text x="'+ox+'" y="9" font-size="10.5" fill="var(--mute)">'+lab+'</text>';
      if(j===0)[yy0,(yy0+yy1)/2,yy1].forEach(v=>s2+='<text x="'+(ox-6)+'" y="'+(fy(v)+4)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+v.toFixed(2)+'</text>');
      s2+='<text x="'+(ox+half)+'" y="'+(H2-pb2+14)+'" font-size="10" text-anchor="end" fill="var(--mute)">step '+fmt(mxs)+'</text><text x="'+ox+'" y="'+(H2-pb2+14)+'" font-size="10" fill="var(--mute)">0</text>';
      if(!ow)runs.forEach((r,i)=>{s2+='<path d="'+r.pts.map((p,q)=>(q?'L':'M')+fx(p[0]).toFixed(1)+' '+fy(p[1]).toFixed(1)).join('')+'" fill="none" stroke="'+cols[(i+j*2)%4]+'" stroke-width="1.4"/>'});
      else s2+='<text x="'+(ox+half/2)+'" y="'+(H2/2)+'" font-size="11" text-anchor="middle" fill="var(--closed)">not published</text>'});
    s2+='<text x="'+pl2+'" y="'+(H2-8)+'" font-size="10.5" fill="var(--mute)">training loss on each stage\'s own data, so not comparable with the pretraining loss above</text>';
    $('lgPost').innerHTML=svgEl(W2,H2,s2,'Loss after pretraining');
    const c2=M.ck.stage2,c3=M.ck.stage3,m2=Math.max(...c2)*1000,m3=Math.max(...c3)*1000,b=POSTBS[m];
    $('lgPostN').innerHTML=(m==='m32'?'Two midtraining runs with different data orders (the souping ingredients), then one long-context run. ':'Midtraining is one run logged in three launches, then one long-context run. ')+'Checkpoints: '+c2.length+' from midtraining, '+c3.length+' from long context. <b>Reproduces Table 35 independently:</b> last midtraining checkpoint step '+fmt(m2)+' × '+fmt(b[0])+' = '+fmt(m2*b[0]/1e9,1)+'B tokens'+(m==='m32'?' per run':'')+'; long context '+fmt(m3)+' × '+fmt(b[1])+' = '+fmt(m3*b[1]/1e9,1)+'B (the report: '+(m==='m32'?'100B twice and 100B':'100B and 50B')+').';
  }
  segBind('lgM',v=>{m=v;draw()});segBind('lgX',v=>{xm=v;draw()});segBind('lgY',v=>{ym=v;draw()});
  $('lgOW').addEventListener('change',e=>{ow=e.target.checked;draw()});
  onTab('t-log',draw);
})();
(function(){
  if(!window.STAB)return;
  let y='gn',a='max';const C=['var(--bad)','var(--acc)'];
  function draw(){
    const W=860,H=300,pl=54,pr=16,pt=14,pb=40;const S=STAB;
    const xmax=Math.max(...S.map(s=>s.s1));const idx=y==='gn'?(a==='max'?4:3):(a==='max'?2:1);
    const logy=y==='gn';const vals=[].concat(...S.map(s=>s.curve.map(c=>c[idx]))).filter(v=>v>0);
    const lo=logy?Math.pow(10,Math.floor(Math.log10(Math.min(...vals)))):Math.floor(Math.min(...vals)*10)/10,hi=logy?Math.pow(10,Math.ceil(Math.log10(Math.max(...vals)))):Math.min(4,Math.ceil(Math.max(...vals)*10)/10);
    const sx=v=>pl+(W-pl-pr)*v/xmax,sy=v=>{v=Math.max(lo,Math.min(hi,v));return logy?pt+(H-pt-pb)*(1-(Math.log10(v)-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo))):pt+(H-pt-pb)*(1-(v-lo)/(hi-lo))};
    let s='';const yt=[];if(logy){for(let e=Math.log10(lo);e<=Math.log10(hi)+1e-9;e++)yt.push(Math.pow(10,e))}else{for(let v=lo;v<=hi+1e-9;v+=0.2)yt.push(+v.toFixed(1))}
    yt.forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+sy(v)+'" y2="'+sy(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(sy(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+(logy?(v>=1?fmt(v):v.toString()):v.toFixed(1))+'</text>'});
    for(let v=0;v<=xmax;v+=200000)s+='<text x="'+sx(v)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(v/1000)+'K</text>';
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-6)+'" font-size="11" text-anchor="middle" fill="var(--mute)">training step</text>';
    s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">'+(y==='gn'?'gradient norm (log scale)':'training loss')+'</text>';
    S.forEach((r,i)=>{s+='<path d="'+r.curve.map((c,q)=>(q?'L':'M')+sx(c[0]).toFixed(1)+' '+sy(c[idx]).toFixed(1)).join('')+'" fill="none" stroke="'+C[i]+'" stroke-width="1.3"/>'});
    $('stPlot').innerHTML=svgEl(W,H,s,'Stability before and after OLMo 2');
    $('stLeg').innerHTML=S.map((r,i)=>'<span><i style="background:'+C[i]+'"></i>'+r.label+'</span>').join('')+'<span>'+(a==='max'?'largest sampled value in each of 400 bins':'median of each bin')+'</span>';
    $('stOut').innerHTML=S.map(r=>stat(r.label,'grad '+r.gnSS.toFixed(2)+'% · loss '+r.lossSS.toFixed(2)+'%','spike score; '+fmt(r.gnSpikes)+' gradient-norm and '+fmt(r.lossSpikes)+' loss spikes in '+fmt(r.n)+' sampled points over '+fmt(r.s1)+' steps')).join('');
  }
  segBind('stY',v=>{y=v;draw()});segBind('stA',v=>{a=v;draw()});onTab('t-log',draw);
})();
