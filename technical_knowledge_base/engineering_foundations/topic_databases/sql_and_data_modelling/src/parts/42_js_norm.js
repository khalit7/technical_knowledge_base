// ---- Reading, section 9: one rename in a wide table against a normalised schema, on user 7's real message rows ----
(function(){
  const svgEl=document.getElementById('rd-norm-svg');if(!svgEl)return;
  const D=window.SM_DATA,UID=7;
  const user=D.users.find(u=>u[0]===UID),OLD=user[2],NEW='Ines Novak-Reyes';
  const chats=D.chats.filter(c=>c[1]===UID).map(c=>c[0]).sort((a,b)=>a-b);
  const per=chats.map(c=>({c,n:D.msgs.filter(m=>m[1]===c).length})).filter(x=>x.n>0);
  const N=per.reduce((a,x)=>a+x.n,0),BUG=Math.min(...per.map(x=>x.c)),K=per.find(x=>x.c===BUG).n;
  const STEPS=5;let mode='wide';
  const CA='var(--c1)',CB='var(--c2)';
  function draw(i){
    const W=RD.width(svgEl),sq=W<420?9:12,g=2,lab=W<420?86:110,per_row=Math.max(4,Math.floor((W-lab)/(sq+g)));
    let s='',y=4;
    if(mode==='norm'){
      const renamed=i>=1;
      s+='<rect x="0" y="'+y+'" width="'+Math.min(W,330)+'" height="30" rx="6" fill="var(--bg)" stroke="'+(i===1||i===2?'var(--bad)':'var(--line)')+'" stroke-width="'+(i===1||i===2?2:1)+'"/>';
      s+=RD.t(8,y+19,'users, id 7:',{fs:11.5,fill:'var(--mute)'})+'<rect x="84" y="'+(y+8)+'" width="12" height="12" rx="2" fill="'+(renamed?CB:CA)+'"/>'+RD.t(102,y+19,RD.esc(renamed?NEW:OLD),{fs:12,w:600});
      y+=42;s+=RD.t(0,y,'messages (no name stored; each reaches users.name through its chat)',{fs:11,fill:'var(--mute)'});y+=8;
    }
    per.forEach(x=>{const rows=Math.ceil(x.n/per_row),h=rows*(sq+g);
      s+=RD.t(0,y+sq,'chat '+x.c+' ('+x.n+')',{fs:11,fill:x.c===BUG&&i>=2?'var(--bad)':'var(--mute)',w:x.c===BUG&&i>=2?600:400});
      for(let k=0;k<x.n;k++){const cx=lab+(k%per_row)*(sq+g),cy=y+Math.floor(k/per_row)*(sq+g);
        let fill,stroke='none';
        if(mode==='wide'){const updated=(i>=2&&x.c===BUG);fill=updated?CB:CA;if(i===1)stroke='var(--bad)'}
        else{fill='var(--dim)';}
        s+='<rect x="'+cx+'" y="'+cy+'" width="'+sq+'" height="'+sq+'" rx="2" fill="'+fill+'"'+(stroke!=='none'?' stroke="'+stroke+'" stroke-width="1.5"':'')+'/>';
        if(mode==='norm'&&i>=2)s+='<rect x="'+cx+'" y="'+cy+'" width="'+sq+'" height="3" fill="'+CB+'"/>';}
      y+=h+6});
    if(i>=4){y+=4;s+='<rect x="'+lab+'" y="'+y+'" width="'+Math.min(W-lab,230)+'" height="22" rx="4" fill="none" stroke="'+(mode==='wide'?'var(--bad)':'var(--good)')+'" stroke-dasharray="'+(mode==='wide'?'4 3':'0')+'"/>'+RD.t(lab+6,y+15,mode==='wide'?'a new user with no messages: no row to live in':'a new user with no chats: one row in users',{fs:11,fill:mode==='wide'?'var(--bad)':'var(--good)'});y+=26}
    svgEl.innerHTML=RD.svg(W,y+4,s,'User 7 message rows in the '+(mode==='wide'?'wide table':'normalised schema'));
    const wide=mode==='wide';
    const copies=wide?N:1,must=i>=1?(wide?N:1):0,bug=i>=2?(wide?K:1):0,names=i>=3?(wide?2:1):(i>=2&&wide?2:1);
    document.getElementById('rd-norm-cnt').innerHTML=RD.stat('Rows storing her name',copies)+RD.stat('Rows a correct rename writes',i>=1?must:'-')+RD.stat('Rows the buggy path wrote',i>=2?bug:'-')+RD.stat('Names for user 7 in the data',names,names>1?'<span style="color:var(--bad)">update anomaly</span>':'');
    const C={wide:[
      'The wide table chat_log: every one of Ines’s '+N+' message rows (one square each, grouped by chat) carries her name, email and plan.',
      'Ines changes her name. To stay correct, the UPDATE must find and rewrite all '+N+' rows (outlined), in every chat, in one transaction.',
      'A code path that updates "the current chat’s rows" (chat '+BUG+') rewrites '+K+' rows. The other '+(N-K)+' still say "'+OLD+'". Nothing failed and nothing warned.',
      'Ask "what is user 7’s name?" and the data gives two answers. That is the update anomaly: one fact stored '+N+' times can disagree with itself.',
      'Two more anomalies: a user who has not sent a message has no row at all (insert anomaly), and deleting Ines’s messages would delete her email too (delete anomaly).'],
    norm:[
      'The normalised schema: her name is stored once, in users. Message rows store only chat_id; the name is reached by a join through chats.',
      'Ines changes her name: UPDATE users SET name = … WHERE id = 7. One row, whatever the number of messages.',
      'The same careless code path can only do one thing: change that one row. Every message now shows the new name through the join (the stripe on each square).',
      'Ask "what is user 7’s name?" and there is exactly one answer, because there is exactly one place it lives.',
      'And a user exists independently of messages: six of the 50 users in this data have never opened a chat, and they are stored perfectly well.']};
    document.getElementById('rd-norm-cap').innerHTML='<div class="t">'+(wide?'One wide table':'Normalised')+', step '+(i+1)+' of '+STEPS+'</div><p>'+C[mode][i]+'</p>';
  }
  const A=RD.anim({card:'rd-norm-card',ctl:'rd-norm-ctl',n:STEPS,ms:2600,label:'Step',draw});
  RD.seg(document.getElementById('rd-norm-mode'),m=>{mode=m;A.reset(STEPS);A.play()});
  RD.onResize(()=>A.redraw());
  window.RD_NORM={N,K,BUG}; // for src/check_page.mjs and recompute.py
})();
