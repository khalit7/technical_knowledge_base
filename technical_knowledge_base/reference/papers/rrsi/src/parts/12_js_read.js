// ---- The paper tab: loop diagram, edit budget, Figure 3, Figure 1(a), Table 2, Figure 4(a) ----
const TB=PAPER.tables, RC=PAPER.rc;
const CB='var(--c1)', CG='var(--mute)', CO='var(--c2)';
// placeLabels' fallback can push a label past the right or left edge; flip it to the other side of its point
const clampLab=(pts,W)=>{pts.forEach(p=>{const w=p.t.length*(p.fs||11)*.58;if(p.la==='start'&&p.lx+w>W-2){p.la='end';p.lx=p.x-8}else if(p.la==='end'&&p.lx-w<2){p.la='start';p.lx=p.x+8}else if(p.la==='middle'){p.lx=Math.max(w/2+2,Math.min(W-w/2-2,p.lx))}});return pts};
// The loop of Figure 2: generic steps (grey) and RRSI's additions (blue)
fit($('loopSvg'),w=>{
  const S=[['Incumbent harness H_t','keeps the best S* and the edit ledger'],['Analyst: failure feedback F_t','ledger: falsified ideas stay negative'],['Proposer drafts candidates','edit budget b_t; explore idle components; prune targets'],
    ['Critic screens each diff','rejects benchmark-specific edits before scoring'],['Evaluate on the evolve set','k trials per task: score Ŝ and tokens Ĉ'],['Select the next incumbent','floor S* − δ; cost rule; within-band rule']];
  const two=w>=640,cols=two?3:1,bw=two?(w-60)/3:w-46,bh=50,gx=two?(w-cols*bw)/(cols+1):34,gy=26;
  const pos=S.map((s,i)=>{if(!two)return [gx,10+i*(bh+gy)];const r=i<3?0:1,c=i<3?i:5-i;return [gx+c*(bw+gx),10+r*(bh+gy+18)]});
  const H=two?10+2*bh+gy+18+12:10+6*bh+5*gy+10;let s='';
  S.forEach((t,i)=>{const [x,y]=pos[i];s+=rc(x,y,bw,bh,'var(--soft)',{s:'var(--line)',r:6})+tx(x+bw/2,y+19,t[0],{a:'middle',fs:12.5,w:600})+tx(x+bw/2,y+37,t[1],{a:'middle',fs:11,c:CB})});
  const arr=(x1,y1,x2,y2)=>ln2(x1,y1,x2,y2,'var(--mute)',{sw:1.3})+'<polygon points="'+[[x2,y2],[x2-5*Math.sign(x2-x1||0)-(x1===x2?4:0),y2-5*Math.sign(y2-y1||0)-(y1===y2?4:0)],[x2-5*Math.sign(x2-x1||0)+(x1===x2?4:0),y2-5*Math.sign(y2-y1||0)+(y1===y2?4:0)]].map(p=>p.join(',')).join(' ')+'" fill="var(--mute)"/>';
  for(let i=0;i<6;i++){const [x,y]=pos[i],[x2,y2]=pos[(i+1)%6];
    if(two){if(i<2)s+=arr(x+bw,y+bh/2,x2,y2+bh/2);else if(i===2)s+=arr(x+bw/2,y+bh,x2+bw/2,y2);else if(i<5)s+=arr(x,y+bh/2,x2+bw,y2+bh/2);else s+=arr(x+bw/2,y,x2+bw/2,y2+bh)}
    else{if(i<5)s+=arr(x+bw/2,y+bh,x2+bw/2,y2);else s+=ln2(x,y+bh/2,12,y+bh/2,'var(--mute)',{sw:1.3})+ln2(12,y+bh/2,12,pos[0][1]+bh/2,'var(--mute)',{sw:1.3})+arr(12,pos[0][1]+bh/2,pos[0][0],pos[0][1]+bh/2)}}
  $('loopSvg').innerHTML=svgW(w,H,s,'The RRSI loop')});
