// ---- The tables tab: comparison explorer, checks, Tables 21, 22, 23, languages, architecture ----
(function(){
const P=window.PAPER,TB=P.tables,RC=P.rc,num=Q3.num;
const IDS=['T3','T4','T5','T6','T7','T8','T11','T12','T13','T14','T15','T16','T17','T18','T19','T20'];
const short=t=>'Table '+TB[t].n+': '+TB[t].caption.replace(/^Table \d+:\s*/,'').replace(/ The highest.*$/,'').replace(/^Comparison among /,'').slice(0,80);
const sel=$('cmpT');IDS.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=short(t);sel.appendChild(o)});
function setCols(){const t=TB[sel.value],c=$('cmpC');c.innerHTML='';t.cols.forEach((col,i)=>{const o=document.createElement('option');o.value=i;o.textContent=col.name;c.appendChild(o)});
  const q=t.cols.findIndex(x=>/^Qwen3/.test(x.name));c.value=t.cols.length-1;if(q<0)c.value=t.cols.length-1}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
function drawCmp(){const t=TB[sel.value],ref=+$('cmpC').value,srt=$('cmpS').checked;
  let rows=[];t.groups.forEach(g=>g.rows.forEach(r=>rows.push(Object.assign({g:g.g},r))));
  const dlt=(r,i)=>{const a=num(r.v[i]),b=num(r.v[ref]);return a==null||b==null?null:a-b};
  const W=t.cols.map(()=>[0,0,0]);rows.forEach(r=>t.cols.forEach((c,i)=>{if(i===ref)return;const d=dlt(r,i);if(d==null)return;W[i][d>0?0:d<0?1:2]++}));
  if(srt){const best=t.cols.length-1===ref?0:t.cols.length-1;rows.sort((a,b)=>(dlt(b,best)??-1e9)-(dlt(a,best)??-1e9))}
  let h='<table><thead><tr><th>Benchmark</th>'+t.cols.map((c,i)=>'<th class="num"'+(i===ref?' style="background:var(--acc2)"':'')+'>'+esc(c.name)+'<div class="small mute">'+c.arch+' · '+c.act+(c.act!==c.total?' / '+c.total:'')+'</div></th>').join('')+'</tr></thead><tbody>';
  let lastg='';rows.forEach(r=>{if(!srt&&r.g!==lastg){h+='<tr><td colspan="'+(t.cols.length+1)+'" class="small mute"><b>'+esc(r.g)+'</b></td></tr>';lastg=r.g}
    h+='<tr><td>'+esc(r.b)+'</td>'+r.v.map((v,i)=>{const d=dlt(r,i),st=(r.bold.indexOf(i)>=0?'font-weight:700;':'')+(r.under.indexOf(i)>=0?'text-decoration:underline;':'');
      return '<td class="num"><span style="'+st+'">'+esc(v||'')+'</span>'+(i!==ref&&d!=null?'<div class="small" style="color:'+(d>0?'var(--good)':d<0?'var(--bad)':'var(--mute)')+'">'+(d>0?'+':'')+(Math.abs(d)>=100?d.toFixed(0):d.toFixed(Math.abs(d)<10&&String(v).indexOf('.')>=0&&String(v).split('.')[1].length===2?2:1))+'</div>':'')+'</td>'}).join('')+'</tr>'});
  $('cmpTab').innerHTML=h+'</tbody></table>';
  $('cmpSum').innerHTML=t.cols.map((c,i)=>i===ref?'':stat(esc(c.name),W[i][0]+' – '+W[i][1]+(W[i][2]?' – '+W[i][2]:''),'wins – losses'+(W[i][2]?' – ties':'')+' against '+esc(t.cols[ref].name))).join('')}
sel.addEventListener('change',()=>{setCols();drawCmp()});$('cmpC').addEventListener('change',drawCmp);$('cmpS').addEventListener('change',drawCmp);
setCols();onTab('t-tables',drawCmp);

// checks
(function(){let h='<table><thead><tr><th>Claim</th><th>Where</th><th>What the tables give</th><th>Verdict</th></tr></thead><tbody>';
  RC.checks.forEach(c=>{const ok=/^reproduces|^consistent/.test(c.verdict),bad=/does not|not measured/.test(c.verdict);
    h+='<tr><td>'+esc(c.claim)+'</td><td class="small">'+esc(c.where)+'</td><td class="small">'+esc(c.got)+'</td><td class="small" style="color:'+(bad?'var(--bad)':ok?'var(--good)':'var(--ink)')+'">'+esc(c.verdict)+'</td></tr>'});
  $('chkT').innerHTML=h+'</tbody></table>'})();

