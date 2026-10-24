// ---- Reading tab figures (static diagrams and data figures, drawn at the measured width; nothing moves) ----
(function(){
if(!document.getElementById('ftyped-hero'))return;
const F=window.FT,E=RD.esc;
const CH=6.3; // approximate width of one 11.5 px character, for wrapping SVG labels
function wrap(s,px,fs){const per=Math.max(6,Math.floor(px/((fs||11.5)*CH/11.5)));const out=[];let line='';
  String(s).split(' ').forEach(w=>{if(!line)line=w;else if((line+' '+w).length<=per)line+=' '+w;else{out.push(line);line=w}});if(line)out.push(line);return out}
function txt(x,y,lines,o){o=o||{};const fs=o.fs||11.5,lh=o.lh||fs*1.3;if(!Array.isArray(lines))lines=[lines];
  return lines.map((l,i)=>'<text x="'+x+'" y="'+(y+i*lh)+'" font-size="'+fs+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' fill="'+(o.fill||'var(--ink)')+'"'+(o.w?' font-weight="'+o.w+'"':'')+(o.mono?' font-family="ui-monospace,Menlo,monospace"':'')+'>'+E(l)+'</text>').join('')}
function box(x,y,w,h,o){o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.rx==null?7:o.rx)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+'/>'}
function arrow(x1,y1,x2,y2,o){o=o||{};const c=o.c||'var(--mute)';const a=Math.atan2(y2-y1,x2-x1),L=7;
  return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+(o.sw||1.4)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+'/>'+
    '<path d="M'+x2+' '+y2+' L'+(x2-L*Math.cos(a-0.45))+' '+(y2-L*Math.sin(a-0.45))+' L'+(x2-L*Math.cos(a+0.45))+' '+(y2-L*Math.sin(a+0.45))+'Z" fill="'+c+'"/>'}
const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+E(label)+'">'+body+'</svg>';
const W=id=>Math.min(860,RD.width(document.getElementById(id)));
const by=(a,k)=>a.reduce((m,x)=>((m[x[k]]=m[x[k]]||[]).push(x),m),{});
const R=by(F.so,'route');

// 1. hero: types to request (three routes) to server to model to validation to result
function hero(){const el=document.getElementById('ftyped-hero');const w=W('ftyped-hero');const pad=4,cw=w-2*pad;let y=4,b='';
  const narrow=w<560,fs=narrow?11:12;
  // your Python
  const h1=62;b+=box(pad,y,cw,h1,{fill:'var(--bg)'});
  b+=txt(pad+10,y+18,'Your Python',{w:600,fs});
  b+=txt(pad+10,y+36,narrow?['def edit_file(path: str, ...)','class Triage(BaseModel); deps=Case(...)']:['def edit_file(path: str, old: str, new: str, count: int = 1) -> str','class Triage(BaseModel): ...        deps = Case(code, test_output)'],{mono:1,fs:11,fill:'var(--mute)',lh:14});
  y+=h1;b+=arrow(w/2,y+2,w/2,y+22);b+=txt(w/2+8,y+16,'library derives JSON Schemas',{fs:11,fill:'var(--mute)'});y+=26;
  // request with three slots
  const g=8,sw=(cw-2*g)/3;const slots=[['tools[ ]','edit_file, ...','final_result','= the schema','Tool-forced'],['response_format','= the schema','','','Native'],['system text','"... reply with','JSON matching:"','+ the schema','Prompted']];
  const hr=narrow?102:86;b+=txt(pad,y+12,'The request',{w:600,fs});y+=18;
  slots.forEach((s,i)=>{const x=pad+i*(sw+g);b+=box(x,y,sw,hr,{fill:'var(--bg)',stroke:'var(--acc)',sw:1.6});
    b+=txt(x+sw/2,y+16,s[4],{a:'middle',w:700,fill:'var(--acc)',fs});
    b+=txt(x+sw/2,y+34,[s[0],s[1],s[2],s[3]].filter(Boolean),{a:'middle',fs:11,mono:1,lh:14})});
  y+=hr;slots.forEach((s,i)=>{const x=pad+i*(sw+g)+sw/2;b+=arrow(x,y+2,x,y+22)});y+=26;
  // server
  const srv=[['renders tools into','the chat template','reaches the model','var(--good)'],['mlx-lm 0.32.0','never reads it','model never sees it','var(--bad)'],['text is text','','reaches the model','var(--good)']];
  const hs=64;b+=txt(pad,y+12,'The server',{w:600,fs});y+=18;
  srv.forEach((s,i)=>{const x=pad+i*(sw+g);b+=box(x,y,sw,hs,{fill:'var(--soft)',stroke:s[3],sw:1.4});
    b+=txt(x+sw/2,y+17,[s[0],s[1]].filter(Boolean),{a:'middle',fs:11,lh:14});b+=txt(x+sw/2,y+52,s[2],{a:'middle',fs:11,w:700,fill:s[3]})});
  y+=hs;const tx=pad+(narrow?cw*0.58:cw*0.5)/2;[0,2].forEach(i=>{const x=pad+i*(sw+g)+sw/2;b+=arrow(x,y+2,tx+(i?24:-24),y+24)});
  {const x=pad+sw+g+sw/2;b+=arrow(x,y+2,tx,y+24,{c:'var(--bad)',dash:1});b+=txt(x+6,y+14,'no schema: prose',{fs:11,fill:'var(--bad)'})}y+=28;
  // model, validation, result, with retry loop on the right
  const mw=narrow?cw*0.58:cw*0.5,mx=pad;const rh=36;
  const rows=[['Model reply','var(--soft)','var(--line)'],['Validate: Pydantic types, then your validator(ctx.deps)','var(--soft)','var(--acc)'],['Typed result: Triage(function=..., category=...)','var(--soft)','var(--good)']];
  const ys=[];rows.forEach((r,i)=>{ys.push(y);const lines=wrap(r[0],mw-16,11.5);const h=Math.max(rh,lines.length*15+12);b+=box(mx,y,mw,h,{stroke:r[2],sw:1.4});b+=txt(mx+8,y+h/2-(lines.length-1)*7.5+4,lines,{lh:15});
    y+=h;if(i<rows.length-1){b+=arrow(mx+mw/2,y+2,mx+mw/2,y+18);b+=txt(mx+mw/2+8,y+14,i===0?'':'passes',{fs:11,fill:'var(--good)'});y+=20}});
  // retry box
  const rx=mx+mw+18,rw=cw-mw-18,ry=ys[0];const rl=wrap('Retry prompt: the error plus "Fix the errors and try again."',rw-14,11);
  const rhh=rl.length*14+30;b+=box(rx,ry,rw,rhh,{fill:'var(--bg)',stroke:'var(--bad)',dash:1});b+=txt(rx+7,ry+16,rl,{fs:11,lh:14});
  b+=txt(rx+7,ry+rhh-9,rw<170?'budget: 1 retry':'budget: 1 retry (default)',{fs:11,fill:'var(--mute)'});
  b+=arrow(mx+mw,ys[1]+16,rx,ry+rhh-6,{c:'var(--bad)'});b+=txt(mx+mw+4,ys[1]+12,'fails',{fs:11,fill:'var(--bad)'});
  b+=arrow(rx,ry+12,mx+mw,ys[0]+12,{c:'var(--bad)'});
  y+=12;
  // band
  const band='Wrapped around the calls: retries, handoffs (transfer_to_...), guardrails, a code executor, sessions and state, tracing';
  const bl=wrap(band,cw-16,11.5);const bh=bl.length*15+14;b+=box(pad,y,cw,bh,{fill:'var(--soft)',stroke:'var(--line)'});b+=txt(pad+8,y+18,bl,{lh:15});y+=bh+4;
  el.innerHTML=svg(w,y,b,'Diagram: your typed Python becomes schemas in the request (tool, native field or prompt text); the local server drops the native field; the reply is validated and a failure is sent back as a retry prompt until a typed result comes out.');}

// 2. schema matrix: what the model is told about each parameter
function schfig(){const el=document.getElementById('ftyped-schfig');const w=W('ftyped-schfig');const S=F.schemas;
  const libs=[['pydantic_ai','Pydantic AI'],['openai_agents','Agents SDK'],['smolagents','smolagents'],['google_adk','Google ADK']];
  const ps=['path','old','new','count'];const narrow=w<560,lw=narrow?84:150,cw=(w-lw-4)/4,rh=narrow?48:40,top=24;let b='';
  ps.forEach((p,j)=>{b+=txt(lw+j*cw+cw/2,16,p,{a:'middle',w:700,mono:1})});
  libs.forEach(([k,n],i)=>{const s=S[k],P=s.parameters||s.parameters_json_schema||{},req=P.required||[],y=top+i*rh;
    b+=txt(4,y+rh/2-(narrow?3:0),narrow?n.split(' '):[n],{w:600,fs:narrow?11:12,lh:13});
    if(s.strict)b+=txt(4,y+rh/2+(narrow?23:15),'strict',{fs:11,fill:'var(--acc)'});
    ps.forEach((p,j)=>{const f=(P.properties||{})[p]||{},r=req.includes(p),x=lw+j*cw+3,yy=y+4;
      b+=box(x,yy,cw-6,rh-8,{fill:r?'color-mix(in srgb,var(--acc) 22%,var(--bg))':'var(--bg)',stroke:r?'var(--acc)':'var(--line)'});
      const lab=r?('default' in f?'required (shows 1)':'required'):('default' in f?'default '+f.default:(f.nullable?'nullable':'optional'));
      b+=txt(x+(cw-6)/2,yy+(rh-8)/2-((wrap(lab,cw-14,11).length-1)*6.5)+4,wrap(lab,cw-14,11),{a:'middle',fs:11,lh:13});
      if(!f.description)b+='<circle cx="'+(x+cw-14)+'" cy="'+(yy+8)+'" r="4" fill="var(--bad)"/>'})});
  const h=top+libs.length*rh+20;b+='<circle cx="8" cy="'+(h-8)+'" r="4" fill="var(--bad)"/>'+txt(16,h-4,'no description for this field',{fs:11,fill:'var(--mute)'});
  el.innerHTML=svg(w,h,b,'Matrix of the four libraries against the four parameters of edit_file: which are required, which keep the default, which lack a description.');}

// 3. validity and right category per route, grouped by where the schema travelled
function sofig(){const el=document.getElementById('ftyped-sofig');const w=W('ftyped-sofig');
  const G=[['Schema in a tool',[['pai_tool','Pydantic AI, tool output (default)'],['claude_haiku_schema','Claude Haiku 4.5, --json-schema'],['claude_sonnet_schema','Claude Sonnet 5.5, --json-schema']]],
    ['Schema only in a native field',[['pai_native','Pydantic AI, NativeOutput'],['oai','Agents SDK, output_type'],['adk','Google ADK, output_schema']]],
    ['Schema as text in the prompt',[['pai_prompted','Pydantic AI, PromptedOutput'],['free','No library, free decoding'],['claude_haiku_prompt','Claude Haiku 4.5, schema in prompt'],['claude_sonnet_prompt','Claude Sonnet 5.5, schema in prompt']]],
    ['Schema in the prompt, decoding constrained (outlines)',[['constrained','No library, constrained decoding']]]];
  const narrow=w<600,lw=narrow?0:250,bw=w-lw-(narrow?8:120),bh=13;let y=4,b='';
  G.forEach(([g,rows])=>{y+=14;b+=txt(2,y,g,{w:700,fill:'var(--acc)',fs:12});y+=8;
    rows.forEach(([id,lab])=>{const a=R[id]||[],n=a.length,v=a.filter(r=>r.valid).length,c=a.filter(r=>r.valid&&r.category_ok).length;
      if(narrow){y+=14;b+=txt(2,y,lab,{fs:11.5});y+=5}else{y+=4}
      const x=narrow?2:lw;b+=box(x,y,bw,bh,{fill:'var(--bg)',stroke:'var(--line)',rx:3});
      if(v)b+=box(x,y,bw*v/n,bh,{fill:'color-mix(in srgb,var(--acc) 35%,var(--bg))',stroke:'var(--acc)',rx:3});
      if(c)b+=box(x,y+3,bw*c/n,bh-6,{fill:'var(--acc)',stroke:'none',rx:2});
      if(!narrow)b+=txt(lw-8,y+11,lab,{a:'end',fs:11.5});
      const fen=a.filter(r=>r.fenced).length;
      const vt=v+'/'+n+' valid'+(v?', '+c+' right category':'')+(id==='claude_haiku_prompt'&&fen?' ('+fen+' fenced)':'');
      if(narrow){y+=bh+13;b+=txt(2,y,vt,{fs:11,fill:'var(--mute)'})}else b+=txt(x+bw+6,y+11,vt.replace(' right category',' cat.'),{fs:11,fill:'var(--mute)'});
      y+=narrow?4:bh+4})});
  el.innerHTML=svg(w,y+8,b,'Bar chart: valid results and right-category results per structured-output route, grouped by where the schema travelled.');}

// 4. Pydantic AI retry loop
function retryfig(){const el=document.getElementById('ftyped-retryfig');const w=W('ftyped-retryfig');const narrow=w<560;
  const mw=narrow?w*0.56:w*0.5,mx=2,sx=mx+mw+20,sw=w-sx-2;let y=4,b='';
  const steps=[['Model','calls a tool or final_result','var(--line)'],['1. Arguments fit the types?','Pydantic validates before your function runs','var(--acc)'],['2. Your validator passes?','output_validator(ctx, out), ctx.deps is the Case','var(--acc)'],['result.output: Triage','the run ends','var(--good)']];
  const ys=[];steps.forEach((s,i)=>{const l2=wrap(s[1],mw-16,11);const h=22+l2.length*14+6;ys.push([y,h]);b+=box(mx,y,mw,h,{stroke:s[2],sw:1.4});
    b+=txt(mx+8,y+17,s[0],{w:700,fs:12});b+=txt(mx+8,y+33,l2,{fs:11,fill:'var(--mute)',lh:14});y+=h;
    if(i<steps.length-1){b+=arrow(mx+mw/2,y+2,mx+mw/2,y+20);y+=22}});
  const rl=wrap('Retry prompt to the model: "There is no function named ...", then "Fix the errors and try again."',sw-14,11);
  const ry=ys[1][0],rh=rl.length*14+46;b+=box(sx,ry,sw,rh,{fill:'var(--bg)',stroke:'var(--bad)',dash:1});b+=txt(sx+7,ry+17,rl,{fs:11,lh:14});
  {const bl=wrap('retries left? default 1; then the run raises',sw-14,11);b+=txt(sx+7,ry+rh-8-(bl.length-1)*13,bl,{fs:11,fill:'var(--bad)',lh:13})}
  [1,2].forEach(i=>{b+=arrow(mx+mw,ys[i][0]+ys[i][1]/2,sx,Math.min(ry+rh-8,ys[i][0]+ys[i][1]/2),{c:'var(--bad)'})});
  b+=arrow(sx+sw/2,ry,sx+sw/2,ys[0][0]+ys[0][1]/2,{c:'var(--bad)'});b+='<line x1="'+(sx+sw/2)+'" y1="'+(ys[0][0]+ys[0][1]/2)+'" x2="'+(mx+mw+8)+'" y2="'+(ys[0][0]+ys[0][1]/2)+'" stroke="var(--bad)" stroke-width="1.4"/>'+arrow(mx+mw+8,ys[0][0]+ys[0][1]/2,mx+mw,ys[0][0]+ys[0][1]/2,{c:'var(--bad)'});
  el.innerHTML=svg(w,y+6,b,'Diagram: the model reply is checked for argument types, then by your validator with the dependencies; a failure sends a retry prompt back to the model until the retry budget runs out.');}

// 5. four loops, four stopping rules
function loopfig(){const el=document.getElementById('ftyped-loopfig');const w=W('ftyped-loopfig');const narrow=w<560;
  const L=[['Pydantic AI','50 requests',['model request','run tools; validate arguments','final_result called and valid?']],
    ['OpenAI Agents SDK','10 turns',['model call','run tools, or switch agent on a handoff','reply with no tool call?']],
    ['smolagents (CodeAgent)','20 steps',['model writes Python, stops at </code>','execute it; printed output is the observation','final_answer(...) called?']],
    ['Google ADK','500 model calls',['model call, yielded as an event','function call and result events','event with no function call?']]];
  const g=16,bw=(w-4-2*g)/3;let y=2,b='';
  L.forEach(([n,cap,bx])=>{y+=16;b+=txt(2,y,n,{w:700,fs:12.5});b+=txt(w-2,y,'cap: '+cap,{a:'end',fs:12,w:700,fill:'var(--acc)'});y+=8;
    const lines=bx.map(t=>wrap(t,bw-14,11));const h=Math.max(...lines.map(l=>l.length))*14+16;
    bx.forEach((t,i)=>{const x=2+i*(bw+g);if(i===2){b+='<polygon points="'+(x)+','+(y+h/2)+' '+(x+10)+','+y+' '+(x+bw-10)+','+y+' '+(x+bw)+','+(y+h/2)+' '+(x+bw-10)+','+(y+h)+' '+(x+10)+','+(y+h)+'" fill="color-mix(in srgb,var(--acc) 18%,var(--bg))" stroke="var(--acc)" stroke-width="1.4"/>'}
      else b+=box(x,y,bw,h,{});b+=txt(x+bw/2,y+h/2-(lines[i].length-1)*7+4,lines[i],{a:'middle',fs:11,lh:14});
      if(i<2)b+=arrow(x+bw+1,y+h/2,x+bw+g-1,y+h/2)});
    // the "no" path back to the start
    const ex=2+2*(bw+g)+bw/2,sx=2+bw/2;b+='<path d="M'+ex+' '+(y+h)+' L'+ex+' '+(y+h+10)+' L'+sx+' '+(y+h+10)+'" fill="none" stroke="var(--mute)" stroke-width="1.2" stroke-dasharray="4 3"/>'+arrow(sx,y+h+10,sx,y+h+1,{dash:1});
    b+=txt((ex+sx)/2,y+h+22,'no: loop again (counts toward the cap)',{a:'middle',fs:11,fill:'var(--mute)'});y+=h+30});
  el.innerHTML=svg(w,y,b,'Four lanes, one per library: model call, actions, and the test that ends the run, with each default cap.');}

// 6. handoff on the wire, from the recorded requests
function who(s){const m=s.match(/internal name is "(\w+)"/);if(m)return m[1];if(/System context/.test(s))return 'triage';if(/route each request/.test(s))return 'coordinator';if(/You explain code/.test(s))return 'explainer';if(/Decide whether the user/.test(s))return 'checker';if(/coding agent/.test(s))return 'fixer';return 'agent'}
let hoKey='oai_handoff_greedy';
function hofig(){const el=document.getElementById('ftyped-hofig');const w=W('ftyped-hofig');const d=F.mech[hoKey];if(!d){el.innerHTML='<p class="small mute">not recorded</p>';return}
  const wr=d.wire.slice(0,hoKey.startsWith('adk')?4:6);const narrow=w<560;let y=4,b='';const sq=9;
  wr.forEach((x,i)=>{const a=who(x.sys),prev=i?who(wr[i-1].sys):a,sw=a!==prev;
    const top=y;y+=15;b+=txt(4,y,'request '+(i+1),{w:700,fs:12});b+=txt(78,y,a,{w:700,fs:12,fill:sw?'var(--acc)':'var(--ink)'});
    const mx=narrow?150:170;for(let k=0;k<x.msgs;k++)b+='<rect x="'+(mx+k*(sq+2))+'" y="'+(y-9)+'" width="'+sq+'" height="'+sq+'" rx="1.5" fill="var(--mute)"/>';
    b+=txt(mx+x.msgs*(sq+2)+4,y,x.msgs+' msgs',{fs:11,fill:'var(--mute)'});
    y+=6;let tx=4;const tl=[];x.tools.forEach(t=>{const tw=t.length*7+12;if(tx+tw>w-4){tx=4;y+=18}tl.push([tx,y,t,tw]);tx+=tw+4});
    tl.forEach(([tx,ty,t,tw])=>{const tr=/transfer/.test(t);b+=box(tx,ty,tw,15,{rx:7,fill:tr?'color-mix(in srgb,var(--acc) 22%,var(--bg))':'var(--soft)',stroke:tr?'var(--acc)':'var(--line)'});b+=txt(tx+6,ty+11,t,{fs:11,mono:1})});
    y+=30;const rp=x.reply.replace(/\s+/g,' ').replace(/^TOOL CALL /,'calls ');const rl=wrap(rp,w-30,11).slice(0,narrow?2:1);if(rl.length&&rp.length>rl.join(' ').length)rl[rl.length-1]+=' ...';
    b+=txt(18,y,rl,{fs:11,fill:/transfer/.test(x.reply)?'var(--acc)':'var(--mute)',lh:14,w:/transfer/.test(x.reply)?700:0});y+=(rl.length-1)*14+8;
    if(sw)b+='<line x1="2" y1="'+(top+2)+'" x2="2" y2="'+(y-4)+'" stroke="var(--acc)" stroke-width="3"/>';
    b+='<line x1="0" y1="'+(y+1)+'" x2="'+w+'" y2="'+(y+1)+'" stroke="var(--line)"/>';y+=4});
  if(d.wire.length>wr.length){y+=14;b+=txt(4,y,'... '+(d.wire.length-wr.length)+' more requests on the Mechanisms, recorded tab; tests '+(d.tests&&d.tests.pass?'pass':'still fail')+'.',{fs:11,fill:'var(--mute)'})}
  el.innerHTML=svg(w,y+6,b,'Recorded requests of a handoff: the speaker, the tools offered, one square per message and the reply.');}

// 7. guardrail before/after from the recorded requests
function grfig(){const el=document.getElementById('ftyped-grfig');const w=W('ftyped-grfig');const K=['oai_guard_par_greedy','oai_guard_seq_greedy'];
  const ds=K.map(k=>F.mech[k]);if(ds.some(d=>!d)){el.innerHTML='<p class="small mute">not recorded</p>';return}
  const reqs=ds.map(d=>d.wire.slice(0,((d.cases||[])[0]||{}).requests||0));const mx=Math.max(...reqs.flat().map(x=>x.pt||0));
  const narrow=w<560,lw=narrow?70:90,bw=w-lw-(narrow?60:80);let y=2,b='';
  ['In parallel (the default, run_in_parallel=True)','Blocking (run_in_parallel=False)'].forEach((t,i)=>{y+=16;b+=txt(2,y,t,{w:700,fs:12.5});y+=6;
    reqs[i].forEach(x=>{const a=who(x.sys),ag=a==='fixer';const len=Math.max(3,bw*(x.pt||0)/mx);
      b+=txt(2,y+12,a,{fs:11.5,w:600,fill:ag?'var(--bad)':'var(--ink)'});
      b+=box(lw,y,len,16,{rx:3,fill:ag?'color-mix(in srgb,var(--bad) 25%,var(--bg))':'color-mix(in srgb,var(--acc) 25%,var(--bg))',stroke:ag?'var(--bad)':'var(--acc)'});
      b+=txt(lw+len+5,y+12,(x.pt||'?')+' tok',{fs:11,fill:'var(--mute)'});y+=20;
      const note=ag?'the agent\'s own call: replied "'+x.reply.split('\n')[0].slice(0,34)+' ...", thrown away':'checker replied "'+x.reply.split('\n')[0].slice(0,26)+' ..."';
      b+=txt(lw,y+8,wrap(note,w-lw-4,11),{fs:11,fill:ag?'var(--bad)':'var(--mute)',lh:13});y+=wrap(note,w-lw-4,11).length*13+4});
    y+=4;{const tl=wrap('tripwire after '+reqs[i].length+' model request'+(reqs[i].length===1?'':'s')+(i?'; the agent never ran':''),w-lw-4,11.5);b+=txt(lw,y+10,tl,{fs:11.5,w:700,fill:'var(--bad)',lh:14});y+=tl.length*14+4}});
  y+=6;const sl=wrap('Bar length: prompt tokens of the request (scale shared by both panels).',w-6,11);b+=txt(2,y+8,sl,{fs:11,fill:'var(--mute)',lh:13});y+=(sl.length-1)*13;
  el.innerHTML=svg(w,y+14,b,'Two panels: with a parallel guardrail the agent made its own model call before the tripwire; with a blocking guardrail only the checker ran.');}

// 8. ADK state scopes
function statefig(){const el=document.getElementById('ftyped-statefig');const w=W('ftyped-statefig');const narrow=w<560;
  const nw=narrow?w-4:w*0.6,L=[['app:','every user of the app'],['user:','one user, across their sessions'],['(no prefix)','this session'],['temp:','one invocation, not persistent']];
  let b='';const inset=narrow?10:14,hh=26;const H=L.length*(hh+6)+L.length*inset+10;
  L.forEach((l,i)=>{const x=2+i*inset,y=2+i*(hh+6),ww=nw-2*i*inset,h=H-2-i*inset-y;
    b+=box(x,y,ww,h,{fill:i===2?'color-mix(in srgb,var(--acc) 14%,var(--bg))':'var(--bg)',stroke:i===2?'var(--acc)':'var(--line)',sw:i===2?1.6:1});
    b+=txt(x+8,y+17,l[0],{mono:1,w:700,fs:12,fill:i===2?'var(--acc)':'var(--ink)'});b+=txt(x+8+(l[0].length*7.6)+8,y+17,l[1],{fs:11,fill:'var(--mute)'})});
  let y=H+2,b2='';const ex=narrow?2:nw+24,ey=narrow?y+30:20,ew=narrow?w-4:w-nw-28;
  const ev=['Event (a tool result)','state_delta: {"triage": {...}}','{"user:lang": "en"}'];
  b2+=box(ex,ey,ew,64,{fill:'var(--soft)',stroke:'var(--acc)',sw:1.4});b2+=txt(ex+8,ey+18,ev[0],{w:700,fs:12});b2+=txt(ex+8,ey+36,[ev[1],ev[2]],{mono:1,fs:11,lh:14});
  if(narrow){b2+=arrow(ex+ew/2,ey,ex+ew/2,H-6,{c:'var(--acc)'});b2+=txt(ex+ew/2+8,ey-10,'applied when the event is appended',{fs:11,fill:'var(--acc)'});y=ey+70}
  else{b2+=arrow(ex,ey+40,nw-2*2*inset-2,ey+64,{c:'var(--acc)'});b2+=txt(ex,ey+84,wrap('applied by the session service when the event is appended; output_key="triage" writes the same way',ew,11),{fs:11,fill:'var(--acc)',lh:14});y=Math.max(H,ey+120)}
  el.innerHTML=svg(w,y+4,b+b2,'Nested scopes of ADK state (app, user, session, temp) and an event carrying a state_delta into the session.');}

// 9. choosing
function choosefig(){const el=document.getElementById('ftyped-choosefig');const w=W('ftyped-choosefig');const narrow=w<560;
  const Q=[['Need checkpoints, interrupts and resumable state?','a graph framework (LangGraph)'],['The result is data another program consumes; you want validators and retries?','Pydantic AI'],['Several specialised agents pass one conversation along, with guardrails?','OpenAI Agents SDK'],['The actions are computation over tool results, and the model is strong?','smolagents, remote executor'],['You want a runtime: sessions, scoped state, workflow agents, A2A?','Google ADK']];
  const aw=narrow?Math.min(150,w*0.4):220,qw=w-aw-34;let y=2,b='';
  Q.forEach(([q,a],i)=>{const ql=wrap(q,qw-14,11.5),al=wrap(a,aw-14,11.5);const h=Math.max(ql.length,al.length)*15+14;
    b+=box(2,y,qw,h,{});b+=txt(9,y+h/2-(ql.length-1)*7.5+4,ql,{lh:15});
    b+=arrow(qw+3,y+h/2,qw+30,y+h/2,{c:'var(--good)'});b+=txt(qw+16,y+h/2-5,'yes',{a:'middle',fs:11,fill:'var(--good)'});
    b+=box(qw+31,y,aw,h,{fill:'color-mix(in srgb,var(--acc) 16%,var(--bg))',stroke:'var(--acc)'});b+=txt(qw+38,y+h/2-(al.length-1)*7.5+4,al,{lh:15,w:700});
    y+=h;b+=arrow(qw/2,y+1,qw/2,y+19);b+=txt(qw/2+7,y+14,'no',{fs:11,fill:'var(--mute)'});y+=20});
  const fl=wrap('None of these: write the loop yourself (the root fits it in about fifteen lines)',w-18,11.5);const h=fl.length*15+14;
  b+=box(2,y,w-4,h,{fill:'color-mix(in srgb,var(--good) 14%,var(--bg))',stroke:'var(--good)'});b+=txt(9,y+18,fl,{lh:15,w:700});
  el.innerHTML=svg(w,y+h+4,b,'Decision ladder: checkpoints point to a graph framework; validated data to Pydantic AI; handoffs with guardrails to the Agents SDK; code actions to smolagents; a runtime to ADK; otherwise your own loop.');}

function all(){hero();schfig();sofig();retryfig();loopfig();hofig();grfig();statefig();choosefig()}
RD.seg(document.getElementById('ftyped-ho-seg'),m=>{hoKey=m;hofig()});
RD.onRender(all);RD.onResize(all);all();
})();
