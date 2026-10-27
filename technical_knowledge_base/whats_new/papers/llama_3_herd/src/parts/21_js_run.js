// ---- Run the 16K-GPU job: the mesh, memory per GPU, the pipeline schedule, the 54 days ----
(function(){if(!$('mxSvg'))return;
  const sty=(id,f)=>{const el=$(id);el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});f(b.dataset.m)}))};
  // 1. Mesh: rank -> [tp, cp, pp, dp] and where each group's members sit
  const CFG=TB.t4.rows.map(r=>({G:num(r[0]),TP:num(r[1]),CP:num(r[2]),PP:num(r[3]),DP:num(r[4]),S:r[5]}));
  function mesh(w){const c=CFG[+$('mxC').value],r=Math.min(+$('mxR').value,c.G-1),sl=$('mxR');sl.max=c.G-1;
    const tp=r%c.TP,cp=Math.floor(r/c.TP)%c.CP,pp=Math.floor(r/(c.TP*c.CP))%c.PP,dp=Math.floor(r/(c.TP*c.CP*c.PP));
    const base={TP:r-tp,CP:r-cp*c.TP,PP:r-pp*c.TP*c.CP,DP:r-dp*c.TP*c.CP*c.PP},stride={TP:1,CP:c.TP,PP:c.TP*c.CP,DP:c.TP*c.CP*c.PP},size={TP:c.TP,CP:c.CP,PP:c.PP,DP:c.DP};
    const dims=['TP','CP','PP','DP'],col={TP:'var(--c1)',CP:'var(--c6)',PP:'var(--c3)',DP:'var(--c2)'},rh=40,pl=36,H=dims.length*rh+30,sx=v=>pl+(w-pl-6)*v/c.G;
    let s='';for(let p=0;p<=c.G;p+=3072){s+=ln2(sx(p),4,sx(p),H-24,'var(--line)')}
    for(let p=0;p<c.G;p+=3072){const a=sx(p),b=sx(Math.min(c.G,p+3072));if(b-a>34)s+=tx((a+b)/2,H-10,(b-a>60?'pod ':'')+(p/3072+1),{fs:11,a:'middle',c:'var(--mute)'})}
    const span={};dims.forEach((d,i)=>{const y=8+i*rh,m=[...Array(size[d])].map((_,k)=>base[d]+k*stride[d]);
      s+=rc(pl,y+6,w-pl-6,16,'var(--soft)',{r:3})+tx(0,y+19,d,{fs:12,w:600,c:col[d]});
      if(size[d]===1){s+=tx(pl+6,y+18,'not used in this configuration (size 1)',{fs:11,c:'var(--mute)'})}
      else{const lo=m[0],hi=m[m.length-1];s+=rc(sx(lo),y+6,Math.max(2,sx(hi+1)-sx(lo)),16,col[d],{r:2,op:.25});m.forEach(v=>{s+=ln2(sx(v+.5),y+5,sx(v+.5),y+23,col[d],{sw:1.2})})}
      s+=ln2(sx(r+.5),y+2,sx(r+.5),y+27,'var(--ink)',{sw:1.6});
      const servers=new Set(m.map(v=>Math.floor(v/8))).size,racks=new Set(m.map(v=>Math.floor(v/16))).size,pods=new Set(m.map(v=>Math.floor(v/3072))).size;span[d]={m,servers,racks,pods}});
    $('mxSvg').innerHTML=svgW(w,H,s,'Groups of GPU '+r);$('mxRv').textContent=fmt(r);
    const where=d=>{const x=span[d];return size[d]===1?'size 1':size[d]+' GPUs: ranks '+fmt(x.m[0])+(size[d]>1?' to '+fmt(x.m[x.m.length-1])+(stride[d]>1?' every '+fmt(stride[d]):''):'')};
    const net=d=>{const x=span[d];return x.pods>1?'crosses '+x.pods+' pods (1:7 oversubscribed)':x.servers>1?'within one pod, '+x.servers+' servers':'inside one NVLink server'};
    $('mxOut').innerHTML='<div class="stat"><div class="k">This GPU</div><div class="v">['+tp+', '+cp+', '+pp+', '+dp+']</div><div class="d">[TP, CP, PP, DP] coordinates; server '+fmt(Math.floor(r/8))+', rack '+fmt(Math.floor(r/16))+', pod '+(Math.floor(r/3072)+1)+'</div></div>'+
      dims.map(d=>stat(d+' group',net(d),where(d))).join('')}
  ['mxC','mxR'].forEach(i=>$(i).addEventListener('input',()=>refit($('mxSvg'))));
  // 2. Memory per GPU
  const TPS=[1,2,4,8],PPS=[1,2,4,8,16,32],DPS=[1,2,4,8,16,32,64,128],NP=RC.params['405B'].total;
  function mem(w){const T=TPS[+$('mmT').value],P=PPS[+$('mmP').value],D=DPS[+$('mmD').value],sh=NP/(T*P),GB=1e9;
    const parts=[['BF16 weights (gathered)',2*sh/GB,'var(--c1)'],['FP32 gradients (accumulated)',4*sh/GB,'var(--c2)'],['FP32 master + Adam (sharded over DP)',12*sh/D/GB,'var(--c3)']],tot=parts.reduce((a,p)=>a+p[1],0);
    $('mmTv').textContent=T;$('mmPv').textContent=P;$('mmDv').textContent=D;const H=86,mx=Math.max(100,tot*1.05),sx=v=>w*Math.min(1,v/mx);let s='',x=0;
    parts.forEach(p=>{s+=rc(sx(x),18,Math.max(0,sx(x+p[1])-sx(x)),26,p[2],{r:0});x+=p[1]});
    s+=ln2(sx(80),8,sx(80),54,'var(--bad)',{sw:2})+tx(Math.min(sx(80)+4,w-4),14,'80 GB HBM3',{fs:11,a:sx(80)+80>w?'end':'start',c:'var(--bad)'});
    s+=tx(0,72,'0',{fs:11,c:'var(--mute)'})+tx(w,72,fmt(mx,0)+' GB',{fs:11,a:'end',c:'var(--mute)'});
    $('mmSvg').innerHTML=svgW(w,H,s,'Memory per GPU')+'<div class="stkl">'+parts.map(p=>'<span><i style="background:'+p[2]+'"></i>'+p[0]+' <b>'+p[1].toFixed(1)+' GB</b></span>').join('')+'</div>';
    $('mmOut').innerHTML=stat('GPUs in this layout',fmt(T*P*D),'TP × PP × DP (CP = 1)')+stat('Parameters per GPU',bil(sh),'405.85B / (TP × PP)')+stat('Modelled state',tot.toFixed(1)+' GB',tot>80?'does not fit, before any activations':(80-tot).toFixed(1)+' GB left for activations and buffers')}
  ['mmT','mmP','mmD'].forEach(i=>$(i).addEventListener('input',()=>refit($('mmSvg'))));
  onTab('t-run',()=>{fit($('mxSvg'),mesh);fit($('mmSvg'),mem)});})();

