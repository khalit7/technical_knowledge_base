// ---- Reading, section 6: the local judge run (Qwen3-4B, both orders), filled from data/out/pending.json ----
(function(){
const P=window.PD,E=RD.esc,{f0,pc}=window.PDU;const J=P.pending&&P.pending.judge;const el=document.getElementById('pd-judge-out');if(!J||!el)return;
const s=[RD.stat('Pairs judged twice',f0(J.parsed),'of '+f0(J.pairs)+'; scores parsed from both replies'),
 RD.stat('First answer scored higher',pc(J.first_wins,J.decided,0),'of '+f0(J.decided)+' judgements that were not ties (50% = no position bias)'),
 RD.stat('Same verdict in both orders',pc(J.consistent,J.parsed,0),'consistent judgements'),
 RD.stat('Agrees with GPT-4 in both orders',pc(J.agree_both,J.parsed,0),'chosen scored higher both times'),
 RD.stat('Prefers the longer answer',pc(J.longer_pref,J.longer_n,0),'of '+f0(J.longer_n)+' consistent, untied verdicts')];
el.innerHTML='<div class="out">'+s.join('')+'</div><p class="small">Qwen3-4B (4-bit GGUF, llama.cpp, Apple M1 Pro GPU, 2026-10-16), thinking off, asked to score each answer 1 to 10; 300 UltraFeedback binarized pairs (seeded sample), each shown chosen-first and rejected-first. Mean score of the first-shown answer minus the second: '+(J.mean_first_minus_second>=0?'+':'')+(+J.mean_first_minus_second).toFixed(2)+' points. Pairs whose verdict flips with the order:</p>'+
 J.examples.slice(0,3).map(e=>'<div class="small" style="border:1px solid var(--line);border-radius:8px;padding:6px 9px;margin:6px 0;overflow-wrap:anywhere"><b>'+E(e.prompt)+'</b><br>chosen first: chosen '+e.ab.A+', rejected '+e.ab.B+'; rejected first: rejected '+e.ba.A+', chosen '+e.ba.B+' (GPT-4: '+e.gpt4[0]+' against '+e.gpt4[1]+')</div>').join('');
})();
