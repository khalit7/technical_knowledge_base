// ---- Version-counter lab tab (t-tda-ver) ----
(function(){
const A=window.TDA.ag, L=A.version_lab, E=RD.esc, $=id=>document.getElementById(id);
let cur=0;const seen={};
const fl=a=>'['+a.map(v=>+(+v).toFixed(4)).join(', ')+']';
function list(){$('tda-v-list').innerHTML=L.map((c,i)=>'<button data-i="'+i+'" class="'+(seen[i]?(c.status==='ok'?'ok':'err'):'hid')+(i===cur?' on':'')+'">'+(i+1)+'. '+(seen[i]?E(c.title):'<code>'+E(c.lines[Math.max(0,c.lines.length-2)])+'</code>')+'</button>').join('');
  $('tda-v-list').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{cur=+b.dataset.i;list();open()}))}
function draw(k){const c=L[cur];
  $('tda-v-lines').innerHTML=c.lines.map((line,j)=>{const s=c.steps[j]||{line,versions:null,notrun:true};const done=j<k, err=s.error&&done&&seen[cur];
    const v=s.versions&&done?Object.entries(s.versions).map(([n,x])=>'<span>'+n+' v'+x+'</span>').join('')+(s.grad_fn?'<span>'+s.grad_fn+'</span>':''):(s.error&&done&&seen[cur]?'<span style="color:var(--bad)">raised</span>':'');
    if(s.notrun&&done&&seen[cur])v='<span>not reached</span>';
    return '<div class="'+(j===k-1?'on':'')+(j>=k?' fut':'')+(err?' bad':'')+'"><code>'+E(line)+'</code><span class="tda-v">'+v+'</span></div>'}).join('');}
function open(){const c=L[cur];$('tda-v-title').textContent='Case '+(cur+1)+(seen[cur]?': '+c.title:'');$('tda-v-ans').hidden=true;$('tda-v-opts').querySelectorAll('button').forEach(b=>b.classList.remove('right','wrong'));an.reset(c.lines.length+1)}
function reveal(a){const c=L[cur];seen[cur]=1;
  $('tda-v-opts').querySelectorAll('button').forEach(b=>{b.classList.remove('right','wrong');if(b.dataset.a===c.status)b.classList.add('right');else if(b.dataset.a===a&&a!=='show')b.classList.add('wrong')});
  let h=c.status==='error'?'<b class="tda-err">'+E(c.error.type)+':</b> <span class="tda-err">'+E(c.error.text)+'</span>':'<b style="color:var(--good)">Runs.</b>'+(c.grad_x?' x.grad = '+fl(c.grad_x):'')+(c.grad_w?' w.grad = '+fl(c.grad_w):'');
  if(c.id==='data')h+=' The correct gradient, without the .data write, is '+fl(A.data_case_correct_grad)+'.';
  if(c.id==='hooks'){const ok=L.find(z=>z.id==='hookscopy');h+=' The correct gradient (the copying hook in the next case) is '+fl(ok.grad_x)+'.'}
  $('tda-v-ans').innerHTML=h+'<p style="margin:6px 0 0">'+E(c.why)+'</p>';$('tda-v-ans').hidden=false;$('tda-v-title').textContent='Case '+(cur+1)+': '+c.title;an.go(c.lines.length);list()}
$('tda-v-opts').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>reveal(b.dataset.a)));
const an=RD.anim({card:'tda-v-card',ctl:'tda-v-ctl',n:L[0].lines.length+1,draw,ms:1100,label:'Line'});
list();open();
(window.TAB_RENDER=window.TAB_RENDER||{})['t-tda-ver']=[()=>an.redraw()];
})();
