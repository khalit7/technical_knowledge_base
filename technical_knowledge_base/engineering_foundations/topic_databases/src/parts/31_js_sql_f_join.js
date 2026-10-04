// ---- SQL playground: the JOIN animation (users 2, 4, 5, 9 against their chats, INNER vs LEFT) and Free play ----
window.SQJ=(function(){
  const D=window.SQ_DATA,$=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const UIDS=[2,4,5,9];
  const users=UIDS.map(id=>D.users.find(u=>u[0]===id));
  const mine=D.chats.filter(c=>UIDS.indexOf(c[1])>=0).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
  // two chats of other users, to show rows that never match
  const others=D.chats.filter(c=>UIDS.indexOf(c[1])<0).slice(0,2);
  const chats=mine.concat(others).sort((a,b)=>a[0]-b[0]);
  let mode='inner',anim=null;
  // steps: 0 intro, then for each user: look (2k+1), write (2k+2), then summary
  const N=2+2*users.length;
  function outRows(upto){ // output rows written after user index < upto (inclusive of the write step)
    const o=[];for(let k=0;k<upto;k++){const u=users[k];const m=chats.filter(c=>c[1]===u[0]);
      if(m.length)m.forEach(c=>o.push([u[0],u[2],c[0],c[2]]));else if(mode==='left')o.push([u[0],u[2],null,null])}return o}
  function trunc(s,px,fs){const max=Math.max(3,Math.floor(px/(fs*0.56)));s=String(s);return s.length>max?s.slice(0,max-1)+'…':s}
  function draw(i){
    const el=$('sq-jsvg');if(!el)return;
    const W=Math.max(300,Math.min(860,(el.clientWidth||($('sq-joincard').clientWidth-30)||340)));
    const fs=W<480?10.5:11.5,rh=20,top=24;
    const lw=Math.round(W*0.40),rw=Math.round(W*0.45),rx=W-rw;
    const k=i<=0?-1:Math.min(users.length-1,Math.floor((i-1)/2));const phase=i<=0?'':(i>=N-1?'end':((i-1)%2===0?'look':'write'));
    const cur=phase&&phase!=='end'?users[k]:null;
    const written=phase==='end'?users.length:(phase==='write'?k+1:Math.max(0,k));
    const out=outRows(written);
    let s='';
    const col=(x,y,t,o)=>'<text x="'+x+'" y="'+y+'" font-size="'+fs+'"'+(o||'')+'>'+esc(t)+'</text>';
    // users table
    s+=col(0,14,'users (left table)',' font-weight="600"');
    s+='<rect x="0" y="'+top+'" width="'+lw+'" height="'+rh+'" fill="var(--acc2)"/>'+col(6,top+14,'id',' fill="var(--mute)"')+col(34,top+14,'name',' fill="var(--mute)"');
    users.forEach((u,j)=>{const y=top+rh*(j+1);const on=cur&&cur[0]===u[0];
      s+='<rect x="0" y="'+y+'" width="'+lw+'" height="'+rh+'" fill="'+(on?'var(--hl)':'var(--bg)')+'" stroke="var(--line)"/>'+col(6,y+14,u[0])+col(34,y+14,trunc(u[2],lw-38,fs))});
    // chats table
    s+=col(rx,14,'chats (right table)',' font-weight="600"');
    s+='<rect x="'+rx+'" y="'+top+'" width="'+rw+'" height="'+rh+'" fill="var(--acc2)"/>'+col(rx+6,top+14,'id',' fill="var(--mute)"')+col(rx+36,top+14,'user_id',' fill="var(--mute)"')+col(rx+86,top+14,'title',' fill="var(--mute)"');
    chats.forEach((c,j)=>{const y=top+rh*(j+1);const match=cur&&c[1]===cur[0];const look=cur&&phase==='look';
      s+='<rect x="'+rx+'" y="'+y+'" width="'+rw+'" height="'+rh+'" fill="'+(match?'var(--open2)':'var(--bg)')+'" stroke="'+(match?'var(--good)':'var(--line)')+'" opacity="'+(cur&&!match&&look?0.45:1)+'"/>'+
        col(rx+6,y+14,c[0])+col(rx+36,y+14,c[1],match?' font-weight="600" fill="var(--good)"':'')+col(rx+86,y+14,c[2]===null?'NULL':trunc(c[2],rw-90,fs),c[2]===null?' fill="var(--mute)" font-style="italic"':'')});
    // match lines
    if(cur){const uy=top+rh*(users.indexOf(cur)+1)+rh/2;
      chats.forEach((c,j)=>{if(c[1]===cur[0]){const cy=top+rh*(j+1)+rh/2;s+='<path d="M'+lw+' '+uy+' C'+(lw+(rx-lw)/2)+' '+uy+' '+(lw+(rx-lw)/2)+' '+cy+' '+rx+' '+cy+'" fill="none" stroke="var(--good)" stroke-width="1.6"/>'}});
      if(!chats.some(c=>c[1]===cur[0]))s+=col(lw+4,uy+4,'no match',' fill="var(--bad)" font-size="'+(fs-1)+'"')}
    // output
    const oy=top+rh*(chats.length+1)+30;
    s+=col(0,oy-8,'result ('+out.length+' row'+(out.length===1?'':'s')+')',' font-weight="600"');
    const cx=[0,0.1,0.42,0.58].map(f=>Math.round(f*W));
    s+='<rect x="0" y="'+oy+'" width="'+W+'" height="'+rh+'" fill="var(--acc2)"/>'+['id','name','chat_id','title'].map((h,j)=>col(cx[j]+6,oy+14,h,' fill="var(--mute)"')).join('');
    for(let j=0;j<6;j++){const y=oy+rh*(j+1);const r=out[j];
      s+='<rect x="0" y="'+y+'" width="'+W+'" height="'+rh+'" fill="var(--bg)" stroke="var(--line)" opacity="'+(r?1:0.35)+'"/>';
      if(r){const fresh=phase==='write'&&r[0]===cur[0];
        s+=r.map((v,c)=>col(cx[c]+6,y+14,v===null?'NULL':trunc(v,(c<3?cx[c+1]-cx[c]:W-cx[c])-10,fs),v===null?' fill="var(--mute)" font-style="italic"':(fresh?' fill="var(--good)" font-weight="600"':''))).join('')}}
    const H=oy+rh*7+4;
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Two tables being joined row by row">'+s+'</svg>';
    // caption
    let cap;
    if(phase==='')cap='Two tables. The query: <code>SELECT ... FROM users u '+(mode==='inner'?'INNER':'LEFT')+' JOIN chats c ON c.user_id = u.id</code> for users 2, 4, 5 and 9. Press Play or step through.';
    else if(phase==='end')cap=mode==='inner'?'Done: 5 rows. Mo Garcia (user 4) is missing because an INNER JOIN writes only matched pairs. Switch to LEFT JOIN to keep him.':'Done: 6 rows. Every user appears at least once; Mo Garcia (user 4) has NULL where a chat would be. Same 4 users, one more row than INNER JOIN.';
    else{const m=chats.filter(c=>c[1]===cur[0]).length;
      cap=phase==='look'?'User '+cur[0]+' ('+esc(cur[2])+'): compare id '+cur[0]+' with every chat\'s user_id. '+(m?m+' chat'+(m>1?'s match':' matches')+'.':'No chat matches.'):
        (m?'Write '+m+' output row'+(m>1?'s':'')+', one per matching chat: the user\'s columns are repeated on each.':(mode==='inner'?'No match, so INNER JOIN writes nothing for this user.':'No match, but LEFT JOIN still writes the user once, with NULL in the chat columns.'))}
    $('sq-jcap').innerHTML=cap;
  }
  function init(){
    if(!window.RD||!RD.anim){draw(N-1);return}
    anim=RD.anim({card:'sq-joincard',ctl:'sq-jctl',n:N,draw:draw,ms:1500,label:'JOIN step'});
    RD.seg($('sq-jmode'),m=>{mode=m;anim.reset(N);anim.play()});
    let t=0;addEventListener('resize',()=>{const c=$('sq-joincard');if(!c||c.hidden||c.offsetParent===null)return;clearTimeout(t);t=setTimeout(()=>anim.redraw(),80)});
  }
  init();
  return {redraw(){if(anim)anim.redraw();else draw(N-1)},get mode(){return mode}};
})();

