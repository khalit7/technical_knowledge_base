// ---- Charts shared by the tabs: horizontal score bars with the paper's two-standard-deviation band ----
const TB=window.PAPER.tables,RC=window.PAPER.rc,M7=TB.M7;
const SD7=TB.T1.rows[1].v.map(Number);
const escH=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const f2=v=>(+v).toFixed(2);
// items: [{n, v, star, hl, tag}], o: {best, sd, base, fmt, dom:[lo,hi], title}
function hbars(W,items,o){o=o||{};const narrow=W<560,lw=narrow?0:Math.min(260,Math.round(W*.36)),pr=46,x0=lw+6,x1=W-pr;
  const vs=items.map(i=>i.v),lo=o.dom?o.dom[0]:Math.min(...vs),hi=o.dom?o.dom[1]:Math.max(...vs);
  const pad=(hi-lo)*.08||1,a=o.dom?lo:lo-pad,b=o.dom?hi:hi+pad*.6;const X=v=>x0+(x1-x0)*(v-a)/(b-a);
  const rh=narrow?36:22,top=o.title?20:6;let s='';const H=top+items.length*rh+26;
  if(o.title)s+=tx(0,13,o.title,{fs:12,w:600});
  if(o.best!=null&&o.sd!=null){const bl=X(Math.max(a,o.best-2*o.sd)),br=X(o.best);s+=rc(bl,top-2,br-bl,items.length*rh+2,'var(--acc2)',{r:2,op:.75})}
  // ticks
  const span=b-a,st=[0.1,0.2,0.5,1,2,5,10,20,50].find(t=>span/t<=(narrow?4:7))||100;
  for(let t=Math.ceil(a/st)*st;t<=b+1e-9;t+=st){const xx=X(t);s+=ln2(xx,top-2,xx,top+items.length*rh,'var(--line)')+tx(xx,top+items.length*rh+14,+t.toFixed(2),{fs:11,a:'middle',c:'var(--mute)'})}
  if(o.base!=null){const xb=X(o.base);s+=ln2(xb,top-4,xb,top+items.length*rh+2,'var(--mute)',{da:'3 3'})}
  items.forEach((it,i)=>{const y=top+i*rh,by=narrow?y+17:y+4,bh=narrow?12:13;
    const lab=(it.star?'★ ':'')+escH(it.n);
    if(narrow)s+=tx(0,y+12,lab,{fs:12,w:it.hl?600:null});else s+=tx(lw,y+15,lab,{fs:12,a:'end',w:it.hl?600:null});
    const xv=X(it.v);s+=rc(x0,by,Math.max(1,xv-x0),bh,it.hl?'var(--acc)':(it.c||'var(--dim)'),{r:2});
    s+=tx(xv+4,by+bh-2,(o.fmt||f2)(it.v)+(it.tag?' '+it.tag:''),{fs:11,c:'var(--ink)'})});
  return svgW(W,H,s,o.title||'bar chart')}
// rows of a main-text table as items for metric j
const rowsItems=(t,j,pick)=>TB[t].rows.filter(r=>!pick||pick(r)).map(r=>({n:r.name+(r.labels&&r.labels.length?' ('+r.labels.join(', ')+')':''),v:+r.v[j],star:r.star,raw:r.v[j]}));
function predBars(id,t,j,o){const el=$(id);if(!el)return;o=o||{};const it=rowsItems(t,j,o.pick);if(o.hl)it.forEach(x=>{x.hl=o.hl(x)});
  const best=Math.max(...it.map(x=>x.v));fit(el,W=>{el.innerHTML=hbars(W,it,{best,sd:SD7[j],base:+TB.T1.rows[0].v[j],title:o.title||(M7[j]+', '+t.replace('T','Table '))})+'<p class="small mute" style="margin:2px 0 0">Shaded: within two baseline standard deviations ('+(2*SD7[j]).toFixed(2)+') of the best, the paper\'s bold rule. Dashed line: the baseline.</p>'})}
