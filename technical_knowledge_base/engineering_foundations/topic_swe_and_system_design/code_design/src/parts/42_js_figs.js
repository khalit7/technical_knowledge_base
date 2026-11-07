// ---- Reading figures added in the 2026-10-24 rebuild: composition, wrong abstraction, agent loop, debt quadrant, deprecation timeline
// (the hero, the layers diagram and the depth chart became the 3D stages of 44 to 47 on 2026-11-07) ----
(function(){
  const CD=window.CD, esc=RD.esc, T=RD.t, $=id=>document.getElementById(id);
  // wrap a string into lines of at most n characters (SVG text does not wrap)
  const wrap=(s,n)=>{const out=[];let cur='';s.split(' ').forEach(w=>{if((cur+' '+w).trim().length>n&&cur){out.push(cur);cur=w}else cur=(cur+' '+w).trim()});if(cur)out.push(cur);return out};
  const lines=(x,y,arr,o,lh)=>arr.map((l,i)=>T(x,y+i*(lh||14),esc(l),o)).join('');
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.rx==null?6:o.rx)+'" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'"'+(o.dash?' stroke-dasharray="5 4"':'')+' stroke-width="'+(o.sw||1.2)+'"/>'};
  const defs='<defs><marker id="cd-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker></defs>';
  const arrow=(x1,y1,x2,y2,dash)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.4"'+(dash?' stroke-dasharray="5 4"':'')+' marker-end="url(#cd-ar)"/>';

  // ---- composition against inheritance ----
  let K=3;const PROV=['Http','Local'],FEAT=[['R','Retrying'],['C','Cached'],['L','Logged']];
  function comp(){
    const el=$('ci-svg');if(!el)return;const W=Math.min(860,RD.width(el)),narrow=W<560;
    const m=PROV.length,inh=m*Math.pow(2,K),cmp=m+K;
    $('ci-title').textContent='With '+K+' optional feature'+(K>1?'s':'')+', inheritance needs '+inh+' classes; composition needs '+cmp;
    const pw=narrow?W:W*0.6-10,bw=narrow?(W-8)/4-6:Math.min(86,(pw-8)/4-6),bh=24;let b='',y=16;
    b+=T(4,y,'Inheritance: a subclass per combination ('+m+' \u00d7 2^'+K+' = '+inh+')',{fs:12,w:600});y+=8;
    const names=[];PROV.forEach(p=>{for(let s=0;s<Math.pow(2,K);s++){let n=p;FEAT.slice(0,K).forEach((f,j)=>{if(s>>j&1)n+=f[0]});names.push(n)}});
    names.forEach((n,i)=>{const x=4+(i%4)*(bw+6),yy=y+Math.floor(i/4)*(bh+6);b+=box(x,yy,bw,bh,{stroke:'var(--bad)',rx:4})+T(x+6,yy+16,esc(n+(narrow?'':'Model')),{fs:11})});
    let y2=y+Math.ceil(names.length/4)*(bh+6)+10;
    const cx=narrow?4:pw+20,cy=narrow?y2+12:16,cwid=narrow?W-8:W-pw-24;
    b+=T(cx,cy,'Composition: '+m+' + '+K+' = '+cmp+' classes, stacked',{fs:12,w:600});
    const stack=FEAT.slice(0,K).map(f=>f[1]).reverse().concat(['HttpChatModel']);
    stack.forEach((s,i)=>{const inset=i*10,x=cx+inset,yy=cy+8+i*(bh+4);b+=box(x,yy,Math.max(80,cwid-2*inset),bh,{stroke:i===stack.length-1?'var(--c1)':'var(--good)',rx:4})+T(x+6,yy+16,esc(s+(i<stack.length-1?'(':'(...)')),{fs:11})});
    const yEnd=cy+8+stack.length*(bh+4);
    b+=T(cx,yEnd+14,'or LocalChatModel at the bottom: 2 providers',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,Math.max(y2,yEnd+20)+(narrow?4:0),b,'Classes needed by inheritance against composition');
  }
  const seg=$('ci-seg');if(seg)RD.seg(seg,v=>{K=+v;comp()});

  // ---- the wrong abstraction, step by step (illustrative code; Metz's sequence) ----
  const WA=[
   ['Two copies: wince, and leave them','Summary and title prompts both render a transcript. Two copies cannot yet show what varies.',
    ['# summarize.py','text = "\\n".join(f"{m.role}: {m.content}" for m in msgs)','# title.py','text = "\\n".join(f"{m.role}: {m.content}" for m in msgs[:6])'],[]],
   ['Third copy: extract render()','The export job needs it too. Now the variation (how many messages) is visible, so the function fits all three callers.',
    ['def render(msgs, limit=None):','    msgs = msgs[:limit] if limit else msgs','    return "\\n".join(f"{m.role}: {m.content}" for m in msgs)'],[0,1,2]],
   ['A new case is almost like it: add a flag','Export wants timestamps. Adding a parameter and an if is the cheapest edit today.',
    ['def render(msgs, limit=None, with_times=False):','    msgs = msgs[:limit] if limit else msgs','    if with_times:','        return "\\n".join(f"{m.at:%H:%M} {m.role}: {m.content}" for m in msgs)','    return "\\n".join(f"{m.role}: {m.content}" for m in msgs)'],[0,2,3]],
   ['Repeat: a knot of flags every caller depends on','Evals want system messages hidden and tool calls redacted. Each caller passes a different mix of flags; nobody dares to change render().',
    ['def render(msgs, limit=None, with_times=False, hide_system=False, redact_tools=False):','    msgs = msgs[:limit] if limit else msgs','    if hide_system:','        msgs = [m for m in msgs if m.role != "system"]','    out = []','    for m in msgs:','        c = "[tool call]" if redact_tools and m.tool else m.content','        out.append((f"{m.at:%H:%M} " if with_times else "") + f"{m.role}: {c}")','    return "\\n".join(out)'],[0,2,3,4,5,6,7,8]],
   ['Back out: inline into every caller, keep only its branch','Metz\'s remedy. Each caller keeps the one or two lines it uses; what is left in common is small and real: formatting one message.',
    ['def fmt(m): return f"{m.role}: {m.content}"       # the real shared part','# summarize.py','text = "\\n".join(fmt(m) for m in msgs)','# export.py','text = "\\n".join(f"{m.at:%H:%M} {fmt(m)}" for m in msgs)','# eval.py','text = "\\n".join(fmt(m) for m in msgs if m.role != "system")'],[0,2,4,6]]];
  if($('wa-card')){
    // the step titles and explanations are the ol.sx list beside the card (20_read_b.html); WA keeps them for reference
    RD.anim({card:'wa-card',ctl:'wa-ctl',n:WA.length,ms:4200,label:'Wrong abstraction step',list:'sx-wa',draw:i=>{const f=WA[i];
      RD.code($('wa-code'),f[2],f[2].map((_,j)=>f[3].includes(j)?'add':''))}});
  }

  // ---- the agent loop ----
  function agent(){
    const el=$('ag-svg');if(!el)return;const W=Math.min(760,RD.width(el)),narrow=W<560;
    const bw=narrow?W-70:Math.min(300,W*0.42),bh=narrow?46:40,gap=22,x=4;
    const S=[['1. Read','small cohesive files, names that say why'],['2. Edit behind a seam','a port, an injected collaborator'],['3. Run the check','tests, types, lint: pass or fail'],['4. Read the result','red: back to 2; green: done']];
    let b=defs;S.forEach((s,i)=>{const y=4+i*(bh+gap),hl=i===2;b+=box(x,y,bw,bh,{stroke:hl?'var(--acc)':'var(--line)',sw:hl?2.2:1.2})+T(x+10,y+17,esc(s[0]),{fs:12,w:600})+T(x+10,y+33,esc(s[1]),{fs:11,fill:'var(--mute)'});
      if(i<S.length-1)b+=arrow(x+bw/2,y+bh+2,x+bw/2,y+bh+gap-3)});
    // loop back from 4 to 2
    const y2=4+(bh+gap)+bh/2,y4=4+3*(bh+gap)+bh/2,lx=x+bw+(narrow?30:24);
    b+='<path d="M'+(x+bw)+','+y4+' H'+lx+' V'+y2+' H'+(x+bw+4)+'" fill="none" stroke="var(--bad)" stroke-width="1.4" marker-end="url(#cd-ar)"/>'+T(lx+4,(y2+y4)/2,'red',{fs:11,fill:'var(--bad)'});
    if(!narrow){const ax=lx+40,y3=4+2*(bh+gap);
      b+=lines(ax,y3+4,['Checks on this page:','14 tests caught step 8 (401 vs 422)','ruff BLE001 flags the blind except','mypy is blind to untyped code'],{fs:11,fill:'var(--ink)'},15)}
    el.innerHTML=RD.svg(W,4+4*bh+3*gap+6,b,'The agent loop: read, edit, run the check, read the result');
  }

  // ---- technical debt quadrant (Fowler 2009; cell texts paraphrased) ----
  function debt(){
    const el=$('debt-svg');if(!el)return;const W=Math.min(640,RD.width(el)),lab=W<420?78:96,cw=(W-lab-8)/2,ch=W<420?92:78;
    const C=[['Reckless','Deliberate','We know better but go quick and dirty, saying there is no time for design'],['Prudent','Deliberate','Ship now, knowingly, and pay it down after the release'],
             ['Reckless','Inadvertent','We did not know good design practices: a mess'],['Prudent','Inadvertent','Now we know what the design should have been']];
    let b=T(lab+cw/2,14,'Reckless',{a:'middle',fs:12,w:600,fill:'var(--bad)'})+T(lab+cw*1.5+4,14,'Prudent',{a:'middle',fs:12,w:600,fill:'var(--good)'});
    ['Deliberate','Inadvertent'].forEach((r,i)=>{b+=T(4,24+i*(ch+4)+ch/2,r,{fs:12,w:600})});
    const n=Math.floor((cw-16)/6.4);
    C.forEach((c,i)=>{const x=lab+(i%2)*(cw+4),y=22+Math.floor(i/2)*(ch+4);b+=box(x,y,cw,ch,{stroke:i%2?'var(--good)':'var(--bad)',fill:'var(--soft)'})+lines(x+8,y+20,wrap(c[2],n),{fs:11.5},15)});
    el.innerHTML=RD.svg(W,22+2*ch+8,b,'Technical debt quadrant: reckless or prudent, deliberate or inadvertent');
  }

  // ---- deprecation timeline ----
  function tl(){
    const el=$('dep-tl');if(!el)return;const W=Math.min(760,RD.width(el)),narrow=W<520,pad=narrow?58:60;
    const V=[['0.3.0','limit= added; max_chars= still works and warns'],['0.4.0','still warns: users\' test runs show it'],['0.5.0','max_chars= removed: TypeError']];
    const xs=V.map((_,i)=>pad+i*(W-2*pad)/2),n=narrow?15:26;let b='';
    b+='<rect x="'+xs[0]+'" y="10" width="'+(xs[2]-xs[0])+'" height="16" rx="4" fill="var(--hl)"/>'+T((xs[0]+xs[2])/2,22,'DeprecationWarning window: at least two releases',{a:'middle',fs:11});
    b+='<line x1="'+(pad-20)+'" y1="44" x2="'+(W-pad+20)+'" y2="44" stroke="var(--line)" stroke-width="2"/>';
    V.forEach((v,i)=>{b+='<circle cx="'+xs[i]+'" cy="44" r="6" fill="'+(i===2?'var(--bad)':'var(--acc)')+'"/>'+T(xs[i],66,v[0],{a:'middle',fs:12,w:600})+wrap(v[1],n).map((l,j)=>T(xs[i],82+j*14,esc(l),{a:'middle',fs:11,fill:'var(--mute)'})).join('')});
    el.innerHTML=RD.svg(W,narrow?136:112,b,'Deprecation timeline from 0.3.0 to 0.5.0');
  }

  const all=()=>{comp();agent();debt();tl()};
  all();RD.onResize(all);RD.onRender(all);
})();
