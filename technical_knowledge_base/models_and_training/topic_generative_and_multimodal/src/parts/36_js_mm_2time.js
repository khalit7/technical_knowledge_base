// ---- Model map: timeline by lane, coloured by family, with a year sweep and the family share of each year's rows ----
(function(){
  const M=window.MM,D=M.D,$=M.$,esc=M.esc;
  const LANES=['image','video','audio','encoder','vlm','native'];
  const X0=2020.75,X1=2027.0,YEARS=[2021,2022,2023,2024,2025,2026];
  const hidden={};let cur=YEARS.length-1,sel=null;
  const pts=D.rows.filter(r=>LANES.indexOf(r.c)>=0).map(r=>({r,t:M.yr(r.d)}));
  // legend: only families present in the lanes
  const fams=Object.keys(D.fam).filter(f=>pts.some(p=>p.r.fam===f));
  const leg=$('mm-leg');
  leg.innerHTML=fams.map(f=>'<button data-f="'+f+'" aria-pressed="true" title="'+esc(D.fam[f][1])+'">'+M.dot(f)+esc(D.fam[f][0])+'</button>').join('');
  leg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const f=b.dataset.f;hidden[f]=!hidden[f];
    b.classList.toggle('off',!!hidden[f]);b.setAttribute('aria-pressed',hidden[f]?'false':'true');draw()});
  function draw(){
    const el=$('mm-tl'),W=M.width(el),narrow=W<520;
    const L=narrow?64:92,R=10,T=18,laneH=narrow?34:38,H=T+LANES.length*laneH+22;
    const sx=t=>L+(t-X0)/(X1-X0)*(W-L-R);
    const endT=YEARS[cur]+1;
    let s='';
    YEARS.forEach(y=>{const x=sx(y);s+='<line x1="'+x+'" x2="'+x+'" y1="'+T+'" y2="'+(H-20)+'" stroke="var(--line)"/>'+
      '<text x="'+(x+2)+'" y="'+(H-6)+'" font-size="11" fill="var(--mute)">'+(narrow?"'"+String(y).slice(2):y)+'</text>'});
    LANES.forEach((ln,i)=>{const y=T+i*laneH;
      s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(y+laneH)+'" y2="'+(y+laneH)+'" stroke="var(--line)" stroke-dasharray="2 3"/>';
      s+='<text x="4" y="'+(y+laneH/2+4)+'" font-size="'+(narrow?10.5:12)+'" fill="var(--ink)">'+esc(narrow?{image:'Image',video:'Video',audio:'Audio',encoder:'Encoders',vlm:'VLMs',native:'Native'}[ln]:D.cat[ln].replace('Vision-language models','VLMs').replace(' generation','').replace('Vision encoders','Encoders').replace('Native multimodal','Native'))+'</text>';
      // place dots: sub-rows so that close dots do not overlap
      const lp=pts.filter(p=>p.r.c===ln).sort((a,b)=>a.t-b.t),rowsEnd=[],rad=narrow?4.2:5,sub=3;
      lp.forEach(p=>{const x=sx(p.t);let k=0;while(k<sub&&rowsEnd[k]!=null&&x-rowsEnd[k]<rad*2.1)k++;if(k>=sub)k=sub-1;rowsEnd[k]=x;
        const yy=y+laneH/2+(k-1)*(laneH/3.4);const off=hidden[p.r.fam],fut=p.t>=endT;
        s+='<circle class="mm-pt" data-id="'+p.r.id+'" cx="'+x.toFixed(1)+'" cy="'+yy.toFixed(1)+'" r="'+(p.r.id===sel?rad+2:rad)+'" fill="'+M.famCol(p.r.fam)+'" stroke="'+(p.r.id===sel?'var(--ink)':'var(--bg)')+'" stroke-width="'+(p.r.id===sel?2:1)+'" opacity="'+(off?0.06:fut?0.15:(p.r.st==='retired'?0.55:1))+'"><title>'+esc(p.r.n+' ('+p.r.d+')')+'</title></circle>'});
    });
    const cx=sx(Math.min(endT,X1));
    s+='<line x1="'+cx+'" x2="'+cx+'" y1="'+(T-8)+'" y2="'+(H-20)+'" stroke="var(--acc)" stroke-width="2"/>';
    s+='<text x="'+Math.min(cx-3,W-R-2)+'" y="'+(T-9)+'" font-size="11" text-anchor="end" fill="var(--acc)">to end of '+YEARS[cur]+'</text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Timeline of models by lane and family">'+s+'</svg>';
    bars();
  }
  function bars(){
    const y=YEARS[cur];
    const groups=[['Image and video generators',r=>r.c==='image'||r.c==='video'],['Understanding: VLMs and native models',r=>r.c==='vlm'||r.c==='native']];
    let html='',txt=[];
    groups.forEach(g=>{
      const rs=D.rows.filter(r=>g[1](r)&&+r.d.slice(0,4)===y);const c={};rs.forEach(r=>c[r.fam]=(c[r.fam]||0)+1);
      const ks=Object.keys(c).sort((a,b)=>c[b]-c[a]);
      html+='<div class="small" style="margin-top:6px">'+esc(g[0])+', '+y+': '+rs.length+' rows</div><div class="mm-bar">'+
        ks.map(k=>'<span title="'+esc(D.fam[k][0]+': '+c[k])+'" style="width:'+(100*c[k]/rs.length).toFixed(1)+'%;background:'+M.famCol(k)+'"></span>').join('')+'</div>';
      txt.push(esc(g[0])+' in '+y+': '+(ks.map(k=>esc(D.fam[k][0])+' '+c[k]).join(', ')||'none'));
    });
    $('mm-yr-bar').outerHTML='<div id="mm-yr-bar">'+html+'</div>';
    $('mm-yr-lab').textContent='Family mix of this table\'s rows dated '+y+' (counts of curated rows, not of the whole field)';
    $('mm-yr-txt').innerHTML=txt.join('. ')+'.';
  }
  $('mm-tl').addEventListener('click',e=>{const c=e.target.closest('.mm-pt');if(!c)return;sel=c.dataset.id;const r=M.byId[sel];
    $('mm-tl-tip').innerHTML=M.dot(r.fam)+'<b>'+esc(r.n)+'</b> ('+esc(r.o)+', '+esc(r.d)+'): '+esc(D.fam[r.fam][0])+'; '+M.accTag(r.acc)+' <a href="#" id="mm-tl-go">open its row</a>';
    $('mm-tl-go').addEventListener('click',ev=>{ev.preventDefault();M.showRow(sel)});draw()});
  const A=M.anim({card:'mm-time-card',ctl:'mm-tl-ctl',n:YEARS.length,ms:1700,label:'Year',draw:i=>{cur=i;draw()}});
  A.go(YEARS.length-1);
  M.onRender(draw);
  let t=0;addEventListener('resize',()=>{const tab=$('t-map');if(tab.hidden)return;clearTimeout(t);t=setTimeout(draw,80)});
})();
