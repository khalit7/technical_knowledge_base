// ---- Section 2: the four-level walk of one address, as a stepper (arm64, 4 KiB pages). Indices from VMADDR; table and frame numbers illustrative ----
(function(){
  const $=id=>document.getElementById(id),el=$('vm-walk-svg');if(!el||!window.VMADDR)return;
  const HEX='ffff81fd2000',r=VMADDR.decode(HEX,'arm64-4k'),ix=r.idx.map(f=>f.val),off=r.off;
  // illustrative physical frame numbers of the four tables and of the data page
  const TBL=['0x4a3f1','0x4a3f2','0x51c07','0x6b2e9'],FRAME='0x8a3c1';
  const pa='0x'+(parseInt(FRAME,16)*4096+off).toString(16);
  const LV=['level 0','level 1','level 2','level 3'];
  const S=[
    ['The address','0x'+HEX+' splits into four 9-bit indices ('+ix.join(', ')+') and a 12-bit offset (0x'+off.toString(16)+'). Each index picks one of 512 entries in a 4 KiB table.'],
    ['TLB miss','The CPU looks for virtual page 0x'+HEX.slice(0,-3)+' in the TLB and misses. The walk starts at TTBR0_EL1, the register holding the physical address of this process\'s level 0 table (CR3 on x86-64); a process switch reloads it.'],
    ['Level 0','Memory read 1: entry '+ix[0]+' of the level 0 table holds the frame of a level 1 table. Each level 0 entry covers 512 GiB of addresses.'],
    ['Level 1','Memory read 2: entry '+ix[1]+' of the level 1 table points at a level 2 table. A level 1 entry covers 1 GiB; a 1 GiB huge page would end the walk here.'],
    ['Level 2','Memory read 3: entry '+ix[2]+' points at a level 3 table. A level 2 entry covers 2 MiB; a 2 MiB huge page (section 8) ends the walk here, one level shorter.'],
    ['Level 3','Memory read 4: entry '+ix[3]+' holds the frame number of the data page and its permission bits. Physical address = frame x 4096 + offset = '+pa+'.'],
    ['TLB fill','The translation is cached in the TLB: every later access to this 4 KiB page skips all four reads. The root measured 1.1 ns per access while the pages fit in the TLB and 7.6 ns once they do not.']];
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
  function draw(i){
    const W=Math.min(860,RD.width(el)),nar=W<560,m=2,U=W-2*m;
    let b='<defs><marker id="vmw-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--acc)"/></marker></defs>';
    // bit strip
    const bits=[9,9,9,9,12],tot=48;let x=m;
    bits.forEach((w,k)=>{const bw=U*w/tot-2,on=(i===0)||(k<4&&i===k+2)||(k===4&&i>=5);
      b+='<rect x="'+x.toFixed(1)+'" y="4" width="'+bw.toFixed(1)+'" height="34" rx="3" fill="'+(k<4?COL[k]:'var(--c5)')+'" fill-opacity="'+(on?.35:.1)+'" stroke="'+(on?'var(--acc)':'var(--line)')+'"'+(on?' stroke-width="2"':'')+'/>';
      b+=RD.t((x+bw/2).toFixed(1),18,k<4?(nar?'L'+k:LV[k]):'offset',{a:'middle',fs:10.5,fill:'var(--mute)'});
      b+=RD.t((x+bw/2).toFixed(1),32,k<4?String(ix[k]):'0x'+off.toString(16),{a:'middle',fs:12,w:600,fill:'var(--ink)'});x+=U*w/tot});
    // TLB and register
    const yT=58;
    b+='<rect x="'+m+'" y="'+yT+'" width="'+(nar?72:110)+'" height="28" rx="4" fill="'+(i===1?'var(--hl)':(i===6?'var(--acc2)':'var(--soft)'))+'" stroke="'+(i===1||i===6?'var(--acc)':'var(--line)')+'"/>'+RD.t(m+(nar?36:55),yT+18,i>=6?'TLB: hit next time':(i>=1?'TLB: miss':'TLB'),{a:'middle',fs:nar?10.5:11.5,fill:'var(--ink)'});
    b+=RD.t(m+(nar?80:120),yT+18,(i>=1?'TTBR0_EL1 = table '+TBL[0]:'TTBR0_EL1'),{fs:nar?10.5:11.5,fill:i===1?'var(--acc)':'var(--mute)'});
    // four tables and the frame
    const yB=104,hB=78,n=5,gap=nar?8:16,bw=(U-gap*(n-1))/n;
    for(let k=0;k<5;k++){const bx=m+k*(bw+gap),act=(k<4&&i===k+2)||(k===4&&i>=5),done=(k<4&&i>k+2)||(k===4&&i>=5),vis=(k<4&&i>=k+1)||(k===4&&i>=5)||i===0;
      const op=vis?1:.35;
      b+='<g opacity="'+op+'"><rect x="'+bx.toFixed(1)+'" y="'+yB+'" width="'+bw.toFixed(1)+'" height="'+hB+'" rx="4" fill="'+(k<4?COL[k]:'var(--c5)')+'" fill-opacity="'+(act?.28:.08)+'" stroke="'+(act?'var(--acc)':'var(--line)')+'"'+(act?' stroke-width="2"':'')+'/>';
      b+=RD.t((bx+bw/2).toFixed(1),yB+15,k<4?(nar?'L'+k+' table':LV[k]+' table'):(nar?'data page':'data page (frame)'),{a:'middle',fs:10.5,w:600,fill:'var(--ink)'});
      b+=RD.t((bx+bw/2).toFixed(1),yB+29,k<4?TBL[k]:FRAME,{a:'middle',fs:10.5,fill:'var(--mute)'});
      if(k<4){const ey=yB+40;b+='<rect x="'+(bx+4).toFixed(1)+'" y="'+ey+'" width="'+(bw-8).toFixed(1)+'" height="18" rx="2" fill="'+(act||done?'var(--hl)':'var(--bg)')+'" stroke="var(--line)"/>'+RD.t((bx+bw/2).toFixed(1),ey+13,'['+ix[k]+']',{a:'middle',fs:11,w:600,fill:'var(--ink)'});
        b+=RD.t((bx+bw/2).toFixed(1),yB+72,'512 entries',{a:'middle',fs:10.5,fill:'var(--mute)'})}
      else{b+=RD.t((bx+bw/2).toFixed(1),yB+52,'+0x'+off.toString(16),{a:'middle',fs:11,w:600,fill:'var(--ink)'});b+=RD.t((bx+bw/2).toFixed(1),yB+70,'4 KiB',{a:'middle',fs:10.5,fill:'var(--mute)'})}
      b+='</g>';
      if(k<4&&i>=k+2){const x1=bx+bw-4,x2=bx+bw+gap-1;b+='<line x1="'+x1.toFixed(1)+'" y1="'+(yB+49)+'" x2="'+x2.toFixed(1)+'" y2="'+(yB+49)+'" stroke="var(--acc)" stroke-width="2" marker-end="url(#vmw-ar)"/>'}}
    if(i>=5)b+=RD.t(W-m,yB+hB+18,'physical address '+pa,{a:'end',fs:11.5,w:600,fill:'var(--acc)'});
    el.innerHTML=RD.svg(W,yB+hB+26,b,'Page-table walk of one address through four levels');
    $('vm-walk-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+S.length+': '+S[i][0]+'</div><p>'+S[i][1]+'</p>';
    const reads=Math.max(0,Math.min(4,i-1));
    $('vm-walk-cnt').innerHTML=RD.stat('Memory reads for this access',String(i>=6?'0 next time':reads),'one per level')+RD.stat('Tables on the path',i>=1?String(Math.min(4,Math.max(0,i-1))):'0','4 KiB each, only where mapped')+RD.stat('Physical address',i>=5?pa:'(not yet)',i>=5?'frame illustrative':'');
  }
  const an=RD.anim({card:'vm-walk-card',ctl:'vm-walk-ctl',n:S.length,draw,ms:1600,label:'Walk step'});
  RD.onResize(()=>an.redraw());
})();
