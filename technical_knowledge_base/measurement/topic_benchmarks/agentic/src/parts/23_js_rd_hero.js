// ---- Reading, top: the hero figure. One agentic run (task, agent = model + harness + settings, environment, checker, score)
// with the four numbered places where the same weights get a different number (legend in HTML under the figure). Static. ----
(function(){
  const fig=document.getElementById('hero-fig');if(!fig)return;
  const T=RD.t;
  function box(x,y,w,h,title,sub,o){o=o||{};
    let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1.5)+'"'+(o.dash?' stroke-dasharray="5 4"':'')+'/>';
    s+=T(x+10,y+18,title,{fs:12.5,w:600,fill:'var(--ink)'});
    (sub||[]).forEach((l,i)=>{s+=T(x+10,y+34+i*15,l,{fs:11,fill:'var(--mute)'})});
    return s}
  const badge=(x,y,n)=>'<circle cx="'+x+'" cy="'+y+'" r="10" fill="var(--bad)"/>'+T(x,y+4,n,{a:'middle',fs:11.5,w:700,fill:'var(--bg)'});
  const arrow=(x1,y1,x2,y2,lab,o)=>{o=o||{};const a=Math.atan2(y2-y1,x2-x1),h=7;
    let s='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.6"/>'+
      '<path d="M'+x2+','+y2+' L'+(x2-h*Math.cos(a-0.45))+','+(y2-h*Math.sin(a-0.45))+' L'+(x2-h*Math.cos(a+0.45))+','+(y2-h*Math.sin(a+0.45))+' Z" fill="var(--mute)"/>';
    if(lab)s+=T(o.lx!=null?o.lx:(x1+x2)/2,o.ly!=null?o.ly:(y1+y2)/2-5,lab,{a:o.a||'middle',fs:11,fill:'var(--mute)'});
    return s};
  function draw(){
    const W=RD.width(fig);let b='',H;
    if(W>=720){
      const gAB=100,gBC=84,colA=Math.min(230,W*0.27),colC=Math.min(190,W*0.22),colB=W-colA-colC-gAB-gBC;
      const xA=0,xB=colA+gAB,xC=xB+colB+gBC;
      // task
      b+=box(0,0,W,44,'Task: an instruction, an initial state, and limits',['time, steps, CPU and memory are part of the task (Terminal-Bench 4.0: a flat 8 hours)'],{});
      b+=arrow(colA/2,44,colA/2,62)+arrow(xB+colB/2,44,xB+colB/2,62);
      // agent
      b+=box(xA,62,colA,214,'Agent',[],{fill:'var(--bg)',stroke:'var(--acc)',sw:2});
      b+=box(xA+10,90,colA-20,46,'Model',['the weights'],{});
      b+=box(xA+10,144,colA-20,62,'Harness',['loop, tools, context policy','Claude Code, Codex, Pi, ...'],{stroke:'var(--bad)',sw:2});
      b+=box(xA+10,214,colA-20,52,'Settings',['effort, step and token caps'],{});
      b+=badge(xA+colA-22,158,'1');
      // environment
      b+=box(xB,62,colB,128,'Environment',['container, VM, websites,','simulated user, MCP servers','(the agent can change it)'],{});
      b+=arrow(colA,120,xB,120,'actions');
      b+=arrow(xB,166,colA,166,'observations');
      // boundary and checker
      const bx=xC-14;
      b+='<line x1="'+bx+'" y1="56" x2="'+bx+'" y2="290" stroke="var(--bad)" stroke-width="2" stroke-dasharray="6 4"/>';
      b+=badge(bx,206,'3');
      b+=T(bx-8,284,'out of the agent\'s reach?',{a:'end',fs:11,fill:'var(--bad)'});
      b+=box(xC,62,colC,128,'Checker',['tests on the end state,','answer match, DB state,','judge model, experts'],{});
      b+=arrow(xB+colB,126,xC,126,'end state',{lx:(xB+colB+bx)/2});
      // score
      b+=box(xC,214,colC,62,'Score',['per task, over n trials;','one version, one metric'],{stroke:'var(--acc)',sw:2});
      b+=arrow(xC+colC/2,190,xC+colC/2,214);
      b+=badge(xC+colC-34,228,'2')+badge(xC+colC-12,228,'4');
      H=300;
    }else{
      const x=0,w=W-34,bx=W-14;
      let y=0;
      b+=box(x,y,w,44,'Task',['instruction, initial state, limits'],{});y+=44;b+=arrow(w/2,y,w/2,y+16);y+=16;
      b+=box(x,y,w,176,'Agent',[],{fill:'var(--bg)',stroke:'var(--acc)',sw:2});
      b+=box(x+10,y+26,w-20,40,'Model',['the weights'],{});
      b+=box(x+10,y+72,w-20,48,'Harness',['loop, tools, context policy'],{stroke:'var(--bad)',sw:2});
      b+=box(x+10,y+126,w-20,40,'Settings',['effort, step and token caps'],{});
      b+=badge(bx,y+96,'1');y+=176;
      b+=arrow(w/2-30,y,w/2-30,y+20)+T(w/2-36,y+14,'actions',{a:'end',fs:11,fill:'var(--mute)'});
      b+=arrow(w/2+30,y+20,w/2+30,y)+T(w/2+36,y+14,'observations',{fs:11,fill:'var(--mute)'});y+=20;
      b+=box(x,y,w,58,'Environment',['container, VM, websites, simulated','user, MCP servers (agent can change it)'],{});y+=58;
      b+='<line x1="0" y1="'+(y+12)+'" x2="'+w+'" y2="'+(y+12)+'" stroke="var(--bad)" stroke-width="2" stroke-dasharray="6 4"/>';
      b+=T(4,y+26,'out of the agent\'s reach?',{fs:11,fill:'var(--bad)'});b+=badge(bx,y+12,'3');y+=32;
      b+=box(x,y,w,44,'Checker',['tests, answer match, DB state, judge'],{});y+=44;b+=arrow(w/2,y,w/2,y+16);y+=16;
      b+=box(x,y,w,44,'Score',['over n trials; one version, one metric'],{stroke:'var(--acc)',sw:2});
      b+=badge(bx,y+12,'2')+badge(bx,y+34,'4');y+=46;
      H=y+2;
    }
    fig.innerHTML=RD.svg(W,H,b,'One agentic run and four places where the score moves');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
  // charts inside closed blocks measure their width when the block opens
  document.querySelectorAll('#t-read details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)dispatchEvent(new Event('resize'))}));
})();
