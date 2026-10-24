// ---- Reading: hero (three intervals on one comparison), error bar against n, clustered/naive ratios, power against n, MT-Bench rank ranges ----
(function(){
  const S=window.EST;if(!S||!S.race)return;const $=id=>document.getElementById(id);
  const C=window.ES_CHECK=window.ES_CHECK||{};const narrow=W=>W<520;
  // shared: a horizontal axis with ticks
  function axis(W,x0,x1,lo,hi,ticks,fmt,y,h){const X=v=>x0+(v-lo)/(hi-lo)*(x1-x0);let s='';
    ticks.forEach(v=>{const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+y+'" y2="'+(y+h)+'" stroke="var(--line)"/>'+RD.t(x,y-4,fmt(v),{a:'middle',fs:10.5,fill:'var(--mute)'})});return{s,X}}
  // 1. hero
  const g=S.raceScores('greedy'),fr=S.fourSE(g[0],g[1],S.race.cl);C.hero=fr;
  function hero(){const host=$('rd-hero');if(!host)return;const W=Math.min(860,RD.width(host)),z=S.Z95,d=100*fr.diff,nw=narrow(W);
    const rows=[['Unpaired',fr.unpaired,'each score\'s item luck counted separately'],['Paired',fr.paired,'shared difficulty cancels item by item'],['Paired, clustered by passage',fr.clustered,'questions on one passage move together']];
    const lo=-8,hi=2,pad=8,top=22,rh=58,H=top+rows.length*rh+6;
    const A=axis(W,pad,W-pad,lo,hi,[-8,-6,-4,-2,0,2],v=>(v>0?'+':v<0?'−':'')+Math.abs(v),top,H-top-4);let s=A.s;
    s+='<line x1="'+A.X(0)+'" x2="'+A.X(0)+'" y1="'+top+'" y2="'+(H-4)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    rows.forEach((r,i)=>{const y=top+12+i*rh,h=100*z*r[1],a=A.X(d-h),b=A.X(d+h),ex=Math.abs(d)>h,col=ex?'var(--good)':'var(--acc)';
      s+=RD.t(pad,y+4,r[0]+': '+S.fmt(d,2)+' ± '+h.toFixed(2)+', '+(ex?'excludes 0':'includes 0'),{fs:12.5,fill:'var(--ink)',w:600});
      s+='<line x1="'+a+'" x2="'+b+'" y1="'+(y+16)+'" y2="'+(y+16)+'" stroke="'+col+'" stroke-width="4"/><line x1="'+a+'" x2="'+a+'" y1="'+(y+9)+'" y2="'+(y+23)+'" stroke="'+col+'" stroke-width="2"/><line x1="'+b+'" x2="'+b+'" y1="'+(y+9)+'" y2="'+(y+23)+'" stroke="'+col+'" stroke-width="2"/><circle cx="'+A.X(d)+'" cy="'+(y+16)+'" r="4" fill="'+col+'"/>';
      s+=RD.t(pad,y+38,r[2],{fs:11,fill:'var(--mute)'})});
    host.innerHTML=RD.svg(W,H,s,'95% intervals on the RACE-H difference under three analyses');}
  // 2. error bar against n at 70%
  function sen(){const host=$('rd-sen');if(!host)return;const W=Math.min(860,RD.width(host)),N=[30,100,200,500,1000,5000],p=.7,nw=narrow(W);
    const pl=nw?64:78,pr=nw?52:70,top=22,rh=26,H=top+N.length*rh+4;const A=axis(W,pl,W-pr,50,90,[50,60,70,80,90],v=>v+'%',top,H-top-2);let s=A.s;
    C.sen={};N.forEach((n,i)=>{const h=100*S.Z95*Math.sqrt(p*(1-p)/n),y=top+14+i*rh;C.sen[n]=h;
      s+=RD.t(pl-8,y+4,'n = '+n.toLocaleString('en-US'),{a:'end',fs:11.5,fill:'var(--ink)'});
      s+='<line x1="'+A.X(70-h)+'" x2="'+A.X(70+h)+'" y1="'+y+'" y2="'+y+'" stroke="var(--acc)" stroke-width="4"/><circle cx="'+A.X(70)+'" cy="'+y+'" r="3.5" fill="var(--acc)"/>';
      s+=RD.t(W-pr+8,y+4,'±'+h.toFixed(1),{fs:11.5,fill:'var(--ink)',w:600})});
    host.innerHTML=RD.svg(W,H,s,'95% interval of a 70% score against the number of items');}
  // 3. clustered / naive ratios
  function clu(){const host=$('rd-clu-svg');if(!host)return;const W=Math.min(860,RD.width(host)),nw=narrow(W);
    const M=C.mtbAll,R=C.cluRace||[];
    const rows=[['DROP (Miller, Table 4)',3.05,'pub'],['MGSM (Miller)',1.88,'pub'],['MathArena, median of 4-run rows',1.7,'der'],['MathArena, o1 (medium), AIME 2025',10.75/6.92,'der'],['RACE-H (Miller, Anthropic models)',1.10,'pub'],
      ['MT-Bench pairs, median (this page)',M?M.cp_med:NaN,'real'],['RACE-H, '+S.race.models[1]+' (this page)',R[1],'real'],['RACE-H, '+S.race.models[0]+' (this page)',R[0],'real']];
    const col={pub:'var(--c1)',der:'var(--c4)',real:'var(--good)'};
    const pl=nw?8:270,pr=40,top=20,rh=nw?36:24,H=top+rows.length*rh+4,hi=3.2;
    const A=axis(W,pl,W-pr,0,hi,[0,1,2,3],v=>v+'×',top,H-top-2);let s=A.s;
    s+='<line x1="'+A.X(1)+'" x2="'+A.X(1)+'" y1="'+top+'" y2="'+(H-2)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    rows.forEach((r,i)=>{const y=top+(nw?24:15)+i*rh;
      s+=nw?RD.t(pl,y-9,r[0],{fs:11,fill:'var(--ink)'}):RD.t(pl-8,y+4,r[0],{a:'end',fs:11.5,fill:'var(--ink)'});
      s+='<rect x="'+A.X(0)+'" y="'+(y-6)+'" width="'+(A.X(r[1])-A.X(0))+'" height="11" fill="'+col[r[2]]+'" rx="2"/>'+RD.t(A.X(r[1])+5,y+4,r[1].toFixed(2),{fs:11,fill:'var(--ink)',w:600})});
    host.innerHTML=RD.svg(W,H,s,'Clustered standard error as a multiple of the naive one');}
  // 4. power against n
  const pw={d:.1};
  function power(){const host=$('rd-pw-svg');if(!host)return;const W=Math.min(860,RD.width(host)),nw=narrow(W),p=.7,D=.02,z=S.Z95,zb=S.Z80;
    const sp=Math.sqrt(pw.d-D*D),su=Math.sqrt(2*p*(1-p)),P=(n,sg)=>S.Phi(D*Math.sqrt(n)/sg-z),N80=sg=>Math.ceil((z+zb)**2*sg*sg/(D*D));
    const pl=34,pr=10,pt=10,pb=26,H=nw?220:250,lo=Math.log(50),hi=Math.log(20000),X=n=>pl+(Math.log(n)-lo)/(hi-lo)*(W-pl-pr),Y=v=>pt+(1-v)*(H-pt-pb);
    let s='';[0,.2,.4,.6,.8,1].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="'+(v===.8?'var(--ink)':'var(--line)')+'"'+(v===.8?' stroke-dasharray="4 3"':'')+'/>'+RD.t(pl-4,Y(v)+4,Math.round(100*v)+'%',{a:'end',fs:10.5,fill:'var(--mute)'})});
    [50,100,200,500,1000,2000,5000,10000,20000].forEach(n=>{if(nw&&(n===50||n===500||n===5000))return;s+=RD.t(X(n),H-8,n>=1000?(n/1000)+'k':n,{a:'middle',fs:10.5,fill:'var(--mute)'})});
    s+='<line x1="'+X(200)+'" x2="'+X(200)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>'+RD.t(X(200)+4,pt+12,'200-item gate',{fs:11,fill:'var(--mute)'});
    const curve=(sg,c)=>{const pts=[];for(let i=0;i<=80;i++){const n=Math.exp(lo+(hi-lo)*i/80);pts.push(X(n).toFixed(1)+','+Y(P(n,sg)).toFixed(1))}return'<polyline fill="none" stroke="'+c+'" stroke-width="2.2" points="'+pts.join(' ')+'"/>'};
    const np=N80(sp),nu=N80(su);s+=curve(su,'var(--c2)')+curve(sp,'var(--acc)');
    const mk=(n,c,lab,left)=>{if(n>20000)return'';const x=X(n);return'<circle cx="'+x+'" cy="'+Y(.8)+'" r="4" fill="'+c+'"/>'+(left?RD.t(x-8,Y(.8)-8,lab,{a:'end',fs:11.5,fill:c,w:600}):RD.t(Math.min(x+8,W-pr-90),Y(.8)+18,lab,{fs:11.5,fill:c,w:600}))};
    s+=mk(np,'var(--acc)','paired '+np.toLocaleString('en-US'),true)+mk(nu,'var(--c2)','unpaired '+nu.toLocaleString('en-US'),false);
    host.innerHTML=RD.svg(W,H,s,'Power against items per model, paired and unpaired');
    $('rd-pw-dv').textContent=Math.round(100*pw.d)+'%';
    $('rd-pw-cnt').innerHTML=RD.stat('Items for 80% power, paired',np.toLocaleString('en-US'),'σ² = d − Δ²')+RD.stat('Items for 80% power, unpaired',nu.toLocaleString('en-US'),'σ² = 2p(1 − p), does not depend on d')+
      RD.stat('Power at 200 items',(100*P(200,sp)).toFixed(0)+'% paired, '+(100*P(200,su)).toFixed(0)+'% unpaired','for a true 2-point drop');
    if(Math.abs(pw.d-.1)<1e-9)C.power={np,nu,p200:P(200,sp),u200:P(200,su)};}
  if($('rd-pw-d')){$('rd-pw-d').addEventListener('input',e=>{pw.d=+e.target.value;power()});}
  // 5. MT-Bench ranks
  function ranks(){const host=$('rd-rank-svg'),R=window.ESR;if(!host||!R)return;const W=Math.min(860,RD.width(host)),nw=narrow(W),M=R.models;
    const pl=nw?118:190,rw=nw?54:96,pr=rw+8,top=22,rh=nw?17:18,H=top+M.length*rh+6,lo=2,hi=9.5;
    const A=axis(W,pl,W-pr,lo,hi,[2,4,6,8],v=>v,top,H-top-2);let s=A.s+RD.t(W-rw/2-4,top-6,'rank range',{a:'middle',fs:10.5,fill:'var(--mute)'})+RD.t(pl-6,top-6,'mean grade',{a:'end',fs:10.5,fill:'var(--mute)'});
    const short=n=>nw&&n.length>17?n.slice(0,16)+'…':n;
    M.forEach((m,i)=>{const y=top+10+i*rh,hl=m[0]==='palm-2-chat-bison-001',c=hl?'var(--c2)':'var(--acc)';
      s+=RD.t(pl-6,y+4,RD.esc(short(m[0])),{a:'end',fs:11,fill:hl?'var(--c2)':'var(--ink)',w:hl?600:400});
      s+='<line x1="'+A.X(m[2])+'" x2="'+A.X(m[3])+'" y1="'+y+'" y2="'+y+'" stroke="'+c+'" stroke-width="3" stroke-opacity=".7"/><circle cx="'+A.X(m[1])+'" cy="'+y+'" r="3" fill="'+c+'"/>';
      s+=RD.t(W-rw/2-4,y+4,m[5]===m[6]?String(m[5]):m[5]+' to '+m[6],{a:'middle',fs:11,fill:hl?'var(--c2)':'var(--ink)',w:hl?600:400})});
    host.innerHTML=RD.svg(W,H,s,'MT-Bench scores with 95% intervals and rank ranges for 34 models');}
  const all=()=>{hero();sen();clu();power();ranks()};
  all();RD.onRender(all);RD.onResize(all);
})();
