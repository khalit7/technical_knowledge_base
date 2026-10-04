\set d random(0, 100)
SELECT model, count(*), sum(tokens) FROM messages WHERE created_at >= timestamptz '2025-09-01' + :d * interval '1 day' AND created_at < timestamptz '2025-09-01' + (:d + 3) * interval '1 day' GROUP BY model;
