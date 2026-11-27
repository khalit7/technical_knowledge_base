// Section 5: the aborted-transfer race on one decode pool, freed at abort against held until drained (deferred release).
// Order of events from SGLang's companion post; sizes illustrative. Step lists: sx-race-free and sx-race-hold in 20_read_c.html.
(function(){
  const el=document.getElementById('ck-race-svg');if(!el)return;
  const cap=document.getElementById('ck-race-cap'),tt=document.getElementById('ck-race-t');
  const TITLE={free:'Freed at abort, a slot can be reused while the aborted request’s write is still on its way',
    hold:'Held until every launched write has drained, the late write lands in a slot nobody reads'};
  const NAMES={free:['A transfer in flight','Abort: slots freed','Reused by B','A late write lands','B decodes on A’s KV'],
    hold:['A transfer in flight','Abort: slots held','The late write lands','Drained, then released','B gets clean slots']};
  let mode='free';
  // slot contents per step: '' other running request, 'A' A's KV, 'a' reserved for A, not written yet, 'B' B's KV, 'X' A's KV inside B's cache, 'f' free (old bytes stay)
  function slots(i){const s=['o','o','A','A','a','a','a','o','o','o'];
    if(mode==='free'){
      if(i>=1)for(let k=2;k<=6;k++)s[k]='f';
      if(i>=2)for(let k=2;k<=6;k++)s[k]='B';
      if(i>=3)s[4]='X';
    }else{
      if(i>=2)s[4]='A';
      if(i>=3)for(let k=2;k<=6;k++)s[k]='f';
      if(i>=4)for(let k=2;k<=6;k++)s[k]='B';
    }
    return s}
  // A's five chunks on the prefill side: 'L' landed, 'N' posted to the network card, 'Q' queued, 'D' dropped
  function chunks(i){if(i===0)return ['L','L','N','Q','Q'];
    if(mode==='free')return i>=3?['L','L','L','Q','Q']:['L','L','N','Q','Q'];
    return i>=2?['L','L','L','D','D']:['L','L','N','D','D']}
  function draw(i){
    const W=RD.width(el),pad=10,inner=W-2*pad,c=Math.max(26,Math.min(54,Math.floor((inner-20-9*5)/10))),gap=5;
    const gx=pad+10+Math.max(0,Math.floor((inner-20-(10*c+9*gap))/2));
    let s='';
    // prefill lane
    let y=6;s+='<rect x="'+pad+'" y="'+y+'" width="'+inner+'" height="'+(c+44)+'" rx="10" fill="var(--card)" stroke="var(--line)"/>';
    s+=RD.t(pad+12,y+18,'Prefill: request A’s five KV chunks',{fs:13,w:600});
    const ch=chunks(i),CL={L:['landed','var(--good)'],N:['on the NIC','var(--c2)'],Q:['queued','var(--mute)'],D:['dropped','var(--mute)']};
    const cw=Math.min(2*c+gap,Math.floor((inner-24-4*gap)/5));
    ch.forEach((k,j)=>{const x=pad+12+j*(cw+gap),yy=y+28;
      s+='<rect x="'+x+'" y="'+yy+'" width="'+cw+'" height="'+(c-4)+'" rx="5" fill="'+CL[k][1]+'" fill-opacity="'+(k==='N'?'.3':'.14')+'" stroke="'+CL[k][1]+'" stroke-dasharray="'+(k==='D'?'4 3':'0')+'"/>';
      s+=RD.t(x+cw/2,yy+(c-4)/2+4,cw>=70?'a'+(j+1)+' '+CL[k][0]:(k==='N'?'NIC':k==='D'?'×':'a'+(j+1)),{a:'middle',fs:12,fill:'var(--ink)'})});
    // messages between
    y=y+c+44+18;let msg='';
    if(mode==='free')msg=['writes stream into decode slots 3 to 7','client disconnects: decode frees slots 3 to 7','allocator hands slots 3 to 7 to request B','a3 lands in slot 5, now B’s','B attends over slot 5: A’s keys and values'][i];
    else msg=['writes stream into decode slots 3 to 7','ABORT sent; a4, a5 dropped; slots held','a3 lands in slot 5, still held for A','writes drained: ABORT_ACK, slots released','B gets slots 3 to 7 and writes its own KV'][i];
    s+=RD.t(W/2,y,msg,{a:'middle',fs:12,fill:(mode==='free'&&i>=3)?'var(--bad)':'var(--ink)',w:600});
    // decode pool
    y+=12;const hd=c+58;s+='<rect x="'+pad+'" y="'+y+'" width="'+inner+'" height="'+hd+'" rx="10" fill="var(--card)" stroke="var(--line)"/>';
    s+=RD.t(pad+12,y+18,'Decode KV pool: slots 1 to 10',{fs:13,w:600});
    const held=mode==='hold'&&i>=1&&i<=2;
    const sl=slots(i),py=y+28;
    sl.forEach((k,j)=>{const x=gx+j*(c+gap);
      const F={o:['var(--line)','.35','var(--line)','0'],A:['var(--c2)','.45','var(--c2)','0'],a:['var(--c2)','.08','var(--c2)','4 3'],B:['var(--c1)','.4','var(--c1)','0'],X:['var(--bad)','.45','var(--bad)','0'],f:['var(--c2)','.12','var(--mute)','4 3']}[k];
      const cls=(i>0&&((mode==='free'&&((i===2&&k==='B')||(i===3&&k==='X')))||(mode==='hold'&&((i===2&&j===4)||(i===4&&k==='B')))))?' class="rd-new"':'';
      s+='<rect'+cls+' x="'+x+'" y="'+py+'" width="'+c+'" height="'+c+'" rx="5" fill="'+F[0]+'" fill-opacity="'+F[1]+'" stroke="'+F[2]+'" stroke-width="'+(k==='X'?2.5:1.2)+'" stroke-dasharray="'+F[3]+'"/>';
      s+=RD.t(x+c/2,py+c/2+4,k==='o'?'':k==='X'?'A!':k==='f'?'free':k==='a'?'A?':k,{a:'middle',fs:c<34&&k==='f'?11:12,fill:'var(--ink)',w:k==='X'?700:400});
      s+=RD.t(x+c/2,py+c+14,String(j+1),{a:'middle',fs:11,fill:'var(--mute)'});
    });
    if(held){const x0=gx+2*(c+gap)-3,x1=gx+7*(c+gap)-gap+3;s+='<rect x="'+x0+'" y="'+(py-4)+'" width="'+(x1-x0)+'" height="'+(c+8)+'" rx="7" fill="none" stroke="var(--ink)" stroke-width="2" stroke-dasharray="6 3"/>'+RD.t((x0+x1)/2,py+c+28,'held: not reusable',{a:'middle',fs:12,fill:'var(--ink)',w:600})}
    else if(i===4){const ok=mode==='hold';s+=RD.t(W/2,py+c+28,ok?'B reads only its own KV':'no error raised: B’s output is corrupted',{a:'middle',fs:12,fill:ok?'var(--good)':'var(--bad)',w:600})}
    const H=y+hd+6;
    el.innerHTML=RD.svg(W,H,s,'Aborted transfer and slot reuse, '+mode+' mode, step '+(i+1)+' of 5');
    cap.textContent='Step '+(i+1)+' of 5: '+NAMES[mode][i]+'.';
  }
  const A=RD.anim({card:'ck-race',ctl:'ck-race-ctl',n:5,draw:draw,ms:4200,label:'Race step',list:'sx-race-free'});
  RD.seg(document.getElementById('ck-race-m'),m=>{mode=m;tt.textContent=TITLE[m];
    ['free','hold'].forEach(k=>{document.getElementById('sx-race-'+k).hidden=k!==m});A.reset(5,'sx-race-'+m)});
  RD.onResize(()=>A.redraw());
})();
