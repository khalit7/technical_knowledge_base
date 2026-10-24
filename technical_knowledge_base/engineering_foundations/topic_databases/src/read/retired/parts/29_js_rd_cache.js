// ---- Reading tab, section 6: a write going to Postgres alone, and to Postgres plus a cache that goes stale (illustrative sequence) ----
(function(){
  const card=document.getElementById('rd-cache-card');if(!card)return;
  const svgEl=document.getElementById('rd-cache-svg'),cap=document.getElementById('rd-cache-cap'),cnt=document.getElementById('rd-cache-cnt');
  const OLD='Trip plan',NEW='Japan trip';
  // per step: path ('read-db' | 'read-hit' | 'read-miss' | 'write' | 'write-del' | 'wait' | ''), db title, cache content, answer, stale?, caption
  const S={
    db:[
      ['', OLD, null, '', false,'Start','Ada\'s chat list comes from a query joining chats and their latest messages. No cache: every read runs it.'],
      ['read-db', OLD, null, OLD, false,'Ada opens the app','The server runs the query on Postgres and gets "'+OLD+'".'],
      ['read-db', OLD, null, OLD, false,'Ada opens it again','The same query runs again. Correct, but the database does the work every time.'],
      ['write', NEW, null, '', false,'Ada renames the chat','UPDATE chats SET title = \''+NEW+'\' goes to Postgres.'],
      ['read-db', NEW, null, NEW, false,'Ada opens the list','The query sees the new title at once: there is only one copy.'],
      ['wait', NEW, null, '', false,'A minute passes','Nothing changes.'],
      ['read-db', NEW, null, NEW, false,'Ada opens it again','Fresh, always. Cost: 4 expensive queries for 4 reads.']],
    ttl:[
      ['', OLD, null, '', false,'Start','A cache (Redis) sits beside Postgres. The server asks the cache first ("cache-aside"); each entry expires 60 seconds after it was stored.'],
      ['read-miss', OLD, OLD, OLD, false,'Ada opens the app','Cache miss: the server runs the query, then stores the answer in the cache.'],
      ['read-hit', OLD, OLD, OLD, false,'Ada opens it again','Cache hit: the answer comes from memory and Postgres does nothing.'],
      ['write', NEW, OLD, '', false,'Ada renames the chat','The UPDATE goes to Postgres. Nobody tells the cache.'],
      ['read-hit', NEW, OLD, OLD, true,'Ada opens the list','Cache hit, and wrong: the cache still holds "'+OLD+'". Ada sees her rename vanish, for up to 60 seconds.'],
      ['wait', NEW, null, '', false,'A minute passes','The entry expires and is removed.'],
      ['read-miss', NEW, NEW, NEW, false,'Ada opens it again','Miss, query, refill: now correct. Expiry bounds how stale an answer can be, it does not prevent it.']],
    inv:[
      ['', OLD, null, '', false,'Start','Same cache, but every code path that writes a chat also deletes that user\'s cached chat list.'],
      ['read-miss', OLD, OLD, OLD, false,'Ada opens the app','Miss: query Postgres, store the answer.'],
      ['read-hit', OLD, OLD, OLD, false,'Ada opens it again','Hit: served from memory.'],
      ['write-del', NEW, null, '', false,'Ada renames the chat','The UPDATE goes to Postgres, then the server deletes the cached list.'],
      ['read-miss', NEW, NEW, NEW, false,'Ada opens the list','Miss, so the query runs and sees the new title. Correct.'],
      ['wait', NEW, NEW, '', false,'A minute passes','Entries still carry an expiry as a safety net for a forgotten delete.'],
      ['read-hit', NEW, NEW, NEW, false,'Ada opens it again','Hit, and correct. Cost: every write path must remember the delete; one forgotten path brings back the stale reads.']]
  };
  let mode='db';
  function node(x,y,w,h,title,val,col,on,dim){
    return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="var(--soft)" stroke="'+(on?col:'var(--line)')+'" stroke-width="'+(on?2.2:1.2)+'" opacity="'+(dim?0.35:1)+'"/>'+
      RD.t(x+w/2,y+17,title,{a:'middle',fs:12,w:600})+(val!=null?RD.t(x+w/2,y+35,val,{a:'middle',fs:11.5,fill:'var(--mute)'}):'');
  }
  function arr(x1,y1,x2,y2,col,lab,ly){const a=Math.atan2(y2-y1,x2-x1),s=7;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+col+'" stroke-width="2"/><path d="M'+x2+','+y2+' L'+(x2-s*Math.cos(a-0.45))+','+(y2-s*Math.sin(a-0.45))+' L'+(x2-s*Math.cos(a+0.45))+','+(y2-s*Math.sin(a+0.45))+' z" fill="'+col+'"/>'+(lab?RD.t((x1+x2)/2,ly,lab,{a:'middle',fs:10.5,fill:col}):'');}
  function draw(i){
    const st=S[mode],r=st[i],W=RD.width(svgEl),H=150,nw=Math.min(150,(W-40)/3),nh=46;
    const xa=6,xc=(W-nw)/2,xd=W-nw-6,y=40;
    let path=r[0],b='';
    const noCache=mode==='db';
    b+=node(xa,y,nw,nh,'App server',r[3]?'shows: '+r[3]:'',r[4]?'var(--bad)':'var(--c1)',!!path&&path!=='wait');
    b+=node(xc,y+56,nw,nh,'Cache',noCache?'(none)':(r[2]==null?'(empty)':r[2]),r[4]?'var(--bad)':'var(--c4)',path==='read-hit'||path==='read-miss'||path==='write-del',noCache);
    b+=node(xd,y,nw,nh,'Postgres',r[1],'var(--c2)',path==='read-db'||path==='read-miss'||path==='write'||path==='write-del');
    const c1='var(--c1)';
    if(path==='read-db')b+=arr(xa+nw,y+18,xd,y+18,c1,'query',y+12);
    if(path==='write'||path==='write-del')b+=arr(xa+nw,y+18,xd,y+18,'var(--c2)','UPDATE',y+12);
    if(path==='read-miss'){b+=arr(xa+nw/2,y+nh,xc,y+66,c1,'',0)+arr(xa+nw,y+18,xd,y+18,c1,'miss: query',y+12)}
    if(path==='read-hit')b+=arr(xa+nw/2,y+nh,xc,y+66,r[4]?'var(--bad)':c1,r[4]?'stale hit':'hit',y+nh+26);
    if(path==='write-del')b+=arr(xa+nw/2+10,y+nh,xc+10,y+70,'var(--c2)','delete',y+nh+26);
    b+=RD.t(6,18,'Step '+i+': '+r[5],{fs:12,w:600});
    svgEl.innerHTML=RD.svg(W,H,b,'App server, cache and Postgres during a read, a rename and another read');
    let q=0,h=0,s=0;for(let k=1;k<=i;k++){const p=st[k][0];if(p==='read-db'||p==='read-miss')q++;if(p==='read-hit')h++;if(st[k][4])s++}
    cnt.innerHTML=RD.stat('Expensive queries',q)+RD.stat('Cache hits',noCache?'n/a':h)+RD.stat('Stale answers',s?'<span style="color:var(--bad)">'+s+'</span>':0);
    cap.innerHTML='<div class="t">'+r[5]+'</div><p>'+r[6]+'</p>';
  }
  const a=RD.anim({card:'rd-cache-card',ctl:'rd-cache-ctl',n:S.db.length,ms:1700,label:'Cache step',draw});
  RD.seg(document.getElementById('rd-cache-mode'),m=>{mode=m;a.reset(S[m].length);a.play()});
  RD.onResize(()=>a.redraw());
})();
