// ---- Single-table lab (DynamoDB key design for the chat product) ----
// Rules: GetItem needs the full primary key; Query needs the partition key (equality) and optionally a sort key condition
// (=, <, >, between, begins_with) and returns items in sort-key order; a GSI is queried the same way but is eventually consistent;
// anything else is a Scan (every item read). Item counts come from the DynamoDB Local run (measure/m_ddb.py).
(function(){
  const D=window.NQ&&NQ.ddb; if(!D)return;
  const el=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt=n=>n>=1e9?(n/1e9).toFixed(n>=1e10?0:1)+' billion':n>=1e6?(n/1e6).toFixed(n>=1e7?0:1)+' million':Math.round(n).toLocaleString('en-US');
  const usd=n=>n>=1000?'$'+Math.round(n).toLocaleString('en-US'):n>=10?'$'+n.toFixed(0):'$'+n.toFixed(2);
  // the choices; each option: label shown, key template
  const OPT={
    userPK:[['USER#{userId}','u'],['EMAIL#{email}','e']],
    userSK:[['PROFILE','p'],['(no sort key)','n']],
    emailItem:[['a separate item PK = EMAIL#{email} pointing at the user','on'],['none','off']],
    chatPK:[['USER#{userId}','u'],['CHAT#{chatId}','c']],
    chatSK:[['CHAT#{chatId}','id'],['CHAT#{createdAt}#{chatId}','ct'],['META','m']],
    gsi1:[['GSI1: PK = USER#{userId}, SK = LAST#{lastMessageAt}','on'],['none','off']],
    msgPK:[['CHAT#{chatId}','c'],['MSG#{messageId}','m'],['USER#{userId}','u']],
    msgSK:[['MSG#{createdAt}#{messageId}','t'],['MSG#{messageId}','i'],['(no sort key)','n']],
    usePK:[['USER#{userId}','u'],['USAGE#{userId}#{day}','d']],
    useSK:[['USAGE#{day}','d'],['(no sort key)','n']],
    gsi2:[['GSI2: PK = MODEL#{model}#{day}, SK = {createdAt}','on'],['none','off']]
  };
  const PRE={
    st:{userPK:'u',userSK:'p',emailItem:'on',chatPK:'u',chatSK:'id',gsi1:'on',msgPK:'c',msgSK:'t',usePK:'u',useSK:'d',gsi2:'off'},
    rel:{userPK:'u',userSK:'n',emailItem:'off',chatPK:'c',chatSK:'m',gsi1:'off',msgPK:'m',msgSK:'n',usePK:'d',useSK:'n',gsi2:'off'},
    bad:{userPK:'u',userSK:'p',emailItem:'on',chatPK:'u',chatSK:'id',gsi1:'on',msgPK:'m',msgSK:'n',usePK:'u',useSK:'d',gsi2:'off'}
  };
  let cur=Object.assign({},PRE.st), sel='ap4';
  const N=D.load, TOTAL=D.items_total, perUserChats=N.chats/N.users, longMsgs=D.long_chat_messages, perUserMsgs=N.messages/N.users;
  const B=D.item_bytes; // mean bytes per item kind, as DynamoDB counts them
  const rcu=(items,bytes,eventual)=>Math.max(eventual?0.5:1,Math.ceil(items*bytes/4096)*(eventual?0.5:1));
  // evaluate one access pattern under the current design: kind 0 good, 1 GSI, 2 extra work, 3 scan
  function ev(id){
    const c=cur, scan=(what)=>({k:3,op:'Scan + filter',read:TOTAL,ret:what.ret,why:what.why,rcu:rcu(TOTAL,B.avg,true)});
    if(id==='ap1'){
      if(c.userPK==='u')return {k:0,op:c.userSK==='p'?'GetItem(PK=USER#7, SK=PROFILE)':'GetItem(PK=USER#7)',read:1,ret:1,rcu:0.5,why:'The user id is the whole key, so one GetItem reads exactly one item.'};
      return scan({ret:1,why:'Users are keyed by email, and this request only knows the user id. With no key to name, DynamoDB must read every item and filter.'});
    }
    if(id==='ap2'){
      if(c.userPK==='e')return {k:0,op:'GetItem(PK=EMAIL#ada@example.com)',read:1,ret:1,rcu:0.5,why:'Users are keyed by email, so login is one GetItem (but every request that knows only the user id now needs a scan: see the first pattern).'};
      if(c.emailItem==='on')return {k:2,op:'GetItem(EMAIL#...) then GetItem(USER#...)',read:2,ret:1,rcu:1,why:'A small lookup item maps the email to the user id; two GetItems in a row. The lookup item is also how you enforce unique emails: write both items in one transaction with attribute_not_exists, as measured in section 4.5.'};
      return scan({ret:1,why:'Nothing is keyed by email: a scan reads the whole table to find one user. A GSI on email would also work (eventually consistent, cannot enforce uniqueness).'});
    }
    if(id==='ap3'){
      if(c.gsi1==='on')return {k:1,op:'Query GSI1 (PK=USER#7, SK begins_with LAST#) descending, Limit 20',read:Math.min(20,perUserChats),ret:Math.min(20,perUserChats),rcu:rcu(Math.min(20,perUserChats),B.chat,true),why:'GSI1 re-sorts the user\'s chats by last activity, so the chat list is one Query that reads only the chats it shows. Every new message must update the chat\'s GSI1SK, which costs two index writes (delete the old index entry, put the new one).'};
      if(c.chatPK==='u')return {k:2,op:'Query(PK=USER#7, SK begins_with CHAT#), sort in the app',read:Math.round(perUserChats),ret:Math.min(20,Math.round(perUserChats)),rcu:rcu(perUserChats,B.chat,true),why:'One Query returns all of the user\'s chats, but sorted by '+(c.chatSK==='ct'?'creation time':'chat id')+', not by last activity: the app reads every chat and sorts. Fine for a few dozen chats, wasteful for a few thousand.'};
      return scan({ret:20,why:'Chats are keyed by their own id, so "the chats of user 7" is not a key: a scan reads everything. This is the join a relational database would do for you.'});
    }
    if(id==='ap4'||id==='ap5'){
      const n=id==='ap4'?50:Math.round(longMsgs/35);
      if(c.msgPK==='c'){
        if(c.msgSK==='t')return {k:0,op:id==='ap4'?'Query(PK=CHAT#7, SK begins_with MSG#) descending, Limit 50':'Query(PK=CHAT#7, SK between MSG#2025-09-10 and MSG#2025-09-11)',read:n,ret:n,rcu:rcu(n,B.msg,true),why:'Messages of one chat share a partition key and are sorted by time inside it, so the newest 50 (or one day) are contiguous: one Query reads exactly the items it returns. Measured on DynamoDB Local: '+D.ap4.count+' items returned, '+D.ap4.scanned+' read, '+D.ap4.capacity+' read units.'};
        if(c.msgSK==='i'&&id==='ap4')return {k:0,op:'Query(PK=CHAT#7) descending, Limit 50',read:n,ret:n,rcu:rcu(n,B.msg,true),why:'Works only because message ids grow with time (a Snowflake id or a ULID does; a random UUID would not). With random ids the newest 50 are scattered through the partition.'};
        return {k:2,op:'Query(PK=CHAT#7), filter on created_at',read:longMsgs,ret:n,rcu:rcu(longMsgs,B.msg,true),why:'The chat is one partition, but nothing inside it is sorted by time: the Query reads the whole chat ('+fmt(longMsgs)+' messages) and a filter throws most away. Filters do not reduce what you pay: read units count items read, not items returned.'};
      }
      if(c.msgPK==='u')return {k:2,op:'Query(PK=USER#7), filter chat = 7',read:Math.round(perUserMsgs),ret:n,rcu:rcu(perUserMsgs,B.msg,true),why:'Messages are grouped by user, so every message of every chat of that user is read and filtered.'};
      return scan({ret:n,why:'Each message is its own partition (keyed by message id): "the newest messages of chat 7" names no key, so DynamoDB reads every item in the table. Measured on DynamoDB Local: a Scan with this filter read '+fmt(D.scan.scanned)+' items in its first page to return '+D.scan.count+'.'});
    }
    if(id==='ap6'){
      if(c.usePK==='u'&&c.useSK==='d')return {k:0,op:'Query(PK=USER#7, SK begins_with USAGE#2025-09)',read:30,ret:30,rcu:rcu(30,B.usage,true),why:'One item per user per day, all under the user\'s partition, sorted by day: one Query for the month. Each request adds its tokens with UpdateItem ADD, an atomic counter.'};
      if(c.usePK==='d')return {k:2,op:'BatchGetItem of 30 keys (one per day)',read:30,ret:30,rcu:15,why:'Each day is its own partition. You can still build all 30 keys yourself and fetch them in one BatchGetItem (up to 100 keys), but every new question ("the last 90 days") means more keys.'};
      return {k:2,op:'Query(PK=USER#7) then filter',read:30,ret:30,rcu:rcu(30,B.usage,true),why:'Without a day in the sort key the month cannot be selected by key.'};
    }
    if(id==='ap7'){
      if(c.gsi2==='on')return {k:1,op:'Query GSI2 (PK=MODEL#large#2025-09-10)',read:Math.round(N.messages/35/4),ret:Math.round(N.messages/35/4),rcu:rcu(N.messages/35/4,B.msg,true),why:'Answers the question, but every message of one model on one day lands on one index partition: at product scale that partition takes a quarter of all writes and hits the 1,000 writes per second limit (see Hot partitions below). Questions across all chats belong in an analytics copy (export to S3, then DuckDB or Athena), not in DynamoDB keys.'};
      return scan({ret:Math.round(N.messages/35/4),why:'A question across every chat names no key: only a scan answers it. DynamoDB is the wrong tool; export the table to S3 (in full, or incrementally every 15 minutes to 24 hours) and ask DuckDB, Athena or a warehouse.'});
    }
  }
  const APS=[['ap1','User profile by user id'],['ap2','Log in: find the user by email'],['ap3','Chat list: a user\'s chats, most recently active first'],
    ['ap4','Open a chat: its latest 50 messages'],['ap5','Messages of one chat on one day'],['ap6','A user\'s token usage for September'],['ap7','Admin: every message of model "large" on one day']];
  const LAB={userPK:'User partition key',userSK:'User sort key',emailItem:'Email lookup',chatPK:'Chat partition key',chatSK:'Chat sort key',gsi1:'Index for the chat list',
    msgPK:'Message partition key',msgSK:'Message sort key',usePK:'Usage partition key',useSK:'Usage sort key',gsi2:'Index for the admin question'};
  const GROUPS=[['User',['userPK','userSK','emailItem']],['Chat',['chatPK','chatSK','gsi1']],['Message',['msgPK','msgSK']],['Daily usage',['usePK','useSK']],['Analytics',['gsi2']]];
  function keysUI(){
    el('lab-keys').innerHTML=GROUPS.map(([g,ks])=>'<div class="ent"><b>'+g+'</b>'+ks.map(k=>'<label>'+LAB[k]+' <select data-k="'+k+'">'+OPT[k].map(([t,v])=>'<option value="'+v+'"'+(cur[k]===v?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>').join('')+'</div>').join('');
  }
  el('lab-keys').addEventListener('change',e=>{const s=e.target.closest('select');if(!s)return;cur[s.dataset.k]=s.value;
    if(s.dataset.k==='userPK'&&s.value==='e'&&cur.userSK==='p')cur.userSK='p';
    el('lab-presets').querySelectorAll('button').forEach(b=>b.classList.remove('on'));draw()});
  el('lab-presets').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=Object.assign({},PRE[b.dataset.p]);
    el('lab-presets').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));keysUI();draw()});
  el('lab-aps').addEventListener('click',e=>{const a=e.target.closest('.ap');if(!a)return;sel=a.dataset.id;draw()});
  // sample items under the current design
  function items(){
    const c=cur,rows=[];
    const user=u=>{const pk=c.userPK==='u'?'USER#'+u:'EMAIL#user'+u+'@example.com';rows.push({pk,sk:c.userSK==='p'?'PROFILE':'',t:'user',a:'email=user'+u+'@example.com',g:''})};
    const chat=(u,ch,last)=>{const pk=c.chatPK==='u'?'USER#'+u:'CHAT#'+ch;const sk=c.chatSK==='id'?'CHAT#'+ch:c.chatSK==='ct'?'CHAT#2025-09-0'+(ch%9+1)+'#'+ch:'META';
      rows.push({pk,sk,t:'chat',a:'title=Chat '+ch,g:c.gsi1==='on'?'GSI1: USER#'+u+' / LAST#'+last:''})};
    const msg=(u,ch,i,ts)=>{const id=String(400000+ch*1000+i).padStart(9,'0');const pk=c.msgPK==='c'?'CHAT#'+ch:c.msgPK==='u'?'USER#'+u:'MSG#'+id;
      const sk=c.msgSK==='t'?'MSG#'+ts+'#'+id:c.msgSK==='i'?'MSG#'+id:'';rows.push({pk,sk,t:'message',a:'tokens='+(40+i*7),g:c.gsi2==='on'?'GSI2: MODEL#large#'+ts.slice(0,10):'',ch,i})};
    const use=(u,d)=>{const pk=c.usePK==='u'?'USER#'+u:'USAGE#'+u+'#2025-09-'+d;rows.push({pk,sk:c.useSK==='d'&&c.usePK==='u'?'USAGE#2025-09-'+d:'',t:'usage',a:'tokens='+(1200*d),g:''})};
    user(7);if(c.emailItem==='on'&&c.userPK!=='e')rows.push({pk:'EMAIL#user7@example.com',sk:c.userSK==='p'?'EMAIL':'',t:'email',a:'user=7',g:''});
    chat(7,7,'2025-10-05T21:58:12Z');chat(7,1203,'2025-10-02T08:00:41Z');
    for(let i=0;i<4;i++)msg(7,7,i,'2025-10-05T21:5'+(i*2)+':0'+i+'Z');
    msg(7,1203,0,'2025-10-02T08:00:41Z');use(7,'09');use(7,'10');user(12);
    const ord=r=>r.pk+'\u0000'+r.sk; rows.sort((a,b)=>ord(a)<ord(b)?-1:ord(a)>ord(b)?1:0);
    return rows;
  }
  function hitRow(r,e){
    if(e.k===3)return true;
    if(sel==='ap1')return r.t==='user';
    if(sel==='ap2')return r.t==='email'||(cur.userPK==='e'&&r.t==='user')||(e.k===2&&r.t==='user');
    if(sel==='ap3')return r.t==='chat';
    if(sel==='ap4'||sel==='ap5')return r.t==='message'&&(r.ch===7||cur.msgPK==='u');
    if(sel==='ap6')return r.t==='usage';
    if(sel==='ap7')return r.t==='message';
    return false;
  }
  function draw(){
    let score=[0,0,0,0];
    el('lab-aps').innerHTML=APS.map(([id,t])=>{const e=ev(id);score[e.k]++;return '<div class="ap k'+e.k+(id===sel?' sel':'')+'" data-id="'+id+'" role="button" tabindex="0"><span class="nm">'+esc(t)+'</span><span class="op">'+esc(e.op)+'</span><span class="m">reads '+fmt(e.read)+' item'+(e.read===1?'':'s')+' to return '+fmt(e.ret)+'; about '+(e.rcu<1?e.rcu:fmt(e.rcu))+' read unit'+(e.rcu===1?'':'s')+' (eventually consistent)</span></div>'}).join('');
    el('lab-score').innerHTML='<b>'+(score[0]+score[1])+' of '+APS.length+'</b> questions are a single keyed request; '+score[2]+' need extra work; '+score[3]+' scan the table.';
    const e=ev(sel);el('lab-why').innerHTML='<b>'+esc(APS.find(a=>a[0]===sel)[1])+':</b> '+esc(e.why);
    const rs=items();let last='';
    el('lab-items').innerHTML='<table class="it"><tr><th>PK (partition key)</th><th>SK (sort key)</th><th>type</th><th>attributes</th>'+(rs.some(r=>r.g)?'<th>index keys</th>':'')+'</tr>'+
      rs.map(r=>{const same=r.pk===last;last=r.pk;return '<tr class="'+(hitRow(r,e)?'hit':'')+'"><td class="pk">'+(same?'':esc(r.pk))+'</td><td>'+esc(r.sk||' ')+'</td><td>'+r.t+'</td><td>'+esc(r.a)+'</td>'+(rs.some(x=>x.g)?'<td>'+esc(r.g)+'</td>':'')+'</tr>'}).join('')+'</table>';
    hot();
  }
  el('lab-aps').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const a=e.target.closest('.ap');if(a){e.preventDefault();sel=a.dataset.id;draw()}}});
  // hot partition and cost
  const P=D.prices;
  function hot(){
    const w=+el('lab-w').value,s=+el('lab-s').value,md=Math.pow(10,+el('lab-md').value),rr=+el('lab-rr').value;
    el('lab-w-v').textContent=fmt(w)+'/s';el('lab-s-v').textContent=s;el('lab-md-v').textContent=fmt(md);el('lab-rr-v').textContent=rr;
    const per=w/s, over=per>1000;
    const wpm=P.wru_per_message, rpm=P.rru_per_read; // from the page's formulas (see note)
    const odW=md*30*wpm*P.od_wru, odR=md*30*rr*rpm*P.od_rru;
    const avgW=md*wpm/86400, avgR=md*rr*rpm/86400, peak=3;
    const prW=avgW*peak*P.pr_wcu_h*730, prR=avgR*peak*P.pr_rcu_h*730;
    const gsi2=cur.gsi2==='on'?md/86400/4*peak:0;
    el('lab-hot-out').innerHTML=RD.stat('Writes per partition',fmt(per)+'/s',over?'<span style="color:var(--bad)">over the 1,000 a second limit: throttled</span>':'under the 1,000 a second limit')+
      RD.stat('Reading "latest 50"',s===1?'1 Query':s+' Queries','one per shard, merged in the app')+
      RD.stat('On-demand, a month',usd(odW+odR),'writes '+usd(odW)+', reads '+usd(odR))+
      RD.stat('Provisioned, a month',usd(prW+prR),'sized for a peak 3x the average (assumed)')+
      (cur.gsi2==='on'?RD.stat('GSI2 busiest partition',fmt(gsi2)+'/s',gsi2>1000?'<span style="color:var(--bad)">hot: over 1,000 writes a second</span>':'under the limit at this volume'):'');
    el('lab-cost-note').innerHTML='Prices for US East (N. Virginia), standard table class, read on '+P.date+': on-demand $'+P.od_wru*1e6+' per million write units and $'+P.od_rru*1e6+' per million read units; provisioned $'+P.pr_wcu_h+' per write unit-hour and $'+P.pr_rcu_h+' per read unit-hour; storage $'+P.storage_gb_month+' per GB-month (not included above). '+
      'Each message costs '+wpm+' write units here: DynamoDB Local charged that for the transaction that puts the message and moves the chat to the top of the chat list (Reading section 4.4); by the documented rules, each transactional write costs 2 units per KB and moving an index entry costs 2 more. Each read of "latest 50" costs '+rpm+' read units: 50 messages of about '+B.msg+' bytes is '+Math.ceil(50*B.msg/1024)+' KB, rounded up to 4 KB blocks, halved for eventual consistency. A month is 30 days for requests and 730 hours for capacity. '+
      'Write sharding spreads one hot key over N keys but every reader must query all N.';
  }
  ['lab-w','lab-s','lab-md','lab-rr'].forEach(id=>el(id).addEventListener('input',hot));
  el('lab-data').textContent=fmt(N.users)+' users, '+fmt(N.chats)+' chats and '+fmt(N.messages)+' messages ('+fmt(TOTAL)+' items in all), chat 7 holding '+fmt(longMsgs)+' messages';
  keysUI();draw();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-lab']=window.TAB_RENDER['t-lab']||[]).push(draw);
})();
