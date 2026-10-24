// ---- Reading tab, section 3: Ben's last credit spent from two tabs, three ways (outcomes measured on PostgreSQL, see RDD.M.credits) ----
(function(){
  const card=document.getElementById('rd-tx-card');if(!card)return;
  const lanes=document.getElementById('rd-tx-lanes'),cap=document.getElementById('rd-tx-cap'),cnt=document.getElementById('rd-tx-cnt'),note=document.getElementById('rd-tx-note');
  const M=RDD.M;
  // each step: [tab A text, database text, tab B text, balance after, messages sent after, caption title, caption]
  const S={
    naive:[
      ['','balance = 1','',1,0,'Start','Ben has 1 credit. Both tabs press send at the same moment.'],
      ['BEGIN; read balance: 1','','',1,0,'Tab A reads','Tab A starts a transaction and reads the balance: 1.'],
      ['','','BEGIN; read balance: 1',1,0,'Tab B reads','Tab A has not written anything yet, so tab B also reads 1. Nothing stops it: reading never blocks.'],
      ['1 &gt; 0: call model, save reply, write balance 0','balance = 0 (not yet committed)','',1,0,'Tab A writes','Tab A decides Ben can pay, saves the reply and writes 1 - 1 = 0.'],
      ['COMMIT','balance = 0; 1 message','',0,1,'Tab A commits','Tab A\'s changes become visible to everyone.'],
      ['','balance = 0; 2 messages','its read said 1 &gt; 0: save reply, write 1 - 1 = 0; COMMIT',0,2,'Tab B writes the same 0','Tab B decided on the 1 it read earlier. It writes 0 over 0 and commits. No error anywhere.'],
      ['','2 replies, 1 credit charged','',0,2,'Result: a lost update','Two answers for one credit. The constraint "balance never below zero" was never violated, so the database had nothing to refuse. Measured on PostgreSQL '+M.pg+': both messages saved, balance '+M.credits.naive.balance+'.']],
    lock:[
      ['','balance = 1','',1,0,'Start','Same race, but each tab reads with SELECT balance ... FOR UPDATE.'],
      ['BEGIN; read FOR UPDATE: 1 (row locked)','row locked by A','',1,0,'Tab A locks the row','Reading FOR UPDATE takes a lock on Ben\'s credits row until tab A commits.'],
      ['','row locked by A','BEGIN; read FOR UPDATE ... waits',1,0,'Tab B waits','Tab B asks for the same lock and is made to wait. This is the price: tab B is blocked.'],
      ['save reply, write balance 0','balance = 0 (not yet committed)','... waiting',1,0,'Tab A writes','Tab A saves the reply and writes 0.'],
      ['COMMIT (lock released)','balance = 0; 1 message','',0,1,'Tab A commits','The lock is released.'],
      ['','','read returns 0: "out of credits", ROLLBACK',0,1,'Tab B reads the new value','Tab B\'s read finally returns, and it sees the committed 0. It refuses to send.'],
      ['','1 reply, 1 credit charged','',0,1,'Result: correct','One answer for one credit. Measured: one message saved, balance '+M.credits.lock.balance+'.']],
    serializable:[
      ['','balance = 1','',1,0,'Start','Same race; both transactions run at the serializable level.'],
      ['BEGIN (serializable); read: 1','','',1,0,'Tab A reads','Tab A reads 1 from its snapshot.'],
      ['','','BEGIN (serializable); read: 1',1,0,'Tab B reads','Tab B also reads 1. No locks, no waiting so far.'],
      ['save reply, write balance 0; COMMIT','balance = 0; 1 message','',0,1,'Tab A commits','Tab A finishes first.'],
      ['','','save reply, write balance 0 ... ERROR',0,1,'Tab B is refused','Tab B tries to update a row changed by a transaction that committed after B\'s snapshot. Postgres answers "'+M.credits.serializable.err+'" (measured) and the whole transaction is rolled back, including the reply it had saved: atomicity.'],
      ['','','retry: BEGIN; read: 0; "out of credits"',0,1,'Tab B retries','The application catches the error and runs the transaction again. This time it reads 0.'],
      ['','1 reply, 1 credit charged','',0,1,'Result: correct, at the cost of a retry','Measured: one message saved, balance '+M.credits.serializable.balance+'. Your code must be written to retry; without the retry, Ben just sees an error.']]
  };
  let mode='naive';
  function draw(i){
    const st=S[mode],cur=st[i];
    let h='<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;font-size:12.5px">'+
      '<div class="small"><b>Tab A</b></div><div class="small" style="text-align:center"><b>Database</b></div><div class="small" style="text-align:right"><b>Tab B</b></div>';
    for(let k=1;k<=i;k++){const r=st[k];const on=k===i?'background:var(--hl);':'';
      h+='<div style="'+on+'border-left:3px solid var(--c1);padding:2px 6px;min-width:0">'+r[0]+'</div><div style="'+on+'text-align:center;color:var(--mute);padding:2px 4px;min-width:0">'+r[1]+'</div><div style="'+on+'border-right:3px solid var(--c2);padding:2px 6px;text-align:right;min-width:0">'+r[2]+'</div>';}
    lanes.innerHTML=h+'</div>';
    const bad=cur[4]===2;
    cnt.innerHTML=RD.stat('Balance',cur[3])+RD.stat('Replies sent',cur[4])+RD.stat('Credits charged',Math.min(cur[4],1))+RD.stat('Outcome',i<st.length-1?'running':(bad?'<span style="color:var(--bad)">double spend</span>':'<span style="color:var(--good)">correct</span>'));
    cap.innerHTML='<div class="t">'+cur[5]+'</div><p>'+cur[6]+'</p>';
  }
  const a=RD.anim({card:'rd-tx-card',ctl:'rd-tx-ctl',n:S.naive.length,ms:1900,label:'Transaction step',draw});
  RD.seg(document.getElementById('rd-tx-mode'),m=>{mode=m;a.reset(S[m].length);a.play()});
  note.innerHTML='Outcomes measured on '+M.date+' with two real psql sessions against PostgreSQL '+M.pg+' (script: src/read/measure_read.py); the half-second pause between read and write stands in for the model call. The steps between are the order Postgres documents for each level.';
})();
