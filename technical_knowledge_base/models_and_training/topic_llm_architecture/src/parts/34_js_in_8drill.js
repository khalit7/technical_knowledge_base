// Inside a real model: predict-then-reveal drills of the last section.
(function(){
  const I=window.IN;if(!I||!I.D.smol)return;const S=I.D.smol,f=I.fmt;
  I.predict('in-pr2',{q:'SmolLM2-135M with full attention scores '+f(S.win.full.loss_after_W,2)+' nats per token on a 1,024-token text (past token 64). Now every query may only read the last 64 tokens, and nothing else is kept. What happens to the loss?',
    opts:[{t:'Barely changes: 64 tokens of context is plenty for these stories',why:'Losing context costs little here; losing the sink costs a lot.'},{t:'A little worse, about 2.0'},{t:'About double',right:true}],
    ans:'<b>'+f(S.win.window.loss_after_W,2)+'</b>. Keep the first 4 tokens as well and it is '+f(S.win.window_sink.loss_after_W,2)+'; keep only token 0 and it is '+f(S.win.window_sink1.loss_after_W,2)+'. Most of the damage was the lost sink, not the lost context (section 4, the window animation).'});
  I.predict('in-pr3',{q:'Put <code>&lt;|endoftext|&gt;</code> in front of the running text, then forbid every query from reading it. Compared with the text alone (loss '+f(S.abl.full.loss,4)+'), the loss on the same text tokens is:',
    opts:[{t:'Higher: the sink token is masked',why:'The text tokens still have their own first token to use as a sink.'},{t:'Lower: one more token of context',why:'Nothing can read that token, so it adds no context.'},{t:'Exactly the same',right:true}],
    ans:'<b>'+f(S.abl.eot_first_no_key0.loss,4)+'</b>, identical to four decimals. No text token can read the extra token, so the text tokens compute exactly what they computed without it, at positions shifted by one, and RoPE only sees differences of positions. A check like this is how we know the masking function does what it says.'});
})();
