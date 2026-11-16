// ---- The tables tab: Tables 3 and 4 (by block, with interval bars), 13, 14, 15, 8, 1, 11 and every recomputed check ----
(function(){
const T=PAPER.tables,RC=PAPER.rc,E=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const mi=s=>E(s).replace(/(^|[\s\[\/(,])-(?=[\d.])/g,'$1−').replace(/10\^(−?-?\d+)/g,(m,e)=>'10<sup>'+e.replace('-','−')+'</sup>');
const pts=p=>p&&p[0]!=null?((p[0]>0?'+':p[0]<0?'−':'')+Math.abs(p[0]).toFixed(Math.abs(p[0])<0.1&&p[0]!==0?2:1)+(p[1]!=null?' ['+p[1].toFixed(1).replace('-','−')+', '+p[2].toFixed(1).replace('-','−')+']':'')):'';
function bar(p,R){if(!p||p[1]==null)return '';const w=120,X=v=>w/2+(w/2-4)*Math.max(-1,Math.min(1,v/R));const c=p[1]>0?'var(--c1)':p[2]<0?'var(--c2)':'var(--mute)';
  return '<svg viewBox="0 0 '+w+' 14" width="'+w+'" height="14" aria-hidden="true"><rect x="'+X(-2)+'" y="0" width="'+(X(2)-X(-2))+'" height="14" fill="var(--soft)"/><line x1="'+w/2+'" y1="0" x2="'+w/2+'" y2="14" stroke="var(--mute)"/><line x1="'+X(p[1])+'" y1="7" x2="'+X(p[2])+'" y2="7" stroke="'+c+'" stroke-width="3"/><circle cx="'+X(p[0])+'" cy="7" r="3" fill="'+c+'"/></svg>'}
const rows=T.table3.map(r=>Object.assign({t:3},r)).concat(T.table4.map(r=>Object.assign({t:4},r)));
const blocks=[...new Set(rows.map(r=>r.block))];
const sel=document.getElementById('drBlk');sel.innerHTML='<option value="">All '+rows.length+' rows</option>'+blocks.map((b,i)=>'<option value="'+i+'">'+E(b)+'</option>').join('');
function t34(){const v=sel.value,R=r=>r.block.startsWith('Dense')||r.block.startsWith('At outcome')?16:4;
  document.getElementById('drT34b').innerHTML=rows.filter(r=>v===''||r.block===blocks[+v]).map((r,i,a)=>(i===0||a[i-1].block!==r.block?'<tr><th colspan="6" style="text-align:left">'+E(r.block)+' <span class="small mute">(Table '+r.t+')</span></th></tr>':'')+
    '<tr><td>'+mi(r.method)+'</td><td>'+E(r.model)+'</td><td class="num">'+E(r.n)+'</td><td class="num">'+(r.pts&&r.pts[1]!=null?pts(r.pts):mi(r.delta.split(' / ').map(x=>(100*parseFloat(x)).toFixed(1).replace(/^(?=\d)/,'+')).join(' / ')))+'</td><td>'+bar(r.pts,R(r))+'</td><td class="small">'+mi(r.test)+'</td></tr>').join('')}
sel.addEventListener('change',t34);t34();
const f3=s=>mi(s.replace(/[+-]?\d*\.\d+/g,m=>{const v=100*parseFloat(m);return (v>0&&/^\+/.test(m)?'+':'')+v.toFixed(1)}));
document.getElementById('drT13b').innerHTML=T.table13.map(r=>'<tr><td>'+mi(r.config)+'</td><td>'+E(r.base)+'</td><td class="num">'+r.n+'</td><td class="num">'+pts(r.tok_pts)+'</td><td class="num">'+pts(r.time_pts)+'</td><td class="num">'+E(r.hours)+'</td></tr>').join('');
document.getElementById('drT14b').innerHTML=T.table14.map(r=>'<tr><td>'+mi(r.config)+'</td>'+['select','generate','credit','update','total'].map(k=>'<td class="num">'+r[k].toLocaleString('en-GB')+'</td>').join('')+'<td class="num">'+(r.total-r.select-r.generate-r.credit-r.update)+'</td></tr>').join('');
document.getElementById('drT15b').innerHTML=T.table15.map(r=>r.tc?'<tr><td>'+mi(r.config)+'</td><td class="num">'+pts(r.pts)+'</td><td class="num">'+mi(r.holm)+'</td><td class="num">'+E(r.lower)+'</td><td class="num">'+f3(r.tokens)+'</td><td class="num">'+E(r.hours)+'</td></tr>':'<tr><td>'+E(r.config)+'</td><td class="num">reference</td><td></td><td></td><td></td><td class="num">'+E(r.hours)+'</td></tr>').join('');
document.getElementById('drT8b').innerHTML=T.table8.map(r=>'<tr><td>'+E(r.setting)+'</td><td class="num">'+r.n+'</td><td class="num">'+E(r.cand)+'</td><td class="num">'+E(r.rew_filter)+'</td><td class="num">'+E(r.rew_outcome)+'</td><td class="num">'+E(r.start)+'</td><td class="num" style="font-weight:600;color:'+(r.pts[1]>0?'var(--c1)':'var(--ink)')+'">'+pts(r.pts)+'</td></tr>').join('');
document.getElementById('drT1b').innerHTML=T.table1.map(r=>'<tr><td>'+mi(r.setting)+'</td><td class="num">'+E(r.cand)+'</td><td>'+E(r.pred)+'</td><td class="num">'+mi(r.result.replace(/\^([ab])/,' ($1)'))+'</td></tr>').join('');
document.getElementById('drT11b').innerHTML=T.table11.map(r=>'<tr><td>'+E(r.setting.replace(/\( (\d+) \)/,'($1)'))+'</td><td class="num">'+E(r.target)+'</td><td class="num">'+E(r.tokens)+'</td><td class="num">'+E(r.time)+'</td></tr>').join('');
const ax=a=>'<a href="'+PAPER.meta.ax+'#'+a+'" target="_blank" rel="noopener noreferrer">'+a.replace(/^S(\d+)\.T(\d+)$/,'Table $2').replace(/^A\d+\.T(\d+)$/,'Table $1').replace(/^S(\d+)\.SS(\d+)$/,'§$1.$2').replace(/^S(\d+)$/,'§$1').replace(/^A(\d+)\.SS(\d+)(\.SSS(\d+))?$/,(m,x,y,z,q)=>'App. '+'ABCDEFGHIJKL'[+x-1]+'.'+y+(q?'.'+q:''))+'</a>';
document.getElementById('drRCb').innerHTML=RC.checks.map(c=>'<tr><td>'+E(c.name)+'<div class="small mute">'+E(c.how)+'</div></td><td>'+ax(c.at)+'</td><td>'+E(c.paper)+'</td><td>'+E(c.ours)+'</td><td style="font-weight:600;color:'+(c.agree?'var(--good)':'var(--bad)')+'">'+(c.agree?'agrees':'differs')+'</td></tr>').join('');
document.getElementById('drRcSum').innerHTML='<b>'+RC.agree+' of '+RC.n+'</b> checks agree.';
})();
