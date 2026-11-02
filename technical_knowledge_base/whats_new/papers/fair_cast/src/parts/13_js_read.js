// ---- The paper tab: hero diagram, predict 1, the 25 pairs, Table 3 ----
(function(){
const T=PAPER.tables;
// ---------- hero: the training loop and its two ratios ----------
const HERO={
 rtn:{exp:['export: round to nearest','drops updates under u/2'],tr:['trainer forward','bf16 of θ, the same as q'],
  red:'hidden ratio, master against served policy: never computed; |log ρ| grows to 0.10 to 0.45',green:'visible ratio, trainer against sampler ≈ 1 (|log ρ| ≈ 0.01): what PPO clip, TIS and IcePop check',
  cap:'<span class="fch">Red</span>: the master and the served copy drift apart for 50 to 150 steps, and nothing measures it. <span class="fcv">Green</span>: the trainer and the sampler both read the same rounded weights, so the ratio every framework checks stays at one.'},
 fc:{exp:['export: stochastic rounding','E[q] = θ, nothing withheld'],tr:['trainer forward on q','gradient to θ straight through'],
  red:'master against served: |log ρ| stays ≈ 0.01, the noise floor',green:'visible ratio still ≈ 1, and now the sampled policy is the trained one',
  cap:'Fair Cast changes the two shaded boxes. The export is unbiased, so updates reach the sampler on average at once; the loss is computed on the exact copy that generated the rollouts, so the policy being differentiated is the policy that sampled.'}};
let heroM='rtn';
function heroDraw(w){const M=HERO[heroM],host=$('fcHeroSvg');const shade=heroM==='fc'?'var(--acc2)':'var(--soft)',sc=heroM==='fc'?'var(--acc)':'var(--c2)';
  const lab=[['fp32 master θ','optimizer state'],M.exp,['served copy q (bf16)','vLLM samples here'],['rollouts sampled from q','rewards, advantages'],M.tr,['policy-gradient update','lands on θ']];
  const box=(x,y,bw,bh,i)=>{const sh=i===1||i===4;return rc(x,y,bw,bh,sh?shade:'var(--bg)',{s:sh?sc:'var(--mute)',sw:sh?1.6:1,r:8})+tx(x+bw/2,y+bh/2-3,lab[i][0],{fs:12.5,a:'middle',w:'600'})+tx(x+bw/2,y+bh/2+13,lab[i][1],{fs:11.5,a:'middle',c:'var(--mute)'})};
  const arr=(x1,y1,x2,y2,c,da)=>{const a=Math.atan2(y2-y1,x2-x1),h=7;return ln2(x1,y1,x2,y2,c||'var(--mute)',{sw:1.5,da})+'<path d="M'+x2.toFixed(1)+' '+y2.toFixed(1)+'L'+(x2-h*Math.cos(a-0.45)).toFixed(1)+' '+(y2-h*Math.sin(a-0.45)).toFixed(1)+'L'+(x2-h*Math.cos(a+0.45)).toFixed(1)+' '+(y2-h*Math.sin(a+0.45)).toFixed(1)+'z" fill="'+(c||'var(--mute)')+'"/>'};
  let s='',H;
  if(w>=640){const gx=46,bw=(w-2*gx-8)/3,bh=50,y1=40,y2=y1+bh+64;H=y2+bh+34;const X=i=>4+i*(bw+gx);
    s+=box(X(0),y1,bw,bh,0)+box(X(1),y1,bw,bh,1)+box(X(2),y1,bw,bh,2)+box(X(2),y2,bw,bh,3)+box(X(1),y2,bw,bh,4)+box(X(0),y2,bw,bh,5);
    s+=arr(X(0)+bw,y1+bh/2,X(1)-2,y1+bh/2)+arr(X(1)+bw,y1+bh/2,X(2)-2,y1+bh/2)+arr(X(2)+bw/2,y1+bh,X(2)+bw/2,y2-2)+arr(X(2),y2+bh/2,X(1)+bw+2,y2+bh/2)+arr(X(1),y2+bh/2,X(0)+bw+2,y2+bh/2)+arr(X(0)+bw/2,y2,X(0)+bw/2,y1+bh+2);
    const red=heroM==='fc'?'var(--good)':'var(--bad)';
    s+='<path d="M'+(X(0)+bw/2)+' '+(y1-2)+'C'+(X(0)+bw/2)+' '+(y1-22)+' '+(X(2)+bw/2)+' '+(y1-22)+' '+(X(2)+bw/2)+' '+(y1-2)+'" fill="none" stroke="'+red+'" stroke-width="1.8" stroke-dasharray="6 4"/>'+tx(w/2,14,M.red,{fs:12,a:'middle',c:red,w:'600'});
    s+=ln2(X(1)+bw*0.75,y2,X(2)+bw*0.25,y1+bh,'var(--good)',{sw:1.8,da:'6 4'})+tx(w/2,H-8,M.green,{fs:12,a:'middle',c:'var(--good)',w:'600'});
  }else{const bw=w-58,bh=44,g=20,x=30;H=6*bh+5*g+10;const Y=i=>4+i*(bh+g);
    for(let i=0;i<6;i++){s+=box(x,Y(i),bw,bh,i);if(i<5)s+=arr(x+bw/2,Y(i)+bh,x+bw/2,Y(i+1)-2)}
    s+='<path d="M'+(x+bw)+' '+(Y(5)+bh/2)+'H'+(w-8)+'V'+(Y(0)+bh/2)+'H'+(x+bw+9)+'" fill="none" stroke="var(--mute)" stroke-width="1.5"/>'+arr(x+bw+12,Y(0)+bh/2,x+bw+2,Y(0)+bh/2);
    const red=heroM==='fc'?'var(--good)':'var(--bad)';
    s+='<path d="M'+(x-2)+' '+(Y(0)+bh/2)+'H8V'+(Y(2)+bh/2)+'H'+(x-2)+'" fill="none" stroke="'+red+'" stroke-width="1.8" stroke-dasharray="5 3"/>';
    s+='<path d="M'+(x-2)+' '+(Y(2)+bh*0.75)+'H19V'+(Y(4)+bh/2)+'H'+(x-2)+'" fill="none" stroke="var(--good)" stroke-width="1.8" stroke-dasharray="5 3"/>';
  }
  host.innerHTML=svgW(w,H,s,'The RL loop: fp32 master, export, served copy, rollouts, trainer, update; and the hidden and visible ratios');
  $('fcHeroCap').innerHTML=(w<640?'<span style="color:'+(heroM==='fc'?'var(--good)':'var(--bad)')+';font-weight:600">Outer bracket: '+M.red+'.</span> <span class="fcv">Inner bracket: '+M.green+'.</span> ':'')+M.cap}
const hm=$('fcHeroM');hm.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{hm.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});heroM=b.dataset.m;refit($('fcHeroSvg'))}));
fit($('fcHeroSvg'),heroDraw);onTab('t-read',()=>refit($('fcHeroSvg')));