// ---- Free play ----
(function(){
  const $=id=>document.getElementById(id);
  const ST=[
    ['Tables',"SELECT name, type FROM sqlite_master WHERE type = 'table';\n-- sqlite_master is SQLite's own catalogue; Postgres keeps the same facts in information_schema.tables"],
    ['Busiest chats',"SELECT chat_id, COUNT(*) AS messages, SUM(tokens) AS tokens\nFROM messages\nGROUP BY chat_id\nORDER BY messages DESC, chat_id\nLIMIT 5;"],
    ['Users who never chatted',"SELECT u.id, u.name\nFROM users u\nWHERE NOT EXISTS (SELECT 1 FROM chats c WHERE c.user_id = u.id)\nORDER BY u.id;"],
    ['Messages per month',"SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS messages\nFROM messages\nGROUP BY month\nORDER BY month;\n-- substr on text works in SQLite; in Postgres you would write date_trunc('month', created_at)"],
    ['An index and its plan',"DROP INDEX IF EXISTS messages_chat;\nEXPLAIN QUERY PLAN SELECT * FROM messages WHERE chat_id = 7;\nCREATE INDEX messages_chat ON messages (chat_id);\nEXPLAIN QUERY PLAN SELECT * FROM messages WHERE chat_id = 7;\n-- before: SCAN (read every row); after: SEARCH using the index"],
    ['Switch foreign keys on',"PRAGMA foreign_keys = ON;\nDELETE FROM chats WHERE id = 1;\n-- refused now: messages still point at chat 1"]];
  function ensure(){const S=window.SQ.S;if(!S.SQL)return null;if(!S.freeDb)S.freeDb=new S.SQL.Database(S.base);return S.freeDb}
  function go(){const out=$('sq-fout');window.SQ.S.ready&&window.SQ.S.ready.then(ok=>{
    if(!ok){out.innerHTML='<p class="small mute">Free play needs the live engine, which could not start here.</p>';return}
    const db=ensure();const res=window.SQ.run(db,$('sq-fed').value);
    if(!res.length){out.innerHTML='<p class="small mute">Nothing to run.</p>';return}
    window.SQ.render(out,res,'SQLite '+window.SQ.S.ver+', your copy of the data',null,res.map(r=>r.sql),'')})}
  function init(){
    $('sq-starters').innerHTML=ST.map((s,i)=>'<button data-i="'+i+'">'+s[0]+'</button>').join('');
    $('sq-starters').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('sq-fed').value=ST[+b.dataset.i][1];go()});
    $('sq-fed').value=ST[1][1];
    $('sq-fgo').addEventListener('click',go);
    $('sq-fed').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();go()}});
    $('sq-freset').addEventListener('click',()=>{const S=window.SQ.S;if(S.freeDb){S.freeDb.close();S.freeDb=null}$('sq-fout').innerHTML='<p class="small mute">Data reset to the original 2,300 rows.</p>'});
  }
  let done=false;
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-sql']=window.TAB_RENDER['t-sql']||[]).push(()=>{if(done)return;done=true;init()});
})();
