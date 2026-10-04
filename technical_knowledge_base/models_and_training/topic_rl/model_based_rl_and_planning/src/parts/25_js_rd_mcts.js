// ---- Reading section 5: one tic-tac-toe position, 30 MCTS simulations, three searchers ----
(function(){
  const card=document.getElementById('rd-mc');if(!card)return;
  const SHOW=[-1,0,0,1,1,0,0,0,0],BLOCK=5,SIMS=30,DETAIL=6;
  const nets={};const net=k=>nets[k]||(nets[k]=MB.Net(MB_DATA.ttt.ckpts[k]));
  let mode='p60',run=null,frames=[];
  const P=document.getElementById('rd-mcP'),T=document.getElementById('rd-mcT'),X=document.getElementById('rd-mcX'),C=document.getElementById('rd-mcN');
  const sym=v=>v===1?'X':v===-1?'O':'';
  function load(){run=mode==='uct'?MB.uct(SHOW,SIMS,MB.rng(4242),true):MB.puct(net(mode==='p0'?'0':'60'),SHOW,SIMS,true);
    frames=[];for(let s=0;s<SIMS;s++){if(s<DETAIL)for(let ph=0;ph<4;ph++)frames.push([s,ph]);else frames.push([s,3])}frames.push([SIMS-1,4])}
  // a board at (x, y) with cell size cs; o: {hi (cell to outline), last (cell just played), stats (per cell html-free text), shade (0..1 per cell)}
  function board(x,y,cs,b,o){o=o||{};let s='';
    for(let i=0;i<9;i++){const cx=x+(i%3)*cs,cy=y+Math.floor(i/3)*cs;
      const sh=o.shade?o.shade[i]:0;s+='<rect x="'+cx+'" y="'+cy+'" width="'+cs+'" height="'+cs+'" fill="'+(sh>0?'color-mix(in srgb, var(--c1) '+Math.round(10+60*sh)+'%, var(--bg))':'var(--bg)')+'" stroke="var(--line)"/>';
      if(b[i])s+=RD.t(cx+cs/2,cy+cs*0.68,sym(b[i]),{a:'middle',fs:Math.round(cs*0.55),w:700,fill:b[i]===1?'var(--c2)':'var(--c1)'});
      else if(o.stats&&o.stats[i])s+=RD.t(cx+cs/2,cy+cs*0.42,o.stats[i][0],{a:'middle',fs:Math.max(9,Math.round(cs*0.2)),w:700})+RD.t(cx+cs/2,cy+cs*0.72,o.stats[i][1],{a:'middle',fs:Math.max(8,Math.round(cs*0.15)),fill:'var(--mute)'});
      if(o.last===i)s+='<rect x="'+(cx+2)+'" y="'+(cy+2)+'" width="'+(cs-4)+'" height="'+(cs-4)+'" fill="none" stroke="var(--c5)" stroke-width="2.5"/>';
      if(o.hi===i)s+='<rect x="'+(cx+1)+'" y="'+(cy+1)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" fill="none" stroke="var(--ink)" stroke-width="2.5"/>'}
    return s}
  function draw(i){if(!run)load();const [si,ph]=frames[Math.min(i,frames.length-1)],tr=run.trace[si],prev=si>0?run.trace[si-1]:{N:Array(9).fill(0),W:Array(9).fill(0)};
    const after=ph>=3,Nn=after?tr.N:prev.N,Ww=after?tr.W:prev.W,mx=Math.max(1,...Nn);
    const W=RD.width(P),big=Math.min(78,Math.floor((Math.min(W,560)-20)/3/1.0)),bw=big*3;
    const stats=[],shade=[];for(let a=0;a<9;a++){if(SHOW[a]===0){stats[a]=['N '+Nn[a],Nn[a]?'Q '+RD.n(Ww[a]/Nn[a],2):'Q −'];shade[a]=Nn[a]/mx}else shade[a]=0}
    let s=RD.t(0,12,'Root: O to move',{fs:11,fill:'var(--mute)'})+board(0,18,big,SHOW,{stats,shade,hi:ph<4?tr.path[0]:BLOCK});
    // right or below: this simulation's path
    const side=W>=bw+300,ox=side?bw+24:0,oy=side?18:bw+40,avail=side?W-ox:W,L=tr.path.length,nb=L+(mode==='uct'&&ph>=2&&tr.roll.length?1:0)+1;
    const ms=Math.max(26,Math.min(48,Math.floor((avail-8*nb)/Math.max(nb,1)/3)));let x=ox,bb=SHOW.slice();
    s+=RD.t(ox,oy-6,ph===4?'Search result':'Simulation '+(si+1)+' of '+SIMS,{fs:11,fill:'var(--mute)'});
    if(ph<4){
      s+=board(x,oy,ms,bb,{});x+=ms*3+8;
      for(let k=0;k<L;k++){const a=tr.path[k];bb=bb.slice();bb[a]=MB.mover(bb);const show=ph>=1||k<L-1;
        s+='<text x="'+(x-6)+'" y="'+(oy+ms*1.6)+'" font-size="20" text-anchor="middle" fill="var(--mute)">›</text>';
        if(show)s+=board(x,oy,ms,bb,{last:a});else s+='<rect x="'+x+'" y="'+oy+'" width="'+ms*3+'" height="'+ms*3+'" fill="none" stroke="var(--line)" stroke-dasharray="3 3"/>';
        if(k===L-1&&ph===1)s+=RD.t(x+ms*1.5,oy+ms*3+13,'new node',{a:'middle',fs:10,fill:'var(--c5)',w:700});
        x+=ms*3+8}
      if(ph>=2&&mode==='uct'&&tr.roll.length){let b2=bb.slice();for(const a of tr.roll){b2[a]=MB.mover(b2)}
        s+='<text x="'+(x-6)+'" y="'+(oy+ms*1.6)+'" font-size="18" text-anchor="middle" fill="var(--mute)">⋯</text>'+board(x,oy,ms,b2,{});
        s+=RD.t(x+ms*1.5,oy+ms*3+13,'random playout, '+tr.roll.length+' move'+(tr.roll.length>1?'s':''),{a:'middle',fs:10,fill:'var(--mute)'})}
    }else{ // final: prior against visit share
      const pr=mode==='uct'?null:run.P,rows=[];for(let a=0;a<9;a++)if(SHOW[a]===0)rows.push(a);
      const bwid=Math.max(60,avail-110);rows.forEach((a,j)=>{const y=oy+4+j*18,pi=tr.N[a]/SIMS;
        s+=RD.t(ox,y+11,'cell '+(a+1)+(a===BLOCK?' (block)':''),{fs:10.5,w:a===BLOCK?700:400});
        if(pr)s+='<rect x="'+(ox+78)+'" y="'+(y+1)+'" width="'+(bwid*pr[a]).toFixed(1)+'" height="6" fill="var(--c4)"/>';
        s+='<rect x="'+(ox+78)+'" y="'+(y+8)+'" width="'+(bwid*pi).toFixed(1)+'" height="7" fill="var(--c1)"/>'+RD.t(ox+82+bwid*Math.max(pi,pr?pr[a]:0),y+14,(100*pi).toFixed(0)+'%',{fs:10,fill:'var(--mute)'})});
      s+=RD.t(ox,oy+4+rows.length*18+12,(pr?'purple: network prior p; ':'')+'blue: visit share π = N / '+SIMS,{fs:10,fill:'var(--mute)'})}
    const H=side?Math.max(bw+24,oy+ms*3+24):oy+(ph===4?6*18+30:ms*3+24);
    P.innerHTML=RD.svg(Math.max(W,10),H,s,'MCTS on a tic-tac-toe position');
    // caption
    const vO=(tr.path.length%2===0?tr.v:-tr.v),who=v=>v>0?'O wins':v<0?'X wins':'a draw';
    const names=['1 Selection','2 Expansion','3 '+(mode==='uct'?'Simulation':'Evaluation'),'4 Backup'];
    if(ph===4){T.textContent='After '+SIMS+' simulations: the visit counts are the search policy';
      X.innerHTML=(mode==='uct'?'UCT put '+tr.N[BLOCK]+' of '+SIMS+' simulations on the block and would play cell '+(MB.top(tr.N)+1)+'. Random playouts are a weak evaluator here: a random X often fails to finish its row, so leaving it open looks safe. With more simulations UCT does find the block (92.5% of seeds at 128, every seed from 256).':mode==='p0'?'The untrained network\'s prior is close to uniform, yet '+tr.N[BLOCK]+' of '+SIMS+' simulations go to the block: in a game this short, simulations soon reach real endings, whose values are exact, and backups carry them to the root.':'The trained prior already favours the block ('+RD.pct(run.P[BLOCK],0)+'), and the network\'s values confirm it: '+tr.N[BLOCK]+' of '+SIMS+' simulations. The visit share π is sharper than p: this is the improved policy that AlphaZero trains p towards.')}
    else{T.textContent='Simulation '+(si+1)+': '+(si<DETAIL?names[ph]:'all four steps');
      const pathTxt=tr.path.map((a,k)=>(k%2===0?'O':'X')+' in cell '+(a+1)).join(', then ');
      const txt=[mode==='uct'?'From the root the tree policy follows UCB1 where every move has been tried and picks an untried move otherwise: '+pathTxt+'.':'From the root PUCT picks Q + 1.25 P √N / (1 + N) at each node until it leaves the tree: '+pathTxt+'.',
        'The last position on the path is added to the tree'+(mode==='uct'?' (one untried move per simulation).':(tr.kind==='terminal'?'; it is a finished game.':' and the network gives it a prior over its moves and a value.')),
        mode==='uct'?(tr.roll.length?'A uniformly random playout from the new node: '+tr.roll.length+' more moves, ending in '+who(vO*(1))+'.':'The new node is already a finished game: '+who(vO)+'.'):(tr.kind==='terminal'?'No network call: the game is over, '+who(vO)+', an exact value.':'No rollout: the network\'s value for the new position is '+RD.n(tr.v,2)+' for the player to move there, '+RD.n(vO,2)+' for O.'),
        'The result ('+RD.n(vO,2)+' for O) is added along the path, with alternating sign at each level, and every edge on it gets one more visit. Root counts now: cell '+(tr.path[0]+1)+' has N = '+tr.N[tr.path[0]]+'.'];
      X.innerHTML=si<DETAIL?txt[ph]:txt[0]+' '+txt[2]}
    const top=MB.top(Nn);C.innerHTML=RD.stat('Simulations done',after?si+1:si,'of '+SIMS)+RD.stat('Visits to the block (cell 6)',Nn[BLOCK],'the only move that does not lose')+RD.stat('Most visited move',Nn[top]?'cell '+(top+1):'none yet',top===BLOCK&&Nn[top]?'correct':'')+RD.stat('Evaluations',mode==='uct'?'random playouts':'network, no rollouts','')}
  load();
  const an=RD.anim({card:'rd-mc',ctl:'rd-mcC',n:frames.length,draw,ms:900,label:'Step of the search'});
  document.getElementById('rd-mcM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    document.querySelectorAll('#rd-mcM button').forEach(x=>x.classList.toggle('on',x===b));mode=b.dataset.m;load();an.reset(frames.length);an.play()});
  RD.onResize(()=>an.redraw());
  // reproduction line
  const pu=MB.puct(net('60'),SHOW,SIMS),p0=MB.puct(net('0'),SHOW,SIMS),uc=MB.uct(SHOW,SIMS,MB.rng(4242));
  document.getElementById('rd-mcR').innerHTML='<b>Computed live, checked against Python.</b> Root visit counts after 30 simulations (cells 2, 3, 6, 7, 8, 9): UCT '+[1,2,5,6,7,8].map(a=>uc.N[a]).join(', ')+'; PUCT with the untrained network '+[1,2,5,6,7,8].map(a=>p0.N[a]).join(', ')+'; PUCT with the trained network '+[1,2,5,6,7,8].map(a=>pu.N[a]).join(', ')+'. src/recompute.py runs the same searches in Python and gets the same counts, and the 40-seed UCT percentages in the text.';
})();
