// ---- Reading top: the hero diagram (power in, heat out, multiplied by lockstep) and section 5's fault-escalation diagram ----
// Shared box-chain drawer: boxes in a row when wide, a two-column snake (hero) or a single column (escalation) when narrow.
(function(){
  const $=id=>document.getElementById(id);
  if(!$('pw-hero-svg')&&!$('pw-esc'))return;
  const esc=RD.esc;
  // bands: [{title, col, boxes:[[title, sub], ...], dash:[indices drawn dashed, unlinked]}]
  function chain(el,bands,o){
    const W=RD.width(el),narrow=W<(o.minW||600),gap=narrow?16:22,bh=42,th=o.titles?20:0,l=2,r=2;
    let y=4,s='<defs><marker id="'+o.id+'-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--mute)"/></marker></defs>';
    bands.forEach(B=>{
      if(o.titles){s+=RD.t(l,y+13,esc(B.title),{fs:12,w:600,fill:B.col});y+=th}
      const n=B.boxes.length,cols=narrow?(o.snake?2:1):n,bw=(W-l-r-(cols-1)*gap)/cols;
      const pos=B.boxes.map((_,i)=>{const row=Math.floor(i/cols);let c=i%cols;if(o.snake&&narrow&&row%2===1)c=cols-1-c;return {x:l+c*(bw+gap),y:y+row*(bh+gap),row}});
      B.boxes.forEach((b,i)=>{const p=pos[i],dash=B.dash&&B.dash.indexOf(i)>=0;
        s+='<rect x="'+p.x.toFixed(1)+'" y="'+p.y+'" width="'+bw.toFixed(1)+'" height="'+bh+'" rx="6" fill="var(--bg)" stroke="'+B.col+'" stroke-width="1.6"'+(dash?' stroke-dasharray="5 3"':'')+'/>';
        s+=RD.t(p.x+8,p.y+17,esc(b[0]),{fs:11.5,w:600});
        s+=RD.t(p.x+8,p.y+33,esc(b[1]),{fs:11,fill:'var(--mute)'});
        if(i>0&&!dash){const q=pos[i-1];let x1,y1,x2,y2;
          if(q.row===p.row){if(p.x>q.x){x1=q.x+bw;x2=p.x}else{x1=q.x;x2=p.x+bw}y1=y2=p.y+bh/2}
          else{x1=x2=q.x+bw/2;y1=q.y+bh;y2=p.y}
          s+='<line x1="'+(x1+(x2>x1?2:x2<x1?-2:0)).toFixed(1)+'" y1="'+(y1+(y2>y1?2:0))+'" x2="'+(x2-(x2>x1?2:x2<x1?-2:0)).toFixed(1)+'" y2="'+(y2-(y2>y1?2:0))+'" stroke="var(--mute)" stroke-width="1.4" marker-end="url(#'+o.id+'-ah)"/>'}});
      const rows=Math.max(...pos.map(p=>p.row))+1;y+=rows*bh+(rows-1)*gap+14});
    el.innerHTML=RD.svg(W,y,s,o.label)}
  const HERO=[
    {title:'Power in (a 1 GW site)',col:'var(--c1)',boxes:[['Grid connection','1 GW, high voltage'],['Substation, UPS, cooling','PUE 1.2: 167 MW lost'],['GB200 NVL72 rack','~120 kW, 54 V busbar'],['One Blackwell GPU','up to 1,200 W']]},
    {title:'Heat out (every watt)',col:'var(--c2)',boxes:[['GPU die','every watt becomes heat'],['Cold plate on chip','liquid, not air'],['Coolant distribution','to facility water'],['Cooling tower','heat and water out']]},
    {title:'Multiplied by lockstep (Llama 3)',col:'var(--acc)',boxes:[['16,384 GPUs, one step','compute, then all wait'],['Load swings','tens of MW per step'],['Any part fails','job stops every 3.1 h']]}];
  const ESC=[{title:'',col:'var(--c1)',boxes:[['1 bit flips','ECC corrects, counts'],['2 bits flip','uncorrectable, job dies'],['Row keeps failing','spare row after reset'],['Bank out of spares','replace the GPU'],['Multiplier errs','no ECC: silent (sec. 7)']],dash:[4]}];
  function draw(){if($('pw-hero-svg'))chain($('pw-hero-svg'),HERO,{id:'pwh',titles:true,snake:true,minW:740,label:'Power flows from a 1 GW grid connection to a 1,200 W GPU, every watt leaves as heat through a cold plate and the facility water loop, and lockstep training multiplies swings and failures'});
    if($('pw-esc'))chain($('pw-esc'),ESC,{id:'pwe',titles:false,snake:false,minW:820,label:'Memory faults escalate from a corrected bit to an uncorrectable error, a remapped row and a replaced GPU; an arithmetic error has no ECC and is silent'})}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
