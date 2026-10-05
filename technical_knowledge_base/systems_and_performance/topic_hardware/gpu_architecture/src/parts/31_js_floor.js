// ---- Chip floorplans tab: schematic drawings from published counts (window.GA.chips) ----
(function(){
  const G=window.GA,$=id=>document.getElementById(id),C=id=>G.chips.find(c=>c.id===id);
  // SMs per GPC: [full, enabled]; which GPC loses SMs is illustrative (not published)
  const PLAN={
    a100:{dies:[{gpcs:[[16,16],[16,16],[16,16],[16,15],[16,15],[16,15],[16,15],[16,0]]}],mem:{kind:'hbm',sites:6,on:5},l2:'40 MB L2 (two partitions)',l2s:'40 MB L2'},
    h100:{dies:[{gpcs:[[18,18],[18,16],[18,16],[18,16],[18,16],[18,18],[18,16],[18,16]]}],mem:{kind:'hbm',sites:6,on:5},l2:'50 MB L2 (60 MB on the full die)',l2s:'50 MB L2'},
    b200:{dies:[{gpcs:[[19,19],[18,18],[19,19],[18,18]]},{gpcs:[[19,19],[18,18],[19,19],[18,18]]}],mem:{kind:'hbm',sites:8,on:8},l2:'L2 size n/s (4 partitions, independent paper)',l2s:'L2: size n/s',unk:'148 SMs in 8 GPCs from an independent paper; how they split across GPCs and dies, and how many SMs the full dies have, is not published (drawn evenly).'},
    b300:{dies:[{gpcs:[[20,20],[20,20],[20,20],[20,20]]},{gpcs:[[20,20],[20,20],[20,20],[20,20]]}],mem:{kind:'hbm',sites:8,on:8},l2:'L2 size n/s',unk:'NVIDIA describes 160 SMs in 8 GPCs; the split per die and how many a shipping B300 enables are not stated (drawn evenly, all enabled).'},
    rubin:{dies:[{flat:112},{flat:112}],mem:{kind:'none'},l2:'"large centralized L2", size n/s',l2s:'L2: size n/s',unk:'224 SMs on two dies; GPCs, L2 size and HBM4 stack count are not stated, so SMs are drawn as one block per die and no stacks are drawn.'},
    rtx5090:{dies:[{gpcs:[[16,16],[16,16],[16,16],[16,16],[16,16],[16,15],[16,15],[16,15],[16,15],[16,15],[16,15],[16,0]]}],mem:{kind:'gddr',n:16},l2:'96 MB L2 (128 MB on the full die)',l2s:'96 MB L2'}
  };
  const ids=['a100','h100','b200','b300','rubin','rtx5090'];
  ['fl-a','fl-b'].forEach((s,j)=>{$(s).innerHTML=ids.map(id=>'<option value="'+id+'"'+((j===0&&id==='h100')||(j===1&&id==='b200')?' selected':'')+'>'+C(id).name+'</option>').join('')});
  function drawChip(id,el){
    const P=PLAN[id],c=C(id),W=Math.min(860,RD.width(el)),nd=P.dies.length;
    const memW=P.mem.kind==='hbm'?Math.max(26,W*0.07):0,padG=P.mem.kind==='gddr'?16:4;
    const pkgX=2,pkgW=W-4,dieGap=nd>1?8:0,dieW=(pkgW-2*memW-2*padG-dieGap*(nd-1))/nd,dieH=Math.max(170,Math.min(280,dieW*(nd>1?1.15:0.62)));
    let g='',y0=padG+2,sOn=0,sOff=0;
    g+='<rect x="'+pkgX+'" y="2" width="'+pkgW+'" height="'+(dieH+2*padG)+'" rx="8" fill="none" stroke="var(--line)" stroke-dasharray="4 3"/>';
    P.dies.forEach((d,di)=>{
      const dx=pkgX+memW+padG+di*(dieW+dieGap);
      g+='<rect x="'+dx+'" y="'+y0+'" width="'+dieW+'" height="'+dieH+'" rx="5" fill="var(--soft)" stroke="var(--mute)"/>';
      const l2h=18,half=(dieH-l2h-12)/2;
      g+='<rect x="'+(dx+4)+'" y="'+(y0+4+half+2)+'" width="'+(dieW-8)+'" height="'+l2h+'" rx="3" fill="var(--c4)" opacity=".35"/>'+RD.t(dx+dieW/2,y0+4+half+15,di===0?(dieW<P.l2.length*5.2?(P.l2s||'L2'):P.l2):'L2',{a:'middle',fs:dieW<200?8.5:10});
      if(d.flat){
        const n=d.flat,cols=Math.ceil(Math.sqrt(n*(dieW-8)/(2*half))),rows=Math.ceil(n/cols),rh=Math.ceil(rows/2),cw=(dieW-8)/cols,cs=Math.min(cw,(half-2)/rh);
        for(let k=0;k<n;k++){const r=Math.floor(k/cols),cc=k%cols,yy=r<rh?y0+4+r*cs:y0+4+half+2+l2h+4+(r-rh)*cs;g+='<rect x="'+(dx+4+cc*cw)+'" y="'+yy+'" width="'+(cs-1.5)+'" height="'+(cs-1.5)+'" fill="var(--c3)" opacity=".75"/>'}
        sOn+=n;
      }else{
        const ng=d.gpcs.length,perRow=Math.ceil(ng/2),gw=(dieW-8)/perRow;
        d.gpcs.forEach((gp,k)=>{
          const row=k<perRow?0:1,col=k%perRow,gx=dx+4+col*gw,gy=row===0?y0+4:y0+8+half+l2h+4;
          const off=gp[1]===0;
          g+='<rect x="'+(gx+1)+'" y="'+gy+'" width="'+(gw-2)+'" height="'+(half-4)+'" rx="3" fill="none" stroke="'+(off?'var(--dim)':'var(--acc)')+'" stroke-width="1"/>';
          const full=gp[0],iw=gw-6,ih=half-8,cols=Math.ceil(Math.sqrt(full*iw/ih)),rows=Math.ceil(full/cols),cs=Math.min(iw/cols,ih/rows);
          for(let s=0;s<full;s++){const on=s<gp[1];const r=Math.floor(s/cols),cc=s%cols;
            g+='<rect x="'+(gx+3+cc*cs)+'" y="'+(gy+2+r*cs)+'" width="'+Math.max(1,cs-1.5)+'" height="'+Math.max(1,cs-1.5)+'" fill="'+(on?'var(--c3)':'var(--dim)')+'" opacity="'+(on?.8:.9)+'"/>';
            if(on)sOn++;else sOff++}
        });
      }
    });
    // memory
    if(P.mem.kind==='hbm'){const per=P.mem.sites/2,sh=(dieH)/per;
      for(let k=0;k<P.mem.sites;k++){const left=k<per,idx=k%per,x=left?pkgX+padG/2:pkgX+pkgW-memW-padG/2,y=y0+idx*sh+3,isOn=k<P.mem.on;
        g+='<rect x="'+x+'" y="'+y+'" width="'+(memW-2)+'" height="'+(sh-6)+'" rx="3" fill="'+(isOn?'var(--c2)':'none')+'" opacity="'+(isOn?.55:1)+'" stroke="'+(isOn?'var(--c2)':'var(--mute)')+'" stroke-dasharray="'+(isOn?'':'3 2')+'"/>'+RD.t(x+memW/2-1,y+sh/2,isOn?'HBM':'off',{a:'middle',fs:9})}}
    else if(P.mem.kind==='gddr'){const n=P.mem.n/2,cw=pkgW/n;for(let k=0;k<P.mem.n;k++){const top=k<n,x=pkgX+(k%n)*cw+cw*0.2,y=top?3:dieH+2*padG-11;g+='<rect x="'+x+'" y="'+y+'" width="'+cw*0.6+'" height="9" rx="2" fill="var(--c2)" opacity=".6"/>'}}
    const H=dieH+2*padG+6;
    let leg='<rect x="2" y="'+(H+2)+'" width="10" height="10" fill="var(--c3)"/>'+RD.t(16,H+11,'SM enabled ('+sOn+')',{fs:10})+'<rect x="'+(W<420?100:130)+'" y="'+(H+2)+'" width="10" height="10" fill="var(--dim)"/>'+RD.t((W<420?114:144),H+11,'disabled ('+sOff+')',{fs:10});
    if(P.mem.kind==='hbm')leg+='<rect x="'+(W<420?190:240)+'" y="'+(H+2)+'" width="10" height="10" fill="var(--c2)" opacity=".55"/>'+RD.t((W<420?204:254),H+11,'HBM stack',{fs:10});
    if(P.mem.kind==='gddr')leg+='<rect x="'+(W<420?190:240)+'" y="'+(H+2)+'" width="10" height="10" fill="var(--c2)" opacity=".6"/>'+RD.t((W<420?204:254),H+11,'GDDR7 controller',{fs:10});
    el.innerHTML=RD.svg(W,H+18,g+leg,c.name+' floorplan schematic');
    return {sOn,sOff};
  }
  const rowsDef=[['Architecture',c=>c.arch],['Year',c=>c.year],['Compute capability',c=>c.cc||'n/s'],['Dies',c=>c.dies],['GPCs enabled (full die)',c=>(c.gpc_on!=null?c.gpc_on:'n/s')+(c.gpc_full!=null?' ('+c.gpc_full+')':'')],
    ['SMs enabled (full die)',c=>(c.sm_on!=null?c.sm_on:'n/s')+(c.sm_full!=null?' ('+c.sm_full+')':'')],['Tensor cores per SM',c=>c.tc_sm],['FP32 lanes per SM',c=>c.fp32_sm!=null?c.fp32_sm:'n/s'],
    ['L1 + shared per SM, KB',c=>c.l1_kb!=null?c.l1_kb:'n/s'],['Max shared per SM, KB',c=>c.smem_kb!=null?c.smem_kb:'n/s'],['L2, MB',c=>c.l2_mb!=null?c.l2_mb:'n/s'],
    ['Memory',c=>c.gb+' GB '+c.mem],['Stacks (sites)',c=>c.stacks_on!=null?c.stacks_on+(c.stacks_full!==c.stacks_on?' of '+c.stacks_full:''):'n/a or n/s'],['Memory controllers',c=>c.mc],['Bandwidth, TB/s',c=>c.tbs],
    ['Process',c=>c.node],['Transistors, billions',c=>c.xtors],['Die area, mm²',c=>c.area!=null?c.area:(c.dies>1?'n/s (two reticle-sized dies)':'n/s')]];
  function render(){
    const a=$('fl-a').value,b=$('fl-b').value,A=C(a),B=C(b);
    $('fl-ta').textContent=A.name;$('fl-tb').textContent=B.name;
    drawChip(a,$('fl-sa'));drawChip(b,$('fl-sb'));
    $('fl-na').textContent=PLAN[a].unk||'Which SMs, GPCs and stack sites are disabled varies from chip to chip; positions are illustrative, counts are published.';
    $('fl-nb').textContent=PLAN[b].unk||'Which SMs, GPCs and stack sites are disabled varies from chip to chip; positions are illustrative, counts are published.';
    $('fl-table').innerHTML='<thead><tr><th></th><th class="num">'+A.name+'</th><th class="num">'+B.name+'</th></tr></thead><tbody>'+rowsDef.map(r=>{const va=String(r[1](A)),vb=String(r[1](B));const d=va!==vb?' diff':'';return '<tr><td>'+r[0]+'</td><td class="num'+d+'">'+va+'</td><td class="num'+d+'">'+vb+'</td></tr>'}).join('')+'</tbody>';
  }
  $('fl-a').addEventListener('change',render);$('fl-b').addEventListener('change',render);
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-floor']=window.TAB_RENDER['t-floor']||[]).push(render);
  RD.onResize(render,'t-floor');
})();
