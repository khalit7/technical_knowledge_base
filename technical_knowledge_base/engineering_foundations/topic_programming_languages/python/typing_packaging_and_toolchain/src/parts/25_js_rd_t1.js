// ---- Reading section 1: the prediction before the five-mistakes table ----
(function(){
  const el=document.getElementById('tk-drill-t1');if(!el||!window.PBU)return;
  PBU.drill(el,'Predict: which of the five mistakes will <b>neither</b> checker report?',
    [{t:'1. a role that is not allowed',right:false},{t:'2. the overload returns list[int]',right:false},{t:'3. a value that may be None',right:false},
     {t:'4. str + int inside an unannotated function',right:true},{t:'5. int has no close()',right:false}],
    'Mistake 4, the only one that actually crashes: its function has no annotations, so the checkers treat the argument as "any type". The table below has the real verdicts.');
})();
