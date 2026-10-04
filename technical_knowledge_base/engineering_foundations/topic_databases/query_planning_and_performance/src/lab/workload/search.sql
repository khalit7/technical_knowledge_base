\set c random(100000, 999999)
SELECT id, title FROM chats WHERE title LIKE 'Chat ' || :c || '%' ORDER BY id LIMIT 10;
