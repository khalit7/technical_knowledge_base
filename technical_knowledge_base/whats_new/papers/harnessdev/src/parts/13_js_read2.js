// ---- The paper tab, part 2: executor transfer and the 64 switches ----
const LCOL=c=>CCOL[c]||'var(--mute)';
const shortC=c=>c.replace(' 3.1 Pro','').replace(' V4 Pro','').replace(' 3.7 Max','').replace(' 4.8','').replace(' 2.0 Pro','');
// Self-Eval against the same harnesses run by Gemini (Figure 6)
(function(){let k='swe';const host=$('trPlot');if(!host)return;
  function draw(w){const hum=rowOf('T3','Human reference')[k];const lw=w<480?78:112,x0=lw,x1=w-50,sx=v=>x0+(x1-x0)*v/100,rh=30;let s='';
    [0,25,50,75,100].forEach(v=>{s+=ln2(sx(v),4,sx(v),CR.length*rh+6,'var(--line)')+tx(sx(v),CR.length*rh+20,v,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=ln2(sx(hum),0,sx(hum),CR.length*rh+8,'var(--ink)',{da:'4 3'})+tx(Math.min(sx(hum),x1),CR.length*rh+34,'reference '+hum,{fs:11,a:'middle'});
    CR.forEach((c,i)=>{const a=rowOf('T3',c)[k],b=rowOf('T4',c)[k],y=i*rh+18,col=LCOL(c);s+=tx(lw-8,y+4,shortC(c),{fs:12,a:'end'});
      s+=ln2(sx(a),y,sx(b),y,col,{sw:2.4,op:.6})+'<circle cx="'+sx(a).toFixed(1)+'" cy="'+y+'" r="6" fill="'+col+'"><title>'+c+' Self-Eval '+a+'</title></circle>'+'<circle cx="'+sx(b).toFixed(1)+'" cy="'+y+'" r="6" fill="var(--bg)" stroke="'+col+'" stroke-width="2.2"><title>'+c+' run by Gemini '+b+'</title></circle>';
      const d=b-a,lx=Math.max(sx(a),sx(b))+10;s+=tx(Math.min(lx,w-4),y+4,(c==='Gemini 3.1 Pro'?'control':(d>0?'+':'−')+Math.abs(d).toFixed(1)),{fs:11,a:lx>w-40?'end':'start',c:d<-5?'var(--bad)':d>5?'var(--good)':'var(--mute)',w:600})});
    host.innerHTML=svgW(w,CR.length*rh+42,s,'Self-Eval against Gemini-run scores')}
  segBind('trM',m=>{k=m;refit(host)});onTab('t-read',()=>fit(host,draw));fit(host,draw)})();

// (the visible-against-held-out gain chart was replaced on 2026-11-13 by the Evolution stage, 32_js_sc_evo.js)

// the 64 switches: change in what the creator saw against change in what it never saw
(function(){const host=$('swPlot');if(!host)return;
  const pts=[];DV.lineages.forEach(l=>{for(let i=0;i+1<l.n;i++)pts.push({l,i,dx:l.pair[i+1]-l.pair[i],dy:l.ho[i+1]-l.ho[i]})});
  function draw(w){const H=Math.min(420,Math.max(300,w*.75)),pl=44,pr=10,pt=10,pb=40,lim=55;
    const sx=v=>pl+(w-pl-pr)*(v+lim)/(2*lim),sy=v=>pt+(H-pt-pb)*(1-(v+lim)/(2*lim));let s='';
    s+=rc(sx(0),pt,sx(lim)-sx(0),sy(0)-pt,'var(--open2)',{r:0,op:.6})+rc(pl,sy(0),sx(0)-pl,H-pb-sy(0),'var(--open2)',{r:0,op:.6});
    [-40,-20,0,20,40].forEach(v=>{s+=ln2(sx(v),pt,sx(v),H-pb,v?'var(--line)':'var(--mute)')+ln2(pl,sy(v),w-pr,sy(v),v?'var(--line)':'var(--mute)')+tx(sx(v),H-pb+14,v,{fs:11,a:'middle',c:'var(--mute)'})+tx(pl-5,sy(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    s+=tx((pl+w-pr)/2,H-6,'change in feedback pair (points), what the creator saw',{fs:11,a:'middle',c:'var(--mute)'});
    s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">change in held-out-630 (points)</text>';
    let same=0;pts.forEach(p=>{const ok=(p.dx>0&&p.dy>0)||(p.dx<0&&p.dy<0);same+=ok;const c=LCOL(p.l.creator),self=p.l.setting==='Self';
      s+='<circle cx="'+sx(Math.max(-lim,Math.min(lim,p.dx))).toFixed(1)+'" cy="'+sy(Math.max(-lim,Math.min(lim,p.dy))).toFixed(1)+'" r="5" fill="'+(self?c:'var(--bg)')+'" stroke="'+c+'" stroke-width="2"><title>'+(self?'':'Gemini runs ')+p.l.creator+', H'+p.i+' to H'+(p.i+1)+': feedback '+(p.dx>0?'+':'')+p.dx.toFixed(2)+', held-out '+(p.dy>0?'+':'')+p.dy.toFixed(2)+'</title></circle>'});
    s+=tx(w-pr-6,H-pb-8,same+' of '+pts.length+' agree (green)',{fs:12,a:'end',w:700});
    host.innerHTML=svgW(w,H,s,'Feedback change against held-out change for the 64 switches')}
  PRED_REVEAL.pr2=()=>fit(host,draw)})();
