// ---- Tab: pass^k on real tau2-bench trials ----
(function(){
  const root=document.getElementById('t-pk');if(!root)return;
  const E=RD.esc,OK=PK.ok(),DOMS=[...new Set(OK.map(s=>s.dom))];
  const domSel=document.getElementById('pk-dom'),kIn=document.getElementById('pk-k'),aSel=document.getElementById('pk-a'),bSel=document.getElementById('pk-b');
  DOMS.forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=OK.find(s=>s.dom===d).domn;domSel.appendChild(o)});
  domSel.value='retail';
  const inDom=()=>OK.filter(s=>s.dom===domSel.value);
  function fillAB(){const L=inDom();[aSel,bSel].forEach((sel,j)=>{sel.innerHTML='';L.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=PK.label(s);sel.appendChild(o)});sel.value=Math.min(j,L.length-1)});
    const ia=L.findIndex(s=>s.m==='Claude Opus 4.5'),ib=L.findIndex(s=>s.m==='GPT-5.2');if(ia>=0)aSel.value=ia;if(ib>=0)bSel.value=ib}
  function bars(){
    const k=+kIn.value;document.getElementById('pk-kv').textContent=k;
    const L=inDom().map(s=>({s,v1:PK.metric(s,1,'hat'),vk:PK.metric(s,k,'hat')}));
    const r1=[...L].sort((a,b)=>b.v1-a.v1),rk=[...L].sort((a,b)=>b.vk-a.vk);
    const W=RD.width(root.querySelector('#pk-bars')),nameW=Math.min(190,W*0.38),bw=W-nameW-60,rowH=26;
    let b='';rk.forEach((x,i)=>{const y=i*rowH+18,rank1=r1.indexOf(x)+1;
      b+=RD.t(0,y+12,E(PK.label(x.s)),{fs:11.5})+
      '<rect x="'+nameW+'" y="'+(y+2)+'" width="'+(bw*x.v1/100)+'" height="16" fill="var(--acc2)"/>'+
      '<rect x="'+nameW+'" y="'+(y+6)+'" width="'+(bw*x.vk/100)+'" height="8" fill="var(--c1)"/>'+
      RD.t(nameW+bw+4,y+14,x.vk.toFixed(1)+'%',{fs:11.5,w:600})+
      (rank1!==i+1?RD.t(W-2,y+14,(rank1>i+1?'&#9650;':'&#9660;')+Math.abs(rank1-(i+1)),{a:'end',fs:10.5,fill:rank1>i+1?'var(--good)':'var(--bad)'}):'')});
    root.querySelector('#pk-bars').innerHTML='<div class="leg"><span><i style="background:var(--c1)"></i>pass^'+k+'</span><span><i style="background:var(--acc2)"></i>pass^1 behind it</span><span>arrows: rank change from pass^1</span></div>'+RD.svg(W,rk.length*rowH+26,b,'pass^k by run');
    // table
    let t='<thead><tr><th>Run</th><th>Submitted</th><th>User simulator</th><th class="num">pass^1</th><th class="num">pass^2</th><th class="num">pass^3</th><th class="num">pass^4</th><th class="num">pass@4</th><th>Matches published</th></tr></thead><tbody>';
    inDom().forEach(s=>{t+='<tr><td>'+E(PK.label(s))+'</td><td>'+E(s.by)+', '+s.date+'</td><td>'+E(s.user||'')+'</td>'+[1,2,3,4].map(k=>'<td class="num">'+PK.metric(s,k,'hat').toFixed(2)+'</td>').join('')+'<td class="num">'+PK.metric(s,4,'at').toFixed(2)+'</td><td>'+(s.ok?'yes, all four':'no')+'</td></tr>'});
    root.querySelector('#pk-tab').innerHTML=t+'</tbody>';
  }
  function cmp(){
    const L=inDom(),A=L[+aSel.value],B=L[+bSel.value];if(!A||!B)return;
    const TA=PK.tasks(A),TB=PK.tasks(B),n=TA.length;
    const order=[...Array(n).keys()].sort((i,j)=>PK.cnt(TB[j])-PK.cnt(TB[i])).sort((i,j)=>PK.cnt(TA[j])-PK.cnt(TA[i]));
    let diff=0,aOnly=0,bOnly=0;for(let i=0;i<n;i++){const a=PK.cnt(TA[i]),b=PK.cnt(TB[i]);if(a!==b)diff++;if(a===4&&b<4)aOnly++;if(b===4&&a<4)bOnly++}
    root.querySelector('#pk-cmp').innerHTML='<b>'+E(PK.label(A))+'</b> pass^1 '+PK.metric(A,1,'hat').toFixed(2)+'%, pass^4 '+PK.metric(A,4,'hat').toFixed(2)+'%; <b>'+E(PK.label(B))+'</b> pass^1 '+PK.metric(B,1,'hat').toFixed(2)+'%, pass^4 '+PK.metric(B,4,'hat').toFixed(2)+'%. Success counts differ on '+diff+' of '+n+' tasks; '+aOnly+' tasks are 4 of 4 for A only, '+bOnly+' for B only.';
    const W=RD.width(root.querySelector('#pk-grid'));const perRow=W<520?2:4;const cw=6,blockW=4*cw*2+24,colsN=Math.max(1,Math.floor(W/(blockW+10)));
    let b='',rows=Math.ceil(n/colsN);
    order.forEach((ti,j)=>{const col=Math.floor(j/rows),row=j%rows,x=col*(blockW+10),y=row*(cw+2)+16;
      for(let q=0;q<4;q++){b+='<rect x="'+(x+q*cw)+'" y="'+y+'" width="'+(cw-1)+'" height="'+(cw-1)+'" fill="'+(TA[ti][q]==='1'?'var(--good)':'var(--bad)')+'"/>';
        b+='<rect x="'+(x+4*cw+8+q*cw)+'" y="'+y+'" width="'+(cw-1)+'" height="'+(cw-1)+'" fill="'+(TB[ti][q]==='1'?'var(--good)':'var(--bad)')+'"/>'}
      if(PK.cnt(TA[ti])!==PK.cnt(TB[ti]))b+='<circle cx="'+(x+8*cw+14)+'" cy="'+(y+cw/2-0.5)+'" r="2.2" fill="var(--ink)"/>'});
    b+=RD.t(0,10,'A | B per task; dot: success counts differ',{fs:10.5,fill:'var(--mute)'});
    root.querySelector('#pk-grid').innerHTML=RD.svg(W,rows*(cw+2)+22,b,'Task by task comparison');
    perRow;
  }
  function plug(){
    const L=inDom(),W=RD.width(root.querySelector('#pk-plug')),H=200,Lm=36,R=110,T=10,Bm=26,K=16;
    const X=k=>Lm+(W-Lm-R)*(k-1)/(K-1),Y=v=>T+(H-T-Bm)*(1-v/100);
    let b='';[0,25,50,75,100].forEach(v=>{b+='<line x1="'+Lm+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(Lm-4,Y(v)+4,v+'%',{a:'end',fs:10.5,fill:'var(--mute)'})});
    [1,4,8,12,16].forEach(k=>{b+=RD.t(X(k),H-8,'k='+k,{a:'middle',fs:10.5,fill:'var(--mute)'})});
    b+='<line x1="'+X(4)+'" x2="'+X(4)+'" y1="'+T+'" y2="'+(H-Bm)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    const labs=[];const cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--mute)','var(--ink)'];
    L.forEach((s,i)=>{const T4=PK.tasks(s);const pts=[];for(let k=1;k<=K;k++){let sum=0;T4.forEach(t=>{sum+=Math.pow(PK.cnt(t)/4,k)});pts.push([X(k),Y(100*sum/T4.length)])}
      const exact=[1,2,3,4].map(k=>[X(k),Y(PK.metric(s,k,'hat'))]);
      b+='<polyline fill="none" stroke="'+cols[i%8]+'" stroke-dasharray="4 3" points="'+pts.map(p=>p.join(',')).join(' ')+'"/>'+
        '<polyline fill="none" stroke="'+cols[i%8]+'" stroke-width="2" points="'+exact.map(p=>p.join(',')).join(' ')+'"/>'+
        0;labs.push([pts[K-1][1],E(PK.label(s)).slice(0,18),cols[i%8]])});
    labs.sort((a,b)=>a[0]-b[0]);let last=-1e9;labs.forEach(l=>{const yy=Math.max(l[0],last+11);last=yy;b+=RD.t(W-R+4,yy+4,l[1],{fs:10,fill:l[2]})});
    b+=RD.t(X(4)+4,T+10,'exact up to k = 4; dashed: plug-in',{fs:10.5,fill:'var(--mute)'});
    root.querySelector('#pk-plug').innerHTML=RD.svg(W,H,b,'Plug-in pass^k');
  }
  function bad(){let t='<thead><tr><th>Run</th><th>Domain</th><th class="num">Published pass^1 / pass^4</th><th class="num">From the file</th><th class="num">Errored trials</th></tr></thead><tbody>';
    AG.tau.filter(s=>!s.ok).forEach(s=>{t+='<tr><td>'+E(PK.label(s))+' <span class="mute">('+E(s.by)+', '+s.date+')</span></td><td>'+E(s.domn)+'</td><td class="num">'+s.pub[0].toFixed(2)+' / '+s.pub[3].toFixed(2)+'</td><td class="num">'+s.got[0].toFixed(2)+' / '+s.got[3].toFixed(2)+'</td><td class="num">'+s.err+'</td></tr>'});
    root.querySelector('#pk-bad').innerHTML=t+'</tbody>'}
  const all=()=>{bars();cmp();plug()};
  domSel.addEventListener('change',()=>{fillAB();all()});kIn.addEventListener('input',bars);aSel.addEventListener('change',cmp);bSel.addEventListener('change',cmp);
  fillAB();bad();RD.onRender(all,"t-pk");RD.onResize(all,"t-pk");
})();
