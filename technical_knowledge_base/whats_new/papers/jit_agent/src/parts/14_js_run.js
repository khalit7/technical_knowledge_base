// ---- Score a group of harnesses: Evo-GDPO (Eq. 6, 7) against GRPO-style mixing, the bank rule, Eq. 4 pairs, released harnesses ----
const GD={pre:'t3',br:80.4,lam:.5,w:.6,wl:.5};
function t3Group(bench,bb){const rows=PT.t3.filter(r=>r.backbone===bb);const inc=rows.reduce((a,r)=>r.harness!=='JIT-Agent'&&r[bench][0]>a[bench][0]?r:a,rows[0]);
  return {c:rows.map(r=>({n:r.harness,r:r[bench][0],l:r[bench][1],k:r[bench][2]})),inc:{n:inc.harness+' (best fixed harness)',r:inc[bench][0],l:inc[bench][1],k:inc[bench][2]},lu:'K tokens',note:'Illustrative: Table 3\'s six harnesses on '+bench.replace('DSQA','DeepSearchQA').replace('xBench','xBench-DS')+' with '+bb+' treated as one group of candidates, and the best fixed harness as the incumbent. Table 3 reports no latency, so tokens per case stand in for it.'}}
const GDP={
 t3:()=>t3Group('DSQA','DeepSeek-V4-Flash'),
 t3x:()=>t3Group('xBench','Qwen3.6-Flash'),
 tie:()=>({c:[{n:'Draft A',r:80,l:120,k:.10},{n:'Draft B',r:80,l:120,k:.05},{n:'Draft C',r:70,l:120,k:.05},{n:'Draft D',r:70,l:120,k:.10}],inc:{n:'Incumbent',r:75,l:120,k:.08},lu:'s',note:'Illustrative: two drafts score 80 and two score 70; within each pair one costs half as much; all take 120 s. This is the case GDPO was built for: once the channels are added, a $0.05 saving is invisible next to a 10-point score gap.'}),
 none:()=>({c:[{n:'Draft A',r:72,l:60,k:.04},{n:'Draft B',r:68,l:45,k:.03},{n:'Draft C',r:61,l:30,k:.02},{n:'Draft D',r:75,l:90,k:.06}],inc:{n:'Incumbent',r:80,l:100,k:.08},lu:'s',note:'Illustrative: every draft is faster and cheaper than the incumbent, and none matches its score of 80.'})};
const zs=a=>{const m=a.reduce((p,q)=>p+q,0)/a.length,sd=Math.sqrt(a.reduce((p,q)=>p+(q-m)**2,0)/a.length);return a.map(x=>(x-m)/(sd+1e-6))};
function gdCompute(){const P=GDP[GD.pre](),b={r:GD.br,l:P.inc.l,k:P.inc.k},wl=(1-GD.w)*GD.wl,wc=(1-GD.w)*(1-GD.wl);
  const c=P.c.map(x=>{const g=x.r>=b.r;return Object.assign({},x,{g,Rr:x.r+GD.lam*Math.max(0,x.r-b.r),Rl:g?Math.max(0,b.l-x.l):0,Rc:g?Math.max(0,b.k-x.k):0,bank:x.r>=b.r&&(x.r>b.r||x.l<b.l||x.k<b.k)})});
  const zr=zs(c.map(x=>x.Rr)),zl=zs(c.map(x=>x.Rl)),zc=zs(c.map(x=>x.Rc));
  c.forEach((x,i)=>{x.zr=zr[i];x.zl=zl[i];x.zc=zc[i];x.Ag=GD.w*zr[i]+wl*zl[i]+wc*zc[i];x.S=GD.w*x.Rr+wl*x.Rl+wc*x.Rc;x.Sr=GD.w*x.Rr;x.Sl=wl*x.Rl;x.Sc=wc*x.Rc});
  const zS=zs(c.map(x=>x.S));c.forEach((x,i)=>x.Ao=zS[i]);
  return {P,b,c,wl,wc}}
const f2=v=>(v<0?'−':'')+Math.abs(v).toFixed(2);
// the steps of each method; their explanations are the step lists sx-gd-gdpo and sx-gd-grpo in 04_run.html
const GDS={gdpo:['Measure the group','Three channel rewards','Normalise each channel','Mix','Update the bank'].map(t=>({t})),
 grpo:['Measure the group','The same rewards','Mix the raw channels first','Normalise once','Update the bank'].map(t=>({t}))};
