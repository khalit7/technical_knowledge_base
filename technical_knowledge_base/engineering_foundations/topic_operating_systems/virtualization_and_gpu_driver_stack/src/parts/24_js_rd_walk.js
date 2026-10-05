// ---- Reading s4: one TLB miss, native 4-level walk against the nested (two-dimensional) walk ----
(function(){
  const grid=document.getElementById('pw-grid');if(!grid)return;
  const MODES={nat:{g:4,h:0,t:'Native'},'44':{g:4,h:4,t:'VM, 4 KiB both stages'},'43':{g:4,h:3,t:'VM, host 2 MiB pages'},'33':{g:3,h:3,t:'VM, 2 MiB pages both stages'}};
  let mode='nat',seq=[];
  function build(){const m=MODES[mode];seq=[];
    for(let l=0;l<m.g;l++){for(let j=0;j<m.h;j++)seq.push({row:l,kind:'h',lab:'H'+j,l,j});seq.push({row:l,kind:'g',lab:'G'+l,l});}
    for(let j=0;j<m.h;j++)seq.push({row:m.g,kind:'h',lab:'H'+j,l:m.g,j,fin:true});
  }
  function cap(i){const m=MODES[mode];
    if(i===0)return ['The TLB has no entry for this address',mode==='nat'?'The CPU must walk the page table: one memory read per level, '+m.g+' levels.':'The CPU must walk the guest\'s page table, but every table address in it is guest-physical and must first be translated by the host\'s table ('+m.h+' levels).'];
    const s=seq[i-1];
    if(s.kind==='g')return ['Read guest level '+s.l+' entry',mode==='nat'?'One memory read gives the address of the next level'+(s.l===m.g-1?', and finally the physical page.':'.'):'Now the guest\'s own entry can be read. It gives the next table\'s address, again guest-physical'+(s.l===m.g-1?': the data page\'s guest-physical address.':', so the next level starts with another host walk.')];
    if(s.fin)return ['Host level '+s.j+' for the data page',s.j===m.h-1?'Done: the host-physical address of the data. The TLB caches the combined result, tagged with the VM\'s identifier.':'The final guest-physical address (of the data itself) needs one more host walk.'];
    return ['Host level '+s.j+' for guest level '+s.l+'\'s table','Translating the guest-physical address of guest level '+s.l+'\'s table through the host\'s table, level '+s.j+'.'];
  }
  function draw(i){const m=MODES[mode];let h='';const rows=m.g+(m.h?1:0);
    for(let r=0;r<rows;r++){const lab=r<m.g?'Guest level '+r:'Data page';h+='<div class="row2"><b>'+lab+'</b>';
      seq.forEach((s,k)=>{if(s.row!==r)return;const done=k<i;h+='<i class="'+(done?s.kind:'')+(k===i-1?' cur':'')+'">'+s.lab+'</i>'});h+='</div>'}
    grid.innerHTML=h;
    const done=seq.slice(0,i);const nh=done.filter(s=>s.kind==='h').length,ng=done.length-nh;
    document.getElementById('pw-cnt').innerHTML=RD.stat('Memory references',done.length+' / '+seq.length,'this TLB miss')+RD.stat('Guest table reads',ng,'')+RD.stat('Host table reads',nh,mode==='nat'?'no VM':'the second dimension');
    const c=cap(i);document.getElementById('pw-cap').innerHTML='<div class="t">'+c[0]+'</div><p>'+c[1]+'</p>';
  }
  build();
  const a=RD.anim({card:'pw-card',ctl:'pw-ctl',n:seq.length+1,draw,ms:900,label:'Page walk step'});
  RD.seg(document.getElementById('pw-mode'),m=>{mode=m;build();a.reset(seq.length+1);a.play()});
})();