// 3. The pipeline schedule (list scheduler; reproduces (PP-1)/(V*M) with no latency)
function pipeSim(P,V,M,N,tf,tb,c){tf=tf||1;tb=tb||2;c=c||0;
  const order=p=>{const F=[],B=[];for(let g=0;g<M;g+=N){const mbs=[];for(let m=g;m<Math.min(M,g+N);m++)mbs.push(m);
      for(let v=0;v<V;v++)for(const m of mbs)F.push({t:'F',m,s:v*P+p});for(let v=V-1;v>=0;v--)for(const m of mbs)B.push({t:'B',m,s:v*P+p})}
    const W=Math.min(F.length,V===1?P-p-1:(P-p-1)*2+(V-1)*N),ops=F.slice(0,W);let fi=W,bi=0;
    while(fi<F.length){ops.push(F[fi++]);ops.push(B[bi++])}while(bi<B.length)ops.push(B[bi++]);return ops};
  const L=[...Array(P)].map((_,p)=>order(p)),S=P*V,done={},ptr=Array(P).fill(0),busy=Array(P).fill(0),ev=[],key=(t,m,s)=>t+m+'_'+s;
  let now=0,left=P*V*M*2,guard=0;
  while(left>0&&guard++<200000){let prog=false;
    for(let p=0;p<P;p++){if(busy[p]>now||ptr[p]>=L[p].length)continue;const o=L[p][ptr[p]];
      const dep=o.t==='F'?(o.s===0?0:(done[key('F',o.m,o.s-1)]??Infinity)+c):Math.max(done[key('F',o.m,o.s)]??Infinity,o.s===S-1?0:(done[key('B',o.m,o.s+1)]??Infinity)+c);
      if(dep<=now+1e-9){const d=o.t==='F'?tf:tb;ev.push({p,t:o.t,m:o.m,s:o.s,v:Math.floor(o.s/P),a:now,b:now+d});done[key(o.t,o.m,o.s)]=now+d;busy[p]=now+d;ptr[p]++;left--;prog=true}}
    const cand=busy.filter(b=>b>now+1e-9);for(const k in done){const t=done[k]+c;if(t>now+1e-9)cand.push(t)}
    if(!cand.length){if(!prog)return {deadlock:true,ev};continue}now=Math.min(...cand)}
  const span=Math.max(...ev.map(e=>e.b)),work=ev.reduce((a,e)=>a+e.b-e.a,0);let peak=0;
  for(let p=0;p<P;p++){let k=0;ev.filter(e=>e.p===p).sort((a,b)=>a.a-b.a).forEach(e=>{k+=e.t==='F'?1:-1;peak=Math.max(peak,k)})}
  const firstB=Math.min(...ev.filter(e=>e.t==='B').map(e=>e.a)),lastF=Math.max(...ev.filter(e=>e.t==='F').map(e=>e.b));
  return {span,work,bubble:(span*P-work)/work,formula:(P-1)/(V*M),peak,ev,firstB,lastF}}
