// ---- Reading tab: "in one screen", the chat product's data at three moments (drawn at the measured width) ----
(function(){
  const el=document.getElementById('rd-one-svg');if(!el)return;
  const T=RD.t;
  function box(x,y,w,h,label,sub,col,dash){
    return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="var(--soft)" stroke="'+col+'" stroke-width="1.6"'+(dash?' stroke-dasharray="4 3"':'')+'/>'+
      T(x+w/2,y+(sub?h/2-2:h/2+4),label,{a:'middle',fs:12,w:600})+(sub?T(x+w/2,y+h/2+12,sub,{a:'middle',fs:10.5,fill:'var(--mute)'}):'');
  }
  function cyl(x,y,w,h,label,sub,col){
    const ry=6;
    return '<path d="M'+x+','+(y+ry)+' a'+(w/2)+','+ry+' 0 0,1 '+w+',0 v'+(h-2*ry)+' a'+(w/2)+','+ry+' 0 0,1 -'+w+',0 z" fill="var(--soft)" stroke="'+col+'" stroke-width="1.6"/>'+
      '<path d="M'+x+','+(y+ry)+' a'+(w/2)+','+ry+' 0 0,0 '+w+',0" fill="none" stroke="'+col+'" stroke-width="1.6"/>'+
      T(x+w/2,y+h/2+(sub?1:5),label,{a:'middle',fs:12,w:600})+(sub?T(x+w/2,y+h/2+15,sub,{a:'middle',fs:10.5,fill:'var(--mute)'}):'');
  }
  function arrow(x1,y1,x2,y2,lab,lx,ly,anc){
    const a=Math.atan2(y2-y1,x2-x1),s=6;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.3"/>'+
      '<path d="M'+x2+','+y2+' L'+(x2-s*Math.cos(a-0.45))+','+(y2-s*Math.sin(a-0.45))+' L'+(x2-s*Math.cos(a+0.45))+','+(y2-s*Math.sin(a+0.45))+' z" fill="var(--mute)"/>'+
      (lab?T(lx,ly,lab,{a:anc||'middle',fs:10,fill:'var(--mute)'}):'');
  }
  // one moment drawn in a panel of width w starting at (ox, oy); returns svg
  function m1(ox,oy,w){
    const bw=Math.min(190,w-20),x=ox+(w-bw)/2;
    return T(ox+w/2,oy+14,'Day 1: one file',{a:'middle',fs:13,w:600})+
      T(ox+w/2,oy+30,'1 user (you)',{a:'middle',fs:11,fill:'var(--mute)'})+
      box(x,oy+48,bw,46,'API server','your code + the model','var(--mute)')+
      arrow(ox+w/2,oy+94,ox+w/2,oy+120)+
      box(x+bw*0.15,oy+122,bw*0.7,36,'chats.json','one file on disk','var(--bad)',true);
  }
  function m2(ox,oy,w){
    const bw=Math.min(190,w-20),x=ox+(w-bw)/2;
    return T(ox+w/2,oy+14,'Year 1: one Postgres',{a:'middle',fs:13,w:600})+
      T(ox+w/2,oy+30,'thousands of users',{a:'middle',fs:11,fill:'var(--mute)'})+
      box(x,oy+48,bw,40,'API servers','','var(--mute)')+
      arrow(ox+w/2,oy+88,ox+w/2,oy+112,'SQL',ox+w/2+6,oy+104,'start')+
      cyl(x+bw*0.1,oy+114,bw*0.8,66,'Postgres','users, chats, messages, credits','var(--c1)');
  }
  function m3(ox,oy,w){
    // fleet: API on top, Postgres centre, Redis beside API, column store and vector index below Postgres
    const g=8,cw=Math.max(80,(w-3*g)/2);
    const xL=ox+g,xR=ox+2*g+cw;
    let s=T(ox+w/2,oy+14,'Year 3: a fleet',{a:'middle',fs:13,w:600})+
      T(ox+w/2,oy+30,'millions of users',{a:'middle',fs:11,fill:'var(--mute)'});
    s+=box(xL,oy+46,cw,38,'API servers','','var(--mute)');
    s+=box(xR,oy+46,cw,38,'Redis','cache, rate limits','var(--c4)');
    s+=arrow(xL+cw,oy+65,xR,oy+65);
    s+=arrow(xL+cw/2,oy+84,xL+cw/2,oy+104);
    s+=cyl(xL,oy+106,cw,54,'Postgres','source of truth','var(--c1)');
    s+=box(xR,oy+106,cw,54,'Vector index','search by meaning','var(--c6)');
    s+=arrow(xL+cw,oy+133,xR,oy+133);
    s+=arrow(xL+cw/2,oy+160,xL+cw/2,oy+182,'copied',xL+cw/2+5,oy+176,'start');
    s+=cyl(xL,oy+184,w-2*g,44,'Column store (analytics)','Parquet files + DuckDB, or ClickHouse','var(--c3)');
    return s;
  }
  function draw(){
    const W=RD.width(el);let svg,H;
    if(W>=660){const pw=W/3;H=240;
      svg=m1(0,4,pw)+m2(pw,4,pw)+m3(2*pw,4,pw)+
        '<line x1="'+pw+'" y1="10" x2="'+pw+'" y2="'+(H-10)+'" stroke="var(--line)"/><line x1="'+2*pw+'" y1="10" x2="'+2*pw+'" y2="'+(H-10)+'" stroke="var(--line)"/>';}
    else{const pw=Math.min(W,380),ox=(W-pw)/2;H=176+196+244;
      svg=m1(ox,4,pw)+'<line x1="10" y1="172" x2="'+(W-10)+'" y2="172" stroke="var(--line)"/>'+m2(ox,180,pw)+'<line x1="10" y1="372" x2="'+(W-10)+'" y2="372" stroke="var(--line)"/>'+m3(ox,380,pw);}
    el.innerHTML=RD.svg(W,H,svg,'The chat product data at three moments: one file, one Postgres database, and a fleet of Postgres, Redis, a vector index and a column store');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
