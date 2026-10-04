// ---- Reading, Sagas: the "upgrade to Pro" action as a saga (success, failure with compensation) and as two-phase commit ----
(function(){
  const out=document.getElementById('rd-sg-out');if(!out)return;
  const st=(n,svc,txt,cls)=>'<div class="sg-st '+(cls||'')+'"><b>'+n+'. '+svc+'</b><span>'+txt+'</span></div>';
  const V={
    ok:'<div class="sg-row">'+st(1,'Payments','charge card, commit; publish "charged"','ok')+st(2,'Quota','raise quota to Pro, commit; publish "upgraded"','ok')+st(3,'E-mail','send receipt (cannot be undone, so it goes last)','ok')+'</div>'+
       '<p class="small">Three local transactions, each in its own service and database, each triggered by the previous one\'s event (via an outbox). Between steps 1 and 2 the user has paid but is not yet Pro: other code can see that half-done state.</p>',
    fail:'<div class="sg-row">'+st(1,'Payments','charge card, commit','ok')+st(2,'Quota','fails: account suspended','bad')+st('C1','Payments','compensate: refund the charge','comp')+'</div>'+
       '<p class="small">No rollback across services exists, so the saga runs a compensating transaction for every step that committed, in reverse order. The refund is a new business action (the customer sees a charge and a refund), and it too may be retried, so it must be idempotent (keyed by the saga id).</p>',
    tpc:'<div class="sg-row">'+st('1a','Coordinator','"prepare" to payments and quota','')+st('1b','Both','do the work, hold locks, vote yes','')+st(2,'Coordinator','"commit" to both','ok')+'</div>'+
       '<p class="small">Atomic: both commit or neither. But between 1b and 2 both participants hold locks and cannot decide alone; if the coordinator dies there, they wait ("blocks if the coordinator fails"). And the card processor and the e-mail provider cannot take part in your 2PC at all, which is why services use sagas.</p>'};
  function show(m){out.innerHTML=V[m]}
  RD.seg(document.getElementById('rd-sg-seg'),show);show('ok');
})();
