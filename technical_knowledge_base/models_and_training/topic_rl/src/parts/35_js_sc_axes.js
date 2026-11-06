// ---- Scene: the 47 atlas methods on the three axes, Method atlas tab (renderer v2) ----
// Driven by window.ATLAS (src/data/atlas.json): across, whose data a method learns from (cells.data); in depth, what it stores (cells.store);
// the colour is the third axis, the model (cells.model). One block per method, stacked oldest first; each step lights the cells it is about.
(function(){
  if(!document.getElementById('stg-axes')||!window.ATLAS)return;const {at,off,lerp,mix}=S3,A=window.ATLAS;
  const DX=['plan','on','off','self','offline'],DN=['planning','on-policy','off-policy','self-play','offline'];
  const SZ=['value','ac','policy'],SN=['value','actor-critic','policy'];
  const X=i=>(i-2)*1.75,Z=j=>(j-1)*1.5,BH=.2,BW=.66;
  const yr=r=>+String(r.date||'0').slice(0,4);
  const cells={};A.rows.forEach(r=>{const k=r.cells.data.f+'|'+r.cells.store.f;(cells[k]=cells[k]||[]).push(r)});
  Object.values(cells).forEach(v=>v.sort((a,b)=>yr(a)-yr(b)));
  // which cells each step is about (step 1 and the last: all)
  const FOCUS=[null,['on|policy','on|ac','on|value'],['off|value','off|ac'],'model',['offline|policy','offline|value','offline|ac'],'empty'];
  const lit=(k,key,r)=>{const f=FOCUS[k];if(!f||f==='empty')return true;if(f==='model')return r?r.cells.model.f!=='free':false;return f.indexOf(key)>=0};
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-5.2,5.2,-2.6,2.9,.5);
    const MC={free:P.paper,given:mix(P.paper,P.c5,.75),learned:mix(P.paper,P.c4,.7)};
    // the cell floor tiles
    DX.forEach((d,i)=>SZ.forEach((s,j)=>{const key=d+'|'+s,has=!!cells[key],emp=k===5&&!has;
      R.quad([[X(i)-.7,.003,Z(j)-.58],[X(i)+.7,.003,Z(j)-.58],[X(i)+.7,.003,Z(j)+.58],[X(i)-.7,.003,Z(j)+.58]],{fill:emp?mix(P.paper,P.bad,.25):has?mix(P.paper,P.acc,.08):false,ec:emp?P.bad:P.line,dash:has?null:[5,4],ea:emp?.9:.7,a:emp?Math.max(.4,e):1})}));
    // the blocks
    Object.entries(cells).forEach(([key,rs])=>{const [d,s]=key.split('|'),i=DX.indexOf(d),j=SZ.indexOf(s),x=X(i),z=Z(j),cl=lit(k,key);
      rs.forEach((r,n)=>{const on=lit(k,key,r),a=on?1:.22,y=n*BH;
        R.box([x,y,z],[BW,BH*.92,BW],{fill:MC[r.cells.model.f]||P.paper,a:(k===0?Math.min(1,e*1.5+n*.02):1)*a,shadow:n===0,lw:.7});
        // names: only for the few blocks a step is about
        if((k===3&&r.cells.model.f!=='free')||(k===4&&d==='offline'))R.label([x+BW/2,y+BH*.45,z],r.short,{al:'left',dx:6,fs:12,b:1,c:P.ink,a:on?Math.min(1,e*1.4):0,grp:'n'+key})});
      if(cl||k===0)R.label([x,rs.length*BH,z],String(rs.length),{mono:true,fs:13,b:1,dy:-11,c:P.acc,a:cl?1:.4})});
    // axes labels
    DX.forEach((d,i)=>R.label([X(i),0,Z(2)+.75],DN[i],{fs:12.5,b:1,dy:12,c:P.ink}));
    SZ.forEach((s,j)=>R.label([X(0)-.85,0,Z(j)],SN[j],{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'row'}));
  }
  const full={cam:[.16,.86],bounds:[[-4.6,0,-2.2],[4.6,2.1,2.6]]};
  S3.stage({id:'stg-axes',list:'sx-axes',fig:'Fig. 4 · 47 methods on three axes',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1300,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[16,16,14,40]});
})();
