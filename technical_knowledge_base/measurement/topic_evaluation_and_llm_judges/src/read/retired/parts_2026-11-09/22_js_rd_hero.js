// ---- Reading, top: the hero figure. One eval reading as seven parts, each with the child page that owns it; ----
// the three parts that can each move a score (system, grader, gold labels) are outlined in the highlight colour.
// Static: drawn at the measured width, horizontal from 760 px, a vertical stack below.
(function(){
  const host=document.getElementById('rd-hero');if(!host)return;
  const N={
    items:{t:'Items',s:['golden set, traffic','or a benchmark'],o:['Production eval','engineering']},
    harn:{t:'Harness',s:['prompt, template,','answer extraction'],o:['Eval harnesses']},
    sys:{t:'Model or system',s:['one model, an agent','or a RAG app'],o:['Agent eval,','RAG eval'],f:1},
    grader:{t:'Grader',s:['program, LLM judge','or people'],o:['LLM-as-judge,','Human evaluation'],f:1},
    gold:{t:'Gold labels',s:['references, rubric,','human labels'],o:['Human evaluation'],f:1},
    score:{t:'Score ± error',s:['a mean over a','sample of items'],o:['Eval statistics']},
    dec:{t:'Decision',s:['gate, ship,','roll back'],o:['Production eval','engineering']}
  };
  const main=['items','harn','sys','grader','score','dec'];
  const T=RD.t;
  function box(x,y,w,h,n,wide){
    const stroke=n.f?'var(--acc)':'var(--line)',sw=n.f?2.2:1;
    let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="var(--soft)" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
    if(wide){
      s+=T(x+w/2,y+18,n.t,{a:'middle',fs:12.5,w:600,fill:n.f?'var(--acc)':'var(--ink)'});
      n.s.forEach((l,i)=>{s+=T(x+w/2,y+35+i*14,l,{a:'middle',fs:11,fill:'var(--ink)'})});
      n.o.forEach((l,i)=>{s+=T(x+w/2,y+h-10-(n.o.length-1-i)*13,l,{a:'middle',fs:11,fill:'var(--mute)'})});
    }else{
      s+=T(x+10,y+18,n.t,{fs:12.5,w:600,fill:n.f?'var(--acc)':'var(--ink)'});
      s+=T(x+10,y+34,n.s.join(' '),{fs:11,fill:'var(--ink)'});
      s+=T(x+10,y+49,'page: '+n.o.join(' '),{fs:11,fill:'var(--mute)'});
    }
    return s;
  }
  const arrow=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.4" marker-end="url(#rdh-ar)"/>';
  const defs='<defs><marker id="rdh-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker></defs>';
  function draw(){
    const W=Math.min(900,RD.width(host));let s=defs,H;
    if(W>=760){
      const pad=4,gap=16,bw=(W-2*pad-5*gap)/6,bh=92,y0=8;
      const X=i=>pad+i*(bw+gap);
      main.forEach((k,i)=>{s+=box(X(i),y0,bw,bh,N[k],true);if(i<5)s+=arrow(X(i)+bw+1,y0+bh/2,X(i+1)-2,y0+bh/2)});
      const gx=X(3),gy=y0+bh+40;
      s+=box(gx,gy,bw,bh-10,N.gold,true);
      s+=arrow(gx+bw/2,gy-1,gx+bw/2,y0+bh+3);
      s+=T(gx+bw/2+8,y0+bh+24,'compared with',{fs:11,fill:'var(--mute)'});
      s+=T(X(0),gy+20,'Three parts can each move a score:',{fs:11.5,fill:'var(--ink)'});
      s+=T(X(0),gy+36,'the system, the grader, the gold labels.',{fs:11.5,fill:'var(--ink)'});
      s+=T(X(0),gy+52,'Attribute a change before acting (section 5).',{fs:11.5,fill:'var(--mute)'});
      H=gy+bh;
    }else{
      const x=2,bw=W-4,bh=58,gap=20;let y=4;
      const order=['items','harn','sys','grader','gold','score','dec'];
      order.forEach((k,i)=>{
        const ind=k==='gold'?22:0;
        s+=box(x+ind,y,bw-ind,bh,N[k],false);
        if(i<order.length-1){
          if(k==='grader'){s+=T(x+30,y+bh+14,'↑ compared with',{fs:11,fill:'var(--mute)'})}
          else s+=arrow(x+bw/2,y+bh+1,x+bw/2,y+bh+gap-2);
        }
        y+=bh+gap;
      });
      H=y-gap+4;
    }
    host.innerHTML=RD.svg(W,H,s,'An eval reading: items go through a harness to the model or system; its output is graded against gold labels; the score has an error bar and feeds a decision. Model, grader and gold labels are outlined as the three parts that can move a score.');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
