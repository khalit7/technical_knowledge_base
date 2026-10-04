# Hand-off to reliability_engineering (3ef5c17b0d0d8152b8dececf34196174) and building_a_backend_api (3c65c17b0d0d8190ade6c34e8f653e79)

From the old page "Distributed Systems Basics" (3c65c17b0d0d8115bc45c31d915b4d33, fetched 2026-09-22, verbatim copy in `src/live.md`). These facts are now **owned by Reliability engineering** (retries, timeouts, retry budgets) and **Building a backend API** (idempotency keys at the HTTP boundary); the distributed systems page links them. Each block is the old text verbatim, then what was checked on 2026-10-04 and the correction to carry.

## 1. Idempotency (old section, whole except the DAG bullet, which went to queues)

> The single highest-leverage property in service design: an operation that can be applied twice with the effect of once, which makes retries safe, which makes at-least-once delivery tolerable, which makes everything else simpler.
> - Natural idempotency: PUT-style "set state to X", upserts keyed on a natural ID.
> - Manufactured idempotency: client-generated **idempotency key**; server stores key -\> result and replays the stored result on retry (the Stripe pattern). Scope keys per tenant, expire them, and persist the key atomically with the side effect (same transaction, or an outbox).

Checked:
- Definition: **verified** against RFC 9110 section 9.2.2 ("A request method is considered idempotent if the intended effect on the server of multiple identical requests with that method is the same as the effect for a single such request"; PUT, DELETE and the safe methods are idempotent). "Highest-leverage property" is opinion.
- Stripe pattern: **verified** (Brandur Leach, "Designing robust and predictable APIs with idempotency", Stripe blog, 2017-02-22, https://stripe.com/blog/idempotency). Amazon's variant: the same token with different parameters returns a validation error (Malcolm Featonby, Builders' Library, "Making retries safe with idempotent APIs"). Owner: **building_a_backend_api** (the Idempotency-Key header, the stored response, the conflict on a reused key).
- "Persist the key atomically with the side effect": **kept**; this is the point the distributed systems page also makes (a dual write between two systems has no shared transaction).
- New evidence for the owner: Jepsen, jetcd 0.8.2 (Kyle Kingsbury, 2024-08-08, https://jepsen.io/analyses/jetcd-0.8.2): "jetcd incorrectly retries non-idempotent requests which may have actually succeeded", which "allows transactions to execute multiple times, or to appear to fail but actually succeed"; "These issues have been outstanding for two and a half years. No patch is available, but disabling the retry mechanism is straightforward." A client library retrying for you is not safe unless the operation is idempotent.

## 2. Retries and timeouts (old section "Queues, backpressure, retries", retry bullet)

> - **Retries**: exponential backoff **with jitter** (full jitter is the usual winner), capped attempts, retry budgets (retry no more than \~10% of traffic), and only for idempotent operations. Retry at one layer, not every layer, or a single failure multiplies into a storm. Timeouts: every remote call has one; propagate deadlines rather than stacking independent timeouts.

Checked:
- Full jitter: **verified** (Marc Brooker, "Exponential Backoff And Jitter", AWS Architecture Blog, 2015-03-04).
- Retry at one layer: **verified** (Brooker, Builders' Library, "Timeouts, retries, and backoff with jitter": five layers of three tries hit the bottom 3^5 = 243 times; the root's Case files tab has it as "abl-timeouts").
- "~10%" retry budget: **now verified** (it was unconfirmed in the root's notes). Google SRE book, chapter 21 "Handling Overload" (https://sre.google/sre-book/handling-overload/): "we implement a per-client retry budget. Each client keeps track of the ratio of requests that correspond to retries. A request will only be retried as long as this ratio is below 10%." The same chapter: with three attempts per request, load can grow to "somewhere just below 3X", and "layering on the per-client retry budget (a 10% retry ratio) reduces the growth to just 1.1x in the general case".
- "Propagate deadlines": **kept** (gRPC deadlines propagate across calls; cite grpc.io "Deadlines" guide when building).

## 3. Old best resources that fit here
> - [Stripe: Designing robust and predictable APIs with idempotency](https://stripe.com/blog/idempotency) (\~15 min): Brandur Leach; idempotency keys done properly
> - [Amazon Builders' Library: Timeouts, retries and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter) (\~25 min, \~1h with the sibling essays) and its sibling essays (avoiding fallback, load shedding)

Checked: Stripe post date 2017-02-22 **verified**. The Builders' Library moved from aws.amazon.com/builders-library to builder.aws.com (the root's coverage records the redirect). The distributed systems page also lists both in Further reading, pointing at the owners for depth.

## 4. Habits from the old "Interview checklist"
> Habits: state invariants first, pick consistency per invariant, make every mutation idempotent, bound every queue, jitter every retry, and name the failure you are defending against when you add a component.

Split: "state invariants first, pick consistency per invariant" stays on the distributed systems page (and the root's "How a senior engineer reasons"); "make every mutation idempotent, jitter every retry" belongs here; "bound every queue" to queues. The numbers in the same checklist belong to the root's Numbers to know tab.
