\set u random(1, 100000)
SELECT id, title FROM chats WHERE user_id = :u ORDER BY created_at DESC LIMIT 20;
