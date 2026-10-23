// ---- Reading tab, section 2: eight requests replayed on three real replicas (before/after animation) ----
(function(){
  const svgEl=document.getElementById('pr-rt-svg');if(!svgEl||!window.PRD)return;
  const DET=PRD.route_detail||{},SUM=PRD.route||{};
  const SCN={root8:'One at a time, 256 MiB cache',root8big:'One at a time, 1.5 GiB cache',root8burst:'Two bursts of four, 1.5 GiB cache'};
  const NAME={rr:'Round robin',ll:'Least loaded',ca:'SGLang cache-aware',wt:'llm-d-style weighted',hash2:'Hash of the first 32 tokens'};
  const COL={A:'var(--c1)',B:'var(--c2)',C:'var(--c3)',D:'var(--c4)'};
  let scn=Object.keys(SCN).find(k=>DET[k])||'root8',pol='rr';
  const cap=document.getElementById('pr-rt-cap'),cnt=document.getElementById('pr-rt-cnt');
  const polSeg=document.getElementById('pr-rt-pol'),scnSeg=document.getElementById('pr-rt-scn');
  scnSeg.innerHTML=Object.keys(SCN).filter(k=>DET[k]).map(k=>'<button data-m="'+k+'"'+(k===scn?' class="on"':'')+'>'+SCN[k]+'</button>').join('');
  function polButtons(){const ps=Object.keys(NAME).filter(p=>DET[scn]&&DET[scn][p]);if(!ps.includes(pol))pol=ps[0];
    polSeg.innerHTML=ps.map(p=>'<button data-m="'+p+'"'+(p===pol?' class="on"':'')+'>'+NAME[p]+'</button>').join('')}
  polButtons();
  const nf=v=>Math.round(v).toLocaleString('en-US');
  function draw(i){
    const R=DET[scn][pol],w=RD.width(svgEl),cw=(w-16)/3,narrow=w<520,off=narrow?20:0,h=38+8*34+6+off;
    let s=RD.t(8,14,'Requests, in the order sent:',{fs:11,w:600});
    const qx=narrow?8:Math.min(176,w*0.45),qy=3+off,qw=Math.min(30,(w-qx-8)/8);
    R.forEach((r,j)=>{const done=j<i;s+='<rect x="'+(qx+j*qw)+'" y="'+qy+'" width="'+(qw-3)+'" height="15" rx="2" fill="'+(done?'var(--soft)':COL[r[0][0]])+'"/>'+RD.t(qx+j*qw+(qw-3)/2,qy+11,r[0],{a:'middle',fs:9.5,fill:done?'var(--mute)':'var(--bg)',w:600})});
    const per=[0,0,0];
    for(let k=0;k<3;k++){const x=8+k*cw;s+='<rect x="'+(x+2)+'" y="'+(26+off)+'" width="'+(cw-6)+'" height="'+(h-30-off)+'" rx="6" fill="var(--bg)" stroke="var(--line)"/>'+RD.t(x+8,41+off,'Replica '+(k+1),{fs:10.5,w:600})}
    R.slice(0,i).forEach((r,j)=>{const k=r[1],x=8+k*cw,y=48+off+per[k]*34;per[k]++;const last=j===i-1,hit=r[2],tot=r[2]+r[3];
      s+='<rect x="'+(x+8)+'" y="'+y+'" width="'+(cw-18)+'" height="29" rx="4" fill="var(--soft)" stroke="'+(last?'var(--ink)':COL[r[0][0]])+'" stroke-width="'+(last?2:1)+'"/>';
      const bw=cw-30;s+='<rect x="'+(x+14)+'" y="'+(y+18)+'" width="'+bw+'" height="6" fill="var(--bad)" opacity=".55"/><rect x="'+(x+14)+'" y="'+(y+18)+'" width="'+(bw*hit/tot).toFixed(1)+'" height="6" fill="var(--good)"/>';
      s+=RD.t(x+14,y+13,r[0]+(cw>150?': '+nf(r[3])+' computed':': '+nf(r[3])),{fs:10,w:600})});
    svgEl.innerHTML=RD.svg(w,h,s,'Eight requests on three llama-server replicas, '+NAME[pol]);
    const done=R.slice(0,i),comp=done.reduce((a,r)=>a+r[3],0),t2=done.filter(r=>r[0][1]==='2');
    let t,p;
    if(i===0){t=NAME[pol]+': '+SCN[scn];p='Four conversations, A to D, each a first turn (1,000-token system prompt plus 1,000 tokens) and a second turn that resends both, the 300-token answer the replica actually generated, and 200 new tokens. Bars: green the share found cached, orange the share computed.'}
    else{const r=R[i-1];t=r[0]+' went to replica '+(r[1]+1);
      p=nf(r[2])+' of its '+nf(r[2]+r[3])+' prompt tokens were cached there, '+nf(r[3])+' computed; first token after '+r[4].toFixed(2)+' s.'+
        (r[0][1]==='2'&&r[2]<2000?' Its first turn is not in this replica\'s cache'+(r[2]>=1000?', only the shared system prompt.':'.'):'')+
        (r[0][1]==='2'&&r[2]>=2000?' The whole first turn and its answer were still cached.':'')}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
    const sm=(SUM[scn]&&SUM[scn][pol])||[];const reps=sm.map(x=>x.computed);
    cnt.innerHTML=RD.stat('Prompt tokens computed',nf(comp),i===8&&reps.length>1?('every repeat: '+[...new Set(reps)].map(nf).join(', ')):'')+
      RD.stat('Second turns: mean TTFT',t2.length?(t2.reduce((a,r)=>a+r[4],0)/t2.length).toFixed(2)+' s':'none yet','measured on the M1 Pro')+
      RD.stat('Most requests on one replica',Math.max(...per),'')+
      RD.stat('A toy router\'s count',pol==='rr'?'13,000':'7,800','prompt tokens computed for all eight');
  }
  const A=RD.anim({card:'pr-rt-card',ctl:'pr-rt-ctl',n:9,draw,ms:1300,label:'Routing step'});
  RD.seg(scnSeg,v=>{scn=v;polButtons();A.reset(9)});
  RD.seg(polSeg,v=>{pol=v;A.reset(9)});
  RD.onResize(()=>A.redraw());
})();