// ---------- predict 1: when does the copy first move ----------
PRED_REVEAL.fcPr1=function(){const r=FCSIM.run({w0:0.02,eta:1e-6,drift:0.5,noise:0,T:400,seed:1,reps:8});
  const nxt=[];for(let t=1;t<=r.T;t++)if(r.qn[t]!==r.qn[t-1])nxt.push(t);
  $('fcPr1Out').innerHTML='the copy first changes after step <b>'+r.first.n+'</b>. Near 0.02 the bf16 gap is <i>u</i> = '+sci(r.u)+', so the master must move <i>u</i>/2 = '+sci(r.u/2)+' from its starting grid point, '+(r.u/2/5e-7).toFixed(0)+' steps of 5 × 10⁻⁷; the next change needs a whole gap, at step '+(nxt[1]||'beyond 400')+'. Until then the sampler serves the starting weight while the optimizer has moved on.'};

// ---------- the 25 pairs ----------
const FAM={'rg:zebra_puzzles':['zebra','var(--c1)'],'rg:knights_knaves':['knights','var(--c1)'],'rg:list_functions':['list functions','var(--c1)'],'rg:string_manipulation':['strings','var(--c1)'],
  'games:nim':['Nim','var(--c5)'],'math':['MATH 3-5','var(--c3)'],'math_l5':['MATH L5','var(--c3)'],'gsm8k':['GSM8K','var(--c3)'],'mbppplus':['MBPP+','var(--c4)'],'humanevalplus':['HumanEval+','var(--c4)']};
