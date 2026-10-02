// ---- The paper tab: routing animation, balancing-loss and bfloat16 reveals, table charts, Figure 9 ----
const EC=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
// One batch through a 4-expert layer: top-2 (MoE) against top-1 (Switch), Code Block 15's steps
(function(){
  const W12=['the','switch','layer','sends','each','token','to','one','expert','and','only','one'];
  const FIRST=[0,1,0,2,0,1,2,0,3,1,0,2],SECOND=[1,3,2,3,1,0,3,2,0,3,1,2];
  // illustrative probabilities: first choice 0.42 to 0.62, second 0.2 to 0.3, the rest shared
  const PR=W12.map((w,t)=>{const p=[0,0,0,0];const a=0.42+0.2*((t*7)%5)/4,b=0.2+0.1*((t*3)%4)/3;p[FIRST[t]]=a;p[SECOND[t]]=b;const r=(1-a-b)/2;for(let e=0;e<4;e++)if(e!==FIRST[t]&&e!==SECOND[t])p[e]=r;return p});
  let CF=1.25;
  function route(m){const k=m==='moe'?2:1,C=Math.ceil(12/4*CF*k-1e-9),fill=[0,0,0,0],slot=[];// slot: {t, e, pos, ch}
    const drop=[];for(let t=0;t<12;t++){const e=FIRST[t];if(fill[e]<C)slot.push({t,e,pos:fill[e]++,ch:1});else drop.push({t,e,ch:1})}
    if(k===2)for(let t=0;t<12;t++){const e=SECOND[t];if(fill[e]<C)slot.push({t,e,pos:fill[e]++,ch:2});else drop.push({t,e,ch:2})}
    const load=[0,0,0,0];FIRST.forEach(e=>load[e]++);if(k===2)SECOND.forEach(e=>load[e]++);
    const dead=[...Array(12).keys()].filter(t=>!slot.some(s=>s.t===t));
    return {k,C,slot,drop,load,dead,fill}}
  const modes={
    moe:[{t:'a batch of 12 tokens',c:'One core\'s share of the batch: 12 tokens, 4 experts. The MoE Transformer the paper compares against sends every token to its two best experts (Shazeer et al. 2017, GShard).'},
         {t:'the router, in float32',c:'Logits <i>h</i>(<i>x</i>) = <i>W</i><sub>r</sub> · <i>x</i>, one per expert, then a softmax (Eq. 1). Switch casts this one function to float32 (selective precision). The bars under each token are its four gate values.'},
         {t:'choose the top 2',c:'Each token picks its two largest gate values: solid outline for the first choice, dashed for the second. Total demand per expert is the sum of both.'},
         {t:'capacity: C slots per expert',c:'Two choices per token double the buffer: C = 2 × (12 / 4) × capacity factor, rounded up. Every slot is computed and communicated whether or not a token fills it.'},
         {t:'dispatch through the all-to-all',c:'Tokens are copied into their experts\' slots in batch order, first choices before second choices. A copy that finds its expert full is dropped.'},
         {t:'experts compute every slot',c:'Each expert runs its FFN over all C slots; empty ones are padding. Two expert FFNs per token is twice the FLOPs of a dense FFN, so top-2 is not FLOP-matched to T5-Base.'},
         {t:'combine, weighted by the gates',c:'Each token\'s output is the sum of its kept experts\' outputs times their gate values (Eq. 2), added to the residual stream. A token that lost one copy still has the other.'}],
    sw:[{t:'a batch of 12 tokens',c:'The same 12 tokens and the same router probabilities, now through a Switch layer: one expert per token.'},
        {t:'the router, in float32',c:'The same router: logits <i>W</i><sub>r</sub> · <i>x</i>, a softmax in float32, cost <i>d</i><sub>model</sub> × experts per token (§3).'},
        {t:'choose the top 1',c:'Each token keeps only its largest gate value. Shazeer et al. conjectured this would starve the router of gradient; the gate value multiplying the output still carries one.'},
        {t:'capacity: C slots per expert',c:'One choice per token: C = (12 / 4) × capacity factor, rounded up (Eq. 3). Half of top-2\'s buffer at the same capacity factor, which is benefit (2) of §2.1.'},
        {t:'dispatch through the all-to-all',c:'Tokens fill their expert\'s slots in batch order (the cumulative sum in Code Block 15). A token arriving at a full expert is dropped: it skips the layer entirely.'},
        {t:'experts compute every slot',c:'One expert FFN per token: the same FLOPs as T5-Base\'s dense FFN, plus the router. Padding is the price of a capacity factor above 1.0.'},
        {t:'combine, weighted by the gate',c:'Output = <i>p</i><sub>i</sub>(<i>x</i>) <i>E</i><sub>i</sub>(<i>x</i>) added to the residual stream; a dropped token "is passed directly to the next layer through the residual connection" (§2.2), unchanged.'}]};
  function draw(m,k,e,W){const R=route(m),per=W<560?6:12,rows=12/per,pad=2,tw=(W-2*pad)/per,th=24,gap=k>=1?26:8;
    const rowY=r=>6+r*(th+gap),tpos=t=>({x:pad+(t%per)*tw,y:rowY(Math.floor(t/per))});
    const eY=rowY(rows)+16,cw=(W-2*pad)/4,sh=W<560?17:19,Cmax=Math.ceil(12/4*CF*(m==='moe'?2:1)-1e-9),slotsH=Cmax*(sh+3);
    const dY=eY+18+slotsH+30,oY=dY+th+24,H=oY+th+8;let s='';
    // experts and their slots
    for(let x=0;x<4;x++){const cx=pad+x*cw;s+=tx(cx+cw/2,eY+8,'Expert '+(x+1),{fs:12,a:'middle',w:600,c:EC[x]});
      if(k>=3){const op=k===3?e:1;for(let j=0;j<R.C;j++){const filled=k>=5&&R.slot.some(q=>q.e===x&&q.pos===j);
        s+=G(op,rc(cx+5,eY+16+j*(sh+3),cw-10,sh,k>=5&&!filled?'var(--soft)':'var(--bg)',{s:EC[x],r:3,da:k>=5&&!filled?'3 2':null,op:k>=5&&!filled?.8:1}))}
        if(k>=5){const pd=R.C-R.fill[x];if(pd>0)s+=tx(cx+cw/2,eY+16+R.C*(sh+3)+10,pd+' padded',{fs:11,a:'middle',c:'var(--mute)'})}}}
    s+=tx(pad,dY-4,k>=4?'dropped: residual only':'',{fs:11,c:'var(--bad)'});
    // tokens on top
    const fsz=tw<52?11:12;
    for(let t=0;t<12;t++){const p=tpos(t),fade=k>=4?1-0.6*(k===4?e:1):1;let o={s:'var(--line)'};
      if(k>=2){o={s:EC[FIRST[t]],sw:2}}
      s+=G(fade,rc(p.x+1,p.y,tw-2,th,'var(--soft)',o)+tx(p.x+tw/2,p.y+16,W12[t],{fs:fsz,a:'middle'}));
      if(k>=2&&m==='moe')s+=G(fade*(k===2?e:1),rc(p.x+3,p.y+2,tw-6,th-4,'none',{s:EC[SECOND[t]],sw:1.5,da:'3 2'}));
      if(k>=1){const op=k===1?e:1,bw=(tw-8)/4;for(let x=0;x<4;x++){const hh=16*PR[t][x];s+=G(op*fade,rc(p.x+4+x*bw,p.y+th+3+16-hh,bw-1.5,hh,EC[x],{r:1}))}}}
    // copies in slots (or in the drop row)
    if(k>=4){const pe=k===4?e:1;R.slot.forEach(q=>{const p=tpos(q.t),sx=pad+q.e*cw+5,sy=eY+16+q.pos*(sh+3);const x=p.x+(sx-p.x)*pe,y=p.y+(sy-p.y)*pe,w=tw+((cw-10)-tw)*pe,hh=th+(sh-th)*pe;
        s+=rc(x,y,w,hh,'var(--acc2)',{s:EC[q.e],r:3,da:q.ch===2?'3 2':null})+tx(x+w/2,y+hh/2+4,W12[q.t],{fs:11,a:'middle'})});
      const dw=Math.min(tw,(W-2*pad)/Math.max(4,R.drop.length));R.drop.forEach((q,i)=>{const p=tpos(q.t),sx=pad+i*dw,sy=dY;const x=p.x+(sx-p.x)*pe,y=p.y+(sy-p.y)*pe;
        s+=rc(x+1,y,dw-2,th,'var(--hl)',{s:'var(--bad)',r:3,da:q.ch===2?'3 2':null})+tx(x+dw/2,y+16,W12[q.t]+(q.ch===2?' (2nd)':''),{fs:11,a:'middle'})})}
    // combined output
    if(k>=6){s+=tx(pad,oY-6,'output, in token order',{fs:11,c:'var(--mute)'});for(let t=0;t<12;t++){const x=pad+(t%12)*((W-2*pad)/12),w=(W-2*pad)/12-2,ks=R.slot.filter(q=>q.t===t);
        if(!ks.length)s+=G(e,rc(x+1,oY,w,th,'var(--soft)',{s:'var(--bad)',r:3})+tx(x+1+w/2,oY+16,'x',{fs:11,a:'middle',c:'var(--bad)'}));
        else ks.forEach((q,i)=>{s+=G(e,rc(x+1+i*w/ks.length,oY,w/ks.length,th,EC[q.e],{r:2,op:.85}))})}}
    return svgW(W,H,s,'One batch through a routed expert layer')}
  function counters(m,k){const R=route(m),slots=4*R.C,used=R.slot.length;
    return stat('expert FFNs per token',R.k+'×',R.k===2?'twice a dense FFN':'the same as dense T5')+stat('capacity C per expert',k>=3?R.C:'…',k>=3?'4 experts, '+slots+' slots':'at step 4')+
      stat('slots computed',k>=5?slots+' for 12 tokens':'…',k>=5?(slots-used)+' padded':'at step 6')+stat('tokens with no expert',k>=4?R.dead.length:'…',k>=4?(R.drop.length-R.dead.length)+' second choices lost':'at step 5')+
      stat('all-to-all, each way',k>=4?slots+' × d<sub>model</sub>':'…','E × C × d<sub>model</sub>, bfloat16')}
  const A=makeAnim({id:'rta',modes,mode:'sw',draw,counters,dur:2600});
  const cf=$('rtaCf');cf.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{cf.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));CF=+b.dataset.cf;if(A)A.draw()}));
})();

