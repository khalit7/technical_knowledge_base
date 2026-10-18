// Inside a real model: the one-screen table, the SDPA message, the sink ablation table and generations, the Roxy chart.
(function(){
  const I=window.IN;if(!I)return;const D=I.D,f=I.fmt,$=I.$;
  const mx2=a=>Math.max(...a.map(r=>Math.max(...r)));
  const na='<span class="mute">not measured</span>';
  // ---- one screen ----
  (function(){const el=$('in-one');if(!el)return;
    const S=D.smol,Q=D.qwen,T=D.tiny,P=D.pythia,F=D.facts||{};
    const pk=P?P.checkpoints:null,pf=pk?pk[pk.length-1]:null;
    const pbest=pk?pk.reduce((a,c)=>c.loss_copy2<a.loss_copy2?c:a,pk[0]):null;
    const cell=(m,fn)=>m?fn(m):na;
    const rows=[
      ['Loss on the running text (nats per token)',cell(S,m=>f(m.loss,2)),cell(Q,m=>f(m.loss,2)),cell(T,m=>f(m.before.loss,2)+' → '+f(m.after.loss,2)),cell(pf,c=>f(c.running_loss,2)),'#in-s1'],
      ['Strongest previous-token head (mean weight on token <i>i</i>−1)',cell(S,m=>f(mx2(m.scores.prev),2)),cell(Q,m=>f(mx2(m.scores.prev),2)),cell(T,m=>f(mx2(m.before.prev),2)+' → '+f(mx2(m.after.prev),2)),cell(pf,c=>f(mx2(c.prev),2)+' <span class="mute small">(random tokens)</span>'),'#in-s2'],
      ['Repeated random tokens: loss on copy 1 → copy 2',cell(S,m=>f(m.rand.c1,1)+' → <b>'+f(m.rand.c2,2)+'</b>'),cell(Q,m=>f(m.rand.c1,1)+' → <b>'+f(m.rand.c2,2)+'</b>'),cell(T,m=>f(m.after.rand.c1,1)+' → '+f(m.after.rand.c2,1)+' <span class="mute small">(trained)</span>'),cell(pk,k=>'step 0: '+f(k[0].loss_copy1,1)+' → '+f(k[0].loss_copy2,1)+'; step '+f(pbest.step,0)+': '+f(pbest.loss_copy1,1)+' → <b>'+f(pbest.loss_copy2,2)+'</b>'),'#in-s3'],
      ['Best induction score (weight on the token after the earlier copy)',cell(S,m=>f(mx2(m.ind),2)),cell(Q,m=>f(mx2(m.ind),2)),cell(T,m=>f(mx2(m.before.rand.ind),2)+' → '+f(mx2(m.after.rand.ind),2)),cell(pk,k=>f(mx2(k[0].ind),2)+' → '+f(Math.max(...k.map(c=>mx2(c.ind))),2)),'#in-s3'],
      ['Weight on the first token (highest layer mean)',cell(S,m=>f(Math.max(...m.sink_layer),2)),cell(Q,m=>f(Math.max(...m.sink_layer),2)),cell(T,m=>f(Math.max(...m.after.sink.map(r=>r.reduce((a,b)=>a+b,0)/r.length)),2)+' <span class="mute small">(no sink)</span>'),cell(pf,c=>f(Math.max(...c.sink_by_layer),2)),'#in-s4'],
      ['Loss when no query may read token 0',cell(S,m=>f(m.abl.full.loss,3)+' → <b>'+f(m.abl.no_key0.loss,3)+'</b>'),cell(Q,m=>f(m.abl.full.loss,3)+' → <b>'+f(m.abl.no_key0.loss,3)+'</b>'),na,na,'#in-s4'],
      ['Sliding window of 64, mean loss past token 64: full / window / window + 4 first tokens',cell(S,m=>f(m.win.full.loss_after_W,2)+' / <b>'+f(m.win.window.loss_after_W,2)+'</b> / '+f(m.win.window_sink.loss_after_W,2)),cell(Q,m=>f(m.win.full.loss_after_W,2)+' / <b>'+f(m.win.window.loss_after_W,2)+'</b> / '+f(m.win.window_sink.loss_after_W,2)),na,na,'#in-s4'],
      ['Largest |entry| of the residual stream (median |entry| at that layer)',cell(S,m=>f(Math.max(...m.resid.max_abs.slice(0,-1)),0)+' <span class="mute small">('+f(m.resid.median_abs[m.resid.max_abs.indexOf(Math.max(...m.resid.max_abs.slice(0,-1)))],2)+')</span>'),cell(Q,m=>f(Math.max(...m.resid.max_abs.slice(0,-1)),0)+' <span class="mute small">('+f(m.resid.median_abs[m.resid.max_abs.indexOf(Math.max(...m.resid.max_abs.slice(0,-1)))],2)+')</span>'),cell(T,m=>f(Math.max(...m.before.max_abs),1)+' → '+f(Math.max(...m.after.max_abs),1)),na,'#in-s5'],
      ['Logit lens: first layer whose top-1 matches the output on half the positions',cell(S,m=>F.smol_lens_half+' of '+m.L),cell(Q,m=>F.qwen_lens_half+' of '+m.L),cell(T,m=>{const a=m.after.lens_agree;const i=a.findIndex(v=>v>=.5);return (i<0?'none':i)+' of 6 <span class="mute small">(trained)</span>'}),na,'#in-s6']];
    el.innerHTML='<thead><tr><th>Measurement</th><th>SmolLM2-135M</th><th>Qwen3-0.6B</th><th>tiny GPT<br><small>init → trained</small></th><th>Pythia-70M<br><small>final checkpoint</small></th><th></th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+r[1]+'</td><td class="num">'+r[2]+'</td><td class="num">'+r[3]+'</td><td class="num">'+r[4]+'</td><td><a href="'+r[5]+'">go</a></td></tr>').join('')+'</tbody>';
  })();
  // ---- SDPA message ----
  if($('in-sdpa')&&D.smol){$('in-sdpa').textContent='[transformers] `sdpa` attention does not support `output_attentions=True`. Please set your attention to `eager` if you want any of these features.\noutputs.attentions -> '+(D.smol.sdpa||'')}
  // ---- ablation table ----
  (function(){const el=$('in-abl');if(!el)return;const ms=[['smol','SmolLM2-135M'],['qwen','Qwen3-0.6B']].filter(m=>D[m[0]]);
    const rows=[['full','Text as tokenised (sink on the first word)'],['no_key0','No query may read token 0'],['eot_first','<code>&lt;|endoftext|&gt;</code> prepended (sink moves to it)'],['eot_first_no_key0','<code>&lt;|endoftext|&gt;</code> prepended, and masked']];
    el.innerHTML='<thead><tr><th>Variant (same 225 or so predicted tokens)</th>'+ms.map(m=>'<th class="num">'+m[1]+'</th>').join('')+'</tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+r[1]+'</td>'+ms.map(m=>{const a=D[m[0]].abl[r[0]];const base=D[m[0]].abl.full.loss;return '<td class="num">'+f(a.loss,3)+(r[0]==='full'?'':' <span class="mute small">('+(a.loss>=base?'+':'')+f(a.loss-base,3)+')</span>')+'</td>'}).join('')+'</tr>').join('')+'</tbody>';
    const g=$('in-gen');if(g)g.innerHTML=ms.map(m=>'<p class="small"><b>'+m[1]+'</b>, normal:</p><div class="in-gen">'+I.esc(D[m[0]].abl.greedy_full)+'</div><p class="small"><b>'+m[1]+'</b>, token 0 masked in every layer:</p><div class="in-gen">'+I.esc(D[m[0]].abl.greedy_no_key0)+'</div>').join('')+
      '<p class="small mute">The last row of the table is a check: with <code>&lt;|endoftext|&gt;</code> masked, no text token can see it and RoPE only sees relative positions, so it must give the same loss as the first row, and it does.</p>';
  })();
  // ---- Roxy: loss on each 'x' ----
  (function(){const el=$('in-roxy');if(!el||!D.tiny)return;
    function draw(){const T=D.tiny,w=I.width(el);const b=T.before.roxy_x_loss,a=T.after.roxy_x_loss;
      const sn=T.snaps&&T.snaps['600']?T.snaps['600'].roxy_x_loss:null;
      const series=[{y:b,c:'var(--dim)',dots:1,label:'init'},{y:a,c:'var(--c1)',dots:1}];if(sn)series.splice(1,0,{y:sn,c:'var(--c5)',dots:1,dash:'4 3'});
      el.innerHTML=I.line({w,h:190,series,ymin:0,ymax:10,yticks:[0,2,4,6,8,10],xticks:a.map((_,i)=>({x:i,l:String(i+1)})),xlab:'occurrence of "x" in "Roxy" (1st to 11th)',ylab:'loss (nats)',label:'Loss on each x of Roxy'})+
        '<div class="in-leg"><span><i style="background:var(--dim)"></i>at initialisation</span>'+(sn?'<span><i style="background:var(--c5)"></i>after 600 steps</span>':'')+'<span><i style="background:var(--c1)"></i>after 1,500 steps (12.3M tokens)</span></div>'+
        '<p class="small mute">At the first "Roxy" the trained model has only its prior ('+f(a[0],1)+' nats); from the fifth on it stays between '+f(Math.min(...a.slice(4)),1)+' and '+f(Math.max(...a.slice(4)),1)+' nats, against '+f(Math.min(...b),1)+' to '+f(Math.max(...b),1)+' at initialisation (log 4,096 = 8.3). Positions in the running sequence: '+T.after.roxy_x_pos.join(', ')+'. <span class="in-lbl m">measured here (CPU)</span></p>'}
    I.onRender(draw);draw();
  })();
})();
