"""The remote agent of the running example: another team's checkpoint-evaluation agent, served with the official
A2A Python SDK (a2a-sdk 1.2.2, protocol 1.0). It is SCRIPTED: no model is called. Its "decisions" (asking which
suite, asking for bucket access, refusing an off-skill request) are fixed rules, and its scores are made-up numbers
labelled as such on the page. Everything on the wire is real SDK output.

build_app(public_port, ...) returns a Starlette app with:
  /.well-known/agent-card.json   public Agent Card (no auth)
  /a2a/jsonrpc                   JSON-RPC 2.0 binding (SSE for streaming)
  /a2a/rest/...                  HTTP+JSON binding (POST /message:send, GET /tasks/{id}, ...)
  /oob/grant                     the agent's own out-of-band page where a human grants bucket access (in-task auth)
Every other path needs "Authorization: Bearer <token>"; tokens map to callers, and the SDK scopes tasks per caller.
"""
import asyncio, re
from starlette.applications import Starlette
from starlette.authentication import AuthCredentials, AuthenticationBackend, SimpleUser
from starlette.middleware import Middleware
from starlette.middleware.authentication import AuthenticationMiddleware
from starlette.responses import JSONResponse
from starlette.routing import Route
from a2a.helpers import get_message_text, new_task_from_user_message, new_text_message, new_data_part, new_text_part
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.routes import create_agent_card_routes, create_jsonrpc_routes, create_rest_routes
from a2a.server.tasks import InMemoryTaskStore, InMemoryPushNotificationConfigStore, BasePushNotificationSender, TaskUpdater
from a2a.types import (AgentCapabilities, AgentCard, AgentInterface, AgentSkill, AgentProvider, TaskState,
                       SecurityScheme, HTTPAuthSecurityScheme, SecurityRequirement, StringList)
from a2a.utils.push_url_validator import validate_push_notification_url

TOKENS = {"lab-token-team-a": "team-a-orchestrator", "lab-token-team-c": "team-c-dashboard"}  # lab-only strings
PUBLIC = ("/.well-known/agent-card.json", "/oob/grant")
SHARDS = {"gsm-mini": [0.58, 0.63, 0.61], "mmlu-mini": [0.71, 0.69, 0.74]}  # scripted scores, not an evaluation
GRANTS: dict[str, asyncio.Event] = {}


class Bearer(AuthenticationBackend):
    async def authenticate(self, conn):
        h = conn.headers.get("authorization", "")
        if h.startswith("Bearer ") and h[7:] in TOKENS:
            return AuthCredentials(["a2a"]), SimpleUser(TOKENS[h[7:]])
        return None


