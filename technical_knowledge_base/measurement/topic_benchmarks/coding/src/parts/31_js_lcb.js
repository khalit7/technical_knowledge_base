// ---- LiveCodeBench by date ----
(function(){
  const $=id=>document.getElementById(id);if(!$('t-lcb'))return;
  const L=CD.lcb,Q=L.q;
  const months=[];for(let y=2023,m=5;!(y===2025&&m>3);){months.push(y+'-'+String(m).padStart(2,'0'));m++;if(m>12){m=1;y++}}
  $('lc-s').max=months.length-1;
  const bad=(M,q)=>M.m==='DeepSeek-V3'&&q[1]>='2025-01-01';
  const fmtM=s=>{const [y,m]=s.split('-');return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]+' '+y};
  function table(){
    const st=months[+$('lc-s').value]+'-01',d=$('lc-d').value,p=$('lc-p').value;$('lc-sv').textContent=fmtM(months[+$('lc-s').value]);
    const keep=q=>q[1]>=st&&(!d||q[2]===d)&&(!p||q[3]===p);
    const nq=Q.filter(keep).length;
    const rows=L.models.map(M=>{let s=0,n=0;Q.forEach((q,i)=>{if(!keep(q)||bad(M,q))return;s+=CM.dig(M.c[i])/M.n;n++});const v=n?s/n:NaN;return {m:M.m,v,n,se:n?Math.sqrt(v*(1-v)/n):NaN,mark:M.mark,samp:M.n,fl:M.mark>st}}).sort((a,b)=>(isNaN(b.v)?-1:b.v)-(isNaN(a.v)?-1:a.v));
    if(!nq){$('lc-out').innerHTML=RD.stat('Problems in the window','0','no problems match: Codeforces problems stop in October 2023');$('lc-tab').innerHTML='';return}
    $('lc-out').innerHTML=RD.stat('Problems in the window',String(nq),fmtM(months[+$('lc-s').value])+' to Apr 2025')+RD.stat('Leader',rows[0].m,CM.pct(rows[0].v))+RD.stat('Flagged by marker',String(rows.filter(r=>r.fl).length)+' of 28','marker after the window start');
    $('lc-tab').innerHTML='<table><thead><tr><th class="num">#</th><th>Model</th><th class="num">pass@1</th><th class="num">±</th><th class="num">samples</th><th>Marker</th></tr></thead><tbody>'+rows.map((r,i)=>'<tr><td class="num">'+(r.n?i+1:'')+'</td><td>'+r.m+'</td><td class="num">'+(r.n?(r.v*100).toFixed(1):'excluded')+'</td><td class="num">'+(r.n?(r.se*100).toFixed(1):'')+'</td><td class="num">'+r.samp+'</td><td'+(r.fl?' class="fl">'+r.mark+' (after start)':'>'+r.mark)+'</td></tr>').join('')+'</tbody></table>';
  }
  ['lc-s','lc-d','lc-p'].forEach(id=>$(id).addEventListener('input',table));
  const opts=L.models.map((m,i)=>'<option value="'+i+'">'+m.m+'</option>').join('');$('lc-a').innerHTML=opts;$('lc-b').innerHTML=opts;
  $('lc-a').value=L.models.findIndex(m=>m.m==='DeepSeek-V3');$('lc-b').value=L.models.findIndex(m=>m.m==='GPT-4-Turbo-2024-04-09');
  function series(M,d){return months.map(mo=>{let s=0,n=0;Q.forEach((q,i)=>{if(q[1].slice(0,7)!==mo||(d&&q[2]!==d)||bad(M,q))return;s+=CM.dig(M.c[i])/M.n;n++});return n?[s/n,n]:null})}
  function mon(){
    const A=L.models[+$('lc-a').value],B=L.models[+$('lc-b').value],d=$('lc-md').value;
    const el=$('lc-mon'),W=RD.width(el),H=240,Lm=38,R=10,T=10,Bm=34,iw=W-Lm-R,ih=H-T-Bm;
    const x=i=>Lm+iw*(i+0.5)/months.length,y=v=>T+ih*(1-v);let s='';
    for(const g of [0,.25,.5,.75,1])s+='<line x1="'+Lm+'" x2="'+(W-R)+'" y1="'+y(g)+'" y2="'+y(g)+'" stroke="var(--line)"/>'+RD.t(Lm-5,y(g)+4,Math.round(g*100)+'%',{a:'end',fs:10,fill:'var(--mute)'});
    months.forEach((mo,i)=>{if(mo.endsWith('-01')||i===0)s+=RD.t(x(i),H-Bm+14,mo.slice(0,4),{a:'middle',fs:10,fill:'var(--mute)'})});
    s+=RD.t(Lm+iw/2,H-4,'month the problem was released',{a:'middle',fs:10,fill:'var(--mute)'});
    for(const [M,col] of [[A,'var(--c1)'],[B,'var(--c2)']]){
      const mi=months.indexOf(M.mark.slice(0,7));if(mi>=0)s+='<line x1="'+x(mi)+'" x2="'+x(mi)+'" y1="'+T+'" y2="'+(T+ih)+'" stroke="'+col+'" stroke-dasharray="4 3"/>';
      const ser=series(M,d);let path='';ser.forEach((v,i)=>{if(!v){return}path+=(path?'L':'M')+x(i).toFixed(1)+','+y(v[0]).toFixed(1)});
      s+='<path d="'+path+'" fill="none" stroke="'+col+'" stroke-width="2"/>';ser.forEach((v,i)=>{if(v)s+='<circle cx="'+x(i)+'" cy="'+y(v[0])+'" r="2.4" fill="'+col+'"><title>'+M.m+', '+months[i]+': '+(v[0]*100).toFixed(1)+'% of '+v[1]+' problems</title></circle>'});
    }
    el.innerHTML=RD.svg(W,H,s,'Monthly pass@1');
    const half=(M,a,b)=>{let s2=0,n=0;Q.forEach((q,i)=>{if((d&&q[2]!==d)||bad(M,q)||q[1]<a||q[1]>=b)return;s2+=CM.dig(M.c[i])/M.n;n++});return [s2/n,n]};
    const pa=half(A,'2023-05-01','2024-07-01'),qa=half(A,'2024-07-01','2025-01-01'),pb=half(B,'2023-05-01','2024-07-01'),qb=half(B,'2024-07-01','2025-01-01');
    $('lc-mon-note').innerHTML='Before July 2024 against July to December 2024'+(d?' ('+({e:'easy',m:'medium',h:'hard'})[d]+' problems)':'')+': '+A.m+' '+CM.pct(pa[0])+' → '+CM.pct(qa[0])+' ('+((qa[0]-pa[0])*100).toFixed(1)+' points); '+B.m+' '+CM.pct(pb[0])+' → '+CM.pct(qb[0])+' ('+((qb[0]-pb[0])*100).toFixed(1)+' points) <i class="nl d">derived</i>. Problems per month here: '+(function(){const c=series(A,d).filter(v=>v).map(v=>v[1]);return Math.min(...c)+' to '+Math.max(...c)})()+'; single months are noisy, so read the trend.';
  }
  ['lc-a','lc-b','lc-md'].forEach(id=>$(id).addEventListener('change',mon));
  const go=()=>{table();mon()};
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-lcb']=[go];
  addEventListener('resize',()=>{if(!$('t-lcb').hidden)mon()});
})();
