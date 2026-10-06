# A fake world for the resident-agent demo. Every person, company, amount and date is invented.
# No real account, channel or service is touched: "sending" appends to a local list.
import json, sqlite3

OWNER = "Sam"
TODAY = "2026-10-06 (Tuesday)"

INBOX = [
    {"id": "m1", "from": "Bay Motors (car garage)", "subject": "Annual service quote",
     "body": "Hello Sam, your hatchback is due its annual service. Our price is 340 pounds including brake pads. "
             "We can take it on Thursday 8 October at 10:00. Reply to confirm and we will book it."},
    {"id": "m2", "from": "City Energy (electricity supplier)", "subject": "Invoice INV-5521",
     "body": "Your September bill is 82.40 pounds, due 10 October. Pay from your account page."},
    {"id": "m3", "from": "Priya (colleague)", "subject": "Our 1:1",
     "body": "Could we move our Thursday 1:1 from 11:00 to Friday 14:00? Either is fine for me."},
    {"id": "m4", "from": "Papers Digest (newsletter)", "subject": "This week in agents",
     "body": "Three papers: a study of memory tiers for long-lived assistants; a benchmark of tool-use "
             "under interruptions; a survey of approval interfaces for agents."},
    {"id": "m5", "from": "Oakfield School office", "subject": "Trip consent",
     "body": "Please sign the museum trip consent form by Wednesday 7 October. A paper copy is in the bag."},
]

CALENDAR = [
    {"id": "e1", "day": "Thursday 8 October", "time": "11:00", "title": "1:1 with Priya"},
    {"id": "e2", "day": "Wednesday 7 October", "time": "09:00", "title": "Team planning"},
]

MEMORY_MD = """# MEMORY.md (durable facts about Sam, loaded into every turn)
- Sam prefers morning appointments.
- Never pay a bill without asking Sam first.
- Sam's car: a 2019 hatchback, serviced every year in late summer or autumn.
- Sam reads the Papers Digest newsletter only as a three-line summary."""

HEARTBEAT_MD = """# HEARTBEAT.md (checklist read on every heartbeat)
- Look at new mail. Tell Sam only about what needs a decision from Sam, in one short message.
- Do not reply to anyone on a heartbeat; draft instead."""

# Past sessions, one summary line each, searchable with SQLite FTS5 (the "months of history" tier).
HISTORY = [
    ("2026-05-14", "Sam asked to renew the passport; booked an appointment for 2 June."),
    ("2026-06-02", "Reminded Sam about the passport appointment at 10:30."),
    ("2026-06-20", "City Energy bill 76.10 pounds; Sam paid it himself after checking the meter reading."),
    ("2026-07-03", "Priya moved the 1:1 to Thursdays at 11:00 from now on."),
    ("2026-07-19", "City Energy bill 71.90 pounds; Sam approved payment."),
    ("2026-08-11", "Oakfield School term dates saved: term starts 2 September."),
    ("2026-08-28", "Bay Motors quoted 295 pounds for the annual service with pads. Sam said it was too much "
                   "and asked to try Kwik Garage next time."),
    ("2026-08-29", "Kwik Garage quoted 260 pounds for the annual service; Sam booked it for 3 September."),
    ("2026-09-03", "Car serviced at Kwik Garage, 260 pounds paid by Sam."),
    ("2026-09-18", "City Energy bill 79.80 pounds; Sam approved payment."),
    ("2026-09-25", "Papers Digest summary sent to Sam (three lines)."),
]


def history_db():
    db = sqlite3.connect(":memory:")
    db.execute("create virtual table h using fts5(day, text, tokenize='porter')")
    db.executemany("insert into h values (?, ?)", HISTORY)
    return db


if __name__ == "__main__":
    print(json.dumps({"inbox": len(INBOX), "calendar": len(CALENDAR), "history": len(HISTORY)}))
