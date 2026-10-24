// ---- Reading: static and stepped figures (crash recovery stepper, RUM triangle, heap against clustered, composite index order) ----
(function(){
  const $=id=>document.getElementById(id),T=RD.t,A='var(--acc)',L='var(--line)',M='var(--mute)',S='var(--soft)';
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+(+h).toFixed(1)+'" rx="'+(o.rx==null?4:o.rx)+'" fill="'+(o.fill||S)+'" stroke="'+(o.stroke||L)+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+'/>'};
  const line=(x1,y1,x2,y2,c,w,mk)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+(c||L)+'" stroke-width="'+(w||1)+'"'+(mk?' marker-end="url(#'+mk+')"':'')+'/>';
  const mark=(id,c)=>'<marker id="'+id+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="'+c+'"/></marker>';

  // ---- 1. Crash recovery stepper (section 4): the WAL from the redo point to the end, the replay cursor, the printed log ----
  if($('rd-crash-card')){
    const C=SE.m1.crash,lines=C.log.filter(l=>!/listening on|starting PostgreSQL/.test(l)).map(l=>l.replace(/^LOG:\s+/,''));
    const redo=(lines.find(l=>/redo starts at/.test(l))||'').replace(/.*redo starts at /,''),end=(lines.find(l=>/invalid record length at/.test(l))||'').replace(/.*invalid record length at ([0-9A-F/]+).*/,'$1');
    const HL=[/interrupted|not properly shut down/,/redo starts/,/redo starts|redo done/,/invalid record|redo done/,/checkpoint starting|checkpoint complete|ready to accept/];
    const lis=[...$('rd-crash-steps').children];
    const N=40,fpi=i=>(i*7)%5!==0; // illustrative mix: most records here carried page images
    function draw(k){const el=$('rd-crash-svg'),W=RD.width(el),H=150,x0=8,x1=W-8,bw=x1-x0;let b='<defs>'+mark('rd-cr-a',A)+'</defs>';
      b+=T(x0,16,k===0?'pg_control: "in production", not shut down cleanly':'WAL, '+FMTK(C.wal_bytes)+' after the checkpoint',{fs:11.5,w:600,fill:k===0?'var(--bad)':'var(--ink)'});
      const y=40,h=26,cur=k<=0?-1:k===1?0:k===2?Math.round(N*0.55):N;
      for(let i=0;i<N;i++){const x=x0+bw*i/N,w=bw/N-1.5,done=i<cur;b+=rect(x,y,w,h,{rx:1,fill:done?(fpi(i)?'var(--c2)':'var(--c3)'):'var(--bg)',stroke:done?'none':L})}
      if(k>=3)b+=rect(x1-4,y-4,4,h+8,{rx:0,fill:'var(--bad)',stroke:'none'});
      if(cur>=0&&k<4){const cx=x0+bw*Math.min(cur,N)/N;b+=line(cx,y-14,cx,y-2,A,2.4,'rd-cr-a')}
      b+=T(x0,y+h+16,'redo starts '+redo,{fs:11,fill:k===1?A:M,w:k===1?600:400});
      b+=T(x1,y+h+16,'end '+end,{a:'end',fs:11,fill:k===3?'var(--bad)':M,w:k===3?600:400});
      // data files row
      const py=y+h+34,np=Math.max(8,Math.min(30,Math.floor(bw/22))),rebuilt=k<2?0:k===2?Math.round(np*0.55):np;
      b+=T(x0,py+11,'data files',{fs:11,fill:M,w:600});
      for(let i=0;i<np;i++){const px=x0+70+i*((bw-70)/np);b+=rect(px,py,(bw-70)/np-3,14,{rx:2,fill:i<rebuilt?(k===4?'var(--good)':A):'var(--bg)'})}
      b+=T(x0,py+34,k===4?'end-of-recovery checkpoint wrote 1,015 pages; open for connections':k>=2?'pages rebuilt in the buffer pool from page images and deltas':'pages on disk may be stale or torn',{fs:11,fill:k===4?'var(--good)':M});
      el.innerHTML=RD.svg(W,H,b,'The WAL from the redo point to the end of the log, with the replay cursor and the data pages being rebuilt');
      lis.forEach((li,i)=>li.classList.toggle('on',i===k));
      $('rd-crashlog').innerHTML=lines.map(l=>{const e=RD.esc(l);return HL[k].test(l)?'<span class="on">'+e+'</span>':e}).join('\n')}
    const FMTK=v=>FMT.n(Math.round(v/1024))+' kB';
    const A1=RD.anim({card:'rd-crash-card',ctl:'rd-crash-ctl',n:5,draw,ms:2600,label:'Recovery step'});
    RD.onResize(()=>A1.redraw());
  }

  // ---- 2. RUM triangle (section 7): qualitative placement from this page's measurements ----
  const P=[['B-tree',.62,.08,.30,'3 pages a read'],['+ covering index',.82,.03,.15,''],['LSM, leveled',.22,.42,.36,'1.10x space'],['LSM, tiered',.12,.70,.18,'1.71x space'],['BRIN',.10,.18,.72,'73.7 kB for 10M rows'],['no index',.02,.49,.49,'reads every page']];
  function rum(){const el=$('rd-rum-svg');if(!el)return;const W=RD.width(el),w=Math.min(W,470),H=Math.round(w*0.78)+30,ox=(W-w)/2;
    const R=[ox+w/2,26],U=[ox+44,H-28],Mm=[ox+w-44,H-28];let b='';
    b+='<path d="M'+R+' L'+U+' L'+Mm+' Z" fill="'+S+'" stroke="'+L+'"/>';
    b+=T(R[0],R[1]-10,'R: reads cheap',{a:'middle',fs:11.5,w:700});b+=T(U[0]-36,U[1]+20,'U: updates cheap',{fs:11.5,w:700});b+=T(Mm[0]+36,Mm[1]+20,'M: space small',{a:'end',fs:11.5,w:700});
    const pt=(r,u,m)=>[r*R[0]+u*U[0]+m*Mm[0],r*R[1]+u*U[1]+m*Mm[1]];
    P.forEach(([n,r,u,m,d],i)=>{const [x,y]=pt(r,u,m),hot=i===0||i===2;b+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="5" fill="'+(hot?A:'var(--c2)')+'"/>';
      const right=x<ox+w*0.55;b+=T(x+(right?9:-9),y+4,n,{a:right?null:'end',fs:11.5,w:600});if(d&&w>380)b+=T(x+(right?9:-9),y+18,d,{a:right?null:'end',fs:11,fill:M})});
    el.innerHTML=RD.svg(W,H,b,'RUM triangle: corners are reads cheap, updates cheap and space small; designs placed by which overheads they bound')}
  if($('rd-rum-svg')){rum();RD.onRender(rum);RD.onResize(rum)}

  // ---- 3. Heap against clustered (section 8) ----
  function clu(){const el=$('rd-clu-svg');if(!el)return;const W=RD.width(el),stack=W<600,pw=stack?W:(W-24)/2,ph=236,H=stack?2*ph+16:ph;
    let b='<defs>'+mark('rd-cl-a',A)+mark('rd-cl-m',M)+'</defs>';
    const tri=(cx,y,w,h,lab,hot,ex)=>'<path d="M'+cx+' '+y+' L'+(cx-w/2)+' '+(y+h)+' L'+(cx+w/2)+' '+(y+h)+' Z" fill="'+S+'" stroke="'+(hot?A:L)+'" stroke-width="'+(hot?2:1)+'"/>'+(ex?T(ex,y+h+14,lab,{a:'end',fs:11,w:600}):T(cx,y+h-8,lab,{a:'middle',fs:11,w:600}));
    const chats=['var(--c2)','var(--c3)',A,'var(--c4)'];
    function heap(x0,y0){let s=T(x0,y0+14,'Postgres: a heap plus separate B-trees',{fs:12.5,w:700});
      const tw=Math.min(150,pw*0.38);s+=tri(x0+tw/2+4,y0+26,tw,70,'pkey (id)',false);s+=tri(x0+pw-tw/2-8,y0+26,tw,70,'chat_id index',true);
      // heap strip: 8 pages, 3 rows each, chat colours scattered
      const n=8,gw=(pw-12)/n,hy=y0+150,pat=[0,1,2,3,1,0,3,2,0,0,1,3,0,2,1,3,1,3,0,1,3,1,0,0];
      for(let p=0;p<n;p++){s+=rect(x0+p*gw,hy,gw-4,44,{rx:3,fill:'var(--bg)'});for(let r=0;r<3;r++){const c=pat[p*3+r];s+=rect(x0+p*gw+3,hy+4+r*13,gw-10,10,{rx:1,fill:chats[c],stroke:'none'})}}
      s+=T(x0,hy+60,'heap: rows in arrival order, address (page, slot)',{fs:11,fill:M});
      const lx=x0+pw-tw/2-8;[2,7,13].forEach(i=>{const p=Math.floor(i/3),r=i%3;s+=line(lx,y0+98,x0+p*gw+gw/2-2,hy+4+r*13,A,1.6,'rd-cl-a')});
      s+=T(x0,hy+76,'chat 42000 (blue): 3 ctids, 3 table pages',{fs:11,fill:A,w:600});return s}
    function inno(x0,y0){let s=T(x0,y0+14,'InnoDB: the primary-key tree holds the rows',{fs:12.5,w:700});
      const bw=pw*0.62,cx=x0+bw/2+2;s+=tri(cx,y0+26,bw,90,'primary key (chat_id, id)',true);
      const ly=y0+150,n=4,gw=(bw)/n;for(let p=0;p<n;p++){s+=rect(x0+2+p*gw,ly,gw-4,44,{rx:3,fill:'var(--bg)',stroke:p===2?A:L,sw:p===2?2:1});for(let r=0;r<3;r++)s+=rect(x0+5+p*gw,ly+4+r*13,gw-10,10,{rx:1,fill:chats[p],stroke:'none'})}
      s+=line(cx,y0+116,x0+2+2*gw+gw/2-2,ly-2,A,1.6,'rd-cl-a');
      s+=T(x0,ly+60,'leaves are whole rows, sorted by chat: chat 42000 is one page',{fs:11,fill:M});
      const sw=Math.min(120,pw*0.3),sx=x0+pw-sw/2-8;s+=tri(sx,y0+36,sw,64,'secondary (created_at)',false,x0+pw-4);
      s+=line(sx-sw/2+6,y0+66,cx+bw*0.16,y0+60,M,1.4,'rd-cl-m');s+=T(x0+pw-4,y0+128,'stores the primary key:',{a:'end',fs:11,fill:M});s+=T(x0+pw-4,y0+142,'a second descent',{a:'end',fs:11,fill:M});return s}
    b+=heap(0,0);b+=stack?inno(0,ph+16):inno(pw+24,0);
    el.innerHTML=RD.svg(W,H,b,'Postgres heap with separate indexes pointing at row addresses, against InnoDB where the primary-key B-tree holds the rows and secondary indexes store the primary key')}
  if($('rd-clu-svg')){clu();RD.onRender(clu);RD.onResize(clu)}

  // ---- 4. Composite index order (section 10): 24 entries, query chat 42000 after 10:00 ----
  const CH=[41998,41999,42000,42001],TM=['08:00','09:00','10:00','11:00','12:00','13:00'];let cmode='good';
  function cmp(){const el=$('rd-cmp-svg');if(!el)return;const W=RD.width(el),per=W<520?6:12,rows=24/per,cw=(W-4)/per,chh=36,H=rows*(chh+6)+30;
    const E=[];CH.forEach(c=>TM.forEach(t=>E.push({c,t})));
    if(cmode==='bad')E.sort((a,b)=>a.t<b.t?-1:a.t>b.t?1:a.c-b.c);
    const hit=e=>e.c===42000&&e.t>'10:00';let first=-1,last=-1;
    if(cmode==='good'){E.forEach((e,i)=>{if(hit(e)){if(first<0)first=i;last=i}})}else{E.forEach((e,i)=>{if(e.t>'10:00'){if(first<0)first=i;last=i}})}
    const read=last-first+1;let b=T(0,14,'Index on '+(cmode==='good'?'(chat_id, created_at)':'(created_at, chat_id)')+': reads '+read+' entries, returns 3',{fs:12,w:700,fill:cmode==='good'?'var(--good)':'var(--bad)'});
    E.forEach((e,i)=>{const r=Math.floor(i/per),x=2+(i%per)*cw,y=24+r*(chh+6),inR=i>=first&&i<=last,h=hit(e);
      b+=rect(x,y,cw-4,chh,{rx:3,fill:inR?'var(--hl)':'var(--bg)',stroke:h?A:L,sw:h?2.2:1});
      const big=cmode==='good';b+=T(x+(cw-4)/2,y+15,String(big?e.c:e.t),{a:'middle',fs:11,w:600,fill:e.c===42000?A:'var(--ink)'});b+=T(x+(cw-4)/2,y+29,String(big?e.t:e.c),{a:'middle',fs:11,fill:e.c===42000?A:M})});
    el.innerHTML=RD.svg(W,H,b,'Index entries in sorted order; the range the scan reads is highlighted and the three matching entries outlined')}
  if($('rd-cmp-svg')){cmp();RD.onRender(cmp);RD.onResize(cmp);RD.seg($('rd-cmp-mode'),m=>{cmode=m;cmp()})}
})();
