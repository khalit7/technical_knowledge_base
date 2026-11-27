// Section 3: the prefill-to-decode handoff of one 8-page request, three modes (valid, rejected before the fix, rejected after #38935).
// Redrawn from the post's diagram; the step lists are sx-hand-ok, sx-hand-bug and sx-hand-fix in 20_read_b.html.
(function(){
  const el=document.getElementById('ck-hand-svg');if(!el)return;
  const cap=document.getElementById('ck-hand-cap'),tt=document.getElementById('ck-hand-t');
  const OWN=['A','A','B','B','B','C','C','C'];  // earlier requests that last used each page (illustrative)
  const OC={A:'var(--c4)',B:'var(--c5)',C:'var(--c6)'};
  const TITLE={ok:'A valid request overwrites every page it reserved before decode reads them',
    bug:'A rejected request passed both admission queues and decoded from pages it never wrote',
    fix:'After the fix a rejected request is retired at the first door, and decode reads nothing'};
  const NAMES=['Bootstrap','Prefill admission','Forward pass','Transfer','Decode admission','Attention','Response'];
  const NAMES_FIX=['Refused at intake','Prefill door','No forward pass','No transfer','Decode never commits','No read','Response'];
  let mode='bug';
  function badge(x,y,txt,kind){const c=kind==='bad'?'var(--bad)':kind==='good'?'var(--good)':'var(--mute)';
    const w=txt.length*7+16;return '<g class="rd-new"><rect x="'+(x-w)+'" y="'+(y-14)+'" width="'+w+'" height="20" rx="10" fill="'+c+'" fill-opacity=".14" stroke="'+c+'"/>'+RD.t(x-w/2,y+1,txt,{a:'middle',fs:11.5,fill:c,w:600})+'</g>'}
  function draw(i){
    const W=RD.width(el),pad=10,inner=W-2*pad,c=Math.max(26,Math.min(54,Math.floor((inner-24-7*6)/8))),gap=6;
    const gx=pad+12+Math.max(0,Math.floor((inner-24-(8*c+7*gap))/2));
    let s='<defs><pattern id="ck-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink)" stroke-opacity=".28" stroke-width="2"/></pattern></defs>';
    const fix=mode==='fix',bug=mode==='bug';
    // client
    let y=6;s+='<rect x="'+pad+'" y="'+y+'" width="'+inner+'" height="44" rx="10" fill="var(--card)" stroke="var(--line)"/>';
    s+=RD.t(pad+12,y+18,'Client',{fs:13,w:600})+RD.t(pad+12,y+35,'long prompt, 8 pages',{fs:12,fill:'var(--mute)'});
    if(i===6){const t=mode==='ok'?['HTTP 200: correct answer','good']:bug?['HTTP 200, should be 400','bad']:['HTTP 400: length error','good'];s+=badge(pad+inner-10,y+26,t[0],t[1])}
    // prefill
    y=64;const hp=88;s+='<rect x="'+pad+'" y="'+y+'" width="'+inner+'" height="'+hp+'" rx="10" fill="var(--card)" stroke="'+(i>=1&&i<=2?'var(--ink)':'var(--line)')+'"/>';
    s+=RD.t(pad+12,y+20,'Prefill node',{fs:13,w:600});
    if(i>=1||(fix&&i>=0)){const t=mode==='ok'?['admitted','good']:bug?['admitted: finished() = False','bad']:(i>=1?['retired at the door','good']:['refused: placeholder','neutral']);s+=badge(pad+inner-10,y+18,t[0],t[1])}
    for(let k=0;k<8;k++){const x=gx+k*(c+gap),yy=y+38;const on=i>=2&&(mode==='ok'||(bug&&k===0));
      s+='<rect x="'+x+'" y="'+yy+'" width="'+c+'" height="'+Math.min(c,40)+'" rx="5" fill="'+(on?'var(--ink)':'none')+'" fill-opacity="'+(on?'.78':'0')+'" stroke="var(--line)" stroke-dasharray="'+(on?'0':'4 3')+'"'+(on?' class="rd-new"':'')+'/>'}
    // transfer label
    const ty=y+hp+18;let tl='',tc='var(--mute)';
    if(i>=3){tl=mode==='ok'?'8 pages + "transfer complete"':bug?'1 page + "transfer complete"':'nothing sent';tc=bug?'var(--bad)':'var(--mute)'}
    else if(i===0&&!fix)tl='bootstrap: decode reserves 8 pages';
    else if(i===0)tl='the router has announced the request to decode';
    s+=RD.t(W/2,ty,(i>=3&&!fix?'↓ ':'')+tl,{a:'middle',fs:12,fill:tc,w:i===3?600:400});
    // decode
    y=ty+12;const hd=124;s+='<rect x="'+pad+'" y="'+y+'" width="'+inner+'" height="'+hd+'" rx="10" fill="var(--card)" stroke="'+(i>=3?'var(--ink)':'var(--line)')+'"/>';
    s+=RD.t(pad+12,y+20,'Decode node',{fs:13,w:600});
    if(i>=4){const t=mode==='ok'?['admitted','good']:bug?['admitted: same check','bad']:['never committed','good'];s+=badge(pad+inner-10,y+18,t[0],t[1])}
    const reserved=!(fix&&i>=4),py=y+36,ph=Math.min(c,44);
    for(let k=0;k<8;k++){const x=gx+k*(c+gap);const own=i>=3&&(mode==='ok'||(bug&&k===0));
      if(own)s+='<rect class="rd-new" x="'+x+'" y="'+py+'" width="'+c+'" height="'+ph+'" rx="5" fill="var(--good)" fill-opacity=".35" stroke="var(--good)" stroke-width="2"/>';
      else{s+='<rect x="'+x+'" y="'+py+'" width="'+c+'" height="'+ph+'" rx="5" fill="'+OC[OWN[k]]+'" fill-opacity=".22" stroke="'+(reserved?'var(--ink)':'var(--line)')+'" stroke-width="'+(reserved?1.5:1)+'"/>';
        s+='<rect x="'+x+'" y="'+py+'" width="'+c+'" height="'+ph+'" rx="5" fill="url(#ck-hatch)"/>'}
      s+=RD.t(x+c/2,py+ph/2+4,own?'P'+k:(c>=34?'P'+k+' '+OWN[k]:OWN[k]),{a:'middle',fs:12,fill:'var(--ink)',w:own?600:400});
    }
    // attention bracket
    const by=py+ph+10;
    if(i>=5){const x0=gx,x1=gx+8*c+7*gap;const col=mode==='ok'?'var(--good)':bug?'var(--bad)':'var(--mute)';
      if(!fix)s+='<path class="rd-new" d="M'+x0+' '+by+' v6 H'+x1+' v-6" fill="none" stroke="'+col+'" stroke-width="2"/>';
      s+=RD.t(W/2,by+24,mode==='ok'?(W<480?'reads P0 to P7: all its own':'attention reads P0 to P7: all written by this request'):bug?(W<480?'reads P0 to P7: 7 stale pages':'attention reads P0 to P7: 7 of 8 hold A, B and C’s data'):'no page is read',{a:'middle',fs:12,fill:col,w:600});
    }else s+=RD.t(W/2,by+24,reserved?(W<480?'8 pages reserved, never cleared':'reserved for this request: 8 pages, never cleared'):'reservation released',{a:'middle',fs:12,fill:'var(--mute)'});
    const H=y+hd+8;
    el.innerHTML=RD.svg(W,H,s,'Prefill to decode handoff, '+mode+' mode, step '+(i+1)+' of 7');
    cap.textContent='Step '+(i+1)+' of 7: '+(fix?NAMES_FIX:NAMES)[i]+'.';
  }
  const A=RD.anim({card:'ck-hand',ctl:'ck-hand-ctl',n:7,draw:draw,ms:4200,label:'Handoff step',list:'sx-hand-bug'});
  RD.seg(document.getElementById('ck-hand-m'),m=>{mode=m;tt.textContent=TITLE[m];
    ['ok','bug','fix'].forEach(k=>{document.getElementById('sx-hand-'+k).hidden=k!==m});A.reset(7,'sx-hand-'+m)});
  RD.onResize(()=>A.redraw());
})();
