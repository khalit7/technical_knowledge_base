// ---- Scheduling lab, sections 3 and 4: the fairshare and preemption runs on real Slurm (static Gantt charts) ----
(function(){
  const $=SC.$,D=window.SC_DATA;if(!D)return;
  const ROWS=[];['c1','c2','c3'].forEach(n=>{for(let g=0;g<4;g++)ROWS.push([n,g])});
  const UC={alice:'var(--c1)',bob:'var(--c2)',carol:'var(--c3)'};
  // bars: [{label, st, en, alloc:[[node,[idx]]], color, dash?}]
  function gantt(box,bars,T,label,marks){
    const W=SC.width(box),L=46,R=8,top=8,rh=W<500?13:16,gap=5,H=top+12*rh+2*gap+30;
    const x=s=>L+(W-L-R)*s/T,y=i=>top+i*rh+Math.floor(i/4)*gap;
    let b='';ROWS.forEach((r,i)=>{b+=SC.rect(L,y(i),W-L-R,rh-2,'var(--soft)',{rx:1});if(r[1]===0||W>=500)b+=SC.t(L-4,y(i)+rh-4,r[0]+' g'+r[1],{a:'end',fs:9.5,fill:'var(--mute)'})});
    const step=T>600?120:60;for(let s=0;s<=T;s+=step){const xx=x(s);b+='<line x1="'+xx+'" x2="'+xx+'" y1="'+top+'" y2="'+(y(11)+rh)+'" stroke="var(--line)"/>'+SC.t(xx,y(11)+rh+12,s/60,{a:'middle',fs:10,fill:'var(--mute)'})}
    b+=SC.t(L+(W-L-R)/2,y(11)+rh+25,'minutes',{a:'middle',fs:10,fill:'var(--mute)'});
    (marks||[]).forEach(m=>{b+='<line x1="'+x(m[0])+'" x2="'+x(m[0])+'" y1="'+(top-4)+'" y2="'+(y(11)+rh)+'" stroke="var(--bad)" stroke-dasharray="3 2"/>'});
    bars.forEach(br=>{const rows=[];br.alloc.forEach(([n,idx])=>idx.forEach(g=>{const i=ROWS.findIndex(r=>r[0]===n&&r[1]===g);if(i>=0)rows.push(i)}));
      rows.forEach(i=>{b+=SC.rect(x(br.st),y(i)+1,x(br.en)-x(br.st),rh-3,br.color,{op:br.op||0.9,stroke:br.dash?'var(--ink)':null,dash:br.dash})});
      if(rows.length&&x(br.en)-x(br.st)>18){const mid=(y(Math.min(...rows))+y(Math.max(...rows))+rh)/2;b+=SC.t((x(br.st)+x(br.en))/2,mid+3,br.label,{a:'middle',fs:11,w:600,fill:'var(--bg)'})}});
    box.innerHTML=SC.svg(W,H,b,label);
  }
  window.SC_GANTT12=gantt;
  function w2(){if(!D.w2||!$('sc-w2-svg'))return;const T=Math.max(...D.w2.map(j=>j.en));
    gantt($('sc-w2-svg'),D.w2.map(j=>({label:j.name.replace('sc-fs-',''),st:j.st,en:j.en,alloc:j.alloc,color:UC[j.user]})),T,'Fairshare run Gantt chart')}
  function w3(){if(!D.w3||!$('sc-w3-svg')||!D.w3al)return;const T=Math.max(...D.w3al.map(j=>j.en));
    gantt($('sc-w3-svg'),D.w3al.map(j=>({label:j.label,st:j.st,en:j.en,alloc:j.alloc,color:UC[j.user],op:j.killed?0.45:0.9,dash:j.killed?'3 2':null})),T,'Preemption run Gantt chart',[[D.w3al.find(j=>j.label==='urgent').sub]])}
  SC.onRender(w2);SC.onRender(w3);w2();w3();
})();
