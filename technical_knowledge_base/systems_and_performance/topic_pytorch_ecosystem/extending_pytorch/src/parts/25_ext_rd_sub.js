// ---- Reading 5.1 (moved from the old Subclass tracer tab, 2026-10-23): recorded calls at the __torch_function__ and __torch_dispatch__ levels ----
(function(){
  if(!document.getElementById('es-card'))return;
  const E=window.EXT,esc=RD.esc,$=id=>document.getElementById(id),U=window.EXTU;
  const LV=E.levels;let mode='function';
  const PH={s:['setup','s'],f:['forward','f'],b:['backward','b'],a:['after','s']};
  const STACK=[['py','Python call','F.linear(x, w), loss.backward()'],['tf','__torch_function__','sees the Python function'],['ag','Autocast, Autograd, ADInplaceOrView','records the backward node'],['td','Python key: __torch_dispatch__','sees the ATen operator'],['k','CPU kernel','the arithmetic']];
  const CAPS={function:['A __torch_function__ subclass','Calls arrive as Python functions, before autograd. Its results are of the subclass type too, so after the weight\'s first use the whole forward downstream passes through it.'],
    dispatch:['A __torch_dispatch__ wrapper that rewraps','Calls arrive as ATen operators, below autograd. Results are rewrapped, so the subclass spreads downstream, and backward\'s ATen operators arrive as well.'],
    dispatch_unwrap:['A __torch_dispatch__ wrapper with plain results','Only operators whose arguments include the weight itself arrive: its transpose. The matmul that follows already receives a plain tensor.']};
  function ev(i){return LV[mode].ev[i]}
  function draw(i){const L=LV[mode],e=ev(i);if(!e)return;
    const lvl=e[0]==='f'?'tf':'td',ph=PH[e[1]];
    const el=$('es-stack'),W=RD.width(el),rh=40;let sb='';
    STACK.forEach((s,j)=>{const y=j*(rh+6)+2,on=s[0]===lvl,hook=s[0]==='tf'||s[0]==='td';
      sb+='<rect x="1" y="'+y+'" width="'+(W-2)+'" height="'+rh+'" rx="6" fill="'+(on?'var(--acc2)':'var(--bg)')+'" stroke="'+(on?'var(--acc)':'var(--line)')+'" stroke-width="'+(on?2:1)+'" opacity="'+(hook&&!on?0.55:1)+'"/>'+
        RD.t(9,y+16,esc(s[1]),{fs:12,fill:'var(--ink)',w:600})+RD.t(9,y+32,esc(s[2]),{fs:11,fill:'var(--mute)'});
      if(j<STACK.length-1)sb+='<path d="M'+(W/2)+' '+(y+rh)+' v6" stroke="var(--mute)"/>'});
    el.innerHTML=RD.svg(W,STACK.length*(rh+6),sb,'where the call was caught');
    $('es-now').innerHTML='<span class="es-ph '+ph[1]+'">'+ph[0]+'</span><span class="small mute">call '+(i+1)+' of '+L.ev.length+'</span><div class="es-op">'+esc(e[2])+'</div><div class="small mute">subclass argument position'+(e[3].length>1?'s':'')+': '+(e[3].length?e[3].join(', '):'none (a method on the subclass)')+'</div>';
    const lo=Math.max(0,i-9);$('es-log').innerHTML=L.ev.slice(lo,i+1).map((x,j)=>'<div class="'+(lo+j===i?'cur ':'')+(x[1]==='b'?'b':'')+'">'+(lo+j+1)+'. '+esc(x[2])+'</div>').join('');
    let s=0,f=0,b=0;const seen=new Set();for(let j=0;j<=i;j++){const x=L.ev[j];if(x[1]==='f')f++;else if(x[1]==='b')b++;else s++;seen.add(x[2])}
    $('es-cnt').innerHTML=RD.stat('Setup calls',s,'nn.Parameter creation')+RD.stat('Forward calls',f+' / '+L.nf,'so far / total')+RD.stat('Backward calls',b+' / '+L.nb,'so far / total')+RD.stat('Distinct operations',seen.size,'so far');
    $('es-cap').innerHTML='<div class="t">'+CAPS[mode][0]+'</div><p>'+CAPS[mode][1]+' Loss: '+L.loss.toFixed(6)+' (a <code>'+esc(L.loss_type)+'</code>); the weight\'s gradient arrives as a <code>'+esc(L.grad_type)+'</code>.</p>';}
  // the shared step controller (play, pause, step, scrub, speed); it lives in RD and plays only while visible
  const an=RD.anim({card:'es-card',ctl:'es-ctl',n:LV.function.ev.length,draw,ms:420,label:'Recorded call'});
  RD.seg($('es-seg'),m=>{mode=m;an.reset(LV[m].ev.length);hist()});
  $('es-jump').addEventListener('click',()=>{const k=LV[mode].ev.findIndex(x=>x[1]==='b');if(k>=0)an.go(k)});
  let hph='f';
  function hist(){const H=LV[mode].hist,items=Object.entries(H).filter(([k])=>k.startsWith(hph==='f'?'forward:':'backward:')).map(([k,v])=>({k:'<code>'+esc(k.split(':').slice(1).join(':'))+'</code>',v,c:hph==='f'?'var(--c1)':'var(--c2)'})).sort((a,b)=>b.v-a.v);
    if(!items.length){$('es-hist').innerHTML='<p class="small mute">No calls reached the subclass in this phase.</p>';return}
    U.bars($('es-hist'),items,'',0)}
  RD.seg($('es-hseg'),m=>{hph=m;hist()});hist();
  RD.onRender(()=>an.redraw());RD.onResize(()=>an.redraw());
})();
