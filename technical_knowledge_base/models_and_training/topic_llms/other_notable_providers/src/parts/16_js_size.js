// ---- Scale and sparsity: every long-tail model with published sizes, over time or total against active ----
(function(){
  if(!$('sz'))return;
  let view='time',refs=true,sel=null;
  const COL={open:'var(--open)',openr:'var(--c5)',full:'var(--c6)',api:'var(--closed)'};
  function draw(){
    const narrow=$('sz').clientWidth<560,W=narrow?360:760,H=narrow?380:440,pl=narrow?42:52,pr=narrow?8:14,pt=14,pb=38;
    const rows=MODELS.filter(m=>refs||!m.ref);let s='',f;
    if(view==='time'){
      const t0=Date.parse('2024-07-01'),t1=Date.parse('2026-10-20'),lx=v=>pl+(W-pl-pr)*(v-t0)/(t1-t0);
      const lg=Math.log10,ly=v=>pt+(H-pt-pb)*(1-(lg(v)-lg(1.5))/(lg(9000)-lg(1.5)));
      [[2,'2B'],[10,'10B'],[100,'100B'],[1000,'1T']].forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
      ['2024-07-01','2025-01-01','2025-07-01','2026-01-01','2026-07-01'].forEach(d=>{const x=lx(Date.parse(d));s+='<line x1="'+x+'" x2="'+x+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/><text x="'+x+'" y="'+(H-pb+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(d.slice(5,7)==='01'?'Jan ':'Jul ')+d.slice(0,4)+'</text>'});
      const sx=lx(Date.parse('2026-09-01'));s+='<rect x="'+sx+'" y="'+pt+'" width="'+(lx(Date.parse('2026-10-01'))-sx)+'" height="'+(H-pt-pb)+'" fill="var(--hl)" opacity=".55"/><text x="'+(sx-3)+'" y="'+(H-pb-6)+'" font-size="10" text-anchor="end" fill="var(--mute)">September 2026</text>';
      s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">total parameters (log)</text>';
      s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">release date; dot area = active parameters</text>';
      f={x:m=>lx(Date.parse(m.d.length===7?m.d+'-15':m.d)),y:m=>ly(m.tot),r:m=>Math.max(3,Math.sqrt(m.act)*1.15*(narrow?.8:1))};
    }else{
      const o=logFrame({W,H,pl,pr,pt,pb,x:[1.5,9000],y:[1,250],xt:[[2,'2B'],[10,'10B'],[100,'100B'],[1000,'1T']],yt:[[1,'1B'],[3,'3B'],[10,'10B'],[30,'30B'],[100,'100B']],xl:'total parameters (log)',yl:'active parameters per token (log)'});
      s=o.s;[[1,'dense'],[10,'10×'],[20,'20×'],[40,'40×']].forEach(([r,l])=>{const a=Math.max(1.5,r),b=Math.min(4000,150*r);s+='<line x1="'+o.lx(a)+'" y1="'+o.ly(a/r)+'" x2="'+o.lx(b)+'" y2="'+o.ly(b/r)+'" stroke="var(--mute)" stroke-dasharray="3 4" opacity=".7"/><text x="'+(o.lx(b)-4)+'" y="'+(o.ly(b/r)-5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
      f={x:m=>o.lx(m.tot),y:m=>o.ly(m.act),r:()=>narrow?4.2:5};
    }
    const lab=[];
    rows.forEach(m=>{const x=f.x(m),y=f.y(m),r=f.r(m),on=sel===m.n;
      s+='<circle class="szd" data-n="'+m.n+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r.toFixed(1)+'" fill="'+(m.ref?'var(--dim)':COL[m.w])+'" fill-opacity="'+(m.ref?.8:.75)+'" stroke="'+(on?'var(--ink)':'var(--bg)')+'" stroke-width="'+(on?2:1)+'" style="cursor:pointer"><title>'+m.n+'</title></circle>';
      if(m.lb||on)lab.push({x,y:y-r-3,n:m.short||m.n,ref:m.ref,on,p:['Hy4','Step 5','DeepSeek V4 Pro','MiMo-V2.6-Pro','Bonsai 2'].includes(m.short)?1:0})});
    lab.sort((a,b)=>(b.on-a.on)||(b.p-a.p)||(a.y-b.y));const used=[];lab.forEach(l=>{let y=l.y;while(used.some(u=>Math.abs(u.y-y)<11&&Math.abs(u.x-l.x)<(narrow?70:100)))y-=11;if(l.y-y>(narrow?12:23)&&!l.on)return;used.push({x:l.x,y});
      s+='<text x="'+l.x.toFixed(1)+'" y="'+y.toFixed(1)+'" font-size="'+(narrow?9:10.5)+'" text-anchor="'+(l.x>W-60?'end':l.x<pl+40?'start':'middle')+'" fill="'+(l.ref?'var(--mute)':'var(--ink)')+'">'+l.n+'</text>'});
    $('szSvg').innerHTML=svgEl(W,H,s,view==='time'?'Model sizes over time':'Total against active parameters');
    $('szSvg').querySelectorAll('.szd').forEach(c=>c.addEventListener('click',()=>{sel=c.dataset.n;draw()}));
    const m=MODELS.find(x=>x.n===sel);
    $('szDet').innerHTML=m?'<b>'+m.n+'</b> ('+m.lab+', '+m.dt+'): '+(m.act&&m.act!==m.tot?fmt(m.tot,m.tot%1?1:0)+'B total, '+fmt(m.act,m.act%1?1:0)+'B active, '+(m.tot/m.act).toFixed(1)+'× sparse':fmt(m.tot,m.tot%1?1:0)+'B dense')+'; '+m.lic+'. '+(m.note||'')+' '+A(m.u,'Source')+(m.ref?' <span class="mute">(reference model from another page)</span>':''):'<span class="mute">Click a dot for the model, its licence and its source.</span>';
  }
  segBind('szV',v=>{view=v;draw()});
  $('szR').addEventListener('change',e=>{refs=e.target.checked;draw()});
  addEventListener('resize',()=>{if(!$('t-size').hidden)draw()});onTab('t-size',draw);
})();
