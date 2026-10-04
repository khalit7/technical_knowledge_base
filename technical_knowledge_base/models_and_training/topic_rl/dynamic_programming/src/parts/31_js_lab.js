// ---- Sweep lab (tab t-lab): every DP method on one world, same budget of model look-ups, side by side ----
(function(){
  const D=window.DPE,$=id=>document.getElementById(id);
  const METHODS={pi:['Policy iteration','pi',{}],vi:['Value iteration (synchronous)','vi',{}],mpi3:['Modified policy iteration, 3 sweeps','mpi',{k:3}],
    vi_ip:['Value iteration, in place (reading order)','vi',{inplace:true}],vi_rev:['Value iteration, in place (reverse order)','vi',{inplace:true,order:'rev'}],
    ps:['Prioritised sweeping','ps',{}],pe:['Policy evaluation, random policy (synchronous)','pe',{}],pe_ip:['Policy evaluation, random policy (in place)','pe',{inplace:true}]};
  const REP={
    sb44:['<span class="sw-v y">independently</span>Policy evaluation of the random policy, synchronous, reproduces Figure 4.1 ({{book p. 77|http://incompleteideas.net/book/RLbook2020.pdf#page=99}}): 92 of the 96 printed values at two significant digits. The other four are the exact −1.75 at <i>k</i> = 2, printed −1.7 (while −2.875 is printed −2.9): a rounding slip in the figure.',
      '<span class="sw-v y">independently</span>The greedy policy is optimal from <i>k</i> = 3 on, as the caption says; policy iteration needs only that one improvement.',
      '<span class="sw-v s">note</span>Two shaded corners are one terminal state drawn twice; γ = 1, so convergence rests on every policy evaluated reaching a corner.'],
    silver:['<span class="sw-v y">independently</span>Synchronous value iteration from zeros reproduces Silver\'s shortest-path slide exactly: <i>V</i><sub>1</sub> (all zeros) to <i>V</i><sub>7</sub> (0 to −6) ({{Lecture 3|https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-3-planning-by-dynamic-programming-.pdf}}). Frame <i>k</i> on the right is the slide\'s <i>V</i><sub><i>k</i>+1</sub>.',
      '<span class="sw-v s">note</span>Intermediate values are not the value of any policy: <i>V</i><sub>3</sub> says −2 for the far corner, six steps away.'],
    aima:['<span class="sw-v y">independently</span>At γ = 1 value iteration converges on Russell and Norvig\'s Figure 17.3 utilities to three decimals (0.812, 0.868, 0.918 / 0.762, 0.660 / 0.705, 0.655, 0.611, 0.388; {{AIMA|https://aima.cs.berkeley.edu/}}).',
      '<span class="sw-v s">note</span>Moves slip sideways with probability 0.1 each, so each action has up to three successors; every step costs 0.04; the exits hold +1 and −1.',
      '<span class="sw-v s">note</span>Policy iteration stops after 5 improvements; modified policy iteration with 3 sweeps beats value iteration here (1,581 look-ups to an error of 10<sup>−4</sup> against 2,112).'],
    maze:['<span class="sw-v i">illustrative</span>Sutton and Barto\'s Dyna maze (Example 8.1), layout as in {{Zhang\'s reproduction code|https://github.com/ShangtongZhang/reinforcement-learning-an-introduction/blob/master/chapter08/maze.py}}: 6 × 9, 7 wall cells, +1 for reaching the goal, γ = 0.95. Used here to compare sweep orders, not to reproduce a figure.',
      '<span class="sw-v s">derived</span>To an error of 10<sup>−4</sup>: synchronous value iteration 2,760 look-ups, in place in reading order 2,208, in place in reverse order 920, prioritised sweeping 965. Which in-place order helps depends on where the reward sits; prioritised sweeping finds a good order by itself.']};
  const st={w:'sb44',g:1,th:1e-4,a:'pi',b:'vi',sel:-1};
  let C=null,an=null;
  ['sw-ma','sw-mb'].forEach(id=>{$(id).innerHTML=Object.entries(METHODS).map(([k,v])=>'<option value="'+k+'">'+v[0]+'</option>').join('')});
  $('sw-ma').value=st.a;$('sw-mb').value=st.b;
  const sig2=v=>{if(Math.abs(v)<1e-12)return '0.0';const a=Math.abs(v),d=a>=10?0:1;return RD.n(+v.toPrecision(2),d)};
  const fmt=v=>st.w==='sb44'||st.w==='silver'?sig2(v):RD.n(v,3);
  function compute(){const w=D.W[st.w],g=st.g;const sc=D.states(w).reduce((t,s)=>t+D.look(w,s,[0,1,2,3]),0);
    const T=D.vstar(w,g),Tpe=D.evalExact(w,D.uniform(w),g);const G=D.greedy(w,T,g,1e-6);
    const cap=250*sc,mk=k=>{const m=METHODS[k];return D.run(w,g,m[1],Object.assign({theta:st.th},m[2]),cap)};
    const A=mk(st.a),B=mk(st.b);const endCost=Math.max(A[A.length-1].cost,B[B.length-1].cost);
    const nF=Math.min(251,Math.ceil(endCost/sc)+2);
    C={w,g,sc,T,Tpe,G,A,B,nF}}
  const target=k=>METHODS[k][1]==='pe'?C.Tpe:C.T;
  function optimal(op,k){const w=C.w;if(METHODS[k][1]==='pe')return null;
    if(op.stored&&op.acts)return D.states(w).every(s=>C.G[s].indexOf(op.acts[s])>=0);
    const g=D.greedy(w,op.V,C.g);return D.states(w).every(s=>g[s].every(a=>C.G[s].indexOf(a)>=0))}
  function grid(el,op,k,side){const w=C.w,W=RD.width(el),cs=Math.max(24,Math.min(64,Math.floor((W-4)/w.W))),ox=Math.floor((W-cs*w.W)/2),H=cs*w.H+4;let s='';
    const lo=Math.min(0,...C.T.filter((v,i)=>!w.term[i])),hi=Math.max(0.0001,...C.T.filter((v,i)=>!w.term[i]));
    w.walls.forEach(([x,y])=>{s+='<rect x="'+(ox+x*cs)+'" y="'+(2+y*cs)+'" width="'+cs+'" height="'+cs+'" fill="var(--dim)"/>'});
    const greedy=op.stored&&op.acts?null:D.greedy(w,op.V,C.g);const fs=cs<34?8:cs<46?9.5:11;
    for(let s2=0;s2<w.n;s2++){const [x,y]=w.cells[s2],X=ox+x*cs,Y=2+y*cs,term=w.term[s2],hl=op.last&&op.last.length===1&&op.last[0]===s2,sel=s2===st.sel;
      s+='<g class="cell" data-s="'+s2+'"><rect x="'+X+'" y="'+Y+'" width="'+cs+'" height="'+cs+'" fill="'+(term?(w.tv[s2]>0?'color-mix(in srgb, var(--c3) 40%, var(--bg))':w.tv[s2]<0?'color-mix(in srgb, var(--c2) 40%, var(--bg))':'var(--soft)'):RD.colorScale(op.V[s2],lo,hi))+'" stroke="'+(sel?'var(--ink)':hl?'var(--c4)':'var(--line)')+'" stroke-width="'+(sel||hl?2.5:1)+'"/>';
      if(term){s+=RD.t(X+cs/2,Y+cs/2+4,w.tv[s2]>0?'+1':w.tv[s2]<0?'−1':'end',{a:'middle',fs,fill:'var(--mute)'})+'</g>';continue}
      s+=RD.t(X+cs/2,Y+(cs<46?cs*0.48:cs/2+fs/3),fmt(op.V[s2]),{a:'middle',fs,w:600});
      const acts=greedy?greedy[s2]:[op.acts[s2]];const pos=[[cs/2,cs*0.22+fs/3],[cs*0.84,cs/2+fs/3],[cs/2,cs*0.86],[cs*0.16,cs/2+fs/3]];
      if(cs<46){s+=RD.t(X+cs/2,Y+cs*0.9,acts.map(a=>w.arw[a]).join(''),{a:'middle',fs:fs-1.5,fill:greedy?'var(--mute)':'var(--ink)'})}
      else acts.forEach(a=>{s+=RD.t(X+pos[a][0],Y+pos[a][1],w.arw[a],{a:'middle',fs:fs-1,fill:greedy?'var(--mute)':'var(--ink)',w:greedy?400:700})});
      s+='</g>'}
    el.innerHTML=RD.svg(W,H,s,'Grid values and policy, '+side)}
  function stats(op,k,el,ph){const w=C.w,e=D.maxErr(w,op.V,target(k)),opt=optimal(op,k),m=METHODS[k];
    ph.textContent=op.label+(op.stored&&op.acts?' · arrows: the stored policy':' · arrows: greedy on these values (all ties)');
    el.innerHTML='Look-ups <b>'+op.cost.toLocaleString('en-US')+'</b> · backups '+op.backups.toLocaleString('en-US')+' · sweeps '+op.sweeps+(op.pi?' · improvements '+op.pi:'')+
      '<br>Largest error to '+(m[1]==='pe'?'V<sub>π</sub>':'V<sub>*</sub>')+': <b>'+(e<1e-12?'0':e<1e-3?RD.e(e,2):RD.n(e,4))+'</b>'+(opt===null?' · (evaluation: no policy to judge)':' · policy optimal: <b>'+(opt?'yes':'not yet')+'</b>')}
  function backup(op){const el=$('sw-bk'),w=C.w,s=st.sel;if(s<0||w.term[s]){el.innerHTML='<span class="mute">Click a cell in either grid to see its backup, with the left panel\'s current values.</span>';return}
    const g=C.g,V=op.V,tv=x=>w.term[x]?w.tv[x]:V[x];const parts=[];const q=D.qs(w,V,g,s);
    for(let a=0;a<w.nA;a++){const terms=w.out[s][a].map(([s2,p,r])=>(p===1?'':RD.n(p,1)+' × ')+'('+RD.n(r,2)+' + '+RD.n(g,2)+' × '+fmt(tv(s2))+')');parts.push('<b>'+w.aname[a]+'</b>: '+terms.join(' + ')+' = '+RD.n(q[a],3))}
    const m=METHODS[st.a][1],mx=Math.max(...q),avg=q.reduce((t,x)=>t+x,0)/q.length;
    el.innerHTML='<div><b>Cell '+(w.cells[s][0]+1)+', '+(w.cells[s][1]+1)+'</b> (column, row), current value '+fmt(V[s])+'. One-step lookahead for each action, with the left panel\'s values:</div><div class="eq">'+parts.join('<br>')+'</div>'+
      '<div>Value-iteration backup: max = <b>'+RD.n(mx,3)+'</b> · random-policy evaluation backup: average = <b>'+RD.n(avg,3)+'</b>'+(m==='pe'?' (what the left panel computes)':m==='vi'||m==='ps'?' (the left panel takes the max)':'')+'.</div>'}
  function chart(fi){const el=$('sw-ch'),W=RD.width(el),H=190,l=46,r=10,t=8,b=24,maxX=(C.nF-1)*C.sc;
    const ser=[[C.A,st.a,'var(--c1)'],[C.B,st.b,'var(--c2)']].map(([ops,k,col])=>[ops.map(o=>[o.cost,D.maxErr(C.w,o.V,target(k))]),col]);
    const all=ser.flatMap(x=>x[0].map(p=>p[1])).filter(v=>v>0);const hi=Math.log10(Math.max(...all))+0.2,lo=Math.max(-12,Math.min(-4,Math.floor(Math.log10(Math.min(...all.filter(v=>v>1e-13).concat([1e-4]))))));
    const X=c=>l+(W-l-r)*Math.min(c,maxX)/maxX,Y=v=>t+(H-t-b)*(hi-Math.log10(Math.max(v,Math.pow(10,lo))))/(hi-lo);let s='';
    for(let e=Math.ceil(lo);e<=Math.floor(hi);e+=2){const y=Y(Math.pow(10,e));s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(l-4,y+4,'10<tspan dy="-5" font-size="8">'+(e<0?'−'+(-e):e)+'</tspan>',{a:'end',fs:10,fill:'var(--mute)'})}
    if(C.g<1){const e0=D.maxErr(C.w,D.init(C.w),C.T);const pts=[];for(let k=0;k*C.sc<=maxX;k++)pts.push(X(k*C.sc).toFixed(1)+','+Y(e0*Math.pow(C.g,k)).toFixed(1));s+='<polyline fill="none" stroke="var(--mute)" stroke-dasharray="5 4" stroke-width="1.5" points="'+pts.join(' ')+'"/>'}
    ser.forEach(([pts,col])=>{let d='';pts.forEach((p,i)=>{if(p[0]>maxX)return;const x=X(p[0]).toFixed(1),y=Y(p[1]).toFixed(1);d+=i?' L'+x+','+Y(pts[i-1][1]).toFixed(1)+' L'+x+','+y:'M'+x+','+y});s+='<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2"/>'});
    const xf=X(fi*C.sc);s+='<line x1="'+xf+'" x2="'+xf+'" y1="'+t+'" y2="'+(H-b)+'" stroke="var(--ink)" stroke-width="1"/>';
    s+=RD.t(l,H-6,'0',{fill:'var(--mute)',fs:10})+RD.t(W-r,H-6,maxX.toLocaleString('en-US')+' look-ups',{a:'end',fill:'var(--mute)',fs:10});
    el.innerHTML=RD.svg(W,H,s,'Error against look-ups')}
  function draw(fi){if(!C)return;const bud=fi*C.sc;const ia=D.at(C.A,bud),ib=D.at(C.B,bud),oa=C.A[ia],ob=C.B[ib];
    grid($('sw-ga'),oa,st.a,'left');grid($('sw-gb'),ob,st.b,'right');stats(oa,st.a,$('sw-sa'),$('sw-pa'));stats(ob,st.b,$('sw-sb'),$('sw-pb'));
    const fa=ia===C.A.length-1,fb=ib===C.B.length-1;
    $('sw-cap').innerHTML='<b>Frame '+fi+'</b>: each side has had '+fi+' value-iteration sweep'+(fi===1?'':'s')+'\' worth of look-ups ('+bud.toLocaleString('en-US')+'; one sweep here is '+C.sc+').'+
      (fa&&fb?' Both methods have stopped.':fa?' The left method has stopped.':fb?' The right method has stopped.':'');
    backup(oa);chart(fi)}
  function rebuild(play){compute();$('sw-rep').innerHTML=REP[st.w].map(x=>'<li>'+x+'</li>').join('');if(an){an.reset(C.nF);if(play)an.play()}else draw(0)}
  compute();
  an=RD.anim({card:'sw-cards',ctl:'sw-ctl',n:C.nF,ms:700,draw,label:'Frame',tab:'t-lab'});
  $('sw-rep').innerHTML=REP[st.w].map(x=>'<li>'+x+'</li>').join('');
  $('sw-w').addEventListener('change',e=>{st.w=e.target.value;st.g=D.W[st.w].g;$('sw-g').value=Math.round(st.g*100);$('sw-gv').textContent=st.g.toFixed(2);st.sel=-1;rebuild(true)});
  $('sw-g').addEventListener('change',e=>{st.g=+e.target.value/100;rebuild(true)});
  $('sw-g').addEventListener('input',e=>{$('sw-gv').textContent=(+e.target.value/100).toFixed(2)});
  $('sw-th').addEventListener('change',e=>{st.th=+e.target.value;rebuild(true)});
  $('sw-ma').addEventListener('change',e=>{st.a=e.target.value;rebuild(true)});
  $('sw-mb').addEventListener('change',e=>{st.b=e.target.value;rebuild(true)});
  ['sw-ga','sw-gb'].forEach(id=>$(id).addEventListener('click',e=>{const c=e.target.closest('.cell');if(!c)return;st.sel=+c.dataset.s;an.redraw()}));
  RD.onResize(()=>an.redraw(),'t-lab');

  // ---- the gambler's problem ----
  (function(){const P1=$('sw-gv1'),P2=$('sw-gp'),T=$('sw-gt'),S=$('sw-ph');let R=null;
    function draw(){const ph=+S.value;R=R&&R.ph===ph?R:Object.assign(D.gambler(ph,100000,1e-12),{ph});
      const W=RD.width(P1),l=40,r=10,t=8,b=22,H=170,X=s=>l+(W-l-r)*(s-1)/98;let s='';
      const Y=v=>t+(H-t-b)*(1-v);[0,0.5,1].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,String(v),{a:'end',fs:10,fill:'var(--mute)'})});
      const pl=(V,col,wd)=>'<polyline fill="none" stroke="'+col+'" stroke-width="'+wd+'" points="'+V.slice(1,100).map((v,i)=>X(i+1).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'"/>';
      [1,2,3].forEach(k=>{if(R.hist[k])s+=pl(R.hist[k],'var(--dim)',1.5)});s+=pl(R.V,'var(--c1)',2);
      [1,25,50,75,99].forEach(c=>{s+=RD.t(X(c),H-6,String(c),{a:'middle',fs:10,fill:'var(--mute)'})});s+=RD.t(l+2,t+10,'value (probability of winning)',{fs:10,fill:'var(--mute)'});
      P1.innerHTML=RD.svg(W,H,s,'Gambler value function');
      const H2=170,mx=50,Y2=v=>t+(H2-t-b)*(1-v/mx);let q='';[0,25,50].forEach(v=>{q+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y2(v)+'" y2="'+Y2(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y2(v)+4,String(v),{a:'end',fs:10,fill:'var(--mute)'})});
      R.ties.forEach((ts,i)=>{ts.slice(1).forEach(a=>{q+='<circle cx="'+X(i+1).toFixed(1)+'" cy="'+Y2(a).toFixed(1)+'" r="1.6" fill="var(--dim)"/>'});q+='<circle cx="'+X(i+1).toFixed(1)+'" cy="'+Y2(ts[0]).toFixed(1)+'" r="2.2" fill="var(--c2)"/>'});
      [1,25,50,75,99].forEach(c=>{q+=RD.t(X(c),H2-6,String(c),{a:'middle',fs:10,fill:'var(--mute)'})});q+=RD.t(l+2,t+10,'stake',{fs:10,fill:'var(--mute)'})+RD.t(W-r,t+10,'capital',{a:'end',fs:10,fill:'var(--mute)'});
      P2.innerHTML=RD.svg(W,H2,q,'Gambler optimal stakes');
      const multi=R.ties.filter(x=>x.length>1).length;
      T.innerHTML='p<sub>h</sub> = '+ph+': converged after '+(R.hist.length-1)+' in-place sweeps. V(50) = '+RD.n(R.V[50],4)+'; smallest optimal stake at 50 is '+R.pol[49]+', at 51 it is '+R.pol[50]+'. '+multi+' of the 99 capitals have more than one optimal stake.'}
    S.addEventListener('change',draw);RD.onRender(draw,'t-lab');RD.onResize(draw,'t-lab');draw()})();
})();
