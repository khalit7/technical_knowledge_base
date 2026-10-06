"""Handoffs against agents-as-tools, OpenAI Agents SDK 0.23.1, local model through a serialising logging proxy.

usage: BASE_URL=http://127.0.0.1:<proxy>/v1 MODEL=<id> python handoffs.py <design> <rep> <temperature> <out.json>
  design: handoff       triage hands the conversation to ONE specialist (classic)
          handoff_mesh  specialists may also hand off to each other
          as_tool       a manager calls both specialists as tools and writes the reply
Tools return fixed fake data; nothing leaves the machine. Tracing is off.
"""
import asyncio, json, os, sys, time
from openai import AsyncOpenAI
from agents import Agent, ModelSettings, OpenAIChatCompletionsModel, Runner, function_tool, set_tracing_disabled
from agents.extensions.handoff_prompt import prompt_with_handoff_instructions

set_tracing_disabled(True)
design, rep, temp, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
model = OpenAIChatCompletionsModel(model=os.environ["MODEL"],
                                   openai_client=AsyncOpenAI(base_url=os.environ["BASE_URL"], api_key="local"))
MS = ModelSettings(temperature=temp, max_tokens=400)
calls = []

USER = ("Hi, two problems. I was charged twice for invoice 1042 and I want the duplicate refunded. "
        "Also your app has crashed every time I log in since this evening.")


@function_tool
def lookup_invoice(invoice_id: str) -> str:
    """Look up an invoice and its charges."""
    calls.append(("lookup_invoice", invoice_id))
    return json.dumps({"invoice": invoice_id, "amount": "49.00 EUR", "charges": ["ch_1 49.00 EUR", "ch_2 49.00 EUR"],
                       "note": "two identical charges 3 seconds apart"})


@function_tool
def refund_charge(charge_id: str) -> str:
    """Refund one charge by its id."""
    calls.append(("refund_charge", charge_id))
    return json.dumps({"charge": charge_id, "status": "refund queued", "eta_days": 5})


@function_tool
def check_status(component: str) -> str:
    """Check the status of a service component, e.g. 'login'."""
    calls.append(("check_status", component))
    return json.dumps({"component": component, "status": "degraded since 18:20",
                       "incident": "INC-7: login crash on app 4.2; fix rolling out tonight",
                       "workaround": "update to app 4.2.1"})


def specialists(with_mesh):
    billing = Agent(name="billing", model=model, model_settings=MS, tools=[lookup_invoice, refund_charge],
                    handoff_description="Billing questions: invoices, charges, refunds.",
                    instructions=prompt_with_handoff_instructions(
                        "You are the billing specialist. Resolve billing problems with your tools, then reply to the customer."))
    tech = Agent(name="tech", model=model, model_settings=MS, tools=[check_status],
                 handoff_description="Technical problems: crashes, errors, outages.",
                 instructions=prompt_with_handoff_instructions(
                     "You are the technical support specialist. Diagnose with your tools, then reply to the customer."))
    if with_mesh:
        billing.handoffs = [tech]
        tech.handoffs = [billing]
        billing.instructions += " If the customer also has a technical problem, hand off to tech after you finish billing."
        tech.instructions += " If the customer also has a billing problem, hand off to billing after you finish."
    return billing, tech


async def main():
    if design in ("handoff", "handoff_mesh"):
        billing, tech = specialists(design == "handoff_mesh")
        start = Agent(name="triage", model=model, model_settings=MS, handoffs=[billing, tech],
                      instructions=prompt_with_handoff_instructions(
                          "You are the triage agent of a support desk. Hand the customer to the right specialist."))
    else:
        billing, tech = specialists(False)
        start = Agent(name="manager", model=model, model_settings=MS,
                      tools=[billing.as_tool("ask_billing", "Ask the billing specialist to handle a billing problem. "
                                                            "Pass everything it needs in the input."),
                             tech.as_tool("ask_tech", "Ask the technical specialist to handle a technical problem. "
                                                      "Pass everything it needs in the input.")],
                      instructions="You run a support desk. Use your specialists for every problem the customer raises, "
                                   "then write one reply to the customer covering all of them.")
    t0 = time.time()
    err = None
    try:
        res = await Runner.run(start, USER, max_turns=12)
        final, last = res.final_output, res.last_agent.name
        items = [type(i).__name__ for i in res.new_items]
    except Exception as e:
        final, last, items, err = None, None, [], f"{type(e).__name__}: {str(e)[:300]}"
    t1 = time.time()
    f = (final or "").lower()
    score = dict(refund_done=("refund_charge" in [c[0] for c in calls]),
                 status_checked=("check_status" in [c[0] for c in calls]),
                 reply_claims_refund=any(w in f for w in ("refunded", "refund queued", "refund has been", "refund is", "refunding", "will be refunded", "processed the refund", "issued a refund", "initiated a refund")),
                 reply_gives_fix=any(w in f for w in ("4.2.1", "inc-7")))
    json.dump(dict(design=design, rep=rep, temperature=temp, t0=t0, t1=t1, final=final, last_agent=last,
                   tool_calls=calls, items=items, error=err, score=score), open(out, "w"), indent=1)
    print(design, rep, last, score, err)


asyncio.run(main())
