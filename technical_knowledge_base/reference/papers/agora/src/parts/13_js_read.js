// ---- Reading tab: Figure 2 rebuilt, the descent animation (Table 4), the Stage B band map, predict reveals ----
const RC=PAPER.rc||{};
const T4=PAPER.tables.t4.rows;
const RAND=3.3923,BEST=1.899044,DESC=RAND-BEST;
const hrs=s=>{if(!s)return -6;const m=s.match(/(Apr|May) (\d+) (\d+):(\d+)/);const day=(m[1]==='Apr'?+m[2]-27:+m[2]+3);return day*24+(+m[3])+(+m[4])/60};

// Figure 2: contributions per day by type, decoded from the vector PDF in the arXiv source
(function(){const host=$('f2Svg');if(!host||!RC.fig2)return;const D=RC.fig2;let sel=-1;
  function draw(w){const H=Math.round(Math.min(300,Math.max(230,w*.36))),pl=34,pr=8,pt=40,pb=34;
    const n=D.length,bw=(w-pl-pr)/n,ymax=250,ys=v=>pt+(H-pt-pb)*(1-v/ymax);let s='';
    [0,50,100,150,200,250].forEach(v=>{s+=ln2(pl,ys(v),w-pr,ys(v),'var(--line)')+tx(pl-5,ys(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    const K=[['results','var(--c1)'],['insights_hypotheses_reports','var(--c3)'],['verifications','var(--c5)']];
    D.forEach((d,i)=>{let y0=0;const x=pl+i*bw+bw*.12,bwi=bw*.76;
      K.forEach(([k,c])=>{const v=d[k];s+=rc(x,ys(y0+v),bwi,ys(y0)-ys(y0+v),c,{r:1,op:sel<0||sel===i?1:.45});y0+=v});
      if(d.tagged_explore_novel_or_negative){const t=d.tagged_explore_novel_or_negative;s+='<circle cx="'+(x+bwi/2).toFixed(1)+'" cy="'+(ys(y0)-9).toFixed(1)+'" r="4" fill="var(--bad)"/>'+tx(x+bwi/2,ys(y0)-16,t,{fs:11,a:'middle',c:'var(--bad)'})}
      if(w>600||i%2===0)s+=tx(x+bwi/2,H-pb+15,d.day.replace('Apr ','A').replace('May ','M'),{fs:11,a:'middle',c:'var(--mute)'});
      s+='<rect x="'+(pl+i*bw).toFixed(1)+'" y="'+pt+'" width="'+bw.toFixed(1)+'" height="'+(H-pt-pb)+'" fill="transparent" data-i="'+i+'" style="cursor:pointer"/>'});
    // events (paper §4.2, §4.7, Figure 2 caption)
    const ev=[[1,'A100 workers start'],[2,'H100 workers start'],[6.85,'May 2 evening: views, UCB, new prompt']];
    const ev2=w<560?[[1,'A100 start'],[2,'H100 start'],[6.85,'May 2: views + prompt']]:ev;ev2.forEach(([i,l],j)=>{const x=pl+i*bw,rt=x>w*.55;s+=ln2(x,pt-4,x,H-pb,'var(--c6)',{da:'4 3'})+tx(x+(rt?-3:3),pt-28+j*12,l,{fs:11,c:'var(--c6)',a:rt?'end':'start'})});
    s+=tx(w-pr,H-4,'day (UTC), A = April, M = May',{fs:11,a:'end',c:'var(--mute)'});
    host.innerHTML=svgW(w,H,s,'Contributions per day by type');
    host.querySelectorAll('rect[data-i]').forEach(r=>r.addEventListener('click',()=>{sel=+r.dataset.i;draw(host.clientWidth);info()}));}
  function info(){const d=D[sel<0?4:sel];$('f2Out').innerHTML='<b>'+d.day+'</b>: '+d.total+' contributions: '+d.results+' results, '+d.insights_hypotheses_reports+' insights, hypotheses and reports, '+d.verifications+' verifications'+(d.tagged_explore_novel_or_negative?'; '+d.tagged_explore_novel_or_negative+' tagged explore_novel or negative result':'')+(d.day==='Apr 30'?' (the H100 workers were offline for 27 hours)':'')+'.'}
  $('f2Leg').innerHTML='<span class="small"><span style="color:var(--c1)">■</span> results &nbsp; <span style="color:var(--c3)">■</span> insights, hypotheses, reports &nbsp; <span style="color:var(--c5)">■</span> verifications &nbsp; <span style="color:var(--bad)">●</span> tagged explore_novel or negative result that day</span>';
  onTab('t-read',()=>fit(host,draw));fit(host,draw);info();})();

// The descent: Table 4 as a step animation, the whole drop and the last 0.03 with the hardware noise band
(function(){if(!$('dsc'))return;
  const full=T4.map((r,i)=>({t:(r.when||'Random initialization')+(r.acct?', '+r.acct:''),c:r.change+'. <b>'+r.bpb.toFixed(4)+' bpb</b>'+(i===0?', the baseline every share below is measured from.':r.bpb>RAND?': worse than doing nothing, published as a negative result with an explanation.':', '+(100*(RAND-r.bpb)/DESC).toFixed(1)+'% of the total descent.')+(r.anc?' On the winner\'s recorded ancestry.':i>0?' A predecessor by description, not a recorded parent.':'')}));
  const zr=T4.slice(4);
  const zoom=zr.map((r,i)=>({t:r.when+', '+r.acct,c:r.change+'. <b>'+r.bpb.toFixed(4)+'</b>'+(i?', '+(1e3*(zr[i-1].bpb-r.bpb)).toFixed(1)+' thousandths below the row before.':'.')+' The shaded band is the cross-hardware spread the paper reports (most within 5 × 10⁻⁴, at most 1.2 × 10⁻³).'}));
  function draw(m,k,e,w){const H=Math.round(Math.min(330,Math.max(240,w*.42))),pl=48,pr=12,pt=14,pb=34;
    const rows=m==='full'?T4:zr,x0=m==='full'?-8:0,x1=290,y0=m==='full'?0.85:1.895,y1=m==='full'?4.85:1.936;
    const xs=h=>pl+(w-pl-pr)*(h-x0)/(x1-x0),ys=v=>pt+(H-pt-pb)*(1-(v-y0)/(y1-y0));let s='';
    const yt=m==='full'?[1,1.5,2,2.5,3,3.5,4,4.5]:[1.90,1.91,1.92,1.93];
    yt.forEach(v=>{s+=ln2(pl,ys(v),w-pr,ys(v),'var(--line)')+tx(pl-5,ys(v)+4,v.toFixed(m==='full'?1:2),{fs:11,a:'end',c:'var(--mute)'})});
    [[0,'Apr 27'],[48,'Apr 29'],[96,'May 1'],[144,'May 3'],[192,'May 5'],[240,'May 7']].forEach(([h,l])=>{if(h>=x0)s+=tx(xs(h),H-pb+15,l,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx(12,pt+(H-pt-pb)/2,'bits per byte',{fs:11,a:'middle',c:'var(--mute)'}).replace('<text','<text transform="rotate(-90 12 '+(pt+(H-pt-pb)/2)+')"');
    const may2=hrs('May 2 21:20');s+=ln2(xs(may2),pt,xs(may2),H-pb,'var(--c6)',{da:'4 3'})+tx(xs(may2)+3,pt+10,'May 2 views + prompt',{fs:11,c:'var(--c6)'});
    if(m==='full'){s+=ln2(pl,ys(RAND),w-pr,ys(RAND),'var(--bad)',{da:'5 4'})+tx(w-pr,ys(RAND)-4,'random init 3.39',{fs:11,a:'end',c:'var(--bad)'});
      s+=ln2(pl,ys(1.0),w-pr,ys(1.0),'var(--good)',{da:'5 4'})+tx(w-pr,ys(1.0)-4,'trained GPT-2 124M ≈ 1.0',{fs:11,a:'end',c:'var(--good)'})}
    // best-so-far staircase up to the current step
    let best=m==='full'?RAND:zr[0].bpb,path='',lastx=null;const pts=[];
    rows.forEach((r,i)=>{if(i>k)return;const h=r.when?hrs(r.when):-6;const op=i<k?1:e;pts.push({x:xs(h),y:ys(r.bpb),r,i,op})});
    pts.forEach(p=>{if(p.r.bpb<best||(m!=='full'&&p.i===0)){if(lastx!==null)path+=' L'+p.x.toFixed(1)+','+ys(best).toFixed(1);best=Math.min(best,p.r.bpb);path+=(path?' L':'M')+p.x.toFixed(1)+','+ys(best).toFixed(1);lastx=p.x}});
    if(path)s+='<path d="'+path+' L'+(w-pr)+','+ys(best).toFixed(1)+'" fill="none" stroke="var(--acc)" stroke-width="1.6" opacity=".7"/>';
    if(m!=='full'){const yb=ys(best);[[1.2e-3,.12],[5e-4,.22]].forEach(([d,o])=>{s+=rc(pl,ys(best+d),w-pl-pr,ys(best-d)-ys(best+d),'var(--c5)',{r:0,op:o})})}
    pts.forEach(p=>{const c=p.r.bpb>RAND?'var(--bad)':p.r.anc?'var(--acc)':'var(--c4)';s+=G(p.op,'<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(p.i===k?6:4.5)+'" fill="'+c+'" stroke="var(--bg)" stroke-width="1.2"/>')});
    const cur=pts[pts.length-1];if(cur){const lab=cur.r.bpb.toFixed(4);const right=cur.x<w*.6;s+=G(e,tx(cur.x+(right?9:-9),cur.y-8,lab,{fs:12,a:right?'start':'end',w:600}))}
    return svgW(w,H,s,'Table 4 milestones over time')}
  function counters(m,k){const rows=m==='full'?T4:zr;const seen=rows.slice(0,k+1);const best=Math.min(...seen.map(r=>r.bpb),m==='full'?RAND:9);
    const r=rows[k];return stat('best so far',best.toFixed(4)+' bpb','')+stat('share of the 3.39 to 1.899 descent',(100*(RAND-best)/DESC).toFixed(1)+'%','(3.3923 − best) / 1.4933')+stat('random-to-GPT-2 gap closed',(100*(RAND-best)/(RAND-1)).toFixed(1)+'%','against ≈ 1.0 for GPT-2 124M')+stat('time',r.when?r.when+' UTC':'before the run','')}
  makeAnim({id:'dsc',modes:{full,zoom},mode:'full',draw,counters,dur:2200});})();

// Stage B band map (Table 3, Table 5): which slice of the 672-dimensional hidden state each layer reads and writes
(function(){const host=$('bdSvg');if(!host)return;
  const band=k=>k<6?[1+96*k,97+96*k]:[576,672];
  const L={a0:{r:0,w:[[0,.21]]},a2:{r:1,w:[[1,.02]]},a4:{r:2,w:[[2,.0425]]},a6:{r:3,w:[[3,-.0025]]},a8:{r:4,w:[[4,-.002]]},a10:{r:5,w:[[5,-.0025]]},a12:{r:6,w:[[6,-.0025]]},
    s1:{r:0,w:[[0,-.115],[2,.01],[3,.005]],k:'(1.85, 1.65, 0.20, −2.70)'},s3:{r:1,w:[[1,-.06],[2,.01],[3,.005]],k:'uniform ¼'},s5:{r:2,w:[[2,.01]],k:'uniform ¼'},s7:{r:0,w:[[2,.0075],[3,.005]],k:'uniform ¼'},
    s9:{r:0,w:[[2,.01]],k:'uniform ¼'},s11:{r:0,w:[[2,.01]],k:'uniform ¼'},s13:{r:0,w:[[2,.01]],k:'uniform ¼'}};
  let cur='s1';
  function draw(w){const H=150,pl=8,pr=8,xs=d=>pl+(w-pl-pr)*d/672;let s='';const sp=L[cur];
    s+=rc(xs(0),40,Math.max(2,xs(1)-xs(0)),34,'var(--bad)',{r:1});s+=tx(xs(0),34,'dim 0: u',{fs:11,c:'var(--bad)'});
    for(let k=0;k<7;k++){const [a,b]=band(k);const isR=sp.r===k,wr=sp.w.find(x=>x[0]===k);
      s+=rc(xs(a)+1,40,xs(b)-xs(a)-2,34,isR?'var(--acc)':wr?'var(--c5)':'var(--soft)',{r:2,s:'var(--line)',op:isR||wr?.85:1});
      s+=tx((xs(a)+xs(b))/2,62,'B'+k,{fs:12,a:'middle',w:600,c:isR||wr?'var(--bg)':'var(--ink)'});
      s+=tx((xs(a)+xs(b))/2,90,(xs(b)-xs(a)>64?a+'..'+(b-1):String(a)),{fs:11,a:'middle',c:'var(--mute)'});
      if(wr)s+=tx((xs(a)+xs(b))/2,108,'× '+wr[1],{fs:11,a:'middle',c:'var(--ink)'});}
    host.innerHTML=svgW(w,H-30,s,'Stage B bands');$('bdOut').innerHTML=cur[0]==='a'?'<b>Attention layer '+cur.slice(1)+'</b>: uniform causal mean-pool (W<sub>q</sub> = W<sub>k</sub> = 0) over band B'+sp.r+', written back to the same band.':'<b>SSM layer '+cur.slice(1)+'</b>: gated depthwise causal convolution over band B'+sp.r+', kernel '+sp.k+', data-dependent gate zeroed to a constant.'}
  $('bdSel').innerHTML=Object.keys(L).map(k=>'<button data-m="'+k+'"'+(k===cur?' class="on"':'')+'>'+(k[0]==='a'?'Attn ':'SSM ')+k.slice(1)+'</button>').join('');
  segBind('bdSel',m=>{cur=m;draw(host.clientWidth)});
  onTab('t-read',()=>fit(host,draw));fit(host,draw);})();

// predict reveals
PRED_REVEAL['pr-copy']=()=>{const host=$('prCopyB');const rows=[['Random initialization',3.3923,'var(--mute)'],['Slice-copy GPT-2 and Mamba weights',4.6784,'var(--bad)'],['Unigram prior from GPT-2\'s predictions (30 minutes later)',2.5151,'var(--good)']];
  fit(host,w=>{const bh=22,H=rows.length*(bh+20)+6,lw=w;let s='';rows.forEach(([n,v,c],i)=>{const y=i*(bh+20)+16;s+=tx(0,y-3,n,{fs:12})+rc(0,y,(w-60)*v/4.8,bh-6,c,{r:2})+tx((w-60)*v/4.8+6,y+12,v.toFixed(4),{fs:12})});host.innerHTML=svgW(w,H,s,'first attempts')})};
PRED_REVEAL['pr-98']=()=>{const host=$('pr98B');
  fit(host,w=>{const H=70,pl=4,pr=4,xs=f=>pl+(w-pl-pr)*f;const f18=(RAND-1.9304)/DESC;let s='';
    s+=rc(xs(0),18,xs(f18)-xs(0),24,'var(--acc)',{r:2})+rc(xs(f18),18,xs(1)-xs(f18),24,'var(--c2)',{r:2});
    s+=tx(xs(0)+4,34,'first 18 scored contributions: '+(100*f18).toFixed(1)+'%',{fs:12,c:'var(--bg)',w:600});
    s+=tx(xs(1),62,'remaining 1,106: '+(100*(1-f18)).toFixed(1)+'% (0.031 bpb)',{fs:12,a:'end'});
    host.innerHTML=svgW(w,H,s,'share of the descent')})};
