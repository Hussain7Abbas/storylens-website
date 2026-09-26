#!/usr/bin/env bash
set -euo pipefail
# Dedicated restricted SSH key accepts only the exact successful CI commit.
[[ ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([a-f0-9]{40})$ ]] || { echo 'Expected deploy <commit>'; exit 1; }
commit=${BASH_REMATCH[1]}
cd /srv/storylens-website
git fetch origin main
[ "$commit" = "$(git rev-parse origin/main)" ] || { echo 'Superseded CI result; refusing untested main'; exit 1; }
git checkout main
git merge --ff-only "$commit"
exec make deploy
