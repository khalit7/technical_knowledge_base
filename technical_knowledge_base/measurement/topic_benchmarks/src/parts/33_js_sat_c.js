// ---- Saturation timeline: settings, small multiples, one-benchmark chart ----
window.SAT_UI=(function(){
  const C=window.SAT_CORE,D=C.D,$=id=>document.getElementById(id);
  const L='target="_blank" rel="noopener noreferrer"';
  const ST={f:0.9,mode:'human',chance:false,indOnly:false,sel:'tbs',smx:'own',sort:'days'};
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fd=s=>{const d=+s.slice(8,10);return (d?d+' ':'')+MON[+s.slice(5,7)-1]+' '+s.slice(0,4)};
  const fv=v=>(Math.round(v*10)/10).toString();
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const SRC=id=>{const s=D.sources[id];return s?'<a href="'+esc(s[1])+'" '+L+'>'+esc(s[0])+'</a>':esc(id)};
  const KIND={ind:['independent','ind'],board:['leaderboard',''],bench:['benchmark authors',''],lab:['lab-reported','lab']};
  const kd=k=>'<span class="sa-kd '+KIND[k][1]+'">'+KIND[k][0]+'</span>';
  const SC=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  const period=b=>{const y=+b.launch.d.slice(0,4);return y<2020?0:y<2024?1:2};
  const PER=['launched before 2020','launched 2020 to 2023','launched 2024 on'],PC=['var(--c4)','var(--c2)','var(--c1)'];
  // a marker per kind: filled circle (independent), filled square (leaderboard), diamond (benchmark authors), hollow circle (lab)
  function mark(k,x,y,col,r,extra){r=r||3.6;extra=extra||'';
    if(k==='board')return '<rect x="'+(x-r)+'" y="'+(y-r)+'" width="'+2*r+'" height="'+2*r+'" fill="'+col+'" '+extra+'/>';
    if(k==='bench')return '<path d="M'+x+' '+(y-r-1)+'L'+(x+r+1)+' '+y+'L'+x+' '+(y+r+1)+'L'+(x-r-1)+' '+y+'Z" fill="'+col+'" '+extra+'/>';
    if(k==='lab')return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="var(--bg)" stroke="'+col+'" stroke-width="1.6" '+extra+'/>';
    return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+col+'" '+extra+'/>'}
  const W=el=>Math.max(150,Math.floor((el.clientWidth||el.parentNode.clientWidth||600)));
  const visPts=s=>s.pts.filter(p=>!(ST.indOnly&&p.k==='lab'));
  const opt=()=>({f:ST.f,mode:ST.mode,chance:ST.chance,indOnly:ST.indOnly});
  const LOGMAX=Math.log10(1+4000);
  const lx=dd=>Math.log10(1+Math.max(0,dd))/LOGMAX;
  // x domain of one benchmark on its own dates: from min(launch, first point) to max(last point, launch + 60 days)
  function dom(b){let a=C.day(b.launch.d),z=a+60;b.series.forEach(s=>s.pts.forEach(p=>{const t=C.day(p.d);if(t<a)a=t;if(t>z)z=t}));
    if(b.retired)z=Math.max(z,C.day(b.retired.d));z=Math.min(Math.max(z,a+30),C.asOf+5);const pad=(z-a)*0.04;return [a-pad,z+pad]}
  function yTop(b){let m=100;b.series.forEach(s=>s.pts.forEach(p=>{if(p.v>m)m=p.v}));return Math.ceil(m/10)*10}
  // one series as a step line (frontier holds until beaten), ending at the series' last point
  function stepPath(pts,X,Y){let d='';pts.forEach((p,i)=>{const x=X(p),y=Y(p.v);if(i===0)d+='M'+x.toFixed(1)+' '+y.toFixed(1);else{d+='H'+x.toFixed(1)+'V'+y.toFixed(1)}});return d}
  function panelSVG(b,w,h,mini){
    const pl=mini?4:40,pr=mini?4:12,pt=mini?4:10,pb=mini?14:26,iw=w-pl-pr,ih=h-pt-pb,top=yTop(b),[a,z]=dom(b),L0=C.day(b.launch.d);
    const X=ST.smx==='log'&&mini?(p=>pl+iw*lx(C.day(p.d)-L0)):(p=>pl+iw*(C.day(p.d)-a)/(z-a));
    const Xd=t=>ST.smx==='log'&&mini?pl+iw*lx(t-L0):pl+iw*(t-a)/(z-a);
    const Y=v=>pt+ih*(1-v/top);
    let g='<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(b.name)+' best score over time">';
    // grid
    [0,50,100].forEach(v=>{if(v<=top)g+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'});
    if(!mini){[0,25,50,75,100].forEach(v=>{if(v<=top)g+='<text x="'+(pl-5)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>'})}
    // launch
    const xl=Xd(L0);g+='<line x1="'+xl+'" x2="'+xl+'" y1="'+pt+'" y2="'+(pt+ih)+'" stroke="var(--mute)" stroke-width="1" opacity=".7"/>';
    if(b.retired){const xr=Xd(C.day(b.retired.d));g+='<line x1="'+xr+'" x2="'+xr+'" y1="'+pt+'" y2="'+(pt+ih)+'" stroke="var(--bad)" stroke-dasharray="2 2" opacity=".8"/>'}
    // human and threshold
    if(b.human){g+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(b.human.v)+'" y2="'+Y(b.human.v)+'" stroke="var(--mute)" stroke-dasharray="5 3"/>'}
    const th=C.thr(b,opt());g+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(th)+'" y2="'+Y(th)+'" stroke="var(--ink)" stroke-dasharray="1 3" opacity=".75"/>';
    if(!mini){
      if(b.human)g+='<text x="'+(pl+3)+'" y="'+(Y(b.human.v)-3)+'" font-size="10.5" fill="var(--mute)">human '+fv(b.human.v)+'</text>';
      g+='<text x="'+(w-pr-3)+'" y="'+(Y(th)+(Math.abs(Y(th)-Y(b.human?b.human.v:-99))<12?12:-3))+'" font-size="10.5" text-anchor="end" fill="var(--mute)">threshold '+fv(th)+'</text>';
      g+='<text x="'+(xl+3)+'" y="'+(pt+ih-4)+'" font-size="10.5" fill="var(--mute)">launch</text>';
      // x ticks: years, or months for short ranges
      const span=z-a,yrs=span>1000;let t0=new Date(a*864e5);
      const ticks=[];if(yrs){for(let y=t0.getUTCFullYear();y<=new Date(z*864e5).getUTCFullYear()+1;y++){const t=Date.UTC(y,0,1)/864e5;if(t>=a&&t<=z)ticks.push([t,String(y)])}}
      else{const step=span>200?3:span>90?1:0;for(let y=t0.getUTCFullYear(),m=t0.getUTCMonth();;m++){const t=Date.UTC(y,m,1)/864e5;if(t>z)break;if(t>=a&&(step===0||m%step===0))ticks.push([t,MON[((m%12)+12)%12]+(m%12===0||ticks.length===0?' '+new Date(t*864e5).getUTCFullYear():'')])}
        if(span<=90){ticks.length=0;for(let t=Math.ceil(a/7)*7;t<=z;t+=7)ticks.push([t,fd(new Date(t*864e5).toISOString().slice(0,10)).replace(/ 20\d\d$/,'')])}}
      let lastx=-99;ticks.forEach(([t,s])=>{const x=Xd(t);if(x-lastx<44)return;lastx=x;g+='<line x1="'+x+'" x2="'+x+'" y1="'+(pt+ih)+'" y2="'+(pt+ih+4)+'" stroke="var(--mute)"/><text x="'+x+'" y="'+(h-8)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+s+'</text>'})
    } else if(ST.smx==='log'){[[7,'1w'],[30,'1m'],[365,'1y'],[1826,'5y']].forEach(([t,s])=>{const x=pl+iw*lx(t);g+='<line x1="'+x+'" x2="'+x+'" y1="'+(pt+ih)+'" y2="'+(pt+ih+3)+'" stroke="var(--mute)"/><text x="'+x+'" y="'+(h-2)+'" font-size="9" text-anchor="middle" fill="var(--mute)">'+s+'</text>'})}
    else {g+='<text x="'+pl+'" y="'+(h-2)+'" font-size="9" fill="var(--mute)">'+new Date(a*864e5+864e5*20).getUTCFullYear()+'</text><text x="'+(w-pr)+'" y="'+(h-2)+'" font-size="9" text-anchor="end" fill="var(--mute)">'+new Date(z*864e5).getUTCFullYear()+'</text>'}
    // series
    b.series.forEach((s,si)=>{const ps=visPts(s);if(!ps.length)return;const col=SC[si%6];
      if(ps.length>1)g+='<path d="'+stepPath(ps,X,Y)+'" fill="none" stroke="'+col+'" stroke-width="'+(mini?1.4:1.8)+'"'+(ps.every(p=>p.k==='lab')?' stroke-dasharray="4 2"':'')+'/>';
      ps.forEach((p,pi)=>{const x=X(p),y=Y(p.v);g+=mini?mark(p.k,x,y,col,2.3):mark(p.k,x,y,col,4.2,'data-s="'+si+'" data-p="'+pi+'" tabindex="0" role="button" aria-label="'+esc(p.m+' '+fv(p.v)+'% '+fd(p.d))+'" style="cursor:pointer"');
        if(p.ub&&!mini)g+='<text x="'+(x+6)+'" y="'+(y+4)+'" font-size="10.5" fill="var(--mute)">under '+fv(p.v)+'%</text>'})});
    // crossing
    const cr=C.crossing(b,opt());
    if(cr.status==='reached'){const x=X(cr.pt),y=Y(cr.pt.v);g+='<circle cx="'+x+'" cy="'+y+'" r="'+(mini?4.5:8)+'" fill="none" stroke="var(--ink)" stroke-width="1.2"/>'}
    return g+'</svg>'}
  function status(b){const cr=C.crossing(b,opt());
    if(cr.status==='reached')return cr.days===0?'born past the threshold':C.fmtDays(cr.days)+' to threshold';
    return cr.status==='retired'?'replaced before the threshold':'not yet ('+C.fmtDays(cr.days)+' so far)'}
  function keys(){const el=$('sa-keys');el.innerHTML=[['ind','independent'],['board','leaderboard entry'],['bench','benchmark authors'],['lab','lab-reported']].map(([k,s])=>'<span><svg width="12" height="12" viewBox="0 0 12 12">'+mark(k,6,6,'var(--ink)',4)+'</svg>'+s+'</span>').join('')+
    '<span><svg width="22" height="8"><line x1="0" x2="22" y1="4" y2="4" stroke="var(--mute)" stroke-dasharray="5 3"/></svg>human</span><span><svg width="22" height="8"><line x1="0" x2="22" y1="4" y2="4" stroke="var(--ink)" stroke-dasharray="1 3"/></svg>threshold</span><span><svg width="14" height="14"><circle cx="7" cy="7" r="5.5" fill="none" stroke="var(--ink)"/></svg>first crossing</span>'}
  function smallMultiples(){const el=$('sa-sm');const cols=Math.max(1,Math.floor((W(el)+8)/173));const w=Math.floor((W(el)-8*(cols-1))/cols)-14;
    el.innerHTML=D.benchmarks.map(b=>'<button class="sa-pn'+(b.id===ST.sel?' on':'')+'" data-b="'+b.id+'"><span class="nm">'+esc(b.name)+'</span><span class="st">'+b.launch.d.slice(0,4)+' &middot; '+status(b)+'</span>'+panelSVG(b,Math.max(120,w),92,true)+'</button>').join('');
    el.querySelectorAll('.sa-pn').forEach(n=>n.onclick=()=>{select(n.dataset.b);$('sa-chips').scrollIntoView({block:'start',behavior:'smooth'})})}
  function chips(){const fams=[];D.benchmarks.forEach(b=>{if(!fams.includes(b.fam))fams.push(b.fam)});
    $('sa-chips').innerHTML=D.benchmarks.map(b=>'<button data-b="'+b.id+'" class="'+(b.id===ST.sel?'on':'')+'">'+esc(b.name)+'</button>').join('');
    $('sa-chips').querySelectorAll('button').forEach(n=>n.onclick=()=>select(n.dataset.b))}
  function ptInfo(b,s,p){
    let h='<div class="h">'+esc(p.m)+': '+(p.ub?'under ':'')+fv(p.v)+'%</div><div>'+kd(p.k)+' '+fd(p.d)+(p.rd&&p.rd!==p.d?' (model public); run on '+fd(p.rd):'')+'</div>';
    h+='<div class="sa-note">Series: '+esc(s.label)+'. Version: '+esc(s.ver||'')+'. Harness: '+esc(s.harness||'')+'. Run by: '+esc(s.by||'')+'.</div>';
    if(p.n)h+='<div>'+esc(p.n)+'</div>';if(p.pre!==undefined)h+='';h+='<div class="sa-note">Source: '+SRC(p.s)+'</div>';return h}
  function detail(){const b=D.benchmarks.find(x=>x.id===ST.sel);const el=$('sa-chart');const w=W(el),h=w<500?240:300;
    const cr=C.crossing(b,opt()),hu=b.human;
    let hd='<h3 style="margin:8px 0 2px">'+esc(b.name)+'</h3><div class="sa-note">Launched '+fd(b.launch.d)+' ('+SRC(b.launch.s)+')'+(b.launch.n?'. '+esc(b.launch.n.replace(/\.$/,'')):'')+'. Unit: '+esc(b.unit)+'.</div>';
    hd+='<div class="sa-note">Human baseline: '+(hu?fv(hu.v)+'%. '+esc(hu.who)+' ('+SRC(hu.s)+')'+(hu.alt?hu.alt.map(a=>'. Also '+fv(a.v)+'%: '+esc(a.who)+' ('+SRC(a.s)+')').join(''):''):'none published'+(b.humanNote?'. '+esc(b.humanNote):'')+'; ceiling 100%')+'.</div>';
    hd+='<div style="font-size:13.5px;margin-top:4px"><b>Threshold '+fv(cr.thr)+'%:</b> '+(cr.status==='reached'?(cr.days===0?'already met at launch by ':'reached after <b>'+C.fmtDays(cr.days)+'</b> by ')+esc(cr.pt.m)+' ('+fd(cr.pt.d)+', '+KIND[cr.pt.k][0]+', series "'+esc(cr.ser.label)+'")':(cr.status==='retired'?'not reached before it was replaced on '+fd(b.retired.d)+' ('+esc(b.retired.n)+')':'not reached in '+C.fmtDays(cr.days)))+'.</div>';
    if(b.note)hd+='<div class="sa-note">'+esc(b.note)+'</div>';
    $('sa-dhead').innerHTML=hd;
    el.innerHTML=panelSVG(b,w,h,false);
    $('sa-leg').innerHTML=b.series.map((s,si)=>{const n=visPts(s).length;return '<div class="r"><svg width="22" height="12"><line x1="1" x2="21" y1="6" y2="6" stroke="'+SC[si%6]+'" stroke-width="2.4"'+(s.pts.every(p=>p.k==='lab')?' stroke-dasharray="4 2"':'')+'/></svg><div><b>'+esc(s.label)+'</b><small>'+esc([s.ver,s.harness,s.by].filter(Boolean).join(' / '))+'; '+n+' record'+(n===1?'':'s')+(n<s.pts.length?' shown ('+(s.pts.length-n)+' lab-reported hidden)':'')+'</small></div></div>'}).join('');
    const pick=(si,pi)=>{const s=b.series[si],p=visPts(s)[pi];$('sa-pt').innerHTML=ptInfo(b,s,p)};
    el.querySelectorAll('[data-s]').forEach(m=>{const f=()=>pick(+m.dataset.s,+m.dataset.p);m.addEventListener('click',f);m.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}})});
    // default: the latest record of the first series that has one
    let last=null;b.series.forEach((s,si)=>{const ps=visPts(s);if(ps.length){const pi=ps.length-1;if(!last||ps[pi].d>visPts(b.series[last[0]])[last[1]].d)last=[si,pi]}});
    if(last)pick(last[0],last[1]);else $('sa-pt').textContent='No points shown with the current settings.';
    let rows='';b.series.forEach(s=>s.pts.forEach(p=>{rows+='<tr><td>'+fd(p.d)+'</td><td>'+esc(p.m)+'</td><td class="num">'+(p.ub?'&lt; ':'')+fv(p.v)+'</td><td>'+KIND[p.k][0]+'</td><td>'+esc(s.label)+'</td><td>'+SRC(p.s)+'</td></tr>'}));
    $('sa-ptab').innerHTML='<table class="sa-t"><thead><tr><th>Date</th><th>Model or system</th><th class="num">Score</th><th>Kind</th><th>Series</th><th>Source</th></tr></thead><tbody>'+rows+'</tbody></table>'}
  function select(id){ST.sel=id;chips();detail();document.querySelectorAll('#sa-sm .sa-pn').forEach(n=>n.classList.toggle('on',n.dataset.b===id))}
  function rule(){const b0=ST.chance?'chance + ':'';$('sa-rule').innerHTML='Derived rule: threshold = '+b0+(ST.f*100)+'% of ('+(ST.mode==='human'?'the published human baseline, or 100% where there is none':'100%')+(ST.chance?' minus chance':'')+'). '+(ST.indOnly?'Lab-reported points are ignored. ':'')+'The crossing is the first listed result at or above it, in any series of that benchmark.'}
  return {ST,C,D,$,fd,fv,esc,SRC,kd,KIND,SC,PER,PC,period,opt,W,lx,smallMultiples,chips,detail,keys,rule,select,status,mark};
})();