// Eq. 4: the edit budget of every round, for each instance in Table 5
(function(){const C={coding:[20,4],workspace:[20,3],engineering:[40,4]};
  function draw(){const k=$('budI').value,[T,hi]=C[k],b=RC.budgets[k];
    fit($('budSvg'),w=>{const H=170,pl=36,pr=10,pt=12,pb=34,bw=(w-pl-pr)/(T+1);const y=v=>pt+(H-pt-pb)*(1-v/hi);let s='';
      for(let v=0;v<=hi;v++)s+=ln2(pl,y(v),w-pr,y(v),'var(--line)')+tx(pl-6,y(v)+4,v,{a:'end',fs:11,c:CG});
      let path='';for(let i=0;i<=200;i++){const t=T*i/200,v=1+(hi-1)*.5*(1+Math.cos(Math.PI*t/T));path+=(i?'L':'M')+(pl+bw*(t+.5)).toFixed(1)+','+y(v).toFixed(1)}
      b.forEach((v,t)=>{s+=rc(pl+bw*t+1,y(v),Math.max(1,bw-2),y(0)-y(v),CB,{r:1,op:.75})});
      s+=rc(pl+bw*T+1,y(1),Math.max(1,bw-2),y(0)-y(1),'none',{r:1,s:CB,da:'3 2'});
      s+='<path d="'+path+'" fill="none" stroke="var(--ink)" stroke-width="1.2" stroke-dasharray="4 3"/>';
      const ticks=T===40?[0,10,20,30,39]:[0,5,10,15,19];ticks.forEach(t=>s+=tx(pl+bw*(t+.5),H-pb+15,t,{a:'middle',fs:11,c:CG}));
      s+=tx(pl+bw*(T+.5),H-pb+15,'T',{a:'middle',fs:11,c:CB})+tx((pl+w-pr)/2,H-4,'round t (bars: budget b_t; dashed curve: before rounding up)',{a:'middle',fs:11,c:CG});
      $('budSvg').innerHTML=svgW(w,H,s,'Edit budget per round')});
    const last=b[b.length-1],n1=b.filter(v=>v===last).length;
    $('budCap').innerHTML='Rounds 0 to '+(T-1)+' get budgets '+b[0]+' down to '+last+' (the last '+n1+' rounds at '+last+'). The value 1 = <i>b</i><sub>min</sub> is reached only at <i>t</i> = <i>T</i> (dashed bar), a round that is never run, because the cosine term is still above zero at <i>t</i> = <i>T</i> − 1 and the ceiling rounds it up. Table 5 calls <i>b</i><sub>min</sub> the "final-round edit budget"; in practice it is 2. The released runs mostly used one or two edits per candidate anyway (coding: 23 one-edit candidates, 16 two-edit, 1 three-edit).'}
  $('budI').addEventListener('change',draw);draw()})();
// Figure 3: all nine bars
(function(){let mode='abs';const B=TB.fig3.bars;
  function draw(){fit($('f3Svg'),w=>{const lw=Math.min(190,w*.42),pl=lw+6,pr=44,rh=34,pt=8,H=pt+B.length*rh+30;const mx=mode==='abs'?100:7;const X=v=>pl+(w-pl-pr)*v/mx;let s='',dom='';
      B.forEach((b,i)=>{const y=pt+i*rh;if(b[0]!==dom){dom=b[0];if(i)s+=ln2(0,y-3,w,y-3,'var(--line)')}
        s+=tx(lw,y+12,b[1],{a:'end',fs:12,w:600})+tx(lw,y+26,b[0].replace('Agentic workspace','Workspace').replace('Engineering design','Engineering')+', '+b[2],{a:'end',fs:11,c:b[2]==='Evolve'?CO:CG});
        if(mode==='abs'){s+=rc(X(0),y+3,X(b[3])-X(0),11,CG,{r:2,op:.55})+rc(X(0),y+16,X(b[4])-X(0),11,CB,{r:2})+tx(X(b[3])+4,y+12,b[3].toFixed(1),{fs:11,c:CG})+tx(X(b[4])+4,y+25,b[4].toFixed(1),{fs:11})}
        else{const d=b[4]-b[3];s+=rc(X(0),y+9,X(d)-X(0),13,b[2]==='Evolve'?CO:CB,{r:2})+tx(X(d)+4,y+20,'+'+d.toFixed(1),{fs:11})}});
      s+=tx(pl,H-8,mode==='abs'?'grey: H0, blue: RRSI (score, %)':'gain over H0 in points (orange: evolve split, the one the search saw)',{fs:11,c:CG});
      $('f3Svg').innerHTML=svgW(w,H,s,'Figure 3 rebuilt')})}
  segBind('f3M',m=>{mode=m;refit($('f3Svg'))});draw()})();
