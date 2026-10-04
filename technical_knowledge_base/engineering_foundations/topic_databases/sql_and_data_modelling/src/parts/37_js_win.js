// ---- Reading, section 4: a window function stepping over the real rows of chat 11 ----
(function(){
  const svgEl=document.getElementById('rd-win-svg');if(!svgEl)return;
  const D=window.SM_DATA;
  const R=D.msgs.filter(m=>m[1]===11).sort((a,b)=>a[0]-b[0]).map(m=>({id:m[0],role:m[2]?'assistant':'user',tok:m[4]}));
  const n=R.length,maxTok=Math.max(...R.map(r=>r.tok));
  const F={
    sum:{sql:'SUM(tokens) OVER (ORDER BY id)',frame:i=>[0,i],val:i=>R.slice(0,i+1).reduce((s,r)=>s+r.tok,0),
      cap:(i,v)=>'The default frame runs from the first row to the current one, so the running total adds row '+(i+1)+'’s '+R[i].tok+' tokens: '+v+'.'},
    avg3:{sql:'AVG(tokens) OVER (ORDER BY id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)',frame:i=>[Math.max(0,i-2),i],
      val:i=>{const s=R.slice(Math.max(0,i-2),i+1);return Math.round(s.reduce((a,r)=>a+r.tok,0)/s.length*10)/10},
      cap:(i,v)=>'The frame is this row and up to two before it ('+(Math.min(i,2)+1)+' rows), so the average is '+v+'. Near the start the frame is shorter, which is why the first values are noisier.'},
    lag:{sql:'LAG(tokens) OVER (ORDER BY id)',frame:i=>i>0?[i-1,i-1]:null,val:i=>i>0?R[i-1].tok:null,
      cap:(i,v)=>i?'LAG reads the previous row in the window order: '+v+' tokens. Subtracting timestamps the same way gives the gap between messages.':'The first row has no previous row, so LAG returns NULL.'},
    rank:{sql:'RANK() OVER (ORDER BY tokens DESC)',frame:null,val:i=>1+R.filter(r=>r.tok>R[i].tok).length,
      cap:(i,v)=>'RANK counts the rows that sort before this one by tokens (outlined): '+(v-1)+' of them, so this row ranks '+v+'. Ties would share a rank and leave a gap.'},
    last:{sql:'LAST_VALUE(tokens) OVER (ORDER BY id)',frame:i=>[0,i],val:i=>R[i].tok,
      cap:(i,v)=>'The default frame ends at the current row, so the "last value" is always the current row’s own tokens ('+v+'). Almost never what was meant.'},
    lastall:{sql:'LAST_VALUE(tokens) OVER (ORDER BY id ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)',frame:()=>[0,n-1],val:()=>R[n-1].tok,
      cap:(i,v)=>'With the whole partition as the frame, every row sees the chat’s last message: '+v+' tokens.'}};
  let mode='sum';
  function draw(i){
    const f=F[mode];document.getElementById('rd-win-sql').textContent=f.sql;
    const W=RD.width(svgEl),rh=18,top=20,cId=W<420?34:44,cRole=W<420?62:76,cRes=W<420?56:80,bx=cId+cRole,bw=Math.max(60,W-bx-cRes-8);
    let s=RD.t(0,13,'id',{fs:10.5,fill:'var(--mute)'})+RD.t(cId,13,'role',{fs:10.5,fill:'var(--mute)'})+RD.t(bx,13,'tokens (to scale)',{fs:10.5,fill:'var(--mute)'})+RD.t(W-4,13,'result',{fs:10.5,a:'end',fill:'var(--mute)'});
    const fr=f.frame?f.frame(i):null;
    R.forEach((r,k)=>{const y=top+k*rh;
      if(k===i)s+='<rect x="0" y="'+(y-1)+'" width="'+W+'" height="'+rh+'" fill="var(--hl)"/>';
      const inFrame=mode==='rank'?r.tok>R[i].tok:(fr&&k>=fr[0]&&k<=fr[1]);
      s+=RD.t(0,y+12,r.id,{fs:11})+RD.t(cId,y+12,r.role,{fs:11,fill:r.role==='user'?'var(--c1)':'var(--c3)'});
      s+='<rect x="'+bx+'" y="'+(y+3)+'" width="'+Math.max(1,bw*r.tok/maxTok)+'" height="'+(rh-7)+'" rx="2" fill="'+(inFrame?'var(--acc)':'var(--dim)')+'"/>';
      s+=RD.t(bx+bw*r.tok/maxTok+4,y+12,r.tok,{fs:10,fill:'var(--mute)'});
      if(k<=i){const v=f.val(k);s+=RD.t(W-4,y+12,v===null?'NULL':v,{fs:11,a:'end',w:k===i?600:400,fill:v===null?'var(--mute)':''})}});
    if(fr&&mode!=='rank'){const y0=top+fr[0]*rh-2,h=(fr[1]-fr[0]+1)*rh+2;s+='<rect x="'+(bx-3)+'" y="'+y0+'" width="'+(bw+6)+'" height="'+h+'" rx="4" fill="none" stroke="var(--acc)" stroke-width="2"/>'}
    svgEl.innerHTML=RD.svg(W,top+n*rh+4,s,'Window function over the messages of chat 11');
    const v=f.val(i);document.getElementById('rd-win-cap').innerHTML='<div class="t">Row '+(i+1)+' of '+n+' (message '+R[i].id+')</div><p>'+f.cap(i,v===null?'NULL':v)+'</p>';
  }
  window.RD_WIN={ids:R.map(r=>r.id),vals:Object.fromEntries(Object.keys(F).map(k=>[k,R.map((r,i)=>F[k].val(i))]))}; // for src/check_page.mjs
  const A=RD.anim({card:'rd-win-card',ctl:'rd-win-ctl',n:n,ms:900,label:'Row',draw});
  RD.seg(document.getElementById('rd-win-fn'),m=>{mode=m;A.reset(n);A.play()});
  RD.onResize(()=>A.redraw());
})();
