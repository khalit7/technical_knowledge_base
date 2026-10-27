// ---- The paper's tables, rebuilt: ablation gains, every table sortable with deltas, and every number in the text checked ----
(function(){
if(!$('t-tables'))return;const TB=PAPER.tables,RC=PAPER.rc;
// normalise every table to {cols, rows:[{label, sub, v, lower, neutral, group}]}
function norm(id){const t=TB[id];
  if(t.models)return {cols:t.models,rows:t.rows.map(r=>({label:r.bench,sub:[r.metric,r.shots].filter(Boolean).join(', '),v:r.v,lower:r.lower,group:r.group})),cap:t.caption,at:t.at,meta:t.meta};
  if(id==='T9')return {cols:t.rows.map(r=>r[0]),rows:t.head.slice(1).map((h,j)=>({label:h,sub:'',v:t.rows.map(r=>r[j+1]),lower:false,neutral:/length/.test(h)})),cap:t.caption,at:t.at};
  return {cols:t.rows.map(r=>r[0]),rows:t.head.slice(1).map((h,j)=>({label:h,sub:'',v:t.rows.map(r=>r[j+1]),lower:false})),cap:t.caption,at:t.at}}
const S={id:'T3',ref:-1,sort:-1,dir:1};
const num=s=>s==='-'?null:parseFloat(s);
function refOpts(){const n=norm(S.id);const dflt={T3:2,T4:0,T5:0,T6:4,T7:4,T8:4,T9:0}[S.id];S.ref=dflt;
  $('tbRef').innerHTML=n.cols.map((c,i)=>'<option value="'+i+'"'+(i===dflt?' selected':'')+'>'+c+'</option>').join('')}
function table(){const n=norm(S.id),best=$('tbBest').checked,ref=S.ref;let rows=n.rows.slice();
  if(S.sort>=0)rows.sort((a,b)=>{const x=num(a.v[S.sort]),y=num(b.v[S.sort]);if(x==null)return 1;if(y==null)return -1;return S.dir*(y-x)});
  let h='<thead><tr><th class="l" data-c="-1">Benchmark</th>'+n.cols.map((c,i)=>'<th data-c="'+i+'" title="Sort by this column">'+c+(S.sort===i?(S.dir>0?' ↓':' ↑'):'')+'</th>').join('')+'</tr></thead><tbody>';
  if(n.meta)Object.entries(n.meta).forEach(([k,v])=>{h+='<tr class="meta"><td class="l">'+k+'</td>'+v.map(x=>'<td>'+x+'</td>').join('')+'</tr>'});
  let lastG='';rows.forEach(r=>{if(r.group&&r.group!==lastG&&S.sort<0){h+='<tr class="grp"><td class="l" colspan="'+(n.cols.length+1)+'">'+r.group+'</td></tr>';lastG=r.group}
    const vals=r.v.map(num),ok=vals.filter(v=>v!=null),bv=r.neutral?null:(r.lower?Math.min(...ok):Math.max(...ok));
    h+='<tr><td class="l">'+r.label+(r.sub?' <span class="mute small">'+r.sub+'</span>':'')+'</td>'+r.v.map((s,i)=>{const v=vals[i];let d='';
      if(i!==ref&&v!=null&&vals[ref]!=null&&!r.neutral){const dd=(v-vals[ref])*(r.lower?-1:1),dec=(s.split('.')[1]||'').length;d='<span class="dl '+(dd>0?'up':dd<0?'dn':'')+'">'+(dd>0?'+':dd<0?'−':'±')+Math.abs(dd).toFixed(dec)+'</span>'}
      return '<td class="'+(best&&v!=null&&v===bv?'best':'')+(i===ref?' ref':'')+'">'+s+d+'</td>'}).join('')+'</tr>'});
  $('tbT').innerHTML=h+'</tbody>';
  $('tbT').querySelectorAll('th[data-c]').forEach(th=>th.addEventListener('click',()=>{const c=+th.dataset.c;if(S.sort===c)S.dir=-S.dir;else{S.sort=c;S.dir=1}table()}));
  $('tbCap').innerHTML=n.cap.replace(/\$([^$]*)\$/g,'$1').replace(/\\&/g,'&amp;')+' '+A(PAPER.meta.ax+'#'+n.at,'In the paper')+'. Deltas are against the compared column; "better" means lower for bits per byte.';
  // wins against the reference column, with Table 3's tie rule of 0.3
  const tie=S.id==='T3'?0.3:0;let w=0,t=0,l=0;const last=n.cols.length-1;
  const tgt=S.id==='T4'||S.id==='T5'?null:last;
  if(tgt!=null&&tgt!==ref){n.rows.forEach(r=>{if(r.neutral)return;const a=num(r.v[ref]),b=num(r.v[tgt]);if(a==null||b==null)return;const dd=(b-a)*(r.lower?-1:1);if(Math.abs(dd)<=tie+1e-9)t++;else if(dd>0)w++;else l++});
    $('tbWins').innerHTML=stat(n.cols[tgt]+' better',w,'rows')+stat('Same level',t,tie?'gap of 0.3 or less (caption rule)':'equal')+stat(n.cols[tgt]+' worse',l,'rows')}
  else $('tbWins').innerHTML=''}
$('tbSel').addEventListener('change',()=>{S.id=$('tbSel').value;S.sort=-1;refOpts();table()});
$('tbRef').addEventListener('change',()=>{S.ref=+$('tbRef').value;table()});
$('tbBest').addEventListener('change',table);
refOpts();table();
// ablation gains chart
let AB='T4';
function ablDraw(w){const t=TB[AB],rows=t.rows,narrow=w<560,lab=narrow?96:140,H=24+rows.length*30+28;
  const dl=rows.map(r=>[0,1].map(s=>{const a=+r.v[2*s],b=+r.v[2*s+1];return (b-a)*(r.lower?-1:1)}));
  const mx=Math.max(1,...dl.flat().map(Math.abs))*1.1,cx=lab+(w-lab-40)/2+4,half=(w-lab-40)/2,X=v=>cx+half*v/mx;let s='';
  s+=ln2(cx,16,cx,H-26,'var(--ink)',{op:.5});[-mx/1.1,mx/1.1].forEach(v=>{s+=tx(X(v),H-10,(v>0?'+':'−')+Math.abs(v).toFixed(1),{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx(cx,H-10,'0',{fs:11,a:'middle',c:'var(--mute)'});
  rows.forEach((r,i)=>{const y=22+i*30;s+=tx(lab-6,y+12,r.bench+(r.lower?' (BPB)':''),{fs:11.5,a:'end'});
    [0,1].forEach(sc=>{const v=dl[i][sc],yy=y+sc*12,c=sc?'var(--c1)':'var(--c6)';s+=rc(Math.min(cx,X(v)),yy,Math.max(1,Math.abs(X(v)-cx)),10,v<0?'var(--bad)':c,{r:1,op:sc?1:.75})+'<title>'+(sc?'large':'small')+' scale: '+(v>=0?'+':'')+v.toFixed(r.lower?3:1)+'</title>';
      if(!narrow||Math.abs(v)>mx*0.25)s+=tx(v>=0?X(v)+3:X(v)-3,yy+9,(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(r.lower?3:1),{fs:11,a:v>=0?'start':'end',c:'var(--mute)'})})});
  const lg=legend([['small MoE (15.7B total, 2.4B active)','var(--c6)'],['large MoE (228.7B, 20.9B active)','var(--c1)']],lab,14,w-lab);
  $('ablSvg').innerHTML=svgW(w,H+lg.h,'<g transform="translate(0,'+lg.h+')">'+s+'</g>'+lg.s,'Gain per benchmark');
  const W=RC.wins[AB];$('ablNote').innerHTML=(AB==='T4'?'MTP':'The bias rule')+' is better on '+W[0].better+' of 10 at the small scale ('+W[0].same+' tie'+(W[0].worse?', worse on '+W[0].worse_rows.join(', '):'')+') and '+W[1].better+' of 10 at the large scale ('+(W[1].same?W[1].same+' tie, ':'')+'worse on '+W[1].worse_rows.join(', ')+'). Training tokens: '+t.meta['# Training Tokens'].join(', ')+'. Red bars are losses.'}
document.querySelectorAll('#ablM button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#ablM button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});AB=b.dataset.m;refit($('ablSvg'))}));
// checks
let h='<thead><tr><th class="l">Claim</th><th>Where</th><th>Printed</th><th>Recomputed</th><th></th></tr></thead><tbody>';
RC.checks.forEach(c=>{const at=c.at==='README'?A('https://github.com/deepseek-ai/DeepSeek-V3','README'):A(PAPER.meta.ax+'#'+c.at,c.at.replace(/^S(\d+)\.T(\d+)$/,'Table $2').replace(/^S(\d+)((\.SS\d+)*)((\.SSS\d+)*)$/,m=>'§'+m.match(/\d+/g).join('.')).replace(/^S(\d+)$/,'§$1'));
  h+='<tr><td class="l">'+c.claim+(c.note?'<br><span class="mute small">'+c.note+'</span>':'')+'</td><td>'+at+'</td><td>'+c.printed+'</td><td>'+c.recomputed+'</td><td class="'+(c.ok?'ok':'no')+'">'+(c.ok?'✓':'✗')+'</td></tr>'});
$('chkT').innerHTML=h+'</tbody>';
onTab('t-tables',()=>fit($('ablSvg'),ablDraw));
})();
