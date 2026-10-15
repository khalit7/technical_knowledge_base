// ---- TPU and Pallas lab: jax's create_device_mesh on mock TPU slices (section 4) ----
(function(){
  const T=window.TP,D=T.D,$=T.$,S=D.torus.slices;
  let si=2,mi=1;
  const ss=$('tp-to-slice'),ms=$('tp-to-mesh');
  ss.innerHTML=S.map((s,i)=>'<option value="'+i+'">'+T.esc(s.name)+'</option>').join('');ss.value=si;
  function fillMesh(){const s=S[si];ms.innerHTML=s.meshes.map((m,i)=>'<option value="'+i+'">('+m.mesh.join(', ')+')'+(m.error?' : error':'')+'</option>').join('');ms.value=Math.min(mi,s.meshes.length-1);mi=+ms.value}
  const hue=(i,n)=>'hsl('+Math.round(360*i/Math.max(1,n))+',62%,55%)';
  function axesTxt(ax,mesh){return ax.map((a,i)=>'axis '+i+' (size '+mesh[i]+') on physical '+(a.phys.length?a.phys.map(x=>x==='c'?'core-on-chip':x).join(' and '):'none')+', neighbours at most '+a.max_hop+' hop'+(a.max_hop===1?'':'s')+' apart').join('; ')}
  function draw(){
    const s=S[si],m=s.meshes[mi];const el=$('tp-to-svg');const W=Math.min(560,T.width(el));
    const nx=s.shape[0],ny=s.shape[1];const cell=Math.max(6,Math.min(34,Math.floor((W-20)/nx)));const H=ny*cell+28;let b='';
    const last=m.mesh.length-1,nl=m.mesh[last];
    b+=T.tx(4,12,'chips at z = 0 ('+nx+' x '+ny+'), colour = index along the last logical axis',{fs:10.5,fill:'var(--mute)'});
    for(let x=0;x<nx;x++)for(let y=0;y<ny;y++){const p=m.grid&&m.grid[x+','+y];const c=p?hue(p[last],nl):'var(--dim)';
      b+=T.rect(4+x*cell,20+y*cell,cell-1.5,cell-1.5,{rx:2,fill:c,op:p?.9:.5});
      if(p&&cell>=26)b+=T.tx(4+x*cell+cell/2,20+y*cell+cell/2+3,String(p[last]),{a:'middle',fs:9,fill:'#fff'})}
    el.innerHTML=T.svg(W,H,b,'Chips of the slice coloured by logical axis index');
    let cap='<b>'+T.esc(s.name)+', mesh ('+m.mesh.join(', ')+').</b> '+T.esc(s.wrap)+'. ';
    if(m.axes)cap+='create_device_mesh put '+axesTxt(m.axes,m.mesh)+'.';
    else{cap+='<span class="tp-bad">create_device_mesh raised</span> <code>'+T.esc(m.error.slice(0,160))+'...</code>';
      if(m.split_axes)cap+=' With <code>allow_split_physical_axes=True</code> (what <code>jax.make_mesh</code> passes on v5e only): '+axesTxt(m.split_axes,m.mesh)+'.'}
    $('tp-to-cap').innerHTML=cap;
  }
  fillMesh();
  ss.addEventListener('change',()=>{si=+ss.value;mi=1;fillMesh();draw()});
  ms.addEventListener('change',()=>{mi=+ms.value;draw()});
  T.onRender(draw);T.onResize(draw);
})();
