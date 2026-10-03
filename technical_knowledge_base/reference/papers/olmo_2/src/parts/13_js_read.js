// ---- The paper tab: small tables, block diagram, stability grid, mid-training and post-training charts ----
(function(){
const tex2=s=>tex(String(s).replace(/\\theta/g,'θ')).replace(/(^|\s)10\^\{(-?\d+)\}/g,(m,a,e)=>a+'10<sup>'+e.replace('-','−')+'</sup>');
// Table 1
setH('t1mini',TB.t1.rows.map(r=>'<tr><td>'+tex2(r.c[0])+'</td>'+r.c.slice(1).map((v,i)=>'<td'+(i===2?' style="font-weight:600"':'')+'>'+tex2(v)+'</td>').join('')+'</tr>').join(''));
// Table 3 with recount
(function(){const M=['OLMo-2-1124-7B','OLMo-2-1124-13B','OLMo-2-0325-32B'],P=RC.params,K=RC.tokens;
  let s=TB.t3.rows.map(r=>'<tr><td>'+tex2(r.c[0])+'</td>'+r.c.slice(1).map(v=>'<td class="num">'+tex2(v)+'</td>').join('')+'</tr>').join('');
  s+='<tr><td><i>Parameters, recounted</i></td>'+M.map(m=>'<td class="num"><b>'+(P[m].params/1e9).toFixed(2)+'B</b></td>').join('')+'</tr>';
  s+='<tr><td><i>Stage-1 tokens (checkpoints)</i></td>'+M.map(m=>'<td class="num">'+K[m].stage1_T.toFixed(2)+'T</td>').join('')+'</tr>';
  setH('t3mini',s)})();

// Block diagram: OLMo-0424 pre-norm against OLMo 2 reordered norm + QK-norm
(function(){let mode='new';
  function draw(w){const H=290,cx=Math.min(90,w*.2),bw=Math.min(230,w-cx-50),bx=cx+40,mx=bx+bw/2;let s='',bg='';
    const blk=(y0,name,attn)=>{let t='',y=y0-10;const boxes=mode==='old'?[['LayerNorm (no parameters)',22,1],[name,44,0]]:[[name,44,0],['RMSNorm on the output',22,1]];
      const tops=[];boxes.forEach(b=>{tops.push([y-b[1],b]);y-=b[1]+8});const ya=y-4;
      t+=ln2(cx,y0,mx,y0,'var(--mute)',{sw:1.4})+ln2(mx,y0,mx,ya,'var(--mute)',{sw:1.4})+ln2(mx,ya,cx+9,ya,'var(--mute)',{sw:1.4});
      tops.forEach(([top,b])=>{t+=rc(bx,top,bw,b[1],b[2]?'var(--acc2)':'var(--soft)',{s:b[2]?'var(--acc)':'var(--mute)'})+tx(mx,top+(b[2]?15:19),b[0],{a:'middle',fs:b[2]?11:12,w:b[2]?null:600});
        if(!b[2]&&attn)t+=tx(mx,top+35,mode==='new'?'RMSNorm on Q and K inside':'Q, K, V clipped to ±8 inside',{a:'middle',fs:11,c:mode==='new'?'var(--acc)':'var(--mute)'})});
      t+='<circle cx="'+cx+'" cy="'+ya+'" r="9" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.5"/>'+tx(cx,ya+5,'+',{a:'middle',fs:14,w:700});
      return {t,ya}};
    const A=blk(H-24,'Attention',true),B=blk(A.ya-26,'MLP (SwiGLU)',false),top=B.ya-14;
    s+=ln2(cx,H-8,cx,top,'var(--ink)',{sw:4})+A.t+B.t+tx(cx-12,H-10,'x',{a:'end',fs:13})+tx(cx-12,A.ya+5,'h',{a:'end',fs:13})+tx(cx-12,top+10,'h_out',{a:'end',fs:12});
    $('normSvg').innerHTML=svgW(w,H,s,'Transformer block diagram');
    setH('normOut',mode==='old'?'<span class="m"><i>h</i> = <i>x</i> + Attention(LN(<i>x</i>))</span>, <span class="m"><i>h</i><sub>out</sub> = <i>h</i> + MLP(LN(<i>h</i>))</span>: each sub-layer reads a normalised input; what it adds to the stream is not normalised, so its size is free to grow.':'<span class="m"><i>h</i> = <i>x</i> + RMSNorm(Attention(<i>x</i>))</span>, <span class="m"><i>h</i><sub>out</sub> = <i>h</i> + RMSNorm(MLP(<i>h</i>))</span>: each sub-layer reads the raw stream, and what it adds is normalised; QK-norm bounds the attention logits inside.')}
  segBind('normM',m=>{mode=m;refit($('normSvg'))});fit($('normSvg'),draw)})();

// Stability grid: the ablation pairs side by side, with recounted spike scores
(function(){const items=[['fig3','gnorm','Repeated n-gram filter','§3.1, Figure 3',null],['fig4','gnorm','Initialisation','§3.2, Figure 4',[0.40,0.03]],['fig7','gnorm','Reordered norm + QK-norm','§3.3.2, Figure 7',[0.108,0.069]],
  ['fig9','gnorm','AdamW ε 10⁻⁵ → 10⁻⁸','§3.4.1, Figure 9',null],['fig10','gnorm','No weight decay on embeddings','§3.4.2, Figure 10',[0.16,0.092]],['fig2','gnorm','All together: OLMo-0424 7B → OLMo 2 7B','Figure 2',null]];
  const host=$('stabGrid');host.innerHTML=items.map((it,i)=>'<div class="sg" data-i="'+i+'" role="button" tabindex="0" aria-label="Replay '+it[2]+'"><div class="sgt">'+it[2]+' <span class="small mute">'+it[3]+'</span></div><div class="sgs" id="sg'+i+'"></div><div class="small" id="sgo'+i+'"></div></div>').join('');
  items.forEach((it,i)=>{const P=CV[it[0]].panels.find(p=>p.key===it[1]),R=P.runs;
    fit($('sg'+i),w=>{const half=(w-8)/2,H=86;let s='';R.forEach((r,j)=>{const x=j*(half+8);s+=rc(x,0,half,H,'none',{s:'var(--line)',r:0})+envSvg(P,r,x,2,half,H-4,{op:.7})+tx(x+4,13,j?'OLMo 2':'OLMo-0424',{fs:11,c:'var(--mute)'})});$('sg'+i).innerHTML=svgW(w,H,s,it[2])});
    setH('sgo'+i,'Spikes: <b>'+pct(R[0].score.pct)+' → '+pct(R[1].score.pct)+'</b>'+(it[4]?' <span class="mute">(paper '+it[4][0]+' → '+it[4][1]+')</span>':''))});
  host.querySelectorAll('.sg').forEach(el=>{const go=()=>{const b=document.querySelector('#swM button[data-m='+items[+el.dataset.i][0]+']');document.querySelector('#tabs button[data-t=t-run]').click();if(b)b.click();$('sw').scrollIntoView({block:'start'})};el.addEventListener('click',go);el.addEventListener('keydown',e=>{if(e.key==='Enter')go()})})})();

// Predict: QK-norm reveal, Figure 7 overlaid
PRED_REVEAL['pr-qk']=function(){const P=CV.fig7.panels[0];
  fit($('qkSvg'),w=>{const H=220,pl=40,pb=24,W=w-pl-8;let s=axesSvg(P,pl,6,W,H-pb-6);P.runs.forEach(r=>{s+=envSvg(P,r,pl,6,W,H-pb-6,{op:.45})});
    const lg=legend([[P.runs[0].name,RUNC[0]],[P.runs[1].name,RUNC[1]]],pl+6,22,W-12);s+=lg.s;$('qkSvg').innerHTML=svgW(w,H,s,'Figure 7 re-drawn')});
  setH('qkOut','Spike score recounted on the drawn curves: <b>'+pct(P.runs[0].score.pct,3)+'</b> before, <b>'+pct(P.runs[1].score.pct,3)+'</b> after ('+P.runs[0].score.spikes+' and '+P.runs[1].score.spikes+' spikes in about '+fmt(P.runs[0].score.evaluated)+' values each). The paper: 0.108 and 0.069. The direction reproduces; the size of the after-value does not, since the drawn curve of the combined run has fewer 7σ outliers than the paper\'s number implies. On growth, the drawn curves say less than the text: the combined run\'s median gradient norm is lower throughout but rises from '+CV.fig7_medians['reordered norm + QK-norm'][2]+' (steps 40k to 60k) to '+CV.fig7_medians['reordered norm + QK-norm'][7]+' (140k to 160k), while the pre-norm run\'s stays near '+CV.fig7_medians['pre-attention norm'][7]+'. Raschka makes the related point that, shown only together, the two changes cannot be separated.')};

// Figure 5: growth exponents
(function(){const L=CV.fig5,W2=[128,256,512,1024,2048,4096];
  fit($('f5Svg'),w=>{const lg0=legend([['OLMo-0424',RUNC[0]],['OLMo 2',RUNC[1]],['activations (solid)','var(--mute)'],['gradients (dashed)','var(--mute)','5 3']],46,14,w-58),pt=lg0.h+8,H=220+pt,pl=46,pr=12,pb=32,lx=v=>pl+(w-pl-pr)*(Math.log2(v)-7)/5,ly=v=>pt+(H-pt-pb)*(1-(v+0.12)/0.26);let s='';
    [-0.1,-0.05,0,0.05,0.1].forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),v===0?'var(--mute)':'var(--line)',{sw:v===0?1:.6,da:v===0?'3 3':null})+tx(pl-4,ly(v)+4,(v>0?'+':'')+v.toFixed(2),{fs:11,a:'end',c:'var(--mute)'})});
    W2.forEach(v=>{s+=tx(lx(v),H-pb+15,v>=1000?fmt(v):v,{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+w-pr)/2,H-3,'width (d_model)',{fs:11,a:'middle',c:'var(--mute)'});
    L.forEach(p=>{const old=p.color[2]===1,grad=p.dashes&&p.dashes.indexOf('[ ]')<0&&p.dashes!=='[] 0',col=old?RUNC[0]:RUNC[1];
      const pts=p.pts.map(q=>[W2.reduce((a,b)=>Math.abs(b-q[0])<Math.abs(a-q[0])?b:a),q[1]]).sort((a,b)=>a[0]-b[0]);
      s+='<path d="'+pts.map((q,i)=>(i?'L':'M')+lx(q[0]).toFixed(1)+','+ly(q[1]).toFixed(1)).join(' ')+'" fill="none" stroke="'+col+'" stroke-width="2"'+(grad?' stroke-dasharray="5 3"':'')+'/>';
      pts.forEach(q=>{s+='<circle cx="'+lx(q[0]).toFixed(1)+'" cy="'+ly(q[1]).toFixed(1)+'" r="2.5" fill="'+col+'"><title>'+(old?'OLMo-0424':'OLMo 2')+(grad?' gradient':' activation')+' exponent at '+q[0]+': '+q[1].toFixed(3)+'</title></circle>'})});
    s+=lg0.s;
    $('f5Svg').innerHTML=svgW(w,H,s,'Growth exponents against width')})})();