// Figure 1(a): evolve gain against OOD gain, recomputed from Tables 1 and 2
fit($('f1Svg'),w=>{const H=Math.min(330,Math.max(250,w*.55)),pl=44,pr=14,pt=12,pb=40;const M=RC.fig1a_match;
  const X=v=>pl+(w-pl-pr)*(v+.5)/7,Y=v=>pt+(H-pt-pb)*(1-(v+6)/18);let s='';
  s+=rc(pl,Y(0),w-pl-pr,Y(-6)-Y(0),'var(--hrb)',{r:0,op:.5});
  [-5,0,5,10].forEach(v=>s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,v,{a:'end',fs:11,c:CG}));
  [0,2,4,6].forEach(v=>s+=ln2(X(v),pt,X(v),H-pb,'var(--line)')+tx(X(v),H-pb+15,v,{a:'middle',fs:11,c:CG}));
  s+=ln2(X(-.5),Y(-.5),X(6.5),Y(6.5),'var(--mute)',{da:'4 3'});
  s+=tx((pl+w-pr)/2,H-6,'relative gain on the evolve split (%)',{a:'middle',fs:11,c:CG})+'<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">relative gain out of distribution (%)</text>';
  const pts=Object.entries(M).map(([k,v])=>({k,x:X(v[2]),y:Y(v[3]),t:k+' ('+(v[2]>=0?'+':'')+v[2].toFixed(1)+', '+(v[3]>=0?'+':'')+v[3].toFixed(1)+')',fs:11}));
  pts.forEach(p=>{s+=p.k==='RRSI'?'<circle cx="'+p.x+'" cy="'+p.y+'" r="6" fill="'+CB+'"/>':p.k==='Unregularized'?'<circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="var(--bg)" stroke="'+CO+'" stroke-width="2"/>':'<circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="'+CG+'"/>'});
  clampLab(placeLabels(pts,w,H),w).forEach(p=>s+=tx(p.lx,p.ly,p.t,{a:p.la,fs:11,c:p.k==='RRSI'?CB:undefined}));
  s+=tx(X(5.2),Y(5.2)-6,'1:1',{fs:11,c:CG});
  $('f1Svg').innerHTML=svgW(w,H,s,'Figure 1 (a) rebuilt')});
// Table 2 as bars (behind the second predict question)
(function(){let k=0;const R=TB.t2.rows;
  function draw(){fit($('t2Svg'),w=>{const lw=Math.min(200,w*.45),pr=46,rh=26,H=R.length*rh+10;const vals=R.map(r=>+r[k+1]);const lo=k===3?0:Math.floor(Math.min(...vals)-1),hi=k===3?4:Math.ceil(Math.max(...vals)+.5);const X=v=>lw+8+(w-lw-8-pr)*(v-lo)/(hi-lo);let s='';
      R.forEach((r,i)=>{const y=4+i*rh,v=+r[k+1],me=r[0]==='RRSI',h0=r[0].startsWith('H0');s+=tx(lw,y+15,r[0],{a:'end',fs:12,w:me?600:400})+rc(X(lo),y+4,X(v)-X(lo),15,me?CB:h0?CG:CO,{r:2,op:h0?.55:1})+tx(X(v)+4,y+16,r[k+1]+(k===3?'M':''),{fs:11.5})});
      $('t2Svg').innerHTML=svgW(w,H,s,'Table 2')+'<p class="small mute" style="margin:2px 0 0">Axis from '+lo+' to '+hi+(k===3?' million tokens':' points (not from zero, to show the differences)')+'.</p>'})}
  segBind('t2M',m=>{k=+m;refit($('t2Svg'))});PRED_REVEAL.pr2=draw})();
// Figure 4(a): tokens against OOD average, with the ablation arms
fit($('f4Svg'),w=>{const H=Math.min(320,Math.max(250,w*.52)),pl=44,pr=14,pt=12,pb=40;const F=RC.fig4a;
  const X=v=>pl+(w-pl-pr)*(v-1.3)/(4.1-1.3),Y=v=>pt+(H-pt-pb)*(1-(v-37.5)/(44.5-37.5));let s='';
  s+=rc(X(2.42),Y(43.6),X(4.1)-X(2.42),Y(37.5)-Y(43.6),'var(--soft)',{r:0});
  [38,40,42,44].forEach(v=>s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,v,{a:'end',fs:11,c:CG}));
  [1.5,2,2.5,3,3.5,4].forEach(v=>s+=tx(X(v),H-pb+15,v.toFixed(1),{a:'middle',fs:11,c:CG}));
  s+=tx((pl+w-pr)/2,H-6,'policy tokens per trial (millions)',{a:'middle',fs:11,c:CG})+'<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">OOD average</text>';
  const P=Object.entries(F).map(([k,v])=>({k,x:X(v[0]),y:Y(v[1]),t:k+' '+v[0].toFixed(2)+'M',fs:11,ty:k==='RRSI'?'r':'b'}));
  [['Unregularized',3.80,40.3],['w/o proposal',2.69,41.9],['w/o acceptance',3.59,41.0]].forEach(a=>P.push({k:a[0],x:X(a[1]),y:Y(a[2]),t:a[0]+' '+a[1].toFixed(2)+'M',fs:11,ty:'a'}));
  P.forEach(p=>{s+=p.ty==='r'?'<circle cx="'+p.x+'" cy="'+p.y+'" r="6" fill="'+CB+'"/>':p.ty==='a'?'<circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="var(--bg)" stroke="'+CO+'" stroke-width="2"/>':'<circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="'+CG+'"/>'});
  clampLab(placeLabels(P,w,H),w).forEach(p=>s+=tx(p.lx,p.ly,p.t,{a:p.la,fs:11,c:p.ty==='r'?CB:undefined}));
  $('f4Svg').innerHTML=svgW(w,H,s,'Figure 4 (a) rebuilt')});
