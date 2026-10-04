\set u random(1, 100000)
SELECT id, plan FROM users WHERE email = 'user' || :u || '@example.com';
