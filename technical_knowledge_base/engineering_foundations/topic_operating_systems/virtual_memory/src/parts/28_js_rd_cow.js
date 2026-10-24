// ---- Section 7: fork and copy-on-write as a stepper. Four pages; costs in captions are this machine's measurements ----
(function(){
  const $=id=>document.getElementById(id),el=$('vm-cow-svg');if(!el)return;
  const D=window.VM_DATA,fmt=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const fk=(k,m)=>D.fork.find(x=>x.kind===k&&x.mib===m).us,perMiB=(fk('4k',1024)-fk('4k',0))/1024;
  const G=D.cow_gc;
  // state per step: parent entries [frame, writable], child entries or null, highlight
  const P0=[['A',1],['B',1],['C',1],['D',1]];
  const S=[
    {t:'Before fork',c:'The parent maps four private pages, each writable, each in its own frame. Frames in use: 4.',p:P0,ch:null,hl:[]},
    {t:'fork copies the tables',c:'The child gets a copy of the parent\'s page tables, not of the pages: both point at frames A to D, and every entry is now read-only in both processes. Measured cost: about '+fmt(perMiB)+' us per resident MiB with 4 KiB pages, the table copy.',p:[['A',0],['B',0],['C',0],['D',0]],ch:[['A',0],['B',0],['C',0],['D',0]],hl:['p0','p1','p2','p3','c0','c1','c2','c3']},
    {t:'The child reads page 1',c:'A read through a read-only entry is allowed: no fault, no copy. In C that is the end of it. In Python, reading an object also writes its reference count, so it becomes a write (next step).',p:[['A',0],['B',0],['C',0],['D',0]],ch:[['A',0],['B',0],['C',0],['D',0]],hl:['c1']},
    {t:'The child writes page 2',c:'The write hits a read-only entry in a writable mapping: a fault. do_wp_page sees frame C is shared, wp_page_copy copies it into a new frame C\' and the child\'s entry becomes writable. Measured: '+fmt(D.cow_write['4k'].ns_per_page)+' ns per page.',p:[['A',0],['B',0],['C',0],['D',0]],ch:[['A',0],['B',0],["C'",1],['D',0]],hl:['c2',"C'"]},
    {t:'The parent writes page 2',c:'Frame C now has one user left, the parent, so the fault just makes the parent\'s entry writable again: no copy.',p:[['A',0],['B',0],['C',1],['D',0]],ch:[['A',0],['B',0],["C'",1],['D',0]],hl:['p2']},
    {t:'The child runs gc.collect()',c:'Python\'s collector writes a counter into the header of every tracked object, so every page holding such objects is copied, read or not. Measured on one million lists: '+fmt(G.collect)+' pages copied; with gc.freeze() in the parent before fork, '+fmt(G.collect_frozen)+'.',p:[['A',0],['B',0],['C',1],['D',0]],ch:[["A'",1],["B'",1],["C'",1],["D'",1]],hl:['c0','c1','c3',"A'","B'","D'"]}];
  const copies=[0,0,0,1,1,4],faults=[0,0,0,1,2,5];
  function draw(i){const st=S[i],W=Math.min(860,RD.width(el)),nar=W<560,m=2;
    const cw=nar?(W-2*m)*.29:(W-2*m)*.26,fx1=nar?(W-2*m)*.36:(W-2*m)*.36,fw=nar?(W-2*m)*.13:(W-2*m)*.11,fx2=fx1+fw+(nar?6:12),cx=W-m-cw;
    const top=26,rh=nar?34:32,H=top+4*rh+14;
    let b=RD.t(m,14,'parent page table',{fs:11,w:600,fill:'var(--ink)'})+RD.t(m+fx1,14,'frames',{fs:11,w:600,fill:'var(--ink)'})+(st.ch?RD.t(cx,14,'child page table',{fs:11,w:600,fill:'var(--ink)'}):'');
    const frames=['A','B','C','D'],copiesF=["A'","B'","C'","D'"];
    const used=new Set();st.p.forEach(e=>used.add(e[0]));(st.ch||[]).forEach(e=>used.add(e[0]));
    const fy=k=>top+k*rh;
    const hl=n=>st.hl.indexOf(n)>=0;
    // frames
    frames.forEach((f,k)=>{const shared=st.ch&&st.p[k][0]===f&&st.ch[k][0]===f;
      b+='<rect x="'+(m+fx1).toFixed(1)+'" y="'+fy(k)+'" width="'+fw.toFixed(1)+'" height="'+(rh-8)+'" rx="3" fill="var(--c3)" fill-opacity=".2" stroke="var(--c3)"/>'+RD.t((m+fx1+fw/2).toFixed(1),fy(k)+(rh-8)/2+4,f+(shared?' x2':''),{a:'middle',fs:11,fill:'var(--ink)'})});
    copiesF.forEach((f,k)=>{if(!used.has(f))return;
      b+='<rect x="'+(m+fx2).toFixed(1)+'" y="'+fy(k)+'" width="'+fw.toFixed(1)+'" height="'+(rh-8)+'" rx="3" fill="var(--c2)" fill-opacity="'+(hl(f)?.45:.2)+'" stroke="'+(hl(f)?'var(--acc)':'var(--c2)')+'"'+(hl(f)?' stroke-width="2"':'')+'/>'+RD.t((m+fx2+fw/2).toFixed(1),fy(k)+(rh-8)/2+4,f,{a:'middle',fs:11,fill:'var(--ink)'})});
    const ent=(x,k,e,id,side)=>{const h=hl(id);
      let s='<rect x="'+x.toFixed(1)+'" y="'+fy(k)+'" width="'+cw.toFixed(1)+'" height="'+(rh-8)+'" rx="3" fill="'+(h?'var(--hl)':'var(--soft)')+'" stroke="'+(h?'var(--acc)':'var(--line)')+'"'+(h?' stroke-width="2"':'')+'/>';
      s+=RD.t(x+6,fy(k)+(rh-8)/2+4,'page '+k+(nar?' ':'  ')+(e[1]?'rw':'r-'),{fs:11,fill:'var(--ink)'});
      const isCopy=e[0].indexOf("'")>0,tx=isCopy?m+fx2+(side?fw:0):m+fx1+(side?fw:0);
      const x1=side?x:x+cw;const ty=fy(k)+(rh-8)/2;
      s+='<line x1="'+x1.toFixed(1)+'" y1="'+ty+'" x2="'+tx.toFixed(1)+'" y2="'+ty+'" stroke="'+(e[1]?'var(--c3)':'var(--mute)')+'" stroke-width="1.4"'+(e[1]?'':' stroke-dasharray="4 3"')+'/>';
      return s};
    st.p.forEach((e,k)=>{b+=ent(m,k,e,'p'+k,0)});
    if(st.ch)st.ch.forEach((e,k)=>{
      // child lines to original frames pass the copy column: route them above it
      b+=ent(cx,k,e,'c'+k,1)});
    b+=RD.t(m,H-2,'solid line: writable; dashed: read-only (a write faults)',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Parent and child page tables pointing at shared and copied frames');
    $('vm-cow-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+S.length+': '+st.t+'</div><p>'+st.c+'</p>';
    $('vm-cow-cnt').innerHTML=RD.stat('Frames in use',String(used.size),'')+RD.stat('Pages copied',String(copies[i]),i===5?'measured: '+fmt(G.collect)+' on a real heap':'')+RD.stat('Copy-on-write faults',String(faults[i]),'');}
  const an=RD.anim({card:'vm-cow-card',ctl:'vm-cow-ctl',n:S.length,draw,ms:1800,label:'Copy-on-write step'});
  RD.onResize(()=>an.redraw());
})();
