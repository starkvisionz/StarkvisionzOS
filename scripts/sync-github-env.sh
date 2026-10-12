#!/usr/bin/env bash
#
# Push every environment variable this repo's workflows consume into GitHub
# Actions, as an encrypted secret or a plain variable depending on the name.
#
#   cp .env.github.example .env.github
#   $EDITOR .env.github
#   scripts/sync-github-env.sh .env.github
#
# Requires the GitHub CLI (`gh auth login`) with admin rights on the repo.
#
# Values are piped to `gh` on stdin, never passed as arguments, so they do not
# appear in the process table. Nothing is echoed. A value that still looks like
# a placeholder is refused rather than uploaded, because a wrong secret fails
# at deploy time in ways a missing one does not.
#
# Usage:
#   scripts/sync-github-env.sh <env-file> [options]
#
#   --repo OWNER/NAME     target repo (default: the `origin` remote)
#   --environment NAME    write into a GitHub Environment instead of the repo
#   --dry-run             print the plan, change nothing
#   --allow-unknown       upload names not in the registry below (as secrets)
#   -h, --help            this text
set -euo pipefail
umask 077

# --- the registry -----------------------------------------------------------
# Anything credential-shaped is a secret. Variables are values that are
# public by nature (a URL, a port, an account-scoped id) and are far easier to
# debug when a workflow log can show them.
SECRET_NAMES=(
  DATABASE_URL DIRECT_URL SUPABASE_JWT_SECRET
  COMPUTE_API_KEY
  R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY
  CLOUDFLARE_API_TOKEN
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  ANTHROPIC_API_KEY
  SVOS_AUTH_TOKEN
  HOSTINGER_FTP_USER HOSTINGER_FTP_PASSWORD
  HOSTINGER_SSH_KEY HOSTINGER_SSH_USER
)
VARIABLE_NAMES=(
  COMPUTE_API_URL
  HYPERDRIVE_ID R2_ENDPOINT CLOUDFLARE_ACCOUNT_ID
  NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_API_BASE
  SVOS_ACTOR SVOS_ALLOWED_ORIGINS
  SVOS_MAX_PROMPT_CHARS SVOS_MAX_OUTPUT_TOKENS
  SVOS_RATE_LIMIT SVOS_CHAT_LIMIT SVOS_RATE_WINDOW_MS
  PORT
  HOSTINGER_FTP_HOST HOSTINGER_FTP_PATH
  HOSTINGER_SSH_HOST HOSTINGER_SSH_PORT HOSTINGER_DEPLOY_PATH
)

# Values that are obviously still from .env.github.example.
PLACEHOLDER_RE='replace[-_ ]?me|replace[-_]with|\[your-password\]|your_subdomain|your-subdomain|^project_ref$|project_ref\.|account_id\.|^changeme$|^sk-ant-replace'

ENV_FILE=""
REPO=""
ENVIRONMENT=""
DRY_RUN=0
ALLOW_UNKNOWN=0

usage() { sed -n '3,22p' "$0" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case $1 in
    --repo)         REPO=${2:?--repo needs a value}; shift 2 ;;
    --environment)  ENVIRONMENT=${2:?--environment needs a value}; shift 2 ;;
    --dry-run)      DRY_RUN=1; shift ;;
    --allow-unknown) ALLOW_UNKNOWN=1; shift ;;
    -h|--help)      usage; exit 0 ;;
    -*)             echo "unknown option: $1" >&2; exit 2 ;;
    *)              [[ -n $ENV_FILE ]] && { echo "only one env file" >&2; exit 2; }
                    ENV_FILE=$1; shift ;;
  esac
done

[[ -n $ENV_FILE ]] || { usage >&2; exit 2; }
[[ -f $ENV_FILE ]] || { echo "no such file: $ENV_FILE" >&2; exit 1; }

