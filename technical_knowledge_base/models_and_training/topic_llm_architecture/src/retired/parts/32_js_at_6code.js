// Attention lab section 10: code quoted by file and line (src/attn/inputs/code_snippets.json, located by pattern),
// and the real output of src/attn/sdpa_errors.py.
(function(){
  const A=window.AT,D=window.ATD;if(!A||!D||!D.code||!A.$('at-code'))return;
  const esc=A.esc;let h='';
  for(const s of D.code.snippets){
    h+='<p class="at-codecap" style="margin-top:10px"><b>'+esc(s.label)+'</b><br><code>'+esc(s.file)+'</code>, lines '+s.first+(s.last>s.first?' to '+s.last:'')+'</p>';
    h+='<div class="at-code">'+esc(s.code.replace(/\s+$/,''))+'</div>';
  }
  if(D.sdpa){const o=D.sdpa;
    h+='<p class="at-codecap" style="margin-top:10px"><b>What happens when GQA shapes reach attention unexpanded, and when they are expanded the wrong way</b> (<code>src/attn/sdpa_errors.py</code>, torch '+esc(o.torch)+', CPU; output pasted from the run)</p>';
    h+='<div class="at-code">q = torch.randn(1, 8, 5, 32); k = v = torch.randn(1, 2, 5, 32)   # 8 query heads, 2 KV heads\nF.scaled_dot_product_attention(q, k, v, is_causal=True)\n# -> '+esc(o.sdpa_no_enable_gqa)+
      '\nF.scaled_dot_product_attention(q, k, v, is_causal=True, enable_gqa=True)   # fine\n# max |enable_gqa - repeat_interleave| = '+o.enable_gqa_equals_repeat_interleave_maxabs+
      '\n# max |repeat - repeat_interleave|     = '+o.repeat_instead_of_repeat_interleave_maxabs.toFixed(2)+'   (no error: the wrong heads are paired)'+
      '\n# query head -> KV head, repeat_interleave: '+o.head_to_kv_repeat_interleave.join(' ')+'\n# query head -> KV head, repeat:            '+o.head_to_kv_repeat.join(' ')+'</div>';
  }
  A.$('at-code').innerHTML=h;
})();
