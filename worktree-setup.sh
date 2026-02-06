#!/bin/bash
set -euo pipefail

# Creates a new git worktree with a new branch, then bootstraps
# env files, Claude Code permissions, dependencies, and codegen.
#
# Usage: ./worktree-setup.sh <path> <branch-name>
#   ./worktree-setup.sh ../herdbook-feature my-new-branch

if [ $# -lt 2 ]; then
  echo "Usage: ./worktree-setup.sh <path> <branch-name>"
  echo "  e.g. ./worktree-setup.sh ../herdbook-feature my-new-branch"
  exit 1
fi

WORKTREE_PATH="$1"
BRANCH_NAME="$2"
MAIN_WORKTREE="$(git worktree list --porcelain | head -1 | sed 's/worktree //')"

# --- Create the worktree with a new branch ---
echo "Creating worktree at $WORKTREE_PATH on new branch '$BRANCH_NAME'..."
git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH"

WORKTREE_ROOT="$(cd "$WORKTREE_PATH" && pwd)"
echo ""
echo "Main worktree: $MAIN_WORKTREE"
echo "New worktree:  $WORKTREE_ROOT"
echo ""

# --- Symlink env files ---
echo "Symlinking env files..."
for envfile in "$MAIN_WORKTREE"/.env.*; do
  basename="$(basename "$envfile")"
  [ "$basename" = ".env.example" ] && continue
  ln -sf "$envfile" "$WORKTREE_ROOT/$basename"
  echo "  $basename"
done

if [ -f "$MAIN_WORKTREE/.env.local" ]; then
  ln -sf "$MAIN_WORKTREE/.env.local" "$WORKTREE_ROOT/.env.local"
  echo "  .env.local"
fi

if [ -f "$MAIN_WORKTREE/packages/web/.env.local" ]; then
  ln -sf "$MAIN_WORKTREE/packages/web/.env.local" "$WORKTREE_ROOT/packages/web/.env.local"
  echo "  packages/web/.env.local"
fi

# packages/api/.env (match main worktree's symlink target)
API_ENV_TARGET="$(readlink "$MAIN_WORKTREE/packages/api/.env" 2>/dev/null || echo "../../.env.local")"
ln -sf "$API_ENV_TARGET" "$WORKTREE_ROOT/packages/api/.env"
echo "  packages/api/.env -> $API_ENV_TARGET"

# SSL certs (*.pem)
for pemfile in "$MAIN_WORKTREE"/*.pem; do
  [ -f "$pemfile" ] || continue
  ln -sf "$pemfile" "$WORKTREE_ROOT/$(basename "$pemfile")"
  echo "  $(basename "$pemfile")"
done
echo ""

# --- Claude Code: share permissions and memory across worktrees ---
echo "Setting up Claude Code..."

# Symlink .claude/settings.local.json so permissions carry over
if [ -f "$MAIN_WORKTREE/.claude/settings.local.json" ]; then
  mkdir -p "$WORKTREE_ROOT/.claude"
  ln -sf "$MAIN_WORKTREE/.claude/settings.local.json" "$WORKTREE_ROOT/.claude/settings.local.json"
  echo "  .claude/settings.local.json (permissions)"
fi

# Symlink ~/.claude/projects/ entry so memory and history carry over
# Claude keys project data by absolute path, replacing / with -
MAIN_PROJECT_KEY="$(echo "$MAIN_WORKTREE" | sed 's|/|-|g')"
WORKTREE_PROJECT_KEY="$(echo "$WORKTREE_ROOT" | sed 's|/|-|g')"
CLAUDE_PROJECTS_DIR="$HOME/.claude/projects"

if [ -d "$CLAUDE_PROJECTS_DIR/$MAIN_PROJECT_KEY" ]; then
  ln -sfn "$CLAUDE_PROJECTS_DIR/$MAIN_PROJECT_KEY" "$CLAUDE_PROJECTS_DIR/$WORKTREE_PROJECT_KEY"
  echo "  ~/.claude/projects/ (shared memory)"
fi

echo ""

# --- Install dependencies ---
echo "Installing dependencies..."
(cd "$WORKTREE_ROOT" && pnpm install)

echo ""

# --- Generate Prisma client ---
echo "Generating Prisma client..."
(cd "$WORKTREE_ROOT" && pnpm --filter api exec prisma generate)

echo ""
echo "Done! cd $WORKTREE_PATH && pnpm dev"
