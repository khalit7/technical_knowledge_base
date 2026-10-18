// Inside a real model: induction heads (predict card, Pythia checkpoints animation, phase-change chart).
(function(){
  const I=window.IN;if(!I)return;const D=I.D,f=I.fmt,$=I.$,F=D.facts||{};
  if(D.smol)I.predict('in-pr1',{q:'Predict: SmolLM2-135M reads 100 random tokens, then the same 100 again. Its loss on the first copy is '+f(D.smol.rand.c1,1)+' nats per token (worse than a uniform guess over 49,152 tokens, '+f(Math.log(49152),1)+'). What is it on the second copy?',
    opts:[{t:'About the same: random tokens are random',why:'The second copy is not random any more: every token is in the context.'},{t:'About half: some heads help',why:'It is far lower than that.'},{t:'Under 1 nat',right:true}],
    ans:'<b>'+f(D.smol.rand.c2,2)+' nats</b>, averaged over 8 random draws. '+F.smol_ind_n03+' heads have an induction score above 0.3, all in layers '+F.smol_ind_layers+'; the strongest, '+F.smol_ind_best_lbl+', puts '+f(F.smol_ind_best_val,2)+' of its weight exactly on the token after the earlier copy.'+(D.qwen?' Qwen3-0.6B: '+f(D.qwen.rand.c1,1)+' → '+f(D.qwen.rand.c2,2)+'; best head '+F.qwen_ind_best_lbl+' ('+f(F.qwen_ind_best_val,2)+').':'')});
  const P=D.pythia;if(!P)return;const K=P.checkpoints;if($('in-phn'))$('in-phn').textContent=String(K.length);
  const tokLab=n=>n===0?'0':n>=1e9?f(n/1e9,n>=1e10?0:1)+'B':f(n/1e6,0)+'M';
  const mx=c=>Math.max(...c.ind.map(r=>Math.max(...r)));
  // ---- animation over checkpoints ----
  (function(){const box=$('in-phsvg');if(!box)return;const L0=100,q=150,tgt=q-L0+1;
    function draw(i){const c=K[i],w=I.width(box);
      const top=I.line({w,h:190,series:[{y:K[0].loss_by_pos,c:'var(--dim)',sw:1.5},{y:c.loss_by_pos,c:'var(--c1)'}],ymin:0,ymax:24,yticks:[0,5,10,15,20],
        xticks:[{x:0,l:'1'},{x:99,l:'100'},{x:199,l:'200'}],vlines:[{x:99.5,label:w<480?'copy 2':'second copy starts'}],xlab:'position in the sequence',ylab:'loss (nats)',label:'Loss by position'});
      const row=c.best_row_q150,bw=w-56,bh=70;let b='';const sx=k=>46+k/(q)*bw;
      row.forEach((v,k)=>{if(v>0.004)b+='<rect x="'+sx(k).toFixed(1)+'" y="'+(10+bh*(1-v)).toFixed(1)+'" width="'+Math.max(1.2,bw/q).toFixed(1)+'" height="'+(bh*v).toFixed(1)+'" fill="'+(k===tgt?'var(--good)':'var(--c1)')+'"/>'});
      b+='<line x1="46" x2="'+(46+bw)+'" y1="'+(10+bh)+'" y2="'+(10+bh)+'" stroke="var(--line)"/>';
      b+='<path d="M'+sx(tgt).toFixed(1)+' '+(bh+14)+' l-5 8 h10 z" fill="var(--good)"/>'+I.t(sx(tgt),bh+34,'target: position '+tgt,{a:'middle',fs:10.5,fill:'var(--good)'});
      b+=I.t(46,bh+34,'0',{fs:10.5,fill:'var(--mute)'})+I.t(46+bw,bh+34,String(q),{a:'end',fs:10.5,fill:'var(--mute)'})+I.t(40,16,'1',{a:'end',fs:10.5,fill:'var(--mute)'})+I.t(40,10+bh,'0',{a:'end',fs:10.5,fill:'var(--mute)'});
      box.innerHTML=top+I.svg(w,bh+42,b,'Attention of the best induction head from position 150');
      const bl=c.best_head,iv=c.ind[bl[0]][bl[1]];
      $('in-phcap').innerHTML='<b>Step '+f(c.step,0)+'</b> ('+tokLab(c.tokens)+' tokens trained). Loss on copy 1: '+f(c.loss_copy1,2)+', on copy 2: <b>'+f(c.loss_copy2,2)+'</b>. Strongest induction head: layer '+bl[0]+', head '+bl[1]+', score '+f(iv,2)+'; from position '+q+' it puts '+f(row[tgt],2)+' on the target and '+f(row[0],2)+' on token 0. '+
        (iv<0.3?'No head copies yet: copy 2 is as hard as copy 1.':c.loss_copy2<c.loss_copy1/2?'The induction head is there and the second copy is cheap.':'The head looks in the right place, but the second copy is not cheap: the copying half of the circuit is not raising the right logit.')}
    const a=I.anim({card:'in-ph',ctl:'in-phctl',n:K.length,draw,ms:1700,label:'Checkpoint'});
    I.onRender(()=>a&&a.redraw());
  })();
  // ---- phase chart ----
  (function(){const box=$('in-pcsvg');if(!box)return;const T=D.tiny;
    const x0=2e5,X=K.map(c=>Math.max(c.tokens,x0)),tr=T&&T.traj?T.traj.probes.filter(p=>p.step>0):[];
    function draw(){const w=I.width(box);
      const ticks=[{x:x0,l:'0'},{x:1e6,l:'1M'},{x:1e7,l:'10M'},{x:1e8,l:'100M'},{x:1e9,l:'1B'},{x:1e10,l:'10B'},{x:1e11,l:'100B'}].filter((t,i)=>w>480||i%2===0||t.x===x0);
      const s1=[{x:X,y:K.map(mx),c:'var(--c1)',dots:1}];if(tr.length)s1.push({x:tr.map(p=>p.step*8192),y:tr.map(p=>p.ind_max),c:'var(--c2)'});
      const s2=[{x:X,y:K.map(c=>c.loss_copy2),c:'var(--c1)',dots:1},{x:X,y:K.map(c=>c.loss_copy1),c:'var(--dim)',dash:'4 3'}];if(tr.length)s2.push({x:tr.map(p=>p.step*8192),y:tr.map(p=>p.loss_copy2),c:'var(--c2)'});
      box.innerHTML=I.line({w,h:170,series:s1,logx:1,xmin:x0,xmax:4e11,ymin:0,ymax:1,yticks:[0,.25,.5,.75,1],xticks:ticks,ylab:'best induction score',label:'Induction score by tokens trained'})+
        I.line({w,h:190,series:s2,logx:1,xmin:x0,xmax:4e11,ymin:0,ymax:22,yticks:[0,5,10,15,20],xticks:ticks,xlab:'tokens trained (log scale)',ylab:'loss on copy 2',label:'Loss on the second copy by tokens trained'})+
        '<div class="in-leg"><span><i style="background:var(--c1)"></i>Pythia-70M-deduped, published checkpoints</span><span><i style="background:var(--dim)"></i>Pythia, copy 1</span>'+(tr.length?'<span><i style="background:var(--c2)"></i>tiny GPT trained here (every 25 steps)</span>':'')+'</div>'}
    $('in-pcnote').innerHTML='Between step '+f(F.pythia_before_step,0)+' ('+f(F.pythia_before_tok,2)+'B tokens) and step '+f(F.pythia_after_step,0)+' ('+f(F.pythia_after_tok,2)+'B tokens) the best induction score jumps from '+f(F.pythia_before_ind,2)+' to '+f(F.pythia_after_ind,2)+' and the loss on the second copy from '+f(F.pythia_before_c2,1)+' to '+f(F.pythia_after_c2,1)+'. Checkpoints are only published at these steps, so the jump is somewhere inside that interval. Pythia: 2,097,152 tokens per step (Biderman et al., 2023, {{arXiv 2304.01373|https://arxiv.org/abs/2304.01373}}). The tiny GPT\'s whole run (12.3M tokens) ends about '+f(F.pythia_ratio_tiny,-1)+' times earlier than the step where Pythia\'s head appears. <span class="in-lbl p">published checkpoints</span> <span class="in-lbl m">measured here (CPU)</span>';
    $('in-pcnote').innerHTML=$('in-pcnote').innerHTML.replace(/\{\{([^|]+)\|([^}]+)\}\}/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    I.onRender(draw);draw();
  })();
})();
