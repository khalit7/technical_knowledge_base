// ---- Reading: forgetting against adaptation (Ibrahim et al. Tables 2, 4, 12; the toy's 3 x 3 grid) ----
(function(){
  const plot=document.getElementById('frPlot');if(!plot)return;
  const IB=CPT.ib,T=CPT.toy;let set='ger405',sel=null;
  const det=document.getElementById('frDet'),note=document.getElementById('frNote'),lg=document.getElementById('frLg');
  const f=v=>v.toFixed(2);
  // build the series for the current set: [{name,color,pts:[{x,y,lab,info}]}], refs
  function series(){
    if(set==='toy'){
      const S=T.summary,cols={'1.0':'var(--c2)','0.33':'var(--c4)','0.1':'var(--c6)'};
      const ser=T.meta.peaks.map(pk=>({name:'replay 0, 5, 25% at peak '+(pk===1?'1':pk)+'×',color:cols[String(pk)]||'var(--c2)',
        pts:T.meta.replays.map(rp=>{const n='p'+(pk===1?'1.0':pk)+'_r'+(rp===0?'0.0':rp),s=S[n];
          return {x:s.de,y:s.en,lab:Math.round(rp*100)+'%',info:'<b>Toy, peak '+pk+'× of pretraining, '+Math.round(rp*100)+'% English replay</b> (mean of '+T.seeds.length+' seeds): English '+f(s.en)+' (range '+f(s.en_min)+' to '+f(s.en_max)+'), German '+f(s.de)+' (range '+f(s.de_min)+' to '+f(s.de_max)+'). English rise over the base: '+f(s.forget)+(s.removed_pct!=null&&rp>0?'; removes '+s.removed_pct+'% of the no-replay, full-peak rise':'')+'.'}})}));
      return {ser,base:S.base.en,baseNew:S.base.de,union:[S.union.de,S.union.en],xl:'German loss (bits per character), lower is better',yl:'English loss',unit:'bits per character',
        note:'Toy, three seeds each (means). Defaults reproduce Ibrahim et al.\'s direction independently: replay lowers the old-data loss far more than it raises the new; a lower peak trades along the curve. Full curves on the Replay toy tab.'}}
    const D=IB[set];
    const ser=[{name:'replay share (re-warm to the old peak)',color:'var(--c2)',pts:D.replay.map(r=>({x:r[2],y:r[1],lab:r[0]+'%',
      info:'<b>'+r[0]+'% replay</b>: Pile '+f(r[1])+', '+D.new+' '+f(r[2])+'. Pile rise over the base model: '+f(r[1]-D.base_old)+(r[0]?'; removes '+(100*(D.replay[0][1]-r[1])/(D.replay[0][1]-D.base_old)).toFixed(1)+'% of the no-replay rise <i class="nl d">derived</i>':'')+'.'}))}];
    if(D.lr.length)ser.push({name:'peak learning rate, no replay',color:'var(--c4)',pts:D.lr.map(r=>{const k=+(r[0]/3e-4).toFixed(2),lab=r[0]==='const'?'constant':k+'×';
      return {x:r[2],y:r[1],lab,info:'<b>'+(r[0]==='const'?'Constant learning rate, no re-warm':'Re-warm to '+r[0].toExponential(1)+' ('+k+'× the original peak), cosine to 0.1× of it')+'</b>: Pile '+f(r[1])+', '+D.new+' '+f(r[2])+'. Pile rise: '+f(r[1]-D.base_old)+'.'+(r[0]==='const'?' Table 12 does not say which of Figure 4\'s two constant baselines this is; its numbers fit the text\'s description of the one at the old minimum, 3e-5 (least forgetting, least adaptation on German).':'')}})});
    return {ser,base:D.base_old,baseNew:D.base_new,union:[D.union[1],D.union[0]],scratch:[D.scratch_new[1],D.scratch_new[0]],xl:D.new+' loss (nats per token), lower is better',yl:'Pile loss',unit:'nats',
      note:'Final validation losses from Ibrahim et al. ('+D.tokens+'): %T2%. Defaults reproduce the tables by construction (transcribed). '+(D.base_new==null?'The base model\'s German loss is not reported: the tables repeat its SlimPajama loss, 2.70, in the German block, so no German baseline is drawn.':'')}}
  function draw(){
    const C=series(),w=Math.min(RD.width(plot),860),h=Math.max(250,Math.min(360,w*0.55));
    const xs=[],ys=[];C.ser.forEach(s=>s.pts.forEach(p=>{xs.push(p.x);ys.push(p.y)}));xs.push(C.union[0]);ys.push(C.union[1],C.base);
    if(C.scratch){xs.push(C.scratch[0]);ys.push(C.scratch[1])}
    if(C.baseNew!=null&&set!=='toy')xs.push(C.baseNew);
    const pad=(a,b,k)=>[a-(b-a)*k,b+(b-a)*k];
    const xr=pad(Math.min(...xs),Math.max(...xs),0.08),yr=pad(Math.min(...ys),Math.max(...ys),0.08);
    const tick=(r,n)=>{const st=[0.01,0.02,0.05,0.1,0.2,0.25,0.5,1].find(s=>(r[1]-r[0])/s<=n)||1;const o=[];for(let v=Math.ceil(r[0]/st)*st;v<=r[1]+1e-9;v+=st)o.push(+v.toFixed(3));return o};
    const F=PL.frame({w,h,x:xr,y:yr,xt:tick(xr,w<500?5:8),yt:tick(yr,6),xlab:C.xl,ylab:C.yl,m:{l:44,r:12,t:12,b:36}});
    let s=F.open()+F.axes;
    const hl=(y,lab)=>'<line x1="'+F.m.l+'" x2="'+(F.W-F.m.r)+'" y1="'+F.sy(y)+'" y2="'+F.sy(y)+'" stroke="var(--mute)" stroke-dasharray="3 3"/><text x="'+(F.m.l+4)+'" y="'+(F.sy(y)+13)+'" font-size="10.5" fill="var(--mute)">'+lab+'</text>';
    s+=hl(C.base,'base model, before CPT');
    if(C.baseNew!=null&&C.baseNew<=xr[1])s+='<line y1="'+F.m.t+'" y2="'+(F.m.t+F.ih)+'" x1="'+F.sx(C.baseNew)+'" x2="'+F.sx(C.baseNew)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    const pts=[];
    C.ser.forEach((se,si)=>{s+='<path d="'+PL.path(se.pts.map(p=>[p.x,p.y]),F.sx,F.sy)+'" fill="none" stroke="'+se.color+'" stroke-width="2"/>';
      se.pts.forEach((p,pi)=>{const id=si+'_'+pi;pts.push([id,p]);const X=F.sx(p.x),Y=F.sy(p.y);
        s+='<g class="frp" data-id="'+id+'" style="cursor:pointer"><circle cx="'+X+'" cy="'+Y+'" r="11" fill="transparent"/><circle cx="'+X+'" cy="'+Y+'" r="'+(sel===id?6:4.2)+'" fill="'+se.color+'" stroke="var(--bg)" stroke-width="1.5"/>'+
          '<text x="'+(X+(si%2?-7:7))+'" y="'+(Y+(si%2?13:-6))+'" text-anchor="'+(si%2?'end':'start')+'" font-size="10.5" fill="'+se.color+'">'+p.lab+'</text></g>'})});
    const U=[F.sx(C.union[0]),F.sy(C.union[1])];
    s+='<g class="frp" data-id="u" style="cursor:pointer"><circle cx="'+U[0]+'" cy="'+U[1]+'" r="11" fill="transparent"/><path d="M'+U[0]+','+(U[1]-7)+'l2,5 5.5,.5 -4,3.6 1.3,5.4 -4.8,-2.8 -4.8,2.8 1.3,-5.4 -4,-3.6 5.5,-.5z" fill="var(--c3)"/><text x="'+(U[0]>F.W-110?U[0]+4:U[0]+9)+'" y="'+(U[0]>F.W-110?U[1]-11:U[1]+4)+'" text-anchor="'+(U[0]>F.W-110?'end':'start')+'" font-size="10.5" fill="var(--c3)">retrained on both</text></g>';
    pts.push(['u',{info:'<b>Retrained from scratch on both datasets</b> (the union): '+C.yl+' '+f(C.union[1])+', new data '+f(C.union[0])+'. The target the continued model is trying to match without paying for a full retrain.'}]);
    if(C.scratch){const Q=[F.sx(C.scratch[0]),F.sy(C.scratch[1])];if(C.scratch[1]<=yr[1]){
      s+='<g class="frp" data-id="n" style="cursor:pointer"><circle cx="'+Q[0]+'" cy="'+Q[1]+'" r="11" fill="transparent"/><rect x="'+(Q[0]-4.5)+'" y="'+(Q[1]-4.5)+'" width="9" height="9" transform="rotate(45 '+Q[0]+' '+Q[1]+')" fill="var(--mute)"/><text x="'+(Q[0]-8)+'" y="'+(Q[1]+4)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">new data only</text></g>';
      pts.push(['n',{info:'<b>Trained from scratch on the new data only</b>: Pile '+f(C.scratch[1])+', new data '+f(C.scratch[0])+'.'}])}}
    plot.innerHTML=s+F.close();
    lg.innerHTML=C.ser.map(se=>'<span><i style="background:'+se.color+'"></i>'+se.name+'</span>').join('')+'<span><i style="background:var(--c3)"></i>retrained on both</span>';
    const map=Object.fromEntries(pts);
    plot.querySelectorAll('.frp').forEach(g=>{const show=()=>{sel=g.dataset.id;det.innerHTML=map[sel].info};g.addEventListener('mouseenter',show);g.addEventListener('click',()=>{show();draw()})});
    if(sel&&map[sel])det.innerHTML=map[sel].info;
    note.innerHTML=C.note.replace('%T2%','<a href="https://arxiv.org/html/2403.08763v4#S6.T2" target="_blank" rel="noopener noreferrer">Table 2</a>, <a href="https://arxiv.org/html/2403.08763v4#S6.T4" target="_blank" rel="noopener noreferrer">Table 4</a> and <a href="https://arxiv.org/html/2403.08763v4#A1.T12" target="_blank" rel="noopener noreferrer">Table 12</a>');
    RD.tabLinks(note)}
  document.querySelectorAll('#frSet button').forEach(b=>b.addEventListener('click',()=>{
    if(b.dataset.s==='toy'&&!T)return;
    document.querySelectorAll('#frSet button').forEach(x=>x.classList.toggle('on',x===b));set=b.dataset.s;sel=null;det.innerHTML='Tap or hover a point.';draw()}));
  RD.onRender(draw);addEventListener('resize',draw);draw();
})();