// Figure 11: learning rates and anneals
(function(){const LR=CV.lr,col={'12e-4':'var(--c2)','9e-4':'var(--c3)','6e-4':'var(--c5)','3e-4':'var(--c1)'},nm={'12e-4':'12 × 10⁻⁴','9e-4':'9 × 10⁻⁴','6e-4':'6 × 10⁻⁴','3e-4':'3 × 10⁻⁴'};let mode='50';
  setH('lrCross',LR.cross['3e-4 below 6e-4'].toFixed(0));
  function draw(w){const H=250,pl=44,pr=74,pt=8,pb=30;let x0,x1,y0,y1,series=[];
    if(mode==='pre'){x0=0;x1=310;y0=2.40;y1=2.72;Object.keys(nm).forEach(k=>series.push([k,LR.runs[k]]))}
    else{x0=270;x1=mode==='50'?355:405;y0=2.29;y1=2.50;Object.keys(nm).forEach(k=>{const a=LR.anneal[k+' before'],b=LR.anneal[k+' '+mode+'B'];if(b)series.push([k,a.concat(b)])})}
    const lx=v=>pl+(w-pl-pr)*(v-x0)/(x1-x0),ly=v=>pt+(H-pt-pb)*(1-(v-y0)/(y1-y0));let s='';
    for(let v=Math.ceil(y0*20)/20;v<=y1+1e-9;v+=0.05)s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)',{sw:.6})+tx(pl-4,ly(v)+4,v.toFixed(2),{fs:11,a:'end',c:'var(--mute)'});
    const st=mode==='pre'?50:20;for(let v=Math.ceil(x0/st)*st;v<=x1;v+=st)s+=tx(lx(v),H-pb+15,v+'B',{fs:11,a:'middle',c:'var(--mute)'});
    if(mode!=='pre')s+=ln2(lx(302),pt,lx(302),H-pb,'var(--mute)',{da:'4 3'})+tx(lx(302)+4,pt+12,'anneal starts',{fs:11,c:'var(--mute)'});
    const ends=[];series.forEach(([k,pts])=>{const p=pts.filter(q=>q[0]>=x0&&q[0]<=x1&&q[1]>=y0-0.02&&q[1]<=y1+0.02);
      s+='<path d="'+p.map((q,i)=>(i?'L':'M')+lx(q[0]).toFixed(1)+','+ly(Math.min(y1,Math.max(y0,q[1]))).toFixed(1)).join(' ')+'" fill="none" stroke="'+col[k]+'" stroke-width="1.6"/>';
      const e=p[p.length-1];ends.push({y:ly(e[1]),c:col[k],n:nm[k],how:'last bin '+e[1].toFixed(3)})});
    s+=endLabels(ends,w-pr+4,13);s+=tx(12,(pt+H-pb)/2,'loss',{fs:11,a:'middle',c:'var(--mute)'}).replace('<text','<text transform="rotate(-90 12 '+((pt+H-pb)/2)+')"');
    $('lrSvg').innerHTML=svgW(w,H,s,'Figure 11 re-drawn')}
  function out(){if(mode==='pre'){setH('lrOut','Higher peaks lead early; from about '+LR.cross['3e-4 below 12e-4'].toFixed(0)+'B tokens 3 × 10⁻⁴ is below 12 × 10⁻⁴, and from '+LR.cross['3e-4 below 6e-4'].toFixed(0)+'B below 6 × 10⁻⁴: at 300B the order has fully reversed.');return}
    const E=LR.ends,ks=Object.keys(nm).filter(k=>E[k+' '+mode+'B']!=null),v=ks.map(k=>E[k+' '+mode+'B']),mn=Math.min(...v),mx=Math.max(...v);
    setH('lrOut','Loss over the last 2B tokens of each '+mode+'B anneal: '+ks.map(k=>nm[k]+' <b>'+E[k+' '+mode+'B'].toFixed(3)+'</b>').join(', ')+'. Spread <b>'+(mx-mn).toFixed(3)+'</b>'+(mode==='50'?', and the lowest peak is the one that lags ("the lowest setting lags behind the others by a small amount").':'; the 3 × 10⁻⁴ run was not annealed over 100B.'))}
  segBind('lrM',m=>{mode=m;refit($('lrSvg'));out()});
  PRED_REVEAL['pr-lr']=()=>{fit($('lrSvg'),draw);out()}})();