const ORDER=Object.keys(FAM);
const scored=p=>p.task==='mbppplus'?(p.seed===0?121:224):p.n_eval;
const seOf=p=>100*Math.sqrt(0.5/scored(p));
let pairM='gain';
function pairRows(){const alt=$('fcPairsAlt').checked;return T.pairs.map(p=>{const q=Object.assign({},p);if(alt&&p.task==='rg:zebra_puzzles'&&p.seed===0){q.faircast=0.34;q.delta=Math.round(1000*(0.34-p.nearest))/10;q.alt=1}return q})}
function pairsDraw(w){const rows=pairRows();
  if(pairM==='gain')rows.sort((a,b)=>b.delta-a.delta);else rows.sort((a,b)=>ORDER.indexOf(a.task)-ORDER.indexOf(b.task)||a.model.localeCompare(b.model)||a.opt.localeCompare(b.opt)||a.seed-b.seed);
  const lbl=p=>FAM[p.task][0]+' '+p.model+(p.opt==='muon'?' Muon':'')+' s'+p.seed,lw=Math.min(w*0.42,10+6.6*Math.max(...rows.map(p=>lbl(p).length))),rw=44,rh=17,top=34,H=top+rows.length*rh+38,x0=-20,x1=48,X=v=>lw+(w-lw-rw)*(v-x0)/(x1-x0);
  let s='';const lg=legendW([['logic','var(--c1)','d'],['games','var(--c5)','d'],['maths','var(--c3)','d'],['code','var(--c4)','d'],['±1 SE','var(--dim)']],lw,12,w-lw);s+=lg.s;
  (w-lw<380?[-20,0,20,40]:[-20,-10,0,10,20,30,40]).forEach(v=>{s+=ln2(X(v),top-4,X(v),H-34,v===0?'var(--mute)':'var(--line)',{sw:v===0?1.2:1})+tx(X(v),H-20,(v>0?'+':'')+v,{fs:11,a:'middle',c:'var(--mute)'})});
  rows.forEach((p,i)=>{const y=top+i*rh+rh/2,se=seOf(p),f=FAM[p.task];
    s+=rc(X(-se),y-5,X(se)-X(-se),10,'var(--dim)',{r:2,op:0.55});
    s+=tx(lw-6,y+4,lbl(p),{fs:11,a:'end',c:'var(--ink)'});
    s+=dotS(X(p.delta),y,4.2,f[1],{t:f[0]+' '+p.model+' seed '+p.seed+': '+p.nearest.toFixed(3)+' to '+p.faircast.toFixed(3)+(p.alt?' (repeat run)':'')});
    s+=tx(w-2,y+4,(p.delta>0?'+':'')+p.delta.toFixed(1),{fs:11,a:'end',c:Math.abs(p.delta)<se?'var(--mute)':'var(--ink)',w:Math.abs(p.delta)<se?null:'600'})});
  s+=tx(lw+(w-lw-rw)/2,H,'Fair Cast minus round-to-nearest (points)',{fs:11,a:'middle',c:'var(--mute)'});
  $('fcPairsSvg').innerHTML=svgW(w,H+4,s,'Dot plot of the 25 matched seed-pairs');
  const D=rows.map(p=>p.delta),n=D.length,mean=D.reduce((a,b)=>a+b,0)/n,sd=[...D].sort((a,b)=>a-b),med=sd[12];
  const nz=rows.filter(p=>p.task!=='rg:zebra_puzzles').map(p=>p.delta),mnz=nz.reduce((a,b)=>a+b,0)/nz.length;
  const inside=rows.filter(p=>Math.abs(p.delta)<seOf(p)).length;
  $('fcPairsSum').innerHTML='Ahead by more than one point <b>'+D.filter(d=>d>1).length+'</b>, within one point <b>'+D.filter(d=>Math.abs(d)<=1).length+'</b>, behind <b>'+D.filter(d=>d<-1).length+'</b>; mean <b>'+(mean>0?'+':'')+mean.toFixed(1)+'</b>, median <b>+'+med.toFixed(1)+'</b>, mean without zebra <b>+'+mnz.toFixed(1)+'</b>; <b>'+inside+'</b> of 25 inside one standard error (grey values).'}
