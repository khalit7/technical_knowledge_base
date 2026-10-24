# Distributed systems fundamentals: replication, partitioning, consistency, consensus

Notion: https://app.notion.com/p/3c65c17b0d0d8115bc45c31d915b4d33 (child of Topic: swe-and-system-design)
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/distributed_systems_fundamentals/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`; see `src/README.md`). Rebuilt 2026-10-24 to the teaching contract: core idea and hero figure at the top, then why distribution is hard, time and order (Lamport, vector, hybrid clocks, TrueTime), replication with a real Postgres measurement and a lag stepper, quorums, the consistency ladder with an inline history checker, CAP and PACELC with a toggle, Raft with a five-server cluster inline, leases and fencing tokens, idempotency and exactly-once as an end-to-end property, partitioning and consistent hashing, transactions across machines; real-systems and Jepsen tables in closed blocks. Tabs: Reading, Further reading. Reading: 40 min, plus 10 in closed details. No child pages, databases or video.