// Predict: the balancing loss at collapse
PRED_REVEAL['pr-aux']=function(){const n=$('auxN'),c=$('auxC'),host=$('auxSvg');
  function go(){fit(host,W=>{const N=+n.value,q=+c.value/100;$('auxNv').textContent=N;$('auxCv').textContent=Math.round(q*100)+'%';
    // concentration q: expert 1 gets share 1/N + q (1 - 1/N); the rest split evenly. f = P for the illustration.
    const f=[];for(let i=0;i<N;i++)f.push(i===0?1/N+q*(1-1/N):(1-(1/N+q*(1-1/N)))/(N-1));
    const L=N*f.reduce((a,v)=>a+v*v,0);const show=Math.min(N,16),bw=Math.max(4,(W-60)/show-3),H=120;let s='';const fr=frame({W,H,x:[0,show],y:[0,1],yt:[[0,'0'],[0.5,'0.5'],[1,'1']],pl:40,pb:26});s+=fr.s;
    for(let i=0;i<show;i++){const x=fr.sx(i)+1.5;s+=rc(x,fr.sy(f[i]),bw,fr.sy(0)-fr.sy(f[i]),i===0?'var(--c2)':'var(--c1)',{r:1})}
    s+=ln2(40,fr.sy(1/N),W-14,fr.sy(1/N),'var(--mute)',{da:'4 3'})+tx(W-16,fr.sy(1/N)-4,'1/N',{fs:11,a:'end',c:'var(--mute)'});
    s+=tx(40,H-6,'f = P per expert'+(N>16?' (first 16 of '+N+')':''),{fs:11,c:'var(--mute)'});
    host.innerHTML=svgW(W,H,s,'Expert shares');
    $('auxOut').innerHTML='Loss = α · '+N+' · Σ f<sub>i</sub>P<sub>i</sub> = <b>'+L.toFixed(2)+' α</b> (uniform: 1 α; total collapse: '+N+' α). Gradient on expert 1\'s probability: α · N · f<sub>1</sub> = '+(N*f[0]).toFixed(2)+' α, against '+(N*f[1]).toFixed(2)+' α on each other expert. Here f = P for simplicity; in training f is the argmax count.'})}
  n.oninput=go;c.oninput=go;go()};

