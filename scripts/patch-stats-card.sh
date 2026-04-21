#!/usr/bin/env bash
# Rewrites every theme's 3-stats.svg so "Total Commits" reflects only the
# current calendar year instead of the lifetime sum the upstream action emits.
# Requires: GH_PAT (read:user scope), USERNAME, curl, jq, sed.
set -euo pipefail

: "${GH_PAT:?GH_PAT must be set}"
: "${USERNAME:?USERNAME must be set}"

YEAR=$(date -u +%Y)

payload=$(jq -n \
  --arg login "$USERNAME" \
  --arg from  "${YEAR}-01-01T00:00:00Z" \
  --arg to    "${YEAR}-12-31T23:59:59Z" \
  '{query: "query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){totalCommitContributions}}}",
    variables: {login:$login, from:$from, to:$to}}')

response=$(curl -sS --fail-with-body \
  -H "Authorization: bearer ${GH_PAT}" \
  -H "Content-Type: application/json" \
  -d "$payload" \
  https://api.github.com/graphql)

commits=$(jq -r '.data.user.contributionsCollection.totalCommitContributions' <<<"$response")

if [[ -z "$commits" || "$commits" == "null" ]]; then
  echo "GraphQL returned no commit count. Response:" >&2
  echo "$response" >&2
  exit 1
fi

echo "Patching stats cards: Commits in ${YEAR} = ${commits}"

shopt -s nullglob
for svg in profile-summary-card-output/*/3-stats.svg; do
  sed -i "s|>Total Commits:<|>Commits in ${YEAR}:<|g" "$svg"
  sed -i -E "s|(<text x=\"130\" y=\"39\\.2\"[^>]*>)[0-9]+(</text>)|\\1${commits}\\2|" "$svg"
done
