---
description: Claim a GitHub issue, implement it, and open a PR
---
Issue number: $ARGUMENTS

1. Run `gh issue view $ARGUMENTS` and read the "Done means" line. If there is none, stop and ask me.
2. Run `gh issue view $ARGUMENTS --json assignees`.
   - If it is assigned to someone else, stop and ask me.
   - If it is unassigned, run `gh issue edit $ARGUMENTS --add-assignee @me` so nobody else starts it.
   - If it is already assigned to me, continue.
3. Read only the docs/context.md sections the issue references.
4. Implement the smallest change that meets "Done means". Write or update tests.
5. Run the checks at the repo root: `cargo test`, `npm run build`, `npm run lint` and `npm test`.
6. Commit. If the branch has never been pushed, run `git fetch origin && git rebase origin/main` first. If it is already pushed, run `git fetch origin && git merge origin/main` instead (force-push is denied). Then push the branch and open the PR using the repo's template (`--body` would replace it, so build the body from the template instead):
   - Read `.github/pull_request_template.md`.
   - Fill in every section truthfully. Leave a checkbox unchecked if it isn't true.
   - Put `Closes #$ARGUMENTS` on the first line.
   - Save the result to `/tmp/pr-$ARGUMENTS.md`.
   - Run `gh pr create --title "<short title>" --body-file /tmp/pr-$ARGUMENTS.md`.
7. Summarize what changed and anything blocked in 3 lines.