// bfloat16 rounding of a float32 value, round to nearest even, as TPUs do
const F32=new Float32Array(1),U32=new Uint32Array(F32.buffer);
function bf16(x){F32[0]=x;let b=U32[0];b=(b+0x7FFF+((b>>>16)&1))>>>0;U32[0]=(b&0xFFFF0000)>>>0;return F32[0]}
function softmax(z){const m=Math.max(...z),e=z.map(v=>Math.exp(v-m)),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s)}
PRED_REVEAL['pr-bf']=function(){const L=$('bfL'),G_=$('bfG'),K=$('bfK'),host=$('bfSvg');
  function go(){const base=2**(+L.value),gap=+G_.value,k=+K.value;$('bfLv').textContent=base.toFixed(base<10?2:1);$('bfGv').textContent=gap.toFixed(2);
    const z=[base+gap].concat(Array(k).fill(base)),zb=z.map(bf16),p=softmax(z),pb=softmax(zb);
    const sp=2**(Math.floor(Math.log2(base+gap))-7);
    fit(host,W=>{const H=96;const lbl=W<560?92:150;const bw=W-lbl-60;let s='';
      [['float32',p[0],'var(--c1)'],['bfloat16',pb[0],'var(--c2)']].forEach(([n,v,c],i)=>{const y=10+i*36;s+=tx(lbl-6,y+14,n+', top expert',{fs:12,a:'end'})+rc(lbl,y,bw,18,'var(--soft)',{r:3})+rc(lbl,y,bw*v,18,c,{r:3})+tx(lbl+bw*v+5,y+14,v.toFixed(3),{fs:11})});
      s+=tx(lbl,H-6,'probability of the top expert, 0 to 1',{fs:11,c:'var(--mute)'});host.innerHTML=svgW(W,H,s,'Softmax in float32 and bfloat16')});
    const ch=(pb[0]/p[0]-1)*100;
    $('bfOut').innerHTML='Logits: one at <span class="mono">'+(base+gap).toFixed(3)+'</span>, '+k+' at <span class="mono">'+base.toFixed(3)+'</span>. In bfloat16 they become <span class="mono">'+zb[0]+'</span> and <span class="mono">'+zb[1]+'</span> (representable numbers here are '+sp+' apart). Top probability '+p[0].toFixed(3)+' in float32, '+pb[0].toFixed(3)+' in bfloat16: <b>'+(ch>=0?'+':'')+ch.toFixed(0)+'%</b>.'}
  L.oninput=go;G_.oninput=go;K.onchange=go;go()};

