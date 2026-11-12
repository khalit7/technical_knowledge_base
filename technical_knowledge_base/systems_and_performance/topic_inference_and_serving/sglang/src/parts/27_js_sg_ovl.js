// ---- Reading section 5: plain loop against overlap loop, five decode steps on a CPU lane and a GPU lane. Four frames per mode
// (decode steps 1, 2, 3, then all five), explained by the step lists sx-ovl-normal and sx-ovl-overlap; the toggle swaps the list and replays ----
(function(){
  const card=document.getElementById('sg-ovl-card');if(!card)return;
  const f=5,c=1.5;  // illustrative durations, stated in the card's caption (the M1 overlap runs crashed)
  const N=5;
  function events(mode){const ev=[];let t=0;
    if(mode==='normal'){for(let k=1;k<=N;k++){ev.push({lane:'cpu',s:t,e:t+c/2,k:k,what:'schedule '+k});t+=c/2;ev.push({lane:'gpu',s:t,e:t+f,k:k,what:'forward '+k});t+=f;ev.push({lane:'cpu',s:t,e:t+c/2,k:k,what:'results '+k});t+=c/2}}
    else{let g=c/2;ev.push({lane:'cpu',s:0,e:c/2,k:1,what:'schedule 1'});
      for(let k=1;k<=N;k++){const gs=g;ev.push({lane:'gpu',s:gs,e:gs+f,k:k,what:'forward '+k});
        // while forward k runs: results of k-1 and scheduling of k+1 on the CPU
        const cs=gs;const cw=(k>1?c/2:0)+(k<N?c/2:0);if(cw>0)ev.push({lane:'cpu',s:cs,e:cs+cw,k:k,what:(k>1?'results '+(k-1):'')+(k>1&&k<N?' + ':'')+(k<N?'schedule '+(k+1):'')});
        g=Math.max(gs+f,cs+cw)}
      ev.push({lane:'cpu',s:g,e:g+c/2,k:N,what:'results '+N})}
    return ev}
  const EV={normal:events('normal'),overlap:events('overlap')};let mode='normal';
  const svgEl=document.getElementById('sg-ovl-svg'),cntEl=document.getElementById('sg-ovl-cnt'),UPTO=[1,2,3,5],LIST={normal:'sx-ovl-normal',overlap:'sx-ovl-overlap'};
  const tmax=Math.max(...EV.normal.map(e=>e.e));
  function draw(i){const ev=EV[mode],shown=ev.filter(e=>e.k<=UPTO[i]),w=RD.width(svgEl),x0=40,u=(w-x0-8)/tmax,h=96;let b='';
    b+=RD.t(2,30,'CPU',{fs:11,fill:'var(--mute)'})+RD.t(2,68,'GPU',{fs:11,fill:'var(--mute)'});
    b+='<line x1="'+x0+'" x2="'+(w-6)+'" y1="86" y2="86" stroke="var(--line)"/>';
    for(let t=0;t<=tmax+0.01;t+=Math.max(1,Math.round(tmax/8))){const xx=x0+t*u;if(xx>w-18)break;b+=RD.t(xx,96,t+' ms',{fs:9,fill:'var(--mute)',a:'middle'})}
    shown.forEach((e,j)=>{const y=e.lane==='cpu'?16:52,x=x0+e.s*u,ww=Math.max(1.5,(e.e-e.s)*u-1),last=j===shown.length-1;
      b+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+ww.toFixed(1)+'" height="24" rx="3" fill="'+(e.lane==='gpu'?'var(--acc)':'var(--c5)')+'" opacity="'+(last?1:0.75)+'"><title>'+e.what+'</title></rect>';
      if(e.lane==='gpu'&&ww>14)b+=RD.t(x+ww/2,y+16,String(e.k),{fs:11,fill:'var(--bg)',a:'middle',w:600})});
    svgEl.innerHTML=RD.svg(w,h,b,'CPU and GPU timelines for five decode steps');
    const e=shown[shown.length-1],end=Math.max(...shown.map(x=>x.e)),gpu=shown.filter(x=>x.lane==='gpu').reduce((s,x)=>s+(x.e-x.s),0);
    const done=shown.filter(x=>x.lane==='gpu').length;
    cntEl.innerHTML=RD.stat('Elapsed',end.toFixed(1)+' ms')+RD.stat('Steps launched',done+' of '+N)+RD.stat('GPU busy',(100*gpu/end).toFixed(0)+'%')+RD.stat('Per step, steady state',(mode==='normal'?(f+c):Math.max(f,c)).toFixed(2)+' ms')}
  const A=RD.anim({card:'sg-ovl-card',ctl:'sg-ovl-ctl',n:UPTO.length,draw:draw,ms:4200,label:'Decode step',list:LIST.normal});
  RD.seg(document.getElementById('sg-ovl-mode'),m=>{mode=m;Object.values(LIST).forEach(id=>{document.getElementById(id).hidden=id!==LIST[m]});A.reset(UPTO.length,LIST[m])});
  RD.onResize(()=>A.redraw());
})();