(function(){if(!$('pp'))return;const P=4,V=2,LAT=[0,0.25,0.5,1,2];
  const CF={dfs:[8,4],l3:[10,5],bfs:[10,10]};const cache={};
  const sim=m=>{const c=LAT[+$('ppL').value],k=m+c;return cache[k]||(cache[k]=pipeSim(P,V,CF[m][0],CF[m][1],1,2,c))};
  const cap={dfs:'Depth-first (Megatron interleaved): each stage runs N = PP = 4 micro-batches before switching chunk, so M must be a multiple of 4; 10 micro-batches are not allowed.',
    l3:'Llama 3: N = 5 with M = 10, the setting of Figure 6. N is free, so the batch need not divide by the stage count.',
    bfs:'Breadth-first (Lamy-Poirier): all M = 10 micro-batches pass a stage before the next chunk starts, holding the most activations.'};
  const steps=m=>[{t:'Warm-up: forwards fill the pipeline',c:cap[m]+' Rank 0 runs ahead with forwards while later ranks wait for their first input.'},
    {t:'Steady state: one forward, one backward',c:'Each rank alternates forward and backward work; idle gaps are the bubble.'},
    {t:'Cool-down: the backwards drain',c:'No forwards are left; ranks wait for gradients from the stages after them.'},
    {t:'The whole schedule',c:'Grey is idle. Compare the bubble with the formula (PP − 1)/(V × M) and the peak in-flight activations across modes, then add latency.'}];
  const MODES={dfs:steps('dfs'),l3:steps('l3'),bfs:steps('bfs')};
  function draw(m,k,e,w){const r=sim(m),span=Math.max(sim('dfs').span,sim('l3').span,sim('bfs').span),ph=[0,r.firstB,r.lastF,r.span,r.span],t=k===3?r.span:ph[k]+(ph[k+1]-ph[k])*e;
    const pl=50,rh=26,H=P*rh+36,sx=v=>pl+(w-pl-6)*v/span;let s='';
    for(let p=0;p<P;p++){const y=6+p*rh;s+=rc(pl,y,sx(r.span)-pl,rh-6,'var(--soft)',{r:2})+tx(0,y+14,'rank '+p,{fs:11,c:'var(--mute)'})}
    r.ev.forEach(o=>{if(o.a>=t)return;const y=6+o.p*rh,x0=sx(o.a),x1=sx(Math.min(o.b,t)),f=o.t==='F';
      s+=rc(x0+.5,y,Math.max(0,x1-x0-1),rh-6,f?(o.v?'var(--c6)':'var(--c1)'):(o.v?'var(--c5)':'var(--c2)'),{r:2,op:f?1:.85});
      if(x1-x0>12)s+=tx((x0+x1)/2,y+14,String(o.m),{fs:11,a:'middle',c:'var(--bg)'})});
    s+=ln2(sx(t),2,sx(t),P*rh+4,'var(--ink)',{sw:1.2});
    s+=tx(pl,H-6,'time (forward = 1 unit, backward = 2)',{fs:11,c:'var(--mute)'})+tx(w-6,H-6,fmt(r.span,r.span%1?2:0)+' units',{fs:11,a:'end',c:'var(--mute)'});
    return svgW(w,H,s,'Pipeline schedule')+'<div class="stkl"><span><i style="background:var(--c1)"></i>forward, chunk 0</span><span><i style="background:var(--c6)"></i>forward, chunk 1</span><span><i style="background:var(--c2)"></i>backward, chunk 0</span><span><i style="background:var(--c5)"></i>backward, chunk 1</span><span>numbers: micro-batch</span></div>'}
  function counters(m){const r=sim(m);return stat('Micro-batches M, group N',CF[m][0]+', '+CF[m][1],'PP = 4, V = 2')+stat('Bubble, simulated',(r.bubble*100).toFixed(1)+'%','idle time over busy time')+stat('Bubble, (PP − 1)/(V × M)',(r.formula*100).toFixed(1)+'%','the paper\'s formula')+stat('Peak in flight per rank',r.peak,'micro-batch stages holding activations')}
  const A=makeAnim({id:'pp',modes:MODES,mode:'l3',draw,counters,dur:3500});
  function sweep(){const c=LAT[+$('ppL').value];$('ppLv').textContent=c?c+' unit'+(c>1?'s':''):'none';let s='<div class="tw"><table><thead><tr><th>N (M = 10)</th><th class="num">Bubble</th><th class="num">Formula</th><th class="num">Peak in flight</th></tr></thead><tbody>';
    [2,3,4,5,10].forEach(N=>{const r=pipeSim(P,V,10,N,1,2,c);s+='<tr'+(N===5?' style="font-weight:600"':'')+'><td>'+N+(N===5?' (Figure 6)':N===10?' (breadth-first)':'')+'</td>'+(r.deadlock?'<td class="num" colspan="3">this ordering deadlocks</td>':'<td class="num">'+(r.bubble*100).toFixed(1)+'%</td><td class="num">'+(r.formula*100).toFixed(1)+'%</td><td class="num">'+r.peak+'</td>')+'</tr>'});
    $('ppSweep').innerHTML=s+'</tbody></table></div>'}
  $('ppL').addEventListener('input',()=>{sweep();if(A)A.draw()});sweep();})();

