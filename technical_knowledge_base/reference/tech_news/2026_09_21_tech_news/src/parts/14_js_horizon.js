// ---- Task horizon: Anthropic's three figures and METR's measurements, with a projection at a chosen doubling time ----
(function(){
  const box=$('hzPlot');if(!box)return;
  const METR=[['Claude 3 Opus','2024-03-04',3.95],['Claude 3.7 Sonnet','2025-02-24',60.39],['Claude Opus 4','2025-05-22',100.37],['Claude Opus 4.5','2025-11-24',292.99],['Claude Opus 4.6','2026-02-05',718.81],['Claude Mythos Preview (early)','2026-04-07',1044.78]];
  const ANT=[['Opus 3, "about four minutes"','2024-03-15',4],['Sonnet 3.7, "about an hour and a half"','2025-03-15',90],['Opus 4.6, "12-hour tasks"','2026-03-15',720]]; // Anthropic gives the month only for Opus 3; the others are "a year later", plotted mid-March
  const T=s=>Date.parse(s+'T00:00:00Z'),DAY=864e5,MO=30.44*DAY;
  const t0=T('2026-02-05'),h0=718.81,WEEK=40*60;
  const st={d:4.2};
  const PRE=[['Anthropic: about 4 months',4],['METR since 2023: 128.7 days',128.744/30.44],['METR all models: 187.8 days',187.778/30.44],['earlier trend: 7 months',7]];
  $('hzPre').innerHTML=PRE.map((p,i)=>'<button data-i="'+i+'">'+p[0]+'</button>').join('');
  $('hzPre').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{st.d=PRE[+b.dataset.i][1];$('hzD').value=st.d.toFixed(1);draw()}));
  $('hzD').addEventListener('input',e=>{st.d=+e.target.value;draw()});
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const md=t=>{const d=new Date(t);return MON[d.getUTCMonth()]+' '+d.getUTCFullYear()};
  const cross=m=>t0+Math.log2(m/h0)*st.d*MO;
  function draw(){
    const narrow=box.clientWidth<560,W=Math.max(300,box.clientWidth||340),H=narrow?300:340,pl=narrow?54:70,pr=narrow?10:16,pt=12,pb=34;
    const xa=T('2024-01-01'),xb=T('2027-12-31'),ya=Math.log10(2),yb=Math.log10(30000);
    const X=t=>pl+(W-pl-pr)*(t-xa)/(xb-xa),Y=m=>pt+(H-pt-pb)*(1-(Math.log10(m)-ya)/(yb-ya));
    let s='';
    // unreliable zone above 16 h, and the year 2027
    s+='<rect x="'+X(T('2027-01-01'))+'" y="'+pt+'" width="'+(X(xb)-X(T('2027-01-01')))+'" height="'+(H-pt-pb)+'" fill="var(--acc2)" opacity=".45"/>';
    s+='<rect x="'+pl+'" y="'+pt+'" width="'+(W-pl-pr)+'" height="'+(Y(960)-pt)+'" fill="var(--soft)" opacity=".8"/>';
    s+='<text x="'+(pl+4)+'" y="'+(pt+12)+'" font-size="11" fill="var(--mute)">above 16 h: METR calls its current tasks unreliable</text>';
    s+='<text x="'+(X(T('2027-07-01')))+'" y="'+(H-pb-6)+'" font-size="11" text-anchor="middle" fill="var(--mute)">2027</text>';
    [[4,'4 min'],[15,'15 min'],[60,'1 h'],[240,'4 h'],[960,'16 h'],[WEEK,narrow?'1 wk':'1 wk (40 h)'],[2*WEEK,'2 wk'],[4*WEEK,'4 wk']].forEach(([m,l])=>{if(narrow&&(m===15||m===4*WEEK))return;s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(m)+'" y2="'+Y(m)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(m)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    [2024,2025,2026,2027].forEach(y=>{const x=X(T(y+'-01-01'));s+='<line x1="'+x+'" x2="'+x+'" y1="'+(H-pb)+'" y2="'+(H-pb+4)+'" stroke="var(--mute)"/><text x="'+x+'" y="'+(H-pb+16)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+y+'</text>'});
    // projection
    const ta=t0,tb=xb;let d='';for(let t=ta;t<=tb;t+=10*DAY){const m=h0*2**((t-t0)/(st.d*MO));if(m>30000)break;d+=(d?'L':'M')+X(t).toFixed(1)+' '+Y(m).toFixed(1)}
    s+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2" stroke-dasharray="6 4"/>';
    // backward trend through METR points (fit line for reference: the doubling chosen, anchored at Opus 4.6)
    let d2='';for(let t=T('2024-01-15');t<=t0;t+=10*DAY){const m=h0*2**((t-t0)/(st.d*MO));if(m<2)continue;d2+=(d2?'L':'M')+X(t).toFixed(1)+' '+Y(m).toFixed(1)}
    s+='<path d="'+d2+'" fill="none" stroke="var(--acc)" stroke-width="1" opacity=".35"/>';
    [WEEK,2*WEEK].forEach(m=>{const t=cross(m);if(t>xb)return;s+='<circle cx="'+X(t)+'" cy="'+Y(m)+'" r="4" fill="var(--bg)" stroke="var(--acc)" stroke-width="2"/>'});
    METR.forEach(([n,dt,m])=>{s+='<circle cx="'+X(T(dt))+'" cy="'+Y(m)+'" r="4.5" fill="var(--c3)"><title>METR TH1.1: '+n+', '+dt+', '+m+' min</title></circle>'});
    ANT.forEach(([n,dt,m])=>{s+='<rect x="'+(X(T(dt))-4.5)+'" y="'+(Y(m)-4.5)+'" width="9" height="9" fill="none" stroke="var(--c2)" stroke-width="2"><title>Anthropic: '+n+'</title></rect>'});
    // labels for three anchor points
    const lab=(x,y,t,a,c)=>'<text x="'+x+'" y="'+y+'" font-size="11" text-anchor="'+(a||'start')+'" fill="'+(c||'var(--ink)')+'">'+t+'</text>';
    s+=lab(X(T('2024-03-04'))+8,Y(4)+4,'Opus 3');
    s+=lab(X(T('2025-02-24'))-8,Y(75)-6,'Sonnet 3.7','end');
    s+=lab(X(T('2026-02-05'))-8,Y(720)-8,'Opus 4.6','end');
    box.innerHTML=svgEl(W,H,s,'Task horizon by date, log scale');
    const w1=cross(WEEK),w2=cross(2*WEEK);
    $('hzDv').textContent=st.d.toFixed(1)+' months ('+Math.round(st.d*30.44)+' days)';
    $('hzOut').innerHTML=stat('1 working week (40 h) reached',md(w1),'derived, from Opus 4.6 in Feb 2026')+stat('2 working weeks reached',md(w2),w2<T('2027-01-01')?'before 2027':w2<T('2028-01-01')?'in 2027':'after 2027')+
      stat('Anthropic\'s own steps','x22.5, then x8','4 min to 90 min, 90 min to 12 h, a year apart each: doublings every 2.7 and 4.0 months')+
      '<div class="stat"><div class="k">Legend</div><div class="d"><span style="color:var(--c2)">□</span> Anthropic, rounded · <span style="color:var(--c3)">●</span> METR TH1.1 · <span style="color:var(--acc)">- -</span> projection</div></div>';
  }
  let rw=0;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(box.closest('.tab').id,draw);
})();