class RequireAuth:
    """401 with a challenge for every non-public path without a known bearer token (A2A section 7.4)."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and not scope["path"].startswith(PUBLIC):
            h = dict(scope["headers"]).get(b"authorization", b"").decode()
            if not (h.startswith("Bearer ") and h[7:] in TOKENS):
                r = JSONResponse({"error": "unauthenticated", "detail": "send Authorization: Bearer <token>; schemes are in the Agent Card"},
                                 status_code=401, headers={"WWW-Authenticate": 'Bearer realm="eval-agent"'})
                return await r(scope, receive, send)
        return await self.app(scope, receive, send)


class EvalExecutor(AgentExecutor):
    """Fixed rules standing in for a model: see the module docstring."""

    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        text = get_message_text(context.message)
        task = context.current_task
        if not task:
            task = new_task_from_user_message(context.message)
            await event_queue.enqueue_event(task)
        up = TaskUpdater(event_queue=event_queue, task_id=task.id, context_id=task.context_id)
        m = lambda s: new_text_message(s, context_id=task.context_id, task_id=task.id)
        if "delete" in text.lower():
            await up.reject(m("Rejected: this agent only evaluates checkpoints; it never deletes anything."))
            return
        ckpt = re.search(r"step-\d+", text) or re.search(r"step-\d+", " ".join(get_message_text(h) for h in task.history))
        bucket = "gs://team-a-private/" in text or any("gs://team-a-private/" in get_message_text(h) for h in task.history)
        await up.start_work(m(f"Loading checkpoint {ckpt.group(0) if ckpt else '?'} (scripted)."))
        if bucket and task.id not in GRANTS:
            GRANTS[task.id] = asyncio.Event()
            await up.requires_auth(m(f"I need read access to gs://team-a-private/. A person on your side must grant it at "
                                     f"/oob/grant?task={task.id}; the credential comes to me directly, never through this chat."))
            await GRANTS[task.id].wait()
            await up.start_work(m("Access granted out of band; continuing."))
        suite = next((s for s in SHARDS if s in text.lower()), None)
        if not suite:
            await up.requires_input(m("Which suite should I run: gsm-mini or mmlu-mini?"))
            return
        slow = "slow" in text.lower() or any("slow" in get_message_text(h).lower() for h in task.history)
        scores = SHARDS[suite] * (2 if slow else 1)
        for i, s in enumerate(scores):
            await asyncio.sleep(0.5 if slow else 0.15)
            await up.add_artifact(parts=[new_text_part(f"shard {i + 1}/{len(scores)}: accuracy {s:.2f}\n")],
                                  artifact_id="progress-log", name="progress log", append=i > 0, last_chunk=i == len(scores) - 1)
        mean = round(sum(scores) / len(scores), 4)
        await up.add_artifact(parts=[new_data_part({"suite": suite, "checkpoint": ckpt.group(0) if ckpt else None,
                                                    "shards": len(scores), "mean_accuracy": mean, "scripted": True})],
                              artifact_id="scores", name="scores.json")
        await up.complete(m(f"Done: mean accuracy {mean} on {suite} (scripted numbers)."))

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        up = TaskUpdater(event_queue=event_queue, task_id=context.task_id, context_id=context.context_id)
        await up.cancel(new_text_message("Canceled at the caller's request.", context_id=context.context_id, task_id=context.task_id))


def card(public_port: int, skills_extra=()):
    base = f"http://127.0.0.1:{public_port}"
    return AgentCard(
        name="Checkpoint Eval Agent (team B, scripted lab agent)",
        description="Evaluates a training checkpoint on a held-out suite and returns scores. Scripted: no model is called.",
        version="1.4.0",
        provider=AgentProvider(organization="Team B (lab)", url="https://example.com/team-b"),
        supported_interfaces=[AgentInterface(protocol_binding="JSONRPC", url=base + "/a2a/jsonrpc", protocol_version="1.0"),
                              AgentInterface(protocol_binding="HTTP+JSON", url=base + "/a2a/rest", protocol_version="1.0")],
        capabilities=AgentCapabilities(streaming=True, push_notifications=True),
        security_schemes={"bearer": SecurityScheme(http_auth_security_scheme=HTTPAuthSecurityScheme(scheme="Bearer", description="Team-issued token"))},
        security_requirements=[SecurityRequirement(schemes={"bearer": StringList(list=[])})],
        default_input_modes=["text/plain"], default_output_modes=["text/plain", "application/json"],
        skills=[AgentSkill(id="evaluate_checkpoint", name="Evaluate a checkpoint",
                           description="Run a held-out suite (gsm-mini or mmlu-mini) on a named checkpoint and report accuracy.",
                           tags=["evaluation", "checkpoints"], examples=["Evaluate step-4000 on gsm-mini"]), *skills_extra])


def build_app(public_port: int, screen_push_urls: bool = False, push_client=None):
    import httpx
    store, pstore = InMemoryTaskStore(), InMemoryPushNotificationConfigStore()
    validator = validate_push_notification_url if screen_push_urls else None
    sender = BasePushNotificationSender(push_client or httpx.AsyncClient(timeout=10), pstore, push_url_validator=validator)
    c = card(public_port)
    h = DefaultRequestHandler(agent_executor=EvalExecutor(), task_store=store, agent_card=c,
                              push_config_store=pstore, push_sender=sender, push_url_validator=validator)

    async def grant(request):
        t = request.query_params.get("task", "")
        if t in GRANTS:
            GRANTS[t].set()
            return JSONResponse({"granted": True, "task": t})
        return JSONResponse({"granted": False}, status_code=404)

    # the grant route goes first: the SDK's REST routes end with a catch-all /{tenant} mount
    routes = [Route("/oob/grant", grant, methods=["POST"]),
              *create_agent_card_routes(c, cache_control="public, max-age=300"),
              *create_jsonrpc_routes(h, "/a2a/jsonrpc"),
              *create_rest_routes(h, path_prefix="/a2a/rest")]
    return Starlette(routes=routes, middleware=[Middleware(RequireAuth), Middleware(AuthenticationMiddleware, backend=Bearer())])
