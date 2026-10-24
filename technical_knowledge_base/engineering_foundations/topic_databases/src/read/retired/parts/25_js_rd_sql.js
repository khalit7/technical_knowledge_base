// ---- Reading tab, section 2: one query evaluated clause by clause on the sample rows (computed live) ----
(function(){
  const card=document.getElementById('rd-sql-card');if(!card)return;
  const D=RDD,qEl=document.getElementById('rd-sql-q'),cap=document.getElementById('rd-sql-cap'),tab=document.getElementById('rd-sql-tab');
  const obj=(t)=>D[t].rows.map(r=>{const o={};D[t].cols.forEach((c,i)=>o[c]=r[i]);return o});
  const M=obj('messages'),C=obj('chats'),U=obj('users');
  // the query, line by line; each step highlights one line
  const lines=[
    '<span class="k">SELECT</span> u.name, count(*) <span class="k">AS</span> replies,',
    '       sum(m.tokens) <span class="k">AS</span> tokens',
    '<span class="k">FROM</span> messages m',
    '<span class="k">JOIN</span> chats c <span class="k">ON</span> c.id = m.chat_id',
    '<span class="k">JOIN</span> users u <span class="k">ON</span> u.id = c.user_id',
    '<span class="k">WHERE</span> m.role = \'assistant\'',
    '<span class="k">GROUP BY</span> u.name',
    '<span class="k">ORDER BY</span> tokens <span class="k">DESC</span>;'];
  // build the intermediate tables
  const s1=M.map(m=>({'m.id':m.id,'m.chat_id':m.chat_id,'m.role':m.role,'m.tokens':m.tokens}));
  const s2=s1.map(r=>{const c=C.find(c=>c.id===r['m.chat_id']);return Object.assign({},r,{'c.user_id':c.user_id,'c.title':c.title})});
  const s3=s2.map(r=>{const u=U.find(u=>u.id===r['c.user_id']);return Object.assign({},r,{'u.name':u.name})});
  const keep=s3.map(r=>r['m.role']==='assistant');
  const s4=s3.filter((r,i)=>keep[i]);
  const groups={};s4.forEach(r=>{(groups[r['u.name']]=groups[r['u.name']]||[]).push(r)});
  const s5=Object.keys(groups).map(k=>({'u.name':k,'rows in group':groups[k].map(r=>r['m.id']).join(', ')}));
  const s6=Object.keys(groups).map(k=>({'name':k,'replies':groups[k].length,'tokens':groups[k].reduce((a,r)=>a+r['m.tokens'],0)}));
  const s7=s6.slice().sort((a,b)=>b.tokens-a.tokens);
  function tbl(rows,opt){opt=opt||{};if(!rows.length)return '<p class="small">(no rows)</p>';const cols=Object.keys(rows[0]);
    return '<div><table class="mini"><tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr>'+rows.map((r,i)=>'<tr class="'+(opt.out&&opt.out[i]?'out':'')+(opt.hl&&opt.hl[i]?' hl':'')+'">'+cols.map(c=>'<td>'+RD.esc(r[c])+'</td>').join('')+'</tr>').join('')+'</table></div>'}
  const steps=[
    {l:[2],t:'1. FROM messages',p:'Start from every row of the table named in FROM: '+s1.length+' messages.',h:()=>tbl(s1)},
    {l:[3],t:'2. JOIN chats',p:'For each message, find the chat whose id equals the message\'s chat_id and glue its columns on. Each message has exactly one chat, so still '+s2.length+' rows, now wider.',h:()=>tbl(s2)},
    {l:[4],t:'3. JOIN users',p:'Same again through the chat\'s user_id: every row now knows its user\'s name. This is the foreign-key path from section 1, followed by the database instead of by your code.',h:()=>tbl(s3)},
    {l:[5],t:'4. WHERE',p:'Keep only rows where the condition is true: assistant replies. '+(s3.length-s4.length)+' rows are dropped (struck through), '+s4.length+' remain. Chen has no reply, so he is gone before grouping.',h:()=>tbl(s3,{out:keep.map(k=>!k)})},
    {l:[6],t:'5. GROUP BY u.name',p:'Rows with the same name are collected into one group each: '+s5.length+' groups.',h:()=>tbl(s5)},
    {l:[0,1],t:'6. SELECT',p:'Now the SELECT list is computed once per group: count(*) counts the rows in the group, sum(m.tokens) adds their tokens. SELECT is written first but evaluated almost last.',h:()=>tbl(s6)},
    {l:[7],t:'7. ORDER BY tokens DESC',p:'Finally sort the result, biggest first. This is the answer the app receives.',h:()=>tbl(s7,{hl:s7.map(()=>true)})}];
  const ctl=RD.anim({card:'rd-sql-card',ctl:'rd-sql-ctl',n:steps.length,ms:2200,label:'Query step',draw(i){
    const s=steps[i];qEl.innerHTML=lines.map((l,j)=>s.l.indexOf(j)>=0?'<span class="on">'+l+'</span>':l).join('\n');
    cap.innerHTML='<div class="t">'+s.t+'</div><p>'+s.p+'</p>';tab.innerHTML=s.h();}});
  window.RD_SQL_RESULT=s7; // read by the check script
})();
