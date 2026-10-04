// ---- Tab: Rainbow ablation, game by game (decoded Figure 4) ----
(function(){
  const E=window.VBE,F=window.VB_F4,A=window.VB_ABL;const ks=Object.keys(F.rows);
  const pretty=g=>g.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).replace('N Down','n Down').replace('Of Wor','of Wor').replace('Ms Pacman','Ms. Pac-Man').replace('Montezuma Revenge','Montezuma\'s Revenge').replace('Yars Revenge','Yars\' Revenge');
  // summary table
  const stats=ks.map(k=>{const s=E.fig4Stats(F.rows[k],F.hi[k]);s.k=k;s.clip=F.rows[k].filter(v=>Math.abs(v)>=0.995).length;return s});
  let sk='median',sd=-1;const COLS=[['k','Removed component'],['median','Median drop'],['mean','Mean drop'],['hurt','Games hurt'],['helped','Games helped'],['strongest','Strongest drop in'],['clip','Bars at the clip']];
  function drawSum(){const t=document.getElementById('ab-sum');const rows=stats.slice().sort((a,b)=>sk==='k'?sd*(A.NAMES[a.k]<A.NAMES[b.k]?1:-1):sd*(a[sk]-b[sk]));
    t.innerHTML='<thead><tr>'+COLS.map(([c,l])=>'<th class="'+(c==='k'?'':'num')+'" data-c="'+c+'" style="cursor:pointer">'+l+(sk===c?(sd<0?' ▾':' ▴'):'')+'</th>').join('')+'</tr></thead><tbody>'+
      rows.map(s=>'<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+A.COLS[s.k]+';margin-right:6px"></span>'+A.NAMES[s.k]+'</td><td class="num">'+RD.n(s.median,3)+'</td><td class="num">'+RD.n(s.mean,3)+'</td><td class="num">'+s.hurt+'</td><td class="num">'+s.helped+'</td><td class="num">'+s.strongest+'</td><td class="num">'+s.clip+'</td></tr>').join('')+'</tbody>'}
  document.getElementById('ab-sum').addEventListener('click',e=>{const th=e.target.closest('th');if(!th)return;const c=th.dataset.c;if(sk===c)sd=-sd;else{sk=c;sd=c==='k'?1:-1}drawSum()});
  // per-component list
  let cur='no multi-step',sort='v';
  const seg=document.getElementById('ab-k');seg.innerHTML=ks.map(k=>'<button data-k="'+k+'"'+(k===cur?' class="on"':'')+'>'+A.NAMES[k]+'</button>').join('');
  function drawList(){const v=F.rows[cur],hi=F.hi[cur];let idx=F.games.map((g,i)=>i);if(sort==='v')idx.sort((a,b)=>v[b]-v[a]);
    RD.bars(document.getElementById('ab-b'),idx.map(i=>({nm:pretty(F.games[i]),v:v[i],lab:(Math.abs(v[i])>=0.995?(v[i]>0?'≥ ':'≤ '):'')+RD.n(v[i],2),col:A.COLS[cur],hl:!!hi[i]})),{lo:-1,hi:1})}
  seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.k;[...seg.children].forEach(x=>x.classList.toggle('on',x===b));drawList()});
  document.getElementById('ab-s').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sort=b.dataset.s;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));drawList()});
  // one game
  const gs=document.getElementById('ab-g');gs.innerHTML=F.games.map((g,i)=>'<option value="'+i+'"'+(g==='seaquest'?' selected':'')+'>'+pretty(g)+'</option>').join('');
  function drawGame(){const i=+gs.value;RD.bars(document.getElementById('ab-gb'),ks.map(k=>({nm:A.NAMES[k],v:F.rows[k][i],lab:RD.n(F.rows[k][i],2),col:A.COLS[k],hl:!!F.hi[k][i]})),{lo:-1,hi:1})}
  gs.addEventListener('change',drawGame);
  // predict
  const dbl=stats.find(s=>s.k==='no double');
  document.getElementById('ab-q').addEventListener('click',e=>{const b=e.target.closest('button[data-g]');if(!b)return;const a=document.getElementById('ab-qA');a.hidden=false;
    a.innerHTML='<b>'+dbl.hurt+' games</b> got worse without double Q-learning, and '+dbl.helped+' got better: a near coin flip, which is what "no significant aggregate difference" means here. It was never the strongest drop. Multi-step\'s removal hurt '+stats.find(s=>s.k==='no multi-step').hurt+' games.'+(+b.dataset.g===30?' Your guess was right.':'')});
  const all=()=>{drawSum();drawList();drawGame()};
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-abl']=window.TAB_RENDER['t-abl']||[]).push(all);all();
})();
