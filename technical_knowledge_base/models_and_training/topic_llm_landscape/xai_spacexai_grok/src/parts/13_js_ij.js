// ---- Fig. 9, cryptographic context injection: the attack, the plain-text method it replaced, and an egress gate (RD.anim; each scenario's steps are its ol.sx list) ----
(function(){
  const card=$('ij');if(!card)return;
  const RM=RD.RM;
  const NODES=[['User','grok.com chat'],['Grok agent','Grok 4.5 Fast'],['Web page','attacker-controlled'],['Input filter','classifies text'],['Python sandbox','the agent\'s own runtime'],['Attacker host','outside URL']];
  const F=['name','coarse location','subscription tier','chat history'];
  const S1={f:0,t:1,res:0,sent:0,v:'not yet'};
  const enc=[S1,
    {f:2,t:1,res:0,sent:0,v:'not yet'},
    {f:1,t:3,res:0,sent:0,v:'pass (ciphertext)'},
    {f:1,t:4,res:0,sent:0,v:'pass (ciphertext)'},
    {f:4,t:1,res:4,sent:0,v:'pass (ciphertext)'},
    {f:1,t:5,res:4,sent:4,v:'pass (ciphertext)'},
    {f:1,t:0,res:4,sent:4,v:'pass (ciphertext)'}];
  const plain=[S1,
    {f:2,t:1,res:0,sent:0,v:'not yet'},
    {f:1,t:3,res:0,sent:0,v:'flagged (readable)'},
    {f:1,t:0,res:0,sent:0,v:'flagged (readable)'}];
  const gate=enc.slice(0,5).concat([
    {f:1,t:5,res:4,sent:0,v:'pass (ciphertext)',blk:1},
    {f:1,t:0,res:4,sent:0,v:'pass (ciphertext)'}]);
  const SC={enc,plain,gate};
  const st={m:'enc'};
  const cl=v=>v<0?0:v>1?1:v;
  function pos(i,narrow,W){const cols=narrow?2:3,bw=narrow?150:180,bh=46,gx=(W-cols*bw)/(cols+1);return {x:gx+(i%cols)*(bw+gx),y:20+Math.floor(i/cols)*(bh+(narrow?34:56)),w:bw,h:bh}}
  // draw step k of the current scenario; on a forward step the dot travels the arrow (SMIL, 1.1 s), otherwise it sits at the arrow's end
  function draw(k){const L=SC[st.m];k=Math.min(k,L.length-1);const s0=L[k],narrow=card.clientWidth<560,W=narrow?360:660,rowsN=narrow?3:2,H=20+rowsN*46+(rowsN-1)*(narrow?34:56)+20;let s='';
    const P=NODES.map((n,i)=>pos(i,narrow,W)),fwd=card.classList.contains('rd-fwd')&&!RM;
    const used=new Set();L.slice(0,k+1).forEach(x=>{used.add(x.f);used.add(x.t)});
    NODES.forEach((n,i)=>{const p=P[i],on=i===s0.f||i===s0.t;s+=bx(p.x,p.y,p.w,p.h,on?'boxa':used.has(i)?'box':'boxo',[n[0],n[1]],narrow?11.5:12.5)});
    const a=P[s0.f],b=P[s0.t],cx=p=>p.x+p.w/2,cy=p=>p.y+p.h/2;
    const ax=cx(a),ay=cy(a),bx2=cx(b),by=cy(b),dx=bx2-ax,dy=by-ay,len=Math.hypot(dx,dy)||1;
    const sx=ax+dx/len*Math.min(a.w/2,len/3)*(Math.abs(dx)>Math.abs(dy)?1:0.35),sy=ay+dy/len*(Math.abs(dy)>Math.abs(dx)?a.h/2:a.h/3);
    const ex=bx2-dx/len*Math.min(b.w/2,len/3)*(Math.abs(dx)>Math.abs(dy)?1:0.35),ey=by-dy/len*(Math.abs(dy)>Math.abs(dx)?b.h/2:b.h/3);
    const stop=s0.blk?0.55:1,qx=sx+(ex-sx)*stop,qy=sy+(ey-sy)*stop;
    s+=ar(sx,sy,qx,qy,!!s0.blk);
    if(s0.blk){const gx=sx+(ex-sx)*0.6,gy=sy+(ey-sy)*0.6;s+='<rect x="'+(gx-9)+'" y="'+(gy-9)+'" width="18" height="18" rx="3" fill="var(--good)"/><text x="'+gx+'" y="'+(gy+4)+'" font-size="11" text-anchor="middle" fill="var(--bg)">✕</text><text x="'+gx+'" y="'+(gy-13)+'" font-size="11" text-anchor="middle" fill="var(--good)">egress gate</text>'}
    const col=s0.sent&&!s0.blk&&k===5?'var(--bad)':s0.f===2||s0.f===4?'var(--c2)':'var(--c1)';
    s+='<circle cx="'+qx.toFixed(1)+'" cy="'+qy.toFixed(1)+'" r="6" fill="'+col+'" stroke="var(--bg)" stroke-width="1.5">'+(fwd?'<animate attributeName="cx" from="'+sx.toFixed(1)+'" to="'+qx.toFixed(1)+'" dur="1.1s" fill="freeze"/><animate attributeName="cy" from="'+sy.toFixed(1)+'" to="'+qy.toFixed(1)+'" dur="1.1s" fill="freeze"/>':'')+'</circle>';
    $('ijSvg').innerHTML=svgEl(W,H,s,'Injection chain, step '+(k+1)+' of '+L.length);
    $('ijStep').textContent='step '+(k+1)+' of '+L.length;
    $('ijCnt').innerHTML=stat('Input filter',s0.v,st.m==='plain'?'readable text can be matched':'it never sees the plaintext')+
      stat('Private fields resolved',s0.res+' of 4',F.join(', '))+
      stat('Sent to the attacker',s0.sent+' of 4',st.m==='gate'?'blocked at the sandbox boundary':'in the URL\'s parameters')+
      stat('Confirmations asked','0','no prompt, no warning')}
  const LISTS={enc:'sx-ij',plain:'sx-ij-plain',gate:'sx-ij-gate'};
  const show=m=>Object.entries(LISTS).forEach(([k,id])=>{$(id).hidden=k!==m});
  show('enc');
  const an=RD.anim({card:'ij',ctl:'ijCtl',n:SC.enc.length,draw,ms:4400,label:'Step through the injection',list:'sx-ij'});
  const obs=new MutationObserver(()=>{card.dataset.playing=/Pause/.test(($('ijCtl-p')||{}).textContent||'')?'1':'0'});obs.observe($('ijCtl'),{subtree:true,childList:true,characterData:true});
  const seg=$('ijM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;show(st.m);an.reset(SC[st.m].length,LISTS[st.m])}));
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;an.redraw()}});
  window.XIJ={an,SC};
})();
