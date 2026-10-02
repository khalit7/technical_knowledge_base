// ---- Real-SWE: three readings of one leaderboard, per-task grid and cost against resolution ----
(function(){
  const card=$('v-rswe');if(!card||!window.RSWE)return;
  const D=RSWE,M=D.models,T=D.tasks,RK=['r1','r2','r3'];
  const LAB={r1:'12 Sep',r2:'15 Sep',r3:'by 28 Sep'},COL={r1:'var(--c2)',r2:'var(--c5)',r3:'var(--c1)'};
  const rate=(k,i)=>D.r[k].pass.reduce((a,row)=>a+row[i],0)/80*100;
  let cur='r1';
  const pear=(x,y)=>{const n=x.length,mx=x.reduce((a,b)=>a+b)/n,my=y.reduce((a,b)=>a+b)/n;let sxy=0,sx=0,sy=0;for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sx+=(x[i]-mx)**2;sy+=(y[i]-my)**2}return sxy/Math.sqrt(sx*sy)};
  function W(el){return Math.max(300,Math.round(el.clientWidth||340))}
  function dots(){const el=$('rsDots'),narrow=(el.clientWidth||340)<560,w=narrow?W(el):760,lw=narrow?96:124,rw=narrow?44:60,rh=24,top=22;
    const order=M.map((m,i)=>i).sort((a,b)=>rate(cur,b)-rate(cur,a));
    const H=top+M.length*rh+22,X=v=>lw+(w-lw-rw)*v/50;let s='';
    [0,10,20,30,40,50].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(top-6)+'" y2="'+(top+M.length*rh)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(H-6)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+v+'%</text>'});
    s+='<text x="'+(narrow?4:lw)+'" y="12" font-size="11" fill="var(--mute)">'+(narrow?'resolution rate, sorted by this reading':'resolution rate (pass@1 over 8 trials per task), sorted by the selected reading')+'</text>';
    order.forEach((i,j)=>{const y=top+j*rh+rh/2;s+='<text x="'+(lw-8)+'" y="'+(y+4)+'" font-size="'+(narrow?11:12)+'" text-anchor="end">'+M[i]+'</text>';
      const vs=RK.map(k=>rate(k,i));s+='<line x1="'+X(Math.min(...vs))+'" x2="'+X(Math.max(...vs))+'" y1="'+y+'" y2="'+y+'" stroke="var(--dim)" stroke-width="2"/>';
      RK.forEach(k=>{const v=rate(k,i),on=k===cur;s+='<circle cx="'+X(v)+'" cy="'+y+'" r="'+(on?6:4)+'" fill="'+(on?COL[k]:'var(--bg)')+'" stroke="'+COL[k]+'" stroke-width="2"><title>'+M[i]+', '+LAB[k]+': '+v.toFixed(2)+'%</title></circle>'});
      s+='<text x="'+(w-4)+'" y="'+(y+4)+'" font-size="11.5" text-anchor="end" font-weight="600">'+rate(cur,i).toFixed(narrow?1:2)+'%</text>'});
    el.innerHTML=svgEl(w,H,s,'Real-SWE resolution rates in three readings')+'<div class="lgd">'+RK.map(k=>'<span><i style="background:'+COL[k]+';border-radius:50%;width:10px"></i>'+LAB[k]+'</span>').join('')+'</div>'}
  function note(){const rs=M.map((m,i)=>rate(cur,i)),cs=D.r[cur].cost,low=T.filter((t,ti)=>D.r[cur].pass[ti].reduce((a,b)=>a+b)/64<0.15).length;
    const lead=M[rs.indexOf(Math.max(...rs))];const r=pear(cs,rs);
    const txt={r1:'This is the table the issue quotes: Fable 5.1 first at 38.8%, '+low+' of 10 tasks below 15%, and the spread the issue reports.',
      r2:'Three days later Grok 4.6 had been re-run: 23.8% became 32.5% (third place) and its estimated cost fell from $3.44 to $2.67 per rollout. Every other cell is unchanged.',
      r3:'Then every model was re-scored. GPT-6 Astra now leads at 46.25%, a point and a quarter ahead of Fable 5.1, and only '+low+' of 10 tasks stay below 15%. Only two tasks changed: Billing schedule migration went from 9 passes in 64 to 50 (seven of eight models now pass it every time) and API token metering from 8 to 14. Re-scoring two tasks moved every model up and reordered the top.'}[cur];
    $('rsNote').innerHTML='<div class="t">'+LAB[cur]+': '+lead+' leads; '+low+' of 10 tasks below 15%; cost against success r = '+r.toFixed(2)+'</div>'+txt}
  function grid(){const el=$('rsGrid'),narrow=(el.clientWidth||340)<560,w=narrow?W(el):760,lw=narrow?112:170,top=narrow?22:46,cw=(w-lw-44)/M.length,rh=narrow?19:20;
    const prev=cur==='r1'?null:RK[RK.indexOf(cur)-1];const H=top+T.length*rh+6;let s='';
    M.forEach((m,i)=>{const x=lw+i*cw+cw/2;s+=narrow?'<text x="'+x+'" y="'+(top-7)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(i+1)+'<title>'+m+'</title></text>':'<text x="'+x+'" y="'+(top-20)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+m.split(' ')[0]+'</text><text x="'+x+'" y="'+(top-7)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+m.split(' ').slice(1).join(' ')+'</text>'});
    s+='<text x="'+(w-2)+'" y="'+(top-7)+'" font-size="11" text-anchor="end" fill="var(--mute)">task</text>';
    T.forEach((t,ti)=>{const y=top+ti*rh;s+='<text x="'+(lw-6)+'" y="'+(y+rh/2+4)+'" font-size="11" text-anchor="end">'+(narrow&&t.length>17?t.slice(0,16)+'.':t).replace(/&/g,'&amp;')+'<title>'+t.replace(/&/g,'&amp;')+'</title></text>';
      M.forEach((m,i)=>{const v=D.r[cur].pass[ti][i],x=lw+i*cw+1,ch=prev&&D.r[prev].pass[ti][i]!==v;
        s+='<rect x="'+x+'" y="'+(y+1)+'" width="'+(cw-2)+'" height="'+(rh-2)+'" rx="2" fill="var(--c3)" fill-opacity="'+(0.08+0.92*v/8).toFixed(2)+'"'+(ch?' stroke="var(--ink)" stroke-width="2"':'')+'><title>'+m+', '+t.replace(/&/g,'&amp;')+': '+v+' of 8'+(ch?' (was '+D.r[prev].pass[ti][i]+')':'')+'</title></rect><text x="'+(x+cw/2-1)+'" y="'+(y+rh/2+4)+'" font-size="11" text-anchor="middle" fill="'+(v>=5?'var(--bg)':'var(--ink)')+'">'+v+'</text>'});
      const tot=D.r[cur].pass[ti].reduce((a,b)=>a+b);s+='<text x="'+(w-2)+'" y="'+(y+rh/2+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+Math.round(100*tot/64)+'%</text>'});
    el.innerHTML=svgEl(w,H,s,'Real-SWE passes by task and model')+(narrow?'<p class="small mute" style="margin:2px 0 0">Columns: '+M.map((m,i)=>(i+1)+' '+m).join(', ')+'.</p>':'')}
  function scat(){const el=$('rsScat'),narrow=(el.clientWidth||340)<560,w=narrow?W(el):760,pl=46,pr=narrow?16:130,pt=10,pb=38,h=narrow?240:260;
    const X=v=>pl+(w-pl-pr)*(v-2)/(7.5-2),Y=v=>pt+(h-pt-pb)*(1-v/50);let s='';
    [2,3,4,5,6,7].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+pt+'" y2="'+(h-pb)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(h-pb+14)+'" font-size="11" text-anchor="middle" fill="var(--mute)">$'+v+'</text>'});
    [0,10,20,30,40,50].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+v+'%</text>'});
    s+='<text x="'+((pl+w-pr)/2)+'" y="'+(h-6)+'" font-size="11" text-anchor="middle" fill="var(--mute)">estimated cost per rollout (US$)</text>';
    const cs=D.r[cur].cost,rs=M.map((m,i)=>rate(cur,i));
    const ends=[];M.forEach((m,i)=>{const x=X(cs[i]),y=Y(rs[i]);s+='<circle cx="'+x+'" cy="'+y+'" r="5" fill="'+COL[cur]+'"><title>'+m+': $'+cs[i].toFixed(2)+', '+rs[i].toFixed(2)+'%</title></circle>';ends.push({x,y,m})});
    // labels: on narrow screens a short name beside the dot, pushed apart vertically
    ends.sort((a,b)=>a.y-b.y);let last=-99;ends.forEach(e=>{e.ly=Math.max(e.y,last+13);last=e.ly});
    ends.forEach(e=>{const right=e.x<w-pr-70||!narrow;const lab=narrow?({'Fable 5.1':'Fable','GPT-6 Astra':'Astra','Gemini 3.8 Flash':'Gemini','GLM 5.3':'GLM','Grok 4.6':'Grok','Muse Spark 1.3':'Muse','Kimi K3':'Kimi','GPT-5.6 Sol':'GPT-5.6 Sol'}[e.m]):e.m;
      s+='<text x="'+(right?e.x+8:e.x-8)+'" y="'+(e.ly+4)+'" font-size="11" text-anchor="'+(right?'start':'end')+'">'+lab+'</text>'});
    const r=pear(cs,rs);
    el.innerHTML=svgEl(w,h,s,'Cost against resolution rate')+'<p class="small" style="margin:2px 0 0">Pearson r = <b>'+r.toFixed(2)+'</b> in this reading. '+(cur==='r1'?'The issue\'s "no relationship" is too strong: the dearest model (Fable 5.1, $6.96) is also the best and the three cheapest below $2.75 include the last-placed GPT-5.6 Sol, so r is about 0.7. What holds is that a dollar more does not reliably buy points: Gemini 3.8 Flash, the cheapest, is third, and GLM 5.3 costs twice as much for a lower rate.':cur==='r2'?'Grok\'s re-run makes it cheaper and better at once, which weakens the link (r about 0.55).':'After re-scoring the link is weaker still (r about 0.5): Gemini 3.8 Flash and Muse Spark 1.3 sit within ten points of the leaders at under $3.')+'</p>'}
  function all(){dots();note();grid();scat()}
  const seg=$('rsR');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});cur=b.dataset.m;all()}));
  let rw=card.clientWidth;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;all()}});
  onTab(card.closest('.tab').id,all);all();
})();