// Table 2 and Table 4 bars
(function(){const el=$('t2bars');fit(el,W=>{const r=TB.T2.rows;const it=[{n:'float32',v:+r[0][2],c:'var(--c1)',tag:'('+r[0][1]+')'},{n:'bfloat16',v:+r[1][2],c:'var(--bad)',tag:'(diverged, '+r[1][1].split(' ')[0]+')'},{n:'selective precision',v:+r[2][2],c:'var(--c3)',hl:1,tag:'('+r[2][1]+')'}];
  el.innerHTML=hbars(W,it,{dom:[0,1600],fmt:v=>fmt(v),title:'Examples per second, quality in brackets (Table 2)'})+'<p class="small mute" style="margin:2px 0 0">Selective precision runs at bfloat16\'s 1,390 examples a second, '+((RC.ratios.table2_speed_bf16_over_fp32-1)*100).toFixed(0)+'% faster than float32, with float32\'s quality. 32 experts, quality after a fixed number of steps early in training.</p>'})})();
(function(){const el=$('t4bars');const tasks=TB.T4.cols.slice(1);let j=0;
  function go(){fit(el,W=>{const it=TB.T4.rows.map(r=>({n:r[0],v:+r[1+j],hl:/ed=0.4/.test(r[0]),c:/T5/.test(r[0])?'var(--c2)':null}));const vs=it.map(x=>x.v),lo=Math.floor(Math.min(...vs)-1),hi=Math.ceil(Math.max(...vs)+.5);
    el.innerHTML='<div class="seg" id="t4seg" style="margin-bottom:4px">'+tasks.map((t,i)=>'<button data-i="'+i+'" class="'+(i===j?'on':'')+'">'+t+'</button>').join('')+'</div>'+hbars(W,it,{dom:[lo,hi],fmt:f1,title:tasks[j]+', fine-tuning (Table 4), axis from '+lo})+'<p class="small mute" style="margin:2px 0 0">d: dropout everywhere; ed: dropout inside the experts. Single runs. Highlighted: the setting the paper adopts, best on GLUE, tied on CNNDM, 0.2 behind on SQuAD and SuperGLUE.</p>';
    el.querySelectorAll('#t4seg button').forEach(b=>b.onclick=()=>{j=+b.dataset.i;el.__lw=-1;go()})})}go()})();

