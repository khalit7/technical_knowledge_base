// ---- Recall visuals in Reading (moved from the retired Recall probes tab on 2026-10-23): running-sequence token strip
// (section 9), Pythia vs Mamba charts (section 8), tiny GPT name recall and MQAR curves (closed blocks in section 8).
// The numbers in the prose and tables are static HTML; check_data.mjs compares them with window.BAD. ----
(function(){
  const $=id=>document.getElementById(id);
  if(!window.BA||!window.BAD||!$('rc-rs'))return;
  const TAB='t-read',pct=x=>Math.round(100*x)+'%';
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
  }
  // 3. tiny name recall
  const TC={at_mha:'var(--c1)',pe_nope:'var(--c6)',ba_ssm:'var(--c2)',ba_hybrid:'var(--c4)',ba_hybrid2:'var(--c5)'};
  function tiny(){const R=BAD.tiny_recall;if(!R){pend($('rc-tr'));return}
    const S=[];R.models.forEach(m=>{S.push({name:m.run+' (mentioned)',color:TC[m.run],dots:1,pts:R.dist.map((d,i)=>[d,m.seen[i]])});S.push({name:m.run+' control',color:TC[m.run],dash:'4 3',noleg:1,pts:R.dist.map((d,i)=>[d,m.unseen[i]])})});
    const ys=S.flatMap(s=>s.pts.map(p=>p[1]));
    BA.line($('rc-tr'),S,{ymin:0,ymax:Math.ceil(Math.max(...ys)),yticks:[0,2,4,6,8].filter(v=>v<=Math.ceil(Math.max(...ys))),xticks:R.dist,xlab:'filler tokens between the mentions',ylab:'loss on the name\'s later pieces (nats)',label:'name recall against distance'})}
  // 4. MQAR
  function mq(){const Q=BAD.mqar;if(!Q||!Q.length){pend($('rc-mq-c'));return}
    const pairs=[...new Set(Q.map(q=>q.pairs))].sort((a,b)=>a-b),models=['attn','ssm16','ssm64','hybrid'].filter(m=>Q.some(q=>q.model===m));
    const NM={attn:'2 attention layers',ssm16:'2 SSM layers, state 16',ssm64:'2 SSM layers, state 64',hybrid:'SSM then attention'};
    const pmax=pairs[0],cc={attn:'var(--c1)',ssm16:'var(--c2)',ssm64:'var(--c5)',hybrid:'var(--c4)'};
    BA.line($('rc-mq-c'),models.map(m=>{const z=Q.find(q=>q.model===m&&q.pairs===pmax);return z?{name:NM[m],color:cc[m],pts:z.log.map(r=>[r.step,r.acc])}:null}).filter(Boolean),
      {ymin:0,ymax:1,yticks:[0,.25,.5,.75,1],yfmt:pct,xticks:[0,2000,4000,6000,8000],xlab:'training step',ylab:'accuracy during training, '+pmax+' pairs (512 sequences)',label:'MQAR training curves'})}
  function all(){copy();tiny();mq();an.redraw()}
  BA.onTab(TAB,all);BA.onResize(TAB,all);
})();
