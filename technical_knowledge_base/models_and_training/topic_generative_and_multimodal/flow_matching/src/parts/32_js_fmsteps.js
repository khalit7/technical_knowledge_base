// ---- Reading section 10 (was the Steps ladder tab until 2026-10-24): every tiny model and sampler at equal NFE; same-noise grid; before/after by NFE ----
(function(){
  const X=window.FMX,$=X.$,D=X.D;if(!$('fms-chart'))return;const I=D.img;
  const C=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','#c2508a','#7a8a3a','var(--mute)'];
  // series: [name, color, rows [[nfe, fd, acc, div]], tile prefix and steps-per-nfe]
  const fromRows=(rows,key,mult)=>rows.filter(r=>r[0]===key).map(r=>[r[1]*(mult||1),r[3],r[4],r[5],r[1]]);
  const S=[];
  S.push({nm:'DDPM (diffusion, stochastic)',col:C[8],pts:fromRows(I.diff,'ddpm'),tile:n=>'ddpm_'+n});
  S.push({nm:'DDIM (diffusion)',col:C[5],pts:fromRows(I.diff,'ddim'),tile:n=>n===2?'ddim_2':'ddim_'+n});
  S.push({nm:'DPM-Solver++ (diffusion)',col:C[4],pts:fromRows(I.diff,'dpm'),tile:n=>'dpm_'+n});
  S.push({nm:'1-RF, Euler (flow)',col:C[0],pts:fromRows(I.fm,'euler'),tile:n=>'fm_e'+n});
  S.push({nm:'1-RF, midpoint (flow)',col:C[6],pts:fromRows(I.fm,'midpoint',2),tile:n=>n%2===0?'fm_m'+(n/2):null});
  S.push({nm:'2-RF, Euler (one reflow)',col:C[2],pts:fromRows(I.rf2,'euler'),tile:n=>'rf2_e'+n});
  const N=I.new||{};
  if(N.rf3_2000)S.push({nm:'3-RF, Euler (two reflows)',col:C[3],pts:N.rf3_2000.euler.map(r=>[r.steps,r.fd,r.acc,r.div,r.steps]),tile:n=>'rf3_e'+n});
  if(N.rf1d_1500)S.push({nm:'student of 1-RF',col:C[1],pts:N.rf1d_1500.euler.map(r=>[1,r.fd,r.acc,r.div,1]),tile:n=>n===1?'rf1d_e1':null,dot:true});
  if(N.rf2d_1500)S.push({nm:'student of 2-RF',col:C[7],pts:N.rf2d_1500.euler.map(r=>[1,r.fd,r.acc,r.div,1]),tile:n=>n===1?'rf2d_e1':null,dot:true});
  if((I.sde_decay||[]).length)S.push({nm:'1-RF, SDE, noise 2(1 - t)',col:'#9a6b3a',pts:I.sde_decay.filter(r=>r.eps===2).map(r=>[r.steps,r.fd,r.acc,r.div,r.steps]),tile:n=>null,notile:true});
  const NFES=[1,2,4,10,20,50];
  let met='fd';
  function chart(){const k={fd:1,acc:2,div:3}[met];const ser=S.map(s=>({name:s.nm,color:s.col,pts:s.pts.filter(p=>p[0]<=260).map(p=>[p[0],met==='acc'?100*p[k]:p[k]]).sort((a,b)=>a[0]-b[0])}));
    X.chart($('fms-chart'),ser,{logx:true,logy:met==='fd',xticks:[1,2,4,10,20,50,250],xlab:'network evaluations (log)',ylab:met==='fd'?'FD (log)':met==='acc'?'class accuracy %':'diversity',h:280,
      hline:met==='fd'?{y:I.floor_fd,label:'real images '+I.floor_fd}:met==='div'?{y:I.real_div,label:'real '+I.real_div}:null,label:'Steps ladder'});
    X.leg($('fms-leg'),S.map(s=>[s.nm,s.col]));
    $('fms-note').textContent=met==='fd'?'Hover a point for its value. The one-step students are single points at NFE 1.':met==='acc'?'How often the classifier recognises the requested class.':'Mean distance between same-class samples in the classifier space; real images '+I.real_div+'.'}
  X.seg($('fms-met'),m=>{met=m;chart()});
  // class chips
  let cls=9;$('fms-cls').innerHTML=X.CLS.map((c,i)=>'<button data-c="'+i+'"'+(i===cls?' class="on"':'')+'>'+c+'</button>').join('');
  $('fms-cls').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cls=+b.dataset.c;$('fms-cls').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));grid();bc.redraw()});
  // tile of one class from a run of 10
  function one(cv,key){const t0=(D.tiles||{})[key];const ctx=cv.getContext('2d');ctx.clearRect(0,0,28,28);if(t0==null||key==null){cv.style.opacity=.08;return}cv.style.opacity=1;
    const im=new Image();im.src=D.sheet;const j=t0+cls,go=()=>ctx.drawImage(im,(j%D.cols)*28,Math.floor(j/D.cols)*28,28,28,0,0,28,28);if(im.complete&&im.naturalWidth)go();else im.onload=go}
  function grid(){const g=$('fms-grid');g.style.gridTemplateColumns='minmax(0,8.5em) repeat('+NFES.length+',minmax(0,46px))';
    let h='<div></div>'+NFES.map(n=>'<div class="h">'+n+'</div>').join('');g.innerHTML=h;
    S.forEach(s=>{const l=document.createElement('div');l.className='l';l.textContent=s.nm;g.appendChild(l);
      NFES.forEach(n=>{const has=!s.notile&&s.pts.some(p=>p[0]===n);const c=X.canv(s.nm+', '+n+' evaluations');g.appendChild(c);one(c,has?s.tile(n):null)})})}
  // before / after by NFE
  const opts=S.map((s,i)=>'<option value="'+i+'">'+s.nm+'</option>').join('');$('fms-l').innerHTML=opts;$('fms-r').innerHTML=opts;
  $('fms-l').value=String(S.findIndex(s=>s.nm.startsWith('DDIM')));$('fms-r').value='3';
  const BN=[1,2,4,10,20,50];
  function side(sel,stripId,titleId,n){const s=S[+$(sel).value];const has=s.pts.find(p=>p[0]===n);const key=has?s.tile(n):null;
    $(titleId).textContent=s.nm+(has?', NFE '+n+': FD '+has[1].toFixed(1):', NFE '+n+': not run');
    if(key)X.tiles($(stripId),key,10,X.CLS);else $(stripId).innerHTML='<span class="small mute">'+(has?'scored, images not recorded':'not run at this budget')+'</span>'}
  const bc=X.anim({card:'fms-bc',ctl:'fms-ctl',n:BN.length,ms:1100,hold:2000,label:'Evaluations',draw:i=>{side('fms-l','fms-ls','fms-lt',BN[i]);side('fms-r','fms-rs','fms-rt',BN[i]);$('fms-cap').textContent='Network evaluations: '+BN[i]+'. Same ten starting noises on both sides.'}});
  ['fms-l','fms-r'].forEach(id=>$(id).addEventListener('change',()=>bc.redraw()));
  X.onRender('t-read',()=>{chart();grid()});
})();
