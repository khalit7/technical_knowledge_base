// ---- Section 8: crossing shards, measured (pairs of bars, each pair on its own scale) ----
(function(){
  const S=window.SC,el=document.getElementById('xsBars');if(!S||!el)return;const C=S.citus;
  const f=(x,d)=>x.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const P=[['Log in by email (sharded by user, so all 32 shards are asked)','one node',C.point.login_email.big.p50,3,'all 32 shards',C.point.login_email.citus.p50,2],
    ['Join chats to chat_tags','one Postgres',C.joinBig,0,'repartition join',C.repart,0],
    ['Update two users in one transaction (two workers need two-phase commit)','one shard',C.tx.one_shard.p50,2,'two-phase commit',C.tx.two_nodes_2pc.p50,2]];
  el.innerHTML=P.map(p=>{const m=Math.max(p[2],p[5]);
    return '<p class="small" style="margin:8px 0 2px"><b>'+p[0]+'</b>: '+f(p[5]/p[2],1)+'x</p>'+
      '<div class="row"><span class="nm">'+p[1]+'</span><span class="track"><span class="fill" style="width:'+(100*p[2]/m)+'%;background:var(--c3)"></span></span><span class="val">'+f(p[2],p[3])+' ms</span></div>'+
      '<div class="row"><span class="nm">'+p[4]+'</span><span class="track"><span class="fill" style="width:'+(100*p[5]/m)+'%;background:var(--c2)"></span></span><span class="val">'+f(p[5],p[6])+' ms</span></div>'}).join('');
})();
