// ---- Shard-key lab ----
(function(){
  const S=window.SC;if(!S||!document.getElementById('t-lab'))return;
  const $=id=>document.getElementById(id);
  const f=(x,d)=>x.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const PAT=[
   ['Open a chat (latest 50 messages)',{user_hash:'one',chat_hash:'one',country:'one',user_range:'one',month_range:'all'}],
   ['A user\'s chat list',{user_hash:'one',chat_hash:'all',country:'one',user_range:'one',month_range:'all'}],
   ['Send a message (write)',{user_hash:'one',chat_hash:'one',country:'one',user_range:'one',month_range:'hot'}],
   ['Log in by email',{user_hash:'all',chat_hash:'all',country:'all',user_range:'all',month_range:'all'}],
   ['Delete a user\'s data',{user_hash:'one',chat_hash:'all',country:'one',user_range:'one',month_range:'all'}],
   ['Search my own messages',{user_hash:'one',chat_hash:'all',country:'one',user_range:'one',month_range:'all'}],
   ['Admin: all messages mentioning X',{user_hash:'all',chat_hash:'all',country:'all',user_range:'all',month_range:'all'}],
   ['Dashboard: tokens per model, last 7 days',{user_hash:'all',chat_hash:'all',country:'all',user_range:'all',month_range:'hot'}],
   ['Keep EU users\' data on EU servers',{user_hash:'no',chat_hash:'no',country:'one',user_range:'no',month_range:'no'}]];
  const WHY={user_hash:'Hashing spreads users evenly, and a user\'s chats and messages stay together, so everything one user does is single-shard. The busiest user holds '+f(100*S.lab.top.user.share,3)+'% of messages: no single key is a problem in this data.',
    chat_hash:'Even, and opening a chat is single-shard, but a user\'s chats are scattered, so the chat list and account deletion fan out.',
    country:'Each country lives on one shard, which suits data residency, but countries are very uneven: the US alone is '+f(100*S.lab.top.country[0][2],1)+'% of messages, so adding shards stops helping once one shard holds the US.',
    user_range:'Ranges of user ids are equal in size but not in load: the oldest users (low ids) have the most chats, so the first shard is hot. Hashing the same key fixes it.',
    month_range:'Old months spread over the shards, but all new writes land on the newest shard. Range by time is right for partitions inside one server (Reading section 4), wrong for shards.'};
  function draw(){
    const key=$('lbKey').value,N=+$('lbN').value,met=+$('lbMet').value,G=+$('lbG').value/100;$('lbNv').textContent=N;$('lbGv').textContent=Math.round(G*100)+'%';
    let a=S.lab.byN[String(N)][key][met].slice();const t=a.reduce((x,y)=>x+y,0)||1;let sh=a.map(x=>x/t*(1-G));
    if(G>0){sh[0]+=G}
    const mx=Math.max(...sh),even=1/N,ratio=mx/even;
    const top=Math.max(mx*1.1,even*2);
    $('lbBars').innerHTML=sh.map((v,i)=>'<i class="'+(v>1.5*even?'hot':'')+'" title="shard '+(i+1)+': '+f(100*v,1)+'%" style="height:'+(100*v/top)+'%"></i>').join('')+'<span class="even" style="bottom:'+(100*even/top)+'%"></span>';
    $('lbLab').innerHTML=sh.map((v,i)=>'<span>'+(N<=10?'s'+(i+1):(i+1))+'</span>').join('');
    const risk=ratio>2?'High':ratio>1.3?'Medium':'Low';
    $('lbOut').innerHTML=RD.stat('Fullest shard',f(100*mx,1)+'%','even share: '+f(100*even,1)+'% (dashed line)')+RD.stat('Fullest / even',f(ratio,2)+'x','the cluster is only as big as N / this ratio shards')+
      RD.stat('Hot-shard risk',risk,ratio>2?'one server takes over twice its share':'')+RD.stat('Effective shards',f(N/ratio,1),'of '+N+' (capacity actually usable)');
    $('lbWhy').textContent=WHY[key]+(G>0?' The giant tenant ('+Math.round(G*100)+'% of load, illustrative) sits on one shard whatever N is: its shard can never hold less than '+Math.round(G*100)+'%. Fixes: its own shard, a split key, caching.':'');
    const lab={one:['one shard','one'],all:['every shard ('+N+')','all'],hot:['one shard, hot','hot'],no:['not possible','all']};
    $('lbPat').innerHTML=PAT.map(p=>{const v=lab[p[1][key]];return '<div>'+p[0]+'</div><div><span class="pill '+v[1]+'">'+v[0]+'</span></div>'}).join('');
  }
  ['lbKey','lbN','lbMet','lbG'].forEach(id=>$(id).addEventListener('input',draw));
  draw();
})();