function gdDraw(m,k,e,w){const D=gdCompute(),c=D.c,n=c.length,nw=Math.min(118,Math.max(84,w*.26)),pad=4,rh=32,top=34,H=top+n*rh+8;
  let cols;const raw=[['score r','r',D.b.r,'var(--c1)'],['latency ℓ ('+D.P.lu+')','l',D.b.l,'var(--c4)'],['cost κ ($)','k',D.b.k,'var(--c2)']];
  if(k===0)cols=raw.map(x=>({h:x[0],f:q=>q[x[1]],ref:x[2],col:x[3],pos:true}));
  else if(k===1)cols=[['R rew','Rr','var(--c1)'],['R lat','Rl','var(--c4)'],['R cost','Rc','var(--c2)']].map(x=>({h:x[0],f:q=>q[x[1]],col:x[2],pos:true,gate:x[1]!=='Rr'}));
  else if(m==='gdpo'&&k===2)cols=[['A rew','zr','var(--c1)'],['A lat','zl','var(--c4)'],['A cost','zc','var(--c2)']].map(x=>({h:x[0],f:q=>q[x[1]],col:x[2]}));
  else if(m==='grpo'&&k===2)cols=[{h:'w·R summed (stacked)',stack:true}];
  else if(m==='gdpo')cols=[{h:'A Σ (advantage)',f:q=>q.Ag,col:'var(--ink)'}];
  else cols=[{h:'z of the sum (advantage)',f:q=>q.Ao,col:'var(--ink)'}];
  if(k===4)cols=[{h:'advantage',f:q=>m==='gdpo'?q.Ag:q.Ao,col:'var(--ink)'},{h:'bank',bank:true}];
  const cw=(w-nw-pad)/cols.length;let s='';if(k===0&&cw<130){cols[0].h='score r';cols[1].h='ℓ ('+(D.P.lu==='K tokens'?'K tok':D.P.lu)+')';cols[2].h='κ ($)'}
  c.forEach((q,i)=>{const y=top+i*rh;s+=tx(nw-6,y+18,q.n.length>16?q.n.slice(0,15)+'…':q.n,{fs:11,a:'end',w:q.n==='JIT-Agent'?600:null})+ln2(nw,y+rh-2,w,y+rh-2,'var(--line)')});
  cols.forEach((C,j)=>{const x0=nw+j*cw+6,x1=nw+(j+1)*cw-6,W2=x1-x0;s+=tx(x0,16,C.h,{fs:11,w:600,c:C.col||'var(--ink)'});
    if(C.bank){c.forEach((q,i)=>{const y=top+i*rh;s+=G(e,rc(x0,y+5,Math.min(W2,68),20,q.bank?'var(--open2)':'var(--soft)',{s:q.bank?'var(--open)':'var(--line)',r:10})+tx(x0+Math.min(W2,68)/2,y+19,q.bank?'kept':'not kept',{fs:11,a:'middle',c:q.bank?'var(--open)':'var(--mute)'}))});return}
    if(C.stack){const tot=c.map(q=>q.Sr+q.Sl+q.Sc),mx=Math.max(...tot,1e-9);c.forEach((q,i)=>{const y=top+i*rh;let xx=x0;[[q.Sr,'var(--c1)'],[q.Sl,'var(--c4)'],[q.Sc,'var(--c2)']].forEach(([v,col])=>{const ww=(W2-44)*v/mx*e;s+=rc(xx,y+8,ww,13,col,{r:1});xx+=ww});s+=tx(xx+4,y+19,(q.S).toFixed(q.S<10?3:1),{fs:11,c:'var(--mute)'})});return}
    const vals=c.map(C.f);if(C.pos){const mx=Math.max(...vals,C.ref||0,1e-9);c.forEach((q,i)=>{const y=top+i*rh,v=vals[i],gated=C.gate&&!q.g;s+=G(gated?.45:1,rc(x0,y+8,(W2-40)*v/mx*e,13,gated?'var(--dim)':C.col,{r:2}))+tx(x0+(W2-40)*v/mx*e+4,y+19,gated?'gated':(v>=100?v.toFixed(0):v>=1?v.toFixed(1):v.toFixed(3)),{fs:11,c:'var(--mute)'})});
      if(C.ref!=null){const xr=x0+(W2-40)*C.ref/mx;s+=ln2(xr,top-2,xr,top+n*rh-4,'var(--ink)',{sw:1.2,da:'3 2'})}}
    else{const mx=Math.max(...vals.map(Math.abs),1e-9),xm=x0+W2/2;s+=ln2(xm,top-2,xm,top+n*rh-4,'var(--mute)',{sw:1});c.forEach((q,i)=>{const y=top+i*rh,v=vals[i],ww=(W2/2-30)*Math.abs(v)/mx*e;s+=rc(v>=0?xm:xm-ww,y+8,ww,13,v>=0?C.col:'var(--bad)',{r:2,op:C.col==='var(--ink)'?.85:1})+tx(v>=0?xm+ww+3:xm-ww-3,y+19,f2(v),{fs:11,a:v>=0?'start':'end',c:'var(--mute)'})})}});
  return svgW(w,H,s,'Evo-GDPO on a group of harnesses')}
