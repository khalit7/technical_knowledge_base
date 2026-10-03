// ---- The paper tab: Figure 1, the flow diagram, the level panel, Table I, Figure 3, RQ4 power, the case study ----
(function(){
  const TB=PAPER.tables,RC=PAPER.rc,R=window.REPO;
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const MODELS=['GPT 5.1','GPT-5.4-mini','DeepSeek-v4-Flash','Gemini-3.1-Flash-Lite'];
  const SHORT={'GPT 5.1':'GPT 5.1','GPT-5.4-mini':'GPT-5.4-mini','DeepSeek-v4-Flash':'DeepSeek-v4-Flash','Gemini-3.1-Flash-Lite':'Gemini-3.1-Flash-Lite'};
  // ---- Figure 1: stacked bars from the printed labels ----
  const F1C=['var(--dim)','var(--c1)','var(--c4)','var(--c2)'];
  function f1(w){const F=TB.F1,ms=['DeepSeek-v4-Flash','GPT 5.1','GPT-5.4-mini','Gemini-3.1-Flash-Lite'];const narrow=w<560;
    const lw=narrow?0:150,pl=10,pr=10,bh=22,gap=narrow?40:14,top=8;let s='',y=top;const bw=w-pl-pr-lw;
    ms.forEach(m=>{const v=F.rows[m];let x=pl+lw;if(narrow){s+=tx(pl,y+11,m,{fs:12,w:600});y+=16}else s+=tx(pl+lw-8,y+bh/2+4,m,{fs:12,a:'end'});
      v.forEach((c,i)=>{const ww=bw*c/500;s+=rc(x,y,ww,bh,F1C[i],{r:0})+'<title>'+F.cats[i]+': '+c+'</title>';if(ww>24)s+=tx(x+ww/2,y+bh/2+4,c,{fs:11,a:'middle',c:i===0?'var(--ink)':'#fff'});x+=ww});
      const L=RC.f1[m];s+=tx(pl+lw+bw,y+bh+13,'leakage evidence '+L.leak_pct+'%, patch/test '+L.patch_pct+'%',{fs:11,a:'end',c:'var(--mute)'});y+=bh+gap});
    const lg=legend(F.cats.map((c,i)=>[c,F1C[i]]),pl,y+4,w-pl-pr);
    s+=lg.s.replace(/stroke-width="2.2"/g,'stroke-width="8"');
    $('f1Plot').innerHTML=svgW(w,y+lg.h+6,s,'Figure 1 redrawn')}
  // ---- flow diagram ----
  function flow(w){const narrow=w<600;let s='';
    const boxes=narrow?[[10,8,w-20,46,'Agent (mini-swe-agent)','reads the virtual view, issues bash commands'],[10,92,w-20,58,'Translator (Levels 1 and 2)','virtual names &#8594; real before a command runs; real &#8594; virtual in every output'],[10,188,w-20,58,'Real SWE-bench container','original repository plus the Level 3 or 4 overlay, checked by the tests'],[10,284,w-20,46,'Patch recovery','diff of final against original files, graded by the standard tests']]
      :[[10,30,170,64,'Agent','mini-swe-agent: reads the virtual view, issues bash commands'],[w/2-120,18,240,88,'Translator (Levels 1, 2)','virtual &#8594; real for commands; real &#8594; virtual for outputs; a notebook of names emitted'],[w-190,30,180,64,'Real container','original repository + Level 3/4 overlay'],[w-190,128,180,52,'Patch recovery','file diffs, standard tests']];
    boxes.forEach(b=>{s+=rc(b[0],b[1],b[2],b[3],'var(--soft)',{s:'var(--line)',r:6});s+=tx(b[0]+b[2]/2,b[1]+18,b[4],{fs:12,a:'middle',w:600});
      const words=b[5].split(' ');let line='',ly=b[1]+34;const maxc=Math.floor(b[2]/6.2);words.forEach(wd=>{if((line+' '+wd).length>maxc){s+=tx(b[0]+b[2]/2,ly,line.trim(),{fs:11,a:'middle',c:'var(--mute)'});ly+=13;line=wd}else line+=' '+wd});s+=tx(b[0]+b[2]/2,ly,line.trim(),{fs:11,a:'middle',c:'var(--mute)'})});
    const A=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.4" marker-end="url(#fla)"/>';
    let H;if(narrow){s+=A(w/2-30,56,w/2-30,90)+A(w/2+30,90,w/2+30,56)+A(w/2-30,152,w/2-30,186)+A(w/2+30,186,w/2+30,152)+A(w/2,248,w/2,282);H=336}
    else{s+=A(182,52,w/2-122,52)+A(w/2-122,72,182,72)+A(w/2+122,52,w-192,52)+A(w-192,72,w/2+122,72)+A(w-100,96,w-100,126);H=188}
    $('flowSvg').innerHTML='<svg viewBox="0 0 '+w+' '+H+'" width="'+w+'" height="'+H+'" style="max-width:100%;height:auto" role="img" aria-label="How a command travels"><defs><marker id="fla" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>'+s+'</svg>'}
  // ---- the level panel (renamings as printed in Figure 4) ----
  const FM=SR.forwardMap(R.keys,R.fig.mapping);
  function lvDraw(m){const ex=R.ex,iss=ex.issue.split('\n').slice(0,6).join('\n'),path='django/db/models/fields/__init__.py';let h='';
    if(m==='0')h='<div class="lab2">Issue (first lines)</div><pre class="codeb sm">'+esc(iss)+'</pre><div class="lab2">Where the fix goes</div><pre class="codeb sm">'+esc(path)+'</pre>';
    else if(m==='1')h='<p class="small">Level 1 rewords the issue with an LLM (not reproducible here). What the released code also does under Level 1 is replace the project name; the identifiers stay, by the released prompt\'s instruction.</p><pre class="codeb sm">'+esc(SR.apply(iss,{},true))+'</pre>';
    else if(m==='2')h='<p class="small">Figure 4\'s renamings, applied with the released rebuild and replacement rules: the same issue and path the agent reads.</p><pre class="codeb sm">'+esc(SR.apply(iss,FM,true))+'</pre><pre class="codeb sm">'+esc(SR.apply(path,FM,true))+'</pre>';
    else if(m==='3'){const FR=ex.field_run,o=SR.topoOrder({length:FR.names.length,deps:FR.deps},1),ci=FR.names.indexOf('contribute_to_class');
      h='<p class="small">Methods of <code>Field</code> around the fix, in file order and in the order seed 1 gives (the released algorithm; <code>Field</code> has 55 methods in this run and no ordering constraints among them).</p><div class="cols2"><div><div class="lab2">File order</div><pre class="codeb sm">'+FR.names.slice(Math.max(0,ci-3),ci+4).map((n,i)=>(n==='contribute_to_class'?'&#9656; ':'  ')+esc(n)).join('\n')+'</pre></div><div><div class="lab2">Seed 1: contribute_to_class is now method '+(o.indexOf(ci)+1)+' of 55 (was '+(ci+1)+')</div><pre class="codeb sm">'+o.slice(Math.max(0,o.indexOf(ci)-3),o.indexOf(ci)+4).map(u=>(u===ci?'&#9656; ':'  ')+esc(FR.names[u])).join('\n')+'</pre></div></div>'}
    else{const L=ex.files[0].text.split('\n'),i0=L.findIndex(l=>l.includes('if self.choices is not None'));
      h='<p class="small">Level 4 would hand these lines (the region of the gold patch) to a rewriting agent, to be restated in an equivalent but different form and kept only if the target test still fails and all others pass. Not reproducible without the LLM.</p><pre class="codeb sm">'+esc(L.slice(i0,i0+3).join('\n'))+'</pre>'}
    $('lvBody').innerHTML=h}
  segBind('lvM',m=>{$('lvM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));lvDraw(m)});lvDraw('0');
  // ---- Table I chart ----
  let t1m='pass',t1hl=null;
  const SETS=['Baseline','Level 1','Level 2','Level 3','Level 4','SchrodingerRepo'];
  function t1(w){const rows=TB.T1.rows,m=t1m,narrow=w<560;const lw=narrow?92:120,pl=6,pr=narrow?86:110,rh=17;let s='',y=6;
    MODELS.forEach(md=>{const rr=SETS.map(st=>rows.find(r=>r.model===md&&r.setting===st)).filter(Boolean);
      const base=rr[0][m].v,mx=m==='pass'?100:Math.max(...rr.map(r=>r[m].v))*1.08;const X=v=>pl+lw+(w-pl-lw-pr)*v/mx;
      s+=tx(pl,y+12,SHORT[md]+(md.startsWith('Gemini')?' (300 instances)':''),{fs:12,w:600});y+=18;
      rr.forEach(r=>{const v=r[m].v,full=r.setting==='SchrodingerRepo',hl=t1hl&&r.setting===t1hl;
        s+=tx(pl+lw-6,y+rh/2+3,r.setting==='SchrodingerRepo'?'All four':r.setting,{fs:11,a:'end',w:full||hl?700:null});
        s+=rc(pl+lw,y+2,X(v)-pl-lw,rh-5,r.setting==='Baseline'?'var(--dim)':(hl?'var(--c2)':full?'var(--c1)':'var(--acc2)'),{r:2});
        if(m==='pass'&&r.setting!=='Baseline'){const c=RC.ci.find(q=>q.model===md&&q.setting===r.setting);if(c){const lo=v-1.96*c.se_pp,hi=v+1.96*c.se_pp;s+=ln2(X(lo),y+rh/2-1,X(hi),y+rh/2-1,'var(--ink)',{sw:1,op:.6})+ln2(X(lo),y+rh/2-4,X(lo),y+rh/2+2,'var(--ink)',{sw:1,op:.6})+ln2(X(hi),y+rh/2-4,X(hi),y+rh/2+2,'var(--ink)',{sw:1,op:.6})}}
        s+=ln2(X(base),y,X(base),y+rh-2,'var(--mute)',{sw:1.5});
        const lab=(m==='pass'?r[m].p:fmt(v,v<100?2:0))+('*'.repeat(r[m].sig||0))+(r[m].dp!=null?' ('+(r[m].dir>0?'+':'-')+r[m].dp.replace('%','')+(m==='pass'?'':'%')+')':'');
        s+=tx(w-pr+4,y+rh/2+3,lab,{fs:11});y+=rh});y+=10});
    s+=tx(pl+(narrow?0:lw),y+6,m==='pass'?(narrow?'Pass@1 %; whisker: 95% interval':'Pass@1 (%), whisker: 95% interval of the change, unpaired'):m==='actions'?'Average actions per instance':'Average input tokens per instance',{fs:11,c:'var(--mute)'});
    $('t1Plot').innerHTML=svgW(w,y+14,s,'Table I')}
  segBind('t1M',m=>{t1m=m;$('t1M').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('t1Plot'))});
  PRED_REVEAL.pr1=()=>{t1hl='Level 2';t1m='pass';refit($('t1Plot'))};
  // ---- Figure 3 ----
  const F3C=['var(--c6)','var(--c1)','var(--c4)','var(--c5)','var(--c2)','var(--c3)'];
  function f3(w){const F=TB.F3,ms=['DeepSeek-v4-Flash','GPT-5.4-mini'];let s='',y=6;const pl=8,pr=8,bw=w-pl-pr,bh=26;
    ms.forEach(m=>{const v=F.rows[m];const ex=RC.f3[m];if(w<520){s+=tx(pl,y+12,m,{fs:12,w:600});y+=16;s+=tx(pl,y+12,ex.extra_actions+' extra actions, '+ex.explore+'% exploration',{fs:11,c:'var(--mute)'});y+=18}else{s+=tx(pl,y+12,m+': '+ex.extra_actions+' extra actions per task, '+ex.explore+'% exploration',{fs:12,w:600});y+=18}let x=pl;
      v.forEach((c,i)=>{if(!c)return;const ww=bw*c/100;s+=rc(x,y,ww,bh,F3C[i],{r:0})+'<title>'+F.cats[i]+' '+c+'%</title>';if(ww>34)s+=tx(x+ww/2,y+bh/2+4,c.toFixed(1),{fs:11,a:'middle',c:'#fff'});x+=ww});
      const ex4=bw*ex.explore/100;s+=ln2(pl+ex4,y-3,pl+ex4,y+bh+3,'var(--ink)',{sw:2});y+=bh+14});
    const lg=legend(F.cats.map((c,i)=>[c,F3C[i]]),pl,y+4,w-pl-pr);s+=lg.s.replace(/stroke-width="2.2"/g,'stroke-width="8"');
    $('f3Plot').innerHTML=svgW(w,y+lg.h+6,s,'Figure 3 redrawn')}
  // ---- RQ4 power ----
  function pw(w){const n=+$('pwN').value,d=+$('pwD').value,p=19/110;$('pwNv').textContent=n;$('pwDv').textContent=d.toFixed(1);
    const P=(n,d)=>{const p2=Math.max(0.001,p-d/100);const se=Math.sqrt(p*(1-p)/n+p2*(1-p2)/n);const z=(d/100)/se;return Phi(z-1.96)+Phi(-z-1.96)};
    const H=170,pl=40,pr=12,pt=10,pb=30,X=v=>pl+(w-pl-pr)*v/15,Y=v=>pt+(H-pt-pb)*(1-v);let s='';
    [0,.2,.4,.6,.8,1].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,Math.round(v*100)+'%',{fs:11,a:'end',c:'var(--mute)'})});
    [0,5,10,15].forEach(v=>s+=tx(X(v),H-pb+15,v,{fs:11,a:'middle',c:'var(--mute)'}));s+=tx((pl+w-pr)/2,H-3,'drop in Pass@1 (points), baseline 17.27%',{fs:11,a:'middle',c:'var(--mute)'});
    let path='';for(let v=0.2;v<=15;v+=0.2)path+=(path?'L':'M')+X(v).toFixed(1)+' '+Y(P(n,v)).toFixed(1);
    s+='<path d="'+path+'" fill="none" stroke="var(--acc)" stroke-width="2"/>'+ln2(pl,Y(.8),w-pr,Y(.8),'var(--mute)',{da:'4 3'})+tx(w-pr,Y(.8)-4,'80% power',{fs:11,a:'end',c:'var(--mute)'});
    const pv=P(n,d);s+='<circle cx="'+X(d)+'" cy="'+Y(pv)+'" r="4.5" fill="var(--c2)"/>';
    $('pwPlot').innerHTML=svgW(w,H,s,'Power of the RQ4 comparison');
    let mdd=15;for(let v=0.1;v<=15;v+=0.1){if(P(n,v)>=0.8){mdd=v;break}}
    $('pwTxt').innerHTML='With '+n+' tasks and a true drop of '+d.toFixed(1)+' points, a two-sided test at p&lt;0.05 detects it '+Math.round(100*pv)+'% of the time; 80% power needs a drop of about '+mdd.toFixed(1)+' points. Two independent samples of '+n+' (the paper does not report a paired test); the default is the 4.1-point drop that the Verified result (a 23.9% relative loss) would imply.'}
  function Phi(z){const t=1/(1+.2316419*Math.abs(z)),d=.3989423*Math.exp(-z*z/2),p=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return z>0?1-p:p}
  ['pwN','pwD'].forEach(id=>$(id).addEventListener('input',()=>refit($('pwPlot'))));
  PRED_REVEAL.pr3=()=>fit($('pwPlot'),pw);
  // ---- case study animation ----
  const TREE=[['django/',0],['db/',1],['models/',2],['base.py',3],['manager.py',3],['options.py',3],['query.py',3],['fields/',3],['__init__.py',4],['related.py',4],['mixins.py',4],['utils/',1],['encoding.py',2],['tests/',0],['model_fields/',1],['models.py',2],['tests.py',2]];
  const PATHS=['django/','django/db/','django/db/models/','django/db/models/base.py','django/db/models/manager.py','django/db/models/options.py','django/db/models/query.py','django/db/models/fields/','django/db/models/fields/__init__.py','django/db/models/fields/related.py','django/db/models/fields/mixins.py','django/utils/','django/utils/encoding.py','tests/','tests/model_fields/','tests/model_fields/models.py','tests/model_fields/tests.py'];
  const lab=(i,mode)=>{if(mode==='orig')return TREE[i][0];const p=SR.apply(PATHS[i],FM,true).replace(/\/$/,'');const seg=p.split('/').pop();return seg+(PATHS[i].endsWith('/')?'/':'')};
  const CS={orig:[{t:'Read the issue',c:'The issue names Django\'s own vocabulary: <code>get_FOO_display()</code>, <code>models.Model</code>, <code>models.CharField</code>, <code>choices</code>. Each is a cue to a file the model has seen many times.',v:[],cue:'Cannot override get_FOO_display() ... models.CharField(..., choices=...)'},
      {t:'List, then search for get_.*_display under django/db/models/',c:'One search returns <code>django/db/models/fields/__init__.py</code> and <code>django/db/models/base.py</code>.',v:[0,1,2,3,7,8]},
      {t:'Open the field file around the match',c:'<code>get_%s_display</code> is installed unconditionally with <code>setattr</code> in <code>contribute_to_class</code>.',v:[8]},
      {t:'Check the backing method in base.py',c:'<code>_get_FIELD_display</code> is the implementation; the fault is localised.',v:[3]},
      {t:'Patch',c:'Guard the installation with an existence check: only <code>setattr</code> if the class has no such method. Same patch as the gold patch. <b>37 actions in all.</b>',v:[8],end:37}],
    map:[{t:'Read the renamed issue',c:'The same issue now says: a custom <code>render_FOO_label()</code> should override the generated label-rendering method, on <code>object_models.Blueprint</code> with <code>object_models.Character_unitField</code> and <code>picks</code>. None of these names was ever in training data.',v:[]},
      {t:'List the directory, enumerate Python files, inspect the tree',c:'Without a familiar path to jump to, the agent maps the top-level <code>working_repository/</code> tree first.',v:[0,1,2,7,11,13,14]},
      {t:'Search source and tests for display-related methods',c:'It searches for <code>render_*_label</code> across the repository, source and tests alike.',v:[0,2,3,7,8,14,15,16]},
      {t:'Open the transformed implementation files',c:'<code>working_repository/storage_engine/object_models/entries/__init__.py</code> and the backing file <code>anchor.py</code>; it finds the analogous <code>render_%s_label</code> generation.',v:[8,3]},
      {t:'Keep reading to confirm the mapping',c:'Surrounding field-registration logic, tests, configuration files and a minimal reproduction, to be sure the renamed names behave like the original display method.',v:[4,5,6,8,9,10,12,15,16]},
      {t:'Patch, then recover it',c:'Guard <code>render_%s_label</code> generation with an existence check. The submission is recovered from the environment\'s git diff and maps back to the same patch. <b>217 actions in all.</b>',v:[8],end:217}]};
  function csDraw(m,k,e,w){const steps=CS[m],seen=new Set();steps.slice(0,k).forEach(s=>s.v.forEach(i=>seen.add(i)));const now=new Set(steps[k].v);
    const rh=19,top=8,H=top+TREE.length*rh+64,ind=16;let s='';
    TREE.forEach(([n,d],i)=>{const y=top+i*rh,x=8+d*ind,on=now.has(i),was=seen.has(i);const label=lab(i,m);
      if(on)s+=rc(x-4,y,Math.min(w-x-4,label.length*7.2+14),rh-3,'var(--hl)',{r:3,op:e});
      s+=tx(x,y+12,esc(label),{fs:12,c:on?'var(--ink)':was?'var(--acc)':'var(--mute)',w:on?700:null})});
    // to-scale action bar at the last step
    const yb=top+TREE.length*rh+14,last=k===steps.length-1,bw=w-16;
    s+=tx(8,yb,'Actions (the paper\'s totals): '+(last?(m==='orig'?'37':'217'):'not given per step'),{fs:11,c:'var(--mute)'});
    s+=rc(8,yb+6,bw,12,'var(--soft)',{s:'var(--line)',r:3});
    if(last)s+=rc(8,yb+6,bw*(m==='orig'?37:217)/217*e,12,m==='orig'?'var(--c3)':'var(--c2)',{r:3});
    s+=ln2(8+bw*37/217,yb+3,8+bw*37/217,yb+21,'var(--ink)',{sw:1,op:.5})+tx(8+bw*37/217+3,yb+32,'37',{fs:11,c:'var(--mute)'})+tx(8+bw,yb+32,'217',{fs:11,a:'end',c:'var(--mute)'});
    if(w>=600){const px=Math.max(230,w*.36),pw2=w-px-8;const wrap=(t,y0,fs,c)=>{const mc=Math.floor(pw2/(fs*.56));let line='',yy=y0,o='';t.split(' ').forEach(wd=>{if((line+' '+wd).length>mc){o+=tx(px+10,yy,esc(line.trim()),{fs,c});yy+=fs+4;line=wd}else line+=' '+wd});o+=tx(px+10,yy,esc(line.trim()),{fs,c});return {o,y:yy}};
      s+=rc(px,8,pw2,H-80,'var(--soft)',{s:'var(--line)',r:8});s+=tx(px+10,28,'The issue, as this view words it',{fs:11,c:'var(--mute)'});
      let r1=wrap(ISS[m],46,12);s+=r1.o;s+=tx(px+10,r1.y+30,'This step (paraphrasing Figure 4)',{fs:11,c:'var(--mute)'});
      const r2=wrap(CMD[m][k],r1.y+48,12,'var(--acc)');s+=G(e,r2.o)}
    return svgW(w,H,s,'Case study')}
  const ISS={orig:'Cannot override get_FOO_display() in Django 2.2+. class FooBar(models.Model): foo_bar = models.CharField(..., choices=[...]); def get_foo_bar_display(self): return "something"',
    map:'A custom render_FOO_label() should override the generated label-rendering method (Figure 4), on object_models.Blueprint with object_models.Character_unitField(..., picks=[...]).'};
  const CMD={orig:['Read the issue; every name in it is a Django name.','ls; then search for get_.*_display under django/db/models/','Open django/db/models/fields/__init__.py at the match','Open django/db/models/base.py: _get_FIELD_display','Patch: if not hasattr(cls, \'get_%s_display\' % self.name): setattr(...)'],
    map:['Read the issue; none of its names has been seen before.','ls; enumerate the .py files; inspect working_repository/','Search source and tests for render_*_label','Open .../object_models/entries/__init__.py and anchor.py','Read registration code, tests, configuration; run a reproduction','Patch render_%s_label generation; recover the diff and map it back']};
  const csA=makeAnim({id:'cs',mode:'orig',modes:CS,dur:2600,draw:csDraw,
    counters:(m,k,e)=>{const steps=CS[m],seen=new Set();steps.slice(0,k+1).forEach(s=>s.v.forEach(i=>seen.add(i)));
      return stat('Steps Figure 4 shows',(k+1)+' of '+steps.length,m==='orig'?'familiar view':'renamed view')+stat('Tree entries lit so far',seen.size+' of '+TREE.length,'an illustration of the text')+stat('Actions in the run',k===steps.length-1?(m==='orig'?'37':'217'):'...',m==='orig'?'same patch':'5.9 times as many, same patch')}});
  onTab('t-read',()=>{fit($('f1Plot'),f1);fit($('flowSvg'),flow);fit($('t1Plot'),t1);fit($('f3Plot'),f3)});
})();