// Table 21
(function(){const t=TB.T21;let h='<table><thead><tr>'+t.head.map((x,i)=>'<th'+(i?' class="num"':'')+'>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>';
  t.rows.forEach(r=>{h+='<tr>'+r.map((x,i)=>'<td'+(i?' class="num"':'')+'>'+esc(x)+'</td>').join('')+'</tr>'});$('t21T').innerHTML=h+'</tbody></table>'})();
// Table 22
(function(){const t=TB.T22;let h='<table><thead><tr><th>Benchmark</th>'+t.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr></thead><tbody>';let lg='';
  t.rows.forEach(r=>{if(r.g!==lg){h+='<tr><td colspan="6" class="small mute"><b>'+esc(r.g)+'</b></td></tr>';lg=r.g}
    const v=r.v.length===5?r.v:[r.v[0],r.v[1],r.v[1],r.v[2],r.v[2]];
    h+='<tr><td>'+esc(r.b)+'</td>'+v.map((x,i)=>{const m=String(x).match(/^([\d.]+)([+-][\d.]+)?$/);return '<td class="num">'+(m?m[1]+(m[2]?'<div class="small" style="color:'+(m[2][0]==='+'?'var(--good)':'var(--bad)')+'">'+m[2]+'</div>':''):esc(x))+(r.v.length!==5&&i>0?'<div class="small mute">both modes</div>':'')+'</td>'}).join('')+'</tr>'});
  $('t22T').innerHTML=h+'</tbody></table><p class="small mute">* in-house benchmarks. ThinkFollow has one score per stage (it tests switching between the modes).</p>'})();
// Table 23
(function(){const t=TB.T23;let h='<table><thead><tr><th>Model</th><th>Mode</th>'+t.head.map(x=>'<th class="num">'+x+'</th>').join('')+'</tr></thead><tbody>';
  t.rows.forEach(r=>{h+='<tr><td>'+esc(r.m)+'</td><td class="small">'+esc(r.mode.replace(' Mode',''))+'</td>'+r.v.map(x=>{const v=num(x),a=Math.max(0,Math.min(1,(v-50)/50));return '<td class="num" style="background:color-mix(in srgb, var(--acc) '+Math.round(a*45)+'%, transparent)">'+x+'</td>'}).join('')+'</tr>'});
  $('t23T').innerHTML=h+'</tbody></table>'})();
// languages
let lm='Thinking Mode';
function drawLang(){const L=TB.lang,M=L.modes[lm];let h='<table><thead><tr><th>Model</th>'+L.langs.map(x=>'<th class="num">'+esc(x.replace(/ \(.*\)/,''))+'</th>').join('')+'</tr></thead><tbody>';
  const best=L.langs.map((_,j)=>Math.max(...M.avg.map(r=>num(r[j])||0)));
  M.models.forEach((m,i)=>{h+='<tr><td>'+esc(m)+'</td>'+M.avg[i].map((v,j)=>v==null?'<td></td>':'<td class="num"'+(num(v)===best[j]?' style="font-weight:700"':'')+'>'+v+'</td>').join('')+'</tr>'});
  $('lgT').innerHTML=h+'</tbody></table>'}
segBind('lgM',m=>{lm=m;$('lgM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));drawLang()});onTab('t-tables',drawLang);
(function(){const t=TB.T37;let h='<table><thead><tr><th>Model</th>'+t.head.map(x=>'<th class="num">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>';
  t.rows.forEach(r=>{h+='<tr><td>'+esc(r[0])+'</td>'+r.slice(1).map(x=>'<td class="num">'+x+'</td>').join('')+'</tr>'});$('t37T').innerHTML=h+'</tbody></table>'})();
// Tables 1 and 2 with the recount
(function(){let h='<table><thead><tr><th>Model</th><th class="num">Layers</th><th class="num">Heads Q / KV</th><th class="num">Width</th><th class="num">FFN or experts</th><th class="num">Tied</th><th class="num">Total</th><th class="num">Active</th><th class="num">Non-embedding</th></tr></thead><tbody>';
  RC.arch.forEach(a=>{h+='<tr><td>'+a.model+'</td><td class="num">'+a.L+'</td><td class="num">'+a.hq+' / '+a.hkv+'</td><td class="num">'+fmt(a.d)+'</td><td class="num">'+(a.E?a.E+' × '+fmt(a.fe)+', '+a.k+' active':fmt(a.ff))+'</td><td class="num">'+(a.tied?'yes':'no')+'</td><td class="num">'+a.total.toFixed(3)+'B</td><td class="num">'+a.active.toFixed(3)+'B</td><td class="num">'+a.nonemb.toFixed(3)+'B</td></tr>'});
  $('t12T').innerHTML=h+'</tbody></table>'})();
})();
