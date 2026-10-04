// ---- Dyna lab tab ----
(function(){
  const tab=document.getElementById('t-dyna');if(!tab)return;
  const $=id=>document.getElementById(id);
  const reg=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-dyna']=window.TAB_RENDER['t-dyna']||[]).push(f)};
  const visible=()=>!tab.hidden&&tab.offsetParent!==null;
  const COLS={0:'var(--c2)',1:'var(--c5)',5:'var(--c3)',10:'var(--c6)',50:'var(--c1)',200:'var(--c4)'};
  // ---- 1. Figure 8.2 ----
  let A=null;
  function runA(){const ns=[...document.querySelectorAll('#dl-aN button.on')].map(b=>+b.dataset.n);if(!ns.length)return;
    const p={alpha:+$('dl-aA').value/100,eps:+$('dl-aE').value/100,gamma:0.95},runs=+$('dl-aR').value;
    $('dl-aP').innerHTML='<p class="small mute">Running...</p>';
    setTimeout(()=>{const t0=performance.now();A={ns,p,runs,c:MB.dynaCurves(ns,runs,50,p),ms:performance.now()-t0};drawA()},20)}
  function drawA(){MB.drawMaze($('dl-aMz'),MB.MAZES.dyna,{label:'Dyna maze'});if(!A)return;
    const xs=[];for(let e=2;e<=50;e++)xs.push(e);const se=A.ns.map(n=>({xs,ys:A.c[n].mean.slice(1),col:COLS[n],lab:'n = '+n,w:1.8}));
    const top=Math.max(200,Math.ceil(Math.max(...se.map(s=>Math.max(...s.ys)))/100)*100);
    RD.chart($('dl-aP'),se,{x0:2,x1:50,y0:0,y1:top,H:240,xt:[[2,'2'],[10,'10'],[20,'20'],[30,'30'],[40,'40'],[50,'50 episodes']],yt:[[0,'0'],[top/2,String(top/2)],[top,String(top)]],ylab:'steps per episode (mean of '+A.runs+' runs)',hl:[{y:14,lab:'14'}],label:'Steps per episode'});
    RD.legend($('dl-aL'),se);
    const reach=n=>{const m=A.c[n].mean;for(let e=1;e<50;e++)if(m.slice(e).every(x=>x<=20))return 'from episode '+(e+1);return 'not within 50'};
    const tot=n=>A.c[n].mean.reduce((a,b)=>a+b,0);
    $('dl-aO').innerHTML=A.ns.map(n=>RD.stat('n = '+n,reach(n),'every later mean ≤ 20 steps; '+Math.round(tot(n)).toLocaleString('en-US')+' real steps in 50 episodes, '+Math.round(tot(n)*n).toLocaleString('en-US')+' planning updates')).join('');
    const def=A.p.alpha===0.1&&A.p.eps===0.1&&A.runs===30;
    $('dl-aRep').innerHTML=(def?'<b>Book defaults</b> (α = 0.1, ε = 0.1, γ = 0.95, 30 runs): the shape of Figure 8.2 reproduces independently; the book reads about 25, 5 and 3 episodes to ε-optimal for n = 0, 5 and 50. ':'<b>Not the book\'s settings</b>: α = '+A.p.alpha.toFixed(2)+', ε = '+A.p.eps.toFixed(2)+', '+A.runs+' runs. ')+'Episode 1 is a random walk and identical for every n (mean '+(A.c[A.ns[0]].first.reduce((a,b)=>a+b,0)/A.runs).toFixed(0)+' steps here; 869 expected). Computed in '+(A.ms/1000).toFixed(2)+' s.'}
  $('dl-aN').addEventListener('click',e=>{const b=e.target.closest('button');if(b)b.classList.toggle('on')});
  $('dl-aA').addEventListener('input',e=>{$('dl-aAv').textContent=(e.target.value/100).toFixed(2)});
  $('dl-aE').addEventListener('input',e=>{$('dl-aEv').textContent=(e.target.value/100).toFixed(2)});
  $('dl-aGo').addEventListener('click',runA);
  $('dl-aDef').addEventListener('click',()=>{$('dl-aA').value=10;$('dl-aE').value=10;$('dl-aR').value=30;$('dl-aAv').textContent='0.10';$('dl-aEv').textContent='0.10';
    document.querySelectorAll('#dl-aN button').forEach(b=>b.classList.toggle('on',['0','5','50'].includes(b.dataset.n)));runA()});
  // ---- 2. changing mazes ----
  let maze='block',B=null;
  // slider 0 -> κ = 0; 1..40 -> 10^-4.9 .. 10^-1 (20 -> 10^-3)
  const kappa=()=>{const v=+$('dl-bK').value;return v===0?0:Math.pow(10,(v-20)/10-3)};
  function runB(){const n=+$('dl-bN').value,a=+$('dl-bA').value/100,k=kappa(),runs=+$('dl-bR').value,steps=maze==='block'?3000:6000,sw=maze==='block'?1000:3000;
    $('dl-bP').innerHTML='<p class="small mute">Running...</p>';
    setTimeout(()=>{const t0=performance.now();B={maze,n,a,k,runs,steps,sw,q:MB.changingMaze(maze,false,steps,sw,n,a,0.1,0.95,0,runs),qp:MB.changingMaze(maze,true,steps,sw,n,a,0.1,0.95,k,runs),ms:performance.now()-t0};drawB()},20)}
  function drawB(){const mz=MB.MAZES[maze];MB.drawMaze($('dl-bMz1'),mz,{walls:MB.wallset(mz,'walls'),label:'Before'});MB.drawMaze($('dl-bMz2'),mz,{walls:MB.wallset(mz,'walls2'),label:'After'});
    $('dl-bC1').textContent='Before the change (steps 1 to '+(maze==='block'?'1,000':'3,000')+')';$('dl-bC2').textContent='After the change';
    if(!B||B.maze!==maze)return;
    const xs=[];for(let t=0;t<B.steps;t+=20)xs.push(t+1);const pick=a=>xs.map(x=>a[x-1]);const top=Math.max(50,Math.ceil(Math.max(B.q[B.steps-1],B.qp[B.steps-1])/50)*50);
    RD.chart($('dl-bP'),[{xs,ys:pick(B.q),col:'var(--c2)',w:1.8},{xs,ys:pick(B.qp),col:'var(--c1)',w:1.8}],{x0:0,x1:B.steps,y0:0,y1:top,H:240,xt:[[0,'0'],[B.sw,B.sw.toLocaleString('en-US')],[B.steps,B.steps.toLocaleString('en-US')+' steps']],yt:[[0,'0'],[top/2,String(top/2)],[top,String(top)]],ylab:'cumulative reward (mean of '+B.runs+' runs)',
      extra:(X,Y)=>'<line x1="'+X(B.sw)+'" x2="'+X(B.sw)+'" y1="'+Y(top)+'" y2="'+Y(0)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>',label:'Cumulative reward'});
    const sl=a=>(a[B.steps-1]-a[B.steps-1001])/1000,per=v=>v>0?(1/v).toFixed(1)+' steps per goal':'no goals';
    $('dl-bO').innerHTML=RD.stat('Dyna-Q at the end',B.q[B.steps-1].toFixed(1),'goals; last 1,000 steps: '+per(sl(B.q)))+RD.stat('Dyna-Q+ at the end',B.qp[B.steps-1].toFixed(1),'goals; last 1,000 steps: '+per(sl(B.qp)))+RD.stat('At the change',B.q[B.sw-1].toFixed(1)+' / '+B.qp[B.sw-1].toFixed(1),'Dyna-Q / Dyna-Q+');
    const def=B.n===50&&B.a===1&&Math.abs(B.k-1e-3)<1e-12&&B.runs===20;
    $('dl-bRep').innerHTML=(def?'<b>Page defaults</b> (n = 50, α = 1, ε = 0.1, γ = 0.95, κ = 10<sup>−3</sup>, 20 runs): the same curves as Reading section 3, checked against Python. ':'Settings: n = '+B.n+', α = '+B.a.toFixed(2)+', κ = '+(B.k?B.k.toExponential(1):'0')+', '+B.runs+' runs. ')+'Too large a κ makes Dyna-Q+ wander testing old transitions instead of collecting reward; κ = 0 removes the incentive to re-test, and in the shortcut maze Dyna-Q+ then keeps the long path too. Computed in '+(B.ms/1000).toFixed(2)+' s.'}
  $('dl-bM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('#dl-bM button').forEach(x=>x.classList.toggle('on',x===b));maze=b.dataset.m;runB()});
  $('dl-bN').addEventListener('input',e=>{$('dl-bNv').textContent=e.target.value});
  $('dl-bK').addEventListener('input',()=>{const k=kappa();$('dl-bKv').textContent=k?k.toExponential(1):'0'});
  $('dl-bA').addEventListener('input',e=>{$('dl-bAv').textContent=(e.target.value/100).toFixed(2)});
  $('dl-bGo').addEventListener('click',runB);
  $('dl-bDef').addEventListener('click',()=>{$('dl-bN').value=50;$('dl-bK').value=20;$('dl-bA').value=100;$('dl-bR').value=20;$('dl-bNv').textContent='50';$('dl-bKv').textContent='1.0e-3';$('dl-bAv').textContent='1.00';runB()});
  let started=false;
  reg(()=>{if(!started){started=true;runA();runB()}else{drawA();drawB()}});
  addEventListener('resize',()=>{if(visible()){drawA();drawB()}});
})();
