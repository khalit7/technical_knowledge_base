// ---- OS simulators, 5: crash consistency (every crash point of five write protocols, fsck or journal replay) ----
(function(){
const SC=window.SIMCORE,A=window.SIMA;if(!document.getElementById('sim-cr-card'))return;
const $=id=>document.getElementById(id);
const NAME={I:'inode I',B:'bitmap B',D:'block 5',TxB:'TxB',jI:'journal: I',jB:'journal: B',jD:'journal: Db',TxE:'TxE'};
const OUT={old:['old file','good'],new:['new file','good'],garbage:['garbage in file','bad'],inconsistent:['inconsistent','bad']};
const GRP={none:['the update'],data:['journal write','journal commit','checkpoint'],data_onebatch:['journal write and commit together','checkpoint'],
  ordered:['data in place, metadata to journal','journal commit','checkpoint metadata'],meta_data_late:['metadata to journal','journal commit','checkpoint and data']};
let mode='none',states=SC.crashStates(mode),table=SC.crashTable(mode);
function blk(k,v,cls){return'<span class="sim-blk '+cls+'"><b>'+A.esc(k)+'</b>'+A.esc(v)+'</span>'}
function diskView(d,jr,usesJ){let h=blk('inode I',d.I==='v2'?'v2 (points at 5)':'v1',d.I==='v2'?'on':'')+blk('bitmap B',d.B==='v2'?'v2 (5 used)':'v1 (5 free)',d.B==='v2'?'on':'')+blk('block 5',d.D==='Db'?'new data':'old bytes',d.D==='Db'?'on':'');
  if(usesJ&&jr)h+='<br>'+['TxB','jI','jB','jD','TxE'].filter(k=>[].concat(...SC.MODES[mode]).indexOf(k)>=0).map(k=>blk(NAME[k],jr[k]?'on disk':'missing',jr[k]?'on':'lost')).join('');return h}
function draw(i){const st=states[i],row=table[i],g=SC.MODES[mode],done=new Set(st[1]);g.slice(0,st[0]).forEach(gr=>gr.forEach(b=>done.add(b)));
  $('sim-cr-groups').innerHTML=g.map((gr,gi)=>'<span class="sim-grp"><div class="gl">'+(gi+1)+'. '+GRP[mode][gi]+'</div>'+gr.map(b=>blk(NAME[b],done.has(b)?'written':gi===st[0]?'in flight':'not yet',done.has(b)?'on':'lost')).join('')+'</span>').join('<span class="mute"> then </span>');
  const usesJ=mode!=='none',da=SC.diskAfter(mode,st[0],st[1]);
  $('sim-cr-disk').innerHTML=diskView(row.disk,da.jr,usesJ)+'<div class="small">State: <span class="sim-out '+OUT[row.before][1]+'">'+OUT[row.before][0]+'</span></div>';
  $('sim-cr-after').innerHTML=diskView(row.final,null,false)+'<div class="small">Result: <span class="sim-out '+OUT[row.after][1]+'">'+OUT[row.after][0]+'</span></div>';
  $('sim-cr-act').innerHTML='<b>Recovery.</b> '+A.esc(row.action)+'.';
  const last=i===states.length-1;
  $('sim-cr-cap').innerHTML='Crash point '+(i+1)+' of '+states.length+': '+(last?'no crash, every write completed.':st[0]===0&&!st[1].length?'the crash comes before anything reached the disk.':'groups 1'+(st[0]>1?' to '+st[0]:'')+(st[0]?' complete':'')+(st[0]&&st[1].length?', and ':'')+(st[1].length?'from group '+(st[0]+1)+' only '+st[1].map(b=>NAME[b]).join(', '):'')+(st[0]&&!st[1].length?', nothing of group '+(st[0]+1):'')+'.')}
const an=A.anim({card:'sim-cr-card',ctl:'sim-cr-ctl',n:states.length,draw,ms:1400,label:'Crash point'});
A.seg($('sim-cr-mode'),m=>{mode=m;states=SC.crashStates(m);table=SC.crashTable(m);an.reset(states.length);an.play()});
// summary
const ML={none:'No journal (fsck)',data:'Data journaling',data_onebatch:'Data journaling, TxE sent with the rest',ordered:'Ordered (metadata) journaling',meta_data_late:'Metadata journaling, data written last'};
let h='<table class="sim-t"><tr><th>Protocol</th><th class="num">Crash points</th><th class="num">Old file</th><th class="num">New file</th><th class="num">Garbage</th><th class="num">Inconsistent</th></tr>';
Object.keys(SC.MODES).forEach(m=>{const c={old:0,new:0,garbage:0,inconsistent:0};SC.crashTable(m).forEach(r=>c[r.after]++);
  h+='<tr><td>'+ML[m]+'</td><td class="num">'+SC.crashStates(m).length+'</td><td class="num">'+c.old+'</td><td class="num">'+c.new+'</td><td class="num"'+(c.garbage?' style="color:var(--bad);font-weight:600"':'')+'>'+c.garbage+'</td><td class="num">'+c.inconsistent+'</td></tr>'});
$('sim-cr-sum').innerHTML=h+'</table>';
})();
