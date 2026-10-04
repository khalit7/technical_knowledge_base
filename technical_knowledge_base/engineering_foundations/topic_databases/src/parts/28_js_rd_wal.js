// ---- Reading tab, section 4: a crash during a commit, without and with a write-ahead log (mechanism as documented; drawing illustrative) ----
(function(){
  const card=document.getElementById('rd-wal-card');if(!card)return;
  const svgEl=document.getElementById('rd-wal-svg'),cap=document.getElementById('rd-wal-cap'),cnt=document.getElementById('rd-wal-cnt');
  let mode='no';
  // state per step: mem pages [msg, credit] ('old'|'new'|'lost'), disk pages, wal records count, power ('on'|'off'), caption
  const S={
    no:[
      {mem:['old','old'],disk:['old','old'],wal:0,pw:'on',w:0,st:'consistent',t:'Start',p:'Ben\'s chat page holds no reply yet and his credit page says 1, in memory and on disk.'},
      {mem:['new','new'],disk:['old','old'],wal:0,pw:'on',w:0,st:'consistent',t:'The transaction changes two pages in memory',p:'The reply is added to a messages page and the credit set to 0 in a credits page. So far only RAM has changed.'},
      {mem:['new','new'],disk:['new','old'],wal:0,pw:'on',w:1,st:'half written',t:'COMMIT: write each changed page in place',p:'With no log, the only way to make the commit durable is to write every changed page to its place in the data files, wherever on disk that is. The messages page is written first.'},
      {mem:['lost','lost'],disk:['new','old'],wal:0,pw:'off',w:1,st:'half written',t:'The power fails',p:'Before the credits page reaches the disk, the power goes. Everything in RAM is gone.'},
      {mem:['lost','lost'],disk:['new','old'],wal:0,pw:'on',w:1,st:'broken',t:'Restart: half a transaction',p:'The disk now says Ben got his reply and still has 1 credit. Atomicity is broken, and nothing on disk records what the transaction meant to do, so the database cannot repair it.'}],
    wal:[
      {mem:['old','old'],disk:['old','old'],wal:0,pw:'on',w:0,st:'consistent',t:'Start',p:'The same two pages, plus a log file on disk that only ever grows at its end.'},
      {mem:['new','new'],disk:['old','old'],wal:0,pw:'on',w:0,st:'consistent',t:'The transaction changes two pages in memory',p:'Exactly as before: the changed pages exist only in RAM.'},
      {mem:['new','new'],disk:['old','old'],wal:3,pw:'on',w:1,st:'committed (in the log)',t:'COMMIT: append to the log, fsync once',p:'Three small records (the new message, the new balance, "commit") are appended to the end of the log and one fsync waits until they are on stable storage. Only then is "sent" acknowledged. The data pages are not written yet.'},
      {mem:['lost','lost'],disk:['old','old'],wal:3,pw:'off',w:1,st:'committed (in the log)',t:'The power fails',p:'Same moment, same loss: RAM is gone and both data pages on disk are old.'},
      {mem:['old','old'],disk:['old','old'],wal:3,pw:'on',w:1,st:'recovering',t:'Restart: read the log',p:'On startup the database reads the log from the last checkpoint and finds a committed transaction whose changes may not be in the data pages.'},
      {mem:['new','new'],disk:['old','old'],wal:3,pw:'on',w:1,st:'consistent',t:'Replay (REDO)',p:'It applies the logged changes again: the reply is back and the credit is 0. A transaction with no commit record in the log would simply not be replayed.'},
      {mem:['new','new'],disk:['new','new'],wal:0,pw:'on',w:1,st:'consistent',t:'Checkpoint, later',p:'In the background a checkpoint writes changed pages to the data files in bulk, after which the old part of the log can be recycled.'}]
  };
  function page(x,y,w,label,state,isMsg){
    const fill=state==='new'?'var(--acc2)':(state==='lost'?'none':'var(--soft)');
    const txt=state==='lost'?'(lost)':(isMsg?(state==='new'?'reply saved':'no reply'):(state==='new'?'balance 0':'balance 1'));
    return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="34" rx="4" fill="'+fill+'" stroke="'+(state==='lost'?'var(--dim)':'var(--mute)')+'"'+(state==='lost'?' stroke-dasharray="3 3"':'')+'/>'+
      RD.t(x+6,y+14,label,{fs:10.5,fill:'var(--mute)'})+RD.t(x+6,y+28,txt,{fs:12,w:600,fill:state==='lost'?'var(--dim)':(state==='new'?'var(--acc)':'var(--ink)')});
  }
  function draw(i){
    const st=S[mode][i],W=RD.width(svgEl),g=12,cw=(W-3*g)/2,H=mode==='wal'?196:150;
    const xm=g,xd=2*g+cw;
    let b='<rect x="'+(xm-4)+'" y="4" width="'+(cw+8)+'" height="'+(H-8)+'" rx="8" fill="none" stroke="'+(st.pw==='off'?'var(--bad)':'var(--line)')+'"/>';
    b+=RD.t(xm+4,22,st.pw==='off'?'Memory: power lost':'Memory (buffer pool)',{fs:11.5,w:600,fill:st.pw==='off'?'var(--bad)':'var(--ink)'});
    b+='<rect x="'+(xd-4)+'" y="4" width="'+(cw+8)+'" height="'+(H-8)+'" rx="8" fill="none" stroke="var(--line)"/>'+RD.t(xd+4,22,W>520?'Disk (survives power loss)':'Disk',{fs:11.5,w:600});
    b+=page(xm+4,34,cw-8,'messages page',st.mem[0],true)+page(xm+4,76,cw-8,'credits page',st.mem[1],false);
    b+=page(xd+4,34,cw-8,'messages data file',st.disk[0],true)+page(xd+4,76,cw-8,'credits data file',st.disk[1],false);
    if(mode==='wal'){
      b+=RD.t(xd+4,130,W>520?'write-ahead log (append only)':'write-ahead log',{fs:10.5,fill:'var(--mute)'});
      const n=8,sw=(cw-8)/n;
      for(let k=0;k<n;k++){const filled=k<5||(k<5+st.wal);b+='<rect x="'+(xd+4+k*sw)+'" y="136" width="'+(sw-2)+'" height="18" rx="2" fill="'+(k>=5&&k<5+st.wal?'var(--c2)':(filled?'var(--dim)':'var(--soft)'))+'" stroke="var(--line)"/>'}
      b+=RD.t(xd+4,170,st.wal?(W>520?'3 new records: message, balance, commit':'3 new records'):(i===S.wal.length-1?'old part recycled':'older records'),{fs:10.5,fill:'var(--mute)'});
    }
    if(st.pw==='off')b+=RD.t(xm+cw/2,H-14,'⚡ crash',{a:'middle',fs:13,w:600,fill:'var(--bad)'});
    svgEl.innerHTML=RD.svg(W,H,b,'Memory and disk during a commit and a crash');
    const wr=mode==='no'?(st.w?'1 of 2 pages, random':'0'):(st.w?'1 log append + 1 fsync':'0');
    cnt.innerHTML=RD.stat('Writes at commit',wr)+RD.stat('Ben\'s data on disk',st.st==='broken'?'<span style="color:var(--bad)">half a transaction</span>':st.st);
    cap.innerHTML='<div class="t">'+st.t+'</div><p>'+st.p+'</p>';
  }
  const a=RD.anim({card:'rd-wal-card',ctl:'rd-wal-ctl',n:S.no.length,ms:2000,label:'Crash step',draw});
  RD.seg(document.getElementById('rd-wal-mode'),m=>{mode=m;a.reset(S[m].length);a.play()});
  RD.onResize(()=>a.redraw());
})();