function gdCnt(m,k,e){const D=gdCompute(),c=D.c,top=a=>c.reduce((p,q)=>q[a]>p[a]?q:p),Ag=top('Ag'),Ao=top('Ao'),byR=top('Rr');
  const spread=a=>{const v=c.map(q=>q[a]).sort((x,y)=>y-x);return v[0]-v[1]};
  return stat('Top advantage, Evo-GDPO',Ag.n,'gap to second '+spread('Ag').toFixed(2))+stat('Top advantage, GRPO-style',Ao.n,'gap to second '+spread('Ao').toFixed(2))+stat('Best score in the group',byR.n,'r = '+byR.r)+stat('Kept in the bank',c.filter(q=>q.bank).length+' of '+c.length,'incumbent b<sub>r</sub> = '+D.b.r)}
const gdA=makeAnim({id:'gd',modes:GDS,mode:'gdpo',lists:{gdpo:'sx-gd-gdpo',grpo:'sx-gd-grpo'},draw:gdDraw,counters:gdCnt,dur:4200});
function gdTable(){const D=gdCompute();$('gdTab').innerHTML='<thead><tr><th>Candidate</th><th class="num">r</th><th class="num">ℓ</th><th class="num">κ</th><th class="num">R rew</th><th class="num">R lat</th><th class="num">R cost</th><th class="num">A, Evo-GDPO</th><th class="num">A, GRPO-style</th><th>Bank</th></tr></thead><tbody>'+
  D.c.map(q=>'<tr><td>'+esc(q.n)+'</td><td class="num">'+q.r+'</td><td class="num">'+q.l+'</td><td class="num">'+q.k.toFixed(3)+'</td><td class="num">'+q.Rr.toFixed(1)+'</td><td class="num">'+(q.g?q.Rl.toFixed(q.Rl>=10?0:1):'gated')+'</td><td class="num">'+(q.g?q.Rc.toFixed(3):'gated')+'</td><td class="num"><b>'+f2(q.Ag)+'</b></td><td class="num">'+f2(q.Ao)+'</td><td>'+(q.bank?'kept':'')+'</td></tr>').join('')+
  '<tr class="basec"><td>'+esc(D.P.inc.n)+'</td><td class="num">'+D.b.r+'</td><td class="num">'+D.b.l+'</td><td class="num">'+D.b.k.toFixed(3)+'</td><td colspan="6" class="small mute">incumbent (b<sub>r</sub>, b<sub>ℓ</sub>, b<sub>κ</sub>); ℓ in '+D.P.lu+'; weights w<sub>rew</sub> '+GD.w.toFixed(2)+', w<sub>lat</sub> '+D.wl.toFixed(2)+', w<sub>cost</sub> '+D.wc.toFixed(2)+'</td></tr></tbody>';
  $('gdNote').innerHTML=D.P.note;prFill(D)}
function prFill(D){const sa=$('prA'),sb=$('prB'),keep=[sa.value,sb.value];const opts=D.c.map((q,i)=>'<option value="'+i+'">'+esc(q.n)+'</option>').join('');
  sa.innerHTML=opts;sb.innerHTML=opts;sa.value=keep[0]&&+keep[0]<D.c.length?keep[0]:String(D.c.length-1);sb.value=keep[1]&&+keep[1]<D.c.length?keep[1]:'0';prCheck()}
