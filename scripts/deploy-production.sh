#!/bin/bash

# Production Deployment Script
# This script handles production deployments with safety checks

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-graphql-api}"
ENVIRONMENT="${ENVIRONMENT:-production}"
IMAGE_REGISTRY="${IMAGE_REGISTRY:-ghcr.io}"
IMAGE_NAME="${IMAGE_NAME:-graphql-api}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
        exit 1
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster."
        exit 1
    fi
    
    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace $NAMESPACE does not exist."
        exit 1
    fi
    
    log_info "Prerequisites check passed ✓"
}

backup_current_deployment() {
    log_info "Creating backup of current deployment..."
    
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    kubectl get all -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/all.yaml"
    kubectl get configmap -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/configmaps.yaml"
    kubectl get secret -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/secrets.yaml"
    
    log_info "Backup created at $BACKUP_DIR ✓"
}

run_preflight_checks() {
    log_info "Running preflight checks..."
    
    # Check if image exists
    IMAGE_FULL="${IMAGE_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
    log_info "Checking image: $IMAGE_FULL"
    
    # Verify deployment exists
    if ! kubectl get deployment graphql-api-deployment \
      -n "$NAMESPACE" &> /dev/null; then
        log_error "Deployment not found in namespace $NAMESPACE"
        exit 1
    fi
    
    # Check resource quotas
    log_info "Checking resource quotas..."
    kubectl describe resourcequota -n "$NAMESPACE" || true
    
    log_info "Preflight checks passed ✓"
}

deploy_application() {
    log_info "Deploying application..."
    
    IMAGE_FULL="${IMAGE_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
    
    # Update deployment image
    kubectl set image deployment/graphql-api-deployment \
        graphql-api="$IMAGE_FULL" \
        -n "$NAMESPACE"
    
    # Annotate with deployment info
    kubectl annotate deployment/graphql-api-deployment \
        kubernetes.io/change-cause="Deploy ${IMAGE_TAG} at $(date)" \
        deployment.kubernetes.io/revision="$(date +%s)" \
        -n "$NAMESPACE" \
        --overwrite
    
    log_info "Image updated to $IMAGE_FULL ✓"
}

wait_for_rollout() {
    log_info "Waiting for rollout to complete..."
    
    if kubectl rollout status deployment/graphql-api-deployment \
        -n "$NAMESPACE" \
        --timeout=10m; then
        log_info "Rollout completed successfully ✓"
    else
        log_error "Rollout failed!"
        return 1
    fi
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check pod status
    log_info "Pod status:"
    kubectl get pods -n "$NAMESPACE" -l app=graphql-api
    
    # Wait for pods to be ready
    if kubectl wait --for=condition=ready pod \
        -l app=graphql-api \
        -n "$NAMESPACE" \
        --timeout=5m; then
        log_info "All pods are ready ✓"
    else
        log_error "Pods failed to become ready"
        return 1
    fi
    
    # Run health check
    log_info "Running health check..."
    if kubectl run health-check \
        --image=curlimages/curl:latest \
        --rm -i --restart=Never \
        -n "$NAMESPACE" \
        -- curl -f http://graphql-api-service:4001/health; then
        log_info "Health check passed ✓"
    else
        log_error "Health check failed!"
        return 1
    fi
}

run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # GraphQL introspection test
    if kubectl run graphql-test \
        --image=curlimages/curl:latest \
        --rm -i --restart=Never \
        -n "$NAMESPACE" \
        -- curl -f -X POST http://graphql-api-service:4000/graphql \
        -H "Content-Type: application/json" \
        -d '{"query": "{ __schema { queryType { name } } }"}'; then
        log_info "GraphQL smoke test passed ✓"
    else
        log_error "GraphQL smoke test failed!"
        return 1
    fi
}

rollback_deployment() {
    log_error "Deployment verification failed. Rolling back..."
    
    kubectl rollout undo deployment/graphql-api-deployment \
        -n "$NAMESPACE"
    
    kubectl rollout status deployment/graphql-api-deployment \
        -n "$NAMESPACE" \
        --timeout=5m
    
    log_warn "Rollback completed"
}

show_deployment_info() {
    log_info "Deployment information:"
    echo ""
    echo "Namespace: $NAMESPACE"
    echo "Environment: $ENVIRONMENT"
    echo "Image: ${IMAGE_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
    echo ""
    
    # Show deployment status
    kubectl get deployment graphql-api-deployment -n "$NAMESPACE"
    echo ""
    
    # Show recent events
    log_info "Recent events:"
    kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' | tail -10
}

main() {
    log_info "Starting deployment to $ENVIRONMENT environment"
    echo ""
    
    check_prerequisites
    echo ""
    
    # Confirmation prompt for production
    if [ "$ENVIRONMENT" = "production" ]; then
        log_warn "You are about to deploy to PRODUCTION!"
        read -p "Are you sure you want to continue? (yes/no): " -r
        echo
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Deployment cancelled."
            exit 0
        fi
    fi
    
    backup_current_deployment
    echo ""
    
    run_preflight_checks
    echo ""
    
    deploy_application
    echo ""
    
    if ! wait_for_rollout; then
        rollback_deployment
        exit 1
    fi
    echo ""
    
    if ! verify_deployment; then
        rollback_deployment
        exit 1
    fi
    echo ""
    
    if ! run_smoke_tests; then
        rollback_deployment
        exit 1
    fi
    echo ""
    
    show_deployment_info
    echo ""
    
    log_info "🎉 Deployment completed successfully!"
}

# Run main function
main "$@"
