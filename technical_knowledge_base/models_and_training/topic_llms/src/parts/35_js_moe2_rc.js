// ---- One token through a router: softmax against sigmoid on the same logits, plus dilution as experts are added ----
(function(){
  const MOE=window.MOE;if(!MOE)return;const {$,onTab,fmt,fmtBytes,svgEl,bx,stat,A,logFrame,sup}=MOE;
  if(!$('moeRc'))return;
  const st={s:[2.0,1.0,0.5,-1.0],k:2,x:0};
  const X=[0,4,12,60,252];
  let h='';st.s.forEach((v,i)=>{h+='<label>Expert '+(i+1)+' logit <b id="moeRcV'+i+'"></b><input type="range" id="moeRcS'+i+'" min="-3" max="3" step="0.1" value="'+v+'"></label>'});
  h+='<label>Experts kept per token<br><select id="moeRcK"><option value="1">top-1</option><option value="2" selected>top-2</option><option value="3">top-3</option></select></label>';
  h+='<label>Add experts with logit 0 <b id="moeRcXv"></b><input type="range" id="moeRcX" min="0" max="4" step="1" value="0"></label>';
  $('moeRcCtl').innerHTML=h;
  function calc(){const extra=X[st.x],N=4+extra,s=st.s;
    const mx=Math.max(...s,0),Z=s.reduce((a,v)=>a+Math.exp(v-mx),0)+extra*Math.exp(-mx);
    const p=s.map(v=>Math.exp(v-mx)/Z),sg=s.map(v=>1/(1+Math.exp(-v)));
    const ord=[0,1,2,3].sort((a,b)=>s[b]-s[a]||a-b);let top=ord.slice(0,st.k);
    // with extra zero-logit experts, a zero can outrank a negative logit; keep the four drawn experts plus "others"
    const zeroBeats=extra>0?top.filter(i=>s[i]<0):[];
    const sp=top.reduce((a,i)=>a+p[i],0),ss=top.reduce((a,i)=>a+sg[i],0);
    return {N,p,sg,top,zeroBeats,gs:top.map(i=>p[i]/sp),gg:top.map(i=>sg[i]/ss),pOther:extra*Math.exp(-mx)/Z}}
  function draw(){const r=calc();st.s.forEach((v,i)=>$('moeRcV'+i).textContent=v.toFixed(1));$('moeRcXv').textContent=X[st.x]?'+'+X[st.x]+' ('+r.N+' in all)':'none (4 in all)';
    const W=Math.max(320,Math.min(720,$('moeRcSvg').clientWidth||680)),nar=W<520,H=nar?234:204,pl=34,pt=26,pb=26,gw=(W-pl-10)/2,ch=H-pt-pb;let s='';
    const cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
    [['Softmax p and gate g',r.p,r.gs],['Sigmoid σ and gate g',r.sg,r.gg]].forEach(([ti,v,g],j)=>{const x0=pl+j*gw,bw=(gw-24)/4;
      s+='<text x="'+(x0+gw/2-6)+'" y="14" font-size="11.5" text-anchor="middle" font-weight="600">'+ti+'</text>';
      [0,0.5,1].forEach(t=>{const y=pt+ch*(1-t);s+='<line x1="'+x0+'" x2="'+(x0+gw-16)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+(j===0?'<text x="'+(pl-4)+'" y="'+(y+4)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+t+'</text>':'')});
      for(let i=0;i<4;i++){const x=x0+4+i*bw,on=r.top.includes(i),gi=r.top.indexOf(i);
        s+='<rect x="'+x+'" y="'+(pt+ch*(1-v[i]))+'" width="'+(bw/2-3)+'" height="'+(ch*v[i])+'" fill="'+cols[i]+'" fill-opacity="'+(on?0.95:0.3)+'"><title>score '+v[i].toFixed(3)+'</title></rect>';
        if(on)s+='<rect x="'+(x+bw/2-2)+'" y="'+(pt+ch*(1-g[gi]))+'" width="'+(bw/2-3)+'" height="'+(ch*g[gi])+'" fill="none" stroke="'+cols[i]+'" stroke-width="2"><title>gate '+g[gi].toFixed(3)+'</title></rect><text x="'+(x+bw*0.75-2)+'" y="'+(pt+ch*(1-g[gi])-4)+'" font-size="10" text-anchor="middle">'+g[gi].toFixed(2)+'</text>';
        s+='<text x="'+(x+bw/2-2)+'" y="'+(H-pb+14)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">E'+(i+1)+(on?' ✓':'')+'</text>'}});
    $('moeRcSvg').innerHTML=svgEl(W,H,s,'Softmax and sigmoid scores and gates for four experts')+'<p class="q" style="margin:4px 0 0">Filled bar: score before selection. Outlined bar: gate after top-'+st.k+' renormalisation. ✓ selected.</p>';
    const ratio=(a)=>a.length>1?(a[0]/a[1]).toFixed(2)+' : 1':'1';
    $('moeRcOut').innerHTML=stat('Selected',r.top.map(i=>'E'+(i+1)).join(' + '),'same under both rules')+stat('Softmax gates',r.gs.map(v=>v.toFixed(3)).join(', '),'ratio '+ratio(r.gs))+stat('Sigmoid gates',r.gg.map(v=>v.toFixed(3)).join(', '),'ratio '+ratio(r.gg))+
      stat('E1 score, '+r.N+' experts','p = '+r.p[0].toFixed(3)+', σ = '+r.sg[0].toFixed(3),X[st.x]?'softmax diluted by '+X[st.x]+' extra experts; sigmoid unchanged':'add experts to see the softmax share shrink')+
      (r.zeroBeats.length?'<p class="q" style="flex-basis:100%">Note: an added expert with logit 0 now outscores E'+r.zeroBeats.map(i=>i+1).join(' and E')+'; the chart keeps the four drawn experts for clarity.</p>':'');
    $('moeRcRep').innerHTML='Defaults reproduce this tab\'s worked example <b>by construction</b> (the logits are illustrative): softmax p = (0.609, 0.224, 0.136, 0.030), gates 0.731 and 0.269; sigmoid σ = (0.881, 0.731, 0.622, 0.269), gates 0.546 and 0.454. Renormalised softmax gates equal a softmax over the selected logits alone, as in Mixtral\'s Softmax(TopK(x · W<sub>g</sub>)).'}
  st.s.forEach((v,i)=>$('moeRcS'+i).addEventListener('input',e=>{st.s[i]=+e.target.value;draw()}));
  $('moeRcK').addEventListener('change',e=>{st.k=+e.target.value;draw()});
  $('moeRcX').addEventListener('input',e=>{st.x=+e.target.value;draw()});
  let lw=0;addEventListener('resize',()=>{const w=$('moeRcSvg').clientWidth;if(w&&Math.abs(w-lw)>30){lw=w;draw()}});
  onTab(()=>{lw=$('moeRcSvg').clientWidth;draw()});
})();
