// ---- Reading 5: softmax then matmul (attention), unfused against fused, bytes moved to scale; and the M1 measurement table ----
(function(){
  if(!window.RD||!window.RDC)return;
  const fig=document.getElementById('rd-fu-fig');if(!fig)return;
  const nS=document.getElementById('rd-fu-n'),dS=document.getElementById('rd-fu-d'),hS=document.getElementById('rd-fu-bh');
  const b=2,BW=3.35e12,PK=989.5e12;let mode='unf',an;
  // per step: tensors read (r) and written (w); sizes in bytes from the controls
  const ST={unf:[
      {r:['Q','K'],w:['S']},
      {r:['S'],w:['P']},
      {r:['P','V'],w:['O']},
      {r:[],w:[]}],
    fus:[
      {r:['Q'],w:[]},
      {r:['K'],w:[]},
      {r:['V'],w:[]},
      {r:[],w:['O']}]};
  function sizes(){const N=+nS.value,d=+dS.value,BH=+hS.value;return {N,d,BH,Q:BH*N*d*b,K:BH*N*d*b,V:BH*N*d*b,O:BH*N*d*b,S:BH*N*N*b,P:BH*N*N*b}}
  const col={Q:'var(--c1)',K:'var(--c6)',V:'var(--c3)',O:'var(--c4)',S:'var(--c2)',P:'var(--c5)'};
  const fmtB=x=>x>=1e9?(x/1e9).toFixed(2)+' GB':(x/1e6).toFixed(1)+' MB';
  function draw(i){
    const z=sizes(),W=RD.width(fig),S=ST[mode],st=S[i];let s='';
    const names=['Q','K','V','S','P','O'],tot=names.reduce((a,n)=>a+z[n],0),avail=W-12-5*4;
    // keep tiny tensors visible: minimum 14 px
    let w={};names.forEach(n=>w[n]=Math.max(14,avail*z[n]/tot));const sc=avail/names.reduce((a,n)=>a+w[n],0);names.forEach(n=>w[n]*=sc);
    const yH=92,hH=26;
    s+='<rect x="2" y="6" width="'+(W-4)+'" height="40" rx="6" fill="none" stroke="var(--c4)" stroke-dasharray="4 3"/>'+RD.t(10,20,'on chip: registers and shared memory',{fs:10.5,fill:'var(--mute)'});
    if(mode==='fus'&&i>=1&&i<=2)s+=RD.t(10,38,'block of S, running m and d, O accumulator (never leave the chip)',{fs:10.5,w:600});
    if(mode==='unf'&&i<3)s+=RD.t(10,38,'kernel '+(i+1)+' streams through, keeps nothing between kernels',{fs:10.5,w:600});
    s+=RD.t(4,yH-8,'HBM (to scale in bytes)',{fs:10.5,fill:'var(--mute)'});
    let x=6;const done={};S.slice(0,i+1).forEach(t=>{t.r.concat(t.w).forEach(n=>done[n]=1)});
    names.forEach(n=>{const never=mode==='fus'&&(n==='S'||n==='P');const rd=st.r.includes(n),wr=st.w.includes(n);
      const exists=n==='Q'||n==='K'||n==='V'||done[n];
      s+='<rect x="'+x.toFixed(1)+'" y="'+yH+'" width="'+(w[n]-1).toFixed(1)+'" height="'+hH+'" rx="3" fill="'+(never?'none':col[n])+'" fill-opacity="'+(never?0:exists?0.85:0.15)+'" stroke="'+(rd?'var(--acc)':wr?'var(--bad)':never?'var(--mute)':'none')+'" stroke-width="'+(rd||wr?2.5:1)+'"'+(never?' stroke-dasharray="3 3"':'')+'/>';
      if(w[n]>12)s+=RD.t(x+w[n]/2,yH+17,n,{a:'middle',fs:11,w:600,fill:never?'var(--mute)':'var(--bg)'});
      if(rd||wr){const xm=x+w[n]/2;s+='<line x1="'+xm.toFixed(1)+'" y1="'+(rd?yH-2:48)+'" x2="'+xm.toFixed(1)+'" y2="'+(rd?50:yH-3)+'" stroke="'+(rd?'var(--acc)':'var(--bad)')+'" stroke-width="2" marker-end="url(#rdfuA'+(rd?'r':'w')+')"/>'}
      x+=w[n]+4;});
    s+=RD.t(4,yH+hH+14,mode==='fus'?'S and P (dashed): never stored':'blue arrow: read; orange: write',{fs:10.5,fill:'var(--mute)'});
    const defs='<defs><marker id="rdfuAr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--acc)"/></marker><marker id="rdfuAw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--bad)"/></marker></defs>';
    fig.innerHTML=RD.svg(W,yH+hH+22,defs+s,'Attention data movement between HBM and the chip');
    let moved=0;S.slice(0,i+1).forEach(t=>t.r.concat(t.w).forEach(n=>moved+=z[n]));
    const fl=4*z.BH*z.N*z.N*z.d,tc=fl/PK*1e3,tm=moved/BW*1e3;
    const allU=ST.unf.reduce((a,t)=>a+t.r.concat(t.w).reduce((c,n)=>c+z[n],0),0),allF=ST.fus.reduce((a,t)=>a+t.r.concat(t.w).reduce((c,n)=>c+z[n],0),0);
    document.getElementById('rd-fu-cnt').innerHTML=RD.stat('HBM traffic so far',fmtB(moved))+RD.stat('Extra memory for S and P',mode==='unf'?fmtB(z.S+z.P):'0','unfused needs it all at once')+
      RD.stat('Memory time (H100)',tm.toFixed(3)+' ms','so far')+RD.stat('Compute time (H100)',tc.toFixed(3)+' ms','whole attention, both modes')+
      RD.stat('Bound, unfused / fused',(Math.max(allU/BW*1e3,tc)/Math.max(allF/BW*1e3,tc)).toFixed(1)+'x',(allU/allF).toFixed(0)+'x fewer bytes fused');
  }
  // the step list on the left explains each step; the other version's list is hidden
  const LI={unf:'sx-fu-unf',fus:'sx-fu-fus'};
  const showList=()=>Object.keys(LI).forEach(k=>{const l=document.getElementById(LI[k]);if(l){l.hidden=k!==mode;l.previousElementSibling.hidden=k!==mode}});
  RD.seg(document.getElementById('rd-fu-mode'),m=>{mode=m;showList();an.reset(4,LI[mode])});
  showList();
  an=RD.anim({card:'rd-fu-card',ctl:'rd-fu-ctl',n:4,draw,ms:4200,label:'Attention step',list:LI.unf});
  [nS,dS,hS].forEach(e=>e.addEventListener('change',()=>an.redraw()));
  RD.onResize(()=>an.redraw());
  // M1 measured table
  const tb=document.getElementById('rd-att-body');
  if(tb)tb.innerHTML=RDC.attention.map(a=>'<tr><td class="num">'+a.N.toLocaleString('en-US')+'</td><td class="num">'+a.unfused_ms.toFixed(2)+'</td><td class="num">'+a.fused_ms.toFixed(2)+'</td><td class="num"><b>'+a.speedup.toFixed(2)+'x</b></td><td class="small mute">'+a.unfused_runs.map(x=>x.toFixed(2)).join(', ')+' / '+a.fused_runs.map(x=>x.toFixed(2)).join(', ')+'</td></tr>').join('');
})();
