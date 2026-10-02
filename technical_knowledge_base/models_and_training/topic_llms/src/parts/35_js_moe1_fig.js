// ---- Static figures: the MoE layer, and expert parallelism's two all-to-alls. Drawn at the card's own width so text keeps its size ----
(function(){
  const MOE=window.MOE;if(!MOE)return;const {$,onTab,fmt,fmtBytes,svgEl,bx,stat,A,logFrame,sup}=MOE;
  const T=(x,y,s,o)=>'<text x="'+x+'" y="'+y+'" font-size="'+((o&&o.fs)||12)+'"'+(o&&o.a?' text-anchor="'+o.a+'"':' text-anchor="middle"')+(o&&o.c?' fill="'+o.c+'"':'')+(o&&o.w?' font-weight="600"':'')+'>'+s+'</text>';
  const R=(x,y,w,h,cls,extra)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" class="'+cls+'"'+(extra||'')+'/>';
  const L=(x1,y1,x2,y2,col,wd,dash,mk)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(col||'var(--mute)')+'" stroke-width="'+(wd||1.4)+'"'+(dash?' stroke-dasharray="4 3"':'')+(mk===false?'':' marker-end="MARK"')+'/>';
  function layer(){const card=$('moeLayerFig');if(!card)return;const W=Math.max(320,Math.min(760,card.clientWidth-28)),nar=W<560;
    const g=[0.731,0.269],pick=[0,2];let s='';
    if(!nar){const H=300,x0=10,ex=W*0.52,ew=W*0.2;
      s+=R(x0,120,W*0.13,52,'box')+T(x0+W*0.065,142,'token state')+T(x0+W*0.065,158,'<tspan font-style="italic" font-weight="600">h</tspan>',{c:'var(--mute)'});
      const rx=W*0.19;s+=R(rx,120,W*0.14,52,'boxa')+T(rx+W*0.07,142,'router')+T(rx+W*0.07,158,'s = W<tspan baseline-shift="sub" font-size="9">r</tspan>h, top-2',{fs:11,c:'var(--mute)'});
      s+=L(x0+W*0.13,146,rx-3,146);
      const ys=[14,50,86,122,158,194];const names=['E1','E2','E3','E4','…','E<tspan font-style="italic">N</tspan>'];
      ys.forEach((y,i)=>{const on=pick.includes(i);s+=R(ex,y,ew,28,on?'boxa':'boxo')+T(ex+ew/2,y+18,names[i]+(on?'  g = '+g[pick.indexOf(i)].toFixed(2):(i===4?'':'  skipped')),{fs:11.5,c:on?null:'var(--mute)'});
        s+=L(rx+W*0.14,146,ex-3,y+14,on?'var(--acc)':'var(--dim)',on?1.8:1,!on,on)});
      s+=R(ex,240,ew,30,'boxc')+T(ex+ew/2,259,'shared expert, every token',{fs:11.5});
      s+=L(x0+W*0.065,172,x0+W*0.065,255,'var(--good)',1.4,false,false)+L(x0+W*0.065,255,ex-3,255,'var(--good)',1.4);
      const cx=W*0.8;s+='<circle cx="'+cx+'" cy="146" r="16" class="boxa"/>'+T(cx,151,'Σ',{fs:15});
      [0,2].forEach(i=>s+=L(ex+ew,ys[i]+14,cx-16,146,'var(--acc)',1.6));s+=L(ex+ew,255,cx-12,158,'var(--good)',1.4);
      s+='<circle cx="'+(W*0.9)+'" cy="146" r="12" class="box"/>'+T(W*0.9,151,'+',{fs:15});s+=L(cx+16,146,W*0.9-13,146);
      s+='<path d="M'+(x0+W*0.065)+' 120 V100 Q'+(x0+W*0.065)+' 92 '+(x0+W*0.08)+' 92 H'+(W*0.9-6)+' Q'+(W*0.9)+' 92 '+(W*0.9)+' 100 V132" fill="none" stroke="var(--mute)" stroke-width="1.3" stroke-dasharray="5 3" marker-end="MARK"/>';
      s+=T(W*0.36,86,'residual stream: h passes around the FFN',{fs:11,c:'var(--mute)'});
      s+=L(W*0.9+12,146,W-14,146)+T(W-8,170,'y',{fs:13,a:'end',w:1});
      s+=T(ex+ew/2,290,'routed experts: only the top k run',{fs:11,c:'var(--mute)'});
      card.innerHTML=svgEl(W,H,s,'An MoE layer: the router scores the experts, the top two run, a shared expert always runs, and their weighted sum is added to the residual stream')}
    else{const H=470,cx=W/2;
      s+=R(cx-70,8,140,40,'box')+T(cx,25,'token state h')+T(cx,40,'from attention',{fs:10.5,c:'var(--mute)'});
      s+=R(cx-70,72,140,40,'boxa')+T(cx,89,'router')+T(cx,104,'scores, keeps top 2',{fs:10.5,c:'var(--mute)'});s+=L(cx,48,cx,69);
      const cols=[0,1,2,3],ew=(W-40)/4-6;['E1','E2','E3','E4'].forEach((n,i)=>{const x=20+i*((W-40)/4),on=pick.includes(i);
        s+=R(x,150,ew,44,on?'boxa':'boxo')+T(x+ew/2,168,n,{fs:12})+T(x+ew/2,184,on?'g = '+g[pick.indexOf(i)].toFixed(2):'skipped',{fs:10.5,c:on?null:'var(--mute)'});
        s+=L(cx,112,x+ew/2,147,on?'var(--acc)':'var(--dim)',on?1.8:1,!on,on)});
      s+=T(cx,214,'… up to E<tspan font-style="italic">N</tspan>; only the top k run',{fs:10.5,c:'var(--mute)'});
      s+=R(cx-90,232,180,36,'boxc')+T(cx,255,'shared expert, every token',{fs:11.5});
      s+='<path d="M'+(cx-70)+' 28 H10 V250 H'+(cx-93)+'" fill="none" stroke="var(--good)" stroke-width="1.3" marker-end="MARK"/>';
      s+='<circle cx="'+cx+'" cy="320" r="16" class="boxa"/>'+T(cx,325,'Σ',{fs:15});
      [0,2].forEach(i=>{const x=20+i*((W-40)/4)+ew/2;s+=L(x,194,cx-8,306,'var(--acc)',1.6)});s+=L(cx,268,cx,302,'var(--good)',1.4);
      s+='<circle cx="'+cx+'" cy="384" r="12" class="box"/>'+T(cx,389,'+',{fs:15});s+=L(cx,336,cx,370);
      s+='<path d="M'+(cx+70)+' 28 H'+(W-10)+' V384 H'+(cx+15)+'" fill="none" stroke="var(--mute)" stroke-width="1.3" stroke-dasharray="5 3" marker-end="MARK"/>';
      s+=T(W-14,140,'residual',{fs:10.5,a:'end',c:'var(--mute)'});
      s+=L(cx,396,cx,440)+T(cx+14,452,'y',{fs:13,a:'start',w:1});
      card.innerHTML=svgEl(W,H,s,'An MoE layer, vertical: router, top two experts, shared expert, weighted sum, residual add')}
    card.insertAdjacentHTML('beforeend','<p class="q" style="margin:4px 0 0">One token through one MoE layer, with the gate weights of the router example below (top-2 of softmax gates). Attention, normalisation and the residual stream are untouched; only the FFN became a choice.</p>')}
  function ep(){const card=$('moeEpFig');if(!card)return;const W=Math.max(320,Math.min(760,card.clientWidth-28)),nar=W<560;
    const G=4,gw=(W-20)/G,H=nar?286:256;let s='';
    // token home ranks and their chosen experts (2 experts per GPU, top-2): illustrative
    const tok=[[0,[0,5]],[1,[2,3]],[2,[1,6]],[3,[7,4]]];const col=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
    for(let gI=0;gI<G;gI++){const x=10+gI*gw;s+='<rect x="'+(x+3)+'" y="22" width="'+(gw-6)+'" height="'+(H-46)+'" rx="8" fill="var(--soft)" stroke="var(--line)"/>';
      s+=T(x+gw/2,16,'GPU '+(gI+1)+(gI<2?' · node 1':' · node 2'),{fs:nar?10:11,c:'var(--mute)'});
      [0,1].forEach(j=>{const e=gI*2+j,ex=x+8+j*(gw-16)/2,ew=(gw-16)/2-4;s+=R(ex,nar?132:118,ew,34,'box')+T(ex+ew/2,(nar?132:118)+21,'E'+(e+1),{fs:11})})}
    const yT=44,yE=nar?132:118,yO=H-48;
    tok.forEach(([home,ex],i)=>{const x=10+home*gw+gw/2;s+='<rect x="'+(x-9)+'" y="'+yT+'" width="18" height="18" rx="3" fill="'+col[i]+'"/>';
      ex.forEach(e=>{const gI=Math.floor(e/2),j=e%2,tx=10+gI*gw+8+j*(gw-16)/2+((gw-16)/2-4)/2;s+=L(x,yT+19,tx,yE-3,col[i],1.4,false)});
      s+='<rect x="'+(x-9)+'" y="'+yO+'" width="18" height="18" rx="3" fill="'+col[i]+'" fill-opacity=".45" stroke="'+col[i]+'"/>';
      ex.forEach(e=>{const gI=Math.floor(e/2),j=e%2,tx=10+gI*gw+8+j*(gw-16)/2+((gw-16)/2-4)/2;s+=L(tx,yE+35,x,yO-3,col[i],1.2,true)})});
    s+=T(W/2,yT+(yE-yT)/2+12,'dispatch all-to-all',{fs:11,w:1});s+=T(W/2,yE+35+(yO-yE-35)/2+4,'combine all-to-all',{fs:11,w:1});
    card.innerHTML=svgEl(W,H,s,'Expert parallelism: four GPUs with two experts each; tokens are dispatched to their experts and the outputs combined back on the home GPU')+'<p class="q" style="margin:4px 0 0">Each token (a square on its home GPU) goes to its 2 experts and its weighted outputs come back. Illustrative placement: 8 experts over 4 GPUs on 2 nodes, top-2. Cross-node arrows are the expensive ones, which is what node-limited routing caps.</p>'}
  let lw=0;const draw=()=>{layer();ep()};
  draw();addEventListener('resize',()=>{const c=$('moeLayerFig');if(c&&Math.abs(c.clientWidth-lw)>30){lw=c.clientWidth;draw()}});lw=($('moeLayerFig')||{}).clientWidth||0;
  onTab(draw);
})();
