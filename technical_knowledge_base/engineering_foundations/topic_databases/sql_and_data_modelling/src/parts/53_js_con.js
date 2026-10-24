// ---- Reading, section 10: bad writes and the constraint that refuses each (static figure, HTML so the SQL wraps) ----
(function(){
  const el=document.getElementById('rd-con');if(!el)return;
  // error texts follow PostgreSQL's message formats with its default constraint names; SQLSTATE codes from the PostgreSQL error code appendix
  const R=[
    ["INSERT INTO messages (chat_id, role, content, tokens) VALUES (11, NULL, 'hi', 3)",'NOT NULL','23502','null value in column "role" of relation "messages" violates not-null constraint'],
    ["UPDATE credits SET balance = -5 WHERE user_id = 7",'CHECK (balance >= 0)','23514','new row for relation "credits" violates check constraint "credits_balance_check"'],
    ["INSERT INTO users (email, ...) VALUES ('ines.novak@example.com', ...)",'UNIQUE (email)','23505','duplicate key value violates unique constraint "users_email_key"'],
    ["INSERT INTO chats (user_id, model, ...) VALUES (999, 'mini', ...)",'FOREIGN KEY (user_id)','23503','insert or update on table "chats" violates foreign key constraint "chats_user_id_fkey"'],
    ["DELETE FROM chats WHERE id = 11   -- it has messages",'FOREIGN KEY (RESTRICT, or the default NO ACTION)','23503','update or delete on table "chats" violates foreign key constraint "messages_chat_id_fkey" on table "messages"'],
    ["UPDATE chats SET pinned = 1 WHERE id = ...   -- user 35's second pinned chat",'partial UNIQUE index','23505','duplicate key value violates unique constraint "one_pinned_chat" (recorded in the box below)']];
  el.innerHTML='<div class="sm-con">'+R.map(r=>'<div class="sm-con-r"><code class="w">'+RD.esc(r[0])+'</code><div class="k"><b>'+RD.esc(r[1])+'</b> <span class="mute">SQLSTATE '+r[2]+'</span></div><div class="e">'+RD.esc(r[3])+'</div></div>').join('')+'</div>';
})();
