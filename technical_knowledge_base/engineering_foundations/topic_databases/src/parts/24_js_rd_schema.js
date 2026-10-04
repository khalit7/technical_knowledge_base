// ---- Reading tab, section 1: the four chat tables; click a row to follow its keys ----
(function(){
  const el=document.getElementById('rd-schema'),cap=document.getElementById('rd-schema-cap');if(!el)return;
  const D=RDD,names=['users','chats','messages','credits'];
  const fkCols={};D.fks.forEach(f=>{(fkCols[f[0]]=fkCols[f[0]]||{})[f[1]]=f[2]});
  function render(){
    el.innerHTML=names.map(n=>{const t=D[n];
      return '<div><div class="cap"><b>'+n+'</b></div><table class="mini" data-t="'+n+'"><tr>'+t.cols.map((c,i)=>'<th>'+c+(i===0?' <span class="mute" title="primary key">(key)</span>':'')+(fkCols[n]&&fkCols[n][c]?' <span class="mute" title="foreign key">&rarr; '+fkCols[n][c]+'</span>':'')+'</th>').join('')+'</tr>'+
        t.rows.map((r,ri)=>'<tr data-r="'+ri+'">'+r.map((v,ci)=>'<td'+(ci===0?' class="key"':'')+'>'+RD.esc(v)+'</td>').join('')+'</tr>').join('')+'</table></div>'}).join('');
  }
  render();
  // the rows linked to (table, row): its parents through foreign keys (transitively) and the rows pointing at it (transitively)
  const val=(t,i,c)=>D[t].rows[i][D[t].cols.indexOf(c)];
  function linked(tn,ri){
    const seen={},out=[];
    const add=(t,i)=>{const k=t+':'+i;if(seen[k])return false;seen[k]=1;out.push([t,i]);return true};
    function up(t,i){D.fks.forEach(f=>{if(f[0]!==t)return;const v=val(t,i,f[1]);D[f[2]].rows.forEach((r,j)=>{if(val(f[2],j,f[3])===v&&add(f[2],j))up(f[2],j)})})}
    function down(t,i){D.fks.forEach(f=>{if(f[2]!==t)return;const v=val(t,i,f[3]);D[f[0]].rows.forEach((r,j)=>{if(val(f[0],j,f[1])===v&&add(f[0],j))down(f[0],j)})})}
    add(tn,ri);up(tn,ri);down(tn,ri);return out;
  }
  el.addEventListener('click',e=>{
    const tr=e.target.closest('tr[data-r]');if(!tr)return;
    const tn=tr.closest('table').dataset.t,ri=+tr.dataset.r;
    el.querySelectorAll('tr.hl').forEach(x=>x.classList.remove('hl'));
    const L=linked(tn,ri);
    L.forEach(([t,i])=>{const r=el.querySelector('table[data-t="'+t+'"] tr[data-r="'+i+'"]');if(r)r.classList.add('hl')});
    const row=D[tn].rows[ri];
    const desc={users:'User '+row[0]+' ('+row[1]+'): their chats, those chats\' messages, and their credit balance.',
      chats:'Chat '+row[0]+': the user it belongs to (through user_id) and every message that points at it (through chat_id).',
      messages:'Message '+row[0]+': its chat (chat_id = '+row[1]+') and, through the chat, its user. The message stores neither the user nor the email.',
      credits:'The balance of user '+row[0]+', found through user_id.'};
    cap.textContent=desc[tn]+' '+L.length+' rows linked.';
  });
})();
