// ---- Charts for this page: a linear frame, lines, dots, the reward-KL plane ----
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
// best-so-far envelope (max reward at or below each KL)
function envelope(pts){const s=pts.slice().sort((a,b)=>a[0]-b[0]),e=[];let best=-1;for(const p of s)if(p[1]>best){if(e.length)e.push([p[0],best]);e.push(p);best=p[1]}return e}
// legend that wraps to the width; items [name, colour, kind('l' line, 'd' dot, 'da' dashed)]
function legendW(items,x,y,w){let s='',cx=x,cy=y;items.forEach(([n,c,k])=>{const lw=n.length*6.3+28;if(cx+lw>x+w&&cx>x){cx=x;cy+=16}
  s+=(k==='d'?dotS(cx+7,cy-4,3.5,c):ln2(cx,cy-4,cx+16,cy-4,c,{sw:2.2,da:k==='da'?'5 3':null}))+tx(cx+20,cy,n,{fs:11});cx+=lw});return {s,h:cy-y+14}}
// the toy's reward-KL plane with the exact frontier (Eq. 4 enumerated)
const MCOL={DPO:'var(--c1)',PPO:'var(--c2)','PPO-GT':'var(--c3)',Unlikelihood:'var(--c4)','Preferred-FT':'var(--c5)',IPO:'var(--c6)',cDPO:'var(--c3)',SimPO:'var(--bad)',Hinge:'var(--mg)'};
function toyPlane(w,o){o=o||{};const H=o.H||(w<500?250:300),xmax=o.xmax||3.2,leg=o.legend?legendW(o.legend,46,14,w-56):{s:'',h:0};
  const f=linFrame({W:w,H,pl:42,pr:10,pt:10+leg.h,pb:32,x:[0,xmax],y:[o.ymin==null?0.3:o.ymin,1],xl:'KL(π ‖ π_ref), nats (exact)',yl:'true reward 𝔼[r*] (exact)',fy:v=>v.toFixed(1)});
  let s=f.s+leg.s;const fr=TOYRES.frontier.map(r=>[r[1],r[2]]).filter(p=>p[0]<=xmax*1.02).sort((a,b)=>a[0]-b[0]);
  s+=lineS(fr,f.X,f.Y,'var(--ink)',{sw:1.6,da:'5 3'});const lp=fr.find(p=>p[0]>xmax*0.62)||fr[fr.length-1];
  s+=tx(f.X(lp[0])-4,f.Y(lp[1])-7,'best possible (Eq. 4)',{fs:11,a:'end',c:'var(--mute)'});
  return {s,X:f.X,Y:f.Y,H,xmax}}
// frontier shortfall: optimum reward at this KL minus the reward reached
const FRS=(()=>{const F=TOYRES.frontier.map(r=>[r[1],r[2]]).sort((a,b)=>a[0]-b[0]);return k=>{for(let i=1;i<F.length;i++)if(F[i][0]>=k){const [a,b]=F[i-1],[c,d]=F[i];return b+(d-b)*(k-a)/(c-a)}return F[F.length-1][1]}})();
