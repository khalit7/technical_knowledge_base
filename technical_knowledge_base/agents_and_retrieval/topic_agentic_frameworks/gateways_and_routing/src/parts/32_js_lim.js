// ---- Limits lab (t-lim): recorded traces through four limiters, and the budget runs ----
(function(){
  const F=window.FGW,E=RD.esc;
  let mode='burst',lim=10;
  // same functions as src/recompute.py
  function anchored(ts,limit,phi){let st=null,n=0;return ts.map(t=>{const ti=Math.floor(t+phi);if(st===null||ti-st>=60){st=ti;n=0}n++;return n<=limit?200:429})}
  function calendar(ts,limit,phi){let cur=null,n=0;return ts.map(t=>{const w=Math.floor((t+phi)/60);if(w!==cur){cur=w;n=0}if(n<limit){n++;return 200}return 429})}
  function slog(ts,limit){let acc=[];return ts.map(t=>{acc=acc.filter(a=>t-a<60);if(acc.length<limit){acc.push(t);return 200}return 429})}
  function bucket(ts,cap){let tok=cap,last=null;return ts.map(t=>{if(last!==null)tok=Math.min(cap,tok+(t-last)*cap/60);last=t;if(tok>=1-1e-9){tok-=1;return 200}return 429})}
  function rows(){const tr=F.e4[mode],ts=tr.map(x=>x[0]),phi=F.phi[mode];
    const R=[['LiteLLM, recorded',tr.map(x=>x[1]),lim===10],['LiteLLM rule (replayed)',anchored(ts,lim,phi),true],['Calendar minute',calendar(ts,lim,phi),true],['Sliding log',slog(ts,lim),true],['Token bucket',bucket(ts,lim),true]];
    return {ts,R}}
  const best15=(ts,r)=>Math.max(0,...ts.map(a=>ts.reduce((n,t,i)=>n+(r[i]===200&&t>=a&&t<a+15?1:0),0)));
  const svg=document.getElementById('lm-svg'),cap=document.getElementById('lm-cap');
  function draw(i){const {ts,R}=rows();const now=ts[Math.min(i,ts.length-1)];const W=RD.width(svg),nar=W<600,L=nar?8:Math.min(150,W*0.34),Rr=W-18,tmax=mode==='burst'?70:132,X=t=>L+(Rr-L)*t/tmax;
    const rh=nar?36:26,top=nar?24:14,H=top+R.length*rh+18;let s='';const step=nar?(mode==='burst'?20:30):10;
    for(let t=0;t<=tmax;t+=step)s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="10" y2="'+(H-14)+'" stroke="var(--line)"/>'+RD.t(X(t),H-2,t+' s',{a:'middle',fs:10,fill:'var(--mute)'});
    R.forEach(([n,r,show],j)=>{const y=top+j*rh;s+=nar?RD.t(4,y-3,n+(show?'':' (recorded only at limit 10)'),{fs:11,fill:show?undefined:'var(--mute)'}):RD.t(4,y+12,n,{fs:11.5,fill:show?undefined:'var(--mute)'});
      if(!show){if(!nar)s+=RD.t(L,y+12,'recorded at limit 10 only',{fs:10.5,fill:'var(--mute)'});return}
      ts.forEach((t,k)=>{if(t>now)return;s+='<rect x="'+(X(t)-1.2)+'" y="'+(y+(r[k]===200?0:9))+'" width="2.4" height="8" fill="'+(r[k]===200?'var(--good)':'var(--bad)')+'"/>'})});
    s+='<line x1="'+X(now)+'" x2="'+X(now)+'" y1="8" y2="'+(H-14)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    svg.innerHTML=RD.svg(W,H,s,'Accepted and refused requests under four limiters');
    const upto=ts.filter(t=>t<=now).length;
    cap.innerHTML='<div class="t">'+now.toFixed(1)+' s: request '+upto+' of '+ts.length+'</div><p>'+R.filter(x=>x[2]).map(([n,r])=>E(n)+' '+r.slice(0,upto).filter(v=>v===200).length+' accepted').join('; ')+'.</p>';
    document.getElementById('lm-tab').innerHTML='<thead><tr><th>Limiter</th><th class="num">accepted</th><th class="num">most accepted in any 15 s</th><th class="num">matches the recording</th></tr></thead><tbody>'+R.filter(x=>x[2]).map(([n,r])=>'<tr><td>'+E(n)+'</td><td class="num">'+r.filter(v=>v===200).length+' of '+ts.length+'</td><td class="num">'+best15(ts,r)+'</td><td class="num">'+(lim===10?r.filter((v,k)=>v===R[0][1][k]).length+' of '+ts.length:'')+'</td></tr>').join('')+'</tbody>';
    document.getElementById('lm-note').textContent=lim===10?'At the recorded limit (10) the replayed LiteLLM rule matches all '+ts.length+' recorded decisions.':'The recording was made at limit 10; other limits show only the replayed rules.'}
  const ts0=F.e4[mode].length;
  const an=RD.anim({card:'lm-card',ctl:'lm-ctl',n:ts0,draw,ms:220,label:'Request',tab:'t-lim',start:ts0-1});
  RD.seg(document.getElementById('lm-mode'),m=>{mode=m;an.reset(F.e4[m].length);an.go(F.e4[m].length-1)});
  document.getElementById('lm-lim').addEventListener('input',e=>{lim=+e.target.value;document.getElementById('lm-limv').textContent=lim;an.redraw()});

  // budget runs
  let bm='no_max_tokens';
  function bdraw(){const el=document.getElementById('lm-bsvg');if(!el)return;const W=RD.width(el);
    let rr,msg;if(bm==='seq'){rr=F.e5.seq.map(x=>[1,x[0],x[1],x[2]]);msg=F.e5.err422}else{const w=F.e5.waves[bm];rr=w.r;msg=w.msg||'(none: every call in wave 1 was accepted; wave 2 was refused with the same budget message)'}
    const tmax=Math.max(...rr.map(x=>x[2]))*1.05,L=40,R=W-18,X=t=>L+(R-L)*t/tmax,rowH=Math.max(5,Math.min(9,180/rr.length)),H=rr.length*rowH+30;let s='';
    for(let t=0;t<=tmax;t+=2)s+=RD.t(X(t),H-4,t+' s',{a:'middle',fs:10,fill:'var(--mute)'});
    rr.forEach((x,k)=>{const y=6+k*rowH;s+='<rect x="'+X(x[1])+'" y="'+y+'" width="'+Math.max(2,X(x[2])-X(x[1]))+'" height="'+(rowH-1.5)+'" fill="'+(x[3]===200?'var(--good)':'var(--bad)')+'"><title>'+(x[3]===200?'accepted':'422 budget_exceeded')+', '+x[1].toFixed(2)+' to '+x[2].toFixed(2)+' s</title></rect>'});
    el.innerHTML=RD.svg(W,H,s,'Budget run, one bar per call');
    const ok=rr.filter(x=>x[3]===200).length;const sp=bm==='seq'?F.e5.spend_later['fgw-budget-seq']:F.e5.spend_later['fgw-'+bm];
    document.getElementById('lm-bnote').textContent=rr.length+' calls, '+ok+' accepted (green), '+(rr.length-ok)+' refused with 422 (red); final spend $'+sp+' against $'+F.e5.budget+'.';
    document.getElementById('lm-msg').textContent=msg}
  RD.seg(document.getElementById('lm-bmode'),m=>{bm=m;bdraw()});
  RD.onRender(()=>{an.redraw();bdraw()},'t-lim');
  addEventListener('resize',()=>{const t=document.getElementById('t-lim');if(t&&!t.hidden){an.redraw();bdraw()}});
})();