function prOk(a,b){return a.r>b.r&&a.l<=b.l&&a.k<=b.k&&(a.l<b.l||a.k<b.k)}
function prCheck(){const D=gdCompute(),a=D.c[+$('prA').value],b=D.c[+$('prB').value];if(!a||!b)return;
  const why=[];if(!(a.r>b.r))why.push('its score is not higher ('+a.r+' against '+b.r+')');if(!(a.l<=b.l))why.push('it is slower ('+a.l+' against '+b.l+' '+D.P.lu+')');if(!(a.k<=b.k))why.push('it costs more ($'+a.k.toFixed(3)+' against $'+b.k.toFixed(3)+')');if(a.r>b.r&&a.l===b.l&&a.k===b.k)why.push('it is no faster and no cheaper');
  $('prOut').innerHTML='<div>'+(a===b?'Pick two different candidates.':prOk(a,b)?'<span class="ok">Kept</span>: '+esc(a.n)+' ≻ '+esc(b.n)+'. Higher score, no slower, no costlier, and strictly better on '+(a.l<b.l&&a.k<b.k?'both latency and cost':a.l<b.l?'latency':'cost')+'. Its DPO weight Δ<sub>val</sub> = α<sub>r</sub>·'+(a.r-b.r).toFixed(1)+' + α<sub>ℓ</sub>·'+(b.l-a.l).toFixed(1)+' + α<sub>κ</sub>·'+(b.k-a.k).toFixed(3)+' (the α\'s are not given).':'<span class="no">Not kept</span> with '+esc(a.n)+' as the winner: '+why.join('; ')+'.')+'</div>';
  let n=0,t=0;D.c.forEach(x=>D.c.forEach(y=>{if(x!==y){t++;if(prOk(x,y))n++}}));$('prAll').innerHTML='In this group '+n+' of '+t+' ordered pairs qualify. A pair where the better-scoring harness is also slower or dearer is discarded, so the preference data never trades score for cost.'}
['prA','prB'].forEach(id=>$(id).addEventListener('change',prCheck));
function gdSet(){$('gdBrv').textContent=GD.br.toFixed(1);$('gdLamv').textContent=GD.lam.toFixed(1);$('gdWv').textContent=GD.w.toFixed(2)+' (w lat + w cost = '+(1-GD.w).toFixed(2)+')';$('gdWlv').textContent=(100*GD.wl).toFixed(0)+'%';gdTable();if(gdA)gdA.draw()}
$('gdPre').addEventListener('change',e=>{GD.pre=e.target.value;GD.br=GDP[GD.pre]().inc.r;$('gdBr').value=GD.br;gdSet()});
[['gdBr','br'],['gdLam','lam'],['gdW','w'],['gdWl','wl']].forEach(([id,k])=>$(id).addEventListener('input',e=>{GD[k]=+e.target.value;gdSet()}));
$('gdBr').value=GD.br;onTab('t-run',()=>{gdSet();hsDraw();galShow()});

// ---------- the released training harnesses ----------
const HS=window.PAPER.hs;
function hsDraw(){const host=$('hsPlot');const rows=Object.entries(HS.by_source).filter(([k,v])=>v.rows>=30);
  const pct=(a,b)=>(100*a/b);
  host.innerHTML='<div class="hsg"><div class="hsh"><span>Source of the task (rows)</span><span style="color:var(--c2)">F exposes every tool</span><span style="color:var(--c4)">no planner</span><span style="color:var(--c1)">plain full history</span></div>'+
   rows.concat([['All released harnesses',HS.counts]]).map(([k,v])=>'<div class="hsr'+(k.startsWith('All')?' tot':'')+'"><span class="nm">'+esc(k)+' <span class="mute">('+fmt(v.rows)+')</span></span>'+[['tool_all','var(--c2)'],['plan_null','var(--c4)'],['mem_full','var(--c1)']].map(([f,c])=>'<span class="cell"><span class="track"><span class="fill" style="width:'+pct(v[f],v.rows).toFixed(1)+'%;background:'+c+'"></span></span><span class="val">'+pct(v[f],v.rows).toFixed(0)+'%</span></span>').join('')+'</div>').join('')+'</div>'+
   '<p class="small mute">Median size of one harness: '+fmt(HS.median_total_lines)+' lines (memory '+HS.median_lines.memory_py+', planning '+HS.median_lines.planning_py+', action '+HS.median_lines.action_py+', tool policy '+HS.median_lines.tool_policy_py+', prompt file '+HS.median_lines.prompt_yaml+'). Only '+HS.counts.react_like+' of '+fmt(HS.rows)+' are ReAct in all three respects. Rows whose task gives no workspace path are grouped as short QA or web-app tasks.</p>'}
function galShow(){const sel=$('galSel');if(!sel.options.length){sel.innerHTML=HS.gallery.map((g,i)=>'<option value="'+i+'">'+(i+1)+'. '+esc(g.source)+'</option>').join('');sel.addEventListener('change',galShow)}
  const g=HS.gallery[+sel.value||0];
  $('galOut').innerHTML='<div class="card"><p class="small mute">'+esc(g.source)+' · scaffold '+esc(g.id)+'</p><p><b>Task:</b> '+esc(g.task)+'</p>'+['M','P','A','F'].map(q=>'<div class="gm"><span class="mk m-'+q+'">'+q+'</span> <span class="small mute">'+g[q].lines+' lines</span><div class="mono small">'+(esc(g[q].doc)||'<span class="mute">(no docstring)</span>')+'</div></div>').join('')+'</div>'}
