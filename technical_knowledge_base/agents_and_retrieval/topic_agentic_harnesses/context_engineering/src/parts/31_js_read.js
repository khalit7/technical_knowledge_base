// ---- Reading visuals: hero, budget, cache placement, tool-output policies, skills, subagents (numbers from window.HCTX, built by src/extract.py) ----
window.HCV=(function(){
const H=window.HCTX,S=H.sessions,E=RD.esc;
const fmt=n=>Math.round(n).toLocaleString('en-US');
const k=n=>n>=1000?(n/1000).toFixed(n>=10000?0:1).replace(/\.0$/,'')+'k':String(Math.round(n));
const CAT={'System tools':'var(--c1)','System prompt':'var(--c4)','Memory files':'var(--c3)','Skills':'var(--c6)','Messages':'var(--c2)','Autocompact buffer':'var(--dim)','Free space':'var(--soft)'};
const ORDER=['System tools','System prompt','Memory files','Skills','Messages','Autocompact buffer','Free space'];
const LBL={'System tools':'Tool definitions','System prompt':'System prompt','Memory files':'Memory files','Skills':'Skill descriptions','Messages':'History','Autocompact buffer':'Buffer','Free space':'Free'};
const call=c=>c.in+c.cw+c.cr;
// horizontal bars in SVG. rows: [{n, segs:[[value,colour,title]], val, head, dot}], o: {max, log:[lo,hi]}
function bars(el,rows,o){
  o=o||{};const W=RD.width(el),narrow=W<520,vw=narrow?62:78,nw=narrow?0:Math.min(210,Math.round(W*0.32));
  const bx=narrow?4:nw+8,bw=Math.max(60,W-bx-vw-6),rh=narrow?36:24;
  const sc=v=>o.log?Math.max(0,(Math.log10(Math.max(v,1))-Math.log10(o.log[0]))/(Math.log10(o.log[1])-Math.log10(o.log[0]))):v/o.max;
  let y=4,g='';
  rows.forEach(r=>{
    if(r.head){g+=RD.t(4,y+14,E(r.head),{fs:12,w:600});y+=20;return}
    const ty=narrow?y+11:y+15,by=narrow?y+15:y+5,bh=narrow?14:14;
    const dot=r.dot===undefined?'':'<circle cx="'+(narrow?8:9)+'" cy="'+(ty-4)+'" r="4.5" '+(r.dot?'fill="var(--good)"':'fill="none" stroke="var(--bad)" stroke-width="1.6"')+'/>';
    g+=dot+RD.t(narrow?(r.dot===undefined?4:17):(r.dot===undefined?4:18),ty,E(r.n),{fs:11.5});
    g+='<rect x="'+bx+'" y="'+by+'" width="'+bw+'" height="'+bh+'" rx="2" fill="var(--soft)"/>';
    let x=bx;
    if(o.log){const v=r.segs.reduce((a,s)=>a+s[0],0),w=bw*sc(v);g+='<rect x="'+x+'" y="'+by+'" width="'+w+'" height="'+bh+'" rx="2" fill="'+r.segs[0][1]+'"><title>'+E(r.segs[0][2]||'')+'</title></rect>'}
    else r.segs.forEach(s=>{const w=bw*sc(s[0]);if(w<=0)return;g+='<rect x="'+x+'" y="'+by+'" width="'+w+'" height="'+bh+'" fill="'+s[1]+'"><title>'+E(s[2]||'')+'</title></rect>';x+=w});
    g+=RD.t(W-4,narrow?by+11:ty,r.val,{fs:11.5,a:'end'});
    y+=rh});
  el.innerHTML=RD.svg(W,y+4,g,o.label||'');
}
// circle with a section number
const num=(x,y,n)=>'<circle cx="'+x+'" cy="'+y+'" r="8.5" fill="var(--acc)"/>'+RD.t(x,y+4,n,{fs:11,a:'middle',fill:'var(--bg)',w:600});
// 0. hero: the request in assembly order, and what lives outside the window
function hero(){
  const el=document.getElementById('hc-hero');if(!el)return;
  const c=S.c1_control.ctx[0].cats,W=RD.width(el),wide=W>=600;
  const fw=wide?Math.round(W*0.6):W-2,x0=1,pad=10,rx=x0+pad+22,rw=fw-pad*2-22-36;
  const rows=[['System tools','Tool definitions: what the model may call',22,'var(--c1)',['2']],['System prompt','System prompt: who the agent is, rules',22,'var(--c4)',['2']],['Memory files','Memory files: CLAUDE.md, skill descriptions',22,'var(--c3)',['5']],
    ['Messages','History: task, replies, tool calls and results',40,'var(--c2)',['3','4']],[null,'Newest message: anything volatile goes here',22,'var(--c2)',[]],['Free space','Free: the reply and every later call',34,'var(--soft)',['9']]];
  let y=30,g='';
  g+=RD.t(x0+pad,18,'One request, in order ('+fmt(S.c1_control.ctx[0].window)+'-token window)',{fs:12,w:600});
  const top=y;
  rows.forEach((r,i)=>{const v=r[0]?c[r[0]]:null,col=r[3];
    g+='<rect x="'+rx+'" y="'+y+'" width="'+rw+'" height="'+r[2]+'" rx="4" fill="'+col+'"'+(i===4?' stroke="var(--bad)" stroke-width="2"':'')+(i===5?' stroke="var(--line)" stroke-dasharray="4 3"':'')+'/>';
    const lab=wide||W>=430?r[1]:r[1].split(':')[0];
    g+=RD.t(rx+8,y+r[2]/2+4,E(lab),{fs:11.5,fill:i===5?'var(--mute)':'var(--bg)',w:600});
    if(v!=null)g+=RD.t(rx+rw-6,y+r[2]/2+4,fmt(v),{fs:11,a:'end',fill:i===5?'var(--mute)':'var(--bg)'});
    r[4].forEach((n,j)=>{g+=num(rx+rw+14+j*20,y+r[2]/2,n)});
    y+=r[2]+4});
  // cached prefix bracket on the left of rows 0..3
  const by1=top,by2=top+22*3+40+12;
  g+='<path d="M'+(rx-6)+' '+by1+' h-8 V'+by2+' h8" fill="none" stroke="var(--c1)" stroke-width="2"/>';
  g+='<text x="'+(rx-17)+'" y="'+((by1+by2)/2)+'" font-size="11" fill="var(--c1)" font-weight="600" text-anchor="middle" transform="rotate(-90 '+(rx-17)+' '+((by1+by2)/2)+')">cached prefix</text>';
  g+='<rect x="'+x0+'" y="'+(top-6)+'" width="'+fw+'" height="'+(y-top+8)+'" rx="8" fill="none" stroke="var(--line)"/>';
  // outside the window
  const outs=[['6','Subagent window','reads wide, returns about 1K'],['7','Notes on disk','progress file, todo, CLAUDE.md'],['8','Memory layer','facts, graph or archive, searched']];
  let gh;
  if(wide){const ox=fw+28,ow=W-ox-2,oh=46;let oy=top;
    g+=RD.t(ox,18,'Outside the window',{fs:12,w:600});
    outs.forEach((o,i)=>{g+='<rect x="'+ox+'" y="'+oy+'" width="'+ow+'" height="'+oh+'" rx="6" fill="var(--bg)" stroke="var(--line)"/>'+num(ox+14,oy+16,o[0])+RD.t(ox+28,oy+20,E(o[1]),{fs:12,w:600})+RD.t(ox+10,oy+37,E(o[2]),{fs:11,fill:'var(--mute)'});
      const ay=oy+oh/2,ty=top+22*3+12+20;g+='<path d="M'+ox+' '+ay+' L'+(fw-4)+' '+ty+'" stroke="var(--mute)" fill="none" stroke-dasharray="3 3" marker-end="url(#hc-ar)"/>';oy+=oh+10});
    gh=Math.max(y,oy)+4;
  }else{let oy=y+16;g+=RD.t(x0+pad,oy,'Outside the window, brought in on demand',{fs:12,w:600});oy+=8;
    outs.forEach(o=>{g+='<rect x="'+x0+'" y="'+oy+'" width="'+fw+'" height="40" rx="6" fill="var(--bg)" stroke="var(--line)"/>'+num(x0+14,oy+20,o[0])+RD.t(x0+28,oy+17,E(o[1]),{fs:12,w:600})+RD.t(x0+28,oy+32,E(o[2]),{fs:11,fill:'var(--mute)'});oy+=46});
    gh=oy+2}
  const defs='<defs><marker id="hc-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--mute)"/></marker></defs>';
  el.innerHTML=RD.svg(W,gh,defs+g,'The request a harness sends on one call, in assembly order, and the stores outside the window');
}
// 1. budget
let budgetI=0;
const BV=()=>[
    ['Fresh session',S.ctx0.ctx[0],'A new session, six tools, nothing typed yet.'],
    ['+ Skill tool',S.ctx_sk_skill.ctx[0],'The same with the Skill tool enabled: 14 built-in skill descriptions plus one project skill appear.'],
    ['+ 1k CLAUDE.md',S.ctx_sk_claudemd.ctx[0],'The release-notes procedure as a project CLAUDE.md instead of a skill: about 1,000 tokens on every call.'],
    ['After the task',S.c1_control.ctx[0],'After fixing the two bugs: the history is about 5,800 tokens.'],
    ['After 5 big reads',S.c3_big_nocompact.ctx[0],'After reading five 75 KB logs in full: 118,100 tokens of history, 65% of the window.'],
    ['100K window',S.c4_auto.ctx[0],'With --autocompact 100000, after an automatic compaction: a third of the window is held back as a buffer, and the history is small again.']];
function budget(){
  const el=document.getElementById('hc-budget');if(!el)return;
  const v=BV()[budgetI],c=v[1],Wn=c.window,W=RD.width(el),h=40;let x=0,g='';
  ORDER.forEach(key=>{const n=c.cats[key];if(!n)return;const w=W*n/Wn;
    g+='<rect x="'+x+'" y="0" width="'+w+'" height="'+h+'" fill="'+CAT[key]+'"'+(key==='Free space'?' stroke="var(--line)"':'')+'><title>'+key+': '+fmt(n)+'</title></rect>';
    if(w>44)g+=RD.t(x+4,16,E(LBL[key]),{fs:11,fill:key==='Free space'||key==='Autocompact buffer'?'var(--mute)':'var(--bg)',w:600})+RD.t(x+4,32,k(n),{fs:11,fill:key==='Free space'||key==='Autocompact buffer'?'var(--mute)':'var(--bg)'});
    x+=w});
  el.innerHTML=RD.svg(W,h,g,'Window contents by category');
  document.getElementById('hc-budget-cap').innerHTML=E(v[2])+' Total '+fmt(c.total)+' of '+fmt(Wn)+' tokens, from <code>/context</code>. '+ORDER.filter(key=>c.cats[key]).map(key=>'<span style="white-space:nowrap"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+CAT[key]+';border:1px solid var(--line);vertical-align:-1px;margin-right:3px"></i>'+(LBL[key]||key)+' '+fmt(c.cats[key])+'</span>').join(' ');
}
// 2. cache placement
function cx(){
  const el=document.getElementById('hc-cx');if(!el)return;
  const P=H.price,NM={static:'Static',tssys:'Time in system prompt',tsuser:'Time in user message',tools5:'One tool fewer'};
  const max=Math.max(...H.cache.map(call)),rows=[];
  ['static','tssys','tsuser','tools5'].forEach(v=>H.cache.filter(c=>c.variant===v).sort((a,b)=>a.i-b.i).forEach(c=>{
    const usd=(c.in*P.in+c.cw*P.w1h+c.cr*P.read)/1e6;
    rows.push({n:NM[v]+', run '+c.i,segs:[[c.cr,'var(--c1)','read '+fmt(c.cr)],[c.cw,'var(--c5)','write '+fmt(c.cw)],[c.in,'var(--c2)','fresh '+c.in]],val:'$'+usd.toFixed(4)})}));
  bars(el,rows,{max,label:'Input tokens of eleven one-call sessions split into cache read, cache write and fresh'});
}
// 3. policies
function pol(){
  const el=document.getElementById('hc-pol');if(!el||!H.policies)return;
  const P=H.policies.policies;
  const ord=[['raw','Raw output'],['page_2000','Paged, page 1'],['cc_failure','Claude Code, failed command'],['head_tail_lines','Head and tail, 15 lines'],['cc_valid','Claude Code, valid command'],['summary','Model summary'],['filter','Filtered'],['mask','Cleared after use']];
  bars(el,ord.map(([key,n])=>{const p=P[key];return {n,dot:p.key_lines_kept===5,segs:[[p.tokens,key==='raw'?'var(--bad)':'var(--c1)',p.desc]],val:fmt(p.tokens)}}),{log:[10,250000],label:'Tokens the model sees under each tool-output policy, log scale'});
}
// 5. skills against CLAUDE.md
function sk(){
  const el=document.getElementById('hc-sk');if(!el)return;
  const R=[['Fresh session',S.ctx0.ctx[0]],['Skill tool + our skill',S.ctx_sk_skill.ctx[0]],['Same text as CLAUDE.md',S.ctx_sk_claudemd.ctx[0]]];
  const K=['System tools','System prompt','Memory files','Skills'],max=Math.max(...R.map(r=>r[1].total));
  bars(el,R.map(([n,c])=>({n,segs:K.filter(key=>c.cats[key]).map(key=>[c.cats[key],CAT[key],LBL[key]+' '+fmt(c.cats[key])]),val:fmt(c.total)})),{max,label:'Startup context by category'});
  el.insertAdjacentHTML('beforeend','<div class="hc-legend">'+K.map(key=>'<span><i style="background:'+CAT[key]+'"></i>'+LBL[key]+'</span>').join('')+'</div>');
}
// 6. subagents
function sa(){
  const el=document.getElementById('hc-sa');if(!el)return;
  const runs=[['sb_none','No subagent, run 1'],['sb_none_r2','No subagent, run 2'],['sb_agent','Subagent, run 1'],['sb_agent_r2','Subagent, run 2']];
  const R=runs.map(([l,n])=>{const s=S[l],m=s.calls.filter(c=>c.w==='m'),sb=s.calls.filter(c=>c.w==='s'),f=s.finals[s.finals.length-1];
    return {n,main:call(m[m.length-1]),sub:sb.length?call(sb[sb.length-1]):0,tot:f.mu.in+f.mu.cw+f.mu.cr,cost:f.cost}});
  const max=Math.max(...R.map(r=>r.tot)),rows=[];
  R.forEach(r=>{rows.push({head:r.n+'   $'+r.cost.toFixed(3)});
    [['main window at the end',r.main,'var(--c2)'],['subagent window at its end',r.sub,'var(--c6)'],['all input processed',r.tot,'var(--dim)']].forEach(([nm,v,col])=>rows.push({n:nm,segs:[[v,col,nm]],val:v?fmt(v):'none'}))});
  bars(el,rows,{max,label:'Main window, subagent window and total input processed, four runs'});
}
function all(){hero();budget();cx();pol();sk();sa()}
(function(){const seg=document.getElementById('hc-budget-seg');if(seg){seg.innerHTML=BV().map((v,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+v[0]+'</button>').join('');RD.seg(seg,m=>{budgetI=+m;budget()})}})();
all();RD.onRender(all);RD.onResize(all);
return {bars,fmt};
})();
