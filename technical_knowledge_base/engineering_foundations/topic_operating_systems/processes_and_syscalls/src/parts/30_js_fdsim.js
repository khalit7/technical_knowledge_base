// ---- A tiny model of the kernel's descriptor tables, shared by the Reading animation and the Process lab ----
// State: processes (each with an fd table: fd -> {d: description id, cloexec}), open file descriptions
// (object, offset, access mode), and objects (files, pipes, terminals). Rules modelled after Linux:
// open/pipe/dup take the lowest free fd; fork copies the table (same descriptions); exec closes CLOEXEC fds;
// exit closes all; a pipe's reader sees EOF only when no descriptor anywhere refers to its write end.
window.FDSIM=(function(){
  function init(){return {procs:[],desc:{},objs:{},nd:0,no:0,np:100,log:[],out:{}}}
  const clone=s=>JSON.parse(JSON.stringify(s));
  const P=(s,pid)=>{const p=s.procs.find(x=>x.pid===pid&&x.alive);if(!p)throw new Error('no live process '+pid);return p};
  const lowest=p=>{let f=0;while(p.fds[f])f++;return f};
  function newObj(s,kind,name){const id='o'+(++s.no);s.objs[id]={kind,name,data:'',size:0};return id}
  function newDesc(s,obj,mode){const id='d'+(++s.nd);s.desc[id]={obj,mode,off:0};return id}
  function refs(s,d){let n=0;s.procs.forEach(p=>{if(p.alive)Object.values(p.fds).forEach(e=>{if(e.d===d)n++})});return n}
  function writers(s,obj){let n=0;s.procs.forEach(p=>{if(p.alive)Object.values(p.fds).forEach(e=>{const D=s.desc[e.d];if(D.obj===obj&&D.mode==='w')n++})});return n}
  function gc(s){Object.keys(s.desc).forEach(d=>{if(!refs(s,d))delete s.desc[d]});
    Object.keys(s.objs).forEach(o=>{const O=s.objs[o];if(O.kind!=='file'&&O.kind!=='tty'&&!Object.values(s.desc).some(D=>D.obj===o))delete s.objs[o]})}
  const ops={
    proc(s,a){const pid=+a[0];s.procs.push({pid,name:a[1]||'proc',fds:{},alive:true,parent:null,state:'R'});return 'process '+pid+' ('+(a[1]||'proc')+') exists'},
    tty(s,a){const pid=+a[0],o=newObj(s,'tty','terminal');const p=P(s,pid);const d=newDesc(s,o,'rw');[0,1,2].forEach(f=>p.fds[f]={d,cx:false});return 'fds 0, 1, 2 of '+pid+' are the terminal'},
    file(s,a){newObj(s,'file',a[0]);return 'file '+a[0]+' exists on disk'},
    open(s,a){const p=P(s,+a[0]);let o=Object.keys(s.objs).find(k=>s.objs[k].name===a[1]&&s.objs[k].kind==='file');if(!o)o=newObj(s,'file',a[1]);
      const fl=(a[2]||'').split('|'),mode=fl.includes('O_RDONLY')?'r':'w',d=newDesc(s,o,mode);if(fl.includes('O_TRUNC')){s.objs[o].data='';s.objs[o].size=0}
      const f=lowest(p);p.fds[f]={d,cx:fl.includes('O_CLOEXEC')};return p.name+': open("'+a[1]+'") = '+f},
    pipe(s,a){const p=P(s,+a[0]),cx=a[1]==='O_CLOEXEC',o=newObj(s,'pipe','pipe '+(Object.values(s.objs).filter(x=>x.kind==='pipe').length+1));
      const r=newDesc(s,o,'r'),w=newDesc(s,o,'w');const f1=lowest(p);p.fds[f1]={d:r,cx};const f2=lowest(p);p.fds[f2]={d:w,cx};
      return p.name+': '+(cx?'pipe2(O_CLOEXEC)':'pipe()')+' = ['+f1+', '+f2+'] (read end, write end)'},
    fork(s,a){const p=P(s,+a[0]),c={pid:+a[1],name:a[2]||p.name,fds:clone(p.fds),alive:true,parent:p.pid,state:'R'};s.procs.push(c);
      return p.name+': fork() = '+c.pid+'; the child\'s table is a copy: same descriptions, refcounts up'},
    dup2(s,a){const p=P(s,+a[0]),o=+a[1],n=+a[2];if(!p.fds[o])throw new Error('fd '+o+' not open');if(o===n)return 'dup2 to itself: nothing';
      p.fds[n]={d:p.fds[o].d,cx:false};gc(s);return p.name+': dup2('+o+', '+n+'): fd '+n+' now refers to fd '+o+'\'s description'},
    close(s,a){const p=P(s,+a[0]);(a.slice(1)).forEach(f=>{delete p.fds[+f]});gc(s);return p.name+': close('+a.slice(1).join(', ')+')'},
    exec(s,a){const p=P(s,+a[0]),gone=Object.keys(p.fds).filter(f=>p.fds[f].cx);gone.forEach(f=>delete p.fds[f]);p.name=a[1];gc(s);
      return 'execve: process '+p.pid+' now runs '+a[1]+(gone.length?'; close-on-exec fds '+gone.join(', ')+' closed':'; no fd was close-on-exec')},
    write(s,a){const p=P(s,+a[0]),e=p.fds[+a[1]];if(!e)throw new Error('fd '+a[1]+' not open');const D=s.desc[e.d],O=s.objs[D.obj],txt=a.slice(2).join(' ').replace(/\\n/g,'\n');
      if(O.kind==='file'){const b=O.data;O.data=b.slice(0,D.off)+txt+b.slice(D.off+txt.length);D.off+=txt.length;O.size=O.data.length}else{O.data+=txt}
      return p.name+': write('+a[1]+', "'+txt.replace(/\n/g,'\\n')+'")'+(O.kind==='file'?'; offset now '+D.off:'')},
    read(s,a){const p=P(s,+a[0]),e=p.fds[+a[1]];if(!e)throw new Error('fd '+a[1]+' not open');const D=s.desc[e.d],O=s.objs[D.obj];
      if(O.kind==='pipe'){if(O.data){const t=O.data;O.data='';p.state='R';return p.name+': read('+a[1]+') = "'+t.replace(/\n/g,'\\n')+'"'}
        const w=writers(s,D.obj);if(w){p.state='S';return p.name+': read('+a[1]+') blocks: pipe empty, '+w+' write end'+(w>1?'s':'')+' still open somewhere'}p.state='R';return p.name+': read('+a[1]+') = 0: end of file (no write end open anywhere)'}
      return p.name+': read('+a[1]+')'},
    exit(s,a){const p=P(s,+a[0]);p.fds={};p.alive=false;gc(s);return p.name+' exits: the kernel closes all its descriptors'},
    note(s,a){return a.join(' ')}
  };
  function run(script){ // script: array of {op:'fork 1 2 name', say:'...'}; returns states after each step
    let s=init();const states=[];
    script.forEach(st=>{const parts=st.op.match(/"[^"]*"|\S+/g).map(x=>x.replace(/^"|"$/g,''));const r=ops[parts[0]](s,parts.slice(1));
      s.log.push(r);const snap=clone(s);snap.say=st.say||'';snap.res=r;snap.op=st.op;states.push(snap)});
    return states;
  }
  // Draw one state into an element: processes | descriptions | objects
  function draw(el,s,W){
    const narrow=W<560,fs=narrow?10:11.5,live=s.procs.filter(p=>p.alive);
    const c1=8,c1w=Math.round(W*(narrow?.34:.32)),c2=c1+c1w+(narrow?14:30),c2w=Math.round(W*(narrow?.3:.28)),c3=c2+c2w+(narrow?14:30),c3w=W-c3-6;
    const rowH=narrow?16:18;let y=22,b='',fdPos={},dPos={},oPos={};
    b+=RD.t(c1,13,'Processes: fd tables',{fs:fs,fill:'var(--mute)',w:600})+RD.t(c2,13,'Open file descriptions',{fs:fs,fill:'var(--mute)',w:600})+RD.t(c3,13,'Objects',{fs:fs,fill:'var(--mute)',w:600});
    live.forEach(p=>{const fds=Object.keys(p.fds).map(Number).sort((a,b)=>a-b),h=22+Math.max(1,fds.length)*rowH+4;
      b+='<rect x="'+c1+'" y="'+y+'" width="'+c1w+'" height="'+h+'" rx="6" fill="var(--soft)" stroke="var(--line)"/>'+
        RD.t(c1+6,y+15,RD.esc((narrow?'':'pid ')+p.pid+' '+p.name+(p.state==='S'?' (blocked)':'')),{fs:fs,w:600,fill:p.state==='S'?'var(--bad)':undefined});
      fds.forEach((f,i)=>{const yy=y+22+i*rowH;b+=RD.t(c1+10,yy+12,'fd '+f+(p.fds[f].cx?' cx':''),{fs:fs});fdPos[p.pid+':'+f]=[c1+c1w,yy+8,p.fds[f].d]});
      if(!fds.length)b+=RD.t(c1+10,y+34,'(none)',{fs:fs,fill:'var(--mute)'});
      y+=h+8});
    const H1=y;let y2=22;
    const PAL=['c1','c2','c3','c4','c6','c5'];
    Object.keys(s.desc).forEach((d,di)=>{const D=s.desc[d],O=s.objs[D.obj],h=narrow?34:36,col='var(--'+PAL[di%PAL.length]+')';const n=Object.values(fdPos).filter(v=>v[2]===d).length;
      b+='<rect x="'+c2+'" y="'+y2+'" width="'+c2w+'" height="'+h+'" rx="6" fill="var(--bg)" stroke="'+col+'" stroke-width="1.5"/>'+
        RD.t(c2+6,y2+14,RD.esc((O.kind==='pipe'?(D.mode==='r'?'read end':'write end'):(D.mode==='r'?'read':D.mode==='rw'?'read/write':'write'))),{fs:fs,w:600})+
        RD.t(c2+6,y2+28,(O.kind==='file'?'offset '+D.off+', ':'')+'refs '+n,{fs:fs-1,fill:'var(--mute)'});
      dPos[d]=[c2,c2+c2w,y2+h/2,D.obj,col];y2+=h+8});
    let y3=22;
    Object.keys(s.objs).forEach(o=>{const O=s.objs[o],h=O.kind==='tty'?28:(narrow?40:44);
      b+='<rect x="'+c3+'" y="'+y3+'" width="'+c3w+'" height="'+h+'" rx="6" fill="var(--soft)" stroke="var(--'+(O.kind==='pipe'?'c4':O.kind==='tty'?'c5':'c3')+')"/>'+RD.t(c3+6,y3+14,RD.esc(O.name),{fs:fs,w:600});
      if(O.kind!=='tty'){const t=(O.kind==='pipe'?'buffer: ':'')+(O.data?JSON.stringify(O.data).slice(1,-1):'(empty)');b+=RD.t(c3+6,y3+30,RD.esc(t.length>(narrow?14:26)?t.slice(0,narrow?13:25)+'...':t),{fs:fs-1,fill:'var(--mute)'})}
      oPos[o]=[c3,y3+h/2];y3+=h+8});
    Object.values(fdPos).forEach(v=>{const D=dPos[v[2]];if(D)b+='<path d="M'+v[0]+','+v[1]+' C'+(v[0]+12)+','+v[1]+' '+(D[0]-12)+','+D[2]+' '+D[0]+','+D[2]+'" fill="none" stroke="'+D[4]+'" stroke-width="1.4" opacity=".85"/>'});
    Object.values(dPos).forEach(D=>{const O=oPos[D[3]];if(O)b+='<line x1="'+D[1]+'" y1="'+D[2]+'" x2="'+O[0]+'" y2="'+O[1]+'" stroke="var(--mute)" stroke-width="1" opacity=".7"/>'});
    const H=Math.max(H1,y2,y3)+4;el.innerHTML=RD.svg(W,H,b,'Descriptor tables of each process, the open file descriptions they point to, and the underlying objects');
  }
  return {run,draw,ops:Object.keys(ops)};
})();
// scripts used on the page (the Reading animation uses leak/cloexec; the lab offers all)
window.FDSCRIPTS={
  leak:{title:'Leaked write end: pipe() without O_CLOEXEC',measured:'leak',steps:[
    {op:'proc 1 parent',say:'The parent will hand data to a reader child through a pipe.'},
    {op:'tty 1',say:'Like every process it starts with fds 0, 1, 2.'},
    {op:'pipe 1',say:'pipe() makes one pipe object and two descriptions: fd 3 reads, fd 4 writes. Not close-on-exec.'},
    {op:'fork 1 2 reader',say:'fork: the reader child gets a copy of the table, so it also holds both ends.'},
    {op:'close 2 4',say:'The reader closes its copy of the write end, as it should: a reader must not hold a write end.'},
    {op:'fork 1 3 helper',say:'Later the parent starts an unrelated helper (fork, then exec). The fork copies fd 3 and fd 4 into it.'},
    {op:'close 3 3',say:'The helper closes the read end it knows about...'},
    {op:'exec 3 sleep',say:'...and execs "sleep 2". fd 4 was not close-on-exec, so the sleeping program still holds the pipe\'s write end without knowing it exists.'},
    {op:'write 1 4 hello\\n',say:'The parent writes its 6 bytes and is done.'},
    {op:'close 1 3 4',say:'The parent closes both ends. It has done everything right.'},
    {op:'read 2 3',say:'The reader gets the 6 bytes.'},
    {op:'read 2 3',say:'Its next read should return 0 (end of file). It blocks instead: one write end is still open, in the helper.'},
    {op:'exit 3',say:'Only when the helper exits (2 s later, measured 2.011 s) does the last write end close...'},
    {op:'read 2 3',say:'...and the reader finally sees EOF. In a real program the helper may live for hours: the reader hangs.'}]},
  cloexec:{title:'The fix: pipe2(O_CLOEXEC)',measured:'cloexec',steps:[
    {op:'proc 1 parent',say:'Same program.'},
    {op:'tty 1',say:'fds 0, 1, 2.'},
    {op:'pipe 1 O_CLOEXEC',say:'pipe2(O_CLOEXEC): both ends are marked close-on-exec ("cx").'},
    {op:'fork 1 2 reader',say:'fork copies the table, flags included.'},
    {op:'close 2 4',say:'The reader closes its write end.'},
    {op:'fork 1 3 helper',say:'The helper is forked: it holds both ends for a moment...'},
    {op:'close 3 3',say:'...closes the read end...'},
    {op:'exec 3 sleep',say:'...and at execve the kernel closes fd 4 for it, because it is close-on-exec. The sleeping program holds nothing.'},
    {op:'write 1 4 hello\\n',say:'The parent writes.'},
    {op:'close 1 3 4',say:'The parent closes both ends: now no write end is open anywhere.'},
    {op:'read 2 3',say:'The reader gets the bytes...'},
    {op:'read 2 3',say:'...and EOF immediately (measured 0.015 s after start, against 2.011 s). Python does this for you: since 3.4 new descriptors are non-inheritable (PEP 446).'}]},
  shell:{title:'python train.py 2>&1 | tee log',steps:[
    {op:'proc 1 sh',say:'An interactive shell, fds 0 to 2 on the terminal.'},
    {op:'tty 1',say:'fds 0, 1, 2 refer to one description of the terminal.'},
    {op:'pipe 1',say:'For "|" the shell first makes a pipe: fd 3 read end, fd 4 write end.'},
    {op:'fork 1 2 sh',say:'It forks the left-hand side.'},
    {op:'dup2 2 4 1',say:'Child: dup2(4, 1): stdout now goes into the pipe.'},
    {op:'dup2 2 1 2',say:'Then 2>&1 is dup2(1, 2): stderr goes where stdout goes now, the pipe. Order matters.'},
    {op:'close 2 3 4',say:'Close the original pipe fds; 1 and 2 keep the write end alive.'},
    {op:'exec 2 python',say:'exec python train.py: it inherits fds 0, 1, 2 and never knows about the pipe.'},
    {op:'fork 1 3 sh',say:'The shell forks the right-hand side.'},
    {op:'dup2 3 3 0',say:'dup2(3, 0): tee reads its stdin from the pipe.'},
    {op:'close 3 3 4',say:'Close the extras; this child must not hold a write end, or tee would never see EOF.'},
    {op:'exec 3 tee',say:'exec tee log.'},
    {op:'open 3 log O_WRONLY|O_CREAT|O_TRUNC',say:'tee opens the log file: lowest free fd, 3.'},
    {op:'close 1 3 4',say:'The shell closes both pipe ends (same reason) and waits for both children.'},
    {op:'write 2 1 step 0 loss 2.30\\n',say:'python prints a line: into the pipe.'},
    {op:'read 3 0',say:'tee reads it and writes it to the terminal and to log.'},
    {op:'exit 2',say:'python exits: the last write end closes.'},
    {op:'read 3 0',say:'tee reads 0: EOF, so it exits too, and the shell\'s wait returns.'}]},
  redir1:{title:'python train.py > log 2>&1 (right order)',steps:[
    {op:'proc 1 sh',say:'A shell about to run the command.'},{op:'tty 1',say:'fds 0, 1, 2 on the terminal.'},
    {op:'fork 1 2 sh',say:'fork for the command.'},
    {op:'open 2 log O_WRONLY|O_CREAT|O_TRUNC',say:'"> log": open log, which gets fd 3...'},
    {op:'dup2 2 3 1',say:'...dup2(3, 1): stdout is log...'},{op:'close 2 3',say:'...close(3).'},
    {op:'dup2 2 1 2',say:'"2>&1": dup2(1, 2): stderr is a copy of stdout as it is now: log, same description, same offset.'},
    {op:'exec 2 python',say:'exec python: both streams go to log.'},
    {op:'write 2 1 step 0\\n',say:'stdout writes 7 bytes at offset 0.'},
    {op:'write 2 2 warning\\n',say:'stderr writes at offset 7: shared offset, nothing overwritten.'}]},
  redir2:{title:'python train.py 2>&1 > log (wrong order)',steps:[
    {op:'proc 1 sh',say:'Same shell.'},{op:'tty 1',say:'fds 0, 1, 2 on the terminal.'},
    {op:'fork 1 2 sh',say:'fork for the command.'},
    {op:'dup2 2 1 2',say:'"2>&1" first: dup2(1, 2): stderr is a copy of stdout as it is now, the terminal.'},
    {op:'open 2 log O_WRONLY|O_CREAT|O_TRUNC',say:'"> log": open log as fd 3...'},
    {op:'dup2 2 3 1',say:'...dup2(3, 1): stdout is log. stderr still points at the terminal.'},{op:'close 2 3',say:'close(3).'},
    {op:'exec 2 python',say:'exec python.'},
    {op:'write 2 1 step 0\\n',say:'stdout goes to log...'},
    {op:'write 2 2 Traceback\\n',say:'...but the traceback goes to the terminal, and is lost when the job runs detached. Redirections are applied left to right.'}]},
  share:{title:'fork shares the file offset',measured:'share',steps:[
    {op:'proc 1 parent',say:'A parent...'},{op:'tty 1',say:'...with fds 0, 1, 2.'},
    {op:'open 1 out.txt O_WRONLY|O_CREAT|O_TRUNC',say:'open() once: one description, offset 0.'},
    {op:'fork 1 2 child',say:'fork: the child\'s fd 3 refers to the same description (refs 2).'},
    {op:'write 1 3 PARENT\\n',say:'The parent writes 7 bytes: the shared offset becomes 7.'},
    {op:'write 2 3 child\\n',say:'The child writes at offset 7, not 0: nothing is overwritten.'},
    {op:'write 1 3 PARENT\\n',say:'They interleave, as the measured run did (39 bytes, every line intact).'},
    {op:'note had each process called open() itself, each would have its own description and offset 0, and they would overwrite each other (measured: 21 bytes, "NT" left over)',say:'The other case, from the same run: separate open() calls, separate offsets, overwrites.'}]}
};
