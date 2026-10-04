// ---- Reading: replication lag, before and after (the same write "hello", four ways of reading it back) ----
// Positions are illustrative (log position 101 = "hello"); the measured numbers live in the HTML beside it (inputs/replication_local.json).
(function(){
  const box=document.getElementById('rd-repl-svg');if(!box)return;
  const capEl=document.getElementById('rd-repl-cap'),cnt=document.getElementById('rd-repl-cnt');
  // common opening: write, ack, stream
  const open=[
    {L:101,f1:100,f2:100,lead:100,ana:['hi'],ar:[],t:'Three copies, in step',p:'One <b>leader</b> takes every write and appends it to its log; two <b>followers</b> replay that log. All three hold Ana\'s earlier message "hi" (log position 100).'},
    {L:101,f1:100,f2:100,lead:101,ana:['hi','hello (sending)'],ar:[['A','L','i']],t:'Ana sends "hello"',p:'The write goes to the leader, which appends it at position 101 and flushes it to its own disk.'},
    {L:101,f1:100,f2:100,lead:101,ana:['hi','hello ✓'],ar:[['L','A','g']],t:'The leader says "saved" at once',p:'With <b>asynchronous</b> replication (Postgres\'s default), the commit returns after the leader\'s own flush. The followers have not seen 101 yet. Ana\'s screen shows "hello ✓".'},
    {L:101,f1:101,f2:100,lead:101,fl2:1,ana:['hi','hello ✓'],ar:[['L','F1','i'],['L','F2','d']],t:'The change streams to the followers',p:'Follower 1 receives and replays 101. Follower 2 is a little behind (busy, or further away): 101 is still in flight. That gap is <b>replication lag</b>.'}];
  const M=[
    {name:'stale',steps:open.concat([
      {L:101,f1:101,f2:100,lead:101,fl2:1,ana:['hi'],gone:1,ar:[['F2','A','b']],stale:1,t:'Ana\'s page refreshes: "hello" has vanished',p:'The read is load-balanced to Follower 2, which has replayed only up to 100. It answers honestly with what it has. To Ana the message she just saw saved is gone: a <b>read-your-writes</b> violation.'},
      {L:101,f1:101,f2:101,lead:101,ana:['hi','hello'],ar:[['L','F2','i']],stale:1,t:'A moment later it is back',p:'Follower 2 replays 101 and the next refresh shows "hello". The copies did converge (<b>eventual consistency</b>), but Ana saw the past in between. On a laptop this gap is a fraction of a millisecond and still caught 99.65% of immediate reads (measured, below).'}])},
    {name:'ryw',steps:open.concat([
      {L:101,f1:101,f2:100,lead:101,fl2:1,ana:['hi','hello ✓'],ar:[['A','F2','w']],wait:1,t:'The read carries "I have written up to 101"',p:'The app kept Ana\'s last write position (101) in her session. Follower 2 has replayed only 100, so the read <b>waits</b> until it reaches 101 (or the app sends it to the leader instead).'},
      {L:101,f1:101,f2:101,lead:101,ana:['hi','hello'],ar:[['F2','A','g']],wait:1,t:'Same follower, same lag: "hello" is there',p:'Follower 2 replays 101 and answers. No stale read; the price was a short wait on this one read. Other users\' reads are untouched. Measured on Postgres below: 0 of 2,000 reads stale, median extra wait 0.105 ms.'}])},
    {name:'mono',steps:open.concat([
      {L:101,f1:101,f2:100,lead:101,fl2:1,ana:['hi','hello'],ar:[['F1','A','g']],t:'Refresh 1 goes to Follower 1: "hello" is there',p:'Imagine Ana is reading on another device, so there is no session position to wait for. The first refresh happens to hit the up-to-date follower.'},
      {L:101,f1:101,f2:100,lead:101,fl2:1,ana:['hi'],gone:1,ar:[['F2','A','b']],stale:1,t:'Refresh 2 goes to Follower 2: "hello" disappears again',p:'The second refresh hits the lagging follower. Ana saw a newer state and then an older one: time went backwards. That is a <b>monotonic reads</b> violation, and it is more confusing than plain staleness.'}])},
    {name:'mono-fix',steps:open.concat([
      {L:101,f1:101,f2:100,lead:101,fl2:1,ana:['hi','hello'],ar:[['F1','A','g']],t:'Refresh 1: Ana is pinned to Follower 1',p:'The fix: choose the follower by hashing the user\'s id, so all of Ana\'s reads go to the same copy (it may be behind, but it never goes back).'},
      {L:101,f1:101,f2:100,lead:101,fl2:1,ana:['hi','hello'],ar:[['F1','A','g']],t:'Refresh 2: same follower, same answer or newer',p:'Follower 2 is still behind, but Ana never reads from it. If Follower 1 dies, she moves to another copy and the guarantee can break once; real systems accept that or carry a position as in read-your-writes.'}])}];
  let mode=0;
  const P={};
  function layout(W){const bw=Math.min(230,(W-30)/2),h=92;
    P.A={x:6,y:8,w:bw,h:h,n:'Ana\'s screen'};P.L={x:W-bw-6,y:8,w:bw,h:h,n:'Leader'};
    P.F1={x:6,y:150,w:bw,h:h,n:'Follower 1'};P.F2={x:W-bw-6,y:150,w:bw,h:h,n:'Follower 2'};}
  const ctr=k=>({x:P[k].x+P[k].w/2,y:P[k].y+P[k].h/2});
  function edge(a,b){const A=ctr(a),B=ctr(b),dx=B.x-A.x,dy=B.y-A.y;
    const clip=(c,k,s)=>{const hw=P[k].w/2+4,hh=P[k].h/2+4;const t=Math.min(Math.abs(dx)>1e-6?hw/Math.abs(dx):1e9,Math.abs(dy)>1e-6?hh/Math.abs(dy):1e9);return {x:c.x+s*dx*t,y:c.y+s*dy*t}};
    return [clip(A,a,1),clip(B,b,-1)]}
  function draw(i){
    const W=Math.min(640,RD.width(box)),H=250;layout(W);const s=M[mode].steps[i];
    const col={i:'var(--acc)',g:'var(--good)',b:'var(--bad)',d:'var(--mute)',w:'var(--c5)'};
    let g='<defs>'+Object.keys(col).map(k=>'<marker id="rp-'+k+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="'+col[k]+'"/></marker>').join('')+'</defs>';
    const node=(k,lines)=>{const p=P[k];let o='<rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+p.h+'" rx="8" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(p.x+10,p.y+18,p.n,{fs:12,w:600});
      lines.forEach((l,j)=>{o+=RD.t(p.x+10,p.y+38+j*18,l[0],{fs:11.5,fill:l[1]})});return o};
    const logLines=(pos,fl)=>{const r=[['100  "hi"','var(--ink)']];if(pos>=101)r.push(['101  "hello"','var(--good)']);else if(fl)r.push(['101  in flight…','var(--mute)']);else r.push(['(nothing at 101)','var(--mute)']);return r};
    g+=node('L',logLines(s.lead,0));g+=node('F1',logLines(s.f1,0));g+=node('F2',logLines(s.f2,s.fl2));
    g+=node('A',s.ana.map(m=>[m,m.indexOf('hello')===0?'var(--good)':'var(--ink)']).concat(s.gone?[['"hello" is gone','var(--bad)']]:[]));
    (s.ar||[]).forEach(a=>{const e=edge(a[0],a[1]);g+='<line x1="'+e[0].x+'" y1="'+e[0].y+'" x2="'+e[1].x+'" y2="'+e[1].y+'" stroke="'+col[a[2]]+'" stroke-width="2.5"'+(a[2]==='d'?' stroke-dasharray="6 5"':'')+' marker-end="url(#rp-'+a[2]+')"/>'});
    box.innerHTML=RD.svg(W,H,g,'Leader, two followers and Ana\'s screen, step '+(i+1));
    capEl.innerHTML='<div class="t">'+(i+1)+'/'+M[mode].steps.length+'. '+s.t+'</div><p>'+s.p+'</p>';
    const stale=M[mode].steps.slice(0,i+1).some(x=>x.stale)?1:0,waited=s.wait?'yes, one read':'no';
    cnt.innerHTML=RD.stat('Ana\'s last write','position 101','')+RD.stat('Followers replayed up to',s.f1+' and '+s.f2,'')+RD.stat('Reads that missed her write',String(stale),stale?'stale':'none')+RD.stat('Read waited for replay',waited,'');
  }
  const A=RD.anim({card:'rd-repl-card',ctl:'rd-repl-ctl',n:M[0].steps.length,draw:draw,ms:2600,label:'Replication step'});
  RD.seg(document.getElementById('rd-repl-seg'),v=>{mode=+v;A.reset(M[mode].steps.length);A.play()});
  RD.onResize(()=>A.redraw());
})();
