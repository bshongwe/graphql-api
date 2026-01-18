# 80-Character Line Limit Implementation Guide

## Current Status

**Date**: January 18, 2026  
**Audit Results**:
- TypeScript violations: **98 lines**
- Shell script violations: **67 lines**  
- YAML violations: **0 lines** ✅
- Primary affected files: 10 files with 3+ violations each

## What Has Been Done ✅

### 1. Configuration Files Updated

#### `.prettierrc`
```json
{
  "printWidth": 80  // Changed from 100
}
```

#### `.editorconfig` (NEW)
```ini
[*.{ts,js,tsx,jsx}]
max_line_length = 80
```

#### `.eslintrc.json`
```json
{
  "rules": {
    "max-len": [
      "error",
      {
        "code": 80,
        "tabWidth": 2,
        "ignoreUrls": true
      }
    ]
  }
}
```

### 2. New Scripts Added

```json
{
  "scripts": {
    "lint:line-length": "./scripts/audit-line-length.sh",
    "quality:audit": "./scripts/audit-line-length.sh",
    "quality:fix": "npm run format && npm run lint:fix"
  }
}
```

### 3. New Tools Created

- **`scripts/audit-line-length.sh`**: Audit script to count violations
- **`docs/CODE_QUALITY_REPORT.md`**: Comprehensive analysis report

## Top Files Requiring Fixes

### 🔴 High Priority (10+ violations)

1. **`src/infrastructure/jobQueue.ts`** - 18 violations
   - Type definitions (8)
   - Logger statements (7)
   - Import statements (3)

2. **`src/graphql/resolvers/userResolver.ts`** - 11 violations
   - Function signatures (5)
   - Long expressions (6)

3. **`src/infrastructure/jobWorkers.ts`** - 10 violations
   - Logger statements (10)

### 🟡 Medium Priority (5-9 violations)

4. **`src/server.ts`** - 7 violations
5. **`tests/unit/subscriptions.test.ts`** - 5 violations
6. **`tests/unit/jobQueue.test.ts`** - 5 violations

### 🟢 Low Priority (<5 violations)

7. **`src/application/userService.ts`** - 4 violations
8. **`tests/helpers/testDataFactory.ts`** - 3 violations
9. **`src/utils/validationUtils.ts`** - 3 violations

## Step-by-Step Fix Guide

### Phase 1: Automated Fixes (Recommended First)

```bash
# Step 1: Run Prettier to auto-fix TypeScript files
npm run format

# Step 2: Run ESLint auto-fix
npm run lint:fix

# Step 3: Check remaining issues
npm run quality:audit
```

**Expected result**: Should reduce TypeScript violations by ~60-70%

### Phase 2: Manual TypeScript Fixes

For remaining TypeScript violations, apply these patterns:

#### Pattern 1: Long Imports
```typescript
// Before (92 chars)
import { initializeJobQueues, closeJobQueues } from "./infrastructure/jobQueue.js";

// After (80 chars max)
import {
  initializeJobQueues,
  closeJobQueues,
} from './infrastructure/jobQueue.js';
```

#### Pattern 2: Logger Messages
```typescript
// Before (88 chars)
logger.warn(error, 'Redis PubSub initialization failed, subscriptions may not work');

// After
const message = 
  'Redis PubSub initialization failed, subscriptions may not work';
logger.warn(error, message);

// Or
logger.warn(
  error,
  'Redis PubSub initialization failed, ' +
    'subscriptions may not work'
);
```

#### Pattern 3: Function Signatures
```typescript
// Before (95 chars)
async create(data: { name: string; email: string; password: string; role?: string }): Promise<User> {

// After - Extract type
type CreateUserData = {
  name: string;
  email: string;
  password: string;
  role?: string;
};

async create(data: CreateUserData): Promise<User> {
```

#### Pattern 4: Union Types
```typescript
// Before (88 chars)
type: typeof JOB_TYPES.SEND_WELCOME_EMAIL | typeof JOB_TYPES.SEND_PASSWORD_RESET;

// After
type:
  | typeof JOB_TYPES.SEND_WELCOME_EMAIL
  | typeof JOB_TYPES.SEND_PASSWORD_RESET;
```

