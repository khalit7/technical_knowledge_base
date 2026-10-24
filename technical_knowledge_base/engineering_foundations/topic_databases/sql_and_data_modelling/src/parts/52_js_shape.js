// ---- Reading, section 8: common modelling shapes as small schema diagrams (static, one shape at a time) ----
(function(){
  const el=document.getElementById('rd-shape');if(!el)return;
  const S={
    m2m:{T:[{n:'users',c:[['id','PK'],['email','UNIQUE']]},
            {n:'chat_members',hi:1,c:[['chat_id','FK'],['user_id','FK'],['role',''],['joined_at','']],note:'PRIMARY KEY (chat_id, user_id)'},
            {n:'chats',c:[['id','PK'],['title','']]}],
         L:[[1,0,2,0],[1,1,0,0]],
         cap:'The join table holds one row per pair, and the pair is its primary key, so a user cannot be a member of a chat twice. role and joined_at describe the membership, not the user or the chat, so they live here.'},
    adj:{T:[{n:'categories',hi:1,c:[['id','PK'],['parent_id','FK'],['name','']],note:'parent_id NULL at the root'}],L:[[0,1,0,0]],
         cap:'An adjacency list: each row points at its parent. Inserting a node or moving a subtree is a one-row write; reading a subtree or the path to the root is a recursive CTE (section 5). The chat data’s messages.parent_id is this shape.'},
    path:{T:[{n:'categories',hi:1,c:[['id','PK'],['path','INDEX'],['name','']],note:"path '1/7/12': the ids from the root down; subtree: path LIKE '1/7/%'"}],L:[],
         cap:'A materialised path: each row stores its ancestors’ ids. A subtree is one prefix match on an indexed column, and depth is the number of separators; moving a subtree rewrites the path of every row under it.'},
    closure:{T:[{n:'categories',c:[['id','PK'],['name','']]},
                {n:'category_paths',hi:1,c:[['ancestor','FK'],['descendant','FK'],['depth','']],note:'PRIMARY KEY (ancestor, descendant); each node also pairs with itself at depth 0'}],
         L:[[1,0,0,0],[1,1,0,0]],
         cap:'A closure table: one row per ancestor and descendant pair. Every subtree or ancestor list is one join with no recursion; inserting a node writes one row per ancestor, and the table grows with the tree’s depth.'},
    ts:{T:[{n:'series',c:[['id','PK'],['name',''],['unit','']]},
           {n:'readings',hi:1,kind:'partitioned',c:[['series_id','FK'],['ts','timestamptz'],['value','']],note:'PRIMARY KEY (series_id, ts); PARTITION BY RANGE (ts)'},
           {n:'readings_2026_10',kind:'partition',c:[['FROM 2026-10-01',''],['TO 2026-11-01','']],note:'one table per month; drop or detach to expire'}],
        L:[[1,0,0,0],[2,0,1,1]],
        cap:'Rows are only appended, keyed by series and time. With range partitions by month, a query for one month reads one partition, and a month of old data leaves with DROP TABLE or DETACH PARTITION instead of a DELETE of millions of rows.'},
    soft:{T:[{n:'users',hi:1,c:[['id','PK'],['email',''],['deleted_at','NULL = live']]},
             {n:'users_email_live',kind:'index',c:[['UNIQUE (email)',''],['WHERE deleted_at IS NULL','']]},
             {n:'live_users',kind:'view',c:[['SELECT ... FROM users',''],['WHERE deleted_at IS NULL','']]}],
          L:[[1,0,0,1],[2,0,0,2]],
          cap:'deleted_at marks a row as deleted. Uniqueness must become a partial unique index over live rows, or a returning user collides with their own deleted row; a view (or an RLS policy) hides deleted rows by default, and a purge job still has to delete them for real.'},
    json:{T:[{n:'chats',c:[['id','PK'],['model','']]},
             {n:'messages',hi:1,c:[['id','PK'],['chat_id','FK'],['role','CHECK'],['tokens','CHECK'],['tool_calls','jsonb']],note:'real columns for what you join, group or constrain on'},
             {n:'messages_tool_calls_gin',kind:'index',c:[['GIN (tool_calls)','']],note:"serves tool_calls @> '{...}'"}],
          L:[[1,1,0,0],[2,0,1,4]],
          cap:'The JSON document rides along on a row whose keys and rules are ordinary columns. Containment queries (@>) use the GIN index; anything joined, grouped or checked is promoted to a column.'},
    tenant:{T:[{n:'tenants',c:[['id','PK'],['name','']]},
               {n:'chats',c:[['tenant_id','FK'],['id','']],note:'PRIMARY KEY (tenant_id, id)'},
               {n:'messages',hi:1,c:[['tenant_id',''],['chat_id',''],['id','']],note:'FOREIGN KEY (tenant_id, chat_id) REFERENCES chats; RLS policy on tenant_id'}],
            L:[[1,0,0,0],[2,1,1,1]],
            cap:'tenant_id leads every key, so a message cannot point at another tenant’s chat (the composite foreign key includes it) and every index is per tenant. A row-level security policy such as USING (tenant_id = current_setting(\'app.tenant\')::bigint) adds the filter to every query.'}};
  let mode='m2m';
  function draw(){const x=S[mode];SV.schema(el,x.T,x.L,{id:mode,label:'Schema shape: '+mode});
    document.getElementById('rd-shape-cap').innerHTML='<p>'+RD.esc(x.cap)+'</p>'}
  RD.seg(document.getElementById('rd-shape-mode'),m=>{mode=m;draw()});
  draw();RD.onRender(draw);RD.onResize(draw);
})();
