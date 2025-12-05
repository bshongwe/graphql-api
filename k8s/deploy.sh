#!/bin/bash

# GraphQL API Kubernetes Deployment Script
# This script deploys the GraphQL API to Kubernetes with proper ordering

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is required but not installed. Please install kubectl first."
    exit 1
fi

# Check if we can connect to the cluster
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

print_status "Starting GraphQL API deployment to Kubernetes..."

# Deploy in proper order
MANIFESTS=(
    "01-namespace-config.yaml"
    "02-dependencies.yaml"
    "03-app-deployment.yaml"
    "04-ingress-scaling.yaml"
    "05-policies-jobs.yaml"
    "06-workers-services.yaml"
)

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Apply each manifest
for manifest in "${MANIFESTS[@]}"; do
    manifest_path="$SCRIPT_DIR/$manifest"
    
    if [[ -f "$manifest_path" ]]; then
        print_status "Applying $manifest..."
        if kubectl apply -f "$manifest_path"; then
            print_success "Successfully applied $manifest"
        else
            print_error "Failed to apply $manifest"
            exit 1
        fi
    else
        print_warning "Manifest file $manifest not found, skipping..."
    fi
    
    # Wait a moment between deployments
    sleep 2
done

print_status "Waiting for namespace to be ready..."
kubectl wait --for=condition=Ready namespace/graphql-api --timeout=60s || print_warning "Namespace ready check timed out"

print_status "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/postgres-deployment -n graphql-api || print_warning "PostgreSQL ready check timed out"

print_status "Waiting for Redis to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/redis-deployment -n graphql-api || print_warning "Redis ready check timed out"

print_status "Waiting for GraphQL API to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/graphql-api-deployment -n graphql-api || print_warning "GraphQL API ready check timed out"

print_status "Waiting for Job Workers to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/job-worker-deployment -n graphql-api || print_warning "Job workers ready check timed out"

print_success "Deployment completed!"

print_status "Getting deployment status..."
echo
kubectl get all -n graphql-api

print_status "Getting ingress information..."
echo
kubectl get ingress -n graphql-api

print_status "Getting HPA status..."
echo
kubectl get hpa -n graphql-api

echo
print_success "GraphQL API has been successfully deployed to Kubernetes!"
echo
print_status "Next steps:"
echo "1. Update your DNS to point api.yourdomain.com to your ingress controller"
echo "2. Verify SSL certificates are properly issued by cert-manager"
echo "3. Check application logs: kubectl logs -f deployment/graphql-api-deployment -n graphql-api"
echo "4. Monitor metrics at: kubectl port-forward svc/graphql-api-metrics -n graphql-api 9464:9464"
echo "5. Access BullMQ dashboard at: https://api.yourdomain.com/bull-board"
