// ---- Figures of the Reading tab: the staircase explorer (hero), the technology bars, the age-since-SOTA chart and the
// sensitivity dots. Every number comes from window.ARTICLE.recompute (written by src/recompute.py from the authors' released
// runs; derived numbers only), except T2 below, the article's Table 2 as printed. No computation beyond the explorer's own
// staircase runs on load.
(function(){
  if(!window.RD||!window.ARTICLE||!window.ARTICLE.recompute||!document.getElementById('pp-ex-svg'))return;
  const D=window.ARTICLE.recompute,$=id=>document.getElementById(id),t=RD.t,L=Math.log10;
  const PRIM=['aime','chess','fm13','gpqa','mystery'];
  const SHORT={aime:'AIME',chess:'Chess',fm13:'FM 1-3',gpqa:'GPQA',mystery:'Mystery'};
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dstr=d=>{const x=new Date(Date.UTC(2023,0,1)+d*864e5);return x.getUTCDate()+' '+MON[x.getUTCMonth()]+' '+x.getUTCFullYear()};
  const usd=c=>c>=0.1?'$'+c.toFixed(2):c>=0.01?'$'+c.toFixed(3):'$'+c.toPrecision(2);
  const fold=x=>x>=100?Math.round(x)+'x':x>=10?x.toFixed(0)+'x':x.toFixed(1)+'x';

  // ---- the explorer: C(t, a) from the record-setting runs; same grid and statistic as recompute.py's one_level
  const EX={b:'gpqa',lev:75,fix:false};
  function frontier(b,a,k){
    const P=D.explorer[b].pts.filter(p=>p[3]>=a).slice().sort((x,y)=>x[k]-y[k]||x[4]-y[4]);
    const st=[];let best=Infinity;P.forEach(p=>{if(p[4]<best){best=p[4];st.push(p)}});return st;
  }
  function levelRate(b,a,k){
    const E=D.explorer[b],t0=E.d0/365.25,t1=E.d1/365.25,P=E.pts.filter(p=>p[3]>=a);
    const C=tt=>{let m=Infinity;P.forEach(p=>{if(p[k]/365.25<=tt+1e-12&&p[4]<m)m=p[4]});return m};
    const n=Math.max(2,Math.round((t1-t0)*28)+1),step=(t1-t0)/(n-1);let s=0,c=0;
    for(let i=0;i<n;i++){const tk=i===n-1?t1:t0+i*step;if(tk+0.25>t1+1e-12)continue;const a0=C(tk),a1=C(tk+0.25);if(a0<Infinity&&a1<Infinity){s+=Math.log(a1)-Math.log(a0);c++}}
    return c?{r:100*(1-Math.exp(s/c)),n:c}:null;
  }
  window.PP_levelRate=levelRate; // for src/check_page.mjs: compared with recompute.py's one_level
  function maxLev(b){return Math.floor(Math.max(...D.explorer[b].pts.map(p=>p[3]))*100)}
  function explorer(){
    const el=$('pp-ex-svg'),W=RD.width(el),narrow=W<480,k=EX.fix?2:1,a=EX.lev/100,E=D.explorer[EX.b];
    const fl=E.floor;$('pp-lev-v').textContent=EX.lev+'%'+(fl>0?' (raw '+(100*(fl+a*(1-fl))).toFixed(1)+'%)':'');
    const st=frontier(EX.b,a,k),dmax=1310;
    const ml=narrow?50:58,mr=12,mt=14,H=narrow?280:320,mb=34;
    const X=d=>ml+d/dmax*(W-ml-mr);
    let lo=-4.5,hi=0.5;
    if(st.length){lo=Math.floor(L(Math.min(...st.map(p=>p[4])))-0.3);hi=Math.ceil(L(Math.max(...st.map(p=>p[4])))+0.2)}
    const Y=v=>mt+(hi-L(v))/(hi-lo)*(H-mt-mb);
    let s='';
    for(let e=Math.ceil(lo);e<=Math.floor(hi);e++){const v=Math.pow(10,e);s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+t(ml-5,Y(v)+4,e>=0?'$'+v:'$'+v.toFixed(-e),{fs:11,a:'end',fill:'var(--mute)'})}
    [[0,'2023'],[365,'2024'],[731,'2025'],[1096,'2026']].forEach(([d,l])=>{s+='<line x1="'+X(d)+'" x2="'+X(d)+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'+t(X(d)+3,H-mb+15,l,{fs:11.5,fill:'var(--mute)'})});
    s+=t((ml+W-mr)/2,H-4,'model release date',{fs:11.5,a:'middle',fill:'var(--mute)'});
    const out=$('pp-ex-out'),tab=$('pp-ex-tab');
    if(!st.length){el.innerHTML=RD.svg(W,H,s+t(W/2,H/2,'no run reaches this level',{fs:13,a:'middle',fill:'var(--mute)'}),'No record at this level');out.innerHTML='';tab.innerHTML='<p>No run reaches this level.</p>';return}
    let d='M'+X(st[0][k])+','+Y(st[0][4]);
    st.forEach((p,i)=>{if(i)d+='H'+X(p[k])+'V'+Y(p[4])});d+='H'+X(E.d1);
    s+='<path d="'+d+'" fill="none" stroke="var(--c2)" stroke-width="2.6"/>';
    st.forEach((p,i)=>{s+='<circle cx="'+X(p[k])+'" cy="'+Y(p[4])+'" r="'+(i===0||i===st.length-1?5:3.8)+'" fill="var(--c2)" stroke="var(--card)" stroke-width="1.5"><title>'+RD.esc(p[0])+', '+dstr(p[k])+', '+usd(p[4])+' a question</title></circle>'});
    const f=st[0],l=st[st.length-1];
    s+=t(Math.min(X(f[k])+8,W-mr-4),Y(f[4])-8,RD.esc(f[0])+' '+usd(f[4]),{fs:12,a:X(f[k])>W*0.55?'end':'start',fill:'var(--ink)',w:600});
    if(st.length>1)s+=t(Math.max(X(l[k])-8,ml+4),Y(l[4])+18,RD.esc(l[0])+' '+usd(l[4]),{fs:12,a:'end',fill:'var(--ink)',w:600});
    el.innerHTML=RD.svg(W,H,s,'Record cost per question against release date at '+EX.lev+'% on '+E.name);
    const mo=(l[k]-f[k])/30.4375,fx=f[4]/l[4],lr=levelRate(EX.b,a,k);
    out.innerHTML=RD.stat('first reached',usd(f[4]),RD.esc(f[0])+', '+dstr(f[k]))+RD.stat('cheapest now',usd(l[4]),RD.esc(l[0])+', '+dstr(l[k]))+
      RD.stat('fall',fold(fx),st.length>1?'over '+mo.toFixed(1)+' months, '+fold(Math.pow(fx,12/mo))+' a year':'one record so far')+
      RD.stat('rate at this level',lr?lr.r.toFixed(1)+'%':'n/a',lr?'a quarter, over '+lr.n+' grid dates':'too recent');
    tab.innerHTML='<div class="pp-scroll"><table class="pp-tab"><tr><th>Record set by</th><th>Released</th><th>Score</th><th>$ a question</th></tr>'+st.map(p=>'<tr><td>'+RD.esc(p[0])+'</td><td>'+dstr(p[k])+'</td><td>'+(100*p[3]).toFixed(1)+'%</td><td>'+usd(p[4])+'</td></tr>').join('')+'</table></div>';
  }
  RD.seg($('pp-bench'),m=>{EX.b=m;const mx=maxLev(m),r=$('pp-lev');r.max=mx;if(EX.lev>mx)EX.lev=Math.round(mx*0.75);r.value=EX.lev;explorer()});
  $('pp-lev').addEventListener('input',e=>{EX.lev=+e.target.value;explorer()});
  $('pp-fix').addEventListener('change',e=>{EX.fix=e.target.checked;explorer()});
  $('pp-lev').max=maxLev('gpqa');

  // ---- technology bars: log points a quarter (the authors' Figure 1 data)
  function tech(){
    const el=$('pp-tech-svg');if(!el)return;const W=RD.width(el),narrow=W<480;
    const rows=[['LLM inference','2023-26'],['DNA sequencing','2001-'],['Compute','1940-2001'],['Lithium batteries','1991-2024'],['Electricity','1892-1973']];
    const ml=narrow?118:150,mr=narrow?52:64,rh=34,mt=8,H=mt+rows.length*rh+22,max=D.tech['LLM inference'].lp;
    const X=v=>ml+v/max*(W-ml-mr);let s='';
    rows.forEach(([k,y],i)=>{const v=D.tech[k],yy=mt+i*rh;
      s+='<rect x="'+ml+'" y="'+(yy+6)+'" width="'+Math.max(2,X(v.lp)-ml)+'" height="'+(rh-14)+'" rx="3" fill="'+(i?'var(--c1)':'var(--c2)')+'"/>';
      s+=t(ml-6,yy+18,k,{fs:12,a:'end',fill:'var(--ink)',w:i?400:700})+t(ml-6,yy+30,y,{fs:11,a:'end',fill:'var(--mute)'});
      s+=t(X(v.lp)+5,yy+21,v.lp.toFixed(1)+(i?' ('+v.multiple+'x slower)':''),{fs:11.5,fill:'var(--ink)'});});
    s+=t(ml,H-4,'log points per quarter',{fs:11.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Price fall per quarter in log points by technology');
  }

  // ---- age since SOTA debut: the article's Table 2 (as printed) against our model-free bins
  const T2={pool:[66.3,58.3,51.8,46.6,42.4,39.1,36.4,34.2,32.4],aime:[83.3,71.1,59.3,48.7,40.0,32.8,27.0,22.3,18.3],chess:[41.8,43.9,44.2,44.3,44.5,44.7,45.1,45.4,45.6],
    fm13:[63.6,57.1,51.5,46.6,42.3,38.6,35.5,32.5,29.8],gpqa:[80.7,71.5,62.5,54.1,46.5,39.9,34.0,28.9,24.6],mystery:[35.9,36.4,37.0,37.6,38.2,38.7,39.1,39.5,40.0]};
  let AGE='pool';
  function age(){
    const el=$('pp-age-svg');if(!el)return;const W=RD.width(el),narrow=W<480;
    const mf=AGE==='pool'?D.age_pool:D.age[AGE].map(x=>x[0]),ar=T2[AGE];
    const ml=40,mr=12,mt=12,H=narrow?250:280,mb=38,X=i=>ml+i/8*(W-ml-mr),Y=v=>mt+(100-v)/100*(H-mt-mb);let s='';
    [0,25,50,75,100].forEach(v=>{s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+t(ml-5,Y(v)+4,v+'%',{fs:11,a:'end',fill:'var(--mute)'})});
    for(let i=0;i<=8;i++)s+=t(X(i),H-mb+15,i===8?'8+':String(i),{fs:11,a:'middle',fill:'var(--mute)'});
    s+=t((ml+W-mr)/2,H-4,'quarters since the level was first reached',{fs:11.5,a:'middle',fill:'var(--mute)'});
    const line=(v,col,dash)=>{let p='',on=false;v.forEach((y,i)=>{if(y==null){on=false;return}p+=(on?'L':'M')+X(i)+','+Y(y);on=true});
      return '<path d="'+p+'" fill="none" stroke="'+col+'" stroke-width="2.6"'+(dash?' stroke-dasharray="6 4"':'')+'/>'+v.map((y,i)=>y==null?'':'<circle cx="'+X(i)+'" cy="'+Y(y)+'" r="3.4" fill="'+col+'"/>').join('')};
    s+=line(ar,'var(--c1)',true)+line(mf,'var(--c2)');
    el.innerHTML=RD.svg(W,H,s,'Rate of cost decline against quarters since a level debuted');
    const f=v=>v.map(x=>x==null?'n/a':x.toFixed(1)).join(', ');
    $('pp-age-cap').innerHTML='Cost fall per quarter by quarters since the level was first reached ('+(AGE==='pool'?'five primary benchmarks pooled geometrically':D.explorer[AGE].name)+'). Article, Table 2: '+f(ar)+' (quarters 0 to 8). Model-free, the lattice nodes of section 3 binned by age, bins with at least 30 nodes ("8+" is 8 and later): '+f(mf)+'.';
  }
  RD.seg($('pp-age-b'),m=>{AGE=m;age()});

  // ---- sensitivity dots
  function sens(){
    const el=$('pp-sens-svg');if(!el)return;const W=RD.width(el),narrow=W<480,S=D.scen;
    const lab=narrow?146:170,ml=lab+8,mr=14,rh=narrow?30:26,mt=22,H=mt+S.length*rh+30,lo=20,hi=70;
    const X=v=>ml+(v-lo)/(hi-lo)*(W-ml-mr);let s='';
    [20,30,40,50,60,70].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(mt-6)+'" y2="'+(H-28)+'" stroke="var(--line)"/>'+t(X(v),H-14,v+'%',{fs:11,a:'middle',fill:'var(--mute)'})});
    [[30,'4x'],[40,'7.7x'],[50,'16x'],[60,'39x']].forEach(([v,l])=>{s+=t(X(v),mt-10,l,{fs:11,a:'middle',fill:'var(--mute)'})});
    s+=t(ml-4,mt-10,'a year:',{fs:11,a:'end',fill:'var(--mute)'});
    s+='<line x1="'+X(D.pool_geo)+'" x2="'+X(D.pool_geo)+'" y1="'+(mt-4)+'" y2="'+(H-28)+'" stroke="var(--acc)" stroke-dasharray="4 3"/>';
    let prev='';
    S.forEach((r,i)=>{const y=mt+i*rh+rh/2;
      if(r.group!==prev&&i)s+='<line x1="4" x2="'+(W-mr)+'" y1="'+(y-rh/2)+'" y2="'+(y-rh/2)+'" stroke="var(--line)" stroke-dasharray="1 3"/>';prev=r.group;
      let name=r.label;
      s+=t(lab,y+4,RD.esc(name),{fs:narrow?11:12,a:'end',fill:'var(--ink)'});
      Object.values(r.per).forEach(v=>{if(v!=null)s+='<circle cx="'+X(Math.max(lo,Math.min(hi,v)))+'" cy="'+y+'" r="2.6" fill="var(--mute)" opacity=".6"/>'});
      if(r.lo!=null)s+='<line x1="'+X(r.lo)+'" x2="'+X(r.hi)+'" y1="'+y+'" y2="'+y+'" stroke="var(--c2)" stroke-width="4" stroke-linecap="round" opacity=".55"/>';
      s+='<circle cx="'+X(r.pooled)+'" cy="'+y+'" r="5.5" fill="'+(r.group==='base'?'var(--acc)':'var(--c2)')+'" stroke="var(--card)" stroke-width="1.5"/>';});
    s+=t((ml+W-mr)/2,H-1,'cost fall a quarter, five pooled',{fs:11,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Pooled rate of cost decline under each variant');
    $('pp-sens-tab').innerHTML='<div class="pp-scroll"><table class="pp-tab"><tr><th>Variant</th><th>Pooled</th>'+PRIM.map(b=>'<th>'+SHORT[b]+'</th>').join('')+'</tr>'+
      S.map(r=>'<tr><td>'+RD.esc(r.label)+'<br><span class="small">'+RD.esc(r.note)+'</span></td><td>'+(r.lo!=null?r.lo.toFixed(1)+' to '+r.hi.toFixed(1):r.pooled.toFixed(1))+'%</td>'+PRIM.map(b=>'<td>'+(r.per[b]!=null?r.per[b].toFixed(1):'')+'</td>').join('')+'</tr>').join('')+'</table></div>';
  }

  const all=()=>{explorer();tech();age();sens()};
  RD.onRender(all);RD.onResize(all);all();
})();
