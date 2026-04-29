#!/usr/bin/env bash
#
# Configure Cloudflare DNS + redirect rules for the three Open Membership domains.
#
# Idempotent: safe to re-run. Existing records that already match are left alone;
# wrong records are corrected; missing ones are created.
#
# Usage:
#   CF_API_TOKEN=<token> ./scripts/cloudflare-setup.sh           # apply
#   CF_API_TOKEN=<token> ./scripts/cloudflare-setup.sh --dry-run # show plan only
#
# The API token needs these permissions, scoped to the three zones:
#   - Zone : Zone : Read
#   - Zone : DNS : Edit
#   - Zone : Zone Settings : Edit
#   - Zone : Page Rules : Edit          (legacy — leave on if available)
#   - Zone : Config Rules : Edit        (the new ruleset endpoints)
#
# Create one at: https://dash.cloudflare.com/profile/api-tokens
# (Use the "Custom token" template, not the "Edit zone DNS" template — we need
#  more than just DNS.)

set -euo pipefail

# --- configuration ------------------------------------------------------------

CANONICAL_DOMAIN="open-membership.org"
REDIRECT_DOMAINS=("openmembership.org" "open-membership.com")
GH_USER="leanderrj"

GH_PAGES_IPV4=(
  "185.199.108.153"
  "185.199.109.153"
  "185.199.110.153"
  "185.199.111.153"
)
GH_PAGES_IPV6=(
  "2606:50c0:8000::153"
  "2606:50c0:8001::153"
  "2606:50c0:8002::153"
  "2606:50c0:8003::153"
)
PLACEHOLDER_IPV4="192.0.2.1"   # documentation-reserved; the proxy never forwards

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

: "${CF_API_TOKEN:?CF_API_TOKEN is not set. See header of this script.}"

API="https://api.cloudflare.com/client/v4"

# --- helpers ------------------------------------------------------------------

cf() {
  curl -fsS \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json" \
    "$@"
}

