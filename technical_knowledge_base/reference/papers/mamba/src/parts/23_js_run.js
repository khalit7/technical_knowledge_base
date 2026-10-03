// ---- Run a toy Mamba: the five trained models, live ----
(function(){
  const V=window.MBW.variants,EX=window.MBW.extrap||{},CF=(PAPER.rc.check_forward)||null;
  const NAME={sc_s6:'Selective Copying, Mamba (S6)',sc_s4:'Selective Copying, Mamba with LTI layer (S4)',ih_s6:'Induction Heads, Mamba (S6)',ih_s4:'Induction Heads, Mamba with LTI layer (S4)',ih_attn:'Induction Heads, Transformer (RoPE)'};
  const COL={sc_s6:'var(--c1)',sc_s4:'var(--c2)',ih_s6:'var(--c1)',ih_s4:'var(--c5)',ih_attn:'var(--c2)'};
  // table of models
  let t='<table><thead><tr><th>Model</th><th>Parameters</th><th>Steps</th><th>Held-out tokens right (float)</th><th>(6-bit, shipped)</th><th>Whole sequences right</th></tr></thead><tbody>';
  Object.keys(NAME).forEach(k=>{const v=V[k],st=v.log.length?v.log[v.log.length-1][0]:0;t+='<tr><td>'+NAME[k]+'</td><td>'+fmt(v.params)+'</td><td>'+fmt(st)+'</td><td>'+pct(v.res_float.tok)+'</td><td>'+pct(v.res_q.tok)+'</td><td>'+pct(v.res_q.seq)+'</td></tr>'});
  $('runTbl').innerHTML=t+'</tbody></table>';

  // ---------- Selective copying editor ----------
  let seq=MB.makeSC(mulberry32(3)).x;
  function drawSeq(W){const L=54,cw=(W-4)/L,big=cw>=11;let s='';for(let i=0;i<L;i++){const v=seq[i],x=2+i*cw;
      s+='<g data-i="'+i+'" style="cursor:'+(i<48?'pointer':'default')+'">'+rc(x+.5,4,cw-1,24,TOKC[v],{r:2})+(v===9?tx(x+cw/2,20,'▸',{fs:11,a:'middle',c:'var(--bg)'}):big&&v?tx(x+cw/2,20,v,{fs:11,a:'middle',c:'var(--bg)'}):'')+'</g>'}
    s+=tx(2,44,'position 1',{fs:11,c:'var(--mute)'})+tx(2+47.5*cw,44,'48',{fs:11,a:'middle',c:'var(--mute)'})+tx(W-2,44,'markers',{fs:11,a:'end',c:'var(--mute)'});
    $('scSeq').innerHTML=svgW(W,50,s,'selective copying input');
    $('scSeq').querySelectorAll('g[data-i]').forEach(g=>g.addEventListener('click',()=>{const i=+g.dataset.i;if(i>=48)return;seq[i]=(seq[i]+1)%9;refit($('scSeq'));runSC()}))}
  function runSC(){const want=[];for(let i=0;i<48;i++)if(seq[i])want.push(seq[i]);
    let h='<div class="grid">';['sc_s6','sc_s4'].forEach(v=>{const M=MB.load(v),o=MB.run(M,seq,{want:true});const pred=[];for(let i=48;i<54;i++)pred.push(MB.argmax(o.logits[i]));
      const ok=pred.filter((p,i)=>p===want[i]).length;
      h+='<div class="card" style="margin:0"><b>'+NAME[v]+'</b><div class="dl" data-v="'+v+'"></div><div class="small">answers: '+pred.map((p,i)=>'<span style="display:inline-block;width:16px;height:16px;border-radius:3px;vertical-align:middle;background:'+TOKC[p]+';outline:2px solid '+(p===want[i]?'var(--good)':'var(--bad)')+';margin:2px 3px"></span>').join('')+' '+(want.length?ok+' of '+Math.min(6,want.length)+' right':'')+(want.length!==6?' <span class="ill">'+want.length+' data tokens: outside the training distribution</span>':'')+'</div></div>';
      runSC['o_'+v]=o});
    $('scOut').innerHTML=h+'</div>';
    document.querySelectorAll('#scOut .dl').forEach(el=>fit(el,W=>{const o=runSC['o_'+el.dataset.v],L=54,cw=(W-4)/L;let s='';
      [0,1].forEach(l=>{let mx=0;o.steps.forEach(st=>mx=Math.max(mx,st[l].mean));const y0=6+l*40;s+=tx(2,y0+8,'Δ, layer '+(l+1)+' (scaled to its maximum)',{fs:11,c:'var(--mute)'});for(let t=0;t<L;t++){const d=o.steps[t][l].mean/mx;s+=rc(2+t*cw+.5,y0+38-d*26,cw-1,d*26,seq[t]&&seq[t]<9?TOKC[seq[t]]:'var(--mute)',{r:1})}});
      el.innerHTML=svgW(W,90,s,'delta strips')}))}
  onTab('t-run',()=>{fit($('scSeq'),drawSeq);runSC()});
  $('scRand').addEventListener('click',()=>{seq=MB.makeSC(mulberry32(1+Math.floor(Math.random()*1e6))).x;refit($('scSeq'));runSC()});
  $('scClear').addEventListener('click',()=>{for(let i=0;i<48;i++)seq[i]=0;refit($('scSeq'));runSC()});
  $('scGo').addEventListener('click',()=>{const b=$('scGo');b.disabled=true;$('scTest').textContent='running...';
    setTimeout(()=>{const r=mulberry32(20261003),res={sc_s6:[0,0],sc_s4:[0,0]},n=500,t0=performance.now();
      for(let i=0;i<n;i++){const s=MB.makeSC(r);['sc_s6','sc_s4'].forEach(v=>{const o=MB.run(MB.load(v),s.x,{at:[48,49,50,51,52,53]});let ok=0;for(let j=0;j<6;j++)if(MB.argmax(o.logits[48+j])===s.y[j])ok++;res[v][0]+=ok;res[v][1]+=ok===6?1:0})}
      $('scTest').innerHTML='On '+n+' sequences drawn in this page (seed 20261003): selective <b>'+pct(res.sc_s6[0]/(6*n))+'</b> of tokens ('+pct(res.sc_s6[1]/n)+' of sequences), time-invariant <b>'+pct(res.sc_s4[0]/(6*n))+'</b> ('+pct(res.sc_s4[1]/n)+'), in '+((performance.now()-t0)/1000).toFixed(1)+' s. Paper, at length 4,096: 99.8% and 56.4%.';b.disabled=false},30)});

  // ---------- Induction heads ----------
  function drawOne(s,preds){const host=$('ihOne'),W=host.clientWidth;if(!W)return;const L=s.x.length,show=Math.min(L,64),cw=(W-4)/show;let o='';
    const idx=L<=64?[...Array(L).keys()]:(()=>{const a=new Set();for(let i=0;i<20;i++)a.add(i);for(let i=Math.max(0,s.p-6);i<Math.min(L,s.p+8);i++)a.add(i);for(let i=L-20;i<L;i++)a.add(i);return [...a].sort((a,b)=>a-b).slice(0,show)})();
    idx.forEach((t,j)=>{const v=s.x[t],x=2+j*cw,trig=v===15,ans=t===s.p+1;o+=rc(x+.5,4,cw-1,20,trig?'var(--ink)':ans?'var(--c3)':'var(--soft)',{r:2,s:'var(--line)'});if(trig)o+=tx(x+cw/2,18,'▲',{fs:11,a:'middle',c:'var(--bg)'});if(j>0&&t-idx[j-1]>1)o+=tx(x,36,'…',{fs:11,a:'middle',c:'var(--mute)'})});
    o+=tx(2,52,'▲ trigger, green: the answer (token '+s.y+'); '+(L>64?'showing 64 of '+fmt(L)+' positions':'all positions'),{fs:11,c:'var(--mute)'});
    o+=tx(2,70,'first sequence: '+Object.entries(preds).map(([k,p])=>(k==='ih_attn'?'attention':k==='ih_s6'?'S6':'S4')+' says '+p+(p===s.y?' ✓':' ✗')).join(', '),{fs:11});
    host.innerHTML=svgW(W,78,o,'induction heads input')}
  $('ihL').addEventListener('change',()=>{$('ihLv').textContent=fmt(+$('ihL').value)});$('ihLv').textContent=fmt(256);
  $('ihGo').addEventListener('click',()=>{const L=+$('ihL').value,n=+$('ihN').value,b=$('ihGo');b.disabled=true;$('ihOut').textContent='running...';
    const r=mulberry32(L*7+n),seqs=[];for(let i=0;i<n;i++)seqs.push(MB.makeIH(r,L));
    const models=['ih_s6','ih_s4'].concat(L<=4096?['ih_attn']:[]),ok={},ms={},first={};models.forEach(m=>{ok[m]=0;ms[m]=0});let i=0;
    function next(){if(i>=n){const rows=models.map(m=>'<tr><td>'+NAME[m]+'</td><td><b>'+ok[m]+' of '+n+'</b></td><td>'+(ms[m]/1000).toFixed(1)+' s</td></tr>').join('');
        $('ihOut').innerHTML='<div class="tw"><table><thead><tr><th>Model</th><th>Right at length '+fmt(L)+'</th><th>Time here</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+(L>4096?'<p class="small mute">Attention not run beyond 4,096 here (quadratic time); see the offline chart.</p>':'');b.disabled=false;return}
      const s=seqs[i];models.forEach(m=>{const t0=performance.now(),o=MB.run(MB.load(m),s.x,{at:[L-1]}),p=MB.argmax(o.logits[L-1]);ms[m]+=performance.now()-t0;if(p===s.y)ok[m]++;if(i===0)first[m]=p});
      if(i===0)drawOne(s,first);i++;$('ihOut').textContent='running... '+i+' of '+n;setTimeout(next,0)}
    setTimeout(next,20)});
  onTab('t-run',()=>{if(!$('ihOne').innerHTML){const s=MB.makeIH(mulberry32(5),64),f={};['ih_s6','ih_s4','ih_attn'].forEach(m=>{f[m]=MB.argmax(MB.run(MB.load(m),s.x,{at:[63]}).logits[63])});drawOne(s,f)}});

  // ---------- offline extrapolation chart ----------
  onTab('t-run',()=>fit($('exSvg'),W=>{const H=220,pl=40,pt=12,pb=34,K=[...Array(15).keys()];// multiples 2^-2 .. 2^14 relative
    const X=e=>pl+(W-pl-30)*(e+2)/16,Y=v=>pt+(H-pt-pb)*(1-v/100);let s='';
    [0,25,50,75,100].forEach(v=>{s+=ln2(pl,Y(v),W-12,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,v+'%',{fs:11,a:'end',c:'var(--mute)'})});
    [-2,0,2,4,6,8,10,12,14].forEach(e=>{s+=tx(X(e),H-pb+15,e<0?'×1/'+2**-e:'×'+(2**e>=1000?(2**e/1024)+'K':2**e),{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((pl+W)/2,H-2,'test length / training length (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
    const val=v=>v==='ok'?100:v==='oom'?null:+v,P=TBX.t11.rows;
    const series=[['paper Mamba',P[5][2].map((v,i)=>[i-2,val(v)]),'var(--c1)'],['paper MHA-RoPE',P[1][2].map((v,i)=>[i-2,val(v)]),'var(--c2)'],['paper H3 (LTI)',P[3][2].map((v,i)=>[i-2,val(v)]),'var(--c5)']];
    [['toy S6','ih_s6','var(--c1)'],['toy attention','ih_attn','var(--c2)'],['toy S4 (LTI)','ih_s4','var(--c5)']].forEach(([n,k,c])=>{if(EX[k])series.push([n,Object.entries(EX[k]).map(([e,r])=>[+e-6,100*r.acc]),c,'5 4'])});
    series.forEach(([n,pts,c,da])=>{const q=pts.filter(p=>p[1]!=null);s+='<polyline points="'+q.map(p=>X(p[0])+','+Y(p[1])).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="2"'+(da?' stroke-dasharray="'+da+'"':'')+'/>'});
    const lg=legend(series.map(x=>[x[0],x[2],x[3]]),pl,H+12,W-pl);$('exSvg').innerHTML=svgW(W,H+lg.h+4,s+lg.s,'extrapolation chart')}));

  // ---------- training curves ----------
  let cm='acc';segBind('crvM',m=>{cm=m;refit($('crvSvg'))});
  onTab('t-run',()=>fit($('crvSvg'),W=>{const H=220,pl=44,pt=12,pb=34;const mxs=Math.max(...Object.values(V).map(v=>v.log[v.log.length-1][0]));
    const X=s=>pl+(W-pl-30)*s/mxs;let s='',Y;
    if(cm==='acc'){Y=v=>pt+(H-pt-pb)*(1-v);[0,.25,.5,.75,1].forEach(v=>{s+=ln2(pl,Y(v),W-12,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,(v*100)+'%',{fs:11,a:'end',c:'var(--mute)'})})}
    else{const lo=1e-4,hi=30,lg=Math.log10;Y=v=>pt+(H-pt-pb)*(1-(lg(Math.max(lo,v))-lg(lo))/(lg(hi)-lg(lo)));[1e-4,1e-2,1,10].forEach(v=>{s+=ln2(pl,Y(v),W-12,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,v>=1?v:v.toExponential(0),{fs:11,a:'end',c:'var(--mute)'})})}
    [0,2000,4000,6000,8000].filter(v=>v<=mxs).forEach(v=>{s+=tx(X(v),H-pb+15,fmt(v),{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+W)/2,H-2,'training step',{fs:11,a:'middle',c:'var(--mute)'});
    const das={sc_s6:null,sc_s4:null,ih_s6:'5 4',ih_s4:'5 4',ih_attn:'5 4'};
    Object.keys(NAME).forEach(k=>{const pts=V[k].log.map(r=>X(r[0])+','+Y(cm==='acc'?r[2]:r[1]));s+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+COL[k]+'" stroke-width="1.8"'+(das[k]?' stroke-dasharray="'+das[k]+'"':'')+'/>'});
    const lg=legend([['SC, S6','var(--c1)'],['SC, S4','var(--c2)'],['IH, S6','var(--c1)','5 4'],['IH, S4','var(--c5)','5 4'],['IH, attention','var(--c2)','5 4']],pl,H+12,W-pl);
    $('crvSvg').innerHTML=svgW(W,H+lg.h+4,s+lg.s,'training curves')}));

  // ---------- honesty box ----------
  const ex=k=>EX.ih_s6?EX[k]:null;
  let hb='Selective Copying reproduces the paper\'s direction and roughly its size: the same block with a selective layer gets '+pct(V.sc_s6.res_q.tok)+' of copied tokens, with a time-invariant layer '+pct(V.sc_s4.res_q.tok)+' (paper: 99.8% and 56.4% at length 4,096 with 16 tokens; ours is length 48 with 6). ';
  hb+='The time-invariant model was still improving slowly when its 8,000 steps ran out (the paper trains 400,000), so its number is a lower bound for this budget. ';
  if(EX.ih_s6){const e=(k,L)=>EX[k]&&EX[k][L]?pct(EX[k][L].acc):'n/a',LC=PAPER.rc.long_check;hb+='On induction heads all three are perfect at the training length; beyond it the selective model holds longest ('+e('ih_s6','8')+' at 4 times, '+e('ih_s6','10')+' at 16 times) against attention ('+e('ih_attn','8')+' at 4 times) and the LTI model ('+e('ih_s4','8')+'), but unlike the paper\'s Mamba it does not extrapolate indefinitely: by 64 times it is at '+e('ih_s6','12')+', near chance (1 in 15). '+(LC?'Training it 20,000 steps instead of 1,500 did not change that ('+pct(LC['1024'].acc)+' at 16 times). ':'')+'The paper\'s model is twice as wide (D = 64) and trained on sequences of 256 for 200K steps; at the longest lengths both toy Mambas give the same constant answer, so their curves coincide. '}
  hb+='Quantising to 6 bits changed held-out accuracy by at most '+Math.max(...Object.values(V).map(v=>Math.abs(v.res_float.tok-v.res_q.tok)*100)).toFixed(2)+' points. ';
  if(CF)hb+='The page\'s JavaScript forward pass agrees with PyTorch on the shipped weights: '+CF.summary+'. ';
  hb+='What the toy cannot test: language, scale, the CUDA kernel\'s speed, or anything about the 300B-token models; it tests the mechanism, at 20 thousand parameters, one seed each.';
  $('runHonest').innerHTML=hb;
})();
