// ---- Release history: the lane timeline (one lane per lab, a dot per release, releases per period underneath) ----
(function(){
  const RH=window.RH,R=RH.ROWS,$=id=>document.getElementById(id),esc=RH.esc;
  const LANES=['OpenAI','Anthropic','Google DeepMind','Meta','xAI/SpaceXAI','Microsoft (Phi)','Ai2 (OLMo)','Mistral','Cohere','DeepSeek','Alibaba (Qwen)','Moonshot (Kimi)','Zhipu (GLM)','MiniMax','Xiaomi (MiMo)','StepFun','Tencent (Hunyuan)','Others'];
  const lane=r=>LANES.indexOf(r.l)>=0?r.l:'Others';
  const RANGES={all:[Date.UTC(2023,0,1),Date.UTC(2026,9,1),'q'],y26:[Date.UTC(2026,0,1),Date.UTC(2026,9,1),'m'],rec:[Date.UTC(2026,7,1),Date.UTC(2026,9,1),'w']};
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const st={rg:'all',firsts:false,sel:null};
  // each lab's first row matching the filters (rows are in date order); the Firsts section sets this up too
  function firstSet(){const s=new Set(),seen={};RH.byDate.forEach(r=>{if(RH.match(r)&&!seen[r.l]){seen[r.l]=1;s.add(r)}});return s}
  function draw(){const host=$('tlPlot');if(!host||!host.offsetParent)return;
    const [t0,t1,bk]=RANGES[st.rg];const inR=r=>r.ts>=t0&&r.ts<t1;
    const W=Math.max(760,Math.min(900,host.clientWidth||900)),lh=24,top=26,left=128,right=12,H=top+LANES.length*lh+92;
    const sx=t=>left+(t-t0)/(t1-t0)*(W-left-right);
    const F=st.firsts?firstSet():new Set();
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Release timeline by lab" style="max-width:none">';
    const ticks=[];if(bk==='q'){for(let y=2023;y<=2026;y++)for(let q=0;q<4;q++)ticks.push([Date.UTC(y,q*3,1),q?'':String(y),!q])}
      else if(bk==='m'){for(let m=0;m<10;m++)ticks.push([Date.UTC(2026,m,1),MON[m],true])}
      else{for(let t=t0;t<t1;t+=7*864e5)ticks.push([t,new Date(t).getUTCDate()+' '+MON[new Date(t).getUTCMonth()],new Date(t).getUTCDate()<=7])}
    ticks.forEach(([t,lab,major])=>{if(t>t1)return;const x=sx(t);
      s+='<line x1="'+x+'" x2="'+x+'" y1="'+(top-6)+'" y2="'+(top+LANES.length*lh)+'" stroke="var(--line)"'+(major?'':' stroke-dasharray="2 3"')+'/>';
      if(lab)s+='<text x="'+(x+3)+'" y="'+(top-10)+'" font-size="11.5" font-weight="600" fill="var(--mute)">'+lab+'</text>'});
    LANES.forEach((L,i)=>{const y=top+i*lh;
      if(i%2)s+='<rect x="0" y="'+y+'" width="'+W+'" height="'+lh+'" fill="var(--soft)" opacity="0.6"/>';
      s+='<text x="'+(left-8)+'" y="'+(y+lh/2+4)+'" font-size="11.5" text-anchor="end" fill="var(--ink)">'+L.replace('xAI/','xAI / ')+'</text>'});
    // dots, nudged vertically when they would collide within a lane
    const last={};
    R.forEach((r,j)=>{const L=lane(r),i=LANES.indexOf(L);if(!inR(r))return;const x=sx(r.ts),yc=top+i*lh+lh/2;
      const prev=last[L]||[];const near=prev.filter(p=>Math.abs(p-x)<7).length;const off=near?((near%2)?-6:6)*Math.ceil(near/2):0;
      prev.push(x);last[L]=prev;const m=RH.match(r),on=st.sel===r,fi=F.has(r);
      const c=r.o?'var(--open)':'var(--closed)';
      s+='<circle data-j="'+j+'" cx="'+x+'" cy="'+(yc+Math.max(-9,Math.min(9,off)))+'" r="'+(on?6.5:fi?5.5:4.2)+'" fill="'+(r.o?c:'var(--bg)')+'" stroke="'+c+'" stroke-width="'+(r.o?1:2)+'" opacity="'+(m?1:0.13)+'" style="cursor:pointer"><title>'+esc(r.m)+', '+r.d+'</title></circle>';
      if(fi)s+='<text x="'+(x+7)+'" y="'+(yc-6)+'" font-size="10.5" fill="var(--ink)" paint-order="stroke" stroke="var(--bg)" stroke-width="3">'+esc(r.m.split(' / ')[0])+'</text>'});
    // releases per period, open stacked on closed, for the same filters
    const bstart=t=>{const d=new Date(t);if(bk==='q')return Date.UTC(d.getUTCFullYear(),Math.floor(d.getUTCMonth()/3)*3,1);if(bk==='m')return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1);return t0+Math.floor((t-t0)/(7*864e5))*7*864e5};
    const bend=b=>{const d=new Date(b);if(bk==='q')return Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+3,1);if(bk==='m')return Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1);return Math.min(t1,b+7*864e5)};
    const by={};R.filter(r=>RH.match(r)&&inR(r)).forEach(r=>{const k=bstart(r.ts);(by[k]=by[k]||{o:0,c:0})[r.o?'o':'c']++});
    const base=H-22,mh=56,mx=Math.max(1,...Object.values(by).map(v=>v.o+v.c));
    s+='<text x="'+(left-8)+'" y="'+(base-mh/2)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+({q:'per quarter',m:'per month',w:'per week'})[bk]+'</text>';
    Object.keys(by).forEach(k=>{const xa=sx(+k),xb=sx(bend(+k)),w=Math.max(2,xb-xa-3),v=by[k],hc=v.c/mx*mh,ho=v.o/mx*mh;
      s+='<rect x="'+(xa+1.5)+'" y="'+(base-hc)+'" width="'+w+'" height="'+hc+'" fill="var(--closed)" opacity="0.75"/><rect x="'+(xa+1.5)+'" y="'+(base-hc-ho)+'" width="'+w+'" height="'+ho+'" fill="var(--open)" opacity="0.85"/>';
      s+='<text x="'+(xa+1.5+w/2)+'" y="'+(base-hc-ho-3)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+(v.o+v.c)+'</text>'});
    s+='<line x1="'+left+'" x2="'+(W-right)+'" y1="'+base+'" y2="'+base+'" stroke="var(--line)"/></svg>';
    host.innerHTML=s;
    host.querySelectorAll('circle[data-j]').forEach(c=>c.addEventListener('click',()=>{st.sel=R[+c.dataset.j];draw();detail()}));
    const n=R.filter(r=>RH.match(r)&&inR(r)).length;
    $('tlCount').textContent=n+' releases shown'+(RH.active()?' (filtered)':'')+(st.firsts?', '+F.size+' firsts labelled':'');
  }
  function detail(){$('tlDet').innerHTML=st.sel?RH.detail(st.sel):'<p class="mute" style="margin:0">Click a dot for the release: its date, weights, size and why it matters.</p>'}
  document.querySelectorAll('#tlRg button').forEach(b=>b.addEventListener('click',()=>{st.rg=b.dataset.r;document.querySelectorAll('#tlRg button').forEach(x=>x.classList.toggle('on',x===b));draw()}));
  $('tlFirst').addEventListener('change',e=>{st.firsts=e.target.checked;draw()});
  // the Firsts section calls this: label one feature's firsts on the timeline
  RH.tlFirsts=p=>{RH.setF(p);st.firsts=true;$('tlFirst').checked=true;draw();RH.go('rh-tl')};
  RH.onFilter(draw);RH.onOpen(draw);
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(RH.shown())draw()},120)});
  detail();
})();
