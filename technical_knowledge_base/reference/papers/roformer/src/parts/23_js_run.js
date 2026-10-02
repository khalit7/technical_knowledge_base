// ---- Train short, test long: run the six toy models, per-position accuracy, training curves ----
(function(){
  if(!window.RF||!$('t-run'))return;
  const VN={rope:'RoPE',sin:'Sinusoidal',learned:'Learned absolute',nope:'No position',lin_rope:'Linear + RoPE',lin_nope:'Linear, none'};
  const VC={rope:'var(--c1)',sin:'var(--c2)',learned:'var(--c4)',nope:'var(--mute)',lin_rope:'var(--c3)',lin_nope:'var(--c5)'};
  const VD={nope:'4 3',lin_nope:'4 3'};
  const DATA=RF.data.variants,TR=RF.TRAIN,pc=v=>(100*v).toFixed(1)+'%';
  const blk=(pp,a,b)=>{let s=0,n=0;for(let t=a;t<=b;t++){const i=t-RF.START;if(i>=0&&i<pp.length){s+=pp[i];n++}}return n?s/n:NaN};
  // facts and the data-driven sentences
  $('runFacts').innerHTML=['rope','sin','learned','nope'].map(k=>stat(VN[k],pc(DATA[k].res[32].acc)+' → '+pc(DATA[k].res[128].acc),'held out, length 32 → 128')).join('')+stat('RoPE with a 32-token window',pc(DATA.rope.win.acc),'at length 128');
  const sp=(id,v)=>{const e=$(id);if(e)e.textContent=pc(v)};
  sp('vR1',blk(DATA.rope.res[128].per_pos,32,35));sp('vS1',blk(DATA.sin.res[128].per_pos,32,35));sp('vL1',blk(DATA.learned.res[128].per_pos,32,35));sp('vR2',blk(DATA.rope.res[128].per_pos,36,39));
  $('linOut').innerHTML='<div class="out">'+stat('Linear + RoPE (Eq. 19)',pc(DATA.lin_rope.res[32].acc),'held out at length 32')+stat('Linear, no position',pc(DATA.lin_nope.res[32].acc),'chance is 10%')+stat('Softmax + RoPE',pc(DATA.rope.res[32].acc),'same task, same size')+'</div><p>RoPE in the numerator, unrotated denominator, exactly as @EQ19@: it carries position into linear attention and lifts accuracy well above the position-free version. It does not make linear attention as sharp as softmax: the weights are not normalised (they can be negative) and the denominator grows with the number of keys, so a single offset is hard to isolate. The paper\'s own linear-attention evidence is a loss curve (@FIG3@); on accuracy at this scale, the toy shows the direction and not the size.</p>';
  $('linOut').innerHTML=$('linOut').innerHTML.replace('@EQ19@',A(PAPER.meta.ax+'#S3.E19','Equation 19')).replace('@FIG3@',A(PAPER.meta.ax+'#S4.F3','Figure 3'));
  // ----- run one sequence -----
  let cur='rope',seed=3;const st={digits:[]};
  function newDigits(){const r=mulberry32(seed);st.digits=[...Array(128)].map(()=>Math.floor(r()*10))}
  newDigits();
  function bestHead(M,ids,res){let b=0,bv=-1;for(let h=0;h<RF.h;h++){let v=0;for(let i=RF.START;i<Math.min(ids.length,TR);i++)v+=res.att[h][i][i-RF.L1]+res.att[h][i][i-RF.L2];if(v>bv){bv=v;b=h}}return b}
  let last=null;
  function run(){const L=+$('runL').value;$('runLv').textContent=L;const M=RF.load(cur),ids=st.digits.slice(0,L);
    const isR=cur==='rope'||cur==='lin_rope';$('runP').disabled=!isR;
    const opt={window:$('runW').checked?TR:0,pi:isR&&$('runP').checked?TR/L:1};
    const r=RF.run(M,ids,opt);last={r,ids,L,opt};
    let html='',inA=0,inN=0,outA=0,outN=0;
    ids.forEach((x,t)=>{const y=RF.target(ids,t),p=r.pred[t];let c='na';if(y!=null){c=p===y?'ok':'no';if(t<TR){inN++;if(p===y)inA++}else{outN++;if(p===y)outA++}}
      html+='<span class="'+c+(t>=TR?' far':'')+'" title="position '+t+': digit '+x+', output '+p+(y!=null?', target '+y:'')+'">'+p+'</span>'});
    $('runSeq').innerHTML=html;
    $('runCnt').innerHTML=stat('positions 4 to 31 (trained)',inA+' of '+inN,inN?pc(inA/inN):'')+stat('positions 32 and later',outN?outA+' of '+outN:'none',outN?pc(outA/outN):'raise the length past 32')+stat('setting',(opt.window?'32-token window':'full attention')+(opt.pi!==1?', PI × '+opt.pi.toFixed(2):''),VN[cur]);
    const q=$('runQ');q.max=L-1;if(+q.value>L-1)q.value=L-1;off()}
  function off(){if(!last)return;const el=$('runOff');refit(el)}
  function drawOff(w){if(!last)return;const {r,ids,L}=last,t=+$('runQ').value;$('runQv').textContent=t;
    const hs=+$('runH').value,h=hs<0?bestHead(null,ids,r):hs,a=r.att[h][t];
    const H=184,pl=40,pr=10,pt=26,pb=34,n=t+1,bw=(w-pl-pr)/Math.max(n,8);
    const mx=Math.max(.05,...Array.from(a).slice(0,n).map(Math.abs));
    const X=o=>w-pr-(o+1)*bw,Y=v=>pt+(H-pt-pb)*(1-v/mx);
    let s='';
    if(n>TR)s+=rc(pl,pt,X(TR-1)-pl,H-pt-pb,'var(--hl)',{r:0,op:.6})+tx(pl,pt-8,'shaded: offsets 32 and more, never seen in training',{fs:11,c:'var(--mute)'});
    [0,.5,1].forEach(f=>{const v=mx*f;s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,v.toFixed(2),{fs:11,a:'end',c:'var(--mute)'})});
    for(let o=0;o<n;o++){const v=a[t-o];const x=X(o);s+=rc(x+bw*.1,v>=0?Y(v):Y(0),bw*.8,Math.abs(Y(v)-Y(0)),(o===RF.L1||o===RF.L2)?'var(--c2)':'var(--c1)',{r:1})}
    let lastX=1e9;[0,1,4,8,16,31,63,127].filter(o=>o<n).forEach(o=>{const xx=X(o)+bw/2;if(lastX-xx<22)return;lastX=xx;s+=tx(xx,H-pb+14,o,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((pl+w-pr)/2,H-4,'offset t − j of the key (0 = the query itself, right); orange = offsets 1 and 4',{fs:11,a:'middle',c:'var(--mute)'});
    let fl=0;for(let o=TR;o<n;o++)fl+=Math.max(0,a[t-o]);
    $('runOff').innerHTML=svgW(w,H,s,'Attention weight by offset for one query')+'<p class="small" style="margin:2px 0 0">Head '+(h+1)+', query at position '+t+': weight on offsets 1 and 4 = <b>'+(a[t-1]+(t>=4?a[t-4]:0)).toFixed(3)+'</b>'+(n>TR?', on offsets 32 and more = <b>'+fl.toFixed(3)+'</b>':'')+'; output '+r.pred[t]+(RF.target(ids,t)!=null?', target '+RF.target(ids,t):'')+'.'+(cur.startsWith('lin')?' Linear attention weights are not normalised and can be negative.':'')+'</p>'}
  segBind('runV',m=>{cur=m;$('runV').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));run()});
  $('runL').addEventListener('input',run);$('runW').addEventListener('change',run);$('runP').addEventListener('change',run);
  $('runR').addEventListener('click',()=>{seed++;newDigits();run()});
  $('runQ').addEventListener('input',off);$('runH').addEventListener('change',off);
  // ----- accuracy by position -----
  let accMode='full',live=null;
  function series(k,mode){const v=DATA[k];if(live&&live[mode]&&live[mode][k])return live[mode][k];const src=mode==='win'?v.win:mode==='pi'&&v.pi?v.pi:v.res[128];return src.per_pos}
  function drawAcc(w){const H=Math.min(280,Math.max(210,w*.5)),pl=40,pr=12,pt=12,pb=34;
    const X=t=>pl+(w-pl-pr)*(t-RF.START)/(127-RF.START),Y=v=>pt+(H-pt-pb)*(1-v);
    let s='';[0,.25,.5,.75,1].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,(v*100)+'%',{fs:11,a:'end',c:'var(--mute)'})});
    [4,32,64,96,127].forEach(t=>{s+=tx(X(t),H-pb+14,t,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=ln2(X(TR),pt,X(TR),H-pb,'var(--ink)',{da:'5 4',sw:1})+tx(X(TR)+4,pt+10,'trained length',{fs:11,c:'var(--mute)'});
    s+=ln2(pl,Y(.1),w-pr,Y(.1),'var(--mute)',{da:'2 3',sw:1})+tx(w-pr-2,Y(.1)-4,'chance',{fs:11,a:'end',c:'var(--mute)'});
    s+=tx((pl+w-pr)/2,H-4,'position in the sequence',{fs:11,a:'middle',c:'var(--mute)'});
    Object.keys(VN).forEach(k=>{const pp=series(k,accMode);let d='';for(let t=RF.START;t<128;t+=4){const v=blk(pp,t,t+3);d+=(d?'L':'M')+X(t+1.5).toFixed(1)+' '+Y(v).toFixed(1)}
      s+='<path d="'+d+'" fill="none" stroke="'+VC[k]+'" stroke-width="2"'+(VD[k]?' stroke-dasharray="'+VD[k]+'"':'')+'/>'});
    const lg=legend(Object.keys(VN).map(k=>[VN[k],VC[k],VD[k]]),pl+4,H+14,w-pl-8);
    $('accSvg').innerHTML=svgW(w,H+lg.h+8,s+lg.s,'Accuracy by position for each model');
    const r=k=>pc(blk(series(k,accMode),40,127));
    $('accOut').innerHTML='Mean accuracy at positions 40 to 127'+(live&&live[accMode]?' (this page\'s run, 50 sequences)':' (PyTorch, 500 sequences)')+': '+Object.keys(VN).map(k=>VN[k]+' <b>'+r(k)+'</b>').join(', ')+'.'}
  segBind('accM',m=>{accMode=m;$('accM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('accSvg'))});
  $('accRun').addEventListener('click',()=>{const b=$('accRun');b.disabled=true;b.textContent='Running…';
    setTimeout(()=>{try{live=live||{};const R=mulberry32(99),opt=accMode==='win'?{window:TR}:{};live[accMode]={};
      Object.keys(VN).forEach(k=>{const M=RF.load(k),acc=new Float64Array(128-RF.START);const o=accMode==='pi'&&(k==='rope'||k==='lin_rope')?{pi:TR/128}:opt;
        for(let n=0;n<50;n++){const ids=[...Array(128)].map(()=>Math.floor(R()*10)),r=RF.run(M,ids,o);for(let t=RF.START;t<128;t++)if(r.pred[t]===RF.target(ids,t))acc[t-RF.START]+=1/50}
        live[accMode][k]=Array.from(acc)});refit($('accSvg'))}catch(e){__jsErr(e.message)}b.disabled=false;b.textContent='Run the test here (50 sequences per model)'},30)});
  // ----- training curves -----
  function drawCur(w){const H=200,pl=40,pr=12,pt=12,pb=34,S=6000,X=s=>pl+(w-pl-pr)*s/S,Y=v=>pt+(H-pt-pb)*(1-v);
    let s='';[0,.5,1].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,(v*100)+'%',{fs:11,a:'end',c:'var(--mute)'})});
    [0,2000,4000,6000].forEach(t=>{s+=tx(X(t),H-pb+14,fmt(t),{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((pl+w-pr)/2,H-4,'training step',{fs:11,a:'middle',c:'var(--mute)'});
    Object.keys(VN).forEach(k=>{const lg=DATA[k].log;s+='<path d="'+lg.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[2]).toFixed(1)).join('')+'" fill="none" stroke="'+VC[k]+'" stroke-width="1.8"'+(VD[k]?' stroke-dasharray="'+VD[k]+'"':'')+'/>'});
    const lg=legend(Object.keys(VN).map(k=>[VN[k],VC[k],VD[k]]),pl+4,H+14,w-pl-8);
    $('curSvg').innerHTML=svgW(w,H+lg.h+8,s+lg.s,'Held-out accuracy during training');
    const first=k=>{const r=DATA[k].log.find(p=>p[2]>=0.99);return r?fmt(r[0]):'never'};
    $('curOut').innerHTML='First logged step at 99% held-out accuracy: '+['rope','sin','learned'].map(k=>VN[k]+' <b>'+first(k)+'</b>').join(', ')+'; the other three never reach it.'}
  onTab('t-run',()=>{if(!last)run();fit($('runOff'),drawOff);fit($('accSvg'),drawAcc);fit($('curSvg'),drawCur)});
})();
