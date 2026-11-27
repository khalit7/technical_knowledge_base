// ---- Figures of the Reading tab: the four-corner square (hero), the curve widget (reference budget slider), the per-year
// multipliers and the 7 x 7 grid. Every number comes from window.PDD (written by src/recompute.py from the article's chart data)
// or, for the two published tables, from the article's tables as printed (listed in each caption).
(function(){
  if(!window.RD||!window.PDD||!document.getElementById('pd-hero-svg'))return;
  const D=window.PDD,$=id=>document.getElementById(id),t=RD.t,L=Math.log10;
  const COL={OO:'var(--mute)',MO:'var(--c1)',OD:'var(--c3)',MD:'var(--c2)'};
  const NAME={OO:'GPT-2 recipe, OpenWebText (2019 pair)',MO:'OLMo-2 recipe, OpenWebText',OD:'GPT-2 recipe, Ultra-FineWeb',MD:'OLMo-2 recipe, Ultra-FineWeb'};
  const SH={OO:'GPT-2 + OWT',MO:'OLMo-2 + OWT',OD:'GPT-2 + UFW',MD:'OLMo-2 + UFW'};
  const fx=v=>(v>=10?v.toFixed(1):v.toFixed(2))+'x';
  const sup=e=>'10<tspan dy="-5" font-size="9">'+e+'</tspan><tspan dy="5"> </tspan>';

  // ---- hero: the square of corners, each edge a multiplier at the common score 0.4008
  function hero(){
    const el=$('pd-hero-svg'),W=RD.width(el),narrow=W<480;
    const pad=narrow?44:70,side=Math.min(W-2*pad,narrow?250:320),x0=(W-side)/2,y0=46,H=y0+side+(narrow?82:70);
    const P={OO:[x0,y0+side],MO:[x0,y0],OD:[x0+side,y0+side],MD:[x0+side,y0]};
    const c=D.conditional,h=D.headline;
    let s='<defs><marker id="pd-ar" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--ink)"/></marker></defs>';
    const edge=(a,b,lab,col,off,w)=>{const [x1,y1]=P[a],[x2,y2]=P[b],dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,r=16;
      s+='<line x1="'+(x1+ux*r)+'" y1="'+(y1+uy*r)+'" x2="'+(x2-ux*r)+'" y2="'+(y2-uy*r)+'" stroke="'+col+'" stroke-width="'+(w||3)+'" marker-end="url(#pd-ar)"/>';
      const mx=(x1+x2)/2+off[0],my=(y1+y2)/2+off[1];
      s+='<rect x="'+(mx-30)+'" y="'+(my-12)+'" width="60" height="22" rx="6" fill="var(--card)" stroke="'+col+'"/>'+t(mx,my+4,lab,{fs:13,a:'middle',w:700,fill:'var(--ink)'});};
    edge('OO','MO',fx(h.model),COL.MO,[narrow?34:-30,0]);
    edge('OO','OD',fx(h.data),COL.OD,[0,26]);
    edge('MO','MD',fx(c.data_with_2025_model),COL.OD,[0,-24]);
    edge('OD','MD',fx(c.model_on_2025_data),COL.MO,[narrow?-34:32,0]);
    edge('OO','MD',fx(h.joint),COL.MD,[0,0],3.5);
    Object.keys(P).forEach(k=>{const [x,y]=P[k];s+='<circle cx="'+x+'" cy="'+y+'" r="9" fill="'+COL[k]+'" stroke="var(--card)" stroke-width="2"/>';
      const below=k==='OO'||k==='OD',left=k==='OO'||k==='MO',lx=left?x-8:x+8,a=left?'start':'end';
      const l1=k[0]==='O'?'GPT-2 recipe':'OLMo-2 recipe',l2=k[1]==='O'?'OpenWebText':'Ultra-FineWeb';
      const y1=below?y+26:y-30,y2=y1+14;
      s+=t(lx,y1,l1,{fs:12,a:a,fill:'var(--ink)',w:600})+t(lx,y2,l2,{fs:12,a:a,fill:'var(--mute)'});});
    if(narrow){s+=t(W/2,H-20,'left x bottom: '+h.model.toFixed(2)+' x '+h.data.toFixed(2)+' = '+(h.model*h.data).toFixed(1)+'x',{fs:11.5,a:'middle',fill:'var(--mute)'})+t(W/2,H-5,'measured diagonal: '+h.joint.toFixed(1)+'x',{fs:11.5,a:'middle',fill:'var(--mute)'})}
    else s+=t(W/2,H-6,'product of the left and bottom edges: '+h.model.toFixed(2)+' x '+h.data.toFixed(2)+' = '+(h.model*h.data).toFixed(1)+'x; measured diagonal: '+h.joint.toFixed(1)+'x',{fs:12,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Four corners: GPT-2 or OLMo-2 recipe on OpenWebText or Ultra-FineWeb, with compute multipliers on each edge');
  }

  // ---- the curve widget: four corners, reference budget slider, crossings
  const KEYS=['OO','MO','OD','MD'];
  function firstReach(m,level){if(m[0]>=level)return null;for(let i=1;i<m.length;i++){if(m[i]>=level){const f=(level-m[i-1])/(m[i]-m[i-1]);return L(D.curves.C[i-1])+f*(L(D.curves.C[i])-L(D.curves.C[i-1]))}}return null}
  function curves(){
    const el=$('pd-curves-svg'),W=RD.width(el),narrow=W<480,at=+$('pd-ref').value,C=D.curves.C;
    const ml=narrow?40:48,mr=narrow?10:16,mt=12,H=narrow?260:300,mb=40;
    const X=v=>ml+(v-17)/2*(W-ml-mr),ylo=0.355,yhi=0.47,Y=v=>mt+(yhi-v)/(yhi-ylo)*(H-mt-mb);
    let s='';
    [0.36,0.38,0.40,0.42,0.44,0.46].forEach(v=>{s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+t(ml-5,Y(v)+4,v.toFixed(2),{fs:11,a:'end',fill:'var(--mute)'})});
    C.forEach((c,i)=>{const lx=L(c);s+='<line x1="'+X(lx)+'" x2="'+X(lx)+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--line)" stroke-dasharray="2 3"/>';
      s+='<text x="'+X(lx)+'" y="'+(H-mb+15)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(i%2?'3.16e'+Math.floor(lx):sup(Math.round(lx)))+'</text>'});
    s+=t((ml+W-mr)/2,H-6,'training compute, FLOPs (log scale)',{fs:11.5,a:'middle',fill:'var(--mute)'});
    const cv={OO:D.curves.OO,MO:D.curves.MO,OD:D.curves.OD,MD:D.curves.MD},sdk={OO:'2019 model, 2019 data',MO:'2025 model, 2019 data',OD:'2019 model, 2025 data',MD:'2025 model, 2025 data'};
    KEYS.forEach(k=>{const m=cv[k],sd=D.curves.sd[sdk[k]];
      let band='';m.forEach((v,i)=>{band+=(i?'L':'M')+X(L(C[i]))+','+Y(v+sd[i])});for(let i=m.length-1;i>=0;i--)band+='L'+X(L(C[i]))+','+Y(m[i]-sd[i]);
      s+='<path d="'+band+'Z" fill="'+COL[k]+'" opacity=".13"/>';
      s+='<polyline points="'+m.map((v,i)=>X(L(C[i]))+','+Y(v)).join(' ')+'" fill="none" stroke="'+COL[k]+'" stroke-width="2.5"/>';
      m.forEach((v,i)=>{s+='<circle cx="'+X(L(C[i]))+'" cy="'+Y(v)+'" r="2.6" fill="'+COL[k]+'"/>'});
    });
    const ref=cv.OO[at],xr=L(C[at]);
    s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(ref)+'" y2="'+Y(ref)+'" stroke="var(--ink)" stroke-dasharray="5 4" stroke-width="1.3"/>';
    s+=t(W-mr-2,Y(ref)-5,'reference '+ref.toFixed(4),{fs:11.5,a:'end',fill:'var(--ink)'});
    const r=D.by_reference[at-1],out=[];
    [['MO','model','2025 recipe alone',1],['OD','data','2025 corpus alone',2],['MD','joint','both',3]].forEach(([k,f,lab,o])=>{
      const x=firstReach(cv[k],ref);
      if(x!==null){const yo=Y(ref)+o*6;s+='<line x1="'+X(x)+'" x2="'+X(xr)+'" y1="'+yo+'" y2="'+yo+'" stroke="'+COL[k]+'" stroke-width="3.5"/>'+'<line x1="'+X(x)+'" x2="'+X(x)+'" y1="'+Y(ref)+'" y2="'+yo+'" stroke="'+COL[k]+'" stroke-width="1.5"/><circle cx="'+X(x)+'" cy="'+Y(ref)+'" r="5" fill="'+COL[k]+'" stroke="var(--card)" stroke-width="1.5"/>'}
      out.push(RD.stat(lab,r[f]===null?'off range':fx(r[f]),r[f]===null?'already above the reference at 1e17':(r[f]<1?'needs more compute than GPT-2':'less compute for the same score')));});
    s+='<circle cx="'+X(xr)+'" cy="'+Y(ref)+'" r="5" fill="var(--card)" stroke="var(--ink)" stroke-width="2"/>';
    el.innerHTML=RD.svg(W,H,s,'OLMES score against compute for the four corners, with the reference score and where each curve reaches it');
    $('pd-out').innerHTML=out.join('');
    $('pd-ref-v').textContent=['','3.16e17','1e18','3.16e18','1e19'][at]+' FLOPs';
  }

  // ---- per-year multipliers: the article's two tables, with our recomputation from its curves
  const REC=[['GPT-3',2020,1.36,1.16,1.60,1.36],['GPT-J',2021,1.71,1.52,1.96,1.71],['NeoX',2022,0.74,0.56,0.95,null],['LLaMA',2023,1.68,1.51,1.92,1.68],['Llama 3',2024,1.69,1.52,1.91,1.69],['OLMo-2',2025,1.82,1.66,2.04,1.82]];
  const COR=[['C4',2020,1.37,1.09,1.70,1.40],['Pile',2021,0.98,0.73,1.22,null],['OLM CC',2022,2.59,2.21,3.15,2.39],['RefinedWeb',2023,2.62,2.14,3.34,1.81],['FineWeb-Edu',2024,8.63,6.98,10.81,4.80],['Ultra-FineWeb',2025,8.66,6.68,11.01,5.40]];
  function years(){
    const el=$('pd-years-svg'),W=RD.width(el),narrow=W<480;
    const ml=narrow?34:42,mr=10,mt=10,H=narrow?250:280,mb=34;
    const X=y=>ml+(y-2019.5)/6*(W-ml-mr),lo=L(0.5),hi=L(12),Y=v=>mt+(hi-L(v))/(hi-lo)*(H-mt-mb);
    let s='';
    [0.5,1,2,4,8].forEach(v=>{s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"'+(v===1?' stroke-width="2"':'')+'/>'+t(ml-5,Y(v)+4,v+'x',{fs:11,a:'end',fill:'var(--mute)'})});
    for(let y=2020;y<=2025;y++)s+=t(X(y),H-mb+15,String(y),{fs:11,a:'middle',fill:'var(--mute)'});
    s+=t((ml+W-mr)/2,H-4,'year of the recipe or corpus; 2019 = 1x',{fs:11,a:'middle',fill:'var(--mute)'});
    const draw=(rows,col,dx)=>{let pts=[];rows.forEach(r=>{const x=X(r[1])+dx;
      s+='<line x1="'+x+'" x2="'+x+'" y1="'+Y(r[4])+'" y2="'+Y(r[3])+'" stroke="'+col+'" stroke-width="2"/>';
      s+='<circle cx="'+x+'" cy="'+Y(r[2])+'" r="4.5" fill="'+col+'"/>';pts.push(x+','+Y(r[2]));
      if(r[5]!==null&&Math.abs(r[5]-r[2])>0.005)s+='<circle cx="'+x+'" cy="'+Y(r[5])+'" r="5.5" fill="none" stroke="var(--ink)" stroke-width="1.6"/>';});
      s+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+col+'" stroke-width="1.2" opacity=".6"/>';};
    draw(REC,'var(--c1)',-5);draw(COR,'var(--c3)',5);
    s+=t(X(2024)+5,Y(8.63)-10,'FineWeb-Edu',{fs:11.5,a:'end',fill:'var(--c3)',w:600});
    el.innerHTML=RD.svg(W,H,s,'Compute multipliers at 1e19 FLOPs by year, recipes and corpora');
  }

  // ---- the grid
  const MOD=['GPT-2','GPT-3','GPT-J','NeoX','LLaMA','Llama 3','OLMo-2'],CORP=['OWT','C4','Pile','OLM CC','RefWeb','FW-Edu','UFW'];
  let mode='obs';
  function grid(){
    const G=D.grid.G,mu=G.flat().reduce((a,b)=>a+b,0)/49,a=D.grid.model_effects,b=D.grid.data_effects;
    const val=(i,j)=>mode==='obs'?G[i][j]:G[i][j]-mu-G[i].reduce((x,y)=>x+y,0)/7+mu-G.reduce((x,r)=>x+r[j],0)/7+mu;
    const max=mode==='obs'?4.4:1.8;
    let h='<div class="pd-scroll"><table class="pd-tab pd-grid"><tr><th class="rh">recipe \\ corpus</th>'+CORP.map(c=>'<th>'+c+'</th>').join('')+'</tr>';
    for(let i=0;i<7;i++){h+='<tr><th class="rh">'+MOD[i]+'</th>';for(let j=0;j<7;j++){const v=val(i,j),f=Math.min(1,Math.abs(v)/max);
      const bg=v>=0?'color-mix(in srgb, var(--c3) '+Math.round(f*70)+'%, var(--card))':'color-mix(in srgb, var(--c2) '+Math.round(f*70)+'%, var(--card))';
      const neg=v<0&&Math.abs(v).toFixed(mode==='obs'?1:2)!==(0).toFixed(mode==='obs'?1:2);h+='<td style="background:'+bg+'">'+(neg?'&minus;':'')+Math.abs(v).toFixed(mode==='obs'?1:2)+'</td>'}h+='</tr>'}
    h+='</table></div>';
    $('pd-grid-tab').innerHTML=h;
    $('pd-grid-cap').innerHTML=mode==='obs'?CAP_OBS:'Residual of score = mean + recipe effect + corpus effect, in OLMES points, recomputed here; it matches the article\'s residual table (in thousandths) to the last digit. Standard deviation '+D.grid.resid_sd_points.toFixed(2)+' points, largest '+D.grid.resid_max_abs_points.toFixed(2)+' (Llama 3 on OLM CC); seed-to-seed standard deviation at this budget on the multi-seed curves: '+D.grid.seed_sd_points_3e18.toFixed(2)+'. No row or column pattern: what is left looks like noise.';
  }
  const CAP_OBS=$('pd-grid-cap')?$('pd-grid-cap').innerHTML:'';
  RD.seg($('pd-grid-mode'),m=>{mode=m;grid()});

  function all(){hero();curves();years();grid()}
  $('pd-ref').addEventListener('input',curves);
  RD.onRender(all);RD.onResize(all);all();
})();
