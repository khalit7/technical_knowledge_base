// ---- Reading: z-loss on real logits: shift every logit by c; CE stays, z-loss and bf16 damage move ----
(function(){
  const card=document.getElementById('zl-card');if(!card)return;
  const $=id=>document.getElementById(id),D=LD.logits,COL=['var(--c1)','var(--c2)','var(--c3)'];
  const short=n=>n.split('/')[1];
  let k=12;
  function draw(){
    const c=D.offsets[k];$('zl-cv').textContent=(c>0?'+':'')+c;
    const lines=D.models.map((m,i)=>({xs:D.offsets,ys:m.bf16_tv_by_offset.map(v=>100*v),c:COL[i]}));
    const pts=D.models.map((m,i)=>({x:c,y:100*m.bf16_tv_by_offset[k],r:5,c:COL[i],stroke:'var(--bg)'}));
    const segs=[{x1:c,y1:0,x2:c,y2:7,c:'var(--mute)',w:1,dash:'3 3'}];
    const txt=D.models.map((m,i)=>({x:Math.max(-96,Math.min(96,-m.mean_logZ)),y:6.7-0.9*i,s:'−log Z',c:COL[i],a:'middle'}));
    D.models.forEach((m,i)=>{const x=-m.mean_logZ;if(x>=-96&&x<=96)segs.push({x1:x,y1:0,x2:x,y2:6.4-0.9*i,c:COL[i],w:1,dash:'2 3'})});
    PL.chart({el:$('zl-svg'),id:'zl',x:[-96,96],y:[0,7],lines,pts,segs,txt,xl:'shift c added to every logit',yl:'bf16 damage, % of mass',label:'Probability mass moved by bf16 storage against the logit shift'});
    let h='<tr><th>Model</th><th class="num">mean log Z</th><th class="num">cross entropy</th><th class="num">z-loss, 10<sup>−4</sup>·log²Z</th><th class="num">bf16 damage</th></tr>';
    D.models.forEach((m,i)=>{const zs=m.logZ_per_token;let s=0;zs.forEach(z=>{s+=(z+c)*(z+c)});const zl=1e-4*s/zs.length;
      h+='<tr><td><span class="sw" style="background:'+COL[i]+'"></span>'+short(m.name)+'</td><td class="num">'+(m.mean_logZ+c).toFixed(1)+'</td><td class="num">'+m.mean_ce.toFixed(3)+'</td><td class="num">'+zl.toFixed(4)+'</td><td class="num">'+(100*m.bf16_tv_by_offset[k]).toFixed(2)+'%</td></tr>'});
    $('zl-tbl').innerHTML=h+'<tr><td colspan="5" class="small mute">Cross entropy is the same at every shift (the softmax ignores c); z-loss is the mean over tokens of 10<sup>−4</sup>(log Z + c)<sup>2</sup>; bf16 damage is the mean total-variation distance between the softmax of bf16-rounded and float32 logits, measured at shifts of 8.</td></tr>';
  }
  $('zl-c').addEventListener('input',e=>{k=+e.target.value;draw()});
  RD.onRender(draw);draw();addEventListener('resize',()=>{if(card.offsetParent)draw()});
})();
