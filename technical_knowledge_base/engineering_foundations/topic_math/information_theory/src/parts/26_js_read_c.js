// ---- Reading: perplexity table (s10), arithmetic coding (s11), compression ladder (s11), RL table (s13), estimator bias (s14) ----
(function(){
  const T=RD.t;
  const MOD=[['openai-community/gpt2','GPT-2 (124M)'],['facebook/opt-125m','OPT-125m'],['HuggingFaceTB/SmolLM2-135M','SmolLM2-135M'],['Qwen/Qwen2.5-0.5B','Qwen2.5-0.5B']];
  const TXT=[['en','Darwin (English)'],['fr','Hugo (French)'],['code','SQLite (C code)']];
  window.ITMOD=MOD;window.ITTXT=TXT;
  const pt=document.getElementById('it-ppl-tab');
  if(pt){let h='<tr><th>text</th><th>model</th><th class="num">tokens</th><th class="num">bytes/token</th><th class="num">nats/token</th><th class="num">perplexity</th><th class="num">bits/byte</th></tr>';
    TXT.forEach(([k,tn])=>{const t=ITM.texts[k];MOD.forEach(([m,mn],j)=>{const r=t.models[m];
      h+='<tr><td>'+(j?'':tn+' '+t.bytes.toLocaleString('en-US')+' B')+'</td><td>'+mn+'</td><td class="num">'+r.n_tokens.toLocaleString('en-US')+'</td><td class="num">'+r.bpt.toFixed(2)+'</td><td class="num">'+r.ce.toFixed(3)+'</td><td class="num">'+r.ppl.toFixed(1)+'</td><td class="num"><b>'+r.bpb.toFixed(3)+'</b></td></tr>'})});
    pt.innerHTML=h}

  // arithmetic coding of "sat cat cat" with the fixed bet
  const P=IT.softmax([2,1,0]),NM=['cat','dog','sat'],MSG=[2,0,0],COL=['var(--c1)','var(--c4)','var(--c2)'];
  const ac=document.getElementById('it-ac');
  function intervals(n){let lo=0,w=1;const out=[[lo,w]];for(let k=0;k<n;k++){let c=0;for(let j=0;j<MSG[k];j++)c+=P[j];lo=lo+w*c;w=w*P[MSG[k]];out.push([lo,w])}return out}
  function drawAc(i){if(!ac)return;const W=RD.width(ac),l=8,r=8,pw=W-l-r,rowH=40;let o='';const iv=intervals(Math.min(i,3));
    for(let k=0;k<=Math.min(i,3);k++){const y=k*rowH+6,[lo,w]=iv[k];
      // zoom: show the current interval [lo, lo+w] full width, split by P
      if(k<3&&k<=i){let c=0;for(let j=0;j<3;j++){const x=l+c*pw,ww=P[j]*pw,act=(k<i&&j===MSG[k]);
        o+='<rect x="'+x+'" y="'+y+'" width="'+Math.max(1,ww-1)+'" height="24" rx="3" fill="'+COL[j]+'" opacity="'+(act?0.95:(k<i?0.22:0.55))+'"/>';
        if(ww>34)o+=T(x+ww/2,y+16,NM[j]+(ww>70?' '+P[j].toFixed(3):''),{a:'middle',fs:11,w:act?700:400,fill:act?'var(--bg)':'var(--ink)'});c+=P[j]}
        o+=T(W-r,y+36,'['+lo.toFixed(4)+', '+(lo+w).toFixed(4)+')  width '+w.toFixed(4),{a:'end',fs:10.5,fill:'var(--mute)'})}
      if(k===3){o+='<rect x="'+l+'" y="'+y+'" width="'+pw+'" height="24" rx="3" fill="var(--c3)" opacity="0.85"/>'+T(l+pw/2,y+16,'final interval ['+lo.toFixed(4)+', '+(lo+w).toFixed(4)+'), width '+w.toFixed(4),{a:'middle',fs:11.5,w:600,fill:'var(--bg)'})}}
    ac.innerHTML=RD.svg(W,Math.min(i,3)*rowH+40,o,'Arithmetic coding intervals');
    const caps=[['Start: the whole interval [0, 1)','Split it in proportion to the bet: cat takes the first 0.665, dog the next 0.245, sat the last 0.090. The message is "sat cat cat".'],
      ['Symbol 1: sat','Keep sat\'s slice, [0.910, 1.000), width 0.090, and split it again in the same proportions (each row is zoomed to fill the width).'],
      ['Symbol 2: cat','Keep cat\'s part of that slice: width 0.090 × 0.665 = 0.0599.'],
      ['Symbol 3: cat','Width 0.0599 × 0.665 = 0.0398. Any number inside identifies the whole message. Naming a number to that precision takes about −log₂ 0.0398 = 4.65 bits, plus at most about two for termination.']];
    const s=caps[Math.min(i,3)];document.getElementById('it-ac-cap').innerHTML='<div class="t">'+s[0]+'</div><p>'+s[1]+'</p>';
    const w=iv[Math.min(i,3)][1];let sur=0;for(let k=0;k<Math.min(i,3);k++)sur+=-Math.log2(P[MSG[k]]);
    document.getElementById('it-ac-cnt').innerHTML=RD.stat('interval width',w.toFixed(4),'product of the probabilities')+RD.stat('−log₂ width',(-Math.log2(w)).toFixed(3)+' bits','')+RD.stat('sum of surprises',sur.toFixed(3)+' bits','3.473 + 0.588 + 0.588')}
  if(ac){const a=RD.anim({card:'it-ac-card',ctl:'it-ac-ctl',n:4,draw:drawAc,ms:2200,label:'Symbols coded'});RD.onResize(()=>a.redraw())}

  // compression ladder on the Darwin passage
  const lad=document.getElementById('it-lad');
  function drawLad(){if(!lad)return;const W=Math.min(RD.width(lad),720);const rows=[['raw bytes',8,'var(--dim)'],['order-0 Huffman',ITM.order0.huffman_bits_per_byte,'var(--c5)']];
    Object.entries(ITM.compressors).sort((a,b)=>b[1].prefix_bpb[5]-a[1].prefix_bpb[5]).forEach(([k,v])=>rows.push([k,v.prefix_bpb[5],'var(--c1)']));
    MOD.forEach(([m,mn])=>rows.push([mn,ITM.texts.en.models[m].bpb,'var(--c3)']));
    const lw=Math.min(130,W*0.36),rh=22,pw=W-lw-58;let o='';
    rows.forEach((r,i)=>{const y=i*rh;o+=T(lw-6,y+15,r[0],{a:'end',fs:11.5})+'<rect x="'+lw+'" y="'+(y+4)+'" width="'+Math.max(1,r[1]/8*pw)+'" height="'+(rh-8)+'" rx="3" fill="'+r[2]+'"/>'+T(lw+r[1]/8*pw+5,y+15,r[1].toFixed(3),{fs:11.5,w:600})});
    lad.innerHTML=RD.svg(W,rows.length*rh+4,o,'Bits per byte on the Darwin passage')}
  RD.onRender(drawLad);RD.onResize(drawLad);drawLad();

  // RL table
  const rt=document.getElementById('it-rl-tab');
  if(rt){let h='<tr><th>β</th><th>π*(cat)</th><th>π*(dog)</th><th>π*(sat)</th><th>Z</th><th>E[r]</th><th>KL(π*‖π_ref)</th><th>objective = β ln Z</th></tr>';
    [Infinity,2,1,0.5,0.25].forEach(b=>{const ref=IT.softmax([2,1,0]),r=b===Infinity?{pi:ref,Z:1,ER:ref[2],KL:0,obj:ref[2]}:IT.rlopt(ref,[0,0,1],b);
      h+='<tr><td>'+(b===Infinity?'∞ (the reference)':b)+'</td>'+r.pi.map(v=>'<td class="num">'+v.toFixed(3)+'</td>').join('')+'<td class="num">'+r.Z.toFixed(3)+'</td><td class="num">'+r.ER.toFixed(3)+'</td><td class="num">'+r.KL.toFixed(3)+'</td><td class="num">'+(b===Infinity?'':(b*Math.log(r.Z)).toFixed(3))+'</td></tr>'});
    rt.innerHTML=h}

  // plug-in entropy bias
  const pb=document.getElementById('it-pb');const PBN=[25,50,100,200,400,1000,4000];let PB=null;
  function drawPb(){if(!pb)return;if(!PB)PB=PBN.map(N=>IT.pluginSim(100,N,200,11));const tru=Math.log(100);
    RD.chart(pb,{logx:true,x0:25,x1:4000,y0:2.5,y1:5,yt:[2.5,3,3.5,4,4.5,5],xt:[25,100,400,1000,4000],xlab:'N, samples (log scale)',aria:'Plug-in entropy estimate against sample size',
      series:[{pts:[[25,tru],[4000,tru]],col:'var(--c3)',label:'true ln 100 = 4.605',lab:0,a:'start',dx:4,dy:-6},
        {pts:PBN.map(N=>[N,tru-99/(2*N)]),col:'var(--mute)',dash:true},
        {pts:PBN.map((N,i)=>[N,PB[i][1]]),col:'var(--c4)',dots:true},
        {pts:PBN.map((N,i)=>[N,PB[i][0]]),col:'var(--c2)',dots:true}]});
    document.getElementById('it-pb-tab').innerHTML='<table class="mini"><tr><th>N</th>'+PBN.map(N=>'<th>'+N+'</th>').join('')+'</tr><tr><td>plug-in</td>'+PB.map(v=>'<td class="num">'+v[0].toFixed(3)+'</td>').join('')+'</tr><tr><td>Miller-Madow</td>'+PB.map(v=>'<td class="num">'+v[1].toFixed(3)+'</td>').join('')+'</tr><tr><td>bias formula</td>'+PBN.map(N=>'<td class="num">'+(-99/(2*N)).toFixed(3)+'</td>').join('')+'</tr></table>'}
  RD.onRender(drawPb);RD.onResize(drawPb);
  const mt=document.getElementById('it-mib-tab');
  if(mt){const NN=[50,100,200,500,1000,5000];const est=NN.map(N=>IT.miSim(10,N,200,13));
    mt.innerHTML='<tr><th>samples N</th>'+NN.map(N=>'<th>'+N.toLocaleString('en-US')+'</th>').join('')+'</tr><tr><td>plug-in I, nats</td>'+est.map(v=>'<td class="num">'+v.toFixed(3)+'</td>').join('')+'</tr><tr><td>81 / (2N)</td>'+NN.map(N=>'<td class="num">'+(81/(2*N)).toFixed(3)+'</td>').join('')+'</tr>'}
})();
