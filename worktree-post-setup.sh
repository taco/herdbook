#!/bin/bash
set -euo pipefail

# Herdbook-specific worktree post-setup.
# Called by ~/.claude/worktree-setup.sh after generic bootstrapping.
#
# Args: $1 = worktree root, $2 = main worktree root

WORKTREE_ROOT="$1"
MAIN_WORKTREE="$2"

# --- Package-specific env files ---
echo "Symlinking package env files..."

if [ -f "$MAIN_WORKTREE/packages/web/.env" ]; then
  ln -sf "$MAIN_WORKTREE/packages/web/.env" "$WORKTREE_ROOT/packages/web/.env"
  echo "  packages/web/.env"
fi

# packages/api/.env (match main worktree's symlink target)
API_ENV_TARGET="$(readlink "$MAIN_WORKTREE/packages/api/.env" 2>/dev/null || echo "../../.env.api.local")"
ln -sf "$API_ENV_TARGET" "$WORKTREE_ROOT/packages/api/.env"
echo "  packages/api/.env -> $API_ENV_TARGET"
echo ""

# --- Install dependencies ---
echo "Installing dependencies..."
pnpm install
echo ""

# --- Generate Prisma client ---
echo "Generating Prisma client..."
pnpm --filter api exec prisma generate
