# 🚀 Production Deployment Pipeline

Complete guide for deploying the GraphQL API to production environments.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [CI/CD Pipelines](#cicd-pipelines)
- [Deployment Strategies](#deployment-strategies)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

## Overview

This project uses a multi-stage CI/CD pipeline with automated testing, security scanning, and deployment workflows.

### Architecture

```
┌─────────────────┐
│   GitHub Push   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   CI Pipeline   │──┐
│  - Quality      │  │
│  - Tests        │  │
│  - Security     │  │
│  - Build        │  │
└────────┬────────┘  │
         │           │
         ▼           │
┌─────────────────┐  │
│ Docker Registry │  │
│   (GHCR)        │  │
└────────┬────────┘  │
         │           │
         ▼           │
┌─────────────────┐  │  Parallel:
│  Deploy Staging │  │  - Security Scan
└────────┬────────┘  │  - Performance Test
         │           │
         ▼           ▼
┌─────────────────┐
│Deploy Production│
└─────────────────┘
```

## Prerequisites

### Required Tools

1. **Docker** (20.10+)
2. **kubectl** (1.28+)
3. **Node.js** (20+)
4. **npm** (10+)

### Required Accounts

- GitHub account with repository access
- Container registry access (GitHub Container Registry)
- Kubernetes cluster access (production & staging)
- Optional: Monitoring services (DataDog, Sentry, etc.)

### Environment Variables

Required secrets in GitHub Actions:

```bash
# Container Registry
GITHUB_TOKEN                 # Auto-provided by GitHub Actions

# Kubernetes
KUBE_CONFIG_STAGING         # Base64-encoded kubeconfig for staging
KUBE_CONFIG_PRODUCTION      # Base64-encoded kubeconfig for production

# Database
DATABASE_URL                # PostgreSQL connection string

# Security
SNYK_TOKEN                  # Snyk security scanning
CODECOV_TOKEN               # Code coverage reporting

# Notifications
SLACK_WEBHOOK               # Slack notifications

# Optional
SONAR_TOKEN                 # SonarCloud code quality
K6_CLOUD_TOKEN             # k6 performance testing
```

## CI/CD Pipelines

### 1. CI Pipeline (`ci.yml`)

Triggered on: Push to `main` or `develop`, Pull Requests

**Stages:**

1. **Code Quality**
   - Prettier format check
   - ESLint linting
   - TypeScript type checking
   - Line length audit (80 chars)

2. **Security Audit**
   - npm audit
   - Snyk vulnerability scan
   - Trivy filesystem scan

3. **Testing**
   - Unit tests
   - Integration tests
   - Code coverage (uploaded to Codecov)

4. **Build & Push**
   - Multi-platform Docker build (amd64, arm64)
   - Push to GitHub Container Registry
   - Container security scan

5. **Deploy**
   - Staging: Automatic on `develop` branch
   - Production: Automatic on `main` branch

### 2. CD Pipeline (`cd.yml`)

Triggered: Manual workflow dispatch

**Features:**
- Environment selection (staging/production)
- Version specification
- Pre-deployment validation
- Database migrations
- Blue-green deployment
- Automated rollback on failure
- Post-deployment smoke tests

### 3. Release Pipeline (`release.yml`)

Triggered on: Git tags (`v*.*.*`)

**Workflow:**
- Generate release notes
- Build release artifacts
- Create GitHub release
- Tag Docker images with version
- Generate SBOM (Software Bill of Materials)
- Security scan release image

### 4. Security Monitoring (`security.yml`)

Triggered: Daily at 2 AM UTC

**Checks:**
- Dependency vulnerability scan
- Container image security
- License compliance
- Code quality metrics (SonarCloud)

## Deployment Strategies

### Automated Deployment

#### Staging Environment

```bash
# Push to develop branch
git checkout develop
git push origin develop

# CI pipeline automatically:
# 1. Runs tests
# 2. Builds Docker image
# 3. Deploys to staging
# 4. Runs smoke tests
```

#### Production Environment

```bash
# Push to main branch
git checkout main
git merge develop
git push origin main

# CI pipeline automatically:
# 1. Runs full test suite
# 2. Builds production image
# 3. Deploys to production
# 4. Runs verification tests
```

### Manual Deployment

Using GitHub Actions UI:

1. Go to Actions → CD - Production Deployment
2. Click "Run workflow"
3. Select environment (staging/production)
4. Enter version/tag to deploy
5. Monitor deployment progress

Using deployment script:

```bash
# Deploy specific version
export IMAGE_TAG="v1.2.3"
export ENVIRONMENT="production"
./scripts/deploy-production.sh
```

### Release Deployment

```bash
# Create and push a version tag
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3

# Release pipeline automatically:
# 1. Creates GitHub release
# 2. Builds versioned images
# 3. Generates SBOM
# 4. Publishes artifacts
```

## Configuration

### GitHub Repository Secrets

Set these in: Settings → Secrets and variables → Actions

```bash
# Kubernetes Configuration
gh secret set KUBE_CONFIG_STAGING \
  --body "$(cat ~/.kube/staging-config.yaml | base64)"

gh secret set KUBE_CONFIG_PRODUCTION \
  --body "$(cat ~/.kube/production-config.yaml | base64)"

# Database
gh secret set DATABASE_URL \
  --body "postgresql://user:pass@host:5432/db"

# Security Tokens
gh secret set SNYK_TOKEN --body "your-snyk-token"
gh secret set CODECOV_TOKEN --body "your-codecov-token"

# Notifications
gh secret set SLACK_WEBHOOK --body "https://hooks.slack.com/..."
```

### Kubernetes Secrets

```bash
# Create namespace secrets
kubectl create secret generic graphql-api-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=JWT_SECRET="your-jwt-secret" \
  --from-literal=REDIS_PASSWORD="your-redis-password" \
  -n graphql-api
```

### Environment-Specific Configuration

**Staging:**
```yaml
# k8s/staging/kustomization.yaml
namespace: graphql-api-staging
replicas: 2
resources:
  limits:
    cpu: 500m
    memory: 1Gi
```

**Production:**
```yaml
# k8s/production/kustomization.yaml
namespace: graphql-api
replicas: 3
resources:
  limits:
    cpu: 1000m
    memory: 2Gi
autoscaling:
  minReplicas: 3
  maxReplicas: 20
```

## Monitoring

### Health Checks

```bash
# Application health
curl https://api.example.com/health

# Kubernetes pod health
kubectl get pods -n graphql-api
kubectl describe pod <pod-name> -n graphql-api
```

### Logs

```bash
# View application logs
kubectl logs -f deployment/graphql-api-deployment -n graphql-api

# View logs from all pods
kubectl logs -l app=graphql-api -n graphql-api --tail=100

# Stream logs
kubectl logs -f -l app=graphql-api -n graphql-api
```

### Metrics

```bash
# View pod metrics
kubectl top pods -n graphql-api

# View node metrics
kubectl top nodes

# Access Prometheus metrics
curl https://api.example.com/metrics
```

### Deployment Status

```bash
# Check deployment status
kubectl rollout status deployment/graphql-api-deployment \
  -n graphql-api

# View deployment history
kubectl rollout history deployment/graphql-api-deployment \
  -n graphql-api

# Describe deployment
kubectl describe deployment graphql-api-deployment \
  -n graphql-api
```

## Rollback Procedures

### Automatic Rollback

The CI/CD pipeline automatically rolls back if:
- Deployment fails
- Health checks fail
- Smoke tests fail

### Manual Rollback

#### Using kubectl

```bash
# Rollback to previous version
kubectl rollout undo deployment/graphql-api-deployment \
  -n graphql-api

# Rollback to specific revision
kubectl rollout undo deployment/graphql-api-deployment \
  --to-revision=5 \
  -n graphql-api

# Verify rollback
kubectl rollout status deployment/graphql-api-deployment \
  -n graphql-api
```

#### Using GitHub Actions

1. Go to Actions → CD - Production Deployment
2. Run workflow with previous version tag
3. Monitor rollback progress

#### Emergency Rollback

```bash
# Quick rollback script
./scripts/deploy-production.sh --rollback
```

### Post-Rollback Verification

```bash
# Check pod status
kubectl get pods -n graphql-api

# Verify application version
kubectl get deployment graphql-api-deployment \
  -n graphql-api \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Run health check
curl https://api.example.com/health
```

## Troubleshooting

### Common Issues

#### 1. Image Pull Errors

```bash
# Check image pull secret
kubectl get secret -n graphql-api

# Verify image exists
docker manifest inspect ghcr.io/org/graphql-api:tag

# Check pod events
kubectl describe pod <pod-name> -n graphql-api
```

#### 2. CrashLoopBackOff

```bash
# View pod logs
kubectl logs <pod-name> -n graphql-api

# Check environment variables
kubectl exec <pod-name> -n graphql-api -- env

# Verify secrets
kubectl get secret graphql-api-secrets \
  -n graphql-api -o yaml
```

#### 3. Database Connection Issues

```bash
# Test database connectivity
kubectl run -i --tty --rm debug \
  --image=postgres:15 \
  --restart=Never \
  -- psql $DATABASE_URL

# Check network policies
kubectl get networkpolicy -n graphql-api
```

#### 4. Performance Issues

```bash
# Check resource usage
kubectl top pods -n graphql-api

# View HPA status
kubectl get hpa -n graphql-api

# Check for throttling
kubectl describe pod <pod-name> -n graphql-api | grep -i throttl
```

### Debug Commands

```bash
# Get shell in running container
kubectl exec -it <pod-name> -n graphql-api -- /bin/sh

# Port forward for local testing
kubectl port-forward deployment/graphql-api-deployment \
  4000:4000 -n graphql-api

# View all resources
kubectl get all -n graphql-api

# Check cluster events
kubectl get events -n graphql-api --sort-by='.lastTimestamp'
```

### Emergency Contacts

- **On-call Engineer**: [Your on-call rotation]
- **DevOps Team**: devops@example.com
- **Slack Channel**: #graphql-api-alerts

## Best Practices

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Security scan passed
- [ ] Database migrations tested
- [ ] Changelog updated
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

### During Deployment

- [ ] Monitor deployment progress
- [ ] Watch application logs
- [ ] Check health endpoints
- [ ] Verify metrics/dashboards
- [ ] Run smoke tests
- [ ] Monitor error rates

### Post-Deployment

- [ ] Verify all pods healthy
- [ ] Check application metrics
- [ ] Monitor error rates for 30 minutes
- [ ] Update deployment documentation
- [ ] Notify team of completion
- [ ] Close deployment ticket

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Apollo Server Documentation](https://www.apollographql.com/docs/apollo-server/)

---

**Last Updated**: January 2026  
**Maintained by**: DevOps Team  
**Questions?**: Create an issue or contact the DevOps team
