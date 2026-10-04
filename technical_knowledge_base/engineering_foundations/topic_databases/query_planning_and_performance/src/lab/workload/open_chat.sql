\set c random(1, 1000000)
SELECT id, role, left(content, 40), created_at FROM messages WHERE chat_id = :c ORDER BY created_at;
