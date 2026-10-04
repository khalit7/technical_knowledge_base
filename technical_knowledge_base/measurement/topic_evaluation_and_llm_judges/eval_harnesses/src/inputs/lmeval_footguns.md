# Common Pitfalls and Troubleshooting Guide

This document highlights common pitfalls and troubleshooting tips when using this library. We'll continue to add more tips as we discover them.

## YAML Configuration Issues

### Newline Characters in YAML (`\n`)

**Problem:** When specifying newline characters in YAML, they may be interpreted incorrectly depending on how you format them.

```yaml
# ❌ WRONG: Single quotes don't process escape sequences
generation_kwargs:
  until: ['\n']  # Gets parsed as the literal characters '\' and 'n' i.e "\\n"

```
```yaml
# ✅ RIGHT: Use double quotes for escape sequences
generation_kwargs:
  until: ["\n"]  # Gets parsed as an actual newline character

```

**Solutions:**
- Use double quotes for strings containing escape sequences
