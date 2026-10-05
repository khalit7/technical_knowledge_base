// ---- Section 8: the same 64 MiB buffer with 4 KiB pages and with 2 MiB transparent huge pages (measured numbers) ----
(function(){
  const D=window.VM_DATA,$=id=>document.getElementById(id),cv=$('vm-hp-cv');if(!cv)return;
  const fmt=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const F=D.first_write,fk=(k,m)=>D.fork.find(x=>x.kind===k&&x.mib===m).us;
  let mode='4k';
  // 64 MiB = 32 blocks of 2 MiB, each block 512 pages drawn as 16 x 32 cells
  const NB=32,BX=32,BY=16;
  // steps: [title, text(mode), fill fraction, sparse?]
  const S=[
    ['Reserve 64 MiB','mmap adds one VMA. No page is resident, no table entry exists yet. Both modes are identical here.',0],
    ['First touch: a quarter','The program writes one byte per 4 KiB page, front to back. {m4}',0.25],
    ['First touch: half','{m4}',0.5],
    ['First touch: three quarters','{m4}',0.75],
    ['First touch: done','{done}',1],
    ['How many TLB entries cover it','{tlb}',1],
    ['Sparse use: one byte per 2 MiB','A different buffer (256 MiB measured, 64 MiB drawn): the program touches one byte in each 2 MiB. {sparse}',1,true],
    ['fork with this memory resident','{fork}',1],
    ['Page-table memory','{pte}',1]];
  const T={
    m4:()=>mode==='4k'?'Each 4 KiB page faults separately: one trip into the kernel, one zeroed frame, one table entry per page.':'With THP each fault on a 2 MiB-aligned block fills the whole 2 MiB at once: one fault, 512 pages zeroed, one level-2 entry.',
    done:()=>mode==='4k'?'Measured: '+fmt(F['4k'].faults)+' faults, '+fmt(F['4k'].ms_median,1)+' ms (median of '+F['4k'].ms_runs.join(', ')+' ms).':'Measured: '+F.thp.faults+' faults, '+fmt(F.thp.ms_median,1)+' ms (median of '+F.thp.ms_runs.join(', ')+' ms; the first run was slow, probably finding free 2 MiB blocks). Same 64 MiB resident.',
    tlb:()=>mode==='4k'?'16,384 translations. The root measured this CPU\'s knee between 2,048 and 4,096 pages: random access over this buffer misses the TLB most of the time.':'32 translations: the whole buffer fits in the TLB many times over; random access never misses.',
    sparse:()=>mode==='4k'?'Each touch faults one 4 KiB page. Measured RSS growth: '+fmt(D.bloat['4k'])+' KiB.':'Each touch faults in a whole 2 MiB page. Measured RSS growth: '+fmt(D.bloat.thp)+' KiB, '+fmt(D.bloat.thp/D.bloat['4k'])+' times more for the same data.',
    fork:()=>'fork copies the tables, not the pages (section 7). Measured at 256 MiB resident: '+(mode==='4k'?fmt(fk('4k',256)/1000,1)+' ms (65,536 entries copied)':fmt(fk('thp',256))+' us (128 huge entries copied)')+'. At 1 GiB: '+(mode==='4k'?fmt(fk('4k',1024)/1000,1)+' ms':fmt(fk('thp',1024))+' us')+'.',
    pte:()=>'Measured VmPTE after touching 1 GiB: '+fmt(D.pte[mode])+' KiB'+(mode==='4k'?': one 4 KiB table per 2 MiB.':', the same: Linux deposits a spare table per huge page so it can split it later.')};
  const col=()=>{const cs=getComputedStyle(document.documentElement);return {on:cs.getPropertyValue(mode==='4k'?'--c1':'--c3').trim()||'#2f6fb5',off:cs.getPropertyValue('--soft').trim()||'#eee',line:cs.getPropertyValue('--line').trim()||'#ddd',ink:cs.getPropertyValue('--mute').trim()||'#777'}};
  function paint(i){const st=S[i],c=col(),W=Math.max(260,Math.min(860,cv.parentElement.clientWidth-28||600));
    const per=8,rows=NB/per,gap=4,bw=(W-gap*(per-1))/per,cw=bw/BX,bh=cw*BY*1.6,ch=bh/BY,H=rows*(bh+gap+12);
    const dpr=window.devicePixelRatio||1;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';
    const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);g.font='10px ui-sans-serif,-apple-system,Helvetica,Arial,sans-serif';
    const frac=st[2],sparse=!!st[3],filledPages=Math.round(frac*NB*512);
    for(let b=0;b<NB;b++){const x0=(b%per)*(bw+gap),y0=Math.floor(b/per)*(bh+gap+12)+12;
      g.fillStyle=c.ink;g.fillText((b*2)+' MiB',x0,y0-2);
      g.fillStyle=c.off;g.fillRect(x0,y0,bw,bh);
      g.fillStyle=c.on;
      if(sparse){ if(mode==='4k')g.fillRect(x0,y0,Math.max(1,cw),Math.max(1,ch)); else g.fillRect(x0,y0,bw,bh); }
      else if(mode==='thp'){ const blocksDone=Math.round(frac*NB); if(b<blocksDone)g.fillRect(x0,y0,bw,bh); }
      else { const n=Math.max(0,Math.min(512,filledPages-b*512)); const full=Math.floor(n/BX),rem=n%BX;
        if(full)g.fillRect(x0,y0,bw,full*ch); if(rem)g.fillRect(x0,y0+full*ch,rem*cw,ch); }
      g.strokeStyle=c.line;g.lineWidth=1;g.strokeRect(x0+.5,y0+.5,bw-1,bh-1);}
  }
  function draw(i){paint(i);const st=S[i];
    $('vm-hp-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+S.length+': '+st[0]+'</div><p>'+st[1].replace(/\{(\w+)\}/g,(m,k)=>T[k]())+'</p>';
    const frac=st[2],sparse=!!st[3],is4=mode==='4k';
    const faults=sparse?128:Math.round(frac*(is4?F['4k'].faults:F.thp.faults));
    const ms=sparse?null:frac*(is4?F['4k'].ms_median:F.thp.ms_median);
    const rss=sparse?(is4?D.bloat['4k']:D.bloat.thp):frac*65536;
    $('vm-hp-cnt').innerHTML=RD.stat('Page faults',fmt(faults),sparse?'256 MiB run':'')+RD.stat('Time in faults',ms===null?'n/a':fmt(ms,1)+' ms','scaled from the measured total')+RD.stat('Resident',fmt(rss)+' KiB',sparse?'measured':'')+RD.stat('TLB entries to cover it',i===0?'0':(sparse?'128':fmt(Math.round(frac*(is4?16384:32)))),is4?'one per 4 KiB':'one per 2 MiB');}
  const an=RD.anim({card:'vm-hp-card',ctl:'vm-hp-ctl',n:S.length,draw,ms:1800,label:'Huge page step'});
  RD.seg($('vm-hp-mode'),m=>{mode=m;an.redraw()});
  RD.onResize(()=>an.redraw());
})();
