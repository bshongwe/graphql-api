#!/bin/bash

# Line Length Audit Script
# This script identifies all lines exceeding 80 characters

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   80-Character Line Limit Audit${NC}"
echo -e "${BLUE}================================================${NC}"
echo

# Count violations in TypeScript files
echo -e "${YELLOW}Analyzing TypeScript files...${NC}"
TS_COUNT=$(find src tests -name "*.ts" -type f -exec grep -nH '^.\{81,\}$' {} \; 2>/dev/null | wc -l | tr -d ' ')
echo -e "TypeScript violations: ${RED}${TS_COUNT}${NC}"

# Count violations in YAML files
echo -e "${YELLOW}Analyzing YAML files...${NC}"
YAML_COUNT=$(find k8s -name "*.yaml" -o -name "*.yml" -type f -exec grep -nH '^.\{81,\}$' {} \; 2>/dev/null | wc -l | tr -d ' ')
echo -e "YAML violations: ${RED}${YAML_COUNT}${NC}"

# Count violations in Shell files
echo -e "${YELLOW}Analyzing Shell scripts...${NC}"
SH_COUNT=$(find . -name "*.sh" -type f -exec grep -nH '^.\{81,\}$' {} \; 2>/dev/null | wc -l | tr -d ' ')
echo -e "Shell violations: ${RED}${SH_COUNT}${NC}"

# Count violations in Markdown files
echo -e "${YELLOW}Analyzing Markdown files...${NC}"
MD_COUNT=$(find . -name "*.md" -type f -exec grep -nH '^.\{81,\}$' {} \; 2>/dev/null | wc -l | tr -d ' ')
echo -e "Markdown violations: ${RED}${MD_COUNT}${NC}"

echo
echo -e "${BLUE}------------------------------------------------${NC}"
TOTAL=$((TS_COUNT + YAML_COUNT + SH_COUNT + MD_COUNT))
echo -e "${YELLOW}Total violations: ${RED}${TOTAL}${NC}"
echo -e "${BLUE}------------------------------------------------${NC}"
echo

echo -e "${GREEN}Top 10 files with most violations:${NC}"
find src tests k8s -type f \( -name "*.ts" -o -name "*.yaml" -o -name "*.yml" \) \
  -exec sh -c 'count=$(grep -c "^.\{81,\}$" "$1" 2>/dev/null || echo 0); echo "$count:$1"' _ {} \; \
  | sort -rn | head -10 | while IFS=: read count file; do
  if [ "$count" -gt 0 ]; then
    echo -e "  ${RED}${count}${NC} violations in ${BLUE}${file}${NC}"
  fi
done

echo
echo -e "${GREEN}Recommended actions:${NC}"
echo "1. Run: npm run format (to auto-fix TypeScript files)"
echo "2. Manually fix YAML files with multiline strings"
echo "3. Fix shell scripts with backslash continuation"
echo "4. Run: npm run lint (to check for remaining issues)"

echo
echo -e "${YELLOW}Detailed violation report:${NC}"
echo "See: docs/CODE_QUALITY_REPORT.md"
echo
