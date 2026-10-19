// ---- ARC-AGI-3: harness against effort (ARC Prize, Semi-Private, 3 Sep 2026) and the harness animation ----
const ARC=[['max',62.7,26098,98.6,17332],['xhigh',59.3,37317,98.4,18147],['high',54.8,40705,99.9,18817],['medium',38.6,48090,98.4,19285],['low',17.5,38166,98.0,21298],['none',35.2,49791,96.7,23457]];
(function(){
  let mode='s';
  function draw(){
    const W=640,H=300,pl=48,pr=18,pt=16,pb=40;let s='';
    if(mode==='s'){
      const X=v=>pl+(W-pl-pr)*(v-14000)/(52000-14000),Y=v=>pt+(H-pt-pb)*(1-v/100);
      [0,25,50,75,100].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'%</text>'});
      [15000,25000,35000,45000].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(H-pb)+'" y2="'+(H-pb+4)+'" stroke="var(--mute)"/><text x="'+X(v)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">$'+(v/1000)+'K</text>'});
      s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">cost of the Semi-Private run</text>';
      [[1,2,'var(--bad)','Standard harness'],[3,4,'var(--good)','Provider Adapter']].forEach(([a,b,c,n])=>{
        s+='<path d="'+ARC.map((r,i)=>(i?'L':'M')+X(r[b])+' '+Y(r[a])).join('')+'" fill="none" stroke="'+c+'" stroke-opacity=".45" stroke-dasharray="3 3"/>';
        ARC.slice().sort((p,q)=>p[b]-q[b]).forEach((r,i)=>{const x=X(r[b]),y=Y(r[a]);let lab;
          if(a===3){const lx=X(15500)+i*52,ly=Y(84);lab='<line x1="'+x+'" y1="'+(y+5)+'" x2="'+lx+'" y2="'+(ly-10)+'" stroke="'+c+'" stroke-opacity=".5"/><text x="'+lx+'" y="'+ly+'" font-size="10.5" text-anchor="middle">'+r[0]+'</text>'}
          else{const dn=r[0]==='none'||r[0]==='low';lab='<text x="'+(x+7)+'" y="'+(y+(dn?16:-8))+'" font-size="10.5">'+r[0]+'</text>'}
          s+='<g style="cursor:help">'+lab+'<circle cx="'+x+'" cy="'+y+'" r="5.5" fill="'+c+'"/><title>'+n+', '+r[0]+' effort: '+r[a]+'% for $'+fmt(r[b])+'</title></g>'})});
      s+='<text x="'+(W-pr)+'" y="'+(Y(92)-2)+'" font-size="11.5" text-anchor="end" fill="var(--good)" font-weight="600">Provider Adapter</text><text x="'+(W-pr)+'" y="'+(Y(20))+'" font-size="11.5" text-anchor="end" fill="var(--bad)" font-weight="600">Standard harness</text>';
      $('arcSvg').innerHTML=svgEl(W,H,s,'ARC-AGI-3 score against cost for six efforts on two harnesses');
    }else{
      const mx=2400,X=v=>130+(W-130-60)*v/mx;let y=24;
      s+='<text x="130" y="14" font-size="11" fill="var(--mute)">dollars per percentage point scored</text>';
      ARC.forEach(r=>{const a=r[2]/r[1],b=r[4]/r[3];
        s+='<text x="122" y="'+(y+15)+'" font-size="11.5" text-anchor="end">'+r[0]+'</text>';
        s+='<rect x="130" y="'+y+'" width="'+(X(a)-130)+'" height="10" rx="2" fill="var(--bad)"/><text x="'+(X(a)+5)+'" y="'+(y+9)+'" font-size="10.5">$'+fmt(a)+'</text>';
        s+='<rect x="130" y="'+(y+12)+'" width="'+(X(b)-130)+'" height="10" rx="2" fill="var(--good)"/><text x="'+(X(b)+5)+'" y="'+(y+21)+'" font-size="10.5">$'+fmt(b)+'</text>';y+=40});
      s+='<text x="130" y="'+(y+6)+'" font-size="10.5" fill="var(--bad)">■ standard</text><text x="210" y="'+(y+6)+'" font-size="10.5" fill="var(--good)">■ adapter</text>';
      $('arcSvg').innerHTML=svgEl(W,y+14,s,'Dollars per point by effort and harness');
    }
    const bestS=ARC[0],bestA=ARC[2],worstA=ARC[5];
    $('arcPin').innerHTML='Best standard run '+bestS[1]+'% (max, $'+fmt(bestS[2])+'); best adapter run '+bestA[3]+'% (high, $'+fmt(bestA[4])+'): <span class="m">'+(bestA[3]-bestS[1]).toFixed(1)+'</span> points apart, <span class="m">'+(100*(1-bestA[4]/bestS[2])).toFixed(1)+'%</span> fewer dollars. The adapter\'s worst ('+worstA[3]+'% at none) still beats the standard harness\'s best, and the gap grows as effort falls, from '+(ARC[0][3]-ARC[0][1]).toFixed(1)+' points at max to '+(ARC[4][3]-ARC[4][1]).toFixed(1)+' at low.';
  }
  segBind('arcY',m=>{mode=m;draw()});onTab('t-read',draw);
})();
// Harness animation: the same game, two turns, standard harness against Provider Adapter
(function(){
  const cF='var(--acc)',cR='var(--c4)',cB='var(--bad)',cG='var(--good)';
  const GAME=[0,0,1,1,0,0, 0,2,2,1,0,0, 0,0,0,1,3,0, 4,4,0,0,3,0, 0,4,0,0,0,0, 0,0,0,2,2,0];
  const GC=['var(--soft)','var(--c5)','var(--c2)','var(--c3)','var(--c6)'];
  function frame(x,y,op,shift){let s='<rect x="'+x+'" y="'+y+'" width="64" height="64" rx="4" fill="var(--bg)" stroke="var(--line)"/>';
    GAME.forEach((v,i)=>{const j=shift&&v===2?i+1:i;s+='<rect x="'+(x+3+(i%6)*10)+'" y="'+(y+3+Math.floor(i/6)*10)+'" width="9" height="9" rx="1.5" fill="'+GC[shift&&v===2&&i%6===2?0:v]+'"/>'});
    if(shift)s+='<rect x="'+(x+3+4*10)+'" y="'+(y+3+1*10)+'" width="9" height="9" rx="1.5" fill="'+GC[2]+'"/>';
    return grp(op,s)}
  function turn(o,n,k,e,ph,ada,t){ // o: origin {x,y}, n: turn number
    let s=tx(o.x,o.y,'Turn '+n+' · request '+n,{fs:11.5,w:600});
    const fy=o.y+10,on=t>=0;
    s+=frame(o.x,fy,on?1:.15,n===2);
    s+=grp(on?1:.2,bx(o.x+82,fy,92,64,'boxa',['GPT-6 Astra','hidden reasoning'],11.5));
    // reasoning squares
    const ry=fy+92;s+=tx(o.x,ry-8,'reasoning tokens, 1 square ≈ 1K (illustrative)',{fs:10,c:'var(--mute)'});
    return {s,fy,ry}}
  function draw(mi,k,e,ph,nar){
    const ada=mi===1,W=nar?360:660,H=nar?520:280;
    const O1=nar?{x:10,y:16}:{x:12,y:16},O2=nar?{x:10,y:272}:{x:372,y:16};
    let s='';
    // turn 1
    const t1=turn(O1,1,k,e,ph,ada,0);s+=t1.s;
    if(k===0&&!RMOT)s+=pk([[O1.x-4,t1.fy+32],[O1.x+32,t1.fy+32]],e,cF);
    if(k===1&&!RMOT)s+=pk([[O1.x+64,t1.fy+32],[O1.x+82,t1.fy+32]],e,cF);
    const n1=k<1?0:k===1?Math.round(12*e):12,drop=!ada&&k>=3;
    s+=grp(drop?(k===3?1-.75*e:.25):1,sq(O1.x,t1.ry,18,n1,cR,.85,14,12));
    if(drop)s+=grp(k===3?e:1,tx(O1.x+175,t1.ry+10,'dropped',{fs:11,c:cB,w:600}));
    if(ada&&k>=3)s+=grp(k===3?e:1,tx(O1.x+175,t1.ry+10,'kept, opaque',{fs:11,c:cG,w:600}));
    // notes and action
    const nb=[O1.x+186,t1.fy,90,30],ab=[O1.x+186,t1.fy+36,90,28];
    const nOp=k<2?0:k===2?e:1;s+=grp(nOp,bx(nb[0],nb[1],nb[2],nb[3],'boxc',['notes: "8→3"'],10.5)+bx(ab[0],ab[1],ab[2],ab[3],'box',['action'],11));
    // carry between requests
    if(k>=3){const op=k===3?e:1;let c='';
      if(nar){const y0=t1.ry+40,y1=O2.y-8;
        c+=ar(70,y0,70,y1)+tx(78,(y0+y1)/2+4,'notes',{fs:11,c:cG});
        c+=(ada?ar(200,y0,200,y1):'<line x1="200" y1="'+y0+'" x2="200" y2="'+y1+'" stroke="var(--dim)" stroke-dasharray="4 3"/>')+tx(208,(y0+y1)/2+4,ada?'opaque state':'state ✕',{fs:11,c:ada?cG:cB});
        if(!RMOT&&ph>=0){c+='<circle cx="70" cy="'+lerp(y0,y1,ph)+'" r="3" fill="'+cG+'"/>';if(ada)c+='<circle cx="200" cy="'+lerp(y0,y1,ph)+'" r="3" fill="'+cR+'"/>'}}
      else{const x0=O1.x+282,x1=O2.x-6,y=t1.fy+15,y2=t1.fy+52;
        c+=ar(x0,y,x1,y)+tx((x0+x1)/2,y-5,'notes',{fs:10.5,a:'middle',c:cG});
        c+=(ada?ar(x0,y2,x1,y2):'<line x1="'+x0+'" y1="'+y2+'" x2="'+x1+'" y2="'+y2+'" stroke="var(--dim)" stroke-dasharray="4 3"/>')+tx((x0+x1)/2,y2-5,ada?'state':'state ✕',{fs:10.5,a:'middle',c:ada?cG:cB});
        if(!RMOT&&ph>=0){c+='<circle cx="'+lerp(x0,x1,ph)+'" cy="'+y+'" r="3" fill="'+cG+'"/>';if(ada)c+='<circle cx="'+lerp(x0,x1,ph)+'" cy="'+y2+'" r="3" fill="'+cR+'"/>'}}
      s+=grp(op,c)}
    // turn 2
    const t2=turn(O2,2,k,e,ph,ada,k>=4?0:-1);s+=t2.s;
    if(k>=4){const u=k===4?e:1;
      if(!ada){const rb=Math.round(6*cl01(u*2)),nw=Math.round(5*cl01(u*2-1));
        s+=sq(O2.x,t2.ry,18,rb,cB,.75,14,12)+sq(O2.x+6*14,t2.ry,18,nw,cR,.85,14,12);
        s+=grp(cl01(u*2),tx(O2.x,t2.ry+30,'rebuild what turn 1 knew',{fs:10.5,c:cB}))+grp(cl01(u*2-1),tx(O2.x+6*14,t2.ry+42,'new progress',{fs:10.5,c:cR}));}
      else{const nw=Math.round(5*u);s+=sq(O2.x,t2.ry,18,nw,cR,.85,14,12)+grp(u,tx(O2.x,t2.ry+30,'new progress only',{fs:10.5,c:cR}))}
      s+=grp(u,bx(O2.x+186,t2.fy,90,30,'boxc',[ada?'notes + state':'notes'],10.5)+bx(O2.x+186,t2.fy+36,90,28,'box',['action'],11));}
    // long game: the measured outcome, to scale
    const by=nar?470:236,bx0=nar?104:150,bw=W-bx0-(nar?100:120);
    s+=tx(nar?10:12,by-8,'Whole Semi-Private run, as measured by ARC Prize',{fs:11,c:'var(--mute)'});
    const row=(y,n,v,txt,c,op)=>grp(op,tx(nar?10:12,y+9,n,{fs:11})+'<rect x="'+bx0+'" y="'+y+'" width="'+bw+'" height="10" rx="2" fill="var(--soft)"/><rect x="'+bx0+'" y="'+y+'" width="'+(bw*v).toFixed(1)+'" height="10" rx="2" fill="'+c+'"/>'+tx(bx0+bw*v+5,y+9,txt,{fs:10.5}));
    const g=k===5?e:0;
    s+=row(by+2,'Standard, best',.627*g,g?'62.7%, $26,098':'',cB,ada?(k===5?.4:.25):1);
    s+=row(by+20,'Adapter, best',.999*g,g?'99.9%, $18,817':'',cG,ada?1:(k===5?.4:.25));
    return {W,H,s,label:ada?'Provider Adapter harness':'Standard harness'}}
  const common=[['A frame arrives','The harness sends GPT-6 Astra the current frame of an unfamiliar ARC-AGI-3 game. It has to explore, infer the goal and plan, with no instructions.'],
    ['Astra reasons, out of sight','Hidden reasoning works out what the objects do. The caller sees none of it; the tokens are billed as output, and on Astra part of the work may stay in activations.'],
    ['It acts and keeps notes','It returns an action and the notes it chooses to carry forward. ARC Prize saw Astra invent a compact algebraic shorthand for them, such as "extend8 to3".']];
  const cnt=ada=>(k,e)=>{const r1=k<1?0:k===1?12*e:12,r2=k<4?0:(ada?5:11)*(k===4?e:1),tot=r1+r2;
    return k===5?stat('Best Semi-Private score',ada?'99.9%':'62.7%',ada?'high effort':'max effort')+stat('Cost of that run',ada?'$18,817':'$26,098',ada?'27.9% less':'')+stat('Tokens, 167 pairs both solved',ada?'49% fewer':'baseline',ada?'and 3.66× faster':'')
      :stat('Reasoning tokens so far',fmt(Math.round(tot))+'K','illustrative')+stat('Requests',k>=4?'2':'1','one per turn')+stat('Carried to the next request',k<3?'nothing yet':ada?'notes + opaque state':'notes only',k<3?'':ada?'encrypted, on OpenAI\'s side':'the transcript too')};
  makeAnim({id:'hx',aria:'Harness',dur:3600,
    foot:'Token counts per turn are <span class="ill">illustrative</span>, drawn to one scale for both harnesses; the last step\'s figures are ARC Prize\'s measurements ({{ARC Prize|@arc}}).',
    modes:[
      {label:'Standard harness',steps:common.concat([['Between requests: only the notes survive','The standard harness is provider-neutral: the next request carries the transcript and the notes. Astra\'s opaque reasoning state is dropped, so whatever it had worked out but not written down is gone.'],
        ['Turn 2: rebuild, then move','Before it can make new progress, part of turn 1\'s understanding has to be rebuilt from the notes and the transcript: more reasoning tokens, more time, for the same next move.'],
        ['A whole game, a whole run','The rebuilding repeats every turn. Across the Semi-Private set the best standard run scored 62.7%, at max effort, for $26,098.']]),draw:(k,e,ph,n)=>draw(0,k,e,ph,n),cnt:cnt(false)},
      {label:'Provider Adapter',steps:common.concat([['Between requests: the state is kept','The Provider Adapter passes back Astra\'s opaque reasoning state with the notes: in OpenAI\'s API, encrypted reasoning items or a <code>previous_response_id</code>, which only OpenAI can read.'],
        ['Turn 2: continue where it stopped','Nothing to rebuild: the next move starts from the state turn 1 left. The same progress costs fewer reasoning tokens.'],
        ['A whole game, a whole run','When a game runs long the adapter compacts earlier turns so the model keeps reusing its work. Best run: 99.9% at high effort for $18,817; on the 167 pairs both harnesses solved, 49% fewer tokens and 3.66 times faster.']]),draw:(k,e,ph,n)=>draw(1,k,e,ph,n),cnt:cnt(true)}]});
})();