// Table 1: quality per step against examples per second
(function(){const el=$('t1plot');fit(el,W=>{const H=W<560?260:280;const fr=frame({W,H,x:[420,1080],y:[-1.58,-1.526],xt:[[500,'500'],[700,'700'],[900,'900']],yt:[[-1.58,'-1.58'],[-1.57,'-1.57'],[-1.56,'-1.56'],[-1.55,'-1.55'],[-1.54,'-1.54'],[-1.53,'-1.53']],xl:'examples per second (faster to the right)',yl:'Neg. Log Perp. at 100k steps',pl:56});let s=fr.s;
  const R=TB.T1.rows,P=r=>[fr.sx(+r[4]),fr.sy(+r[2])];
  [['1.0',6,7],['1.25',4,5],['2.0',2,3]].forEach(([cf,a,b])=>{const pa=P(R[a]),pb=P(R[b]);s+=ln2(pa[0],pa[1],pb[0],pb[1],'var(--mute)',{da:'3 3'})});
  const pts=[];R.forEach((r,i)=>{if(i===0)return;const [x,y]=P(r),c=/Switch/.test(r[0])?'var(--c1)':/MoE/.test(r[0])?'var(--c2)':'var(--c4)';s+=dot(x,y,5,c);pts.push({x,y,t:r[0].replace('-Base','')+(r[1]?' '+r[1]:'')+', '+r[3]+'h',fs:11})});
  placeLabels(pts,W,H-30).forEach(p=>{s+=tx(p.lx,p.ly,escH(p.t),{fs:11,a:p.la})});
  el.innerHTML=svgW(W,H,s,'Table 1 as a chart')+'<p class="small mute" style="margin:2px 0 0">Each point is one model from Table 1; its label gives the capacity factor and the hours to reach −1.50. Dashed lines join Switch and MoE at the same capacity factor. Blue Switch, orange top-2 MoE, purple T5-Large. T5-Base is off the chart (1,600 examples a second, −1.731, never reaches −1.50).</p>'})})();

// Table 5: Switch minus its FLOP-matched T5
(function(){const el=$('t5bars');let sz='base';
  function go(){fit(el,W=>{const D=RC.t5_diff[sz],it=Object.keys(D).map(k=>({n:k,v:D[k],c:D[k]<0?'var(--bad)':'var(--c1)'}));
    el.innerHTML='<div class="seg" id="t5seg" style="margin-bottom:4px"><button data-m="base" class="'+(sz==='base'?'on':'')+'">Switch-Base minus T5-Base</button><button data-m="large" class="'+(sz==='large'?'on':'')+'">Switch-Large minus T5-Large</button></div>'+hbars(W,it,{dom:[-4,8],fmt:v=>(v>0?'+':'')+v.toFixed(1),title:'Points gained at equal FLOPs (Table 5)'})+'<p class="small mute" style="margin:2px 0 0">GLUE and SuperGLUE are subtask averages, XSum Rouge-2, SQuAD and closed-book QA exact match, the rest accuracy. Single fine-tuning runs, best validation checkpoint.</p>';
    el.querySelectorAll('#t5seg button').forEach(b=>b.onclick=()=>{sz=b.dataset.m;el.__lw=-1;go()})})}go()})();

// Predict: Switch-C against Switch-XXL
PRED_REVEAL['pr-c']=function(){const el=$('prCbars');fit(el,W=>{const it=[{n:'Switch-XXL, SQuAD',v:89.6,c:'var(--c1)',hl:1},{n:'Switch-C, SQuAD',v:87.7,c:'var(--c2)'}];
  el.innerHTML=hbars(W,it,{dom:[85,91],fmt:f1,title:'SQuAD exact match after fine-tuning (§8), axis from 85'})+'<p class="small mute" style="margin:2px 0 0">FLOPs per sequence, Table 9: Switch-XXL 6.3T, Switch-C 890B ('+RC.ratios.xxl_over_c_flops_printed.toFixed(1)+'x). Parameters: 395B against 1,571B ('+RC.ratios.c_over_xxl_params_printed.toFixed(1)+'x).</p>'})};