// Data mixes
(function(){const C=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--mute)','var(--dim)'];
  const t4=TB.t4.rows.filter(r=>r.c[0]!=='Total'),tot=3900.1,v=s=>parseFloat(s)*(s.endsWith('T')?1000:s.endsWith('M')?0.001:1);
  let h=stackBar('Pretraining: OLMo 2 Mix 1124, 3.90T tokens (Table 4)',t4.map((r,i)=>[r.c[0].replace(/ (filtered|from).*$/,''),100*v(r.c[2])/tot,C[i]]));
  ['50B','100B','300B'].forEach((m,mi)=>{h+=stackBar('Mid-training: Dolmino '+m+' mix (Table 13, Mix %)',TB.t13.rows.map((r,i)=>[r.c[0],num(r.c[3+2*mi]),C[i]]),mi===2?'Mix % as printed; the 100B and 300B columns do not follow from their Source % column, see the tables tab.':null)});
  setH('mixBars',h)})();

// Microanneals
PRED_REVEAL['pr-micro']=function(){const R=RC.t12;
  fit($('microSvg'),w=>{const rows=R.filter(r=>r.mix!=='Baseline'),lh=24,pl=Math.min(150,w*.38),H=rows.length*lh+60,pr=10,lx=v=>pl+(w-pl-pr)*v/80;let s='',y=8,last='';
    [0,20,40,60,80].forEach(v=>{s+=ln2(lx(v),4,lx(v),H-26,'var(--line)',{sw:.6})+tx(lx(v),H-12,v,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=ln2(lx(28.5),4,lx(28.5),H-26,'var(--bad)',{da:'4 3'})+tx(lx(28.5)-4,H-32,'pretrained 28.5',{fs:11,a:'end',c:'var(--bad)'});
    rows.forEach(r=>{if(r.exp!==last){y+=last?10:0;last=r.exp}const c=r.exp.endsWith('1')?'var(--c1)':r.exp.endsWith('2')?'var(--c3)':'var(--c4)';
      s+=tx(pl-6,y+15,r.mix,{fs:11,a:'end'})+rc(lx(0),y+4,lx(r.gsm)-lx(0),14,c,{op:.8})+ln2(lx(r.gsm-r.se),y+11,lx(r.gsm+r.se),y+11,'var(--ink)',{sw:1.4})+tx(lx(r.gsm+r.se)+4,y+15,r.gsm.toFixed(1),{fs:11});y+=lh});
    s+=tx((pl+w)/2,H,'GSM* (200 questions), ± one standard error',{fs:11,a:'middle',c:'var(--mute)'});
    $('microSvg').innerHTML=svgW(w,H+4,s,'Table 12 microanneals')});
  const d=RC.gsm_diff_se;setH('microOut','Colours: experiment 1 (share of maths), 2 (copies), 3 (TinyGSM format). Differences against their standard errors: 35/65 minus 10/90 '+d['35/65 minus 10/90'][0].toFixed(1)+' ± '+d['35/65 minus 10/90'][1]+'; two copies minus one '+d['2x minus 1x'][0].toFixed(1)+' ± '+d['2x minus 1x'][1]+'; two MIND copies minus one '+d['2x MIND minus MIND'][0].toFixed(1)+' ± '+d['2x MIND minus MIND'][1]+'; MIND minus the pretrained baseline <b>'+d['MIND minus baseline'][0].toFixed(1)+' ± '+d['MIND minus baseline'][1]+'</b>. MMLU moved by at most 2.3 points in any microanneal.')};

// Soups (Table 14)
(function(){const R=RC.t14,M=['OLMES','OLMES-Gen','MMLU','GSM*'];
  fit($('soupSvg'),w=>{const cols=w<480?2:4,cw=(w-8)/cols,rh=18,ph=R.length*rh+34;let s='';
    M.forEach((m,mi)=>{const ox=(mi%cols)*cw,oy=Math.floor(mi/cols)*(ph+8),lo=mi===3?-27:-1,hi=mi===3?6:3,lx=v=>ox+40+(cw-52)*(v-lo)/(hi-lo);
      s+=tx(ox+40,oy+12,m,{fs:12,w:600})+ln2(lx(0),oy+18,lx(0),oy+ph-8,'var(--mute)');
      R.forEach((r,i)=>{const v=r.delta[mi],y=oy+22+i*rh;s+=tx(ox+30,y+11,r.mix,{fs:11,a:'end',c:'var(--mute)'})+rc(Math.min(lx(0),lx(v)),y+2,Math.max(1,Math.abs(lx(v)-lx(0))),12,v<0?'var(--bad)':'var(--good)',{r:2});
        if(mi===3)s+=ln2(lx(v-4.5),y+8,lx(v+4.5),y+8,'var(--ink)',{sw:1,op:.6});s+=tx(v<0?lx(v)-3:lx(v)+3,y+12,sgn(v),{fs:11,a:v<0?'end':'start'})})});
    const rowsN=Math.ceil(M.length/cols);$('soupSvg').innerHTML=svgW(w,rowsN*(ph+8),s,'Soup minus best single')});
  const neg=RC.t14_negative;setH('soupOut','The soup equals or beats the best single run in 23 of 24 cells, by up to 4.0 points. The exception: mix '+neg.map(n=>n[0]+'\'s '+n[1]+' ('+sgn(n[2])+')').join(', ')+'. The paper\'s sentence "consistently equals or outperform" does not mention it.')})();

// Table 9: before and after mid-training, per task
(function(){let mi=1;const H9=TB.t9.head,rows=TB.t9.rows;
  function draw(w){const pre=rows[2*mi].c,mid=rows[2*mi+1].c,lab=H9.slice(1),n=lab.length,lh=22,pl=78,pr=40,H=n*lh+30,lx=v=>pl+(w-pl-pr)*v/100;let s='';
    [0,25,50,75,100].forEach(v=>{s+=ln2(lx(v),4,lx(v),H-22,'var(--line)',{sw:.6})+tx(lx(v),H-8,v,{fs:11,a:'middle',c:'var(--mute)'})});
    lab.forEach((l,i)=>{const a=num(pre[i+1]),b=num(mid[i+1]),y=8+i*lh+8,ho=i>=7;s+=tx(pl-6,y+4,l==='Avg'?'Average':l,{fs:11,a:'end',w:l==='Avg'?700:null,c:ho?'var(--acc)':null});
      s+=ln2(lx(a),y,lx(b),y,b>=a?'var(--good)':'var(--bad)',{sw:3})+'<circle cx="'+lx(a)+'" cy="'+y+'" r="4" fill="var(--mute)"/><circle cx="'+lx(b)+'" cy="'+y+'" r="4" fill="var(--acc)"/>'+tx(Math.max(lx(a),lx(b))+7,y+4,sgn(b-a),{fs:11})});
    $('t9Svg').innerHTML=svgW(w,H,s,'Table 9')}
  function out(){const g=Object.values(RC.t9_gains)[mi];setH('t9Out','<b>'+rows[2*mi].g+'</b>: average '+g.pre.toFixed(1)+' → '+g.mid.toFixed(1)+' (<b>'+sgn(g.gain)+'</b>, '+sgn(g.rel_pct)+'%). Grey: after pretraining; blue: after mid-training. Held-out tasks in blue type. Stage-1 checkpoints were at 4T (1B), 3.9T (7B), 5T (13B) and 6.06T (32B) tokens.')}
  segBind('t9M',m=>{mi=+m;refit($('t9Svg'));out()});fit($('t9Svg'),draw);out()})();

// Post-training stages (Table 16)
(function(){const T=TB.t16,hd=T.head;
  function draw(w){const k=+$('postSel').value,S=['1B','7B','13B','32B'],st=['SFT','DPO','Instruct'],cl=['var(--c5)','var(--c4)','var(--c1)'],gw=(w-40)/4,H=210,pt=14,pb=40,mx=k===9?100:Math.max(...S.flatMap(m=>st.map(x=>num(T.rows.find(r=>r.c[0]==='OLMo 2 '+m+' '+x).c[k]))))*1.15,ly=v=>pt+(H-pt-pb)*(1-v/mx);let s='';
    [0,.25,.5,.75,1].forEach(f=>{const v=mx*f;s+=ln2(36,ly(v),w,ly(v),'var(--line)',{sw:.6})+tx(32,ly(v)+4,v.toFixed(0),{fs:11,a:'end',c:'var(--mute)'})});
    S.forEach((m,i)=>{const ox=40+i*gw,bw=Math.min(34,(gw-16)/3);st.forEach((x,j)=>{const v=num(T.rows.find(r=>r.c[0]==='OLMo 2 '+m+' '+x).c[k]),xx=ox+6+j*(bw+3);
      s+=rc(xx,ly(v),bw,ly(0)-ly(v),cl[j],{r:2}).replace('/>','><title>'+m+' '+x+': '+v.toFixed(1)+'</title></rect>')+(bw>=28?tx(xx+bw/2,ly(v)-3,v.toFixed(1),{fs:11,a:'middle'}):(j===2?tx(xx+bw/2,ly(v)-3,v.toFixed(1),{fs:11,a:'middle'}):''))});s+=tx(ox+gw/2-4,H-pb+16,'OLMo 2 '+m,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=legend([['SFT',cl[0]],['DPO',cl[1]],['RLVR (final)',cl[2]]],40,H-6,w-40).s;
    $('postSvg').innerHTML=svgW(w,H,s,'Table 16 stages')}
  function out(){const k=+$('postSel').value,P=RC.post_stages;if(k===1)setH('postOut','DPO adds '+['1B','7B','13B','32B'].map(m=>sgn(P[m].dpo_gain)).join(', ')+' points on average (1B, 7B, 13B, 32B); RLVR then adds '+['1B','7B','13B','32B'].map(m=>sgn(P[m].rlvr_gain)).join(', ')+'.');
    else setH('postOut',hd[k]+' after each stage. '+(k===9?'Safety falls at every stage after SFT, most for the 32B in its RLVR stage (91.9 to 85.9).':k===5||k===7?'RLVR targets exactly these: its gains concentrate here.':''))}
  $('postSel').addEventListener('change',()=>{refit($('postSvg'));out()});fit($('postSvg'),draw);out()})();

// Environment
(function(){const r=RC.t19.filter(x=>x.model.startsWith('OLMo 2')),e=RC.env_text;
  setH('envOut','Recomputed from Table 19\'s columns: carbon '+r.map(x=>x.model.replace('OLMo 2 ','')+' '+x.co2_recomputed+' t (printed '+x.co2_printed+')').join(', ')+'; water '+r.map(x=>x.model.replace('OLMo 2 ','')+' '+fmt(x.water_recomputed_kL)+' kL (printed '+x.water_printed_kL+')').join(', ')+'. Totals in the text: about '+e.mwh_text+' MWh (the column sums to '+e.mwh_sum_column+', or '+e.mwh_with_pue+' with PUE), '+e.co2_text_t+' tCO<sub>2</sub>eq (the rows sum to '+e.co2_sum+') and 1.1 million litres ('+fmt(e.water_sum_kL)+' kL).')})();

// Figure 1 / Table 6 frontier
(function(){let mode='t6';const T=TB.t6.rows,F=RC.fig1;
  const grp=g=>/Fully/.test(g)?'full':/partially/.test(g)?'part':'ow',gc={full:'var(--good)',part:'var(--c5)',ow:'var(--mute)'};
  function pts(){const out=[];T.forEach(r=>{let f=num(r.c[2]);if(mode==='fig'){const m=F.find(q=>q.model===r.c[0]);if(!m)return;f=m.fig_flops/1e23}if(f==null)return;
    out.push({n:r.c[0],f:f*1e23,a:num(r.c[1]),g:grp(r.g),o:/^OLMo 2/.test(r.c[0])})});return out}
  function draw(w){const P=pts(),H=Math.min(380,Math.max(280,w*.55)),pl=40,pr=10,pt=10,pb=34,lx=v=>pl+(w-pl-pr)*(Math.log10(v)-22.6)/(25.25-22.6),ly=v=>pt+(H-pt-pb)*(1-(v-34)/(78-34));let s='';
    [40,50,60,70].forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)',{sw:.6})+tx(pl-4,ly(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    [23,24].forEach(e=>{s+=ln2(lx(10**e),pt,lx(10**e),H-pb,'var(--line)',{sw:.6})+tx(lx(10**e),H-pb+15,'10<tspan dy="-5" font-size="11">'+e+'</tspan>',{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((pl+w)/2,H-2,'training FLOPs (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
    const fr=P.slice().sort((a,b)=>a.f-b.f);let best=-1,step=[];fr.forEach(p=>{if(p.a>best){best=p.a;step.push(p)}});
    s+='<path d="'+step.map((p,i)=>(i?'L'+lx(p.f).toFixed(1)+','+ly(step[i-1].a).toFixed(1)+' L':'M')+lx(p.f).toFixed(1)+','+ly(p.a).toFixed(1)).join(' ')+'" fill="none" stroke="var(--acc)" stroke-width="1.2" stroke-dasharray="4 3" opacity=".7"/>';
    const KEEP=/^OLMo 2|Qwen 2.5 (32|14|7)B|DCLM|Llama 3.1 8B|Gemma 2 9B/,show=p=>w>=640||KEEP.test(p.n);const lab=placeLabels(P.map(p=>({x:lx(p.f),y:ly(p.a),t:show(p)?p.n:'',fs:11})),w,H);
    P.forEach((p,i)=>{const q=lab[i];s+=(p.o?'<path d="M'+q.x+','+(q.y-6)+' L'+(q.x+5)+','+(q.y+4)+' L'+(q.x-5)+','+(q.y+4)+'z" fill="var(--bad)"/>':'<circle cx="'+q.x.toFixed(1)+'" cy="'+q.y.toFixed(1)+'" r="4" fill="'+gc[p.g]+'"/>')+'<title>'+p.n+': '+p.a+' at '+sci(p.f,2)+' FLOPs</title>';
      if(show(p))s+=tx(q.lx,q.ly,p.n,{fs:11,a:q.la,c:p.o?'var(--bad)':(p.n==='Qwen 2.5 32B'?'var(--ink)':'var(--mute)'),w:p.o||p.n==='Qwen 2.5 32B'?600:null})});
    const lg=legend([['OLMo 2','var(--bad)'],['fully open','var(--good)'],['partially open','var(--c5)'],['open weights','var(--mute)']],pl+4,H+14,w-pl-pr-8);s+=lg.s;
    $('f1Svg').innerHTML=svgW(w,H+lg.h+4,s,'Figure 1 rebuilt')}
  function out(){setH('f1Out',mode==='t6'?'As printed, Qwen 2.5 32B sits at 1.6 × 10<sup>24</sup>, level with Qwen 2.5 14B, which makes OLMo 2 32B look like it nearly matches it at a similar cost. By 6ND it is 3.5 × 10<sup>24</sup>, as Table 7 and Figure 1 have it.':'Figure 1 draws Qwen 2.5 32B at 3.46 × 10<sup>24</sup> (the 6ND value), OLMo 2 32B at 1.15 × 10<sup>24</sup> rather than Table 6\'s 1.3, and OLMo-0424 at 0.87 × 10<sup>23</sup> rather than 1.0. Rows without a marker in the figure are left out. Either way, OLMo 2 sits on the upper-left frontier at all three sizes.')}
  segBind('f1M',m=>{mode=m;refit($('f1Svg'));out()});fit($('f1Svg'),draw);out()})();
})();