const pm=$('fcPairsM');pm.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{pm.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});pairM=b.dataset.m;refit($('fcPairsSvg'))}));
$('fcPairsAlt').addEventListener('change',()=>refit($('fcPairsSvg')));
fit($('fcPairsSvg'),pairsDraw);onTab('t-read',()=>refit($('fcPairsSvg')));

// ---------- Table 3 in the reading ----------
$('fcT3b').innerHTML=T.table3.rows.map(r=>'<tr><td>'+r.arm+'</td>'+r.vals.map((v,i)=>'<td class="num"'+(i===1||i===3?(r.arm.indexOf('Fair')<0?' style="color:var(--bad);font-weight:600"':''):'')+'>'+v.toFixed(1)+'</td>').join('')+'</tr>').join('');
})();
// ---------- one weight between two neighbours: round-to-nearest against stochastic rounding ----------
(function(){const sl=$('fcSRx');if(!sl)return;
function draw(w){const p=+sl.value/100,H=150,x0=40,x1=w-40,X=v=>x0+(x1-x0)*v,y=58;let s='';
  s+=ln2(x0,y,x1,y,'var(--mute)',{sw:1.5});
  [[0,'lower bf16 value'],[1,'upper bf16 value (+u)']].forEach(([v,l])=>{s+=ln2(X(v),y-8,X(v),y+8,'var(--ink)',{sw:2})+tx(X(v),y+24,l,{fs:11.5,a:v?'end':'start',c:'var(--mute)'})});
  s+=rc(X(0.5)-1,y-14,2,28,'var(--c2)',{r:0,op:0.6})+tx(X(0.5),y-18,'midpoint',{fs:11,a:'middle',c:'var(--c2)'});
  s+=dotS(X(p),y,6,'var(--ink)')+tx(X(p),y-36,'master θ',{fs:12,a:'middle',w:'600'});
  const near=p<0.5?0:p>0.5?1:0;
  s+=tx(x0,y+50,'round-to-nearest:',{fs:12,c:'var(--c2)',w:'600'})+tx(x0+122,y+50,'always the '+(near?'upper':'lower')+' value',{fs:12});
  const bw=x1-x0-122;s+=tx(x0,y+76,'stochastic:',{fs:12,c:'var(--c1)',w:'600'})+rc(x0+122,y+66,bw*(1-p),13,'var(--dim)',{r:2})+rc(x0+122+bw*(1-p),y+66,bw*p,13,'var(--c1)',{r:2});
  if(bw*(1-p)>70)s+=tx(x0+126,y+76,'lower '+Math.round(100*(1-p))+'%',{fs:11});
  if(bw*p>70)s+=tx(x1-4,y+76,'upper '+Math.round(100*p)+'%',{fs:11,a:'end',c:'#fff'});
  $('fcSRSvg').innerHTML=svgW(w,H,s,'A master weight between two bf16 values');
  $('fcSRv').textContent=(100*p).toFixed(0)+'% of a gap';
  $('fcSRCap').innerHTML='Round-to-nearest puts the copy '+Math.abs(near-p).toFixed(2)+' u '+(near>p?'above':'below')+' the master, the same error every step until θ passes the midpoint. Stochastic rounding gives E[<i>q</i>] = '+(1-p).toFixed(2)+' × lower + '+p.toFixed(2)+' × upper = lower + '+p.toFixed(2)+' u = θ exactly; moving θ by Δ moves the chance of "upper" by Δ/<i>u</i>.'}
sl.addEventListener('input',()=>refit($('fcSRSvg')));fit($('fcSRSvg'),draw);onTab('t-read',()=>refit($('fcSRSvg')))})();