### Phase 3: Shell Script Fixes

```bash
# Before (145 chars)
kubectl wait --for=condition=available --timeout=300s deployment/postgres-deployment -n graphql-api || print_warning "PostgreSQL ready check timed out"

# After
kubectl wait \
  --for=condition=available \
  --timeout=300s \
  deployment/postgres-deployment \
  -n graphql-api || \
  print_warning "PostgreSQL ready check timed out"
```

## Verification Process

### 1. Before Starting
```bash
# Get baseline count
npm run quality:audit
```

### 2. After Each Phase
```bash
# Check progress
npm run quality:audit

# Run tests to ensure nothing broke
npm test

# Run linter
npm run lint
```

### 3. Final Verification
```bash
# All checks should pass
npm run precommit
```

## Git Workflow

### Recommended Commit Strategy
```bash
# Commit configuration changes
git add .prettierrc .editorconfig .eslintrc.json
git commit -m "chore: enforce 80-character line limit"

# Commit automated fixes
npm run format
git add -u
git commit -m "style: auto-format code to 80-char limit"

# Commit manual fixes by file
git add src/infrastructure/jobQueue.ts
git commit -m "refactor: fix line length in jobQueue.ts"

# Continue for each file...
```

## Preventing Future Violations

### 1. Pre-commit Hook (Recommended)

Create `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run format:check
npm run lint
```

### 2. CI/CD Integration

Add to GitHub Actions:
```yaml
- name: Check code quality
  run: |
    npm run format:check
    npm run lint
```

### 3. Editor Integration

**VS Code** - Add to `.vscode/settings.json`:
```json
{
  "editor.rulers": [80],
  "editor.wordWrapColumn": 80,
  "editor.formatOnSave": true,
  "prettier.printWidth": 80
}
```

**WebStorm/IntelliJ**:
- Settings → Editor → Code Style → Hard wrap at: 80
- Settings → Tools → Actions on Save → Reformat code ✓

## Expected Timeline

### Quick Fix (1-2 hours)
- ✅ Configuration setup (DONE)
- ⏱️ Run automated fixes (15 minutes)
- ⏱️ Manual TypeScript fixes (45-60 minutes)
- ⏱️ Shell script fixes (15-30 minutes)

### Comprehensive Fix (2-3 hours)
- Everything in Quick Fix
- Extract type definitions
- Create logger message constants
- Refactor complex functions
- Update documentation

## Benefits of 80-Character Limit

1. **Readability**: Easier to read without horizontal scrolling
2. **Code Review**: Better side-by-side diff viewing
3. **Collaboration**: Works on smaller screens and terminals
4. **Best Practices**: Industry standard (Google, Airbnb style guides)
5. **Maintainability**: Encourages simpler, more focused code

## Common Exceptions

The following are typically allowed to exceed 80 characters:

1. **URLs in comments**: Already ignored in ESLint config
2. **RegExp patterns**: Already ignored in ESLint config  
3. **Import paths**: Should still be broken up for clarity
4. **Long string literals**: Should use template literals or concatenation

## Resources

- **Report**: `docs/CODE_QUALITY_REPORT.md`
- **Audit Script**: `scripts/audit-line-length.sh`
- **Config Files**: `.prettierrc`, `.editorconfig`, `.eslintrc.json`

## Quick Reference Commands

```bash
# Audit current violations
npm run quality:audit

# Auto-fix what's possible
npm run quality:fix

# Check formatting
npm run format:check

# Run linter
npm run lint

# Full quality check
npm run precommit
```

## Next Steps

1. **Immediate**: Run `npm run quality:fix` to auto-fix
2. **Short-term**: Manually fix top 3 violating files
3. **Medium-term**: Add pre-commit hooks
4. **Long-term**: Refactor complex code for better maintainability

---

**Status**: Configuration Complete ✅  
**Action Required**: Run automated fixes and manual cleanup  
**Estimated Time**: 1-2 hours for full compliance