// Figure 9 redrawn: how weights and tokens split over 16 cores
(function(){const B=2**20,d=768,ff=3072,cap=1.0;
  const S={d:{n:16,m:1,E:1,c:'Data parallelism (§5.1): every core holds the whole FFN and 1/16 of the batch. "No communication is needed until the entire forward and backward pass is finished", then the gradients are all-reduced.'},
    m:{n:1,m:16,E:1,c:'Model parallelism (§5.2): every core holds all B tokens and 1/16 of d<sub>ff</sub>. The second matrix multiplication sums over the split d<sub>ff</sub>, so each core all-reduces a [B, d<sub>model</sub>] tensor in the forward pass and again in the backward pass.'},
    md:{n:4,m:4,E:1,c:'Model and data parallelism (§5.3), as in the largest T5 models and GPT-3: each core holds B/n tokens and d<sub>ff</sub>/m of the weights, and all-reduces [B/n, d<sub>model</sub>] in each pass.'},
    ed:{n:16,m:1,E:16,c:'Expert and data parallelism (§5.4), Switch-Base and Switch-C: n = 16 data shards and 16 experts, one per core. Each core routes its own B/n tokens, then an all-to-all of [E, C, d<sub>model</sub>] sends them to their experts, and another brings the outputs back. Weights grow with the cores; per-core memory and FLOPs do not.'},
    emd:{n:4,m:4,E:4,c:'Expert, model and data parallelism (§5.5), Switch-XXL: 4 experts, each split 4 ways over d<sub>ff</sub>. Larger d<sub>ff</sub> means more FLOPs per token, but m is taken from n, so the batch per step shrinks for the same tokens per core, and the all-to-all is joined by all-reduces. "The best mapping is empirically determined."'}};
  let mode='d';
  function draw(W){const st=S[mode],cell=Math.min(22,(W-40)/2/4-4),gw=4*(cell+4),gx=[Math.max(8,(W/2-gw)/2),W/2+Math.max(8,(W/2-gw)/2)],top=20,H=top+gw+30;let s='';
    s+=tx(gx[0],14,'weights',{fs:12,w:600})+tx(gx[1],14,'tokens',{fs:12,w:600});
    const pal=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
    for(let i=0;i<16;i++){const r=Math.floor(i/4),c=i%4,x0=gx[0]+c*(cell+4),x1=gx[1]+c*(cell+4),y=top+r*(cell+4);
      // logical mesh: data index = row-major i / m, model index = i % m
      const mi=i%st.m,ni=Math.floor(i/st.m),wid=st.E>1?(st.m>1?(ni%st.E)*st.m+mi:ni):mi,dataId=ni;
      const wc=st.m===1&&st.E===1?pal[0]:pal[wid%6],op=st.m===1&&st.E===1?.55:.35+.65*((wid%16)/15);
      s+=rc(x0,y,cell,cell,wc,{r:3,op})+rc(x1,y,cell,cell,st.n===1?pal[1]:pal[dataId%6],{r:3,op:st.n===1?.55:.35+.65*((dataId%16)/15)});
      if(cell>=18){s+=tx(x0+cell/2,y+cell/2+4,st.E>1?'E'+(Math.floor(wid/st.m)+1):(st.m>1?(mi+1):'W'),{fs:11,a:'middle'})}}
    s+=tx(gx[0],H-8,st.m>1?(st.E>1?st.E+' experts × '+st.m+' slices':st.m+' slices of d_ff'):st.E>1?st.E+' experts, one per core':'one copy per core',{fs:11,c:'var(--mute)'});
    s+=tx(gx[1],H-8,st.n>1?st.n+' slices of the batch':'every core: the whole batch',{fs:11,c:'var(--mute)'});
    $('parSvg').innerHTML=svgW(W,H,s,'Figure 9 redrawn');
    const tok=B/st.n,perCoreW=2*d*ff/st.m,total=2*d*ff*st.E;
    let comm=0,what='none in the forward pass';if(mode==='m'||mode==='md'){comm=tok*d*2;what='all-reduce of [B/n, d<sub>model</sub>]'}
    if(mode==='ed'){comm=2*tok*cap*d*2;what='two all-to-alls of [E, C, d<sub>model</sub>]'}
    if(mode==='emd'){comm=2*tok*cap*d*2+tok*d*2;what='two all-to-alls plus an all-reduce'}
    $('parCnt').innerHTML=stat('tokens per core',fmt(tok),'B / n, n = '+st.n)+stat('FFN weights per core',(perCoreW/1e6).toFixed(2)+'M',(total/1e6).toFixed(1)+'M distinct over all cores')+stat('sent per core, forward',comm?fmtBytes(comm):'0 B',what)+stat('FFN FLOPs per token',fmt(4*d*ff/1e6,2)+'M','2 per weight; one expert per token');
    $('parCap').innerHTML=st.c}
  segBind('parM',m=>{mode=m;refit($('parSvg'))});fit($('parSvg'),draw)})();