log()  { printf '\033[1m→\033[0m %s\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
plan() { printf '  \033[36m·\033[0m would: %s\n' "$*"; }

zone_id_of() {
  local name="$1"
  cf "$API/zones?name=$name" | jq -r '.result[0].id // empty'
}

# Ensure a DNS record with the given (type, name, content) exists with the
# desired proxied flag. If a record with the same (type, name, content) exists,
# update its proxied flag if needed; otherwise create it. Records of the same
# (type, name) but different content are left alone — we don't delete here, to
# avoid clobbering anything the user added by hand.
ensure_dns() {
  local zone_id="$1" type="$2" name="$3" content="$4" proxied="$5"
  local existing
  existing=$(cf "$API/zones/$zone_id/dns_records?type=$type&name=$name" \
    | jq --arg c "$content" '.result[] | select(.content == $c)')

  if [[ -z "$existing" ]]; then
    if $DRY_RUN; then
      plan "create $type $name → $content (proxied=$proxied)"
      return
    fi
    cf -X POST "$API/zones/$zone_id/dns_records" \
      --data "$(jq -n --arg t "$type" --arg n "$name" --arg c "$content" \
                       --argjson p "$proxied" \
                       '{type:$t, name:$n, content:$c, ttl:1, proxied:$p}')" \
      >/dev/null
    ok "created $type $name → $content (proxied=$proxied)"
  else
    local id current_proxied
    id=$(jq -r '.id' <<<"$existing")
    current_proxied=$(jq -r '.proxied' <<<"$existing")
    if [[ "$current_proxied" != "$proxied" ]]; then
      if $DRY_RUN; then
        plan "flip $type $name proxied: $current_proxied → $proxied"
        return
      fi
      cf -X PATCH "$API/zones/$zone_id/dns_records/$id" \
        --data "$(jq -n --argjson p "$proxied" '{proxied:$p}')" >/dev/null
      ok "flipped $type $name proxied: $current_proxied → $proxied"
    else
      ok "$type $name → $content already correct"
    fi
  fi
}

set_always_use_https() {
  local zone_id="$1" zone_name="$2"
  local current
  current=$(cf "$API/zones/$zone_id/settings/always_use_https" | jq -r '.result.value')
  if [[ "$current" == "on" ]]; then
    ok "$zone_name: Always Use HTTPS already on"
    return
  fi
  if $DRY_RUN; then
    plan "$zone_name: turn on Always Use HTTPS"
    return
  fi
  cf -X PATCH "$API/zones/$zone_id/settings/always_use_https" \
    --data '{"value":"on"}' >/dev/null
  ok "$zone_name: Always Use HTTPS turned on"
}

# Replace the dynamic-redirect ruleset entrypoint with a single canonicalising
# rule. Cloudflare exposes one entrypoint per phase per zone; PUT replaces the
# rule list, which is what we want — it makes the script idempotent and
# trivially undoes any earlier wrong rule (e.g. the http://...com loop).
set_canonical_redirect() {
  local zone_id="$1" zone_name="$2"
  local expr target body
  expr="(http.host eq \"$zone_name\" or http.host eq \"www.$zone_name\")"
  target="concat(\"https://$CANONICAL_DOMAIN\", http.request.uri.path)"

  body=$(jq -n --arg expr "$expr" --arg target "$target" '
    {
      rules: [{
        action: "redirect",
        action_parameters: {
          from_value: {
            status_code: 301,
            target_url: { expression: $target },
            preserve_query_string: true
          }
        },
        expression: $expr,
        description: "Canonicalise to open-membership.org",
        enabled: true
      }]
    }')

  if $DRY_RUN; then
    plan "$zone_name: replace dynamic-redirect ruleset with canonicalisation rule"
    return
  fi
  cf -X PUT "$API/zones/$zone_id/rulesets/phases/http_request_dynamic_redirect/entrypoint" \
    --data "$body" >/dev/null
  ok "$zone_name: canonicalisation redirect rule installed"
}

# --- canonical zone -----------------------------------------------------------

log "Verifying API token and looking up zones"
canonical_zid=$(zone_id_of "$CANONICAL_DOMAIN")
[[ -n "$canonical_zid" ]] || { echo "  zone $CANONICAL_DOMAIN not found in this account" >&2; exit 1; }
ok "$CANONICAL_DOMAIN  zone_id=$canonical_zid"

declare -A redirect_zids
for d in "${REDIRECT_DOMAINS[@]}"; do
  zid=$(zone_id_of "$d")
  [[ -n "$zid" ]] || { echo "  zone $d not found in this account" >&2; exit 1; }
  redirect_zids["$d"]="$zid"
  ok "$d  zone_id=$zid"
done

echo
log "[$CANONICAL_DOMAIN] DNS — apex A/AAAA to GitHub Pages, www CNAME"
for ip in "${GH_PAGES_IPV4[@]}"; do
  ensure_dns "$canonical_zid" "A" "$CANONICAL_DOMAIN" "$ip" false
done
for ip in "${GH_PAGES_IPV6[@]}"; do
  ensure_dns "$canonical_zid" "AAAA" "$CANONICAL_DOMAIN" "$ip" false
done
ensure_dns "$canonical_zid" "CNAME" "www.$CANONICAL_DOMAIN" "$GH_USER.github.io" false

# --- redirect zones -----------------------------------------------------------

for d in "${REDIRECT_DOMAINS[@]}"; do
  zid="${redirect_zids[$d]}"
  echo
  log "[$d] DNS — proxied placeholder + www"
  ensure_dns "$zid" "A" "$d" "$PLACEHOLDER_IPV4" true
  ensure_dns "$zid" "CNAME" "www.$d" "$d" true

  echo
  log "[$d] Always Use HTTPS"
  set_always_use_https "$zid" "$d"

  echo
  log "[$d] Single Redirect → https://$CANONICAL_DOMAIN"
  set_canonical_redirect "$zid" "$d"
done

echo
if $DRY_RUN; then
  log "Dry run complete — re-run without --dry-run to apply."
else
  log "Done. Verifying from a public resolver:"
  for d in "$CANONICAL_DOMAIN" "${REDIRECT_DOMAINS[@]}"; do
    res=$(dig @1.1.1.1 +short "$d" 2>/dev/null | tr '\n' ' ')
    printf '  %s  %s\n' "$d" "${res:-(propagating…)}"
  done
  echo
  cat <<EOF
Next:
  1. Wait 1–5 minutes for DNS to propagate.
  2. GitHub → Settings → Pages → Custom domain → $CANONICAL_DOMAIN
     (after the green check, tick "Enforce HTTPS").
  3. Sanity check:
       curl -sI https://$CANONICAL_DOMAIN/                      # 200
       curl -sI https://${REDIRECT_DOMAINS[0]}/  | grep -i loc  # 301 → canonical
       curl -sI https://${REDIRECT_DOMAINS[1]}/  | grep -i loc  # 301 → canonical
EOF
fi
