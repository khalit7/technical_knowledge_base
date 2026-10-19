// ---- Recall probes tab: running-sequence token strip (animated, attention against a chosen model), Pythia vs Mamba,
// tiny GPT name recall, MQAR grid. All numbers from window.BAD (recorded outputs). ----
(function(){
  const $=id=>document.getElementById(id);
  if(!window.BA||!window.BAD||!$('t-recall'))return;
  const TAB='t-recall',pct=x=>Math.round(100*x)+'%';
  const pend=el=>{if(el)el.innerHTML='<p class="unc">pending run (src/scripts/run_pending.sh)</p>'};
  // 1. running sequence strip
  const P=BAD.rs_pieces,RT=BAD.rs_tokens||{};
  const roxy=new Set();for(let i=0;i+3<P.length;i++)if(P[i]===' R'&&P[i+1]==='o'&&P[i+2]==='x'&&P[i+3]==='y'){roxy.add(i);roxy.add(i+1);roxy.add(i+2);roxy.add(i+3)}
  let other='ba_ssm';const CH=16,NS=Math.ceil((P.length-1)/CH);
  function drawRS(i){const a=RT.at_mha,b=RT[other];if(!a||!b){pend($('rc-rs-tok'));return}
    const upto=Math.min(P.length-1,(i+1)*CH);let h='';
    for(let t=1;t<P.length;t++){const d=b[t-1]-a[t-1],show=t<=upto;
      const c=d>0?'rgba(194,112,58,'+Math.min(.85,d/3).toFixed(2)+')':'rgba(47,111,181,'+Math.min(.85,-d/3).toFixed(2)+')';
      h+='<span class="'+(roxy.has(t)?'nm':'')+'" style="background:'+(show?c:'transparent')+';opacity:'+(show?1:.35)+'" title="'+RD.esc(P[t])+': attention '+a[t-1].toFixed(2)+', other '+b[t-1].toFixed(2)+'">'+RD.esc(P[t]==='\n'?'↵':P[t])+'</span>'}
    $('rc-rs-tok').innerHTML=h;
    const sum=(arr,f)=>{let s=0,n=0;for(let t=1;t<=upto;t++)if(f(t)){s+=arr[t-1];n++}return n?s/n:0};
    const isR=t=>roxy.has(t)&&P[t]!==' R',notR=t=>!roxy.has(t);
    const lab={ba_ssm:'the SSM-only model',ba_hybrid:'the hybrid (1 attention in 6)',ba_hybrid2:'the hybrid (2 in 6)',pe_nope:'attention without positions'}[other];
    $('rc-rs-cap').innerHTML='<b>Tokens 1 to '+upto+'.</b> Mean loss on the later pieces of " Roxy" ("o", "x", "y"): attention '+sum(a,isR).toFixed(2)+', '+lab+' '+sum(b,isR).toFixed(2)+
      '; on every other token: '+sum(a,notR).toFixed(2)+' and '+sum(b,notR).toFixed(2)+' nats. '+(i===NS-1?'Whole story: '+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(3)+' against '+(b.reduce((x,y)=>x+y,0)/b.length).toFixed(3)+'.':'')}
  const an=BA.anim({tab:TAB,card:'rc-rs',ctl:'rc-rs-ctl',n:NS,draw:drawRS,ms:900,label:'Tokens shown'});
  RD.seg($('rc-rs-b'),m=>{other=m;an.reset(NS)});
  // 2. Pythia vs Mamba
  function copy(){const C=BAD.copy;if(!C){pend($('rc-copy'));return}
    const py=C.models.find(m=>/pythia/.test(m.name)),mb=C.models.find(m=>/mamba/.test(m.name));
    BA.line($('rc-copy'),[{name:'Pythia-160M (attention)',color:'var(--c1)',dots:1,pts:py.copy.map(z=>[z.words,z.acc])},{name:'Mamba-130M (no attention)',color:'var(--c2)',dots:1,pts:mb.copy.map(z=>[z.words,z.acc])}],
      {logx:true,ymin:0,ymax:1,yticks:[0,.25,.5,.75,1],yfmt:pct,xticks:py.copy.map(z=>z.words),xlab:'words in the list (log scale)',ylab:'copy accuracy (tokens of the second copy)',label:'copy accuracy against list length'});
    BA.line($('rc-book'),[{name:'Pythia-160M',color:'var(--c1)',dots:1,pts:py.phonebook.map(z=>[z.entries,z.acc])},{name:'Mamba-130M',color:'var(--c2)',dots:1,pts:mb.phonebook.map(z=>[z.entries,z.acc])}],
      {logx:true,ymin:0,ymax:1,yticks:[0,.25,.5,.75,1],yfmt:pct,xticks:py.phonebook.map(z=>z.entries),xlab:'entries in the phone book (log scale)',ylab:'numbers found (20 lookups each)',label:'phone book accuracy'});
    const big=Math.max(0,py.phonebook.findIndex(z=>z.entries===40)),f=m=>(m.phonebook[big].fails||[]).map(x=>RD.esc(x.query)+': wanted '+RD.esc(x.want)+', got "'+RD.esc(x.got)+'"').join('\n')||'(no failures recorded)';
    $('rc-fails').innerHTML='<p class="small"><b>Real failures</b> in the '+py.phonebook[big].entries+'-entry books (first three per model; prompts of about '+py.phonebook[big].prompt_tokens+' tokens):</p><pre>Pythia-160M\n'+f(py)+'\n\nMamba-130M\n'+f(mb)+'</pre>'}
  // 3. tiny name recall
  const TC={at_mha:'var(--c1)',pe_nope:'var(--c6)',ba_ssm:'var(--c2)',ba_hybrid:'var(--c4)',ba_hybrid2:'var(--c5)'};
  function tiny(){const R=BAD.tiny_recall;if(!R){pend($('rc-tr'));return}
    const S=[];R.models.forEach(m=>{S.push({name:m.run+' (mentioned)',color:TC[m.run],dots:1,pts:R.dist.map((d,i)=>[d,m.seen[i]])});S.push({name:m.run+' control',color:TC[m.run],dash:'4 3',noleg:1,pts:R.dist.map((d,i)=>[d,m.unseen[i]])})});
    const ys=S.flatMap(s=>s.pts.map(p=>p[1]));
    BA.line($('rc-tr'),S,{ymin:0,ymax:Math.ceil(Math.max(...ys)),yticks:[0,2,4,6,8].filter(v=>v<=Math.ceil(Math.max(...ys))),xticks:R.dist,xlab:'filler tokens between the mentions',ylab:'loss on the name\'s later pieces (nats)',label:'name recall against distance'});
    const i=R.dist.indexOf(128);
    $('rc-tr-say').innerHTML='At 128 filler tokens, recall benefit (control minus mentioned): '+R.models.map(m=>RD.esc(m.run)+' '+(m.unseen[i]-m.seen[i]).toFixed(2)).join(', ')+' nats per piece. Dashed lines are the controls.'}
  // 4. MQAR
  function mq(){const Q=BAD.mqar;if(!Q||!Q.length){pend($('rc-mq-c'));return}
    const pairs=[...new Set(Q.map(q=>q.pairs))].sort((a,b)=>a-b),models=['attn','ssm16','ssm64','hybrid'].filter(m=>Q.some(q=>q.model===m));
    const NM={attn:'2 attention layers',ssm16:'2 SSM layers, state 16',ssm64:'2 SSM layers, state 64',hybrid:'SSM then attention'};
    document.querySelector('#rc-mq thead').innerHTML='<tr><th>Model</th>'+pairs.map(p=>'<th class="num">'+p+' pairs</th>').join('')+'<th class="num">State or cache (numbers per layer at the end)</th></tr>';
    document.querySelector('#rc-mq tbody').innerHTML=models.map(m=>'<tr><td>'+NM[m]+'</td>'+pairs.map(p=>{const z=Q.find(q=>q.model===m&&q.pairs===p);
      return '<td class="v" style="background:'+(z?'rgba(63,127,86,'+(0.12+0.6*z.acc).toFixed(2)+')':'transparent')+'">'+(z?pct(z.acc):'')+'</td>'}).join('')+
      '<td class="num">'+{attn:'KV: 256 per token',ssm16:'state: 4,096',ssm64:'state: 16,384',hybrid:'state 4,096; KV 256 per token'}[m]+'</td></tr>').join('');
    $('rc-mq-say').innerHTML='Only SSM-then-attention learned 8 pairs within the budget ('+pct(Q.find(q=>q.model==="hybrid"&&q.pairs===8).acc)+'); two attention layers stalled near '+pct(Q.find(q=>q.model==="attn"&&q.pairs===8).acc)+', the same plateau as the pure SSMs, and nothing learned 32 or 64 pairs. Zoology and Mamba-2 report attention solving MQAR after far longer training: <b>does not reproduce</b> at this budget (8,000 steps, 1 to 29 minutes per run on MPS). What the toy does show: a short convolution plus an SSM in front of one attention layer finds the lookup much sooner than attention alone, the same effect as the hybrid name-recall result above. Larger state (64 against 16) did not help within this budget.';
    const pmax=pairs[0],cc={attn:'var(--c1)',ssm16:'var(--c2)',ssm64:'var(--c5)',hybrid:'var(--c4)'};
    BA.line($('rc-mq-c'),models.map(m=>{const z=Q.find(q=>q.model===m&&q.pairs===pmax);return z?{name:NM[m],color:cc[m],pts:z.log.map(r=>[r.step,r.acc])}:null}).filter(Boolean),
      {ymin:0,ymax:1,yticks:[0,.25,.5,.75,1],yfmt:pct,xticks:[0,2000,4000,6000,8000],xlab:'training step',ylab:'accuracy during training, '+pmax+' pairs (512 sequences)',label:'MQAR training curves'})}
  function all(){copy();tiny();mq();an.redraw()}
  BA.onTab(TAB,all);BA.onResize(TAB,all);
})();
