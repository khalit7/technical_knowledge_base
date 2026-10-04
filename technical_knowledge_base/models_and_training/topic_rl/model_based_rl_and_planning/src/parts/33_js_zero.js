// ---- Self-play lab tab ----
(function(){
  const tab=document.getElementById('t-zero');if(!tab)return;
  const $=id=>document.getElementById(id),Z=MB_DATA.ttt,KS=Object.keys(Z.ckpts).map(Number).sort((a,b)=>a-b).map(String);
  const reg=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-zero']=window.TAB_RENDER['t-zero']||[]).push(f)};
  const visible=()=>!tab.hidden&&tab.offsetParent!==null;
  const nets={};const net=k=>nets[k]||(nets[k]=MB.Net(Z.ckpts[k]));
  MB.solve([0,0,0,0,0,0,0,0,0]);
  // ---- 1. training curves ----
  function drawA(){const L=Z.log,xs=L.map(r=>r[0]);
    const se=[{xs,ys:L.map(r=>r[4]),col:'var(--c1)',w:2,lab:'prior\'s top move optimal (share of positions)'},{xs,ys:L.map(r=>r[5]),col:'var(--c2)',w:2,lab:'mean |v − exact value|'}];
    RD.chart($('zl-aP'),se,{x0:0,x1:60,y0:0,y1:1,H:220,xt:[[0,'0'],[10,'10'],[20,'20'],[30,'30'],[40,'40'],[50,'50'],[60,'60']],xlab:'iteration (dashed: checkpoints)',yt:[[0,'0'],[0.5,'0.5'],[1,'1']],
      extra:(X,Y)=>KS.map(k=>'<line x1="'+X(+k)+'" x2="'+X(+k)+'" y1="'+Y(1)+'" y2="'+Y(0)+'" stroke="var(--mute)" stroke-dasharray="2 3" opacity=".6"/>').join(''),label:'Network accuracy by iteration'});
    RD.legend($('zl-aL'),se);
    const el=$('zl-aG'),W=RD.width(el),H=70,l=40,r=10;let s='';const bw=(W-l-r)/60;
    L.filter(r=>r[0]>0).forEach(row=>{const x=l+(row[0]-1)*bw;let y=4;[[row[6],'var(--c2)'],[row[7],'var(--c1)'],[row[8],'var(--dim)']].forEach(([n,c])=>{const h=(H-14)*n/48;s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,bw-1).toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+c+'"/>';y+=h})});
    s+=RD.t(l-4,12,'48',{a:'end',fs:10,fill:'var(--mute)'})+RD.t(l-4,H-10,'0',{a:'end',fs:10,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Self-play results per iteration')}
  // ---- 2. explorer ----
  const PRE={show:[-1,0,0,1,1,0,0,0,0],empty:[0,0,0,0,0,0,0,0,0],fork:[1,0,0,0,-1,0,0,0,1],win:[1,1,0,-1,-1,0,0,0,0]};
  let ck='60',board=PRE.show.slice(),hist=[];
  $('zl-bK').innerHTML=KS.map(k=>'<button data-k="'+k+'"'+(k===ck?' class="on"':'')+'>'+k+'</button>').join('');
  function drawB(){const b=board,el=$('zl-bB'),W=Math.min(RD.width(el),330),cs=Math.floor(W/3),[p,v]=net(ck).evaluate(b),term=MB.terminal(b)[0];
    const sims=+$('zl-bN').value,mode=$('zl-bS').value;let res=null;if(!term)res=mode==='uct'?MB.uct(b,sims,MB.rng(4242)):MB.puct(net(ck),b,sims);
    const sol=MB.solved(b),m=MB.mover(b),mx=res?Math.max(1,...res.N):1;let s='';
    for(let i=0;i<9;i++){const x=(i%3)*cs,y=Math.floor(i/3)*cs,sh=res&&b[i]===0?res.N[i]/mx:0;
      s+='<rect x="'+x+'" y="'+y+'" width="'+cs+'" height="'+cs+'" fill="'+(sh>0?'color-mix(in srgb, var(--c1) '+Math.round(8+55*sh)+'%, var(--bg))':'var(--bg)')+'" stroke="var(--line)" data-c="'+i+'" style="cursor:'+(b[i]===0&&!term?'pointer':'default')+'"/>';
      if(b[i])s+=RD.t(x+cs/2,y+cs*.68,b[i]===1?'X':'O',{a:'middle',fs:Math.round(cs*.55),w:700,fill:b[i]===1?'var(--c2)':'var(--c1)'});
      else if(!term){const b2=b.slice();b2[i]=m;const vv=-MB.solve(b2),lab=vv>0?'W':vv<0?'L':'D';
        s+=RD.t(x+cs/2,y+cs*.3,'p '+(100*p[i]).toFixed(0)+'%',{a:'middle',fs:Math.max(9,Math.round(cs*.13)),fill:'var(--c4)'})+RD.t(x+cs/2,y+cs*.55,'N '+res.N[i],{a:'middle',fs:Math.max(10,Math.round(cs*.16)),w:700})+RD.t(x+cs/2,y+cs*.8,lab,{a:'middle',fs:Math.max(10,Math.round(cs*.15)),w:700,fill:vv>0?'var(--good)':vv<0?'var(--bad)':'var(--mute)'})}}
    el.innerHTML=RD.svg(cs*3,cs*3,s,'Tic-tac-toe board');
    el.querySelectorAll('rect[data-c]').forEach(r=>r.addEventListener('click',()=>{const i=+r.dataset.c;if(board[i]!==0||MB.terminal(board)[0])return;hist.push(board.slice());board=board.slice();board[i]=MB.mover(board);drawB()}));
    const who=m===1?'X':'O',ex=sol[0]>0?'win':sol[0]<0?'loss':'draw';
    if(term){const w=MB.terminal(b)[1];$('zl-bO').innerHTML=RD.stat('Game over',w===1?'X wins':w===-1?'O wins':'Draw','Undo or pick a position');return}
    let pt=-1,pb=-1;for(let a=0;a<9;a++)if(b[a]===0&&p[a]>pb){pb=p[a];pt=a}
    const nt=MB.top(res.N);
    $('zl-bO').innerHTML=RD.stat('To move',who,'exact result with best play: '+ex)+RD.stat('Network value v',RD.n(v,2),'for '+who+'; exact: '+(sol[0]>0?'+1':sol[0]<0?'−1':'0'))+
      RD.stat('Prior\'s top move','cell '+(pt+1),sol[1].includes(pt)?'optimal':'not optimal')+RD.stat((mode==='uct'?'UCT':'PUCT')+'\'s most visited, '+sims+' sim'+(sims>1?'s':''),'cell '+(nt+1),(sol[1].includes(nt)?'optimal':'not optimal')+'; π = '+(100*res.N[nt]/sims).toFixed(0)+'%')+
      RD.stat('Optimal moves',sol[1].map(a=>a+1).join(', '),'cells numbered 1 to 9 by rows')}
  $('zl-bK').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;ck=b.dataset.k;document.querySelectorAll('#zl-bK button').forEach(x=>x.classList.toggle('on',x===b));drawB()});
  $('zl-bP').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('#zl-bP button').forEach(x=>x.classList.toggle('on',x===b));board=PRE[b.dataset.p].slice();hist=[];drawB()});
  $('zl-bU').addEventListener('click',()=>{if(hist.length){board=hist.pop();drawB()}});
  $('zl-bN').addEventListener('change',drawB);$('zl-bS').addEventListener('change',drawB);
  // ---- 3. table ----
  function drawC(){const rows=KS.map(k=>{const nt=net(k);let acc=0,mae=0,cls=0,c=0;
      for(const [key,[vs,opt]] of MB.allSolved()){if(!opt.length)continue;const b=key.split(',').map(Number),[p,v]=nt.evaluate(b);let a=-1,bp=-2;for(let i=0;i<9;i++)if(b[i]===0&&p[i]>bp){bp=p[i];a=i}
        acc+=opt.includes(a);mae+=Math.abs(v-vs);cls+=(vs===0&&Math.abs(v)<1/3)||(vs===1&&v>=1/3)||(vs===-1&&v<=-1/3);c++}
      const o=Z.offline[k];return '<tr><td>'+k+'</td><td class="num">'+(k==='0'?0:Z.log[+k][1]).toLocaleString('en-US')+'</td><td class="num">'+RD.pct(acc/c)+'</td><td class="num">'+RD.pct(Z.search_opt[k])+'</td><td class="num">'+(mae/c).toFixed(3)+'</td><td class="num">'+RD.pct(cls/c)+'</td><td class="num">'+o.games.raw.losses+'</td><td class="num">'+o.games.search50.losses+'</td></tr>'});
    $('zl-cT').innerHTML='<thead><tr><th>After iteration</th><th class="num">Self-play games</th><th class="num">Prior\'s top move optimal</th><th class="num">50-sim search optimal</th><th class="num">Value error</th><th class="num">Value in the right third</th><th class="num">Losses / 100, raw</th><th class="num">Losses / 100, search</th></tr></thead><tbody>'+rows.join('')+'</tbody>'}
  // ---- 4. simulations needed ----
  let rel=null;
  function drawD(){const SHOW=PRE.show,S=[4,8,16,32,64,128,256,512,1024];
    if(!rel){rel={uct:S.map(s=>{let c=0;for(let i=0;i<40;i++)c+=MB.top(MB.uct(SHOW,s,MB.rng(7000+i)).N)===5;return c/40})};for(const k of ['0','1','60'])rel[k]=S.map(s=>MB.top(MB.puct(net(k),SHOW,s).N)===5?1:0)}
    const se=[{xs:S,ys:rel.uct,col:'var(--c2)',w:2,lab:'UCT, random playouts (40 seeds)',dots:true},{xs:S,ys:rel['0'],col:'var(--c4)',w:1.6,lab:'PUCT, untrained network',dots:true,dash:'4 3'},{xs:S,ys:rel['1'],col:'var(--c3)',w:1.6,lab:'PUCT, after iteration 1',dots:true,dash:'2 2'},{xs:S,ys:rel['60'],col:'var(--c1)',w:2,lab:'PUCT, after iteration 60',dots:true}];
    RD.chart($('zl-dP'),se,{x0:4,x1:1024,logx:true,y0:0,y1:1.05,H:220,xt:S.map(s=>[s,String(s)]),yt:[[0,'0%'],[0.5,'50%'],[1,'100%']],xlab:'simulations (log scale)',ylab:'chooses the block',label:'Share choosing the block by simulations'});
    RD.legend($('zl-dL'),se)}
  let started=false;
  reg(()=>{drawA();drawB();if(!started){started=true;setTimeout(()=>{drawC();drawD()},20)}else drawD()});
  addEventListener('resize',()=>{if(visible()){drawA();drawB();if(rel)drawD()}});
})();
