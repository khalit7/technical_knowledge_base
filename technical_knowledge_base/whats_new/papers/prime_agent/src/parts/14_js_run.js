// ---- Rescore the ARC-AGI-3 run: RHAE from per-level scorecard data, rule controls, grid, replay, ranking ----
const ARC=PT.arc,GAMES=ARC.games,CARDS=ARC.cards;
const RULE={cap:1.15,p:2,w:'lin'};const ARCRULE={cap:1.15,p:2,w:'lin'};
function lvl(a,h,r){if(!(a>0))return 0;return Math.min(r.cap,Math.pow(h/a,r.p))}
function envScore(g,base,r){const n=base.length,k=g[0],w=base.map((_,i)=>r.w==='uni'?1:i+1),sw=w.reduce((a,b)=>a+b,0);
  let s=0,done=0;for(let i=0;i<n;i++){if(i<k){s+=w[i]*lvl(g[1][i],base[i],r);done+=w[i]}}return Math.min(done/sw,s/sw)}
function rhae(c,r){let t=0;c.g.forEach((g,i)=>{t+=envScore(g,GAMES[i][1],r)});return 100*t/GAMES.length}
const short=n=>n.replace(' (median of 3 runs)','').replace(' (NVIDIA-labs OO Agents)','').replace(' - Continual Learning v1',' CL v1');
const cardBy=n=>CARDS.find(c=>c.name===n);
const PRIME=CARDS[0];
const lvColor=v=>v<=0?'var(--line)':v>=1.149?'var(--c3)':v>=1?'var(--c6)':v>=.5?'var(--c5)':'var(--bad)';
(function(){if(!$('rs'))return;let main=PRIME.name,cmp='Human Intelligence Harness',selCell=null;
  const sc=$('rsCard'),sm=$('rsCmp');CARDS.forEach(c=>{sc.add(new Option(c.name+' ('+c.date+')',c.name));sm.add(new Option(c.name+' ('+c.date+')',c.name))});sc.value=main;sm.value=cmp;
  function out(){const A=cardBy(main),B=cardBy(cmp),ra=rhae(A,RULE),rb=rhae(B,RULE);
    const lv=c=>c.g.reduce((a,g)=>a+g[0],0),ac=c=>c.g.reduce((a,g)=>a+g[1].reduce((x,y)=>x+y,0),0);
    $('rsOut').innerHTML=stat(short(main),ra.toFixed(2)+'%','printed '+A.printed.toFixed(2)+'%; '+lv(A)+' of 183 levels; '+fmt(ac(A))+' actions')+stat(short(cmp),rb.toFixed(2)+'%','printed '+B.printed.toFixed(2)+'%; '+lv(B)+' of 183 levels; '+fmt(ac(B))+' actions')+stat('Difference',(ra-rb>0?'+':'')+(ra-rb).toFixed(2),'points, first minus second');
    const isArc=RULE.cap===1.15&&RULE.p===2&&RULE.w==='lin';
    $('rsNote').innerHTML=isArc?'Under ARC\'s rule both totals equal their printed scores (to 0.001 points): the per-level data reproduce the scorecards independently.':'Rule changed from ARC\'s: cap '+Math.round(RULE.cap*100)+'%, power '+RULE.p+', '+(RULE.w==='uni'?'equal':'level-number')+' weights. Under ARC\'s rule the totals are '+rhae(A,ARCRULE).toFixed(2)+'% and '+rhae(B,ARCRULE).toFixed(2)+'%.'}
  function grid(w){const A=cardBy(main),B=cardBy(cmp);const rows=GAMES.map((g,i)=>({i,id:g[0],n:g[1].length,ea:envScore(A.g[i],g[1],RULE),eb:envScore(B.g[i],g[1],RULE)}));
    rows.sort((a,b)=>(b.eb-b.ea)-(a.eb-a.ea)||a.id.localeCompare(b.id));
    const lw=40,rw=w<460?84:120,cs=Math.max(14,Math.min(26,(w-lw-rw-6)/10)),ch=16,H=rows.length*(ch+3)+22;let s='';
    s+=tx(lw+cs*5,12,'levels 1 to 10',{fs:11,a:'middle',c:'var(--mute)'})+tx(w-rw+4,12,w<460?'game score':short(main).slice(0,9)+' | '+short(cmp).slice(0,9),{fs:11,c:'var(--mute)'});
    rows.forEach((r,j)=>{const y=18+j*(ch+3),g=A.g[r.i],base=GAMES[r.i][1];s+=tx(lw-4,y+12,r.id,{fs:11,a:'end'});
      for(let l=0;l<r.n;l++){const done=l<g[0],v=done?lvl(g[1][l],base[l],RULE):0,on=selCell&&selCell[0]===r.i&&selCell[1]===l;
        s+='<g data-g="'+r.i+'" data-l="'+l+'" style="cursor:pointer">'+rc(lw+l*cs,y,cs-2,ch,done?lvColor(v):'var(--soft)',{r:2,s:on?'var(--ink)':(done?null:'var(--line)'),sw:on?2:1})+(done?'':tx(lw+l*cs+cs/2-1,y+12,'×',{fs:11,a:'middle',c:'var(--bad)'}))+'<title>'+r.id+' level '+(l+1)+(done?': '+g[1][l]+' actions, human '+base[l]+', score '+(100*v).toFixed(1)+'%':': not completed')+'</title></g>'}
      const d=r.eb-r.ea;s+=tx(w-rw+4,y+12,(100*r.ea).toFixed(0)+' | '+(100*r.eb).toFixed(0),{fs:11,c:Math.abs(d)<.005?'var(--mute)':d>0?'var(--bad)':'var(--good)'})});
    let lx=lw,ly=H+4;[['var(--c3)','115% (cap: beat the human by 7% or more)'],['var(--c6)','100% to 115%'],['var(--c5)','50% to 100%'],['var(--bad)','under 50%']].forEach(([c,t])=>{const tw=t.length*6.3+22;if(lx+tw>w){lx=lw;ly+=16}s+=rc(lx,ly,12,12,c,{r:2})+tx(lx+16,ly+10,t,{fs:11});lx+=tw});
    $('rsGrid').innerHTML=svgW(w,ly+16,s,'Per-level scores');
    $('rsGrid').querySelectorAll('g[data-g]').forEach(el=>el.addEventListener('click',()=>{selCell=[+el.dataset.g,+el.dataset.l];cell();grid(w)}))}
  function cell(){if(!selCell){$('rsCell').innerHTML='';return}const [gi,l]=selCell,base=GAMES[gi][1][l],A=cardBy(main),B=cardBy(cmp);
    const one=(c)=>{const g=c.g[gi],done=l<g[0],a=g[1][l];return stat(short(c.name),done?fmt(a)+' actions':'not completed'+(a?' ('+fmt(a)+' actions spent)':''),done?'score '+(100*lvl(a,base,RULE)).toFixed(1)+'% = min('+Math.round(RULE.cap*100)+'%, ('+base+' / '+a+')'+(RULE.p===1?'':'^'+RULE.p)+')':'0 for this level')};
    $('rsCell').innerHTML=stat('Game '+GAMES[gi][0]+', level '+(l+1),'human '+base,'upper-median human actions')+one(A)+one(B)}
  function rank(w){const rows=CARDS.map(c=>({n:short(c.name)+(c.name===PRIME.name?' (median run)':''),v:rhae(c,RULE),p:c.printed,d:c.date,pr:c.name===PRIME.name})).sort((a,b)=>b.v-a.v);
    const lw=Math.min(210,w*.46),bh=18,H=rows.length*(bh+5)+6;let s='';const bx=v=>lw+(w-lw-48)*Math.max(0,Math.min(100,v))/100;
    rows.forEach((r,i)=>{const y=4+i*(bh+5);s+=tx(lw-6,y+13,r.n+' · '+r.d.slice(5),{fs:11,a:'end',w:r.pr?700:null});s+=rc(lw,y,bx(r.v)-lw,bh,r.pr?'var(--c4)':r.n.startsWith('Human')?'var(--acc)':'var(--dim)',{r:3});
      s+=ln2(bx(r.p),y-1,bx(r.p),y+bh+1,'var(--ink)',{sw:2})+tx(bx(Math.max(r.v,r.p))+4,y+13,r.v.toFixed(1),{fs:11})});
    $('rsRank').innerHTML=svgW(w,H,s,'All scorecards under the current rule')}
  function find(){const p=PRIME,r=RC.prime;const pos=CARDS.map(c=>({n:c.name,v:rhae(c,RULE)})).sort((a,b)=>b.v-a.v).findIndex(x=>x.n===p.name)+1;
    const wo=p.g.reduce((a,g,i)=>GAMES[i][0]==='lf52'?a:a+envScore(g,GAMES[i][1],ARCRULE),0)/24*100;
    $('rsFind').innerHTML='The median run completed '+r.levels_done+' of '+r.levels_total+' levels and 24 of 25 games. '+r.at_cap+' of its '+r.levels_done+' completed levels hit the 115% cap, beating the human baseline by at least 7%; that bonus is worth '+(r.rhae-r.no_bonus).toFixed(2)+' points (a 100% cap gives '+r.no_bonus+'%). The single lost game, lf52, stopped at level 6 after '+fmt(r.lf52_l6)+' actions on that level alone, '+r.lf52_share+'% of the run\'s '+fmt(r.actions)+' actions; the other 24 games average '+wo.toFixed(2)+'%. Other plausible rules move the total by about a point (linear efficiency '+r.linear+'%, Equation 1 as written '+r.eq1_as_written+'%, equal level weights '+r.uniform_weights+'%). Under the rule you have set, the median run ranks '+pos+' of 11 scorecards.'}
  const all=()=>{out();refit($('rsGrid'));cell();refit($('rsRank'));find()};
  [['rsCap','cap'],['rsPow','p'],['rsW','w']].forEach(([id,k])=>segBind(id,m=>{RULE[k]=k==='w'?m:+m;all()}));
  sc.addEventListener('change',()=>{main=sc.value;all()});sm.addEventListener('change',()=>{cmp=sm.value;all()});
  onTab('t-run',()=>{out();fit($('rsGrid'),grid);fit($('rsRank'),rank);find()});
})();

