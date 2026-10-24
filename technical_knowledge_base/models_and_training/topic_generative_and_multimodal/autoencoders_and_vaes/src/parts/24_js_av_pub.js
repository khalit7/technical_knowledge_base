// ---- Reading section 10: token arithmetic (the published-tokenizer table is static HTML, from src/make_pub_table.mjs) ----
(function(){
  const f=document.getElementById('av-tc-f'),r=document.getElementById('av-tc-r'),k=document.getElementById('av-tc-k'),out=document.getElementById('av-tc-out');
  if(!f)return;
  function calc(){const s=+r.value/ +f.value,n=s*s,K=+k.value,bits=n*Math.log2(K);
    out.innerHTML=RD.stat('Tokens per image',n.toLocaleString('en-GB'),'('+s+' &times; '+s+')')+RD.stat('Bits per image',Math.round(bits).toLocaleString('en-GB'),Math.log2(K).toFixed(1)+' bits per token')+
      RD.stat('Compression',(+r.value*+r.value*24/bits).toFixed(0)+'&times;','against 24-bit RGB pixels')+RD.stat('Attention pairs',(n*n/1048576).toFixed(n*n<1048576?3:1)+'&times;','of 1,024 tokens (Chameleon)')}
  [f,r,k].forEach(x=>x.addEventListener('change',calc));calc();
})();
