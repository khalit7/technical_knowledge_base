// ---- Reading tab charts: review outcomes, cost frontier, BusinessBench, how often gates fire ----
const LB=PAPER.tables.lb;
// horizontal paired bars: rows [{n, a, b, note}] on a [lo,hi] scale; a grey, b blue (b may be null)
function hbars(el,rows,lo,hi,o){o=o||{};fit(el,w=>{const lab=w<520?Math.min(150,w*.42):220,rh=o.one?24:30,pt=18,H=pt+rows.length*rh+22,X=v=>lab+8+(w-lab-50)*(v-lo)/(hi-lo);
  let s='';for(let v=lo;v<=hi;v+=o.step||10)s+=ln2(X(v),pt-4,X(v),H-20,'var(--line)')+tx(X(v),H-6,v+(o.unit||''),{fs:11,a:'middle',c:'var(--mute)'});
  rows.forEach((r,i)=>{const y=pt+i*rh;s+='<g><title>'+r.n.replace(/<[^>]+>/g,'')+(r.note?': '+r.note:'')+'</title>';
    const nm=r.n.length*6.3>lab?r.n.slice(0,Math.floor(lab/6.3)-1)+'…':r.n;s+=tx(lab,y+(o.one?13:16),nm,{fs:11.5,a:'end',w:r.bold?600:null});
    if(o.one){s+=rc(X(lo),y+3,X(r.b)-X(lo),14,r.c||'var(--acc)',{r:2})+tx(X(r.b)+4,y+14,fmt(r.b,r.d==null?1:r.d)+(o.unit||''),{fs:11})}
    else{if(r.a!=null)s+=rc(X(lo),y+2,X(r.a)-X(lo),11,'var(--dim)',{r:2})+tx(X(r.a)+4,y+11,fmt(r.a,2),{fs:11,c:'var(--mute)'});
      if(r.b!=null)s+=rc(X(lo),y+14,X(r.b)-X(lo),11,r.c||'var(--acc)',{r:2})+tx(X(r.b)+4,y+23,fmt(r.b,2),{fs:11});
      if(r.range)s+=ln2(X(r.range[0]),y+19,X(r.range[1]),y+19,'var(--bad)',{sw:3})+tx(X(r.range[0])-3,y+23,'',{fs:11})}
    s+='</g>'});
  el.innerHTML=svgW(w,H,s,o.label||'bar chart')})}

// pr1: raw against after-review accuracy for the GPT-5.6 era submissions and StateM's
(function(){let mode='raw';
  const subs=[['142','StateM (GPT-5.6 Sol xhigh)'],['45','GPT-5.5 xhigh + Codex'],['102','GPT-5.6 Sol max + Codex'],['106','GPT-5.6 Terra max (1st)'],['115','GPT-5.6 Terra max (2nd)'],['105','GPT-5.6 Luna max (1st)'],['112','GPT-5.6 Luna max (2nd)']];
  function draw(){const rows=subs.map(([k,n])=>{const e=LB[k];if(k==='142'){return mode==='raw'?{n,b:e.raw_acc,c:'var(--good)',bold:1,note:'raw, 424/445'}:{n:n+' (review not completed)',b:RCV.all13,c:'var(--good)',bold:1,note:'all 13 judge flags zeroed: 92.36%; the paper\'s alternatives 94.38% and 93.26%'}}
      return {n,b:mode==='raw'?e.raw_acc:e.adj_acc,note:e.dq_trials+' trials zeroed in review'}});
    hbars($('adjPlot'),rows,60,100,{one:1,unit:'%',label:'Raw and reviewed accuracy',d:2});
    $('adjNote').innerHTML=mode==='raw'?'Raw scores as each submission pipeline computed them. Source: the leaderboard PRs (#142, #45, #102, #106, #115, #105, #112).':'After review: the Sol max comparator lost '+fmt(RCV.solmax_drop,2)+' points (32 trials zeroed), the GPT-5.5 reference 0.22. StateM\'s review was never completed (PR closed unmerged); its bar zeroes all 13 trials the judge flagged (411/445), the lowest of the three readings; the paper prints 94.38% (four zeroed) and 93.26% (nine).'}
  segBind('adjM',m=>{mode=m;draw()});PRED_REVEAL.pr1=draw})();

