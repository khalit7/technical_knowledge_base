// ---- Tab: METR time horizon fit on the released runs, and the doubling-time trend ----
window.TH=(function(){
  const M=AG.metr;
  // weighted logistic regression on (log2 minutes) with an L2 penalty lam on the slope only; Newton's method
  function fit(ag){
    const xs=[],w1=[],w0=[];let tot=0;
    M.tasks.forEach((t,i)=>{const r=ag.r[i];if(!r||!r[0])return;tot+=r[2]});
    M.tasks.forEach((t,i)=>{const r=ag.r[i];if(!r||!r[0])return;const W=r[2]/tot;xs.push(Math.log2(t[0]));w1.push(W*r[1]/r[0]);w0.push(W*(r[0]-r[1])/r[0])});
    const lam=1e-5;let a=0,b=-0.5;
    const obj=(a,b)=>{let f=0;for(let i=0;i<xs.length;i++){const z=a+b*xs[i];const lp=-Math.log1p(Math.exp(-z)),lq=-Math.log1p(Math.exp(z));f-=w1[i]*(z>-30?lp:z)+w0[i]*(z<30?lq:-z)}return f+lam*b*b/2};
    for(let it=0;it<100;it++){
      let ga=0,gb=lam*b,haa=0,hab=0,hbb=lam;
      for(let i=0;i<xs.length;i++){const z=a+b*xs[i],s=1/(1+Math.exp(-z)),w=w1[i]+w0[i],e=w*s-w1[i],h=w*s*(1-s);ga+=e;gb+=e*xs[i];haa+=h;hab+=h*xs[i];hbb+=h*xs[i]*xs[i]}
      const det=haa*hbb-hab*hab;if(!(det>0))break;
      let da=(hbb*ga-hab*gb)/det,db=(haa*gb-hab*ga)/det;
      let step=1,f0=obj(a,b);while(step>1e-6&&obj(a-step*da,b-step*db)>f0+1e-15)step/=2;
      a-=step*da;b-=step*db;if(Math.abs(step*da)+Math.abs(step*db)<1e-12)break;
    }
    const hz=p=>Math.pow(2,(Math.log(p/(1-p))-a)/b);
    return {a,b,p50:hz(0.5),p80:hz(0.8),n:xs.length};
  }
  function bins(ag){const edges=[1,4,16,64,256,960,2880],out=[];
    for(let j=0;j<edges.length-1;j++){let s=0,w=0;M.tasks.forEach((t,i)=>{const r=ag.r[i];if(!r||!r[0]||t[0]<edges[j]||t[0]>=edges[j+1])return;s+=r[2]*r[1]/r[0];w+=r[2]});out.push(w>0?[Math.sqrt(edges[j]*edges[j+1]),s/w]:null)}return out}
  function trend(from,excl){
    const P=M.trend.filter(p=>p.sota&&p.rel>=from&&(!excl||p.p50<=960));
    const xs=P.map(p=>Date.parse(p.rel)/864e5),ys=P.map(p=>Math.log2(p.p50));const n=xs.length;
    const mx=xs.reduce((s,v)=>s+v,0)/n,my=ys.reduce((s,v)=>s+v,0)/n;let sxy=0,sxx=0;for(let i=0;i<n;i++){sxy+=(xs[i]-mx)*(ys[i]-my);sxx+=(xs[i]-mx)**2}
    const b=sxy/sxx;return {n,b,a:my-b*mx,dbl:1/b,P};
  }
  return {fit,bins,trend};
})();
(function(){
  const root=document.getElementById('t-th');if(!root)return;
  const M=AG.metr,E=RD.esc,sel=document.getElementById('th-m');
  M.agents.forEach((g,i)=>{const o=document.createElement('option');o.value=i;o.textContent=g.n+' ('+g.rel+')';sel.appendChild(o)});
  sel.value=M.agents.findIndex(g=>g.n==='Claude Opus 4.6');
  const fmtMin=m=>m<1?(m*60).toFixed(0)+' s':m<120?m.toFixed(1)+' min':(m/60).toFixed(1)+' h';
  function draw(){
    const g=M.agents[+sel.value],f=TH.fit(g);
    document.getElementById('th-out').innerHTML=RD.stat('50% horizon, fitted here',fmtMin(f.p50),f.p50.toFixed(2)+' min')+RD.stat('METR\'s figure',fmtMin(g.p50),g.p50.toFixed(2)+' min; 95% CI '+fmtMin(g.p50lo)+' to '+fmtMin(g.p50hi))+
      RD.stat('80% horizon',fmtMin(f.p80),'METR: '+g.p80.toFixed(2)+' min')+RD.stat('Slope b',f.b.toFixed(3),'per doubling of human time')+RD.stat('Tasks with runs',f.n,'of '+M.tasks.length);
    const W=RD.width(root.querySelector('#th-fig')),H=Math.max(240,Math.min(330,W*0.55)),L=40,R=10,T=12,B=34;
    const lx0=Math.log2(0.015),lx1=Math.log2(3000),X=m=>L+(W-L-R)*(Math.log2(m)-lx0)/(lx1-lx0),Y=v=>T+(H-T-B)*(1-v);
    let b='';[0,0.25,0.5,0.75,1].forEach(v=>{b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(v)+4,(v*100)+'%',{a:'end',fs:10.5,fill:'var(--mute)'})});
    [[1/30,'2 s'],[1,'1 min'],[15,'15 min'],[60,'1 h'],[480,'8 h'],[1920,'32 h']].forEach(([m,l])=>{b+='<line x1="'+X(m)+'" x2="'+X(m)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--line)"/>'+RD.t(X(m),H-B+14,l,{a:'middle',fs:10.5,fill:'var(--mute)'})});
    b+=RD.t((L+W-R)/2,H-4,'time a skilled person takes (log scale)',{a:'middle',fs:11,fill:'var(--mute)'});
    const wmax=Math.max(...M.tasks.map(t=>t[1]));
    M.tasks.forEach((t,i)=>{const r=g.r[i];if(!r||!r[0])return;const rr=1.5+4*Math.sqrt(t[1]/wmax);b+='<circle cx="'+X(t[0])+'" cy="'+Y(r[1]/r[0])+'" r="'+rr.toFixed(1)+'" fill="var(--c1)" fill-opacity=".35"/>'});
    let path='';for(let j=0;j<=120;j++){const lm=lx0+(lx1-lx0)*j/120,p=1/(1+Math.exp(-(f.a+f.b*lm)));path+=(j?'L':'M')+(L+(W-L-R)*j/120).toFixed(1)+','+Y(p).toFixed(1)}
    b+='<path d="'+path+'" fill="none" stroke="var(--c2)" stroke-width="2.5"/>';
    if(document.getElementById('th-bins').checked)TH.bins(g).forEach(p=>{if(p)b+='<rect x="'+(X(p[0])-5)+'" y="'+(Y(p[1])-5)+'" width="10" height="10" fill="var(--c4)" stroke="var(--bg)"/>'});
    [[f.p50,0.5,'50%'],[f.p80,0.8,'80%']].forEach(([m,p,l])=>{if(m>0.015&&m<3000){b+='<line x1="'+X(m)+'" x2="'+X(m)+'" y1="'+Y(p)+'" y2="'+(H-B)+'" stroke="var(--c2)" stroke-dasharray="4 3"/>'+RD.t(X(m)+(X(m)>W*0.75?-4:4),Y(p)-6,l+': '+fmtMin(m),{fs:11,w:600,a:X(m)>W*0.75?'end':'start'})}});
    root.querySelector('#th-fig').innerHTML=RD.svg(W,H,b,'Success against human time');
    // reproduction check over all models
    let worst=0,rows='';M.agents.forEach(a=>{const ff=TH.fit(a),rel=Math.abs(ff.p50-a.p50)/a.p50;worst=Math.max(worst,rel)});
    document.getElementById('th-check').innerHTML='Fitted in your browser for all '+M.agents.length+' models with runs in the file: the largest difference from METR\'s published 50% horizon is '+(100*worst).toFixed(3)+'% (src/recompute.py does the same with scikit-learn).';
  }
  function trend(){
    const y=+document.getElementById('th-y').value;document.getElementById('th-yv').textContent=y;const excl=document.getElementById('th-ex').checked;
    const t=TH.trend(y+'-01-01',excl);
    document.getElementById('th-tout').innerHTML=RD.stat('Doubling time',t.dbl.toFixed(1)+' days','= '+(t.dbl/30.44).toFixed(1)+' months, from '+t.n+' frontier points')+RD.stat('METR, from 2023',M.dbl.from_2023_on.point_estimate.toFixed(1)+' days','95% CI '+M.dbl.from_2023_on.ci_low.toFixed(0)+' to '+M.dbl.from_2023_on.ci_high.toFixed(0))+RD.stat('METR, all time',M.dbl.all_time_stitched.point_estimate.toFixed(1)+' days','stitched series since 2019');
    const W=RD.width(root.querySelector('#th-trend')),H=Math.max(260,Math.min(360,W*0.6)),L=46,R=10,T=12,B=30;
    const d0=Date.parse('2019-01-01')/864e5,d1=Date.parse('2026-12-31')/864e5,ly0=Math.log2(0.02),ly1=Math.log2(6000);
    const X=d=>L+(W-L-R)*(d-d0)/(d1-d0),Y=l=>T+(H-T-B)*(1-(l-ly0)/(ly1-ly0));
    let b='';[[1/30,'2 s'],[1,'1 min'],[15,'15 min'],[60,'1 h'],[480,'8 h'],[960,'16 h'],[3840,'64 h']].forEach(([m,l])=>{b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(Math.log2(m))+'" y2="'+Y(Math.log2(m))+'" stroke="'+(m===960?'var(--bad)':'var(--line)')+'"'+(m===960?' stroke-dasharray="4 3"':'')+'/>'+RD.t(L-4,Y(Math.log2(m))+4,l,{a:'end',fs:10.5,fill:m===960?'var(--bad)':'var(--mute)'})});
    for(let yy=2019;yy<=2026;yy++){const xx=X(Date.parse(yy+'-01-01')/864e5);b+=RD.t(xx,H-10,String(yy).slice(W<500?2:0),{a:'start',fs:10.5,fill:'var(--mute)'})}
    // fitted line over the fitted window, extended to the end of 2026
    const xa=Date.parse(y+'-01-01')/864e5;b+='<line x1="'+X(xa)+'" y1="'+Y(t.a+t.b*xa)+'" x2="'+X(d1)+'" y2="'+Y(t.a+t.b*d1)+'" stroke="var(--c1)" stroke-width="2" stroke-opacity=".7"/>';
    M.trend.forEach(p=>{const d=Date.parse(p.rel)/864e5,used=t.P.includes(p);
      b+='<line x1="'+X(d)+'" x2="'+X(d)+'" y1="'+Y(Math.log2(p.hi))+'" y2="'+Y(Math.log2(p.lo))+'" stroke="var(--mute)" stroke-opacity=".5"/>'+
        '<circle cx="'+X(d)+'" cy="'+Y(Math.log2(p.p50))+'" r="4" fill="'+(used?'var(--c1)':p.sota?'var(--bg)':'var(--soft)')+'" stroke="'+(p.sota?'var(--c1)':'var(--mute)')+'" stroke-width="1.5"><title>'+E(p.n)+': '+fmtMin(p.p50)+' ('+p.rel+')</title></circle>'});
    const my=M.trend.find(p=>p.k==='claude_mythos_preview_early_inspect');
    if(my)b+=RD.t(X(Date.parse(my.rel)/864e5)-6,Y(Math.log2(my.p50))-8,'Mythos Preview (early)',{a:'end',fs:10.5,fill:'var(--bad)'});
    b+=RD.t(L+4,T+10,'50% horizon (log scale); dashed: 16 h',{fs:10.5,fill:'var(--mute)'});
    root.querySelector('#th-trend').innerHTML=RD.svg(W,H,b,'Horizon trend');
  }
  sel.addEventListener('change',draw);document.getElementById('th-bins').addEventListener('change',draw);
  document.getElementById('th-y').addEventListener('input',trend);document.getElementById('th-ex').addEventListener('change',trend);
  const all=()=>{draw();trend()};RD.onRender(all,'t-th');RD.onResize(all,'t-th');
})();
