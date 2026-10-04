// ---- Shared renderers: trace waterfall (WF) and small line chart (LC), used by the Reading tab and the Real telemetry tab ----
window.WF=(function(){
  const esc=RD.esc;
  const col=s=>s==='retrieval'?'var(--c3)':'var(--c1)';
  // order spans depth-first, children by start time; returns [{s,depth,i}]
  function order(sp){
    const kids={};sp.forEach((s,i)=>{(kids[s[2]]=kids[s[2]]||[]).push(i)});
    Object.values(kids).forEach(a=>a.sort((x,y)=>sp[x][3]-sp[y][3]));
    const out=[];(function walk(p,d){(kids[p]||[]).forEach(i=>{out.push({s:sp[i],depth:d,i});walk(i,d+1)})})(-1,0);
    return out;
  }
  // t: trace object {sp:[[name,svc,parent,start,dur,err,extra?]]}; opts {hl: span name to highlight, onSel(i)}
  function render(el,t,opts){
    opts=opts||{};
    const rows=order(t.sp);const end=Math.max(...t.sp.map(s=>s[3]+s[4]));
    el.innerHTML='<div class="leg"><span style="--sw:var(--c1)">chat-api</span><span style="--sw:var(--c3)">retrieval (another process)</span><span style="--sw:var(--bad)">error status</span></div>'+
      rows.map(r=>{const s=r.s,l=100*s[3]/end,w=Math.max(.3,100*s[4]/end);
        const hl=opts.hl&&s[0]===opts.hl;
        return '<div class="r'+(s[5]?' err':'')+(hl?' sel':'')+'" data-i="'+r.i+'"><div class="nm" style="padding-left:'+(r.depth*10)+'px" title="'+esc(s[0])+'">'+esc(s[0])+' <i>'+esc(s[1])+'</i></div>'+
          '<div class="tk"><div class="bar" style="left:'+l.toFixed(2)+'%;width:'+w.toFixed(2)+'%;background:'+(s[5]?'var(--bad)':col(s[1]))+'"></div></div>'+
          '<div class="ms">'+fmtMs(s[4])+'</div></div>'}).join('')+
      '<div class="small mute" style="margin-top:3px">Bars share one time axis: 0 to '+fmtMs(end)+'.</div>';
    el.onclick=e=>{const r=e.target.closest('.r');if(!r)return;el.querySelectorAll('.r').forEach(x=>x.classList.toggle('sel',x===r));if(opts.onSel)opts.onSel(+r.dataset.i)};
  }
  function fmtMs(v){return v>=100?Math.round(v)+' ms':(v>=10?v.toFixed(1)+' ms':v.toFixed(2)+' ms')}
  // details of one span as text
  function detail(t,i){
    const s=t.sp[i],x=s[6];
    let o='name:      '+s[0]+'\nservice:   '+s[1]+'\nstart:     +'+s[3].toFixed(2)+' ms from the trace start\nduration:  '+s[4].toFixed(2)+' ms\nstatus:    '+(s[5]?'ERROR':'unset (ok)');
    if(x){o='trace_id:  '+t.id+'\nspan_id:   '+x.id+'\nkind:      '+x.kind+'\n'+o;
      const a=Object.entries(x.attrs||{});if(a.length)o+='\nattributes:\n'+a.map(([k,v])=>'  '+k+' = '+JSON.stringify(v)).join('\n');
      (x.events||[]).forEach(ev=>{o+='\nevent: '+ev.name;Object.entries(ev.attrs||{}).forEach(([k,v])=>{o+='\n  '+k+' = '+JSON.stringify(v)})});}
    else o='trace_id:  '+t.id+'\n'+o+'\n(attributes kept only for the three traces discussed in the Reading tab)';
    return o;
  }
  const byId=id=>DEMO.traces.find(t=>t.id===id);
  return {render,detail,byId,fmtMs,order};
})();

window.LC=function(el,o){
  // o: {series:[{pts,color,label,dash}], x0,x1, y0,y1, yfmt, band:[a,b], cursor, h, ylab}
  const W=RD.width(el),H=o.h||170,L=46,R=10,T=10,B=24;
  const xs=v=>L+(W-L-R)*(v-o.x0)/(o.x1-o.x0);
  let y1=o.y1;if(y1==null){y1=0;o.series.forEach(s=>s.pts.forEach(p=>{if(p[1]!=null&&p[1]>y1)y1=p[1]}));y1*=1.12;if(!y1)y1=1}
  const y0=o.y0||0,ys=v=>T+(H-T-B)*(1-(v-y0)/(y1-y0));
  let b='';
  if(o.band)b+='<rect x="'+xs(o.band[0])+'" y="'+T+'" width="'+(xs(o.band[1])-xs(o.band[0]))+'" height="'+(H-T-B)+'" fill="var(--bad)" opacity=".09"/>';
  for(let k=0;k<=3;k++){const v=y0+(y1-y0)*k/3,y=ys(v);b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-4,y+4,o.yfmt?o.yfmt(v):v.toFixed(2),{a:'end',fs:10,fill:'var(--mute)'})}
  const step=(o.x1-o.x0)>150?60:30;
  for(let v=Math.ceil(o.x0/step)*step;v<=o.x1;v+=step)b+=RD.t(xs(v),H-8,v+' s',{a:'middle',fs:10,fill:'var(--mute)'});
  o.series.forEach(s=>{let d='',pen=false;s.pts.forEach(p=>{if(p[1]==null||p[0]<o.x0||p[0]>(o.cursor!=null?o.cursor:o.x1)){pen=false;return}d+=(pen?'L':'M')+xs(p[0]).toFixed(1)+' '+ys(Math.min(p[1],y1)).toFixed(1);pen=true});
    b+='<path d="'+d+'" fill="none" stroke="'+s.color+'" stroke-width="2"'+(s.dash?' stroke-dasharray="4 3"':'')+'/>'});
  if(o.cursor!=null)b+='<line x1="'+xs(o.cursor)+'" x2="'+xs(o.cursor)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--ink)" stroke-dasharray="2 3"/>';
  (o.marks||[]).forEach(m=>{b+='<circle cx="'+xs(m[0])+'" cy="'+ys(m[1])+'" r="5" fill="var(--bg)" stroke="var(--bad)" stroke-width="2"/>'});
  const leg=o.series.filter(s=>s.label).map(s=>'<span style="--sw:'+s.color+'">'+s.label+'</span>').join('');
  el.innerHTML=(leg?'<div class="leg">'+leg+(o.band?'<span style="--sw:var(--bad);opacity:.5">incident</span>':'')+'</div>':'')+RD.svg(W,H,b,o.label||'chart');
};
// compact one JSON log line for narrow screens: time, level, service, message, then the useful fields
window.LOGC=function(l){try{const o=JSON.parse(l);const f=[];
  if(o.status!=null)f.push('status='+o.status);if(o.duration_ms!=null)f.push('duration_ms='+o.duration_ms);if(o.trace_id)f.push('trace='+o.trace_id.slice(0,8)+'...');
  return o.ts.slice(11,23)+' '+o.level+' '+o.service+' "'+o.msg+'" '+f.join(' ')}catch(e){return l}};
