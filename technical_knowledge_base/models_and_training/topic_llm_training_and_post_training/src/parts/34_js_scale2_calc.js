// ---- Scaling calculator: controls, outputs, the presets table and the two charts ----
(function(){
const X=window.SC;if(!X||!X.$('sc-pre'))return;
const {D0,S,compute,statePreset,$,fmt,sci,cnt,usd,pct,spct,tpp,A,stat,svgEl,frame,decTicks,segBind,segSet,onTab,lg,chinOpt,chinLoss,sardana,isoD}=X;
const P=D0.presets,ACC=D0.ACC,FITS=D0.FITS;
// ---- log sliders: position 0..1000 <-> value ----
const R={N:[1e8,3e12],Ntot:[1e8,1e13],D:[1e9,2e14],gpus:[8,2e5],inf:[1e9,1e17]};
const toV=(k,p)=>{const [a,b]=R[k];return 10**(lg(a)+(lg(b)-lg(a))*p/1000)};
const toP=(k,v)=>{const [a,b]=R[k];return Math.round(1000*(lg(v)-lg(a))/(lg(b)-lg(a)))};
const infV=p=>p<=0?0:toV('inf',p),infP=v=>v<=0?0:Math.max(1,toP('inf',v));
// ---- preset chips ----
$('sc-pre').innerHTML=P.map(p=>'<button data-p="'+p.id+'" title="'+p.name+'">'+p.name.replace(/ \(.*\)/,'')+'</button>').join('')+'<button data-p="" class="cus" title="Your own N and D">Custom</button>';
$('sc-acc').innerHTML=Object.entries(ACC).map(([k,a])=>'<option value="'+k+'">'+a.name+'</option>').join('');
function load(id){const p=P.find(x=>x.id===id);if(!p)return;Object.assign(S,statePreset(p),{preset:id,kind:p.Ntot>p.N*1.01?'moe':'dense',fit:S.fit,Dinf:S.Dinf});sync();X.changed()}
X.load=load;
$('sc-pre').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.p)load(b.dataset.p);else{S.preset=null;sync();X.changed()}}));
// ---- controls -> state ----
const custom=()=>{S.preset=null};
const on=(id,ev,f)=>$(id).addEventListener(ev,e=>{f(e.target);sync(true);X.changed()});
on('sc-N','input',t=>{S.N=toV('N',+t.value);if(S.kind==='dense')S.Ntot=S.N;else S.Ntot=Math.max(S.Ntot,S.N);custom()});
on('sc-Ntot','input',t=>{S.Ntot=Math.max(S.N,toV('Ntot',+t.value));custom()});
on('sc-D','input',t=>{S.D=toV('D',+t.value);custom()});
on('sc-attn','change',t=>{S.attn=t.checked});
on('sc-L','change',t=>{S.L=Math.max(1,Math.min(400,Math.round(+t.value)||1));custom()});
on('sc-dattn','change',t=>{S.dattn=Math.max(64,Math.min(131072,Math.round(+t.value)||64));custom()});
on('sc-ctx','change',t=>{S.ctx=+t.value;custom()});
on('sc-acc','change',t=>{S.acc=t.value});
on('sc-mfu','input',t=>{S.mfu=+t.value/100});
on('sc-gpus','input',t=>{S.gpus=Math.round(toV('gpus',+t.value))});
on('sc-usd','input',t=>{S.usd=+t.value});
on('sc-fit','change',t=>{S.fit=t.value});
on('sc-inf','input',t=>{S.Dinf=infV(+t.value)});
segBind('sc-kind',m=>{S.kind=m;if(m==='dense')S.Ntot=S.N;else if(S.Ntot<=S.N)S.Ntot=Math.min(R.Ntot[1],S.N*8);custom();sync();X.changed()});
segBind('sc-prec',m=>{S.prec=m;sync(true);X.changed()});
// ---- state -> controls ----
function sync(fromCtl){
  if(!fromCtl){$('sc-N').value=toP('N',S.N);$('sc-Ntot').value=toP('Ntot',S.Ntot);$('sc-D').value=toP('D',S.D);$('sc-gpus').value=toP('gpus',S.gpus);
    $('sc-mfu').value=(S.mfu*100).toFixed(1);$('sc-usd').value=S.usd;$('sc-inf').value=infP(S.Dinf)}
  $('sc-attn').checked=S.attn;$('sc-L').value=S.L;$('sc-dattn').value=S.dattn;$('sc-ctx').value=String(S.ctx);$('sc-acc').value=S.acc;$('sc-fit').value=S.fit;
  segSet('sc-kind',S.kind);segSet('sc-prec',S.prec);$('sc-Ntotrow').hidden=S.kind!=='moe';
  $('sc-Nlab').textContent=S.kind==='moe'?'Active parameters N':'Parameters N';
  $('sc-Nv').textContent=cnt(S.N);$('sc-Ntotv').textContent=cnt(S.Ntot);$('sc-Dv').textContent=cnt(S.D)+' tokens';
  $('sc-mfuv').textContent=pct(S.mfu);$('sc-gpusv').textContent=fmt(S.gpus);$('sc-usdv').textContent='$'+S.usd.toFixed(2);
  $('sc-infv').textContent=S.Dinf?sci(S.Dinf,1)+' tokens':'none';
  $('sc-pre').querySelectorAll('button').forEach(b=>b.classList.toggle('on',(b.dataset.p||null)===S.preset));
}
// ---- outputs ----
function render(){
  const o=compute(S),a=ACC[S.acc],f=FITS[S.fit],p=P.find(x=>x.id===S.preset);
  const fp8miss=S.prec==='fp8'&&!a.fp8;
  $('sc-accnote').textContent=a.name+': dense peak '+fmt(o.peak/1e12)+' TFLOP/s ('+(fp8miss?'BF16; the A100 has no FP8':S.prec.toUpperCase())+'). '+a.src+'.';
  $('sc-o1').innerHTML=
    stat('Training compute C',sci(o.C),S.attn?'6ND '+sci(o.C6)+' + attention '+sci(o.Cattn):'6ND; attention would add '+pct(o.attn_share),'C',o.C,'hl')+
    stat('Tokens per parameter',tpp(o.tpp),S.kind==='moe'?'per active parameter; '+tpp(o.tpp_tot)+' per total':'D / N','tpp',o.tpp)+
    stat('GPU-hours',cnt(o.hours),a.name+' at '+pct(S.mfu,1)+' MFU','hours',o.hours,'hl')+
    stat('GPU-days',cnt(o.gpu_days),'GPU-hours / 24; '+fmt(o.pfd,0)+' petaFLOP/s-days of compute','gpu_days',o.gpu_days)+
    stat('Wall-clock days',o.wall_days>=10?fmt(o.wall_days,0):o.wall_days.toFixed(1),'on '+fmt(S.gpus)+' GPUs, no failures or restarts','wall_days',o.wall_days)+
    stat('Rental cost of the final run',usd(o.usd),'at $'+S.usd.toFixed(2)+' per GPU-hour, illustrative','usd',o.usd);
  $('sc-o2').innerHTML=
    stat('Optimal size, '+(S.fit==='besi'?'Besiroglu refit':'Approach 3'),cnt(o.n3)+' <small>on '+cnt(o.d3)+' tokens</small>',tpp(o.tpp3)+' tokens per parameter; N = G(C/6)<sup>'+(f.be/(f.al+f.be)).toFixed(3)+'</sup>','n3',o.n3)+
    stat('Optimal size, 20 tokens per parameter',cnt(o.n20)+' <small>on '+cnt(o.d20)+' tokens</small>','N = √(C / 120)','n20',o.n20)+
    stat('This model against the fit\'s optimum',(o.size_vs3>=1?o.size_vs3.toFixed(2)+'×':'1/'+(1/o.size_vs3).toFixed(1))+' <small>the size</small>',o.size_vs3<1?'smaller and trained on more tokens: over-trained':'larger, on fewer tokens','size_vs3',o.size_vs3)+
    stat('Kaplan 2020 for this budget',cnt(o.nk)+' <small>on '+cnt(o.dk)+' tokens</small>','1.3B × (C/2 in PF-days)<sup>0.73</sup>, for contrast','nk',o.nk);
  $('sc-o3').innerHTML=
    stat('This model',o.loss.toFixed(4),'L(N, D), '+(S.fit==='besi'?'Besiroglu refit':'Hoffmann Approach 3'),'loss',o.loss,'hl')+
    stat('At the fit\'s optimum, same compute',o.loss3.toFixed(4),(o.loss-o.loss3>=0?'+':'−')+Math.abs(o.loss-o.loss3).toFixed(4)+' nats for this model\'s split','loss3',o.loss3)+
    stat('At 20 tokens per parameter',o.loss20.toFixed(4),'same compute','loss20',o.loss20)+
    stat('Kaplan L(N, D), for contrast',o.loss_kap.toFixed(4),'different data and tokenizer: not comparable in absolute terms','loss_kap',o.loss_kap);
  $('sc-lossnote').innerHTML='Losses are nats per token on each fit\'s own data (MassiveText for Chinchilla, WebText2 for Kaplan), predicted for a model trained like the papers\' runs; they say nothing about another lab\'s data. The fit was made on runs from 70M to 16B parameters on 5B to 500B tokens, so most presets are extrapolations.'+(S.kind==='moe'?' <b>MoE:</b> the fit is for dense models; plugging in active parameters, as here, is a convention, not something the fit measured.':'');
  // residual box for the loaded preset, at the current settings
  const rb=$('sc-res');
  if(!p){rb.innerHTML='<div class="t">Custom model</div>No published figure to compare against. Load a preset to see the residual.';}
  else{let t='<div class="t">'+p.name+': computed against published, at the current settings</div><div class="tw"><table><tr><th></th><th class="num">Published</th><th class="num">Computed</th><th class="num">Residual</th></tr>';
    if(p.pubC)t+='<tr><td>Training FLOPs</td><td class="num">'+sci(p.pubC)+'</td><td class="num">'+sci(o.C)+'</td><td class="num" data-k="resC" data-v="'+(o.C/p.pubC-1)+'">'+spct(o.C/p.pubC-1)+'</td></tr>';
    if(p.pubH){const imp=o.C/(p.pubH*3600*o.peak);t+='<tr><td>GPU-hours ('+ACC[p.acc].name+')</td><td class="num">'+cnt(p.pubH,3)+'</td><td class="num">'+cnt(o.hours,3)+'</td><td class="num" data-k="resH" data-v="'+(o.hours/p.pubH-1)+'">'+spct(o.hours/p.pubH-1)+'</td></tr>'+
      '<tr><td colspan="3">MFU that would make the hours match, '+(S.attn?'counting attention':'by 6ND')+', on '+ACC[S.acc].name+' '+(S.prec==='fp8'&&ACC[S.acc].fp8?'FP8':'BF16')+'</td><td class="num" data-k="mfuImp" data-v="'+imp+'">'+pct(imp)+'</td></tr>'}
    if(!p.pubC&&!p.pubH)t+='<tr><td colspan="4">Nothing published to compare against.</td></tr>';
    t+='</table></div><p style="margin:4px 0 0">'+p.why+'</p><p class="small mute" style="margin:2px 0 0">'+[p.pubC_src,p.pubH_src,p.mfu_src].filter(Boolean).join('; ')+'. '+A(p.src,'Source')+'.</p>';rb.innerHTML=t}
  // inference outputs
  const cl=6*o.cN*o.cD+2*o.cN*S.Dinf;
  $('sc-o4').innerHTML=
    stat('Lifetime compute, this model',sci(o.cur_tot),S.Dinf?'6ND + 2N·D<sub>inf</sub>: inference is '+pct(o.inf_share)+' of it':'no inference: training only','cur_tot',o.cur_tot,'hl')+
    stat('Chinchilla-optimal model of the same loss',cnt(o.cN)+' <small>on '+cnt(o.cD)+'</small>','lifetime '+sci(cl)+'; training alone '+sci(o.cC),'cN',o.cN)+
    stat('Inference-aware optimum (Sardana et al.)',cnt(o.sN)+' <small>on '+cnt(o.sD)+'</small>',tpp(o.sD/o.sN)+' tokens per parameter; lifetime '+sci(o.sTot),'sN',o.sN)+
    stat('Saving against this model',o.s_saving>=0.0005?pct(o.s_saving):'none','of lifetime compute, at the same loss','s_saving',o.s_saving);
  drawTpp();drawLife();
}
X.onChange(render);
// ---- presets table, from the same compute() at each preset's defaults ----
function table(){
  const rows=P.map(p=>{const s=statePreset(p),o=compute(s),oa=compute(Object.assign({},s,{attn:true}));
    const r={id:p.id,C6:o.C6,Cfull:oa.C,tpp:o.tpp};
    if(p.pubC){r.resC6=o.C6/p.pubC-1;r.resCfull=oa.C/p.pubC-1}
    if(p.pubH){r.hours_at_mfu=o.hours;r.resH=o.hours/p.pubH-1;r.mfu_implied=o.C6/(p.pubH*3600*ACC[p.acc].bf16);r.mfu_implied_full=oa.C/(p.pubH*3600*ACC[p.acc].bf16)}
    return [p,r]});
  const cls=v=>Math.abs(v)<=0.03?'ok':v>0?'pos':'neg';
  const cell=(k,v,txt,c)=>'<td class="num'+(c?' '+c:'')+'" data-k="'+k+'" data-v="'+v+'">'+txt+'</td>';
  let h='<thead><tr><th>Model</th><th class="num">N</th><th class="num">D</th><th class="num">D/N</th><th class="num">6ND</th><th class="num">Published FLOPs</th><th class="num">Residual<br>6ND / +attn</th><th class="num">Published GPU-hours</th><th class="num">Hours at MFU</th><th class="num">Residual</th><th class="num">Implied MFU<br>6ND / +attn</th></tr></thead><tbody>';
  rows.forEach(([p,r])=>{h+='<tr data-p="'+p.id+'"'+(p.id===S.preset?' class="cur"':'')+'><td class="nm"><button data-p="'+p.id+'">'+p.name+'</button></td>'+
    '<td class="num">'+cnt(p.N)+(p.Ntot>p.N*1.01?'<br><span class="mute">of '+cnt(p.Ntot,0)+'</span>':'')+'</td><td class="num">'+cnt(p.D)+'</td>'+cell('tpp',r.tpp,tpp(r.tpp))+cell('C6',r.C6,sci(r.C6))+
    '<td class="num">'+(p.pubC?sci(p.pubC):'<span class="mute">not published</span>')+'</td>'+
    (p.pubC?'<td class="num" data-k="resC6" data-v="'+r.resC6+'" data-v2="'+r.resCfull+'"><span class="'+cls(r.resC6)+'">'+spct(r.resC6)+'</span> / <span class="'+cls(r.resCfull)+'">'+spct(r.resCfull)+'</span></td>':'<td class="num mute">n/a</td>')+
    '<td class="num">'+(p.pubH?cnt(p.pubH,p.pubH<1e6?0:2)+'<br><span class="mute">'+ACC[p.acc].name+'</span>':'<span class="mute">not published</span>')+'</td>'+
    (p.pubH?cell('hours_at_mfu',r.hours_at_mfu,cnt(r.hours_at_mfu,r.hours_at_mfu<1e6?0:2)+'<br><span class="mute">at '+pct(p.mfu||D0.DEF.mfu,0)+(p.mfu?', stated':'')+'</span>')+cell('resH',r.resH,spct(r.resH),cls(r.resH))+
      '<td class="num" data-k="mfu_implied" data-v="'+r.mfu_implied+'" data-v2="'+r.mfu_implied_full+'">'+pct(r.mfu_implied,0)+' / '+pct(r.mfu_implied_full,0)+'</td>':'<td class="num mute">n/a</td><td class="num mute">n/a</td><td class="num mute">n/a</td>')+'</tr>'});
  $('sc-tb').innerHTML=h+'</tbody>';
  $('sc-tb').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{load(b.dataset.p);$('sc-s-calc').scrollIntoView({block:'start'})}));
  $('sc-why').innerHTML=P.map(p=>'<details class="mist"><summary>'+p.name+'</summary><div class="b">'+p.why+' <span class="mute">'+[p.pubC_src,p.pubH_src,p.mfu_src].filter(Boolean).join('; ')+'.</span> '+A(p.src,'Source')+'.</div></details>').join('');
  const withC=rows.filter(([p])=>p.pubC),ok=withC.filter(([,r])=>Math.abs(r.resC6)<=0.03);
  const withH=rows.filter(([p])=>p.pubH);
  $('sc-repro').innerHTML='<b>Reproduction count.</b> 6ND lands within 3% of '+ok.length+' of the '+withC.length+' published FLOP figures ('+ok.map(([p])=>p.name.replace(/ \(.*\)/,'')).join(', ')+'); the exception is Gopher, whose figure is its authors\' own fuller count. GPU-hours never reproduce at a standard MFU: the '+withH.length+' published figures imply MFUs from '+pct(Math.min(...withH.map(([,r])=>r.mfu_implied)),0)+' to '+pct(Math.max(...withH.map(([,r])=>r.mfu_implied)),0)+' by 6ND, because what each lab counts as "training time" differs. GPT-3\'s match is by construction (its table is 6ND); Llama 3.1 405B\'s 3.8 × 10²⁵ is matched independently.';
  X.tableRows=rows;
}
// ---- chart: tokens per parameter against compute ----
const FCOL={hoff:'var(--c1)',hoffr:'var(--c4)',besi:'var(--c3)'};
function drawTpp(){
  const el=$('sc-tpp');if(!el||!el.clientWidth)return;const W=Math.max(300,el.clientWidth),nar=W<560,H=nar?260:300;
  const fr=frame({W,H,pl:44,pr:10,pt:12,pb:34,x:[1e20,1e27],y:[1,1e4],xt:decTicks(1e20,1e27,nar?2:1),yt:[[1,'1'],[10,'10'],[100,'100'],[1000,'1,000'],[1e4,'10,000']],xl:'Training compute C (FLOPs)',yl:'Tokens per parameter'});
  let s=fr.s;const {sx,sy}=fr;
  s+='<line x1="'+sx(1e20)+'" x2="'+sx(1e27)+'" y1="'+sy(20)+'" y2="'+sy(20)+'" stroke="var(--c2)" stroke-width="2" stroke-dasharray="5 4"><title>20 tokens per parameter</title></line>';
  Object.keys(FITS).forEach(k=>{const f=FITS[k];let d='';for(let i=0;i<=60;i++){const C=10**(20+7*i/60),[n,dd]=chinOpt(f,C);d+=(i?'L':'M')+sx(C).toFixed(1)+' '+sy(Math.min(1e4,Math.max(1,dd/n))).toFixed(1)}
    s+='<path d="'+d+'" fill="none" stroke="'+FCOL[k]+'" stroke-width="'+(k===S.fit?2.6:1.5)+'"'+(k===S.fit?'':' opacity=".75"')+'><title>'+f.name+'</title></path>'});
  const pts=P.map(p=>{const C=6*p.N*p.D;return {x:sx(C),y:sy(Math.min(1e4,p.D/p.N)),p}});
  pts.forEach(q=>{s+='<circle cx="'+q.x.toFixed(1)+'" cy="'+q.y.toFixed(1)+'" r="4" fill="var(--c5)" stroke="var(--bg)"><title>'+q.p.name+': '+sci(6*q.p.N*q.p.D)+' FLOPs, '+tpp(q.p.D/q.p.N)+' tokens per parameter</title></circle>'});
  if(!nar){const placed=[];pts.slice().sort((a,b)=>a.y-b.y).forEach(q=>{let y=q.y+4;const lab=q.p.name.replace(/ \(.*\)/,'');let x=q.x+7,anc='start';if(x+lab.length*6>W-10){x=q.x-7;anc='end'}
    if(y>H-34-3)y=q.y-7;while(placed.some(r=>Math.abs(r.y-y)<11&&Math.abs(r.x-x)<lab.length*6))y+=11;placed.push({x,y});s+='<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" font-size="10.5" fill="var(--mute)" text-anchor="'+anc+'">'+lab+'</text>'})}
  const o=compute(S),cx=sx(Math.min(1e27,Math.max(1e20,o.C))),cy=sy(Math.min(1e4,Math.max(1,o.tpp)));
  s+='<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="8" fill="none" stroke="var(--ink)" stroke-width="2"><title>Current model</title></circle>';
  el.innerHTML=svgEl(W,H,s,'Tokens per parameter against training compute: three fits, the 20 rule and the presets');
  $('sc-tppleg').innerHTML=Object.keys(FITS).map(k=>'<span><i style="background:'+FCOL[k]+'"></i>'+FITS[k].name+'</span>').join('')+'<span><i style="background:repeating-linear-gradient(90deg,var(--c2) 0 5px,transparent 5px 8px)"></i>20 tokens per parameter</span><span><i class="dot" style="background:var(--c5)"></i>presets</span>';
}
// ---- chart: lifetime compute along the iso-loss curve ----
function drawLife(){
  const el=$('sc-life');if(!el||!el.clientWidth)return;const W=Math.max(300,el.clientWidth),nar=W<560,H=nar?250:290;
  const o=compute(S),f=FITS[S.fit],l=o.loss,Nlo=Math.pow(f.A/(l-f.E),1/f.al);
  const x0=Math.max(Nlo*1.03,Math.min(S.N,o.cN,o.sN)/8),x1=Math.max(S.N,o.cN,o.sN)*8;
  const tr=N=>6*N*isoD(f,l,N),life=N=>tr(N)+2*N*S.Dinf;
  const ymin=Math.min(o.cC,o.sTot,o.cur_tot)/1.5,ymax=Math.max(ymin*10,Math.max(o.cur_tot,life(o.cN),o.sTot)*4);
  const fr=frame({W,H,pl:46,pr:10,pt:12,pb:34,x:[x0,x1],y:[ymin,ymax],xt:decTicks(x0,x1,1).map(([v])=>[v,cnt(v,0)]),yt:decTicks(ymin,ymax,1),xl:'Parameters N (tokens follow from the fixed loss)',yl:'FLOPs'});
  let s=fr.s;const {sx,sy}=fr;const cy=v=>sy(Math.min(ymax,Math.max(ymin,v)));
  const path=fn=>{let d='',pen=false;for(let i=0;i<=120;i++){const N=x0*Math.pow(x1/x0,i/120),v=fn(N);if(!(v<=ymax)){pen=false;continue}d+=(pen?'L':'M')+sx(N).toFixed(1)+' '+cy(v).toFixed(1);pen=true}return d};
  s+='<path d="'+path(tr)+'" fill="none" stroke="var(--c1)" stroke-width="1.6" stroke-dasharray="5 4"><title>Training compute 6ND</title></path>';
  if(S.Dinf)s+='<path d="'+path(life)+'" fill="none" stroke="var(--c2)" stroke-width="2.4"><title>Training plus inference</title></path>';
  const pt=(N,v,c,t,r)=>'<circle cx="'+sx(N).toFixed(1)+'" cy="'+cy(v).toFixed(1)+'" r="'+(r||5)+'" fill="'+c+'" stroke="var(--bg)" stroke-width="1.5"><title>'+t+'</title></circle>';
  s+=pt(o.cN,life(o.cN),'var(--c1)','Chinchilla-optimal at this loss: '+cnt(o.cN));
  if(S.Dinf)s+=pt(o.sN,o.sTot,'var(--c3)','Inference-aware optimum: '+cnt(o.sN));
  s+='<circle cx="'+sx(S.N).toFixed(1)+'" cy="'+cy(o.cur_tot).toFixed(1)+'" r="8" fill="none" stroke="var(--ink)" stroke-width="2"><title>This model</title></circle>';
  el.innerHTML=svgEl(W,H,s,'Lifetime compute along the curve of equal loss');
  $('sc-lifeleg').innerHTML='<span><i style="background:repeating-linear-gradient(90deg,var(--c1) 0 5px,transparent 5px 8px)"></i>training only, 6ND</span>'+(S.Dinf?'<span><i style="background:var(--c2)"></i>training + 2N·D<sub>inf</sub></span><span><i class="dot" style="background:var(--c3)"></i>inference-aware optimum</span>':'<span>(move the slider to add inference)</span>')+'<span><i class="dot" style="background:var(--c1)"></i>Chinchilla-optimal, same loss</span><span><i class="dot" style="border:2px solid var(--ink);background:none"></i>this model</span>';
}
// ---- Sardana et al.'s own examples, reproduced with Hoffmann's unrounded constants ----
function sard(){
  const f=FITS.hoff,G=Math.pow(f.al*f.A/(f.be*f.B),1/(f.al+f.be)),a=f.be/(f.al+f.be);
  const ex=[[13e9,2e12,'7B on 2.1× the data, 17% fewer FLOPs'],[7e9,1e11,'6B on 1.18× the data'],[30e9,1e13,'13.6B on 2.84× the data, 28% fewer FLOPs']];
  $('sc-sard').innerHTML='<b>Check against the paper.</b> With Hoffmann\'s unrounded constants this method reproduces Sardana et al.\'s §2 examples closely: '+ex.map(([Nc,Di,pr])=>{const C0=6*Math.pow(Nc/G,1/a),l=chinLoss(f,Nc,C0/6/Nc),[n,d,t]=sardana(f,l,Di,Nc);
    return 'a '+cnt(Nc,0)+'-quality model served for '+sci(Di,0)+' tokens gives '+cnt(n,1)+' on '+(d/(C0/6/Nc)).toFixed(2)+'× the data, '+pct(1-t/(C0+2*Nc*Di),0)+' fewer FLOPs (paper: '+pr+')'}).join('; ')+'. The small differences are the fit\'s rounding; with the rounded constants the answers move by 10 to 40%.';
}
S.Dinf=1e15;load('l31_405');table();sard();
onTab(()=>{table();render()});
})();
