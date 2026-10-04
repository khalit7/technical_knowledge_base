\set o random(2, 20001)
SELECT sum(tokens) FROM usage_events WHERE org_id = :o;
