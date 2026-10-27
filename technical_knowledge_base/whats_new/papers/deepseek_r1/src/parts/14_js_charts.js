function niceTicks(a,b,n){const span=b-a,raw=span/(n||5),p=Math.pow(10,Math.floor(Math.log10(raw))),m=raw/p,st=(m<1.5?1:m<3?2:m<7?5:10)*p;const t=[];for(let v=Math.ceil(a/st-1e-9)*st;v<=b+1e-9;v+=st)t.push(+v.toFixed(10));return t}
function linFrame(o){const {W,H,pl,pr,pt,pb}=o;const X=v=>pl+(W-pl-pr)*(v-o.x[0])/(o.x[1]-o.x[0]),Y=v=>pt+(H-pt-pb)*(1-(v-o.y[0])/(o.y[1]-o.y[0]));
  let s='';const fx=o.fx||(v=>String(v)),fy=o.fy||(v=>String(v));
  (o.yt||niceTicks(o.y[0],o.y[1],o.ny||5)).forEach(v=>{s+=ln2(pl,Y(v),W-pr,Y(v),'var(--line)',{sw:1})+tx(pl-5,Y(v)+4,fy(v),{fs:11,a:'end',c:'var(--mute)'})});
  (o.xt||niceTicks(o.x[0],o.x[1],o.nx||(W<420?4:6))).forEach(v=>{s+=ln2(X(v),H-pb,X(v),H-pb+4,'var(--mute)',{sw:1})+tx(X(v),H-pb+15,fx(v),{fs:11,a:'middle',c:'var(--mute)'})});
  s+=ln2(pl,H-pb,W-pr,H-pb,'var(--mute)',{sw:1});
  if(o.xl)s+=tx((pl+W-pr)/2,H-3,o.xl,{fs:11,a:'middle',c:'var(--mute)'});
  if(o.yl)s+='<text x="11" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+((pt+H-pb)/2)+')">'+o.yl+'</text>';
  return {s,X,Y}}
const pathOf=(pts,X,Y)=>pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join('');
const lineS=(pts,X,Y,c,o)=>{o=o||{};return pts.length?'<path d="'+pathOf(pts,X,Y)+'" fill="none" stroke="'+c+'" stroke-width="'+(o.sw||1.8)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>':''};
const dotS=(x,y,r,c,o)=>{o=o||{};return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r+'" fill="'+(o.hollow?'none':c)+'" stroke="'+c+'" stroke-width="'+(o.sw||1)+'"'+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+(o.t?'<title>'+o.t+'</title>':'')+'</circle>'};
const clampv=(v,a,b)=>v<a?a:v>b?b:v;
// horizontal bars, labels left, values right; rows [{n, v, c, hl, hatch, note}], scale [0, vmax]
function hbars(w,rows,o){o=o||{};const rh=o.rh||20,lw=Math.min(o.lw||170,Math.max(90,w*0.38)),vw=46,bw=Math.max(40,w-lw-vw-8),vmax=o.vmax||Math.max(...rows.map(r=>r.v||0));let s='',y=4;
  s+='<defs><pattern id="hatch'+(o.id||'')+'" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--soft)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--mute)" stroke-width="2.4"/></pattern></defs>';
  rows.forEach(r=>{const L=r.n.length*6.4>lw-6?r.n.slice(0,Math.floor((lw-6)/6.4)-1)+'…':r.n;s+=tx(lw-6,y+rh*0.68,L,{fs:11.5,a:'end',w:r.hl?'700':null,c:r.hl?'var(--ink)':'var(--mute)'})+(r.n!==L?'<title>'+r.n+'</title>':'');
    if(r.v!=null){const bwid=bw*r.v/vmax;s+=rc(lw,y+3,bwid,rh-6,r.hatch?'url(#hatch'+(o.id||'')+')':(r.c||'var(--acc)'),{r:2,op:r.hl?1:0.75});s+=tx(lw+bwid+4,y+rh*0.68,(o.fmt||(v=>v.toFixed(1)))(r.v),{fs:11,c:'var(--ink)'})}
    else s+=tx(lw+4,y+rh*0.68,'not reported',{fs:11,c:'var(--mute)'});y+=rh});
  return svgW(w,y+4,s,o.label||'bar chart')}
// legend that wraps to the width; items [name, colour, kind('l' line, 'd' dot, 'da' dashed)]
function legendW(items,x,y,w){let s='',cx=x,cy=y;items.forEach(([n,c,k])=>{const lw=n.length*7+30;if(cx+lw>x+w&&cx>x){cx=x;cy+=16}
  s+=(k==='d'?dotS(cx+7,cy-4,3.5,c):ln2(cx,cy-4,cx+16,cy-4,c,{sw:2.2,da:k==='da'?'5 3':null}))+tx(cx+20,cy,n,{fs:11});cx+=lw});return {s,h:cy-y+14}}
