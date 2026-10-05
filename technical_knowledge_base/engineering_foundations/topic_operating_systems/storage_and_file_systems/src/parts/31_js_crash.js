// ---- Crash lab: every crash point of six checkpoint protocols under two persistence models ----
(function(){
const $=id=>document.getElementById(id),esc=RD.esc;if(!$('cr-card'))return;
// Initial state: an older checkpoint exists. Inodes: A = old ckpt.pt; S0 = old shard, M0 = old .metadata (DCP); step_100 holds an older DCP checkpoint.
const O=(k,o)=>Object.assign({k},o);
const P={
 naive:{name:'torch.save(state, "ckpt.pt")',kind:'file',ops:[
  O('trunc',{p:'ckpt.pt',t:'openat("DIR/ckpt.pt", O_WRONLY|O_CREAT|O_TRUNC) = 5'}),O('write',{p:'ckpt.pt',t:'write(5, ...) x 5, 276,707 bytes'}),O('close',{p:'ckpt.pt',t:'close(5)'})]},
 fsync:{name:'save, flush, fsync (in place)',kind:'file',ops:[
  O('trunc',{p:'ckpt.pt',t:'openat("DIR/ckpt.pt", O_WRONLY|O_CREAT|O_TRUNC) = 5'}),O('write',{p:'ckpt.pt',t:'write(5, ...) x 9, 276,813 bytes'}),O('fsync',{p:'ckpt.pt',t:'fsync(5)'}),O('close',{p:'ckpt.pt',t:'close(5)'})]},
 rename:{name:'tmp, rename (no fsync)',kind:'file',ops:[
  O('creat',{p:'ckpt.pt.tmp',t:'openat("DIR/ckpt.pt.tmp", O_WRONLY|O_CREAT|O_TRUNC) = 5'}),O('write',{p:'ckpt.pt.tmp',t:'write(5, ...) x 9, 276,813 bytes'}),O('close',{p:'ckpt.pt.tmp',t:'close(5)'}),O('rename',{a:'ckpt.pt.tmp',b:'ckpt.pt',t:'renameat("DIR/ckpt.pt.tmp", "DIR/ckpt.pt")'})]},
 rfsync:{name:'tmp, fsync, rename',kind:'file',ops:[
  O('creat',{p:'ckpt.pt.tmp',t:'openat("DIR/ckpt.pt.tmp", O_WRONLY|O_CREAT|O_TRUNC) = 5'}),O('write',{p:'ckpt.pt.tmp',t:'write(5, ...) x 9, 276,813 bytes'}),O('fsync',{p:'ckpt.pt.tmp',t:'fsync(5)'}),O('close',{p:'ckpt.pt.tmp',t:'close(5)'}),O('rename',{a:'ckpt.pt.tmp',b:'ckpt.pt',t:'renameat("DIR/ckpt.pt.tmp", "DIR/ckpt.pt")'})]},
 safe:{name:'tmp, fsync, rename, fsync(dir)',kind:'file',ops:[
  O('creat',{p:'ckpt.pt.tmp',t:'openat("DIR/ckpt.pt.tmp", O_WRONLY|O_CREAT|O_TRUNC) = 5'}),O('write',{p:'ckpt.pt.tmp',t:'write(5, ...) x 9, 276,813 bytes'}),O('fsync',{p:'ckpt.pt.tmp',t:'fsync(5)'}),O('close',{p:'ckpt.pt.tmp',t:'close(5)'}),O('rename',{a:'ckpt.pt.tmp',b:'ckpt.pt',t:'renameat("DIR/ckpt.pt.tmp", "DIR/ckpt.pt")'}),O('fsyncdir',{p:'DIR',t:'openat("DIR", O_RDONLY) = 5; fsync(5); close(5)'})]},
 dcp:{name:'dcp.save into the same directory',kind:'dcp',ops:[
  O('trunc',{p:'step_20/__0_0.distcp',t:'openat("DIR/step_20/__0_0.distcp", O_WRONLY|O_CREAT|O_TRUNC) = 19'}),O('write',{p:'step_20/__0_0.distcp',t:'write(19, ...) x 27, 299,895 bytes'}),O('fsync',{p:'step_20/__0_0.distcp',t:'fsync(19)'}),O('close',{p:'step_20/__0_0.distcp',t:'close(19)'}),
  O('creat',{p:'step_20/.metadata.tmp',t:'openat("DIR/step_20/.metadata.tmp", O_WRONLY|O_CREAT|O_TRUNC) = 19'}),O('write',{p:'step_20/.metadata.tmp',t:'write(19, ...) x 1, 3,974 bytes'}),O('fsync',{p:'step_20/.metadata.tmp',t:'fsync(19)'}),O('close',{p:'step_20/.metadata.tmp',t:'close(19)'}),
  O('unlink',{p:'step_20/.metadata',t:'unlinkat("DIR/step_20/.metadata")'}),O('rename',{a:'step_20/.metadata.tmp',b:'step_20/.metadata',t:'renameat("DIR/step_20/.metadata.tmp", "DIR/step_20/.metadata")'})]},
 dcpnew:{name:'dcp.save to a new step directory, then fsync the parent',kind:'dcpnew',ops:[
  O('mkdir',{p:'step_40',t:'mkdirat("DIR/step_40")'}),
  O('creat',{p:'step_40/__0_0.distcp',t:'openat("DIR/step_40/__0_0.distcp", O_WRONLY|O_CREAT|O_TRUNC) = 19'}),O('write',{p:'step_40/__0_0.distcp',t:'write(19, ...) x 27, 299,895 bytes'}),O('fsync',{p:'step_40/__0_0.distcp',t:'fsync(19)'}),O('close',{p:'step_40/__0_0.distcp',t:'close(19)'}),
  O('creat',{p:'step_40/.metadata.tmp',t:'openat("DIR/step_40/.metadata.tmp", O_WRONLY|O_CREAT|O_TRUNC) = 19'}),O('write',{p:'step_40/.metadata.tmp',t:'write(19, ...) x 1, 3,974 bytes'}),O('fsync',{p:'step_40/.metadata.tmp',t:'fsync(19)'}),O('close',{p:'step_40/.metadata.tmp',t:'close(19)'}),
  O('rename',{a:'step_40/.metadata.tmp',b:'step_40/.metadata',t:'renameat("DIR/step_40/.metadata.tmp", "DIR/step_40/.metadata")'}),O('fsyncdir',{p:'step_40',t:'fsync of DIR/step_40 (added: DCP does not do this)'}),O('fsyncdir',{p:'DIR',t:'fsync of DIR (added: DCP does not do this)'})]}
};
const dirOf=p=>p.indexOf('/')>=0?p.slice(0,p.lastIndexOf('/')):'DIR';
const META={trunc:1,creat:1,rename:1,unlink:1,mkdir:1};
function init(kind){if(kind==='file')return {'ckpt.pt':'A'};
  if(kind==='dcp')return {'step_20':'dir','step_20/__0_0.distcp':'S0','step_20/.metadata':'M0'};
  return {'step_20':'dir','step_20/__0_0.distcp':'S0','step_20/.metadata':'M0'}}
// Run ops[0..k-1] in memory: assign inode ids, record per-inode history.
function trace(pr,k){const names=Object.assign({},init(pr.kind)),ops=[],ino={};let nid=0;
  const I=id=>ino[id]||(ino[id]={id,old:/^(A|S0|M0)$/.test(id),trunc:-1,creat:-1,lastw:-1,fs:-1,close:-1});
  Object.values(names).forEach(v=>{if(v!=='dir')I(v)});
  pr.ops.slice(0,k).forEach((o,i)=>{const r=Object.assign({i},o);
    if(o.k==='creat'){const id='N'+(++nid);names[o.p]=id;I(id).creat=i;r.ino=id}
    else if(o.k==='mkdir'){names[o.p]='dir'}
    else if(o.k==='trunc'){r.ino=names[o.p];I(r.ino).trunc=i}
    else if(o.k==='write'){r.ino=names[o.p];I(r.ino).lastw=i}
    else if(o.k==='fsync'){r.ino=names[o.p];I(r.ino).fs=i}
    else if(o.k==='close'){r.ino=names[o.p];I(r.ino).close=i}
    else if(o.k==='rename'){r.ino=names[o.a];r.over=!!names[o.b];names[o.b]=names[o.a];delete names[o.a]}
    else if(o.k==='unlink'){delete names[o.p]}
    ops.push(r)});
  return {ops,ino}}
// Which metadata changes are durable at the crash, per model
function durable(m,ops,model){return ops.some(o=>o.i>m.i&&(model==='ext4'?(o.k==='fsync'||o.k==='fsyncdir'):
  (o.k==='fsyncdir'&&(m.k==='trunc'?false:dirOf(m.k==='rename'?m.b:m.p)===o.p))||(o.k==='fsync'&&m.k==='trunc'&&o.ino===m.ino)))}
function candidates(ops,model){const metas=ops.filter(o=>META[o.k]);const dur=metas.map(m=>durable(m,ops,model));const out=[];
  if(model==='ext4'){let lo=0;dur.forEach((d,j)=>{if(d)lo=j+1});for(let L=lo;L<=metas.length;L++)out.push(metas.slice(0,L))}
  else{const free=metas.filter((m,j)=>!dur[j]);for(let s=0;s<(1<<free.length);s++)out.push(metas.filter((m,j)=>dur[j]||(s>>free.indexOf(m)&1)))}
  return out}
function apply(kind,persisted){const names=Object.assign({},init(kind));persisted.forEach(m=>{
  if(m.k==='creat')names[m.p]=m.ino;else if(m.k==='mkdir')names[m.p]='dir';else if(m.k==='rename'){if(names[m.a]){names[m.b]=names[m.a];delete names[m.a]}}else if(m.k==='unlink')delete names[m.p]});
  // a name inside a directory whose creation did not persist does not exist
  Object.keys(names).forEach(n=>{if(n.indexOf('/')>=0&&!names[dirOf(n)])delete names[n]});return names}
// Possible contents of an inode after the crash, given which metadata changes persisted
function contents(x,persisted,ops,model){const inP=i=>persisted.some(m=>m.i===i);
  const synced=x.fs>x.lastw&&x.lastw>=0,wrote=x.lastw>=0;
  if(x.old){if(x.trunc<0)return['old'];
    if(!inP(x.trunc))return model==='ext4'||!wrote?['old']:['old','torn','new'];
    if(!wrote)return['empty'];if(synced)return['new'];
    if(model==='ext4'&&x.close>=0&&persisted.some(m=>m.i>x.close))return['new'];
    return['empty','partial','new']}
  if(!wrote)return['empty'];if(synced)return['new'];
  if(model==='ext4'&&ops.some(o=>o.k==='rename'&&o.ino===x.id&&o.over&&inP(o.i)))return['new'];
  return['empty','partial','new']}
const LBL={old:['previous checkpoint','good'],oldlost:['previous checkpoint (the save that returned is lost)','amb'],new:['new checkpoint','good'],empty:['0-byte file','bad'],partial:['file cut short','bad'],torn:['mix of old and new bytes','bad'],missing:['no file at all','bad'],
 nometa:['no .metadata: nothing loads','bad'],mismatch:['old .metadata with the new shard','bad'],shardbad:['shard damaged','bad'],metabad:['.metadata damaged','bad'],step40:['step_40 complete, loads','good'],step20:['falls back to step_20','good'],step20lost:['falls back to step_20 (the save that returned is lost)','amb']};
function outcomes(pr,k,model){const {ops,ino}=trace(pr,k),res=new Set(),end=k===pr.ops.length;
  candidates(ops,model).forEach(Pm=>{const names=apply(pr.kind,Pm),C=id=>id&&ino[id]?contents(ino[id],Pm,ops,model):null;
    if(pr.kind==='file'){const c=C(names['ckpt.pt']);if(!c){res.add('missing');return}c.forEach(v=>res.add(v==='old'&&end?'oldlost':v))}
    else if(pr.kind==='dcp'){const cm=C(names['step_20/.metadata']),cs=C(names['step_20/__0_0.distcp']);
      if(!cm){res.add('nometa');return}
      cm.forEach(m=>cs.forEach(s=>{const mo=ino[names['step_20/.metadata']].old;
        if(m==='empty'||m==='partial'||m==='torn')res.add('metabad');else if(s==='empty'||s==='partial'||s==='torn')res.add('shardbad');
        else if(mo&&s==='old')res.add(end?'oldlost':'old');else if(mo&&s==='new')res.add('mismatch');else if(!mo&&s==='new')res.add('new');else res.add('mismatch')}))}
    else{const cm=C(names['step_40/.metadata']),cs=C(names['step_40/__0_0.distcp']);
      const ok=cm&&cs&&cm.indexOf('new')>=0&&cs.indexOf('new')>=0;const onlyOk=ok&&cm.length===1&&cs.length===1;
      if(ok)res.add('step40');if(!onlyOk)res.add(end?'step20lost':'step20')}});
  return [...res]}
function chips(list){return list.map(o=>'<span class="'+LBL[o][1]+'">'+esc(LBL[o][0])+'</span>').join('')}
function why(pr,k,model){const {ops}=trace(pr,k);const metas=ops.filter(o=>META[o.k]);if(!metas.length)return 'No name or size change has happened yet: the disk holds exactly what it held before.';
  const d=metas.filter(m=>durable(m,ops,model)).length;
  return metas.length+' name or size change'+(metas.length>1?'s':'')+' so far, '+d+' known durable; '+(model==='ext4'?'after a crash a prefix of them is on disk (the journal keeps them in order).':'the others may or may not be on disk, independently.')}
let cur='naive';
function draw(k){const pr=P[cur];
  $('cr-ops').innerHTML=pr.ops.map((o,i)=>(i===k?'<div class="cut">power lost here</div>':'')+'<div class="'+(i<k?'done':'')+'"><span class="k">'+(i+1)+'. '+o.k+'</span> '+esc(o.t)+'</div>').join('')+(k===pr.ops.length?'<div class="cut">power lost here, after the save returned</div>':'');
  $('cr-cap').innerHTML='<b>Crash point '+(k+1)+' of '+(pr.ops.length+1)+'</b>: '+(k===0?'before the first call.':k===pr.ops.length?'the save has returned; the program believes the checkpoint is safe.':'after <code>'+esc(pr.ops[k-1].k)+'</code>, before <code>'+esc(pr.ops[k].k)+'</code>.');
  ['weak','ext4'].forEach(m=>{$('cr-'+m).innerHTML=chips(outcomes(pr,k,m));$('cr-'+m+'-why').textContent=why(pr,k,m)});
  [...$('cr-grid').querySelectorAll('tbody tr')].forEach((tr,i)=>tr.classList.toggle('cur',i===k))}
function grid(){const pr=P[cur],n=pr.ops.length;let bad={weak:0,ext4:0};
  $('cr-grid').innerHTML='<thead><tr><th>Crash after</th><th>POSIX only</th><th>ext4 here</th></tr></thead><tbody>'+Array.from({length:n+1},(_,k)=>{const w=outcomes(pr,k,'weak'),e=outcomes(pr,k,'ext4');
    if(w.some(o=>LBL[o][1]==='bad'))bad.weak++;if(e.some(o=>LBL[o][1]==='bad'))bad.ext4++;
    return '<tr><td>'+(k===0?'(nothing)':k+'. '+esc(pr.ops[k-1].k))+'</td><td><div class="oc">'+chips(w)+'</div></td><td><div class="oc">'+chips(e)+'</div></td></tr>'}).join('')+'</tbody>';
  $('cr-sum').innerHTML='<b>'+esc(pr.name)+'</b>: a crash can leave no usable checkpoint at '+bad.weak+' of '+(n+1)+' crash points under POSIX-only guarantees, and at '+bad.ext4+' of '+(n+1)+' on this VM\'s ext4.'+
   (cur==='safe'||cur==='dcpnew'?' Every crash point leaves a loadable checkpoint under both models.':'')}
RD.crashModel={P,outcomes};
let an=RD.anim({card:'cr-card',ctl:'cr-ctl',n:P[cur].ops.length+1,draw,ms:1500,label:'Crash point'});
const seg=$('cr-proto');seg.innerHTML=Object.keys(P).map((k,i)=>'<button data-m="'+k+'"'+(i===0?' class="on"':'')+'>'+esc(P[k].name)+'</button>').join('');
seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));cur=b.dataset.m;grid();an.reset(P[cur].ops.length+1)});
grid();an.redraw();
})();
