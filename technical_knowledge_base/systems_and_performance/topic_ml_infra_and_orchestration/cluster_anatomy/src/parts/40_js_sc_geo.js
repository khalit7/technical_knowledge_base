// ---- Shared geometry for the four stages: a server tray (8 GPUs in two rows of four, an NVSwitch glass plate between them, NICs along its front edge),
// a rack (a see-through cabinet holding two servers and a rack switch on top) and a few helpers. Sizes are illustrative, not to scale. ----
window.CAG=(function(){
  if(!window.S3)return null;
  const {mix}=S3;
  const TW=.9,TH=.12,TD=1.3,RW=1.0,RD=1.4,RH=2.4,SY=[.55,1.35],SWY=2.22;
  // GPU g of a tray whose bottom centre is c: four across, two rows (front row g 4..7 towards +z)
  const gpu=(c,g)=>[c[0]+((g%4)-1.5)*.2,c[1]+TH,c[2]+(g<4?-.34:.34)];
  const nic=(c,g)=>[c[0]+((g%4)-1.5)*.2+(g<4?-.05:.05),c[1]+TH,c[2]+TD/2-.08];
  const top=(p,h)=>[p[0],p[1]+(h==null?.08:h),p[2]];
  // a tray: o.a alpha, o.ga GPU alpha, o.hl {g: colour}, o.nvs NVSwitch plate alpha, o.nic NIC alpha
  function tray(R,c,o){o=o||{};const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;
    R.box(c,[TW,TH,TD],{fill:mix(P.paper,P.ink,.07),a,shadow:false,lw:.7,dz:200});
    for(let g=0;g<8;g++){const p=gpu(c,g),h=o.hl&&o.hl[g];R.box(p,[.13,.07,.22],{fill:h||mix(P.paper,P.acc,.3),a:a*(o.ga==null?1:o.ga),shadow:false,lw:.6})}
    if(o.nvs)R.glass([c[0]-.36,c[1]+TH+.02,c[2]-.09],[.72,0,0],[0,0,.18],{c:P.c4,a:a*o.nvs,nu:4,nv:1,th:.02});
    if(o.nic)for(let g=4;g<8;g++){const p=nic(c,g);R.box([p[0],p[1],p[2]],[.1,.05,.08],{fill:mix(P.paper,P.c2,.55),a:a*o.nic,shadow:false,lw:.5})}}
  // a rack whose floor centre is c: o.a, o.fa face alpha of the cabinet, o.slab (true: draw both servers as plain slabs), o.sw rack switch alpha, o.sfill colours
  function rack(R,c,o){o=o||{};const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;
    R.box(c,[RW,RH,RD],{fill:mix(P.paper,P.ink,.03),a,fa:o.fa==null?.16:o.fa,shadow:!!o.shadow,lw:.7});
    if(o.slab!==false)SY.forEach((y,i)=>R.box([c[0],y,c[2]],[TW,.22,TD],{fill:(o.sfill&&o.sfill[i])||mix(P.paper,P.ink,.1),a:a*(o.sa==null?1:o.sa),shadow:false,lw:.6}));
    if(o.sw)R.box([c[0],SWY,c[2]],[TW,.14,TD*.9],{fill:mix(P.paper,P.c2,.55),a:a*o.sw,shadow:false,lw:.6})}
  const f=n=>Number(n).toLocaleString('en-US');
  return {TW,TH,TD,RW,RD,RH,SY,SWY,gpu,nic,top,tray,rack,f};
})();
