# Kubernetes Deployment for GraphQL API

This directory contains comprehensive Kubernetes manifests for deploying the GraphQL API application in a production environment.

## Architecture Overview

The deployment consists of:
- **Application Layer**: GraphQL API server with horizontal pod autoscaling
- **Worker Layer**: Background job processors for BullMQ tasks  
- **Data Layer**: PostgreSQL database and Redis cache
- **Network Layer**: Ingress with SSL termination and CORS support
- **Security Layer**: Network policies, RBAC, and security contexts
- **Monitoring Layer**: Prometheus metrics and health checks
- **Backup Layer**: Automated database backups via CronJob

## Manifest Files

### 01-namespace-config.yaml
- **Namespace**: `graphql-api` namespace isolation
- **ConfigMap**: Environment variables for application configuration
- **Secret**: Base64-encoded sensitive data (DATABASE_URL, JWT_SECRET, etc.)

### 02-dependencies.yaml  
- **Redis Deployment**: Cache and PubSub for subscriptions
- **PostgreSQL Deployment**: Primary database with persistent storage
- **Services**: ClusterIP services for internal communication
- **PVC**: Persistent volume for PostgreSQL data

### 03-app-deployment.yaml
- **GraphQL API Deployment**: Main application with 3 replicas
- **Service**: ClusterIP service for internal routing
- **ServiceAccount**: Dedicated service account with security settings

### 04-ingress-scaling.yaml
- **Ingress**: NGINX ingress with SSL, CORS, and rate limiting
- **HPA**: Horizontal Pod Autoscaler (3-20 replicas)
- **NetworkPolicy**: Traffic restrictions and egress rules

### 05-policies-jobs.yaml
- **PodDisruptionBudget**: Ensures minimum 2 pods during updates
- **LimitRange**: Resource limits and requests for containers
- **ResourceQuota**: Namespace-level resource constraints
- **CronJob**: Daily database backup at 2 AM
- **Metrics Service**: Prometheus metrics endpoint

### 06-workers-services.yaml
- **Job Worker Deployment**: BullMQ job processors (1-10 replicas)
- **Worker HPA**: Auto-scaling for background job processing
- **Headless Service**: Service discovery for clustering

## Security Features

### Pod Security
- **Non-root execution**: All containers run as non-root user (UID 1000)
- **Read-only filesystem**: Containers cannot modify filesystem
- **Dropped capabilities**: All Linux capabilities removed
- **Security contexts**: Process isolation and privilege restrictions

### Network Security
- **Network policies**: Restrict pod-to-pod communication
- **Service accounts**: Dedicated identities with minimal permissions
- **TLS encryption**: SSL/TLS termination at ingress level
- **CORS policies**: Cross-origin resource sharing controls

### Data Security
- **Secret management**: Encrypted storage of sensitive data
- **Database encryption**: TLS connections to PostgreSQL
- **Backup encryption**: Compressed and secured backup storage

## Resource Management

### Compute Resources
```yaml
# Application Pods
requests: { memory: "512Mi", cpu: "250m" }
limits: { memory: "2Gi", cpu: "1" }

# Worker Pods  
requests: { memory: "256Mi", cpu: "100m" }
limits: { memory: "1Gi", cpu: "500m" }

# Database Pods
requests: { memory: "256Mi", cpu: "100m" }
limits: { memory: "1Gi", cpu: "500m" }
```

### Storage Resources
- **PostgreSQL**: 10Gi persistent storage
- **Backup**: 20Gi for backup retention (7 days)
- **Ephemeral**: 1-5Gi temporary storage per pod

### Auto-scaling Policies
- **API Scaling**: 3-20 replicas based on CPU (70%) and memory (80%)
- **Worker Scaling**: 1-10 replicas with aggressive scale-up for job queues
- **Stabilization**: 30s scale-up, 300s scale-down windows

## Deployment Instructions

### Prerequisites
1. **Kubernetes cluster** (v1.20+) with NGINX ingress controller
2. **cert-manager** for SSL certificate management
3. **kubectl** configured for cluster access
4. **Docker image** built and pushed to registry

### Quick Deployment
```bash
# Make script executable
chmod +x k8s/deploy.sh

# Deploy all manifests
./k8s/deploy.sh
```

### Manual Deployment
```bash
# Deploy in order
kubectl apply -f k8s/01-namespace-config.yaml
kubectl apply -f k8s/02-dependencies.yaml
kubectl apply -f k8s/03-app-deployment.yaml
kubectl apply -f k8s/04-ingress-scaling.yaml
kubectl apply -f k8s/05-policies-jobs.yaml
kubectl apply -f k8s/06-workers-services.yaml
```

### Verification
```bash
# Check deployment status
kubectl get all -n graphql-api

# Monitor pod logs
kubectl logs -f deployment/graphql-api-deployment -n graphql-api

# Check HPA status
kubectl get hpa -n graphql-api

# Verify ingress
kubectl get ingress -n graphql-api
```

## Configuration

### Environment Variables
Core application settings in ConfigMap:
- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `REDIS_HOST=redis-service`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `GRAPHQL_INTROSPECTION=false`

### Secrets
Sensitive data in Kubernetes Secrets:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing key
- `REDIS_PASSWORD`: Redis authentication
- `DATABASE_PASSWORD`: Database user password

### Customization
Update these values before deployment:
- **Domain**: Change `api.yourdomain.com` in ingress
- **Image**: Update `graphql-api:1.0.0` to your image
- **Resources**: Adjust CPU/memory based on load testing
- **Replicas**: Tune min/max replicas for your traffic

## Monitoring & Operations

### Health Checks
- **Liveness**: Apollo Server health endpoint
- **Readiness**: Application startup verification
- **Metrics**: Prometheus metrics on port 9464

### Backup Strategy
- **Schedule**: Daily backups at 2:00 AM
- **Retention**: 7 days of backup history
- **Storage**: 20Gi PVC for backup files
- **Recovery**: Manual restore from backup files

### Scaling Behavior
```yaml
# Scale up aggressively for traffic spikes
scaleUp:
  policies:
  - type: Percent, value: 50%, period: 30s
  - type: Pods, value: 2, period: 30s

# Scale down conservatively to avoid thrashing  
scaleDown:
  policies:
  - type: Percent, value: 25%, period: 60s
```

### Troubleshooting

#### Common Issues
1. **Pods not starting**: Check resource constraints and node capacity
2. **Database connection**: Verify PostgreSQL service and credentials
3. **Redis connection**: Check Redis service and network policies
4. **Ingress not working**: Verify DNS, certificates, and ingress controller

#### Debug Commands
```bash
# Pod logs
kubectl logs <pod-name> -n graphql-api

# Pod shell access
kubectl exec -it <pod-name> -n graphql-api -- /bin/sh

# Port forward for debugging
kubectl port-forward svc/graphql-api-service -n graphql-api 4000:80

# Resource usage
kubectl top pods -n graphql-api
```

## Security Considerations

### Production Checklist
- [ ] Update default passwords in secrets
- [ ] Configure proper TLS certificates
- [ ] Review network policies for your environment
- [ ] Set up monitoring and alerting
- [ ] Configure backup retention policies
- [ ] Review resource limits and quotas
- [ ] Enable admission controllers (PodSecurityPolicy/Pod Security Standards)
- [ ] Set up RBAC for administrative access

### Compliance Features
- **PCI DSS**: Encrypted data transmission and storage
- **SOC 2**: Access controls and audit logging
- **GDPR**: Data encryption and backup controls
- **HIPAA**: Network isolation and data protection

This deployment provides enterprise-grade reliability, security, and scalability for the GraphQL API application.
