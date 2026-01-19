# GraphQL API

A production-ready GraphQL API built with TypeScript, featuring Apollo Federation, real-time subscriptions, background job processing, and comprehensive Kubernetes deployment infrastructure.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![GraphQL](https://img.shields.io/badge/GraphQL-16.12-pink.svg)](https://graphql.org/)
[![Apollo](https://img.shields.io/badge/Apollo-5.2-purple.svg)](https://www.apollographql.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.1-darkgreen.svg)](https://www.prisma.io/)
[![Jest](https://img.shields.io/badge/Tests-37%20passing-brightgreen.svg)](https://jestjs.io/)

## 🏗️ Architecture Overview

### Core Technologies
- **GraphQL API**: Apollo Server with Federation v2.3 support
- **Database**: PostgreSQL with Prisma ORM
- **Cache/PubSub**: Redis for caching and real-time subscriptions  
- **Job Processing**: BullMQ for background task management
- **Observability**: OpenTelemetry with Jaeger/Zipkin tracing
- **Authentication**: JWT-based authentication with bcrypt
- **Testing**: Jest with comprehensive unit & integration tests
- **Deployment**: Kubernetes with production-ready manifests

### Enterprise Features
- ✅ **Apollo Federation v2**: Subgraph architecture for microservices
- ✅ **Real-time Subscriptions**: WebSocket-based GraphQL subscriptions
- ✅ **Background Jobs**: BullMQ job processing with dashboard
- ✅ **Distributed Tracing**: OpenTelemetry integration
- ✅ **Auto-scaling**: Kubernetes HPA with 3-20 pod scaling
- ✅ **Security**: RBAC, network policies, and security contexts
- ✅ **Monitoring**: Prometheus metrics and health checks
- ✅ **Backup Strategy**: Automated database backups

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Local Development
```bash
# Clone the repository
git clone <repository-url>
cd graphql-api

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev

# Start federation gateway (optional)
npm run dev:gateway
```

### Using Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 API Overview

### GraphQL Schema
```graphql
type User @key(fields: "id") @key(fields: "email") {
  id: ID!
  name: String!
  email: String!
  role: String!
  createdAt: String!
}

type Query {
  users: [User!]!
  me: User
}

type Mutation {
  signUp(name: String!, email: String!, password: String!): AuthPayload!
  signIn(email: String!, password: String!): AuthPayload!
  updateUserProfile(name: String, email: String): User!
  deleteUser(id: ID!): Boolean!
}

type Subscription {
  userCreated: UserCreatedPayload!
  userUpdated(userId: ID): UserUpdatedPayload!
  userDeleted: UserDeletedPayload!
  userOnline(userId: ID): UserOnlinePayload!
}
```

### Key Endpoints
- **GraphQL API**: `http://localhost:4000/graphql`
- **GraphQL Playground**: `http://localhost:4000` (development only)
- **Subscriptions**: `ws://localhost:4000/graphql/subscriptions`
- **Federation SDL**: `http://localhost:4000/_service/sdl`
- **Health Check**: `http://localhost:4000/.well-known/apollo/server-health`
- **Metrics**: `http://localhost:9464/metrics`
- **Job Dashboard**: `http://localhost:4000/bull-board`

## 🔧 Project Structure

```
graphql-api/
├── src/
│   ├── application/          # Business logic layer
│   │   ├── authService.ts    # Authentication logic
│   │   └── userService.ts    # User business logic
│   ├── domain/               # Domain models
│   │   └── user.ts          # User domain model
│   ├── graphql/             # GraphQL layer
│   │   ├── resolvers/       # GraphQL resolvers
│   │   ├── dataloaders.ts   # DataLoader for N+1 prevention
│   │   ├── schema.graphql   # GraphQL schema definition
│   │   └── websocket.ts     # WebSocket subscription setup
│   ├── infrastructure/      # External integrations
│   │   ├── jobQueue.ts      # BullMQ job queue setup
│   │   ├── jobWorkers.ts    # Background job workers
│   │   ├── jobDashboard.ts  # BullBoard dashboard
│   │   ├── logger.ts        # Pino logger configuration
│   │   ├── prismaClient.ts  # Prisma client setup
│   │   ├── pubsub.ts        # Redis PubSub for subscriptions
│   │   ├── telemetry.ts     # OpenTelemetry configuration
│   │   └── userRepository.ts # User data access
│   ├── utils/               # Utility functions
│   │   ├── errorHandler.ts  # Custom error handling
│   │   └── validation.ts    # Zod validation schemas
│   ├── context.ts           # GraphQL context
│   ├── dev-server.ts        # Development server
│   └── server.ts            # Production server
├── tests/
│   ├── helpers/             # Test utilities
│   ├── integration/         # Integration tests
│   └── unit/                # Unit tests
├── k8s/                     # Kubernetes manifests
├── gateway/                 # Apollo Federation gateway
├── prisma/                  # Database schema
└── docs/                    # Documentation
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Test specific features
npm run test:subscriptions
```

### Test Coverage
- **37 Tests Total**: 100% passing
- **Unit Tests**: Application logic, utilities, error handling
- **Integration Tests**: GraphQL resolvers and database operations
- **Subscription Tests**: Real-time WebSocket functionality
- **Job Processing**: Background queue and worker validation

## 🔐 Security Features

### Authentication & Authorization
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Role-based Access**: ADMIN/USER role permissions
- **Input Validation**: Zod schemas for all inputs

### Infrastructure Security  
- **Security Headers**: Helmet middleware for HTTP security
- **CORS Configuration**: Configurable cross-origin policies
- **Rate Limiting**: Request throttling and DDoS protection
- **Network Isolation**: Kubernetes network policies

### Production Security
- **Container Security**: Non-root execution, read-only filesystem
- **Secret Management**: Kubernetes secrets for sensitive data  
- **TLS Encryption**: SSL/TLS termination at ingress
- **Security Contexts**: Pod security policies and restrictions

## 📈 Monitoring & Observability

### OpenTelemetry Integration
```typescript
// Distributed tracing across all services
const tracer = trace.getTracer('graphql-api');
const span = tracer.startSpan('user.create');

// Custom metrics collection
const userRegistrations = new prometheus.Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
});
```

### Metrics Collection
- **Application Metrics**: Request rate, latency, error rate
- **Business Metrics**: User registrations, API usage patterns  
- **Infrastructure Metrics**: CPU, memory, database connections
- **Job Queue Metrics**: Job success/failure rates, queue depth

### Logging Strategy
- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: Configurable verbosity (error, warn, info, debug)
- **Request Tracing**: End-to-end request tracking
- **Error Aggregation**: Centralized error collection and alerting

## ⚡ Real-time Features

### GraphQL Subscriptions
```typescript
// Subscribe to user events
subscription UserEvents($userId: ID!) {
  userUpdated(userId: $userId) {
    user {
      id
      name
      email
    }
    timestamp
  }
}
```

### WebSocket Integration
- **Connection Management**: Automatic reconnection and heartbeat
- **Authentication**: JWT token validation for subscriptions
- **Scalability**: Redis PubSub for horizontal scaling
- **Type Safety**: Full TypeScript support for real-time events

### Event Publishing
```typescript
// Publish events from resolvers
await pubsub.publish('USER_CREATED', {
  userCreated: {
    user: newUser,
    timestamp: new Date().toISOString(),
  },
});
```

## 🔄 Background Processing

### BullMQ Job System
```typescript
// Define job types
export enum JOB_TYPES {
  SEND_EMAIL = 'send-email',
  PROCESS_USER_DATA = 'process-user-data',
  SEND_NOTIFICATION = 'send-notification',
  EXPORT_DATA = 'export-data',
}

// Add jobs to queue
await jobService.addJob(JOB_TYPES.SEND_EMAIL, {
  to: user.email,
  template: 'welcome',
  data: { name: user.name },
});
```

### Job Processing Features
- **Multiple Queues**: Separate queues for different job types
- **Concurrency Control**: Configurable worker concurrency
- **Retry Logic**: Exponential backoff with maximum retries
- **Job Priorities**: High/normal/low priority processing
- **Dashboard**: BullBoard web UI for queue monitoring

## 🏭 Production Deployment

### Kubernetes Architecture
```yaml
# Auto-scaling configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Deployment Components
- **Application Pods**: 3-20 replicas with auto-scaling
- **Worker Pods**: 1-10 replicas for background jobs
- **PostgreSQL**: Primary database with persistent storage
- **Redis**: Cache and PubSub with high availability
- **Ingress**: NGINX with SSL termination and CORS

### Production Features
- **Zero-downtime Deployments**: Rolling updates with health checks
- **Database Backups**: Daily automated backups with 7-day retention
- **Resource Limits**: CPU/memory constraints and quotas
- **Network Policies**: Pod-to-pod communication restrictions
- **Monitoring**: Prometheus metrics and alerting

### Quick Deploy
```bash
# Deploy to Kubernetes
npm run k8s:deploy

# Build production Docker image  
npm run docker:build

# Check deployment status
kubectl get all -n graphql-api
```

## 🛠️ Development Commands

### Building & Linting
```bash
# Build the application
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check
```

### Database Operations
```bash
# Generate Prisma client
npm run prisma:generate

# Database migrations
npm run prisma:migrate

# Database studio
npm run prisma:studio

# Push schema changes
npm run prisma:push
```

### Security & Quality
```bash
# Security audit
npm run security:audit
npm run security:fix

# Pre-commit checks
npm run precommit

# Clean build artifacts
npm run clean
```

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/graphql_api"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret"
JWT_EXPIRES_IN="7d"

# Application
NODE_ENV="development"
PORT="4000"
METRICS_PORT="9464"
LOG_LEVEL="info"

# GraphQL
GRAPHQL_INTROSPECTION="true"
GRAPHQL_PLAYGROUND="true"

# OpenTelemetry
OTEL_SERVICE_NAME="graphql-api"
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
```

### Federation Configuration
```typescript
// Gateway configuration
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      {
        name: 'users',
        url: 'http://localhost:4000',
      },
    ],
  }),
});
```

### Apollo GraphOS Integration
This API is integrated with **Apollo GraphOS** for schema management and validation:

- **Graph ID**: `GraphQL-API-fwa9oj`
- **Subgraph Name**: `users`
- **Variants**: `main` (production), `staging` (staging)

#### Automated Schema Operations
- **Pull Request Checks**: Schema validation runs automatically on every PR
- **Deployment Publishing**: Schema published to GraphOS on successful deployments
- **Breaking Change Detection**: CI fails if breaking changes are detected
- **Schema History**: All schema changes tracked in Apollo Studio

#### Quick Commands
```bash
# Check schema for breaking changes (local)
rover subgraph check GraphQL-API-fwa9oj@main \
  --name users \
  --schema ./src/graphql/schema.graphql

# Publish schema manually
rover subgraph publish GraphQL-API-fwa9oj@main \
  --name users \
  --schema ./src/graphql/schema.graphql \
  --routing-url "https://api.yourdomain.com/graphql"

# View current schema
rover subgraph fetch GraphQL-API-fwa9oj@main --name users
```

#### Setup Instructions
See [Apollo GraphOS Setup Guide](docs/APOLLO_GRAPHOS_SETUP.md) for:
- Required GitHub secrets configuration
- Schema validation workflow
- Deployment publishing workflow
- Best practices for schema evolution

## 📚 API Documentation

### Authentication
```bash
# Sign up
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { signUp(name: \"John Doe\", email: \"john@example.com\", password: \"password123\") { token user { id name email } } }"
  }'

# Sign in
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { signIn(email: \"john@example.com\", password: \"password123\") { token user { id name email } } }"
  }'
```

### Authenticated Requests
```bash
# Get current user
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "query { me { id name email role } }"
  }'
```

### Subscription Example
```javascript
import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'ws://localhost:4000/graphql/subscriptions',
  connectionParams: {
    authToken: 'YOUR_JWT_TOKEN',
  },
});

client.subscribe(
  {
    query: 'subscription { userCreated { user { id name email } timestamp } }',
  },
  {
    next: (data) => console.log('User created:', data),
    error: (err) => console.error('Subscription error:', err),
    complete: () => console.log('Subscription completed'),
  }
);
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with proper tests
4. Run the full test suite: `npm test`
5. Ensure code quality: `npm run precommit`
6. Commit with conventional commits
7. Push to your branch and create a Pull Request

### Code Standards
- **TypeScript**: Strict mode enabled with comprehensive types
- **ESLint**: Airbnb configuration with TypeScript rules
- **Prettier**: Consistent code formatting
- **Jest**: 100% test coverage for critical paths
- **Conventional Commits**: Structured commit messages

### Pull Request Process
- Ensure all tests pass and coverage is maintained
- Update documentation for any API changes  
- Add integration tests for new features
- Follow the existing architectural patterns
- Include performance considerations for new features

## 📋 Roadmap

### Planned Features
- [ ] **GraphQL Codegen**: Automatic TypeScript type generation
- [ ] **Multi-tenant Support**: Organization-based data isolation
- [ ] **Advanced Caching**: Redis-based query result caching
- [ ] **File Upload**: S3-compatible file storage integration
- [ ] **Advanced Analytics**: Query performance analytics
- [ ] **Webhook System**: Outbound webhook notifications
- [ ] **API Versioning**: Schema versioning and deprecation

### Infrastructure Improvements
- [ ] **Service Mesh**: Istio integration for advanced networking
- [ ] **GitOps**: ArgoCD for declarative deployments
- [ ] **Chaos Engineering**: Resilience testing with Chaos Monkey
- [ ] **Cost Optimization**: Resource usage optimization
- [ ] **Multi-region**: Geographic distribution for HA

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

For questions, issues, or contributions:

- **Issues**: [GitHub Issues](https://github.com/bshongwe/graphql-api/issues)
- **Discussions**: [GitHub Discussions](https://github.com/bshongwe/graphql-api/discussions)
- **Documentation**: [Full Documentation](docs/)

---

**Built with ❤️ using TypeScript, GraphQL, and modern cloud-native technologies.**