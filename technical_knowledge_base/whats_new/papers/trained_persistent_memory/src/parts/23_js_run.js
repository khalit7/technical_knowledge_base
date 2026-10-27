// ---- Simulate the memory bank tab: the three write rules under any gamma, scale and start; the row-collapse animation ----
(function(){
const TB=window.PAPER.tables,cache={};
const on=id=>$(id).querySelector('.on').dataset.m;
function run(){const rule=on('smR'),scale=+on('smS'),init=on('smI'),g=+$('smG').value,key=[rule,scale,init,g].join('|');
  $('smGv').textContent=g.toFixed(3);
  const r=cache[key]||(cache[key]=SIM.simulate({rule,scale,init,gamma:g,T:600}));
  decayChart($('smSvg'),r,'Share of the bank held by a turn, by lag');
  const lb=lagBelow(r.share),n=TB.t3.n,N=n.reduce((a,b)=>a+b,0);let past=0;
  if(lb!=null)SIM.BUCKETS.forEach(([a,b],i)=>{if(a>=lb)past+=n[i];else if(b>=lb)past+=n[i]*(b-lb+1)/(b-a+1)});
  const unit=rule==='hebb'?'rows of the '+r.rows+' × '+r.rows+' matrix':rule==='slot'?'slots':'rows';
  $('smO').innerHTML=stat('Turn written 256 turns ago','≈ '+sci(r.share[256],1),'its share of the bank; newest turn '+(r.share[1]*100).toFixed(1)+'%')
   +stat('Below newest × 2⁻⁸ after',lb==null?'> 600 turns':lb+' turns',lb==null?'':'≈ '+(past/N*100).toFixed(0)+'% of test questions are older')
   +stat('Distinct '+unit,fmt(r.distinct)+' of '+fmt(r.rows),'spread '+pctS(r.spread)+' of the bank\'s norm')
   +(rule==='slot'?stat('Slots ever written',fmt(r.used)+' of '+fmt(r.rows),'top 8 per turn'):rule==='hebb'?stat('Turns rescaled to norm 1',r.clipped+' of 600','Eq. 16\'s normalisation'):stat('Effective window',(1/(1-g)).toFixed(0)+' turns','1/(1 − γ)'));
  $('smN').innerHTML=(rule==='ac'?'Every row of the attention-coupled bank gets an update weighted by softmax attention from this turn\'s tokens; a zero bank gives every row the same key, so the rows never separate.':rule==='hebb'?'M.4 stores one '+r.rows+' × '+r.rows+' matrix (the paper\'s d<sub>h</sub> scaled to d = 32). When a turn\'s update pushes its norm past 1, the whole matrix is divided by its norm, so old content shrinks faster than γ alone.':'M.6 moves only the 8 best-scoring slots towards the new vector; the other slots keep their content untouched, which is why old turns survive longer here.')
   +' Lags are measured at the end of a 600-turn run (LoCoMo conversations have 369 to 689 turns).'}
['smR','smS','smI'].forEach(id=>segBind(id,run));$('smG').addEventListener('input',run);
onTab('t-run',run);

// ---- the row-collapse animation: snapshots of a 1x attention-coupled bank ----
const TURNS=[1,2,5,20,100,600],SN={};
const snaps=m=>SN[m]||(SN[m]=SIM.simulate({rule:'ac',scale:1,init:m,T:600,snap:TURNS}).snaps);
const CAPT={zero:[
 ['After turn 1','The bank starts at zero, so every row\'s key is zero and every row gets the same attention weight, 1/64: all 64 columns receive the same update.'],
 ['After turn 2','Equal rows give equal keys, so the next update is again identical for every row. One distinct row out of 64.'],
 ['After turn 5','Same again: the bank is one vector copied 64 times.'],
 ['After turn 20','The shared vector now mostly reflects the last 20 turns (γ = 0.95), but it is still one vector.'],
 ['After turn 100','Nothing can separate the rows: the write rule has no term that differs between equal rows.'],
 ['After turn 600','Still one distinct row. A 640-row bank behaves the same way, so 10x the rows store nothing more.']],
rand:[
 ['After turn 1','A small random start (σ = 0.01) makes the rows differ, and the first update adds a different amount to each.'],
 ['After turn 2','The rows still differ, but each update pulls them towards the same vector, because their keys are close.'],
 ['After turn 5','The differences come from the start and shrink by γ every turn.'],
 ['After turn 20','The rows are converging on one shared vector.'],
 ['After turn 100','The spread is down to a fraction of a percent.'],
 ['After turn 600','The rows now agree to about nine significant digits (the few still counted as distinct differ only there): the random start only delays the collapse.']]};
const MODES={};Object.keys(CAPT).forEach(m=>MODES[m]=CAPT[m].map(([t,c])=>({t,c})));
function drawCap(m,k,e,w){const S=snaps(m)[TURNS[k]],P=S.P,R=64,D=32,pad=2,cw=(w-2*pad)/R,ch=Math.max(4,Math.min(7,cw*1.2)),H=D*ch+28;
  let mx=0;for(let i=0;i<P.length;i++)mx=Math.max(mx,Math.abs(P[i]));let s='';
  for(let r=0;r<R;r++)for(let c=0;c<D;c++){const v=mx?P[r*D+c]/mx:0;s+='<rect x="'+(pad+r*cw).toFixed(1)+'" y="'+(c*ch).toFixed(1)+'" width="'+Math.max(0.5,cw-0.4).toFixed(1)+'" height="'+ch.toFixed(1)+'" fill="'+(v>=0?'var(--c1)':'var(--c2)')+'" opacity="'+Math.abs(v).toFixed(2)+'"/>'}
  s+=tx(pad,D*ch+16,'64 rows of the bank, one column each →',{fs:11,c:'var(--mute)'});
  return svgW(w,H,s,'The 64 rows of the bank after turn '+TURNS[k])}
makeAnim({id:'cap',mode:'zero',modes:MODES,dur:2600,draw:drawCap,counters:(m,k)=>{const S=snaps(m)[TURNS[k]];
  return stat('Turn',TURNS[k])+stat('Distinct rows',S.distinct+' of 64')+stat('Spread of the rows',pctS(S.spread))}});
})();
