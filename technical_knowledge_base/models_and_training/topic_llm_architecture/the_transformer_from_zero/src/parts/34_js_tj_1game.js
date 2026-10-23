// ---- Token's journey (prefix tj): the player is token 30 (" to") walking through the trained baseline. Every number
// comes from window.TJD (src/journey/journey_data.py). Nothing moves until the player acts; reduced motion: no tweens.
(function(){
  const D=window.TJD,root=document.getElementById('t-journey'),stageEl=document.getElementById('tj-stage');
  if(!D||!root||!stageEl)return;
  const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
  const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED=190,PR=9;                                     // walking speed (px/s), player radius
  const pct=w=>(100*w).toFixed(1)+'%', f3=x=>(+x).toFixed(3), q=s=>'"'+s+'"';
  const tokTxt=j=>D.pieces[j];
  const ROOMS=['Lookup','Attention','Add','FFN','Blocks 2-6','Next token'];
  const MH=D.main_head,HW=D.heads[MH];
  const VEC={empty:null,tok:[D.tok,D.rms.tok,'your row of the table'],x0:[D.x0,D.rms.x0,'row + position'],
    x1:[D.x1,D.rms.x1,'x + attention'],x2:[D.x2,D.rms.x2,'x + attention + FFN'],rep:[D.a,D.rms.a,'replaced by attention'],
    hf:[D.hf,D.rms.hf,'after the final norm'],n1:[D.n1,D.rms.n1,'normalised copy'],hy:[HW.y8,null,'head '+(MH+1)+': first 8 of its 32'],
    a:[D.a,D.rms.a,'attention output'],n2:[D.n2,D.rms.n2,'normalised copy'],f:[D.f,D.rms.f,'FFN output']};
  D.layers.forEach((l,i)=>{VEC['L'+i]=[l.x8,l.rms,'after block '+i]});
  // ---------- state ----------
  let S,objs=[],W=360,H=300,svg=null,G={},prog={max:0,done:{}};
  try{const v=JSON.parse(localStorage.getItem('tj-prog')||'null');if(v&&typeof v.max==='number')prog={max:Math.min(5,v.max),done:v.done||{}}}catch(e){}
  function save(){try{localStorage.setItem('tj-prog',JSON.stringify(prog))}catch(e){}}
  function fresh(){return{room:0,x:0,y:0,face:1,bag:'empty',sat:null,flags:{},zin:{},pass2:null,T:1}}
  S=fresh();
  // ---------- small svg helpers ----------
  function el(tag,at,par){const e=document.createElementNS(NS,tag);for(const k in at)e.setAttribute(k,at[k]);if(par)par.appendChild(e);return e}
  function tx(par,x,y,s,cls,anchor){const t=el('text',{x,y,'text-anchor':anchor||'middle'},par);if(cls)t.setAttribute('class',cls);t.textContent=s;return t}
  function colr(v,s){if(!s)s=1;const t=Math.max(-1,Math.min(1,v/(2*s)));const p=Math.round(Math.abs(t)*85)+8;
    return 'color-mix(in srgb, var('+(t>=0?'--c1':'--c2')+') '+p+'%, var(--bg))'}
  function vec(k){return VEC[k]||null}
  function scaleOf(k){const v=vec(k);if(!v)return 1;if(v[1])return v[1];return Math.sqrt(v[0].reduce((a,b)=>a+b*b,0)/v[0].length)}
  // a figure: feet at (0,0); backpack behind, satchel in front; label above
  function figure(par,label,o){o=o||{};const g=el('g',{},par);
    if(o.ghost)g.setAttribute('opacity','.5');
    const c=o.color||'var(--mute)';
    el('line',{x1:-4,y1:-6,x2:-4,y2:0,stroke:c,'stroke-width':3,'stroke-linecap':'round'},g);
    el('line',{x1:4,y1:-6,x2:4,y2:0,stroke:c,'stroke-width':3,'stroke-linecap':'round'},g);
    el('rect',{x:-7,y:-20,width:14,height:15,rx:5,fill:c},g);
    el('circle',{cx:0,cy:-26,r:6.5,fill:c},g);
    if(o.pack){const p=el('g',{class:'tj-bp'},g);g._pack=p}
    if(o.sat){const p=el('g',{class:'tj-sp'},g);g._sat=p}
    if(label!=null){const t=tx(g,0,o.below?13:-37,label,o.cls||'b');g._label=t}
    return g}
  function drawCells(g,k,x,y,w,h,vertical){while(g.firstChild)g.removeChild(g.firstChild);const v=vec(k);
    el('rect',{x:x-1,y:y-1,width:w+2,height:h+2,rx:2,fill:'var(--bg)',stroke:'var(--ink)','stroke-width':1},g);
    if(!v)return;const s=scaleOf(k);
    for(let i=0;i<8;i++){const a=vertical?{x,y:y+i*h/8,width:w,height:h/8}:{x:x+i*w/8,y,width:w/8,height:h};a.fill=colr(v[0][i],s);el('rect',a,g)}}
  // ---------- room plumbing ----------
  function addObj(o){o.reach=o.reach==null?24:o.reach;objs.push(o);return o}
  function rectDist(o,x,y){const dx=Math.max(o.x-x,0,x-(o.x+o.w)),dy=Math.max(o.y-y,0,y-(o.y+o.h));return Math.hypot(dx,dy)}
  function hitsSolid(x,y,r){r=r||PR;if(x<r+2||x>W-r-2||y<46+r-PR||y>H-8-r+PR)return 'wall';
    for(const o of objs)if(o.solid&&!o.off&&rectDist(o,x,y)<r)return o;return null}
  function nearest(){let best=null,bd=1e9;for(const o of objs){if(!o.act||o.off)continue;const d=rectDist(o,S.x,S.y);if(d<=o.reach&&d<bd){bd=d;best=o}}return best}
  function say(m,e){$('tj-msg').textContent=m||'';$('tj-ev').textContent=e||''}
  let goalTxt='';
  function goal(t){goalTxt=t;hint()}
  function hint(){const n=nearest();objs.forEach(o=>{if(o.hl)o.hl.setAttribute('stroke',o===n?'var(--acc)':'transparent')});
    $('tj-hint').textContent=n?('Space, Use or tap: '+(typeof n.prompt==='function'?n.prompt():n.prompt)):goalTxt}
  function setBag(k){S.bag=k;paintBag()}
  function setSat(k){S.sat=k;paintBag()}
  function paintCells(box,k){box.innerHTML='';const v=vec(k);const s=scaleOf(k);
    const num=root.classList.contains('tj-num');
    for(let i=0;i<8;i++){const sp=document.createElement('span');if(v){sp.style.background=colr(v[0][i],s);sp.textContent=num?v[0][i].toFixed(4):'';sp.dataset.v=v[0][i]}box.appendChild(sp)}}
  function paintBag(){const v=vec(S.bag);paintCells($('tj-bag'),S.bag);
    $('tj-bagname').textContent=v?(v[2]+(v[1]?', RMS '+f3(v[1]):'')):'empty';
    $('tj-satw').hidden=!S.sat;if(S.sat){const w=vec(S.sat);paintCells($('tj-sat'),S.sat);$('tj-satname').textContent=w[2]+(w[1]?', RMS '+f3(w[1]):'')}
    if(G.me){const h=S.bag==='empty'?8:Math.max(8,Math.min(26,10+6*Math.log2(1+scaleOf(S.bag)*4)));
      drawCells(G.me._pack,S.bag,S.face>0?-17:7,-8-h,10,h,true);
      if(S.sat)drawCells(G.me._sat,S.sat,S.face>0?7:-15,-18,8,12,true);else while(G.me._sat.firstChild)G.me._sat.removeChild(G.me._sat.firstChild)}}
  function placeMe(){if(G.me)G.me.setAttribute('transform','translate('+S.x.toFixed(1)+','+S.y.toFixed(1)+')')}
  function done(r){if(!prog.done[r]){prog.done[r]=1}if(r+1>prog.max)prog.max=Math.min(5,r+1);save();drawMap()}
  // ---------- tweens and the one loop ----------
  let raf=0,last=0,anims=[];const keys=new Set();let tgt=null,pend=null,path=[],pendBump=null;
  function tween(dur,f,end){if(RM||dur<=0){f(1);end&&end();return}anims.push({t0:performance.now(),dur,f,end});kick()}
  let inTick=false;function kick(){if(!raf&&!inTick){last=performance.now();raf=requestAnimationFrame(tick)}}
  function tick(t){raf=0;inTick=true;const dt=Math.min(.05,Math.max(0,(t-last)/1000));last=t;
    let dx=0,dy=0;
    if(keys.size){dx=(keys.has('r')?1:0)-(keys.has('l')?1:0);dy=(keys.has('d')?1:0)-(keys.has('u')?1:0);tgt=null;pend=null;pendBump=null;path=[]}
    else if(tgt){dx=tgt.x-S.x;dy=tgt.y-S.y;if(Math.hypot(dx,dy)<2){nextWp();dx=dy=0}}
    if((dx||dy)&&dt>0){const n=Math.hypot(dx,dy),st=SPEED*dt,lim=tgt?Math.min(st,n):st;const moved=moveBy(dx/n*lim,dy/n*lim);if(!moved&&tgt)arrive()}
    const fin=[];anims=anims.filter(a=>{const p=Math.max(0,Math.min(1,(t-a.t0)/a.dur));a.f(p);if(p>=1){fin.push(a);return false}return true});fin.forEach(a=>a.end&&a.end());
    inTick=false;if(keys.size||tgt||anims.length)raf=requestAnimationFrame(tick)}
  function moveBy(dx,dy){let moved=false;
    if(dx){if(dx>0!==(S.face>0)){S.face=dx>0?1:-1;paintBag()}const h=hitsSolid(S.x+dx,S.y);if(!h){S.x+=dx;moved=true}else bump(h)}
    if(dy){const h=hitsSolid(S.x,S.y+dy);if(!h){S.y+=dy;moved=true}else bump(h)}
    if(moved){placeMe();zones();hint()}return moved}
  let lastBump=0;function bump(o){if(o&&o.bump&&performance.now()-lastBump>500){lastBump=performance.now();o.bump()}}
  function zones(){for(const o of objs){if(!o.zone||o.off)continue;const inside=S.x>=o.x&&S.x<=o.x+o.w&&S.y>=o.y&&S.y<=o.y+o.h;
      if(inside&&!S.zin[o.id]){S.zin[o.id]=1;o.zone()}else if(!inside)delete S.zin[o.id]}}
  function stopWalk(){tgt=null;path=[];pend=null;pendBump=null;keys.clear()}
  function nextWp(){if(path.length)tgt=path.shift();else arrive()}
  function arrive(){tgt=null;path=[];const p=pend,b=pendBump;pend=null;pendBump=null;
    if(p&&rectDist(p,S.x,S.y)<=p.reach+1&&!p.off)p.act();if(b&&rectDist(b,S.x,S.y)<=PR+14){lastBump=0;bump(b)}}
  // tap-to-walk: breadth-first search on an 8 px grid around walls and machines
  function route(x,y){const g=8,nx=Math.ceil(W/g),ny=Math.ceil(H/g),free=new Uint8Array(nx*ny),prev=new Int32Array(nx*ny).fill(-1);
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)free[j*nx+i]=hitsSolid(i*g+g/2,j*g+g/2,PR+3)?0:1;
    const cell=(px,py)=>[Math.max(0,Math.min(nx-1,Math.floor(px/g))),Math.max(0,Math.min(ny-1,Math.floor(py/g)))];
    const near=(c)=>{let best=-1,bd=1e9;for(let k=0;k<nx*ny;k++)if(free[k]){const d=Math.hypot(k%nx-c[0],Math.floor(k/nx)-c[1]);if(d<bd){bd=d;best=k}}return best};
    const [si,sj]=cell(S.x,S.y);let s0=sj*nx+si;if(!free[s0])s0=near([si,sj]);const [ti,tj]=cell(x,y);let t0=tj*nx+ti;if(!free[t0])t0=near([ti,tj]);
    if(s0<0||t0<0)return[];const qu=[s0];prev[s0]=s0;
    while(qu.length){const k=qu.shift();if(k===t0)break;const i=k%nx,j=(k-i)/nx;
      for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const i2=i+a,j2=j+b;if(i2<0||j2<0||i2>=nx||j2>=ny)continue;const k2=j2*nx+i2;
        if(!free[k2]||prev[k2]>=0)continue;if(a&&b&&(!free[j*nx+i2]||!free[j2*nx+i]))continue;prev[k2]=k;qu.push(k2)}}
    if(prev[t0]<0)return[];const out=[];for(let k=t0;k!==s0;k=prev[k])out.push({x:(k%nx)*g+g/2,y:Math.floor(k/nx)*g+g/2});out.reverse();
    const end=free[tj*nx+ti]&&!hitsSolid(x,y)?{x,y}:null;if(end){out.pop();out.push(end)}
    return out}
  function walkTo(x,y,obj,bumpObj){pend=obj||null;pendBump=bumpObj||null;x=Math.max(PR+3,Math.min(W-PR-3,x));y=Math.max(47,Math.min(H-9,y));
    path=route(x,y);tgt=null;
    if(RM){let n=0;while(path.length&&n++<4000){const w=path[0],dx=w.x-S.x,dy=w.y-S.y,d=Math.hypot(dx,dy);if(d<1){path.shift();continue}
        const s=Math.min(4,d);if(!moveBy(dx/d*s,dy/d*s)){break}}arrive();return}
    nextWp();kick()}
  function step(dir,n){const d={u:[0,-1],d:[0,1],l:[-1,0],r:[1,0]}[dir];for(let i=0;i<(n||18)/3;i++)moveBy(d[0]*3,d[1]*3)}
  function useNear(){const n=nearest();if(n)n.act();else say('Nothing to use here. '+goalTxt)}
  // ---------- building a room ----------
  function frame(){stageEl.innerHTML='';objs=[];G={};S.zin={};
    svg=el('svg',{width:W,height:H,viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'Room '+(S.room+1)+': '+ROOMS[S.room]},stageEl);
    el('rect',{x:1,y:1,width:W-2,height:H-2,rx:8,fill:'var(--soft)',stroke:'var(--line)'},svg);
    G.bg=el('g',{},svg);G.mid=el('g',{},svg);G.top=el('g',{},svg)}
  function wall(x,y,w,h){el('rect',{x,y,width:w,height:h,fill:'var(--line)'},G.bg);return addObj({id:'w'+objs.length,x,y,w,h,solid:true})}
  function hlRect(par,x,y,w,h){return el('rect',{x:x-3,y:y-3,width:w+6,height:h+6,rx:6,fill:'none',stroke:'transparent','stroke-width':2},par)}
  function door(id,y0,y1,open,to,label){const g=el('g',{},G.bg);
    const r=el('rect',{x:W-10,y:y0,width:8,height:y1-y0,rx:2,fill:open?'var(--good)':'var(--dim)'},g);
    tx(g,W-16,(y0+y1)/2+4,label||'next',open?'b':'m','end');
    const o=addObj({id,x:W-24,y:y0,w:24,h:y1-y0,el:r,zone:()=>{if(o.off)return;if(prog.done[S.room])go(to);else say('This door opens when the room is done.',goalTxt)}});return o}
  function makeMe(x,y){S.x=x;S.y=y;G.me=figure(G.top,q(S.pass2?S.pass2.t:D.piece),{color:'var(--acc)',pack:true,sat:true});placeMe();paintBag()}
  function go(r){if(r>prog.max){say('Finish the rooms before it first.');return}S.room=r;tgt=null;pend=null;keys.clear();try{localStorage.setItem('tj-room',String(r))}catch(e){}build();drawMap()}
  function build(){const box=stageEl.parentElement;W=Math.max(300,Math.min(760,Math.floor(stageEl.clientWidth||box.clientWidth||360)));
    const flags=S.flags[S.room]=S.flags[S.room]||{};anims=[];
    ROOM[S.room](flags);hint()}
  // ---------- room 1: lookup desk and position stamp ----------
  const ROOM=[];
  ROOM[0]=function(F){H=S.pass2?300:420;frame();
    const p2=S.pass2,rows=p2?[{id:p2.id,t:p2.t,row:p2.row}]:D.near;const myId=p2?p2.id:D.tid,posN=p2?D.P+1:D.P;
    if(p2){VEC.p2t=[p2.row,null,'your row of the table'];VEC.p2x=[p2.row.map((v,i)=>v+D.pos_next[i]),null,'row + position '+posN]}
    setBag(F.st?(p2?'p2x':'x0'):F.row?(p2?'p2t':'tok'):'empty');setSat(null);
    const sw=Math.min(210,Math.floor(W*0.52)),sx=12,sy=50,rh=40;
    const shelf=el('g',{},G.bg);el('rect',{x:sx,y:sy-22,width:sw,height:rows.length*rh+30,rx:6,fill:'var(--bg)',stroke:'var(--line)'},shelf);
    tx(shelf,sx+8,sy-8,'lookup table: 4,096 rows','m','start');
    addObj({id:'shelf',x:sx,y:sy-22,w:sw,h:rows.length*rh+30,solid:true});
    rows.forEach((r,i)=>{const y=sy+i*rh;const g=el('g',{},shelf);
      tx(g,sx+8,y+17,String(r.id),'m','start');tx(g,sx+44,y+17,q(r.t),'b','start');
      const cw=Math.min(11,(sw-110)/8),cx=sx+sw-8-8*cw;for(let k=0;k<8;k++)el('rect',{x:cx+k*cw,y:y+5,width:cw,height:16,fill:colr(r.row[k],D.rms.tok),stroke:'var(--line)','stroke-width':.5},g);
      const o=addObj({id:'row'+r.id,x:sx,y:y,w:sw,h:rh-6,reach:30,hl:hlRect(g,sx+4,y+2,sw-8,rh-10),
        prompt:()=>'take row '+r.id+' ('+q(r.t)+')',
        act:()=>{if(F.row){say('Your backpack already holds row '+myId+'.');return}
          if(r.id!==myId){say('Row '+r.id+' is '+q(r.t)+'. The lookup takes the row at your own id, '+myId+'.');shake(g);return}
          F.row=1;fly(cx+4*cw,y+12,()=>{setBag(p2?'p2t':'tok');say('Row '+myId+' of 4,096: your 256 numbers (8 shown). Nothing computed, just copied.');goal('Now walk to the position stamp.')})}});
      o.ax=sx+sw+16;o.ay=y+rh-6});
    // the stamp
    const kx=Math.max(sx+sw+40,W-140),ky=60,kw=100,kh=56;const st=el('g',{},G.bg);
    el('rect',{x:kx,y:ky,width:kw,height:kh,rx:8,fill:'var(--bg)',stroke:'var(--c4)','stroke-width':1.5},st);
    tx(st,kx+kw/2,ky+20,'position stamp','b');tx(st,kx+kw/2,ky+38,'row '+posN+' of 256','m');
    const so=addObj({id:'stamp',x:kx,y:ky,w:kw,h:kh,solid:true,hl:hlRect(st,kx,ky,kw,kh),prompt:'stamp position '+posN+' on',
      act:()=>{if(!F.row){say('Take your row from the shelf first.');return}if(F.st){say('Already stamped: position '+posN+' is in your numbers.');return}
        F.st=1;shake(st);setBag(p2?'p2x':'x0');
        if(p2){say('Added, not appended: still 256 numbers, now they also say "position '+posN+'".','The 31 tokens before you kept their keys and values (the KV cache), so the hall now holds 32.');showEnd();return}
        say('Added, not appended: still 256 numbers (RMS '+f3(D.rms.tok)+' to '+f3(D.rms.x0)+').');goal('Try the twin booth, or take the door.');done(0);G.d.el.setAttribute('fill','var(--good)')}});
    so.ax=kx+kw/2;so.ay=ky+kh+14;
    if(!p2){// the twin booth: " R" (of "Roxy") at positions 20 and 25, before and after the stamp
      const bw=sw,bx=sx,by=sy-22+rows.length*rh+30+16,bh=92;const tb=el('g',{},G.bg);
      el('rect',{x:bx,y:by,width:bw,height:bh,rx:8,fill:'var(--bg)',stroke:'var(--line)'},tb);
      tx(tb,bx+bw/2,by+16,'twin booth: '+q(D.twin.piece),'b');
      VEC.twr=[D.twin.row,D.rms.tok,''];VEC.twa=[D.twin.a,D.rms.x0,''];VEC.twb=[D.twin.b,D.rms.x0,''];
      const strips=D.twin.pos.map((ps,i)=>{const y=by+28+i*28;tx(tb,bx+8,y+13,'@'+ps,'m','start');const g=el('g',{},tb);drawCells(g,'twr',bx+38,y,bw-48,18,false);return g});
      const tcap=tx(tb,bx+bw/2,by+bh-6,'same row','m');
      const to=addObj({id:'twin',x:bx,y:by,w:bw,h:bh,solid:true,hl:hlRect(tb,bx,by,bw,bh),prompt:'stamp the twins at their positions',
        act:()=>{F.tw=(F.tw||0)+1;const after=F.tw%2===1;strips.forEach((g,i)=>drawCells(g,after?(i?'twb':'twa'):'twr',bx+38,by+28+i*28,bw-48,18,false));shake(tb);
          tcap.textContent=after?'cosine '+D.twin.cos.toFixed(3):'same row';
          say(after?'Same token, same row (difference '+D.twin.tok_diff.toFixed(1)+'); after the stamp the two differ: cosine '+D.twin.cos.toFixed(3)+'.':'Unstamped again: one row, identical, wherever the token stands.',
            'Trained with no stamp at all: '+f3(D.abl.nopos.val)+' held-out loss, against '+f3(D.abl.base.val)+'.')}});
      to.ax=bx-14;to.ay=by+bh/2}
    if(!p2)G.d=door('door',H/2-30,H/2+30,!!prog.done[0],1,'hall');
    makeMe(W-50,H-24);
    goal(F.row?(F.st?'Take the door on the right.':'Walk to the position stamp.'):'Walk to the shelf and take your row (id '+myId+').');
    if(!F.row&&!p2)say('You are '+q(D.piece)+', token '+D.P+' (id '+D.tid+'). Your backpack is empty.')};
  // ---------- room 2: the attention hall ----------
  ROOM[1]=function(F){const n=D.P,gx=64,slots=n+4;const cols=Math.max(6,Math.floor((W-gx-56)/40)),rows=Math.ceil(slots/cols);const rh=64,top=58;
    H=top+rows*rh+100;frame();setBag('x0');setSat(F.merged?'a':F.pour?'hy':F.gate?'n1':null);
    // entrance wall with the norm gate
    const g0=H-98,g1=H-30;wall(gx-4,2,8,g0);wall(gx-4,g1,8,H-g1-2);
    const gate=el('g',{},G.bg);el('path',{d:'M'+(gx-10)+' '+g1+' V'+(g0+8)+' Q'+gx+' '+(g0-6)+' '+(gx+10)+' '+(g0+8)+' V'+g1,fill:'none',stroke:'var(--c5)','stroke-width':3},gate);
    tx(gate,gx,g0-12,'norm','b');
    addObj({id:'gate',x:gx-6,y:g0,w:12,h:g1-g0,zone:()=>{if(F.gate)return;F.gate=1;setSat('n1');shake(gate);
      say('The norm gate hands a rescaled COPY inside: RMS '+f3(D.rms.x0)+' to '+f3(D.rms.n1)+'. Your backpack stays as it is.',
        'Trained with no norms at all: '+f3(D.abl.nonorm.val)+' held-out loss, against '+f3(D.abl.base.val)+'.');goal('Who will you listen to most? Walk to that token and press Space.')}});
    // the sequence in reading order: tokens 0..29, your own place (30), then the future behind locked doors
    G.tok=[];const cw=(W-gx-56)/cols;const at=j=>[gx+44+(j%cols)*cw+cw/2,top+Math.floor(j/cols)*rh+30];
    for(let j=0;j<n;j++){const [cx,cy]=at(j);
      const g=figure(G.mid,tokTxt(j).trim()||tokTxt(j),{below:true,cls:'m'});g.setAttribute('transform','translate('+cx+','+cy+')');
      const lab=tx(G.mid,cx,cy+26,'','b');const pk=el('circle',{cx:cx,cy:cy-13,r:0,fill:'var(--c4)',opacity:.85},G.mid);
      const o=addObj({id:'t'+j,x:cx-9,y:cy-34,w:18,h:36,reach:16,hl:hlRect(G.mid,cx-10,cy-34,20,50),j,lab,pk,cx,cy,
        prompt:()=>F.pour?('read '+q(tokTxt(j))+'’s share'):(F.guess==null?'guess '+q(tokTxt(j)):'read '+q(tokTxt(j))+'’s key'),
        act:()=>{if(!F.gate){say('Pass the norm gate first: only the normalised copy enters the hall.');return}
          const sc=HW.score[j],w=HW.w[j];
          if(F.guess==null){F.guess=j;lab.textContent=sc.toFixed(1);say('Your guess: '+q(tokTxt(j))+'. Its score q·k/√32 = '+sc.toFixed(2)+'.','A score alone is not a share: softmax needs every score. Pull the softmax lever.');goal('Pull the softmax lever.');return}
          lab.textContent=F.pour?pct(w):sc.toFixed(1);
          say(q(tokTxt(j))+' (position '+j+'): score '+sc.toFixed(2)+(F.pour?', share '+pct(w):'')+'.')}});
      o.ax=cx+16;o.ay=cy;G.tok.push(o)}
    {const [cx,cy]=at(n);el('circle',{cx,cy:cy-16,r:15,fill:'none',stroke:'var(--acc)','stroke-dasharray':'3 3'},G.bg);tx(G.bg,cx,cy+13,'you','b');G.home=[cx,cy]}
    for(let i=0;i<3;i++){const j=n+1+i;const [cx,cy]=at(j);const g=el('g',{},G.bg);
      const r=el('rect',{x:cx-10,y:cy-36,width:20,height:36,rx:3,fill:'var(--dim)',stroke:'var(--bad)','stroke-width':1.5},g);
      el('rect',{x:cx-4,y:cy-22,width:8,height:7,rx:1,fill:'var(--bad)'},g);el('path',{d:'M'+(cx-3)+' '+(cy-22)+'v-3a3 3 0 0 1 6 0v3',fill:'none',stroke:'var(--bad)','stroke-width':1.5},g);
      tx(g,cx,cy+13,tokTxt(j).trim(),'m');
      addObj({id:'fut'+i,x:cx-10,y:cy-36,w:20,h:36,solid:true,future:true,bump:()=>{F.locked=1;shake(g);r.setAttribute('fill','var(--bad)');setTimeout(()=>r.setAttribute('fill','var(--dim)'),RM?0:350);
        say('Locked: '+q(tokTxt(j).trim())+' (position '+j+') comes after you. Its score is set to minus infinity, so its share is exactly 0.')}})}
    // the softmax lever and the heads pad
    const lx=gx+76,ly=H-74;const lv=el('g',{},G.bg);el('rect',{x:lx,y:ly,width:34,height:44,rx:6,fill:'var(--bg)',stroke:'var(--c4)','stroke-width':1.5},lv);
    const arm=el('line',{x1:lx+17,y1:ly+34,x2:lx+(F.pour?28:6),y2:ly+8,stroke:'var(--ink)','stroke-width':3,'stroke-linecap':'round'},lv);tx(lv,lx+17,ly+58,'softmax','b');
    const lo=addObj({id:'lever',x:lx,y:ly,w:34,h:44,solid:true,hl:hlRect(lv,lx,ly,34,44),prompt:'pull the softmax lever (head '+(MH+1)+')',act:()=>{
      if(!F.gate){say('Pass the norm gate first.');return}if(F.guess==null){say('Make your guess first: walk to a token and press Space.');return}
      if(F.pour){say('Already poured. Next: the 8-heads pad.');return}
      F.pour=1;arm.setAttribute('x2',lx+28);pour()}});lo.ax=lx+50;lo.ay=ly+30;
    const hx=Math.min(W-90,lx+120),hy=H-52;const hp=el('g',{},G.bg);el('circle',{cx:hx,cy:hy,r:22,fill:'var(--bg)',stroke:'var(--c6)','stroke-width':1.5,'stroke-dasharray':'4 3'},hp);
    tx(hp,hx,hy+4,'8 heads','b');
    const ho=addObj({id:'heads',x:hx-22,y:hy-22,w:44,h:44,solid:true,hl:hlRect(hp,hx-22,hy-22,44,44),prompt:()=>F.split&&!F.merged?'merge the 8 heads':'split into 8 heads',act:()=>{
      if(!F.pour){say('Pull the softmax lever first.');return}if(F.merged){say('Merged already: the hall’s answer is in your satchel.');return}
      if(!F.split){F.split=1;split()}else{F.merged=1;merge()}}});ho.ax=hx-34;ho.ay=hy+8;
    G.d=door('door',H-70,H-20,!!prog.done[1],2,'add');
    makeMe(26,H-50);
    if(F.pour)revealAll(true);
    goal(!F.gate?'Walk through the norm gate.':F.guess==null?'Walk to the token you think you will listen to most; press Space.':!F.pour?'Pull the softmax lever.':!F.merged?'Use the 8-heads pad.':'Take the door to the corridor.');
    if(!F.gate)say('The attention hall: the 30 tokens before you, holding their keys. Doors to the future are locked.')
    function revealAll(now){G.tok.forEach(o=>{const w=HW.w[o.j];o.pk.setAttribute('r',now?0:(2+12*Math.sqrt(w)).toFixed(1));o.lab.textContent=(w>=0.05||o.j===F.guess||root.classList.contains('tj-num'))?pct(w):''})}
    G.reveal=revealAll;
    function pour(){revealAll(false);const sx=S.x,sy=S.y-18;const top3=G.tok.slice().sort((a,b)=>HW.w[b.j]-HW.w[a.j]);
      tween(900,p=>{G.tok.forEach(o=>{const e=Math.min(1,p*1.15);o.pk.setAttribute('cx',(o.cx+(sx-o.cx)*e).toFixed(1));o.pk.setAttribute('cy',(o.cy-13+(sy-o.cy+13)*e).toFixed(1))})},
        ()=>{G.tok.forEach(o=>o.pk.setAttribute('r',0));setSat('hy');
          const best=top3[0].j,gj=F.guess;
          say('Head '+(MH+1)+' of 8: '+pct(HW.w[best])+' from '+q(tokTxt(best))+(gj===best?' (your guess: right).':'; your guess '+q(tokTxt(gj))+' got '+pct(HW.w[gj])+'.'),
            'Each packet is that token’s value, weighted by its share; yourself: '+pct(HW.w[D.P])+'.');goal('Use the 8-heads pad.')})}
    function split(){G.gh=[];const ox=S.x,oy=S.y;
      for(let h=0;h<D.H;h++){const w=D.heads[h].w;let j=0;for(let i=1;i<w.length;i++)if(w[i]>w[j])j=i;
        const tgtO=j<n?G.tok[j]:{cx:G.home[0],cy:G.home[1]};const g=figure(G.top,null,{ghost:true,color:'var(--c6)'});
        G.gh.push({g,ox,oy,tgtO,h,j,w:w[j]})}
      const cnt={},seen={};G.gh.forEach(o=>cnt[o.j]=(cnt[o.j]||0)+1);
      G.gh.forEach(o=>{const k=(seen[o.j]=(seen[o.j]||0)+1)-1,side=o.tgtO.cx>W-50?-1:1;o.tx=o.tgtO.cx+side*(13+(k%3)*7);o.ty=o.tgtO.cy+2+Math.floor(k/3)*9});
      tween(800,p=>G.gh.forEach(o=>{const x=o.ox+(o.tx-o.ox)*p,y=o.oy+(o.ty-o.oy)*p;o.g.setAttribute('transform','translate('+x.toFixed(1)+','+y.toFixed(1)+')')}),
        ()=>{const t=G.gh.map(o=>'h'+(o.h+1)+' '+q(tokTxt(o.j).trim()||'<eot>')+' '+pct(o.w));
          say('Eight copies, eight questions: each head looks somewhere else.',t.join(' · '));goal('Use the 8-heads pad again to merge.')})}
    function merge(){const gh=G.gh||[];tween(600,p=>gh.forEach(o=>{const x=o.tx+(S.x-o.tx)*p,y=o.ty+(S.y-o.ty)*p;o.g.setAttribute('transform','translate('+x.toFixed(1)+','+y.toFixed(1)+')')}),
      ()=>{gh.forEach(o=>o.g.remove());G.gh=[];setSat('a');done(1);G.d.el.setAttribute('fill','var(--good)');
        say('Merged: 8 heads × 32 numbers side by side = 256, then one 256×256 projection. That is the hall’s answer.','Trained with 1 head of 256 instead: '+f3(D.abl.onehead.val)+' (baseline '+f3(D.abl.base.val)+'); with no attention at all: '+f3(D.abl.noattn.val)+'.');
        goal('Take the door to the corridor.')})}
  };
  // ---------- room 3: the residual fork ----------
  ROOM[2]=function(F){H=260;frame();setBag(F.add?'x1':'x0');setSat(F.add?null:'a');
    const mx=Math.floor(W*0.42),my=H/2;wall(mx,my-8,W-mx,16);
    const lab=el('g',{},G.bg);tx(lab,mx+10,my-20,'replace','b','start');tx(lab,mx+10,my+30,'add','b','start');
    const rz=el('rect',{x:W-96,y:50,width:40,height:my-62,rx:6,fill:'var(--bg)',stroke:'var(--bad)','stroke-dasharray':'4 3'},G.bg);
    const az=el('rect',{x:W-96,y:my+12,width:40,height:H-my-24,rx:6,fill:'var(--bg)',stroke:'var(--good)','stroke-dasharray':'4 3'},G.bg);
    tx(G.bg,W-76,my/2+18,'x = a','b');tx(G.bg,W-76,my+(H-my)/2+4,'x + a','b');
    addObj({id:'rep',x:W-96,y:40,w:40,h:my-52,zone:()=>{F.rep=1;setBag('rep');setSat(null);shake(rz);
      say('Replaced: who you were is gone (cosine with your own row '+D.cos_rep.toFixed(3)+').',
        'Trained this way: '+f3(D.abl.noresid.val)+' held-out loss, stuck (baseline '+f3(D.abl.base.val)+'); it writes '+q(D.abl.noresid.greedy.slice(0,24)+'…'));
      walkBack()}});
    addObj({id:'add',x:W-96,y:my+12,w:40,h:H-my-24,zone:()=>{if(F.add)return;F.add=1;setBag('x1');setSat(null);shake(az);done(2);G.d.el.setAttribute('fill','var(--good)');
      say('Added: you keep yourself (cosine with your row '+D.cos_add.toFixed(3)+') and gain context. RMS '+f3(D.rms.x0)+' to '+f3(D.rms.x1)+'.',
        'Same data and budget with this addition: '+f3(D.abl.base.val)+'. Every block only writes a correction onto the stream.');goal('Take the door to the workshop.')}});
    function walkBack(){stopWalk();const tx0=S.x;tween(400,p=>{S.x=tx0-50*p;placeMe()},()=>{setBag('x0');setSat('a');S.zin={};goal('Try the other lane.')})}
    G.d=door('door',my+20,H-14,!!prog.done[2],3,'FFN');
    makeMe(30,my+4);goal(F.add?'Take the door to the workshop.':'Choose a lane: replace your backpack with the satchel, or add the satchel to it.');
    if(!F.add)say('The corridor forks. You carry your backpack (x) and the hall’s answer (satchel).')};
  // ---------- room 4: the FFN workshop ----------
  ROOM[3]=function(F){H=300;frame();setBag(F.out?'x2':'x1');setSat(F.out?null:F.down?'f':F.gate?'n2':null);
    const wx=Math.floor(W*0.3);const g0=H-110,g1=H-50;wall(wx-4,2,8,g0);wall(wx-4,g1,8,H-g1-2);
    tx(G.bg,wx-10,g1+22,'one at a time','m','end');
    // others waiting outside
    const others=[29,25].map((j,i)=>{const g=figure(G.mid,tokTxt(j).trim(),{below:true,cls:'m'});const x=wx-50+i*24,y=70+i*60;g.setAttribute('transform','translate('+x+','+y+')');return{g,x,y}});
    addObj({id:'wsdoor',x:wx+3,y:g0,w:10,h:g1-g0,zone:()=>{if(F.alone)return;F.alone=1;
      others.forEach(o=>tween(700,p=>{const e=p<.6?p/.6:1-(p-.6)/.4;o.g.setAttribute('transform','translate('+(o.x+(wx-14-o.x)*e).toFixed(1)+','+(o.y+(g0+20-o.y)*e).toFixed(1)+')')}));
      say('The others bounce off: inside, the FFN sees only your 256 numbers. Same weights for every token, one at a time.');goal('Pass the norm gate inside.')}});
    // norm gate inside
    const nx=wx+36;const ng=el('g',{},G.bg);el('line',{x1:nx,y1:46,x2:nx,y2:H-12,stroke:'var(--c5)','stroke-width':3,'stroke-dasharray':'2 6'},ng);tx(ng,nx,40,'norm','b');
    addObj({id:'ngate',x:nx-5,y:46,w:10,h:H-58,zone:()=>{if(F.gate)return;F.gate=1;setSat('n2');shake(ng);
      say('Another normalised copy: RMS '+f3(D.rms.x1)+' to '+f3(D.rms.n2)+'.');goal('Use the up machine: expand.')}});
    // hidden-layer display: 1,024 bars
    const bx=nx+14,bw=W-bx-12,by=52,bh=56,mid=by+bh/2;el('rect',{x:bx,y:by,width:bw,height:bh,rx:4,fill:'var(--bg)',stroke:'var(--line)'},G.bg);
    const pp=el('path',{fill:'var(--c1)'},G.bg),pn=el('path',{fill:'var(--c2)'},G.bg);const cap=tx(G.bg,bx+bw/2,by+bh+14,'hidden layer: empty','m');
    const mxv=Math.max(...D.ffn.pre.map(Math.abs));
    function bars(arr,e){let a='',b='';const cw=bw/arr.length;for(let i=0;i<arr.length;i++){const v=arr[i]*e;const h=Math.abs(v)/mxv*(bh/2-2);if(h<.2)continue;
        const x=(bx+i*cw).toFixed(2),w=Math.max(cw,.6).toFixed(2);if(v>0)a+='M'+x+' '+(mid-h).toFixed(1)+'h'+w+'v'+h.toFixed(1)+'h-'+w+'z';else b+='M'+x+' '+mid+'h'+w+'v'+h.toFixed(1)+'h-'+w+'z'}
      pp.setAttribute('d',a);pn.setAttribute('d',b)}
    function mix(p){return D.ffn.pre.map((v,i)=>v+(D.ffn.post[i]-v)*p)}
    if(F.gelu){bars(D.ffn.post,1);cap.textContent='1,024 hidden numbers after GELU'}else if(F.up){bars(D.ffn.pre,1);cap.textContent='1,024 hidden numbers before GELU'}
    if(F.down){pp.setAttribute('d','');pn.setAttribute('d','');cap.textContent='hidden layer: compressed back to 256'}
    const mw=Math.min(84,(bw-20)/3),my=by+bh+40,mh=46;
    const mk=(i,name,sub,fn)=>{const x=bx+i*(bw-mw)/2;const g=el('g',{},G.bg);el('rect',{x,y:my,width:mw,height:mh,rx:6,fill:'var(--bg)',stroke:'var(--c3)','stroke-width':1.5},g);
      tx(g,x+mw/2,my+19,name,'b');tx(g,x+mw/2,my+35,sub,'m');const o=addObj({id:'m'+i,x,y:my,w:mw,h:mh,solid:true,hl:hlRect(g,x,my,mw,mh),prompt:name+' ('+sub+')',act:()=>fn(g)});o.ax=x+mw/2;o.ay=my+mh+14;return o};
    mk(0,'up','to '+D.F.toLocaleString('en-GB'),g=>{if(!F.gate){say('Pass the norm gate first.');return}if(F.up){say('Expanded already.');return}F.up=1;shake(g);
      tween(500,p=>bars(D.ffn.pre,p),()=>{cap.textContent='1,024 hidden numbers before GELU';say('Expanded to '+D.F.toLocaleString('en-GB')+' numbers: '+pct(D.ffn.neg_share)+' of them negative.');goal('Use the GELU gate.')})});
    mk(1,'GELU','gate',g=>{if(!F.up){say('Expand first: use the up machine.');return}if(F.gelu){say('Gated already.');return}F.gelu=1;shake(g);
      tween(700,p=>bars(mix(p),1),()=>{cap.textContent='1,024 hidden numbers after GELU';say('GELU squashes the negatives toward 0: '+pct(D.ffn.small_post)+' are now within 0.05 of 0.');goal('Use the down machine: compress.')})});
    mk(2,'down','to 256',g=>{if(!F.gelu){say('Gate first: use GELU.');return}if(F.down){say('Compressed already.');return}F.down=1;shake(g);
      tween(500,p=>bars(D.ffn.post,1-p),()=>{cap.textContent='hidden layer: compressed back to 256';setSat('f');
        tween(500,()=>{},()=>{F.out=1;setBag('x2');setSat(null);done(3);G.d.el.setAttribute('fill','var(--good)');
          say('Back to 256 and added to your backpack: RMS '+f3(D.rms.x1)+' to '+f3(D.rms.x2)+'. Block 1 done.','Trained with no FFNs: '+f3(D.abl.noffn.val)+' held-out loss (baseline '+f3(D.abl.base.val)+').');goal('Take the door: five more blocks.')})})});
    G.d=door('door',H-60,H-16,!!prog.done[3],4,'');
    makeMe(28,H-80);goal(F.out?'Take the door: five more blocks.':!F.alone?'Walk into the workshop.':!F.gate?'Pass the norm gate inside.':'Use the machines in order.');
    if(!F.alone)say('The FFN workshop: a private room. Two other tokens are waiting outside.')};
  // ---------- room 5: five more blocks ----------
  ROOM[4]=function(F){H=220;frame();const b=F.b||1;setBag('L'+b);setSat(null);
    const gap=(W-90)/5;
    for(let i=2;i<=D.L;i++){const x=40+(i-1.5)*gap;const g=el('g',{},G.bg);
      el('rect',{x:x-6,y:30,width:12,height:H-60,rx:4,fill:i<=b?'var(--good)':'var(--dim)',opacity:.55},g);tx(g,x,24,'block '+i,'b');
      const rl=tx(g,x,H-14,i<=b?'RMS '+f3(D.layers[i].rms):'','m');
      addObj({id:'b'+i,x:x-6,y:0,w:12,h:H,zone:()=>{if(i!==(F.b||1)+1)return;F.b=i;g.firstChild.setAttribute('fill','var(--good)');rl.textContent='RMS '+f3(D.layers[i].rms);shake(g);setBag('L'+i);
        say('Block '+i+' of '+D.L+': the same rooms with new weights. Still 256 numbers; RMS '+f3(D.layers[i].rms)+'.');
        if(i===D.L){done(4);G.d.el.setAttribute('fill','var(--good)');goal('Take the door to the exit hall.')}else goal('Walk on through block '+(i+1)+'.')}})}
    G.d=door('door',H/2-24,H/2+24,!!prog.done[4],5,'exit');
    makeMe(20,H/2+12);goal(b>=D.L?'Take the door to the exit hall.':'Walk through the next block.');
    if(b<2)say('Five more blocks, each norm, attention, add, norm, FFN, add. Walk through them.')};
  // ---------- room 6: the exit hall ----------
  ROOM[5]=function(F){H=360;frame();setBag(F.fn?'hf':'L'+D.L);setSat(null);
    const gx=56;const g0=H/2-34,g1=H/2+34;wall(gx-4,2,8,g0);wall(gx-4,g1,8,H-g1-2);
    const gate=el('g',{},G.bg);el('path',{d:'M'+(gx-10)+' '+g1+' V'+(g0+8)+' Q'+gx+' '+(g0-6)+' '+(gx+10)+' '+(g0+8)+' V'+g1,fill:'none',stroke:'var(--c5)','stroke-width':3},gate);tx(gate,gx,g0-12,'final norm','b');
    addObj({id:'fgate',x:gx-6,y:g0,w:12,h:g1-g0,zone:()=>{if(F.fn)return;F.fn=1;setBag('hf');shake(gate);say('The final norm: RMS '+f3(D.layers[D.L].rms)+' to '+f3(D.rms.hf)+'.');goal('Hold your backpack up to the table.')}});
    const top=D.top;const dx=W-26,dy0=36,dyl=H-50;
    const mirror=el('g',{},G.bg),mx=gx+30,my=50,mw=Math.min(120,W-mx-150),mh=46;
    el('rect',{x:mx,y:my,width:mw,height:mh,rx:6,fill:'var(--bg)',stroke:'var(--c1)','stroke-width':1.5},mirror);tx(mirror,mx+mw/2,my+19,'the table again','b');tx(mirror,mx+mw/2,my+35,'4,096 rows','m');
    const mo=addObj({id:'table',x:mx,y:my,w:mw,h:mh,solid:true,hl:hlRect(mirror,mx,my,mw,mh),prompt:'compare your backpack with every row',act:()=>{
      if(!F.fn){say('Pass the final norm first.');return}if(F.sc){say('Scored already: the doors are open.');return}F.sc=1;shake(mirror);doors(true);
      say('One dot product per row: 4,096 scores, the same table you took your row from (tied weights). Softmax makes them the doors.',
        'The text goes on with '+q(D.next_true)+': probability '+pct(D.next_true_p)+', rank '+D.next_true_rank+'.');goal('Walk into a door, or roll the dice.')}});mo.ax=mx+mw+16;mo.ay=my+mh/2+12;
    const dl=el('g',{},G.bg);const dial=el('g',{},G.bg),kx=mx,ky=H-120,kw=Math.min(120,mw),kh=40;
    el('rect',{x:kx,y:ky,width:kw,height:kh,rx:6,fill:'var(--bg)',stroke:'var(--c5)','stroke-width':1.5},dial);const dtx=tx(dial,kx+kw/2,ky+25,'','b');
    function dialTxt(){dtx.textContent='temperature '+S.T}dialTxt();
    const ko=addObj({id:'dial',x:kx,y:ky,w:kw,h:kh,solid:true,hl:hlRect(dial,kx,ky,kw,kh),prompt:'turn the temperature',act:()=>{
      if(!F.sc){say('Score against the table first.');return}S.T=S.T===1?1.5:S.T===1.5?0.5:1;dialTxt();doors(false);const p=probs();
      say('Temperature '+S.T+': '+q(top[0].t)+' now '+pct(p[0])+(S.T<1?' (sharper).':S.T>1?' (flatter).':'.'))}});ko.ax=kx+kw+16;ko.ay=ky+kh/2+12;
    const dice=el('g',{},G.bg),ix=kx,iy=H-60,iw=kw,ih=36;el('rect',{x:ix,y:iy,width:iw,height:ih,rx:6,fill:'var(--bg)',stroke:'var(--c4)','stroke-width':1.5},dice);tx(dice,ix+iw/2,iy+23,'roll the dice','b');
    const io=addObj({id:'dice',x:ix,y:iy,w:iw,h:ih,solid:true,hl:hlRect(dice,ix,iy,iw,ih),prompt:'sample a next token',act:()=>{
      if(!F.sc){say('Score against the table first.');return}const p=probs();let r=Math.random(),k=0;for(;k<p.length-1;k++){r-=p[k];if(r<0)break}shake(dice);pick(k,'The dice drew')}});io.ax=ix+iw+16;io.ay=iy+ih/2+12;
    function probs(){const l=top.map(t=>t.logit/S.T),m=Math.max(...l);const e=l.map(v=>Math.exp(v-m));const s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s)}
    const ND=6;G.doors=[];
    function doors(first){const p=probs();const rest=p.slice(ND).reduce((a,b)=>a+b,0);const parts=p.slice(0,ND).concat([rest]);
      const minL=24,free=dyl-minL*parts.length;const L=parts.map(v=>minL+free*v);const old=G.doors.map(d=>[d.y,d.h]);
      if(first){while(dl.firstChild)dl.removeChild(dl.firstChild);G.doors=[];objs=objs.filter(o=>!o.exitDoor);
        parts.forEach((v,i)=>{const r=el('rect',{x:dx,y:0,width:16,height:0,rx:3,fill:'var(--acc)',opacity:.8},dl);const t=tx(dl,dx-5,0,'','b','end');
          const o=addObj({id:'x'+i,exitDoor:true,x:dx-4,y:0,w:24,h:0,zone:()=>{if(F.pk)return;if(i<ND)pick(i,'You chose');else{const q2=probs().slice(ND);let r2=Math.random()*q2.reduce((a,b)=>a+b,0),k=0;for(;k<q2.length-1;k++){r2-=q2[k];if(r2<0)break}pick(ND+k,'Through the narrow door: the draw among the other '+(top.length-ND)+' gave')}}});
          G.doors.push({r,t,o,y:dy0,h:0})})}
      let y=dy0;const ys=L.map(l=>{const a=y;y+=l;return a});
      tween(first?0:450,e=>G.doors.forEach((d,i)=>{const y1=old[i]?old[i][0]+(ys[i]-old[i][0])*e:ys[i],h1=old[i]?old[i][1]+(L[i]-2-old[i][1])*e:L[i]-2;
        d.y=y1;d.h=h1;d.r.setAttribute('y',y1.toFixed(1));d.r.setAttribute('height',Math.max(1,h1).toFixed(1));d.o.y=y1;d.o.h=h1;
        d.t.setAttribute('y',(y1+h1/2+4).toFixed(1));d.t.textContent=(i<ND?q(top[i].t.trim()):(top.length-ND)+' more')+' '+pct(parts[i])}))}
    function pick(k,how){if(F.pk)return;F.pk=1;const t=top[k];const p=probs()[k];done(5);
      const d=G.doors[Math.min(k,ND)];const g=figure(G.top,q(t.t.trim()),{color:'var(--good)'});const y=d.y+d.h/2+12;
      const ty=H/2+14;tween(1000,e=>g.setAttribute('transform','translate('+(dx-10-(dx-10-gx-26)*e).toFixed(1)+','+(y+(ty-y)*e).toFixed(1)+')'),()=>{
        S.next={id:t.id,t:t.t,row:t.row};say(how+' '+q(t.t)+' (id '+t.id+'; '+pct(p)+' of the top 40 at temperature '+S.T+'). It is token '+(D.P+1)+' now, and starts at the lookup desk.');
        goal('Play the next token, or start over.');showEnd()})}
    if(F.sc)doors(true);
    makeMe(26,H/2+10);goal(!F.fn?'Walk through the final norm.':!F.sc?'Hold your backpack up to the table.':'Walk into a door, or roll the dice.');
    if(!F.fn)say('The exit hall. Your backpack, after 6 blocks, is about to become a prediction.')};
  // ---------- effects ----------
  function shake(g){if(RM||!g)return;g.classList.remove('tj-shake');void g.getBBox;g.classList.add('tj-shake')}
  function fly(x,y,end){const c=el('rect',{x:x-6,y:y-6,width:12,height:12,rx:2,fill:'var(--c1)'},G.top);
    tween(500,p=>{c.setAttribute('x',(x-6+(S.x-x)*p).toFixed(1));c.setAttribute('y',(y-6+(S.y-24-y)*p).toFixed(1))},()=>{c.remove();end()})}
  function showEnd(){$('tj-end').hidden=false;$('tj-endnote').textContent=S.pass2?'Every later token repeats these rooms; each one adds its key and value to the hall for the tokens after it.':
    'Start to finish, your 256 numbers changed RMS from '+f3(D.rms.tok)+' to '+f3(D.layers[D.L].rms)+', and the shape never changed.'}
  // ---------- map, controls, input ----------
  function drawMap(){const m=$('tj-map');m.innerHTML='';ROOMS.forEach((n,i)=>{const b=document.createElement('button');b.textContent=(i+1)+' '+n;
    b.className=(i===S.room?'on ':'')+(prog.done[i]?'dn':'');b.disabled=i>prog.max;b.setAttribute('aria-pressed',i===S.room?'true':'false');
    b.addEventListener('click',()=>{S.pass2=null;go(i)});m.appendChild(b)})}
  const KM={ArrowUp:'u',ArrowDown:'d',ArrowLeft:'l',ArrowRight:'r',w:'u',s:'d',a:'l',d:'r',W:'u',S:'d',A:'l',D:'r'};
  stageEl.addEventListener('keydown',e=>{const k=KM[e.key];
    if(k){e.preventDefault();if(RM){step(k);return}if(!keys.has(k)){keys.add(k);kick()}return}
    if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)useNear()}});
  stageEl.addEventListener('keyup',e=>{const k=KM[e.key];if(k)keys.delete(k)});
  stageEl.addEventListener('blur',()=>keys.clear());
  stageEl.addEventListener('pointerdown',e=>{if(!svg)return;stageEl.focus({preventScroll:true});const r=svg.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;
    let hit=null;for(const o of objs){if(o.act&&!o.off&&x>=o.x-6&&x<=o.x+o.w+6&&y>=o.y-6&&y<=o.y+o.h+6){hit=o;break}}
    if(hit){if(rectDist(hit,S.x,S.y)<=hit.reach){hit.act();return}walkTo(hit.ax!=null?hit.ax:hit.x+hit.w/2,hit.ay!=null?hit.ay:hit.y+hit.h+12,hit);return}
    for(const o of objs)if(o.bump&&x>=o.x-4&&x<=o.x+o.w+4&&y>=o.y-4&&y<=o.y+o.h+4){walkTo(x,y,null,o);return}
    walkTo(x,y,null)});
  root.querySelectorAll('.tj-pad button').forEach(b=>{const k=b.dataset.dir;
    b.addEventListener('pointerdown',e=>{e.preventDefault();if(RM){step(k);return}keys.add(k);kick()});
    ['pointerup','pointerleave','pointercancel'].forEach(t=>b.addEventListener(t,()=>keys.delete(k)));
    b.addEventListener('click',e=>{if(e.detail===0)step(k)})});
  $('tj-act').addEventListener('click',useNear);
  $('tj-num').addEventListener('change',e=>{root.classList.toggle('tj-nonum',!e.target.checked);root.classList.toggle('tj-num',e.target.checked);paintBag();if(S.room===1&&S.flags[1]&&S.flags[1].pour&&G.reveal)G.reveal(true)});
  root.classList.add('tj-nonum');
  function restart(){S=fresh();prog={max:0,done:{}};save();$('tj-end').hidden=true;go(0)}
  $('tj-reset').addEventListener('click',restart);$('tj-again').addEventListener('click',restart);
  $('tj-next').addEventListener('click',()=>{if(!S.next)return;S.pass2=S.next;S.flags[0]={};$('tj-end').hidden=true;go(0);
    say('You are '+q(S.pass2.t)+', token '+(D.P+1)+' (id '+S.pass2.id+'). Same rooms, one more token in the hall.')});
  root.querySelectorAll('a[data-sec]').forEach(a=>a.addEventListener('click',()=>{const s=a.dataset.sec;setTimeout(()=>{const t=document.getElementById(s);if(t)t.scrollIntoView({block:'start'})},30)}));
  $('tj-dims').textContent='Backpack cells: dimensions '+D.dims.join(', ')+' of 256. Tick "numbers" for the exact values.';
  $('tj-dimlist').textContent=D.dims.join(', ');$('tj-ckval').textContent=String(D.ckpt_val_loss);
  // draw when the tab opens (and on resize, keeping the room's state)
  let started=false,lastW=0;
  function render(){if(root.hidden)return;const w=Math.floor(stageEl.clientWidth);if(started&&w===lastW)return;lastW=w;
    if(!started){started=true;let r=0;try{r=+localStorage.getItem('tj-room')||0}catch(e){}S.room=Math.min(r,prog.max)}
    drawMap();build()}
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-journey']=window.TAB_RENDER['t-journey']||[]).push(render);
  addEventListener('resize',()=>{if(!root.hidden&&started)render()});
  // a read-only handle for the page's checks (src/journey/check_journey.mjs)
  window.TJ={state:()=>S,objs:()=>objs.map(o=>({id:o.id,x:o.x,y:o.y,w:o.w,h:o.h,ax:o.ax,ay:o.ay,act:!!o.act,solid:!!o.solid,zone:!!o.zone})),
    busy:()=>!!raf||anims.length>0,size:()=>[W,H],route:(x,y)=>route(x,y)};
})();
