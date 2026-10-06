mkdir -p .claude
cat > .claude/settings.json <<'J'
{
  "permissions": {
    "allow": ["Bash(python3 tests/*)", "Edit(textstats/**)"],
    "ask": ["Bash(curl *)"],
    "deny": ["Edit(tests/**)", "Bash(rm *)"]
  }
}
J
