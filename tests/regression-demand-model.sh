#!/bin/bash
# Regression tests for demand model classification
# Run: bash tests/regression-demand-model.sh
# Requires: dev server running on localhost:3000 with ANTHROPIC_API_KEY set
#
# Tests 3 scenarios:
# 1. Industrial MIL-spec manufacturer → NOT_A_FIT or LIMITED_FIT
# 2. Local residential tree care → FIT
# 3. Any result → keyword volume claims must be evidence-tagged

BASE="http://localhost:3000"
PASSWORD="cogent.123"
PASS=0
FAIL=0

echo "━━━ Demand Model Regression Tests ━━━"
echo ""

# Helper: scan a URL and generate
generate() {
  local url="$1"
  local label="$2"

  echo "▶ Test: $label"
  echo "  Scanning: $url"

  # Step 1: Scan the website
  SCAN=$(curl -s -X POST "$BASE/api/scan-website" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$url\"}")

  TEXT=$(echo "$SCAN" | python3 -c "import sys, json; print(json.load(sys.stdin).get('text','')[:500])" 2>/dev/null)

  if [ -z "$TEXT" ] || [ "$TEXT" = "" ]; then
    echo "  ✗ SCAN FAILED — could not fetch site content"
    FAIL=$((FAIL + 1))
    return 1
  fi

  TITLE=$(echo "$SCAN" | python3 -c "import sys, json; print(json.load(sys.stdin).get('title',''))" 2>/dev/null)
  FULL_TEXT=$(echo "$SCAN" | python3 -c "import sys, json; print(json.load(sys.stdin).get('text',''))" 2>/dev/null)

  # Step 2: Generate industry profile
  RESULT=$(curl -s -X POST "$BASE/api/generate-industry" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "
import json, sys
print(json.dumps({
  'url': '$url',
  'text': '''$FULL_TEXT'''[:7000],
  'title': '$TITLE',
  'password': '$PASSWORD'
}))
" 2>/dev/null)")

  # Check for errors
  ERROR=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null)
  if [ -n "$ERROR" ] && [ "$ERROR" != "" ]; then
    echo "  ✗ GENERATE FAILED: $ERROR"
    FAIL=$((FAIL + 1))
    return 1
  fi

  # Extract demand assessment
  VERDICT=$(echo "$RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
da = d.get('industry', {}).get('demandAssessment', {})
print(da.get('verdict', 'MISSING'))
" 2>/dev/null)

  DEMAND_MODEL=$(echo "$RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
da = d.get('industry', {}).get('demandAssessment', {})
print(da.get('demandModel', 'MISSING'))
" 2>/dev/null)

  VERDICT_REASON=$(echo "$RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
da = d.get('industry', {}).get('demandAssessment', {})
print(da.get('verdictReason', 'MISSING'))
" 2>/dev/null)

  GOOGLE_RATING=$(echo "$RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
pr = d.get('industry', {}).get('platformRecommendations', {}).get('google', {})
print(pr.get('rating', 'MISSING'))
" 2>/dev/null)

  ALT_CHANNELS=$(echo "$RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
da = d.get('industry', {}).get('demandAssessment', {})
alts = da.get('alternativeChannels', [])
for a in alts:
  print(f'    - {a.get(\"channel\",\"?\")}')
" 2>/dev/null)

  echo "  Verdict:      $VERDICT"
  echo "  Demand model: $DEMAND_MODEL"
  echo "  Reason:       $VERDICT_REASON"
  echo "  Google rating: $GOOGLE_RATING"
  if [ -n "$ALT_CHANNELS" ]; then
    echo "  Alt channels:"
    echo "$ALT_CHANNELS"
  fi

  # Return values for assertion
  echo "$VERDICT" > /tmp/roi-test-verdict
  echo "$DEMAND_MODEL" > /tmp/roi-test-model
  echo "$GOOGLE_RATING" > /tmp/roi-test-google
  echo "$RESULT" > /tmp/roi-test-full
  return 0
}

# ── TEST 1: Industrial MIL-spec manufacturer ──────────────────────────────
echo "━━━ TEST 1: Detroit Switch (industrial MIL-spec, distributor/contract) ━━━"
generate "detroitswitchinc.com" "Industrial component manufacturer"

if [ $? -eq 0 ]; then
  V=$(cat /tmp/roi-test-verdict)
  M=$(cat /tmp/roi-test-model)
  G=$(cat /tmp/roi-test-google)

  if [ "$V" = "NOT_A_FIT" ] || [ "$V" = "LIMITED_FIT" ]; then
    echo "  ✓ PASS — Verdict is $V (not FIT)"
    PASS=$((PASS + 1))
  else
    echo "  ✗ FAIL — Expected NOT_A_FIT or LIMITED_FIT, got $V"
    FAIL=$((FAIL + 1))
  fi

  if [ "$M" = "b2b-spec-in" ] || [ "$M" = "contract-bid-driven" ] || [ "$M" = "distributor-mediated" ]; then
    echo "  ✓ PASS — Demand model is $M (correct category)"
    PASS=$((PASS + 1))
  else
    echo "  ✗ FAIL — Expected spec-in/contract/distributor model, got $M"
    FAIL=$((FAIL + 1))
  fi

  if [ "$G" -le 2 ] 2>/dev/null; then
    echo "  ✓ PASS — Google rating is $G (≤2)"
    PASS=$((PASS + 1))
  else
    echo "  ✗ FAIL — Expected Google rating ≤2, got $G"
    FAIL=$((FAIL + 1))
  fi
fi

echo ""

# ── TEST 2: Local residential tree care ───────────────────────────────────
echo "━━━ TEST 2: Local tree care (consumer-initiated local service) ━━━"
# Using a well-known tree service site
generate "savatree.com" "Local tree care company"

if [ $? -eq 0 ]; then
  V=$(cat /tmp/roi-test-verdict)

  if [ "$V" = "FIT" ]; then
    echo "  ✓ PASS — Verdict is FIT"
    PASS=$((PASS + 1))
  else
    echo "  ✗ FAIL — Expected FIT, got $V"
    FAIL=$((FAIL + 1))
  fi
fi

echo ""

# ── TEST 3: Evidence tagging check ───────────────────────────────────────
echo "━━━ TEST 3: Evidence tiers present on claims ━━━"
# Use the last result from any test
FULL=$(cat /tmp/roi-test-full 2>/dev/null)

HAS_TIERS=$(echo "$FULL" | python3 -c "
import sys, json
d = json.load(sys.stdin)
da = d.get('industry', {}).get('demandAssessment', {})
claims = [
  da.get('buyerInitiatesWithSearch', {}),
  da.get('transactionDirect', {}),
  da.get('searchTermBehavior', {}),
  da.get('headTermOwnership', {}),
  da.get('salesCycleLength', {}),
  da.get('geoConstrained', {}),
]
tiers = [c.get('tier', '') for c in claims]
valid = all(t in ('VERIFIED', 'INFERRED', 'UNKNOWN') for t in tiers)
print('PASS' if valid else 'FAIL')
print('Tiers found:', tiers)
" 2>/dev/null)

TIER_RESULT=$(echo "$HAS_TIERS" | head -1)
TIER_DETAIL=$(echo "$HAS_TIERS" | tail -1)

if [ "$TIER_RESULT" = "PASS" ]; then
  echo "  ✓ PASS — All 6 claims have valid evidence tiers"
  echo "  $TIER_DETAIL"
  PASS=$((PASS + 1))
else
  echo "  ✗ FAIL — Evidence tiers missing or invalid"
  echo "  $TIER_DETAIL"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "━━━ RESULTS: $PASS passed, $FAIL failed ━━━"

# Cleanup
rm -f /tmp/roi-test-verdict /tmp/roi-test-model /tmp/roi-test-google /tmp/roi-test-full