// Figure 5 rebuilt: accuracy against cost, log scale
(function(){let mode='paper';
  function draw(){fit($('costPlot'),w=>{const H=w<520?300:320,o={W:w,H,pl:40,pr:14,pt:12,pb:34,x:[8,4000],y:[70,100]};
    const lx=v=>o.pl+(w-o.pl-o.pr)*(Math.log10(v)-Math.log10(o.x[0]))/(Math.log10(o.x[1])-Math.log10(o.x[0])),ly=v=>o.pt+(H-o.pt-o.pb)*(1-(v-o.y[0])/(o.y[1]-o.y[0]));
    let s='';[70,75,80,85,90,95,100].forEach(v=>{s+=ln2(o.pl,ly(v),w-o.pr,ly(v),'var(--line)')+tx(o.pl-5,ly(v)+4,v+'%',{fs:11,a:'end',c:'var(--mute)'})});
    [[10,'$10'],[30,'$30'],[100,'$100'],[300,'$300'],[1000,'$1k'],[3000,'$3k']].forEach(([v,l])=>{s+=ln2(lx(v),H-o.pb,lx(v),H-o.pb+4,'var(--mute)')+tx(lx(v),H-o.pb+16,l,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((o.pl+w)/2,H-3,'cost of the evaluation run (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
    s+=ln2(o.pl,ly(88.8),w-o.pr,ly(88.8),'var(--c5)',{da:'5 4',sw:1.4})+tx(w-o.pr,ly(88.8)-4,'88.8% Sol max, reported score',{fs:11,a:'end',c:'var(--c5)'});
    const P=[];
    P.push({c:1062.95,a:95.28,t:'Sol xhigh + StateM',col:'var(--good)',big:1,h:'95.28% raw, $1,062.95 API-equivalent (PR #142)'});
    P.push({c:15.20,a:mode==='paper'?88.76:88.09,t:'DeepSeek + StateM',col:'var(--good)',big:1,h:mode==='paper'?'88.76% descriptive, $15.20 final-run API spend (§4.4)':'88.09% at standard timeouts (392/445), $15.20'});
    P.push({c:574.68,a:mode==='paper'?83.37:76.18,t:'Sol max + Codex',col:'var(--c1)',h:(mode==='paper'?'83.37% raw':'76.18% after review')+', $574.68 (PR #102)'});
    if(mode==='lb'){P.push({c:2059.19,a:83.15,t:'GPT-5.5 + Codex',col:'var(--c1)',h:'83.15% after review, $2,059.19 (PR #45)'});P.push({c:241.45,a:75.73,t:'Luna max + Codex',col:'var(--c1)',h:'75.73% after review, $241.45 (PR #112)'});P.push({c:421.15,a:78.43,t:'Terra max + Codex',col:'var(--c1)',h:'78.43% after review, $421.15 (PR #115)'});
      s+=ln2(lx(1062.95),ly(95.28),lx(1062.95),ly(RCV.all13),'var(--good)',{sw:3,op:.5});s+=ln2(lx(15.2),ly(88.09),lx(52.22),ly(88.09),'var(--good)',{sw:2,da:'2 3'})+tx(lx(52.22)+4,ly(88.09)+14,'$52.22 with adaptation',{fs:11,c:'var(--good)'})}
    const pts=P.map(p=>({x:lx(p.c),y:ly(p.a),t:p.t,fs:11.5}));placeLabels(pts,w,H-o.pb);pts.forEach((q,i)=>{if(P[i].t==='DeepSeek + StateM'){q.la='start';q.lx=q.x+8;q.ly=q.y+18}});
    P.forEach((p,i)=>{s+='<g style="cursor:help"><title>'+p.t+': '+p.h+'</title><circle cx="'+lx(p.c)+'" cy="'+ly(p.a)+'" r="'+(p.big?6:5)+'" fill="'+p.col+'"/>'+tx(pts[i].lx,pts[i].ly,p.t,{fs:11.5,a:pts[i].la})+'</g>'});
    $('costPlot').innerHTML=svgW(w,H,s,'Accuracy against evaluation cost');
    $('costNote').innerHTML=mode==='paper'?'As in the paper\'s %F5%: StateM runs in green; the $574.68 submission at its own raw score; 88.8% as a score-only line. Hover a point for its source.':'Scores after the leaderboard\'s review where one happened; the green bar under StateM\'s GPT-5.6 point runs down to 92.36% (all 13 judge flags zeroed); DeepSeek at its standard-timeout 88.09%, with the $52.22 campaign cost dotted. Costs are each pipeline\'s API-equivalent model cost, except DeepSeek\'s realised charges.';
    $('costNote').innerHTML=$('costNote').innerHTML.replace('%F5%','<a href="'+PAPER.meta.ax+'#page=14" target="_blank" rel="noopener noreferrer">Figure 5</a>')})}
  segBind('costM',m=>{mode=m;draw()});onTab('t-read',draw)})();

// pr3: BusinessBench Table 1
PRED_REVEAL.pr3=()=>{const g=PAPER.tables.t1.groups,rows=[];g.forEach(([h,rs])=>rs.forEach(r=>{if(r[2]!=null)rows.push({n:r[0],a:r[1],b:r[2],bold:h.startsWith('Frozen one-shot'),note:'delta '+(r[3]>0?'+':'')+fmt(r[3],2)})}));
  hbars($('bbPlot'),rows,60,100,{label:'BusinessBench Table 1'})};

// pr2: how often a host-run check refused a transition, from the released trials
PRED_REVEAL.pr2=()=>{const R=TRIALS.rows,b=[0,0,0,0,0],bp=[0,0,0,0,0];R.forEach(r=>{const k=Math.min(4,r[10]);b[k]++;bp[k]+=r[2]});
  const rows=['0','1','2','3','4 or more'].map((n,i)=>({n:n+' refusals',b:b[i],c:i?'var(--bad)':'var(--dim)',d:0,note:b[i]+' runs, '+bp[i]+' passed'}));
  hbars($('blkPlot'),rows,0,200,{one:1,step:50,label:'Runs by number of refused transitions'});
  const V=RCV;$('blkNote').innerHTML='Runs by how many <code>goto</code> requests a failing host-run check refused (command checks and dynamic checks; pending manual confirmations not counted). '+V.blk_n+' of 440 runs ('+fmt(V.blk_share,1)+'%) were refused at least once, '+V.blk_events+' refusals in all, across '+fmt(V.gotos)+' committed transitions. Refused runs passed '+fmt(100*V.blk_pass/V.blk_n,1)+'% of the time, others '+fmt(100*V.nb_pass/V.nb_n,1)+'%; refused runs are mostly the ones routed through the deeper review states, so this is not a causal comparison. Step through refusals on the %RUN%.'.replace('%RUN%','<a href="#" onclick="document.querySelector(\'[data-t=t-run]\').click();return false">replay tab</a>')};
