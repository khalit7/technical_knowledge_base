
#### Span hierarchy

Each user prompt starts a `claude_code.interaction` root span. API calls, tool calls, and hook executions are recorded as its children. Tool spans have two child spans of their own: one for the time spent waiting on a permission decision and one for the execution itself. When the Agent tool, or legacy Task tool, spawns a subagent, the subagent's API and tool spans nest under the parent's `claude_code.tool` span.

```text theme={null}
claude_code.interaction
├── claude_code.llm_request
├── claude_code.hook                    (requires detailed beta tracing)
└── claude_code.tool
    ├── claude_code.tool.blocked_on_user
    ├── claude_code.tool.execution
    └── (Agent tool) subagent claude_code.llm_request / claude_code.tool spans
```

In Agent SDK and `claude -p` sessions, `claude_code.interaction` itself becomes a child of the caller's span when `TRACEPARENT` is set in the environment.

When a `PreToolUse` hook [defers a tool call](/docs/en/hooks#defer-a-tool-call-for-later), Claude Code saves the trace context of the turn that deferred it. When you resume the session and the tool re-runs, the tool's spans join that earlier turn's trace as children of the turn's `claude_code.interaction` span.

#### Span attributes

Every span carries the [standard attributes](#standard-attributes) plus a `span.type` attribute matching its name. The tables below list the additional attributes set on each span. The `llm_request`, `tool.execution`, and `hook` spans set OpenTelemetry status `ERROR` when they record a failure; the other spans always end with status `UNSET`.

**`claude_code.interaction`**

| Attribute | Description | Gated by |
| - | - | - |
| `user_prompt` | Prompt text. Value is `<REDACTED>` unless the gate is set | `OTEL_LOG_USER_PROMPTS` |
| `user_prompt_length` | Prompt length in characters | |
| `interaction.sequence` | 1-based counter of interactions, counted per Claude Code process rather than per session, as described for [`event.sequence`](#event-correlation-attributes) | |
| `parent.source` | How the span got its trace parent: `env` when it parented under an inbound `TRACEPARENT`, `none` when it started its own trace. Requires Claude Code v2.1.268 or later | |
| `interaction.duration_ms` | Wall-clock duration of the turn | |

**`claude_code.llm_request`**

| Attribute | Description | Gated by |
| - | - | - |
| `model` | Model identifier | |
| `gen_ai.system` | Always `anthropic`. OpenTelemetry GenAI semantic convention | |
| `gen_ai.request.model` | Same value as `model`. OpenTelemetry GenAI semantic convention | |
| `query_source` | Subsystem that issued the request, such as `repl_main_thread` or a subagent name | `ENABLE_BETA_TRACING_DETAILED` |
| `query_source_safe` | Bounded form of `query_source`, emitted whether or not detailed beta tracing is active, with values such as `repl_main_thread` or `agent.builtin.general-purpose`. `:` becomes `.` and user-named agents appear as `agent.custom`. Requires Claude Code v2.1.268 or later | |
| `agent_id` | Identifier of the subagent or teammate that issued the request. Absent on the main session | |
| `parent_agent_id` | Identifier of the agent that spawned this one. Absent for the main session and for agents spawned directly from it | |
| `workflow.run_id` | Run identifier of the [Workflow](/docs/en/workflows) tool run that spawned this agent, prefixed `wf_`. Absent for agents not spawned by a workflow | |
| `workflow.name` | Name of the workflow that spawned this agent. User-authored names are replaced with `custom` unless the gate is set | `OTEL_LOG_TOOL_DETAILS` |
| `speed` | `fast` or `normal` | |
| `effort` | [Effort level](/docs/en/model-config#adjust-effort-level) applied to the request: `low`, `medium`, `high`, `xhigh`, or `max`. Absent when Claude Code sends no effort level, for example on a model that doesn't support effort. Requires Claude Code v2.1.274 or later | |
| `llm_request.context` | `interaction`, `tool`, or `standalone` depending on the parent span | |
| `duration_ms` | Wall-clock duration including retries | |
| `ttft_ms` | Time to first token in milliseconds | |
| `first_content_ms` | Time from request start to the first content block of the successful attempt, in milliseconds. Absent on requests that fell back to the non-streaming path. Requires Claude Code v2.1.268 or later | |
| `input_tokens` | Input token count from the API usage block. Excludes tokens read from or written to the prompt cache, which are reported in `cache_read_tokens` and `cache_creation_tokens` | |
| `output_tokens` | Output token count | |
| `cache_read_tokens` | Tokens read from prompt cache | |
| `cache_creation_tokens` | Tokens written to prompt cache | |
| `request_id` | API request ID. Same value as the `request_id` [event correlation attribute](#event-correlation-attributes) | |
| `gen_ai.response.id` | Same value as `request_id`. OpenTelemetry GenAI semantic convention | |
| `client_request_id` | Client-generated `x-client-request-id` of the final attempt | |
| `attempt` | Total attempts made for this request | |
| `success` | `true` or `false` | |
| `status_code` | HTTP status code when the request failed | |
| `error` | Error message when the request failed | |
| `error_class` | Short error class token when the request failed, such as `api_timeout` or `server_overload`. Requires Claude Code v2.1.268 or later | |
| `response.has_tool_call` | `true` when the response contained tool-use blocks | |
| `stop_reason` | API response `stop_reason`, such as `end_turn`, `tool_use`, `max_tokens`, `stop_sequence`, `pause_turn`, or `refusal` | |
| `gen_ai.response.finish_reasons` | Same value as `stop_reason`, wrapped in a string array. OpenTelemetry GenAI semantic convention | |

Each retry attempt is also recorded as a `gen_ai.request.attempt` span event with `attempt` and `client_request_id` attributes.

**`claude_code.tool`**

| Attribute | Description | Gated by |
| - | - | - |
| `tool_name` | Tool name | |
| `tool_name_safe` | Form of `tool_name` that carries no user-chosen names. Built-in tool names pass verbatim. MCP tool names appear as `mcp_other`, except tool names matching a few fixed shapes, such as `playwright` tools named `browser_*`, which pass verbatim. Requires Claude Code v2.1.268 or later | |
| `bash_command_class` | For the Bash tool: category of the command's first program from a fixed list, such as `vcs` or `package_manager`. `other` for a program outside the list, `unparsed` when the line can't be parsed. Requires Claude Code v2.1.268 or later | |
