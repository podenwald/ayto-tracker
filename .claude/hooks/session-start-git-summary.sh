#!/usr/bin/env bash
BRANCH=$(git branch --show-current 2>/dev/null)
if [ -z "$BRANCH" ]; then
  echo '{}'
  exit 0
fi

MODIFIED=$(git status --porcelain 2>/dev/null | grep -vc '^??')
UNTRACKED=$(git status --porcelain 2>/dev/null | grep -c '^??')
LAST=$(git log -1 --format='%h %s (%cr)' 2>/dev/null)
MSG="Git: Branch '$BRANCH' | $MODIFIED geänderte, $UNTRACKED neue Dateien | Letzter Commit: $LAST"

jq -n --arg msg "$MSG" '{systemMessage: $msg}'
