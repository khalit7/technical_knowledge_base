// ---- pass^k and pass@k from real tau2-bench trials (shared helpers, used by the Fig. 3 stage, the rank chart and the closed block) ----
window.PK=(function(){
  const C=(n,k)=>{if(k<0||k>n)return 0;let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return r};
  const tasks=s=>{const o=[];for(let i=0;i<s.tr.length;i+=4)o.push(s.tr.slice(i,i+4));return o};
  const cnt=t=>{let c=0;for(const ch of t)if(ch==='1')c++;return c};
  const hat=(c,n,k)=>C(c,k)/C(n,k), at=(c,n,k)=>1-C(n-c,k)/C(n,k);
  function metric(s,k,kind){const T=tasks(s);let sum=0;for(const t of T){const c=cnt(t);sum+=kind==='at'?at(c,4,k):hat(c,4,k)}return 100*sum/T.length}
  function hist(s){const h=[0,0,0,0,0];tasks(s).forEach(t=>h[cnt(t)]++);return h}
  const label=s=>s.m+(s.eff&&s.eff!=='None'?' ('+s.eff+')':'');
  const ok=()=>AG.tau.filter(s=>s.ok);
  return {C,tasks,cnt,hat,at,metric,hist,label,ok};
})();

// the real airline task card (Customer service); the Reading animation of pass^k is now the 3D stage in 38_js_sc_pk.js
(function(){
  const tc=document.getElementById('rd-tau-task');
  if(tc){const t=AG.tauTask,E=RD.esc;
    const op=AG.tau.filter(s=>s.ok&&s.dom==='airline').map(s=>{const v=PK.tasks(s)[0];return PK.label(s)+' '+v.split('').map(x=>x==='1'?'&#10003;':'&#10007;').join('')}).join('; ');
    tc.innerHTML='<div class="kv"><dt>Purpose</dt><dd>'+E(t.purpose)+'</dd><dt>Simulated user is told</dt><dd>'+E(t.reason)+' '+E(t.known)+'</dd><dt>and, if refused</dt><dd>'+E(t.instr)+'</dd>'+
      '<dt>Checked</dt><dd>reward basis '+t.basis.join(' + ')+'; expected actions: '+(t.actions.length?t.actions.length:'none (the database must not change)')+'; statement: "'+E(t.nl[0])+'"</dd>'+
      '<dt>Trials (4 each)</dt><dd>'+op+'</dd></div><p class="mute" style="margin:4px 0 0">From the released airline trajectory files (Sierra submissions, Feb to Mar 2026); the task is the same for every model.</p>'}
})();
