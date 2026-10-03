// ---- Stage 1 (deterministic replay), a line-for-line port of src/replay.py's replay_condensed ----
// Checked against replay.py on every shipped trace by src/check_replay.mjs (same events, files, lines).
const RP=(function(){
  const READONLY=/^(ls|cat|head|tail|wc|grep|egrep|find|pwd|cd|echo|printf|which|type|file|stat|du|df|ps|env|whoami|id|uname|python3? --version|python3? -V|pip3? (list|show|freeze)|tree|less|more|od|xxd|hexdump|sort|uniq|cut|awk|diff|cmp|md5sum|sha256sum|date|clear|history|true|jq|column|nl|realpath|dirname|basename|test|\[)\b/;
  const READ=/^(cat|head|tail)((?:\s+-[-\w=]+(?:\s+\d+)?)*)\s+([^\s|;&<>]+)\s*(\|\s*(head|tail)\b.*)?$/;
  const REDIR=/>{1,2}\s*([^\s&|;>]+)/;
  function normpath(p){const abs=p.startsWith('/');const out=[];p.split('/').forEach(s=>{if(!s||s==='.')return;if(s==='..'){if(out.length&&out[out.length-1]!=='..')out.pop();else if(!abs)out.push('..');return}out.push(s)});return (abs?'/':'')+out.join('/')||(abs?'/':'.')}
  function norm(p,cwd){p=p.trim().replace(/^["']+|["']+$/g,'');if(!p||p.startsWith('-'))return null;if(!p.startsWith('/'))p=cwd.replace(/\/$/,'')+'/'+p;return normpath(p)}
  function isMut(cmd){const c=cmd.trim();if(!c)return false;
    if(/(^|[^0-9&])>{1,2}\s*[^&\s]/.test(c)&&!/>\s*\/dev\/null/.test(c))return true;
    if(c.indexOf('<<')>=0||/\btee\b|\bsed\s+-i|\bmv\b|\bcp\b|\brm\b|\bmkdir\b|\btouch\b|\bchmod\b|\bpip3? install|\bapt|\bgit\b/.test(c))return true;
    return c.split(/&&|\|\||;|\|/).some(part=>{const p=part.trim();return p&&!READONLY.test(p)})}
  const base=x=>x.slice(x.lastIndexOf('/')+1);
  function run(C){
    const E0={},listed=new Set(),written=new Set(),created={},held=new Set(),events=[],fin={},snaps=[];let mutated=false;
    const snap=()=>snaps.push({e0:Object.keys(E0),e0n:Object.fromEntries(Object.entries(E0).map(([p,v])=>[p,[v.lines.length+v.cut,v.full]])),cr:Object.keys(created),held:[...held],fin:Object.keys(fin),listed:[...listed],mut:mutated});
    C.turns.forEach((T,ti)=>{const docs=T.docs;
      T.blocks.forEach(([cwd0,cmd,out,cut])=>{const cwd=cwd0==='~'?'/root':cwd0,c=cmd.trim(),ev={t:ti+1,cmd:c.slice(0,160)};
        const push=()=>{events.push(ev);snap()};
        const m=c.match(READ);
        if((m&&!mutated)||(m&&!REDIR.test(c))){const p=norm(m[3],cwd);const body=out.slice();while(body.length&&!body[body.length-1].trim())body.pop();const nb=body.length+cut;
          if(p&&!body.slice(0,2).some(x=>x.indexOf('No such file')>=0||x.indexOf('Is a directory')>=0)){
            const full=m[1]==='cat'&&!m[4]&&!m[2].trim();const pre=(!mutated)||(listed.has(p)&&!written.has(p));
            if(pre&&!written.has(p)){const old=E0[p];if(!old||(full&&!old.full))E0[p]={lines:body,cut,full,t:ev.t};Object.assign(ev,{kind:full?'read-pre':'read-part',path:p,n:nb})}
            else{held.add(p);Object.assign(ev,{kind:'read-held',path:p,n:nb})}
            if(full||!(p in fin))fin[p]={lines:body,cut,full,t:ev.t};
            push();return}}
        if(/^(ls|find)\b/.test(c)&&!isMut(c)){let b=cwd;const a=c.split(/\s+/).slice(1).filter(x=>!x.startsWith('-'));
          if(c.startsWith('ls')&&a.length)b=norm(a[0],cwd)||cwd;
          let got=[];out.forEach(x0=>{const x=x0.replace(/\s+$/,'');
            if(c.startsWith('ls')&&x.startsWith('-')&&x.trim().split(/\s+/).length>=9){const mm=x.trim().match(/^(?:\S+\s+){8}(.*)$/);got.push(norm(mm[1],b))}
            else if(c.startsWith('find')&&x.startsWith('/')&&base(x).indexOf('.')>=0)got.push(normpath(x))});
          got=got.filter(g=>g);if(!mutated)got.forEach(g=>listed.add(g));Object.assign(ev,{kind:'list',n:got.length});push();return}
        if(isMut(c)){mutated=true;
          if(c.indexOf('<<')>=0){const mm=c.match(/^\s*cat\s*>{1,2}\s*([^\s<]+)/);const tgt=mm?mm[1]:null;const p=tgt?norm(tgt,cwd):null;
            if(p){const body=docs[tgt]||'';written.add(p);const kind=(p in E0)?'write-mod':'write-new';
              if(kind==='write-new')created[p]=body?body.split('\n'):[];fin[p]={lines:body?body.split('\n'):[],cut:0,full:true,t:ev.t};
              Object.assign(ev,{kind,path:p,n:body?body.split('\n').length:0});push();return}}
          let mm=c.match(/\bsed\s+-i\S*\s+(?:'[^']*'|"[^"]*"|\S+)\s+(\S+)/);
          if(mm){const p=norm(mm[1],cwd);if(p){written.add(p);Object.assign(ev,{kind:'edit',path:p});push();return}}
          mm=c.match(REDIR);
          if(mm&&!mm[1].startsWith('/dev/')){const p=norm(mm[1],cwd);if(p){written.add(p);if(!(p in E0)&&!(p in created))created[p]=null;Object.assign(ev,{kind:(p in E0)?'write-mod':'write-new',path:p});push();return}}
          ev.kind='run';push();return}
        ev.kind='look';push()})});
    const known=[...listed].filter(p=>!(p in E0)&&!p.endsWith('.gitkeep')).sort();
    const e0Lines=Object.values(E0).reduce((s,v)=>s+v.lines.length+v.cut,0);
    const endFiles=new Set([...Object.keys(E0),...Object.keys(created),...known]);
    const endLines=e0Lines+Object.values(created).reduce((s,v)=>s+(v?v.length:0),0);
    return {E0,final:fin,known_only:known,created,held:[...held].sort(),events,snaps,e0_files:Object.keys(E0).length,e0_lines:e0Lines,end_files:endFiles.size,end_lines:endLines,turns:C.turns.length,seed:endFiles.size>=5&&endLines>=100}}
  return {run,norm,isMut}})();
if(typeof module!=='undefined')module.exports=RP;
