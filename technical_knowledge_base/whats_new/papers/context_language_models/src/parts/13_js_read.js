// ---- The paper tab: recomputed constants, predict reveals, the GRPO efficiency advantage, Figure 5 rebuilt ----
(function(){
if(!window.PAPER||!$('t-read'))return;
const RC=PAPER.rc,TB=PAPER.tables;
const C=window.CLMR?CLMR.C:null;
if(C&&$('cConst'))$('cConst').innerHTML='<span class="small mute">Recomputed here from the model shape: C<sub>token</sub> = '+(C.c_token/1e9).toFixed(2)+' × 10⁹ ('+(C.mlp/1e9).toFixed(2)+' + '+(C.attn_proj/1e9).toFixed(2)+' + '+(C.gdn_proj/1e9).toFixed(2)+') and C<sub>attn</sub> = '+(C.c_attn/1e5).toFixed(2)+' × 10⁵: both reproduce, independently.</span>';
const ok=RC.checks.filter(c=>c.ok).length;
if($('trustN'))$('trustN').textContent=ok+' of '+RC.checks.length+' checks against printed numbers reproduce';
if($('seGap'))$('seGap').textContent=RC.noise.bcp_se_gap.toFixed(1);
if($('zGap'))$('zGap').textContent=RC.noise.bcp_z.toFixed(1);
if($('q3se'))$('q3se').textContent=RC.noise.rl_se_gap.toFixed(1);

// horizontal bars with a shared scale: rows [{n, v, c, lab}]
function hbars(el,rows,max,unit){fit(el,w=>{const W=w,nl=W<520?92:150,rh=26;let o='';
  rows.forEach((r,i)=>{const y=i*rh+4,bw=(W-nl-70)*r.v/max;o+=tx(nl-6,y+15,r.n,{fs:11,a:'end'});o+=rc(nl,y+3,Math.max(1,bw),rh-8,r.c,{r:3,op:.85});o+=tx(nl+bw+5,y+15,r.lab||r.v,{fs:11,c:'var(--mute)'})});
  el.innerHTML=svgW(W,rows.length*rh+8,o,'bars')})}
PRED_REVEAL.pq1=()=>{const b=R=>CLMR.bill(20000,500,R).total,pr={18000:'1.41',10000:'5.74',0:'10.81'};
  hbars($('q1Bars'),[[18000,'Append only'],[10000,'Edit mid-context'],[0,'Edit at start']].map(([R,n])=>({n,v:b(R)/1e14,c:R?'var(--c1)':'var(--bad)',lab:(b(R)/1e14).toFixed(2)+' × 10¹⁴ (paper: '+pr[R]+')'})),11.5)};
// stacked bars of prompt-token shares (Figure 14)
function stack(el,rows){const segs=[['hit','prefix-cache hit','var(--c1)'],['strip','reused: after reasoning stripping','var(--c6)'],['edit','reused: after context edits','var(--c3)'],['pre','prefilled','var(--bad)']];
  fit(el,w=>{const W=w,nl=W<520?96:170,rh=28;let o='';
    rows.forEach((r,i)=>{const y=i*rh+2;let x=nl;o+=tx(nl-6,y+16,r.n,{fs:11,a:'end'});
      segs.forEach(([k,,c])=>{const v=r[k]||0,bw=(W-nl-4)*v/100;if(!v)return;o+=rc(x,y+3,bw,rh-8,c,{r:2,op:.85});if(bw>30)o+=tx(x+bw/2,y+16,v.toFixed(1),{fs:11,a:'middle',c:'#fff'});x+=bw})});
    const lg=legend(segs.map(s=>[s[1],s[2]]),4,rows.length*rh+18,W-8);el.innerHTML=svgW(W,rows.length*rh+18+lg.h,o+lg.s,'prompt-token shares')})}
PRED_REVEAL.pq2=()=>stack($('q2Bars'),[{n:'All turns, standard',hit:72.9,pre:27.1},{n:'All turns, SCR',hit:73.9,strip:5.3,edit:2.5,pre:18.3},{n:'Edited turns, standard',hit:24.2,pre:75.8},{n:'Edited turns, SCR',hit:29.9,strip:19.3,edit:8.9,pre:41.8}]);
PRED_REVEAL.pq3=()=>{const el=$('q3Bars'),T=RC.T2,se=p=>100*Math.sqrt(p/100*(1-p/100)/830);
  fit(el,w=>{const W=w,pl=40,pb=40,H=200,ch=H-pb-10,Y=v=>10+ch-ch*v/50;let o='';
    [0,10,20,30,40,50].forEach(v=>{o+=ln2(pl,Y(v),W-4,Y(v),'var(--line)');o+=tx(pl-5,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    const g=[['Summary','var(--c2)'],['CLM','var(--c1)']],cw=(W-pl-10)/2;
    g.forEach(([m,c],i)=>{T[m].acc.forEach((v,j)=>{const x=pl+i*cw+cw*(0.18+j*0.36),bw=cw*0.3,s=se(v);
      o+=rc(x,Y(v),bw,Y(0)-Y(v),c,{r:2,op:j?0.9:0.4});o+=ln2(x+bw/2,Y(v+s),x+bw/2,Y(v-s),'var(--ink)',{sw:1.4});
      o+=tx(x+bw/2,Y(v+s)-5,v.toFixed(1),{fs:11,a:'middle'});o+=tx(x+bw/2,H-pb+15,j?'after RL':'before',{fs:11,a:'middle',c:'var(--mute)'})});
      o+=tx(pl+i*cw+cw/2,H-pb+31,m+(m==='CLM'?' (1.52 → 1.34 PFLOPs)':' (4.01 → 2.19 PFLOPs)'),{fs:11,a:'middle'})});
    el.innerHTML=svgW(W,H,o,'Table 2 with one standard error')})};

// the success-gated efficiency advantage (Eq. 6), live
(function(){if(!$('grpo'))return;const cost=[1.20,0.85,1.60,1.05,2.10,0.90,1.45,1.30],succ=[1,0,1,1,0,1,0,1],w=0.25;
  const B=$('grpoB');B.innerHTML=cost.map((c,i)=>'<button data-i="'+i+'" aria-pressed="'+(succ[i]?'true':'false')+'"></button>').join('');
  function adv(){const n=succ.length,mu=succ.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(succ.reduce((a,r)=>a+(r-mu)**2,0)/n);
    const sIdx=succ.map((s,i)=>s?i:-1).filter(i=>i>=0),cb=sIdx.length?sIdx.reduce((a,i)=>a+cost[i],0)/sIdx.length:0;
    return cost.map((c,i)=>{const ao=sd>0?(succ[i]-mu)/sd:0,ae=succ[i]&&sIdx.length>=2?Math.max(-1,Math.min(1,(cb-c)/cb)):0;return {ao,ae,a:ao+w*ae,cb}})}
  window.CLMR=window.CLMR||{};CLMR.grpo=()=>adv();
  function draw(wd){const A=adv(),W=wd,pl=34,H=190,mid=95,sc=60,cw=(W-pl-6)/8;let o='';
    [-1.5,-1,-0.5,0,0.5,1,1.5].forEach(v=>{o+=ln2(pl,mid-v*sc,W-4,mid-v*sc,v?'var(--line)':'var(--mute)');if(Number.isInteger(v*2)&&Math.abs(v)!==1.5)o+=tx(pl-4,mid-v*sc+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    A.forEach((d,i)=>{const x=pl+i*cw+cw*0.15,bw=cw*0.32;
      o+=rc(x,Math.min(mid,mid-d.ao*sc),bw,Math.abs(d.ao*sc),'var(--mute)',{r:1,op:.55});
      o+=rc(x+bw+2,Math.min(mid,mid-w*d.ae*sc),bw,Math.max(0.5,Math.abs(w*d.ae*sc)),'var(--c1)',{r:1,op:.9});
      o+=ln2(x-2,mid-d.a*sc,x+2*bw+4,mid-d.a*sc,'var(--ink)',{sw:2});
      o+=tx(x+bw,H-6,'#'+(i+1),{fs:11,a:'middle',c:'var(--mute)'})});
    const lg=legend([['outcome advantage','var(--mute)'],['0.25 × efficiency advantage','var(--c1)'],['total','var(--ink)']],pl,14,W-pl-4);
    $('grpoSvg').innerHTML=svgW(W,H+lg.h,'<g transform="translate(0,'+lg.h+')">'+o+'</g>'+lg.s,'GRPO advantages per rollout');
    B.querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('ok1',!!succ[i]);b.setAttribute('aria-pressed',succ[i]?'true':'false');b.innerHTML='#'+(i+1)+' '+(succ[i]?'solved':'failed')+'<br><span class="small mute">'+cost[i].toFixed(2)+' PFLOPs</span>'});
    const ns=succ.reduce((a,b)=>a+b,0);
    $('grpoNote').innerHTML=ns>=2?'c̄ over the '+ns+' successful rollouts = '+A[0].cb.toFixed(3)+' PFLOPs. Solved and cheaper than c̄ gets a bonus, solved and dearer a penalty; failures get no efficiency term at all.':(ns===8||ns===0?'Every rollout has the same outcome: the outcome advantage is 0 (dynamic sampling drops such groups, Appendix E)':'Fewer than two successes: no efficiency term for anyone (Eq. 6)')+(ns===8&&ns>=2?'; only the efficiency term is left to rank them.':'.')}
  B.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;succ[+b.dataset.i]^=1;refit($('grpoSvg'))});
  fit($('grpoSvg'),draw)})();

// Figure 5 and Figure 19, rebuilt
(function(){if(!$('f5card'))return;let bench='bcp',model='27b';
  const COL={CLM:'var(--c1)'};
  function draw(w){const src=model==='27b'?TB.f5.data[bench]:TB.f19.data[bench],amb=model==='27b'?TB.f5.amb[bench]:TB.f19.amb[bench];
    const pts=Object.entries(src).map(([m,v])=>({m,acc:v[0],pf:v[1]}));const brk=pts.some(p=>p.pf===null);
    const W=w,H=W<520?260:300,pl=40,pr=12,pt=12,pb=40;const xmax=brk?3.6:Math.max(...pts.map(p=>p.pf))*1.12,ymax=Math.ceil((Math.max(...pts.map(p=>p.acc))+8)/10)*10;
    const X=v=>pl+(W-pl-pr)*(v===null?3.4:v)/xmax,Y=v=>pt+(H-pt-pb)*(1-v/ymax);let o='';
    for(let v=0;v<=ymax;v+=ymax>50?20:10){o+=ln2(pl,Y(v),W-pr,Y(v),'var(--line)');o+=tx(pl-5,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})}
    const step=xmax>6?2:xmax>2.5?1:0.5;for(let v=0;v<=(brk?3:xmax);v+=step)o+=tx(X(v),H-pb+15,String(+v.toFixed(1)),{fs:11,a:'middle',c:'var(--mute)'});
    if(brk){o+=ln2(X(3.2),pt,X(3.2),H-pb,'var(--mute)',{da:'3 3'});o+=tx(X(3.4),H-pb+15,'past 3',{fs:11,a:'middle',c:'var(--mute)'})}
    o+=tx((pl+W-pr)/2,H-6,'prefix-reuse PFLOPs per question',{fs:11,a:'middle',c:'var(--mute)'});
    o+=tx(12,(pt+H-pb)/2,'accuracy (%)',{fs:11,a:'middle',c:'var(--mute)'}).replace('<text','<text transform="rotate(-90 12 '+((pt+H-pb)/2)+')"');
    const fr=pts.filter(p=>p.pf!==null).sort((a,b)=>a.pf-b.pf||b.acc-a.acc);let best=-1;const front=[];fr.forEach(p=>{if(p.acc>best){front.push(p);best=p.acc}});
    o+='<polyline fill="none" stroke="var(--c1)" stroke-width="1.3" stroke-dasharray="4 3" points="'+front.map(p=>X(p.pf).toFixed(1)+','+Y(p.acc).toFixed(1)).join(' ')+'"/>';
    const lp=placeLabels(pts.map(p=>({x:X(p.pf),y:Y(p.acc),t:p.m+' '+p.acc.toFixed(1),fs:11})),W,H-pb);
    pts.forEach((p,i)=>{o+='<circle cx="'+X(p.pf).toFixed(1)+'" cy="'+Y(p.acc).toFixed(1)+'" r="5.5" fill="'+(p.m==='CLM'?'var(--c1)':'var(--bg)')+'" stroke="'+(p.m==='CLM'?'var(--c1)':'var(--ink)')+'" stroke-width="1.3"><title>'+p.m+': '+p.acc.toFixed(1)+'%, '+(p.pf===null?'past the axis break':p.pf.toFixed(2)+' PFLOPs')+'</title></circle>';
      o+=tx(lp[i].lx,lp[i].ly,lp[i].t,{fs:11,a:lp[i].la,w:p.m==='CLM'?600:null})});
    $('f5Svg').innerHTML=svgW(W,H,o,'Accuracy against prefix-reuse PFLOPs');
    $('f5Note').innerHTML=(model==='27b'?'Figure 5':'Figure 19, top row')+', read from the vector paths. '+(amb&&amb.length?'Labels for '+amb.join(' and ')+' sit over two nearby circles and could be swapped. ':'')+(brk?'CLM and Summary sit past the panel\'s axis break (beyond 3 PFLOPs); their cost cannot be read. ':'')+'Dashed: the Pareto frontier of the points shown.'}
  segBind('f5M',m=>{bench=m;$('f5M').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('f5Svg'))});
  segBind('f5S',m=>{model=m;$('f5S').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('f5Svg'))});
  fit($('f5Svg'),draw)})();
})();