// replay two scorecards game by game (always ARC's rule)
(function(){if(!$('rp'))return;const PAIR={ch:'Continual Harness',hum:'Human Intelligence Harness',top:'Tycho'};
  const order=GAMES.map((g,i)=>i);
  const steps=order.map(i=>({t:'Game '+(order.indexOf(i)+1)+' of 25: '+GAMES[i][0],c:''}));
  const modes={};Object.keys(PAIR).forEach(m=>{modes[m]=steps.map((s,j)=>({t:s.t,c:capFor(m,j)}))});
  function capFor(m,j){const i=order[j],A=cardBy(PAIR[m]),B=PRIME,base=GAMES[i][1],ea=envScore(A.g[i],base,ARCRULE),eb=envScore(B.g[i],base,ARCRULE);
    const la=A.g[i],lb=B.g[i];const sum=g=>g[1].slice(0,g[0]).reduce((a,b)=>a+b,0);
    return short(A.name)+': '+la[0]+' of '+base.length+' levels, '+fmt(sum(la))+' actions on completed levels, game score '+(100*ea).toFixed(1)+'%. Prime Agent: '+lb[0]+' of '+base.length+', '+fmt(sum(lb))+' actions, '+(100*eb).toFixed(1)+'%. Human baseline for the whole game: '+fmt(base.reduce((a,b)=>a+b,0))+' actions.'+(GAMES[i][0]==='lf52'?' This is the game Prime Agent lost: '+fmt(lb[1][5])+' actions on level 6 without finishing it.':'')}
  function draw(m,k,e,w){const i=order[k],A=cardBy(PAIR[m]),B=PRIME,base=GAMES[i][1],n=base.length;let s='';
    const lw=w<480?78:120,pw=w-lw-46,rows=[[A,'var(--mute)'],[B,'var(--c4)']];
    let mx=0;rows.forEach(([c])=>c.g[i][1].forEach(a=>{mx=Math.max(mx,a)}));base.forEach(b=>{mx=Math.max(mx,b)});
    const sx=v=>pw*v/mx,bh=9,gh=n*(bh+3)+8;let y=4;
    rows.forEach(([c,col],r)=>{const g=c.g[i];s+=tx(lw-6,y+12,short(c.name).slice(0,w<480?11:18),{fs:11,a:'end',w:600});
      for(let l=0;l<n;l++){const yy=y+l*(bh+3),a=g[1][l]||0,done=l<g[0];
        s+=rc(lw,yy,sx(a)*Math.min(1,e*1.6),bh,done?col:'none',{r:2,s:done?null:'var(--bad)',da:done?null:'3 2'})+ln2(lw+sx(base[l]),yy-1,lw+sx(base[l]),yy+bh+1,'var(--ink)',{sw:1.6})}
      y+=gh});
    if(w<640){s+=tx(4,y+10,'bars: actions per level; dashed red: not completed',{fs:11,c:'var(--mute)'})+tx(4,y+24,'black tick: human baseline; one scale per game',{fs:11,c:'var(--mute)'});y+=34}else{s+=tx(lw,y+10,'bars: actions per level (dashed red: level not completed); black tick: human baseline; one scale per game',{fs:11,c:'var(--mute)'});y+=20}
    // running means
    const run=c=>{let t=0;for(let j=0;j<=k;j++)t+=envScore(c.g[order[j]],GAMES[order[j]][1],ARCRULE);return 100*t/(k+1)};
    const fin=c=>rhae(c,ARCRULE);
    rows.forEach(([c,col])=>{const v=run(c);s+=tx(lw-6,y+12,'running',{fs:11,a:'end',c:'var(--mute)'});s+=rc(lw,y+2,pw*v/100,12,col,{r:3})+ln2(lw+pw*fin(c)/100,y,lw+pw*fin(c)/100,y+16,'var(--ink)',{sw:1.2,da:'2 2'})+tx(lw+pw+6,y+12,v.toFixed(1),{fs:11});y+=18});
    s+=tx(4,y+10,'running mean of game scores; dotted tick: final RHAE',{fs:11,c:'var(--mute)'});y+=16;
    return svgW(w,y,s,'Scorecard replay')}
  function counters(m,k){const i=order[k],A=cardBy(PAIR[m]),B=PRIME,base=GAMES[i][1];
    const run=c=>{let t=0;for(let j=0;j<=k;j++)t+=envScore(c.g[order[j]],GAMES[order[j]][1],ARCRULE);return 100*t/(k+1)};
    return stat('Game',(k+1)+' of 25',GAMES[i][0]+', '+base.length+' levels')+stat(short(A.name).slice(0,20),(100*envScore(A.g[i],base,ARCRULE)).toFixed(1)+'%','running '+run(A).toFixed(1)+'%')+stat('Prime Agent',(100*envScore(B.g[i],base,ARCRULE)).toFixed(1)+'%','running '+run(B).toFixed(1)+'%')}
  makeAnim({id:'rp',modes,mode:'ch',draw,counters,dur:2400});
})();
