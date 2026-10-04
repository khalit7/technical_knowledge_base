| threshold | number           | No       | Success threshold for the assert-set. Ex. 1 out of 4 equal weights assertions need to pass. Threshold should be 0.25 |
| weight    | number           | No       | How heavily to weigh the assertion set within test assertions. Defaults to 1.0                                       |
| metric    | string           | No       | Metric name for this assertion set within the test                                                                   |

## Assertion types

### Deterministic eval metrics

These metrics are programmatic tests that are run on LLM output. [See all details](/docs/configuration/expected-outputs/deterministic)

| Assertion Type                                                                                                     | Returns true if...                                                        |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [equals](/docs/configuration/expected-outputs/deterministic/#equality)                                             | output matches exactly                                                    |
| [contains](/docs/configuration/expected-outputs/deterministic/#contains)                                           | output contains a string or number as text                                |
| [icontains](/docs/configuration/expected-outputs/deterministic/#contains)                                          | output contains a string or number as text, case insensitive              |
| [regex](/docs/configuration/expected-outputs/deterministic/#regex)                                                 | output matches regex                                                      |
| [starts-with](/docs/configuration/expected-outputs/deterministic/#starts-with)                                     | output starts with string                                                 |
| [contains-any](/docs/configuration/expected-outputs/deterministic/#contains-any)                                   | output contains any of the listed substrings                              |
| [contains-all](/docs/configuration/expected-outputs/deterministic/#contains-all)                                   | output contains all list of substrings                                    |
| [icontains-any](/docs/configuration/expected-outputs/deterministic/#contains-any)                                  | output contains any of the listed substrings, case insensitive            |
| [icontains-all](/docs/configuration/expected-outputs/deterministic/#contains-all)                                  | output contains all list of substrings, case insensitive                  |
| [is-json](/docs/configuration/expected-outputs/deterministic/#is-json)                                             | output is valid json (optional json schema validation)                    |
| [contains-json](/docs/configuration/expected-outputs/deterministic/#contains-json)                                 | output contains valid json (optional json schema validation)              |
| [contains-html](/docs/configuration/expected-outputs/deterministic/#contains-html)                                 | output contains HTML content                                              |
| [is-html](/docs/configuration/expected-outputs/deterministic/#is-html)                                             | output is valid HTML                                                      |
| [is-sql](/docs/configuration/expected-outputs/deterministic/#is-sql)                                               | output is a non-empty valid SQL statement                                 |
| [contains-sql](/docs/configuration/expected-outputs/deterministic/#contains-sql)                                   | output is valid SQL or contains a valid SQL code block                    |
| [is-xml](/docs/configuration/expected-outputs/deterministic/#is-xml)                                               | output is a supported well-formed XML document                            |
| [contains-xml](/docs/configuration/expected-outputs/deterministic/#contains-xml)                                   | output contains valid xml fragment(s)                                     |
| [is-refusal](/docs/configuration/expected-outputs/deterministic/#is-refusal)                                       | the provider reports a refusal or the output indicates one                |
| [javascript](/docs/configuration/expected-outputs/javascript)                                                      | provided Javascript function validates the output                         |
| [python](/docs/configuration/expected-outputs/python)                                                              | provided Python function validates the output                             |
| [ruby](/docs/configuration/expected-outputs/ruby)                                                                  | provided Ruby function validates the output                               |
| [webhook](/docs/configuration/expected-outputs/deterministic/#webhook)                                             | webhook returns a boolean `pass` and an optional score from 0 to 1        |
| [rouge-n](/docs/configuration/expected-outputs/deterministic/#rouge-n)                                             | Rouge-N score is above a given threshold (default 0.75)                   |
| [bleu](/docs/configuration/expected-outputs/deterministic/#bleu)                                                   | BLEU >= threshold (default 0.5); blank references are ignored             |
| [gleu](/docs/configuration/expected-outputs/deterministic/#gleu)                                                   | GLEU >= threshold (default 0.5); empty output scores 0                    |
| [levenshtein](/docs/configuration/expected-outputs/deterministic/#levenshtein-distance)                            | Levenshtein distance is below a threshold                                 |
| [latency](/docs/configuration/expected-outputs/deterministic/#latency)                                             | Latency is below a threshold (milliseconds)                               |
| [meteor](/docs/configuration/expected-outputs/deterministic/#meteor)                                               | METEOR score is above a given threshold (default 0.5); requires `natural` |
| [perplexity](/docs/configuration/expected-outputs/deterministic/#perplexity)                                       | Perplexity is below a threshold                                           |
| [perplexity-score](/docs/configuration/expected-outputs/deterministic/#perplexity-score)                           | Normalized perplexity                                                     |
| [cost](/docs/configuration/expected-outputs/deterministic/#cost)                                                   | Cost is below a threshold (for models with cost info such as GPT)         |
| [is-valid-function-call](/docs/configuration/expected-outputs/deterministic/#is-valid-function-call)               | Ensure that the function call matches the function's JSON schema          |
| [is-valid-openai-function-call](/docs/configuration/expected-outputs/deterministic/#is-valid-openai-function-call) | Ensure that the function call matches the function's JSON schema          |
| [is-valid-openai-tools-call](/docs/configuration/expected-outputs/deterministic/#is-valid-openai-tools-call)       | Ensure all tool calls match the tools JSON schema                         |
| [tool-call-f1](/docs/configuration/expected-outputs/deterministic/#tool-call-f1)                                   | Tool names meet the F1 threshold; parser limit exhaustion fails           |
| [trace-span-count](/docs/configuration/expected-outputs/deterministic/#trace-span-count)                           | Count spans matching patterns with min/max thresholds                     |
| [trace-span-duration](/docs/configuration/expected-outputs/deterministic/#trace-span-duration)                     | Check span durations with percentile support                              |
| [trace-error-spans](/docs/configuration/expected-outputs/deterministic/#trace-error-spans)                         | Detect errors in traces by status codes, attributes, and messages         |
| [skill-used](/docs/configuration/expected-outputs/deterministic/#skill-used)                                       | Ensure normalized provider skill metadata includes expected skills        |
| [trajectory:tool-used](/docs/configuration/expected-outputs/deterministic/#trajectorytool-used)                    | Ensure a traced agent trajectory used specific tools                      |
| [trajectory:tool-args-match](/docs/configuration/expected-outputs/deterministic/#trajectorytool-args-match)        | Ensure traced tool calls used the expected arguments                      |
| [trajectory:tool-sequence](/docs/configuration/expected-outputs/deterministic/#trajectorytool-sequence)            | Ensure traced tool usage happened in the expected order                   |
| [trajectory:step-count](/docs/configuration/expected-outputs/deterministic/#trajectorystep-count)                  | Count normalized trajectory steps by type or name pattern                 |
| [guardrails](/docs/configuration/expected-outputs/guardrails)                                                      | Evaluate the target's normalized input or output guardrail signal         |

:::tip
Every test type can be negated by prepending `not-`. For example, `not-equals` or `not-regex`.

When a `not-javascript`, `not-python`, or `not-ruby` assertion returns a full grading result, a negated failure keeps its custom `reason`, falling back to a generic message if it is empty. A negated pass reports `Assertion passed`; the script's score is preserved in either case.

The `search-rubric` and `not-search-rubric` assertions require a rubric value that renders to a string.

For `not-classifier`, `not-search-rubric`, `not-factuality` (also `not-model-graded-factuality`), and `not-model-graded-closedqa`, a grader error or missing verdict remains a failure with score `0`. Negation only inverts a valid grading result.
:::

### Model-assisted eval metrics

These metrics are model-assisted, and rely on LLMs or other machine learning models.

See [Model-graded evals](/docs/configuration/expected-outputs/model-graded), [classification](/docs/configuration/expected-outputs/classifier), and [similarity](/docs/configuration/expected-outputs/similar) docs for more information.

| Assertion Type                                                                                       | Method                                                                           |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [similar](/docs/configuration/expected-outputs/similar)                                              | Embeddings and cosine similarity are above a threshold                           |
| [classifier](/docs/configuration/expected-outputs/classifier)                                        | Run LLM output through a classifier                                              |
| [moderation](/docs/configuration/expected-outputs/moderation)                                        | Check output against safety policies and include provider-reported usage metrics |
| [llm-rubric](/docs/configuration/expected-outputs/model-graded)                                      | Grade text, images, or audio against a rubric with a compatible model            |
| [g-eval](/docs/configuration/expected-outputs/model-graded/g-eval)                                   | Chain-of-thought evaluation based on custom criteria using the G-Eval framework  |
| [answer-relevance](/docs/configuration/expected-outputs/model-graded)                                | Ensure that LLM output is related to original query (default threshold 0.5)      |
| [context-faithfulness](/docs/configuration/expected-outputs/model-graded)                            | Ensure that LLM output uses the context (default threshold 0.5)                  |
| [context-recall](/docs/configuration/expected-outputs/model-graded)                                  | Ensure that ground truth appears in context (default threshold 0.5)              |
| [context-relevance](/docs/configuration/expected-outputs/model-graded)                               | Ensure that context is relevant to original query (default threshold 0.5)        |
| [conversation-relevance](/docs/configuration/expected-outputs/model-graded)                          | Ensure that responses remain relevant throughout a conversation                  |
| [trajectory:goal-success](/docs/configuration/expected-outputs/model-graded/#trajectorygoal-success) | Use an LLM judge to decide whether the traced agent run achieved its goal        |
| [factuality](/docs/configuration/expected-outputs/model-graded/factuality)                           | LLM output adheres to the given facts, using Factuality method from OpenAI eval  |
| [model-graded-factuality](/docs/configuration/expected-outputs/model-graded/factuality)              | Alias for `factuality`                                                           |
| [model-graded-closedqa](/docs/configuration/expected-outputs/model-graded)                           | LLM output adheres to given criteria, using Closed QA method from OpenAI eval    |
| [pi](/docs/configuration/expected-outputs/model-graded/pi)                                           | Alternative scoring approach that uses a dedicated model for evaluating criteria |
| [select-best](https://promptfoo.dev/docs/configuration/expected-outputs/model-graded)                | Compare multiple outputs for a test case and pick the best one                   |
| [max-score](/docs/configuration/expected-outputs/model-graded/max-score)                             | Select output with highest aggregate score from other assertions                 |

## Weighted assertions

In some cases, you might want to assign different weights to your assertions depending on their importance. The `weight` property is a number that determines the relative importance of the assertion. The default weight is 1.

The final score of the test case is calculated as the weighted average of the scores of all assertions, where the weights are the `weight` values of the assertions.

Here's an example:

```yaml
tests:
  assert:
    - type: equals
      value: 'Hello world'
      weight: 2
    - type: contains
      value: 'world'
      weight: 1
```

In this example, the `equals` assertion is twice as important as the `contains` assertion.

If the LLM output is `Goodbye world`, the `equals` assertion fails but the `contains` assertion passes, and the final score is 0.33 (1/3).

### Setting a score requirement

Test cases support an optional `threshold` property. If set, the pass/fail status of a test case is determined by whether the combined weighted score of all assertions is greater than or equal to the threshold value.

For example:
