// ---- Pod builder tab ----
window.POD=(function(){
  const G={v4:{name:'TPU v4',one:45e9,bi:90e9,max:4096},v5p:{name:'TPU v5p',one:90e9,bi:180e9,max:8960},'7x':{name:'TPU7x',one:90e9,bi:180e9,max:9216}};
  const TMIN=1e-6;
  // dims [x,y,z]; axes: booleans; V bytes
  function slice(gen,d,axes,V){
    const g=G[gen],chips=d[0]*d[1]*d[2];
    const cubeOK=d.every(v=>v%4===0);const wrap=d.map(v=>cubeOK&&v>2);
    const cubes=cubeOK?chips/64:0;const hosts=Math.ceil(chips/4);
    const diam=d.reduce((s,v,i)=>s+(wrap[i]?Math.floor(v/2):v-1),0);
    // bisection: cut across the longest axis
    const L=Math.max(...d),cut=chips/L*(wrap[d.indexOf(L)]?2:1);
    let W=0,hops=0;d.forEach((v,i)=>{if(axes[i]&&v>1){W+=wrap[i]?g.bi:g.one;hops+=wrap[i]?Math.floor(v/2):v-1}});
    const tbw=W?2*V/W:0,tlat=TMIN*hops;const t=W?Math.max(tbw,tlat):0;
    return {chips,cubes,hosts,wrap,diam,cutLinks:cut,ocs:cubes*96,tbw,tlat,t,over:chips>g.max,W};
  }
  return {G,slice};
})();
(function(){
  const tab=document.getElementById('t-pod');if(!tab)return;
  const $=id=>document.getElementById(id);
  const DIMS=[1,2,4,8,12,16,20,24,28,32];const VS=[1e6,4e6,16e6,64e6,256e6,1e9,2e9,4e9,8e9,16.06e9,32e9,64e9,128e9];
  ['pd-x','pd-y','pd-z'].forEach((id,i)=>{$(id).innerHTML=DIMS.map(v=>'<option>'+v+'</option>').join('');$(id).value=String([4,4,4][i])});
  const fmtB=v=>v>=1e9?(v/1e9).toFixed(v===16.06e9?2:0)+' GB':(v/1e6).toFixed(0)+' MB';
  const fmtT=s=>s>=1?s.toFixed(2)+' s':s>=1e-3?(s*1e3).toFixed(1)+' ms':(s*1e6).toFixed(0)+' µs';
  function cur(){return {gen:$('pd-gen').value,d:[+$('pd-x').value,+$('pd-y').value,+$('pd-z').value],ax:[0,1,2].map(i=>$('pd-ax'+i).checked),V:VS[+$('pd-v').value]}}
  function draw(){
    const c=cur(),r=POD.slice(c.gen,c.d,c.ax,c.V);
    $('pd-vv').textContent=fmtB(c.V)+(c.V===16.06e9?' (8B bf16 gradients)':'');
    const wr=r.wrap.map((w,i)=>'XYZ'[i]+(w?' yes':' no')).join(', ');
    $('pd-out').innerHTML=RD.stat('Chips',r.chips.toLocaleString('en-US'),r.over?'more than one '+POD.G[c.gen].name+' pod ('+POD.G[c.gen].max.toLocaleString('en-US')+')':r.hosts.toLocaleString('en-US')+' hosts of 4')+
      RD.stat('64-chip cubes',r.cubes?r.cubes.toLocaleString('en-US'):'none whole','optical links: '+(r.ocs?r.ocs.toLocaleString('en-US'):'0'))+
      RD.stat('Wraparound per axis',wr,r.cubes?'closed by the optical switches':'smaller than a cube: open ends')+
      RD.stat('Farthest chip',r.diam+' hops','shortest path')+
      RD.stat('All-reduce time',r.W?fmtT(r.t):'pick an axis longer than 1',r.W?(r.tbw>=r.tlat?'bandwidth-bound':'latency-bound')+', links summed '+(r.W/1e9).toFixed(0)+' GB/s':'');
    $('pd-note').textContent='Bisection: '+r.cutLinks.toLocaleString('en-US')+' links cross the narrowest cut (perpendicular to the longest axis'+(r.wrap[c.d.indexOf(Math.max(...c.d))]?', counted twice for the wraparound':'')+'). With every link at '+(POD.G[c.gen].one/1e9)+' GB/s one way, that is '+(r.cutLinks*POD.G[c.gen].one/1e12).toFixed(2)+' TB/s each way across the cut.';
    pic(c,r);
  }
  function pic(c,r){
    // one panel per Z layer, each an X by Y grid of blocks: cubes of 64 chips when the slice is whole cubes, else chips
    const el=$('pd-svg'),w=RD.width(el);const [X,Y,Z]=c.d;
    const u=(r.cubes>1)?4:1;const nx=X/u,ny=Y/u,nz=Z/u;
    const show=Math.min(nz,12);
    const gap=10;let s=Math.floor((w-16-(Math.min(show,4)-1)*gap)/(Math.min(show,4)*nx));s=Math.max(4,Math.min(28,s,Math.floor(150/ny)));
    const pw=nx*s,ph=ny*s,per=Math.max(1,Math.floor((w-16+gap)/(pw+gap)));
    let h='',x0=8,y0=18;
    for(let z=0;z<show;z++){const px=x0+(z%per)*(pw+gap),py=y0+Math.floor(z/per)*(ph+26);
      h+=RD.t(px,py-5,(u===4?'cube layer ':'layer z=')+(z+1),{fs:10,fill:'var(--mute)'});
      for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)h+='<rect x="'+(px+x*s)+'" y="'+(py+y*s)+'" width="'+(s-1)+'" height="'+(s-1)+'" rx="1" fill="'+(u===4?'var(--acc2)':'var(--soft)')+'" stroke="'+(u===4?'var(--acc)':'var(--mute)')+'" stroke-width=".7"/>';
      if(r.wrap[0]||r.wrap[1])h+='<rect x="'+(px-2.5)+'" y="'+(py-2.5)+'" width="'+(pw+4)+'" height="'+(ph+4)+'" fill="none" stroke="var(--c5)" stroke-dasharray="4 3"/>'}
    const rows=Math.ceil(show/per);const H=y0+rows*(ph+26)+6;
    h+=RD.t(8,H-6,(u===4?'Each square is a 4 x 4 x 4 cube of 64 chips ('+(nx*ny*nz)+' cubes)':'Each square is one chip')+(nz>show?'; first '+show+' of '+nz+' layers':'')+(r.wrap.some(Boolean)?'; dashed: wraparound':''),{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,H+4,h,'Slice layout by layer');
  }
  ['pd-gen','pd-x','pd-y','pd-z','pd-ax0','pd-ax1','pd-ax2'].forEach(id=>$(id).addEventListener('change',draw));
  $('pd-v').addEventListener('input',draw);
  $('pd-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=b.dataset.p.split(',');['pd-x','pd-y','pd-z'].forEach((id,i)=>$(id).value=p[i]);draw()});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-pod']=[draw];
  addEventListener('resize',()=>{if(!tab.hidden)draw()});
  draw();
})();