// 4. Replay the 54 days
(function(){if(!$('rl'))return;
  const IV=[5,10,20,30,60,120,240,480],RV=[2,5,10,20,30,60,120],SV=[1,5,10,30,60,120],DAYS=54,LAM=466/DAYS/24;// per hour
  const C5=TB.t5.rows.map(r=>[r[0],r[1],+r[2]]),C5T=C5.reduce((a,r)=>a+r[2],0);
  // seeded event list: times in hours, planned or a Table 5 cause
  const rnd=mulberry32(54);const EV=[];let t=0;while(true){t+=-Math.log(1-rnd())/LAM;if(t>=DAYS*24)break;
    if(rnd()<47/466)EV.push({t,c:'Planned',cat:'Planned'});else{let u=rnd()*C5T,i=0;while(u>C5[i][2]){u-=C5[i][2];i++}EV.push({t,c:C5[i][0],cat:C5[i][1]})}}
  const lostOf=(e,I)=>((e.t*60)%I)/60;// hours of work since the last checkpoint
  const MODES={auto:[],manual:[]};for(let wk=0;wk<8;wk++){const a=wk*7,b=Math.min(DAYS,a+7);['auto','manual'].forEach(m=>MODES[m].push({t:'Days '+(a+1)+' to '+b,c:'',a,b}))}
  function params(m){const I=IV[+$('rlI').value],R=RV[+$('rlR').value]/60+(m==='manual'?2:0),s=SV[+$('rlS').value]/3600;return {I,R,s}}
  function stats(m,uptoDay){const {I,R,s}=params(m);let lost=0,n=0;EV.forEach(e=>{if(e.t<uptoDay*24){lost+=R+lostOf(e,I);n++}});
    const el=uptoDay*24,ck=el>0?(el/(I/60))*s:0,eff=el>0?Math.max(0,1-(lost+ck)/el):1,exp=1-LAM*(R+I/120)-s/(I/60);return {n,lost,ck,eff,exp,I,R,s}}
  function draw(m,k,e,w){const S=MODES[m][k],day=S.a+(S.b-S.a)*e,pl=4,H=96,sx=d=>pl+(w-pl*2)*d/DAYS,{I,R}=params(m);let s='';
    s+=rc(sx(0),30,sx(DAYS)-sx(0),22,'var(--soft)',{r:3})+rc(sx(0),30,sx(day)-sx(0),22,'var(--open2)',{r:3});
    EV.forEach(ev=>{const d=ev.t/24;if(d>day)return;const lost=(R+lostOf(ev,I))/24,x=sx(d),c=ev.cat==='Planned'?'var(--mute)':CAT[ev.cat]||'var(--mute)';
      s+=rc(x,30,Math.max(1,sx(d+lost)-x),22,'var(--ink)',{r:0,op:.45})+ln2(x,22,x,30,c,{sw:1.4})});
    for(let d=0;d<=DAYS;d+=(w<520?14:7))s+=tx(sx(d),70,'day '+d,{fs:11,a:d===0?'start':d>=DAYS-3?'end':'middle',c:'var(--mute)'});
    s+=tx(sx(day),16,'day '+day.toFixed(1),{fs:11,a:sx(day)>w-60?'end':sx(day)<60?'start':'middle'});
    const st=stats(m,day);MODES[m][k].c=st.n+' interruptions so far ('+EV.filter(x=>x.t<day*24&&x.cat!=='Planned').length+' unexpected); '+fmt(st.lost,1)+' hours lost to restarts and redone work, '+fmt(st.ck,1)+' hours paused for checkpoints.';
    $('rlCap').textContent=MODES[m][k].c;
    return svgW(w,H,s,'54-day timeline')+'<div class="stkl"><span><i style="background:var(--open2)"></i>training</span><span><i style="background:var(--ink);opacity:.45"></i>lost: restart + redone work</span>'+Object.entries(CAT).map(([k2,c])=>'<span><i style="background:'+c+'"></i>'+k2+'</span>').join('')+'<span><i style="background:var(--mute)"></i>planned</span></div>'}
  function counters(m,k,e){const S=MODES[m][k],day=S.a+(S.b-S.a)*e,st=stats(m,day),opt=Math.sqrt(2*st.s/LAM)*60;
    return stat('Effective training time',(st.eff*100).toFixed(1)+'%',st.eff<=0?'stops arrive faster than the job recovers':'paper: more than 90%')+stat('Expected, 1 − λ(R + I/2) − s/I',(Math.max(0,st.exp)*100).toFixed(1)+'%',st.exp<0?'the formula goes negative: no progress':'λ = '+(LAM*24).toFixed(2)+' per day')+stat('Best interval for this pause',opt<1?(opt*60).toFixed(0)+' s':opt.toFixed(1)+' min','I* = √(2s/λ)')+stat('Restart time used',st.R<1?(st.R*60).toFixed(0)+' min':st.R.toFixed(2)+' h',m==='manual'?'your setting + 2 h':'your setting')}
  const lab=(v,u)=>v<60?v+' '+u:(v/60)+(u==='min'?' h':' min');
  function labels(){$('rlIv').textContent=lab(IV[+$('rlI').value],'min');$('rlRv').textContent=lab(RV[+$('rlR').value],'min');const sv=SV[+$('rlS').value];$('rlSv').textContent=sv<60?sv+' s':(sv/60)+' min'}
  const A=makeAnim({id:'rl',modes:MODES,mode:'auto',draw,counters,dur:2600});labels();
  ['rlI','rlR','rlS'].forEach(i=>$(i).addEventListener('input',()=>{labels();if(A)A.draw()}));})();
