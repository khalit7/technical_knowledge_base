// ---- Scene (section 6): a sparse-reward gridworld, epsilon-greedy against a count bonus against optimistic starts (seed 1, 500 episodes).
// Bars: visits per cell so far (log scale, fixed to the run's final maximum so growth shows); orange line: that episode's path.
// Driven by BX.gxRun, the page's engine (checked against src/recompute.py). Also writes the 20-seed table #gx-Y. ----
(function(){
  const B=window.BX;if(!B||!document.getElementById('stg-gx'))return;const {lerp,mix}=S3,G=B.GX,$=id=>document.getElementById(id);
  const CP=[0,1,10,50,200,500],EP=500,cs=.5,X=c=>(c%G.W-(G.W-1)/2)*cs,Z=c=>(Math.floor(c/G.W)-(G.H-1)/2)*cs,id=xy=>xy[1]*G.W+xy[0];
  let mode='eps';const memo={};
  function run(){if(!memo[mode]){const h=B.gxRun(mode,1,EP,true);let mx=1;for(const v of h[EP-1].N)if(v>mx)mx=v;memo[mode]={h,lmx:Math.log(1+mx)}}return memo[mode]}
  function draw(R,k,e){const P=R.P,M=run(),t=k===0?0:Math.round(lerp(CP[k-1],CP[k],e)),x=t>0?M.h[t-1]:null,N=x?x.N:null;
    const hgt=c=>N&&N[c]?.06+1.5*Math.log(1+N[c])/M.lmx:0;
    for(let c=0;c<G.W*G.H;c++){const hh=hgt(c);
      if(hh>0)R.box([X(c),0,Z(c)],[cs*.84,hh,cs*.84],{fill:mix(P.paper,P.c1,.2+.65*hh/1.56),a:1,lw:.7});
      else R.quad([[X(c)-cs*.42,0,Z(c)-cs*.42],[X(c)+cs*.42,0,Z(c)-cs*.42],[X(c)+cs*.42,0,Z(c)+cs*.42],[X(c)-cs*.42,0,Z(c)+cs*.42]],{fill:P.soft,a:1,ea:.35})}
    const mk=(xy,lab,c,glow)=>{const q=id(xy),y=hgt(q)+.2;if(glow)R.glow([X(q),y,Z(q)],.55,{c,a:.9,top:1});R.ball([X(q),y,Z(q)],.13,{c,top:1});R.label([X(q),y,Z(q)],lab,{fs:13,b:1,dy:-17,c})};
    if(x){const pts=x.path.map(q=>[X(q),hgt(q)+.05,Z(q)]);R.line(pts,{c:P.c2,w:2.2,a:.95,top:1})}
    mk(G.start,'S',P.ink,false);mk(G.small,'0.1',P.c5,true);mk(G.big,'+1',P.c3,true);
    let seen=0;if(N)for(const v of N)if(v)seen++;
    R.label([0,0,(G.H/2)*cs+.55],!t?'before the first episode':R.W<520?'ep. '+t+' · '+seen+'/98 cells · +1 ×'+x.nBig:'episode '+t+' of '+EP+' · '+seen+' of 98 cells · +1 reached '+x.nBig+'×',{mono:true,fs:12.5,b:1,dy:16})}
  const stg=S3.stage({id:'stg-gx',list:'sx-gx-eps',fig:'Fig. 6 · visits per cell (log scale) and the latest path',cam:[-.3,.78],bounds:[[-3.6,0,-1.9],[3.6,1.7,2.4]],aspect:.5,draw,dur:2600,hold:4800});
  $('gx-M').addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b||!stg)return;mode=b.dataset.m;
    $('gx-M').querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});
    ['eps','cnt','opt'].forEach(m=>{$('sx-gx-'+m).hidden=m!==mode});stg.list('sx-gx-'+mode)});
  // twenty seeds of each mode, computed once when the Reading tab first renders
  let done=false;function summary(){if(done||!$('gx-Y'))return;done=true;const rows=['eps','cnt','opt'].map(m=>{const s=B.gxSummary(m,20,EP),f=s.firsts.filter(v=>v>=0).sort((a,b)=>a-b);
      return '<tr><td>'+{eps:'ε-greedy',cnt:'+ count bonus',opt:'Optimistic starts'}[m]+'</td><td class="num">'+s.found+' of 20</td><td class="num">'+(f.length?f[Math.floor(f.length/2)]+1:'none')+'</td></tr>'}).join('');
    $('gx-Y').innerHTML='<table class="rd-t"><thead><tr><th>Agent</th><th class="num">Seeds reaching +1 (500 episodes)</th><th class="num">Median first +1 episode</th></tr></thead><tbody>'+rows+'</tbody></table>'}
  RD.onRender(summary);setTimeout(summary,50);
})();