command -v gh >/dev/null || {
  echo "the GitHub CLI (gh) is required: https://cli.github.com" >&2
  exit 1
}
if (( ! DRY_RUN )); then
  gh auth status >/dev/null 2>&1 || { echo "run 'gh auth login' first" >&2; exit 1; }
fi

if [[ -z $REPO ]]; then
  origin=$(git remote get-url origin 2>/dev/null || true)
  [[ $origin =~ ([^/:]+/[^/]+?)(\.git)?$ ]] && REPO=${BASH_REMATCH[1]}
  [[ -n $REPO ]] || { echo "could not infer the repo; pass --repo OWNER/NAME" >&2; exit 1; }
fi

classify() {
  local n=$1 k
  for k in "${SECRET_NAMES[@]}";   do [[ $n == "$k" ]] && { echo secret;   return; }; done
  for k in "${VARIABLE_NAMES[@]}"; do [[ $n == "$k" ]] && { echo variable; return; }; done
  echo unknown
}

scope="repository"
[[ -n $ENVIRONMENT ]] && scope="environment '$ENVIRONMENT'"
echo "target: $REPO ($scope)"
echo "source: $ENV_FILE"
(( DRY_RUN )) && echo "mode:   dry run, nothing will be written"
echo

sent=0 blank=0 refused=0 skipped=0 lineno=0

while IFS= read -r line || [[ -n $line ]]; do
  lineno=$((lineno + 1))
  line=${line%$'\r'}                                  # tolerate CRLF
  [[ $line =~ ^[[:space:]]*(#|$) ]] && continue
  line=${line#export }
  [[ $line == *=* ]] || continue

  name=${line%%=*}
  value=${line#*=}
  name=${name//[[:space:]]/}
  [[ $name =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || {
    printf '  ?  %-30s line %s is not a KEY=VALUE pair, skipped\n' "${name:0:30}" "$lineno"
    skipped=$((skipped + 1)); continue
  }

  # Strip surrounding quotes; for unquoted values, drop a trailing ` # comment`.
  case $value in
    \"*\") value=${value:1:${#value}-2} ;;
    \'*\') value=${value:1:${#value}-2} ;;
    *)     value=${value%%[[:space:]]#*}
           value=${value%"${value##*[![:space:]]}"} ;;
  esac

  if [[ -z $value ]]; then
    blank=$((blank + 1)); continue
  fi

  if printf '%s' "$value" | grep -Eiq "$PLACEHOLDER_RE"; then
    printf '  !  %-30s still a placeholder — refused\n' "$name"
    refused=$((refused + 1)); continue
  fi

  kind=$(classify "$name")
  if [[ $kind == unknown ]]; then
    if (( ALLOW_UNKNOWN )); then
      kind=secret
      printf '  ?  %-30s not in the registry, uploading as a secret\n' "$name"
    else
      printf '  ?  %-30s not in the registry — skipped (--allow-unknown to force)\n' "$name"
      skipped=$((skipped + 1)); continue
    fi
  fi

  if (( DRY_RUN )); then
    printf '  →  %-30s would be set as a %s\n' "$name" "$kind"
    sent=$((sent + 1)); continue
  fi

  args=(--repo "$REPO")
  [[ -n $ENVIRONMENT ]] && args+=(--env "$ENVIRONMENT")
  if err=$(printf '%s' "$value" | gh "$kind" set "$name" "${args[@]}" 2>&1 >/dev/null); then
    printf '  ✓  %-30s %s\n' "$name" "$kind"
    sent=$((sent + 1))
  else
    printf '  ✗  %-30s failed to set as a %s\n' "$name" "$kind"
    [[ -n $err ]] && printf '     %s\n' "$err" >&2
    exit 1
  fi
done < "$ENV_FILE"

echo
printf 'set %d · blank %d · refused %d · skipped %d\n' "$sent" "$blank" "$refused" "$skipped"
if (( refused )); then
  echo "fix the refused values and re-run; this script is idempotent." >&2
  exit 1
fi
exit 0
