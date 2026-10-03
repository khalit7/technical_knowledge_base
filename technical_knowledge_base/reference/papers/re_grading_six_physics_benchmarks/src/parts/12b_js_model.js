// ---- The audit model shared by the defect-floor chart, the simulator and the third predict question ----
// Presets come from each benchmark's audit counts (Table 2, Appendix B.3), one response per question:
// d = benchmark errors / questions, a = 1 - model errors / valid questions, g = grader errors / correct valid answers.
const PRESET={};
T.t2.forEach(r=>{const f=T.funnel[r.b],N=f.sample||f.pool,V=N-r.Q,C=V-r.M;PRESET[r.b]={N,d:r.Q/N,a:C/V,g:C?r.G/C:0,f:0,c:0,e:0,rej:r.rej}});
// Expected counts for N questions. f: judge accepts a wrong answer; c: a defective question is accepted anyway;
// e: reviewers label a genuine model error as a benchmark error (so it is excluded).
function auditSim(p){const N=p.N,V=(1-p.d)*N,Dq=p.d*N,C=p.a*V,W=(1-p.a)*V;
  const accC=C*(1-p.g),accW=W*p.f,accQ=Dq*p.c,G=C*p.g,Mr=W*(1-p.f),Q=Dq*(1-p.c),Mx=Mr*p.e,Mk=Mr-Mx;
  const kept=N-Q-Mx,acc=accC+accW+accQ;
  return {N,accC,accW,accQ,G,Mk,Mx,Q,kept,raw:acc/N,prot:(acc+G)/kept,truth:p.a,rej:G+Mr+Q,unseen:accW+accQ}}
