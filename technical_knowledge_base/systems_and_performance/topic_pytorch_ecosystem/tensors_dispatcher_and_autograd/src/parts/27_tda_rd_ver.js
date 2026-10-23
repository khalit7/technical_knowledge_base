// ---- Reading 3.3: version-counter lab (moved from its own tab) ----
(function(){
const A=window.TDA.ag, L=A.version_lab, E=RD.esc, $=id=>document.getElementById(id);
if(!$('tda-v-card'))return;
let cur=0;const seen={};
const fl=a=>'['+a.map(v=>+(+v).toFixed(4)).join(', ')+']';
function list(){$('tda-v-list').innerHTML=L.map((c,i)=>'<button data-i="'+i+'" class="'+(seen[i]?(c.status==='ok'?'ok':'err'):'hid')+(i===cur?' on':'')+'">'+(i+1)+'. '+(seen[i]?E(c.title):'<code>'+E(c.lines[Math.max(0,c.lines.length-2)])+'</code>')+'</button>').join('');
  $('tda-v-list').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{cur=+b.dataset.i;list();open()}))}
function draw(k){const c=L[cur];
  $('tda-v-lines').innerHTML=c.lines.map((line,j)=>{const s=c.steps[j]||{line,versions:null,notrun:true};const done=j<k, err=s.error&&done&&seen[cur];
    const v=s.versions&&done?Object.entries(s.versions).map(([n,x])=>'<span>'+n+' v'+x+'</span>').join('')+(s.grad_fn?'<span>'+s.grad_fn+'</span>':''):(s.error&&done&&seen[cur]?'<span style="color:var(--bad)">raised</span>':'');
    if(s.notrun&&done&&seen[cur])v='<span>not reached</span>';
    return '<div class="'+(j===k-1?'on':'')+(j>=k?' fut':'')+(err?' bad':'')+'"><code>'+E(line)+'</code><span class="tda-v">'+v+'</span></div>'}).join('');}
function open(){const c=L[cur];$('tda-v-title').textContent='Case '+(cur+1)+' of '+L.length+(seen[cur]?': '+c.title:'');$('tda-v-ans').hidden=true;$('tda-v-opts').querySelectorAll('button').forEach(b=>b.classList.remove('right','wrong'));an.reset(c.lines.length+1)}
function reveal(a){const c=L[cur];seen[cur]=1;
  $('tda-v-opts').querySelectorAll('button').forEach(b=>{b.classList.remove('right','wrong');if(b.dataset.a===c.status)b.classList.add('right');else if(b.dataset.a===a&&a!=='show')b.classList.add('wrong')});
  let h=c.status==='error'?'<b class="tda-err">'+E(c.error.type)+':</b> <span class="tda-err">'+E(c.error.text)+'</span>':'<b style="color:var(--good)">Runs.</b>'+(c.grad_x?' x.grad = '+fl(c.grad_x):'')+(c.grad_w?' w.grad = '+fl(c.grad_w):'');
  if(c.id==='data')h+=' The correct gradient, without the .data write, is '+fl(A.data_case_correct_grad)+'.';
  if(c.id==='hooks'){const ok=L.find(z=>z.id==='hookscopy');h+=' The correct gradient (the copying hook in the next case) is '+fl(ok.grad_x)+'.'}
  $('tda-v-ans').innerHTML=h+'<p style="margin:6px 0 0">'+E(c.why)+'</p>';$('tda-v-ans').hidden=false;$('tda-v-title').textContent='Case '+(cur+1)+' of '+L.length+': '+c.title;an.go(c.lines.length);list()}
$('tda-v-opts').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>reveal(b.dataset.a)));
const an=RD.anim({card:'tda-v-card',ctl:'tda-v-ctl',n:L[0].lines.length+1,draw,ms:1100,label:'Line'});
list();open();
})();

// ---- Reading 3.3: the version-counter mechanism, three states of the sigmoid case (static SVG) ----
(function(){const el=document.getElementById('tda-vmech');if(!el)return;
const tx=(x,y,s,c,a)=>'<text x="'+x+'" y="'+y+'"'+(a?' text-anchor="'+a+'"':'')+(c?' class="'+c+'"':'')+'>'+s+'</text>';
const pill=(x,y,w,label,val,col)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="24" rx="12" fill="var(--bg)" stroke="'+col+'" stroke-width="1.5"/>'+tx(x+10,y+16,label,'m')+tx(x+w-10,y+16,val,'mono b','end');
const P=[['y = x.sigmoid()','0','0','node saves y','var(--line)'],['y.mul_(2)','1','0','in-place write: +1','var(--acc)'],['y.sum().backward()','1','0','1 is not 0: RuntimeError','var(--bad)']];
function draw(){const W=RD.width(el), wide=W>=600, gap=14;let s='',H;
  const panel=(x,y,w,[code,cv,sv,note,col],i)=>{let t='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="122" rx="8" fill="'+(i===2?'var(--closed2)':'var(--soft)')+'" stroke="'+col+'"/>';
    t+=tx(x+10,y+18,(i+1)+'. '+code,'mono b');
    t+=pill(x+10,y+30,w-20,"y's counter",cv,i===1?'var(--acc)':'var(--line)');
    t+=pill(x+10,y+62,w-20,'node saved y at',sv,'var(--c2)');
    t+=tx(x+10,y+108,note,i===2?'b':'m');return t};
  if(wide){const pw=(W-2*gap)/3;P.forEach((p,i)=>{s+=panel(i*(pw+gap),0,pw,p,i)});H=124}
  else{P.forEach((p,i)=>{s+=panel(0,i*134,W,p,i)});H=3*134-8}
  el.innerHTML=RD.svg(W,H,s,'Version counter and saved version across three lines')}
RD.onRender(draw);RD.onResize(draw);draw();})();
