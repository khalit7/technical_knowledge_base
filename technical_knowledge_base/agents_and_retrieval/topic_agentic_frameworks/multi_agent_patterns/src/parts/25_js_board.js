// Section 5: what each check kept, and the sharp brief, from the blackboard runs.
(function(){
  const U=FMU;
  const setv=(k,v)=>document.querySelectorAll('.fm-v[data-v="'+k+'"]').forEach(e=>{e.textContent=v;e.classList.remove('fm-miss')});
  const xs=r=>Object.values(r.xk||{}).reduce((a,b)=>a+b,0);
  const plain=U.runs('board');
  if(plain.length)setv('bb.board.x',plain.map(xs).join(' and '));
  const orig=['board','boardv','boardb'].flatMap(d=>U.runs(d));
  setv('bb.orig.n',orig.length);setv('bb.orig.xruns',orig.filter(r=>xs(r)>0).length);
  const cs=U.runs('checkshown')[0],cb=U.runs('checkblind')[0];
  if(cs){setv('bb.n',cs.posted);setv('bb.check.cost',(cb?U.usd(cb.tot.cost)+' (blind) and ':'')+U.usd(cs.tot.cost)+' (shown)')}
  const sh=U.runs('boardsharp');
  if(sh.length){setv('bb.sharp.tp',sh.map(r=>r.tp).join(' and '));setv('bb.sharp.x',sh.map(xs).join(' and '));setv('bb.sharp.cost',U.usd(U.mean(sh.map(r=>r.tot.cost))))}
  // bars: what each check round kept
  const rows=[];
  [['checkshown','Fixed 186 findings, checker shown the reason'],['checkblind','Fixed 186 findings, blind checker'],['boardv','Board + check, shown (runs '],['boardb','Board + check, blind (runs ']].forEach(([d,n])=>{
    U.runs(d).forEach(r=>{if(!r.vt)return;const v=r.vt;rows.push({name:n.endsWith('(runs ')?n.replace(' (runs ','')+', run '+r.rep:n,pk:v.real_kept,xk:v.false_kept,xr:v.false_dropped+v.real_dropped,tot:r.posted})})});
  sh.forEach(r=>rows.push({name:'Board, sharp brief, run '+r.rep+' (no check)',pk:r.tp,xk:xs(r),xr:0,tot:r.found}));
  const max=Math.max.apply(null,rows.map(r=>r.tot).concat([1]));
  const el=document.getElementById('fm-bbbars');
  if(el){el.innerHTML=rows.map(r=>'<div class="row"><div class="nm">'+r.name+'</div><div class="track"><span style="width:'+(100*r.pk/max)+'%;background:var(--c3)"></span><span style="width:'+(100*r.xk/max)+'%;background:var(--c2)"></span><span style="width:'+(100*r.xr/max)+'%;background:var(--dim)"></span></div><div class="val">'+(r.pk+r.xk)+' of '+r.tot+'</div></div>').join('');
    document.getElementById('fm-bbnote').textContent='Kept out of posted, per round. Each bar is one recorded run; "other report" means anything that is not one of the 16 planted violations.'}
})();
