// ---- Section 4 (DynamoDB): the measured access patterns and the raw definitions ----
(function(){
  const D=NQ.ddb; if(!D)return;
  const el=id=>document.getElementById(id), f0=n=>n==null?'all':Math.round(n).toLocaleString('en-US');
  const KEY={'AP1 user profile':'GetItem PK=USER#u, SK=PROFILE','AP2 user by email':'GetItem PK=EMAIL#e, SK=EMAIL','AP3 chat list, most recent first':'Query GSI1: GSI1PK=USER#u, descending, Limit 20',
    'AP4 latest 50 messages':'Query PK=CHAT#7, SK begins_with MSG#, descending, Limit 50','AP4 latest 50, strongly consistent':'same, ConsistentRead=true',
    'AP5 messages of one day':'Query PK=CHAT#7, SK between MSG#2025-09-10 and MSG#2025-09-11','AP6 usage for September':'Query PK=USER#u, SK begins_with USAGE#2025-09',
    'Wrong: latest 50 by Scan + filter (no key)':'Scan, filter PK = CHAT#7 (first page, Limit 1000)','Wrong: one model across all chats (full Scan)':'Scan every page'};
  el('rd-ddb-ap').innerHTML='<table><tr><th>Access pattern</th><th>Request</th><th class="num">Items returned</th><th class="num">Items read</th><th class="num">Read units</th></tr>'+
    D.access_patterns.map(a=>{const bad=a.label.startsWith('Wrong');return '<tr'+(bad?' style="color:var(--bad)"':'')+'><td>'+a.label.replace(/^AP\d /,'')+'</td><td><code>'+(KEY[a.label]||a.op)+'</code></td><td class="num">'+(a.count==null?'n/a':f0(a.count))+'</td><td class="num">'+f0(a.scanned)+'</td><td class="num">'+a.capacity+'</td></tr>'}).join('')+'</table>';
  const ct=D.create_table;
  el('rd-ddb-raw').textContent='# boto3 create_table (DynamoDB Local 3.3.1)\n'+JSON.stringify(ct,null,1)+'\n\n# errors returned\n'+Object.entries(D.errors).map(([k,v])=>k+':\n  '+v).join('\n')+
    '\n\n# registration with an email that exists\n'+JSON.stringify(D.register)+'\n\n# write units: one message put '+D.put_wru+'; message + chat update in one transaction '+D.append_txn_wru;
})();
