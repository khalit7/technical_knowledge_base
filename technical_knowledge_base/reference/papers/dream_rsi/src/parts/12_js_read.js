// ---- The paper tab: the round-by-round race (real decoded numbers) and the predict reveals ----
const TB=PAPER.tables, RC=PAPER.rc;
const CF='var(--c2)', CD='var(--c1)'; // fixed exploration, Dream-RSI
const nf=(v,d)=>v.toLocaleString('en-GB',{minimumFractionDigits:d,maximumFractionDigits:d});
// tick values at a round step (1, 2 or 5 times a power of ten) inside [lo, hi]
function niceTicks(lo,hi,n){const r=(hi-lo)/n,p=Math.pow(10,Math.floor(Math.log10(r))),m=r/p,st=(m<1.5?1:m<3?2:m<7?5:10)*p,out=[];for(let v=Math.ceil(lo/st-1e-9)*st;v<=hi+1e-9;v+=st)out.push(+v.toFixed(10));return out}
// a line chart of step series (one point per round, held until the next): series [{pts:[[x,y]..],c,n,da,upTo}]
function stepChart(w,series,o){const H=o.H||220,pl=50,pr=12,pt=14,pb=34,W=w;
  const X=v=>pl+(W-pl-pr)*v/o.xmax,Y=v=>pt+(H-pt-pb)*(1-(v-o.ymin)/(o.ymax-o.ymin));
  let s='';niceTicks(o.ymin,o.ymax,4).forEach(v=>{s+=ln2(pl,Y(v),W-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,o.yf?o.yf(v):nf(v,2),{fs:11,a:'end',c:'var(--mute)'})});
  const xt=niceTicks(0,o.xmax,w<480?3:5);xt.forEach((v,i)=>{const last=X(v)>W-pr-14;s+=ln2(X(v),H-pb,X(v),H-pb+4,'var(--mute)')+tx(X(v)+(last?pr-1:0),H-pb+16,nf(v,0),{fs:11,a:last?'end':'middle',c:'var(--mute)'})});
  s+=tx((pl+W-pr)/2,H-3,o.xl,{fs:11,a:'middle',c:'var(--mute)'});
  s+='<text x="11" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+((pt+H-pb)/2)+')">'+o.yl+'</text>';
  (o.hl||[]).forEach(h=>{s+=ln2(pl,Y(h.y),W-pr,Y(h.y),h.c||'var(--mute)',{da:'3 3'})+(h.t?tx(W-pr-2,Y(h.y)-4,h.t,{fs:11,a:'end',c:h.c||'var(--mute)'}):'')});
  (o.vl||[]).forEach(h=>{s+=ln2(X(h.x),pt,X(h.x),H-pb,h.c||'var(--mute)',{da:'3 3'})+(h.t?tx(X(h.x)+(h.a==='end'?-3:3),pt+10+(h.dy||0),h.t,{fs:11,a:h.a||'start',c:h.c||'var(--mute)'}):'')});
  series.forEach(S=>{const P=S.pts.slice(0,S.upTo==null?S.pts.length:S.upTo);if(!P.length)return;let d='M'+X(P[0][0]).toFixed(1)+' '+Y(P[0][1]).toFixed(1);
    for(let i=1;i<P.length;i++)d+=' H'+X(P[i][0]).toFixed(1)+' V'+Y(P[i][1]).toFixed(1);
    s+='<path d="'+d+'" fill="none" stroke="'+S.c+'" stroke-width="2.2"'+(S.da?' stroke-dasharray="'+S.da+'"':'')+'/>';
    P.forEach(p=>{s+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="3.2" fill="'+S.c+'"/>'})});
  if(o.leg){const L=legend(o.leg,pl,H+14,W-pl);s+=L.s;return svgW(W,H+L.h+4,s,o.label)}
  return svgW(W,H,s,o.label)}

// ---- the race: one round per step, both runs on one cost axis ----
(function(){
  const host=$('rc');if(!host)return;
  const T=()=>$('rcTask').value;
  function data(t){if(t==='pro'||t==='flash'){const F=TB.fig3b[t];return{f:F.fixed,d:F.dream,low:true,unit:'agent calls',yl:'held-out runtime, ms',lab:t==='pro'?'Lasso, Gemini-3.1-Pro':'Lasso, Gemini-3.7-Flash'}}
    const F=TB.fig4[t];return{f:F.fixed,d:F.dream,low:false,unit:'generations',yl:'round-best speed, 1/ms',lab:t}}
  const per=a=>a.map((p,i)=>p[0]-(i?a[i-1][0]:0));
  function caption(t,k){const D=data(t),f=D.f[Math.min(k,D.f.length-1)],d=D.d[Math.min(k,D.d.length-1)],pf=per(D.f),pd=per(D.d);
    const v=x=>D.low?nf(x,1)+' ms':nf(x,4)+' per ms';
    let c='';
    if(k<D.f.length&&k<D.d.length)c='Fixed exploration spends '+pf[k]+' '+D.unit+' (total '+nf(f[0],0)+') and its best program reaches '+v(f[1])+'; Dream-RSI spends '+pd[k]+' (total '+nf(d[0],0)+') and reaches '+v(d[1])+'.';
    else if(k<D.f.length)c='Dream-RSI has finished ('+D.d.length+' rounds, '+nf(D.d[D.d.length-1][0],0)+' '+D.unit+'). Fixed exploration spends another '+pf[k]+' and reaches '+v(f[1])+'.';
    else c='Fixed exploration has finished. Dream-RSI spends '+pd[k]+' and reaches '+v(d[1])+'.';
    if(k===0)c+=' Round 1 is identical by construction: both start from the same hand-written parallel-refine policy.';
    const N={'ConvMax':{8:' The whole final gap comes from this one round: Dream-RSI jumps from 0.2786 to 0.4310 after trailing fixed exploration since round 3.'},
      'VGG16':{8:' Dream-RSI stops at 408 generations, 1.1% below fixed exploration\'s final 0.5376; fixed passed 0.5319 at 770.'},
      'LayerNorm':{7:' Dream-RSI stops after 8 rounds at 553 generations; fixed exploration had already passed its 1.1223 at 660 and ends at 1.1274.'},
      'ConvDiv':{3:' Dream-RSI\'s biggest jump (0.855 to 1.403) comes in the round where it spends 80 attempts against fixed exploration\'s 110.',8:' Final: 1.8976 against fixed exploration\'s 0.9092 at 770 generations (the paper\'s 2.09×) or 1.2820 at 990 (1.48×).'},
      'pro':{1:' Dream-RSI spends only 9 calls this round, and its held-out runtime gets slightly worse.',3:' After four rounds Dream-RSI\'s solver is slower (5,706 ms) than either method\'s round-1 solver: held-out runtime is not monotone in either run.',4:' The last round decides the comparison: 2,931.0 against 3,587.0 ms.'},
      'flash':{1:' From here Dream-RSI is ahead at every round, at about half the calls per round.'}};
    return c+((N[t]||{})[k]||'')}
  function steps(){const D=data(T()),n=Math.max(D.f.length,D.d.length);return [...Array(n)].map((_,k)=>({t:'Round '+(k+1),c:caption(T(),k)}))}
  const modes={both:[],fixed:[],dream:[]};
  const fill=()=>{const s=steps();['both','fixed','dream'].forEach(m=>{modes[m].length=0;s.forEach(x=>modes[m].push(x))})};fill();
  function draw(m,k,e,w){const D=data(T()),xmax=Math.max(D.f[D.f.length-1][0],D.d[D.d.length-1][0]);
    const sf=m!=='dream',sd=m!=='fixed';
    // budget lanes
    const pl=50,pr=12,W=w,X=v=>pl+(W-pl-pr)*v/xmax;let s='';
    const lane=(arr,y,c,name,show)=>{let o=tx(pl-6,y+13,name,{fs:11,a:'end',c:'var(--mute)'});if(!show)return o;const p=per(arr);let x0=0;
      p.forEach((g,i)=>{const on=i<=k;o+=rc(X(x0),y,Math.max(1,X(x0+g)-X(x0)-1),18,c,{r:2,op:on?(i%2?0.65:0.9):0.12});
        if(on&&X(x0+g)-X(x0)>26)o+=tx((X(x0)+X(x0+g))/2,y+13,String(g),{fs:11,a:'middle',c:'var(--bg)'});x0+=g});return o};
    s+=lane(D.f,4,CF,'Fixed',sf)+lane(D.d,28,CD,'Dream',sd);
    const top=svgW(W,50,s,'Budget per round');
    let ys=[];if(sf)D.f.forEach(p=>ys.push(p[1]));if(sd)D.d.forEach(p=>ys.push(p[1]));
    const lo=Math.min(...ys),hi=Math.max(...ys),pad=(hi-lo)*0.12||0.05;
    const ser=[];if(sf)ser.push({pts:D.f,c:CF,upTo:k+1});if(sd)ser.push({pts:D.d,c:CD,upTo:k+1});
    const ch=stepChart(w,ser,{xmax,ymin:Math.max(0,lo-pad),ymax:hi+pad,xl:'cumulative '+D.unit+' (to scale)',yl:D.yl+(D.low?' (lower is better)':''),yf:D.low?(v=>nf(v,0)):(v=>nf(v,2)),
      leg:[['Fixed exploration',CF],['Dream-RSI',CD]],label:D.lab+' round by round'});
    return top+ch}
  function counters(m,k){const D=data(T()),f=D.f[Math.min(k,D.f.length-1)],d=D.d[Math.min(k,D.d.length-1)];const v=x=>D.low?nf(x,1)+' ms':nf(x,4);
    return stat('Fixed: '+D.unit,nf(f[0],0),'value '+v(f[1]))+stat('Dream-RSI: '+D.unit,nf(d[0],0),'value '+v(d[1]))+stat('Dream-RSI cost ÷ fixed',nf(d[0]/f[0],2)+'×','so far')+stat(D.low?'Dream-RSI runtime ÷ fixed':'Dream-RSI speed ÷ fixed',nf(d[1]/f[1],2)+'×',D.low?'below 1 is better':'above 1 is better')}
  const A=makeAnim({id:'rc',modes,mode:'both',draw,counters,dur:2600});
  $('rcTask').addEventListener('change',()=>{fill();A.st.k=0;A.st.t=1;A.st.lk=-1;A.draw()});
})();

// ---- predict 1: per-dataset ratios, Dream-RSI ÷ fixed exploration ----
PRED_REVEAL.pq1=function(){const host=$('pq1Bars');const L=TB.lasso,R=k=>L.rows.find(r=>r.method===k[0]&&r.model===k[1]);
  const fp=R(['Recursive Fixed Exploration','Gemini-3.1-Pro']),dp=R(['Dream-RSI','Gemini-3.1-Pro']),ff=R(['Recursive Fixed Exploration','Gemini-3.7-Flash']),df=R(['Dream-RSI','Gemini-3.7-Flash']);
  fit(host,w=>{const rows=[];L.datasets.forEach((d,i)=>{rows.push([d,dp.ms[i]/fp.ms[i],df.ms[i]/ff.ms[i]])});
    rows.push(['Average (arith.)',dp.avg/fp.avg,df.avg/ff.avg]);rows.push(['Geometric mean',RC.gmean.dr_p/RC.gmean.fix_p,RC.gmean.dr_f/RC.gmean.fix_f]);
    const pl=Math.min(118,w*0.3),pr=44,rh=30,H=rows.length*rh+40,lg=Math.log,lim=lg(1.8),X=v=>pl+(w-pl-pr)*(0.5+lg(v)/(2*lim));
    let s=tx(X(1),12,'same speed',{fs:11,a:'middle',c:'var(--mute)'})+ln2(X(1),16,X(1),H-22,'var(--mute)');
    [0.6,0.8,1.25,1.6].forEach(v=>{s+=ln2(X(v),16,X(v),H-22,'var(--line)')+tx(X(v),H-8,v+'×',{fs:11,a:'middle',c:'var(--mute)'})});
    rows.forEach((r,i)=>{const y=22+i*rh;s+=tx(pl-6,y+15,r[0],{fs:11,a:'end',w:i>=6?600:400});
      [[r[1],CD,0],[r[2],'var(--c3)',12]].forEach(([v,c,dy])=>{const x0=X(1),x1=X(Math.max(0.55,Math.min(1.8,v)));s+=rc(Math.min(x0,x1),y+dy,Math.abs(x1-x0),10,c,{r:2});s+=tx(x1+(v>1?4:-4),y+dy+9,nf(v,2),{fs:11,a:v>1?'start':'end',c:'var(--mute)'})})});
    const L2=legend([['Gemini-3.1-Pro',CD],['Gemini-3.7-Flash','var(--c3)']],pl,H+8,w-pl);
    host.innerHTML=svgW(w,H+L2.h+6,s+L2.s,'Dream-RSI runtime divided by fixed exploration runtime per dataset')+'<p class="small mute">Dream-RSI runtime ÷ fixed-exploration runtime; left of "same speed" means Dream-RSI is faster. Log scale. From Figure 3(a).</p>'})};

// ---- predict 2: VGG16 at matched performance ----
PRED_REVEAL.pq2=function(){const F=TB.fig4.VGG16,yd=F.dream[F.dream.length-1][1];
  fit($('pq2Plot'),w=>{$('pq2Plot').innerHTML=stepChart(w,[{pts:F.fixed,c:CF},{pts:F.dream,c:CD}],{xmax:1000,ymin:0.35,ymax:0.55,xl:'generations',yl:'VGG16 speed, 1/ms',
    hl:[{y:yd,t:'Dream-RSI final '+nf(yd,4),c:CD}],vl:[{x:408,t:'408',c:CD,a:'end'},{x:770,t:'770',c:CF,dy:14}],leg:[['Fixed exploration',CF],['Dream-RSI',CD]],label:'VGG16 curves'})})};
