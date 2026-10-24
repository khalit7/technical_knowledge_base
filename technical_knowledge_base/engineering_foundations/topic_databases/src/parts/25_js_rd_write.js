// ---- Reading tab, "One write through the whole stack": a stepper over the static step list (#rd-w-list) ----
// Step 0 shows the whole path; step k highlights the boxes of list item k and copies its text into the caption.
// Never autoplays (RD.anim waits on step 0 until the reader acts).
(function(){
  const svgEl=document.getElementById('rd-w-svg'),cap=document.getElementById('rd-w-cap'),list=document.getElementById('rd-w-list');
  if(!svgEl||!cap||!list||!window.RD)return;
  const T=RD.t,items=[...list.querySelectorAll('li')];
  // id: [label, group, step]
  const N={app:['App server',0,1],pool:['Connection pool',0,1],sql:['SQL and constraints',1,2],locks:['Locks and MVCC',1,3],planner:['Planner',1,4],
    bufpool:['Buffer pool pages',1,5],wal:['WAL flush: committed',1,6],replica:['Replica',2,7],cache:['Redis cache',0,8],copies:['Column store, search index',2,9],
    cleanup:['Checkpoint, vacuum',1,10],shards:['Shards',2,11]};
  const steps=[[],['app','pool'],['app','sql'],['locks'],['planner'],['bufpool'],['wal'],['replica'],['cache'],['copies'],['cleanup'],['shards']];
  const groups=['Application','Postgres','Copies and scale'];
  const wide={app:[0,0],pool:[0,1],cache:[0,3],sql:[1,0],locks:[1,1],planner:[1,2],bufpool:[1,3],wal:[1,4],cleanup:[1,5],copies:[2,3],replica:[2,4],shards:[2,5]};
  const order=['app','pool','sql','locks','planner','bufpool','wal','replica','cache','copies','cleanup','shards'];
  let cur=0;
  function box(x,y,w,h,id,on){
    const n=N[id];
    return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+(on?'var(--hl)':'var(--soft)')+'" stroke="'+(on?'var(--acc)':'var(--line)')+'" stroke-width="'+(on?2.2:1.2)+'"/>'+
      '<circle cx="'+(x+13)+'" cy="'+(y+h/2)+'" r="9" fill="'+(on?'var(--acc)':'var(--line)')+'"/>'+T(x+13,y+h/2+4,String(n[2]),{a:'middle',fs:10.5,w:600,fill:on?'var(--bg)':'var(--ink)'})+
      T(x+28,y+h/2+4,n[0],{fs:12,w:on?600:400});
  }
  function draw(i){
    cur=i;const W=RD.width(svgEl),on=new Set(steps[i]||[]);let s='',H;
    if(W>=620){
      const g=12,cw=(W-2*g)/3,bh=32,rg=10,top=26;H=top+6*(bh+rg);
      groups.forEach((t,k)=>{s+=T(k*(cw+g)+cw/2,15,t,{a:'middle',fs:12,w:600,fill:'var(--mute)'})});
      s+='<rect x="'+(cw+g-5)+'" y="'+(top-5)+'" width="'+(cw+10)+'" height="'+(6*(bh+rg)+0)+'" rx="9" fill="none" stroke="var(--c1)" stroke-dasharray="4 3"/>';
      const pos=id=>{const p=wide[id];return [p[0]*(cw+g),top+p[1]*(bh+rg)]};
      // the log feeds the copies
      const [wx,wy]=pos('wal'),[rx,ry]=pos('replica'),[cx,cy]=pos('copies');
      s+='<line x1="'+(wx+cw+5)+'" y1="'+(wy+bh/2)+'" x2="'+(rx-2)+'" y2="'+(ry+bh/2)+'" stroke="var(--mute)" stroke-width="1.3"/>';
      s+='<line x1="'+(wx+cw+5)+'" y1="'+(wy+bh/2)+'" x2="'+(cx-2)+'" y2="'+(cy+bh/2)+'" stroke="var(--mute)" stroke-width="1.3"/>';
      const [ax,ay]=pos('pool'),[sx,sy]=pos('sql');
      s+='<line x1="'+(ax+cw)+'" y1="'+(ay+bh/2)+'" x2="'+(sx-5)+'" y2="'+(sy+bh/2)+'" stroke="var(--mute)" stroke-width="1.3"/>';
      order.forEach(id=>{const [x,y]=pos(id);s+=box(x,y,cw,bh,id,on.has(id))});
    }else{
      const bh=30,rg=7;let y=4;
      order.forEach((id,k)=>{const gi=N[id][1];if(k===0||N[order[k-1]][1]!==gi){s+=T(4,y+12,groups[gi],{fs:11.5,w:600,fill:'var(--mute)'});y+=18}
        s+=box(2,y,W-4,bh,id,on.has(id));y+=bh+rg});
      H=y;
    }
    svgEl.innerHTML=RD.svg(W,H,s,'One write through the stack: application, Postgres internals, and the copies it feeds, with the current step highlighted');
    items.forEach((li,k)=>li.classList.toggle('on',k===i-1));
    cap.innerHTML=i===0?'<div class="t">The whole path</div><p>Twelve boxes, eleven steps. Step forward: the highlighted box is where Ben\'s write is, and the caption names the page that owns that step.</p>':
      '<div class="t">Step '+i+' of 11</div><p>'+items[i-1].innerHTML+'</p>';
  }
  RD.anim({card:'rd-w-card',ctl:'rd-w-ctl',n:steps.length,draw:draw,ms:1800,label:'Step of the write'});
  RD.onResize(()=>draw(cur));
})();
