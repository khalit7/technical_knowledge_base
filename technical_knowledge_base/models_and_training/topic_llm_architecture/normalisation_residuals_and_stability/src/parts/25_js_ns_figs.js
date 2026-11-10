// ---- Reading figures added in the 2026-10-23 rebuild: final loss against learning rate,
// gradient norm by block (the root Block lab's gradnorm.json), |mean| / RMS through the stream, log Z over training,
// and every-step gradient norm with OLMo 2's spike flags. Data: window.NSD (22_js_ns_0data.js); helpers: NSC, RD. ----
(function(){
  const D=window.NSD,C=window.NSC,$=id=>document.getElementById(id);
  if(!D||!C||!window.RD)return;
  const T=(x,y,s,o)=>RD.t(x,y,s,o);
  // ---------------- final loss against learning rate
  const LR=[3e-4,1e-3,3e-3,1e-2,3e-2],lrT={0.0003:'3e-4',0.001:'1e-3',0.003:'3e-3',0.01:'1e-2',0.03:'3e-2'};
  const SER=[['Pre-norm','var(--c1)',['bl_pre_lr1e-3','bl_pre_lr3e-3','bl_pre_lr1e-2','bl_pre_lr3e-2']],
    ['Post-norm','var(--c2)',['bl_post_lr3e-4','bl_post_lr1e-3','bl_post_lr3e-3']],
    ['Sandwich','var(--c3)',['ns_sand_lr3e-3','ns_sand_lr1e-2','ns_sand_lr3e-2']],
    ['Output norm','var(--c4)',['ns_out_lr3e-3','ns_out_lr1e-2','ns_out_lr3e-2']],
    ['Pre-norm + QK-norm','var(--c5)',['ns_pre_lr3e-3_qk','ns_pre_lr1e-2_qk','ns_pre_lr3e-2_qk']]];
  function lrChart(){const el=$('ns-lr');if(!el)return;const w=RD.width(el),nar=w<520,h=nar?250:280,pl=36,pr=nar?92:122,pt=10,pb=34;
    const lx=v=>Math.log10(v),X=v=>pl+(lx(v)-lx(3e-4))/(lx(3e-2)-lx(3e-4))*(w-pl-pr),ymin=1.8,ymax=6.5,Y=v=>pt+(ymax-v)/(ymax-ymin)*(h-pt-pb);
    let s='';for(let v=2;v<=6;v++)s+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(pl-4,Y(v)+4,v,{a:'end',fill:'var(--mute)'});
    LR.forEach(v=>s+=T(X(v),h-pb+15,lrT[v],{a:'middle',fill:'var(--mute)'}));s+=T(w-pr,h-3,'peak learning rate (log)',{a:'end',fill:'var(--mute)'});
    s+=T(pl+2,pt+9,'held-out loss',{fill:'var(--mute)'});
    const u=D.grid.unigram;s+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(u)+'" y2="'+Y(u)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>'+T(pl+4,Y(u)+14,'unigram floor '+u.toFixed(2),{fill:'var(--bad)'});
    const labs=[];
    SER.forEach(([n,c,ks])=>{const pts=ks.filter(k=>D.runs[k]).map(k=>[D.runs[k].lr,D.runs[k].final]);
      s+='<polyline points="'+pts.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="2"/>';
      pts.forEach(p=>s+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="3.5" fill="'+c+'"/>');
      const e=pts[pts.length-1];labs.push({n,c,x:X(e[0])+7,y:Y(e[1])+4})});
    const wr=D.runs.bl_post_warm500;if(wr){s+='<rect x="'+(X(3e-3)-5)+'" y="'+(Y(wr.final)-5)+'" width="10" height="10" fill="var(--c2)"/>';s+=T(X(3e-3)-9,Y(wr.final)+16,nar?'500 warmup':'post-norm, 500 warmup steps',{a:'middle',fill:'var(--c2)'})}
    labs.sort((a,b)=>a.y-b.y);for(let i=1;i<labs.length;i++)if(labs[i].x===labs[i-1].x&&labs[i].y-labs[i-1].y<13)labs[i].y=labs[i-1].y+13;
    labs.forEach(l=>s+=T(l.x,l.y,nar?l.n.replace('Pre-norm + QK-norm','Pre + QK-norm'):l.n,{fill:l.c,w:600}));
    el.innerHTML=RD.svg(w,h,s,'Held-out loss against peak learning rate for five placements')}
  // ---------------- gradient norm by block (root Block lab)
  let gnWhen='trained';
  function gnChart(){const el=$('ns-gn');if(!el||!D.gradnorm)return;const w=RD.width(el),nar=w<520,h=nar?220:240,pl=44,pr=nar?96:150,pt=10,pb=32;
    const G=D.gradnorm,runs=gnWhen==='init'?[['bl_pre_lr1e-3','pre-norm','var(--c1)'],['bl_post_lr1e-3','post-norm','var(--c2)']]
      :[['bl_pre_lr1e-3','pre, lr 1e-3','var(--c1)'],['bl_post_lr1e-3','post, lr 1e-3','var(--c3)'],['bl_post_warm500','post, 3e-3, warmup 500','var(--c4)'],['bl_post_lr3e-3','post, lr 3e-3 (failed)','var(--c2)']];
    const vals=[].concat(...runs.map(r=>G[r[0]][gnWhen])).filter(v=>v>0),a=Math.floor(Math.log10(Math.min(...vals))),b=Math.ceil(Math.log10(Math.max(...vals)));
    const X=k=>pl+(k+0.5)/6*(w-pl-pr),Y=v=>pt+(b-Math.log10(v))/(b-a||1)*(h-pt-pb);let s='';
    for(let e=a;e<=b;e++)s+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(Math.pow(10,e))+'" y2="'+Y(Math.pow(10,e))+'" stroke="var(--line)"/>'+T(pl-4,Y(Math.pow(10,e))+4,'1e'+e,{a:'end',fill:'var(--mute)'});
    for(let k=0;k<6;k++)s+=T(X(k),h-pb+15,k+1,{a:'middle',fill:'var(--mute)'});s+=T(w-pr,h-3,'block (1 = next to the embedding)',{a:'end',fill:'var(--mute)'});
    const labs=[];runs.forEach(([k,n,c])=>{const v=G[k][gnWhen];s+='<polyline points="'+v.map((x,i)=>X(i).toFixed(1)+','+Y(x).toFixed(1)).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="2"/>'+v.map((x,i)=>'<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(x).toFixed(1)+'" r="3" fill="'+c+'"/>').join('');labs.push({n,c,y:Y(v[5])+4})});
    labs.sort((p,q)=>p.y-q.y);for(let i=1;i<labs.length;i++)if(labs[i].y-labs[i-1].y<13)labs[i].y=labs[i-1].y+13;
    labs.forEach(l=>s+=T(X(5)+8,l.y,nar?l.n.replace('post, 3e-3, warmup 500','post + warmup').replace(' (failed)',''):l.n,{fill:l.c,w:600}));
    el.innerHTML=RD.svg(w,h,s,'Gradient norm reaching each block')}
  // ---------------- |mean| / RMS through the stream
  function muChart(){const el=$('ns-mu');if(!el)return;const M=D.mistakes.mean_over_rms,n=M.median.length,w=RD.width(el),h=170,pl=40,pr=8,pt=10,pb=32;
    const mx=0.08,X=i=>pl+(i+0.5)/n*(w-pl-pr),bw=(w-pl-pr)/n*0.6,Y=v=>pt+(mx-v)/mx*(h-pt-pb);let s='';
    [0,0.02,0.04,0.06,0.08].forEach(v=>s+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(pl-4,Y(v)+4,v.toFixed(2),{a:'end',fill:'var(--mute)'}));
    for(let i=0;i<n;i++){s+='<rect x="'+(X(i)-bw/2).toFixed(1)+'" y="'+Y(M.median[i]).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(Y(0)-Y(M.median[i])).toFixed(1)+'" fill="var(--acc)"/>';
      s+='<line x1="'+(X(i)-bw/2).toFixed(1)+'" x2="'+(X(i)+bw/2).toFixed(1)+'" y1="'+Y(M.max[i]).toFixed(1)+'" y2="'+Y(M.max[i]).toFixed(1)+'" stroke="var(--ink)" stroke-width="2"/>';
      const lb=i===0?'emb':(w<520?(i%2?String(Math.ceil(i/2)):''):(Math.ceil(i/2)+(i%2?'a':'f')));if(lb)s+=T(X(i),h-pb+15,lb,{a:'middle',fill:'var(--mute)'})}
    s+=T(w-pr,h-3,w<520?'block (attention then FFN)':'after each sub-layer: block number, a = attention, f = FFN',{a:'end',fill:'var(--mute)'});
    s+=T(pl+4,pt+9,w<520?'|mean| / RMS of a token row':'|mean| / RMS of a token row (1 would be a row of one constant value)',{fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,h,s,'Mean over RMS of the stream rows')}
  // ---------------- log Z over training
  function lzChart(){const el=$('ns-lz');if(!el)return;const S=[['ns_pre_lr3e-3','lr 3e-3 (healthy)','var(--c1)'],['ns_pre_lr3e-2_c0','lr 3e-2, no fix','var(--c2)'],['ns_pre_lr3e-2_c0_z','lr 3e-2 + z-loss 1e-4','var(--c4)']].filter(x=>D.runs[x[0]]);
    C.line(el,S.map(([k,n,c])=>({name:n,color:c,pts:D.runs[k].lz,end:true})),{xmax:1500,ymin:0,ymax:13,xl:'training step',yl:'mean log Z',hline:[{y:0,label:'log Z = 0 (logits are log-probabilities)'}],label:'mean log Z',h:RD.width(el)<520?200:220});
    const lg=document.createElement('div');lg.innerHTML=C.legend(S.map(x=>[x[1]+': ends at '+D.runs[x[0]].lz[D.runs[x[0]].lz.length-1][1].toFixed(2),x[2]]));el.appendChild(lg.firstChild)}
  // ---------------- every-step gradient norm with spike flags
  let sgRun='ns_pre_lr3e-2_c0';
  function sgChart(){const el=$('ns-sg');if(!el||!D.spike_gn||!D.spike_gn[sgRun])return;const R=D.spike_gn[sgRun],w=RD.width(el),h=w<520?200:220,pl=44,pr=8,pt=10,pb=30;
    const v=R.gn,n=v.length,lo=0.03,hi=100,X=i=>pl+i/(n-1)*(w-pl-pr),Y=x=>pt+(Math.log10(hi)-Math.log10(Math.min(hi,Math.max(lo,x))))/(Math.log10(hi)-Math.log10(lo))*(h-pt-pb);let s='';
    [0.1,1,10,100].forEach(t=>s+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(t)+'" y2="'+Y(t)+'" stroke="var(--line)"/>'+T(pl-4,Y(t)+4,t,{a:'end',fill:'var(--mute)'}));
    [0,500,1000,1500].forEach(t=>s+=T(X(Math.min(n-1,t)),h-pb+15,t,{a:t===1500?'end':'middle',fill:'var(--mute)'}));s+=T(pl+4,pt+9,'gradient norm (log)',{fill:'var(--mute)'});
    let d='';v.forEach((x,i)=>{if(x===null)return;d+=(d?'L':'M')+X(i).toFixed(1)+' '+Y(x).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="var(--c1)" stroke-width="1"/>';
    R.hits.forEach(st=>{const i=st-1;s+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(v[i]).toFixed(1)+'" r="4.5" fill="none" stroke="var(--bad)" stroke-width="2"/>'});
    s+=T(w-pr,pt+9,R.hits.length+' flagged step'+(R.hits.length===1?'':'s'),{a:'end',fill:'var(--bad)',w:600});
    el.innerHTML=RD.svg(w,h,s,'Gradient norm at every step with flagged spikes')}
  const all=()=>{lrChart();gnChart();muChart();lzChart();sgChart()};
  if($('ns-gn-when'))RD.seg($('ns-gn-when'),m=>{gnWhen=m;gnChart()});
  if($('ns-sg-pick'))RD.seg($('ns-sg-pick'),m=>{sgRun=m;sgChart()});
  RD.onRender(all);RD.onResize(all);
})();
