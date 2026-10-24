// ---- Reading 2: one real page seen as a screenshot and as an accessibility tree; a banner shifts the layout (data: HPCU, measured in headless Chrome) ----
(function(){
  const card=document.getElementById('hp-cu-card');if(!card||!window.HPCU)return;
  const C=HPCU,[W,H]=C.viewport,T='Thu 8 Oct, 10:00';
  const img=document.getElementById('hp-cu-img'),ov=document.getElementById('hp-cu-ov'),ax=document.getElementById('hp-cu-ax'),
    act=document.getElementById('hp-cu-act'),cap=document.getElementById('hp-cu-cap'),fc=document.getElementById('hp-cu-figcap');
  const tok=Math.ceil(W/28)*Math.ceil(H/28);
  const sh=document.getElementById('hp-cu-shift');if(sh)sh.textContent=C.shift;
  const box=(b,col,dash)=>b?'<rect x="'+b[0]+'" y="'+b[1]+'" width="'+b[2]+'" height="'+b[3]+'" rx="6" fill="none" stroke="'+col+'" stroke-width="3" vector-effect="non-scaling-stroke"'+(dash?' stroke-dasharray="6 4"':'')+'/>':'';
  const mark=(x,y,col)=>'<circle cx="'+x+'" cy="'+y+'" r="11" fill="none" stroke="'+col+'" stroke-width="3" vector-effect="non-scaling-stroke"/><line x1="'+(x-18)+'" x2="'+(x+18)+'" y1="'+y+'" y2="'+y+'" stroke="'+col+'" stroke-width="2" vector-effect="non-scaling-stroke"/><line x1="'+x+'" x2="'+x+'" y1="'+(y-18)+'" y2="'+(y+18)+'" stroke="'+col+'" stroke-width="2" vector-effect="non-scaling-stroke"/>';
  const ref=C.ax.find(l=>l.indexOf('"'+T+'"')>=0)||'',refId=(ref.match(/ref=(e\d+)/)||[])[1]||'';
  const S=[
    {img:'plain',ov:'',hl:null,act:'(the model reads the page)',t:'Observation in',p:'Left: the screenshot the model receives, '+W+' x '+H+' px, which is '+Math.ceil(W/28)+' x '+Math.ceil(H/28)+' = '+tok+' visual tokens by Anthropic\'s formula. Right: the same page as Chrome\'s accessibility tree, '+C.ax.length+' lines. Task: book Thursday 10:00.'},
    {img:'plain',ov:box(C.plain[T],'var(--good)')+mark(C.click[0],C.click[1],'var(--good)'),hl:null,act:'left_click  {"coordinate": ['+C.click[0]+', '+C.click[1]+']}',t:'A screenshot agent answers with a place',p:'The centre of the "'+T+'" button in this screenshot: ('+C.click[0]+', '+C.click[1]+') in the image\'s own pixels. The harness maps it back to the screen with the scale factor it used.'},
    {img:'plain',ov:box(C.plain[T],'var(--good)'),hl:refId,act:'browser_click  {"target": "'+refId+'"}   (button "'+T+'")',t:'A tree agent answers with an element',p:'The same decision as a reference to a node: role button, name "'+T+'". No pixels are involved.'},
    {img:'banner',ov:box(C.banner[T],'var(--good)',1)+box(C.banner[C.under],'var(--bad)')+mark(C.click[0],C.click[1],'var(--bad)'),hl:refId,act:'left_click  {"coordinate": ['+C.click[0]+', '+C.click[1]+']}   lands on "'+C.under+'"',t:'A cookie banner loads before the click',p:'Everything moves down '+C.shift+' px. The remembered point ('+C.click[0]+', '+C.click[1]+') is now over "'+C.under+'" (red), measured with elementFromPoint on the second render; the intended button (dashed) has moved. The element reference still names "'+T+'".'},
    {img:'banner',ov:box(C.banner[C.under],'var(--bad)')+mark(C.click[0],C.click[1],'var(--bad)'),hl:refId,act:'coordinate: books "'+C.under+'" (silent, plausible, wrong)   |   element: books "'+T+'"',t:'Outcome',p:'The coordinate agent booked the wrong slot and nothing complained. Two habits catch it: a fresh screenshot after every action (read back the state), and treating the final "Confirm booking" as an irreversible action that goes through the gate (section 6).'}
  ];
  function draw(i){const s=S[i];
    const src='img/cu_'+s.img+'.webp';if(img.getAttribute('src')!==src)img.setAttribute('src',src);
    img.alt=s.img==='plain'?'A fake Bay Motors booking form with four slot buttons, a note field and a Confirm booking button':'The same form after a dark cookie banner appeared at the top, pushing every button down';
    ov.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true">'+s.ov+'</svg>';
    fc.textContent=s.img==='plain'?'Screenshot, '+W+' x '+H+' px, as the model receives it. Captured for this page in headless Chrome.':'The same page after a cookie banner loaded ('+C.shift+' px taller at the top). Captured for this page in headless Chrome.';
    ax.innerHTML=C.ax.map(l=>{const on=s.hl&&l.indexOf('ref='+s.hl+']')>=0;return '<span class="'+(on?'on':(i===1?'dim':''))+'">'+RD.esc(l)+'</span>'}).join('\n');
    act.textContent=s.act;
    cap.innerHTML='<div class="t">'+(i+1)+'. '+RD.esc(s.t)+'</div><p>'+RD.esc(s.p)+'</p>';
  }
  RD.anim({card:'hp-cu-card',ctl:'hp-cu-ctl',n:S.length,draw,ms:2600,label:'Step'});
})();
