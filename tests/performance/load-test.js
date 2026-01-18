import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'], // Error rate below 1%
    errors: ['rate<0.1'], // Custom error rate below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

// GraphQL queries
const HEALTH_QUERY = JSON.stringify({
  query: '{ __typename }',
});

const USER_QUERY = JSON.stringify({
  query: `
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        email
        name
        createdAt
      }
    }
  `,
  variables: {
    id: '1',
  },
});

const USERS_QUERY = JSON.stringify({
  query: `
    query GetUsers($limit: Int) {
      users(limit: $limit) {
        id
        email
        name
      }
    }
  `,
  variables: {
    limit: 10,
  },
});

const CREATE_USER_MUTATION = JSON.stringify({
  query: `
    mutation CreateUser($input: CreateUserInput!) {
      createUser(input: $input) {
        id
        email
        name
      }
    }
  `,
  variables: {
    input: {
      email: `test${Date.now()}@example.com`,
      name: 'Load Test User',
      password: 'TestPassword123!',
    },
  },
});

const params = {
  headers: {
    'Content-Type': 'application/json',
  },
};

export default function () {
  // Health check (10% of requests)
  if (Math.random() < 0.1) {
    const healthRes = http.post(
      `${BASE_URL}/graphql`,
      HEALTH_QUERY,
      params
    );
    check(healthRes, {
      'health check status is 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  }

  // Get single user (40% of requests)
  if (Math.random() < 0.4) {
    const userRes = http.post(`${BASE_URL}/graphql`, USER_QUERY, params);
    check(userRes, {
      'user query status is 200': (r) => r.status === 200,
      'user query has data': (r) => {
        const body = JSON.parse(r.body);
        return body.data && body.data.user;
      },
    }) || errorRate.add(1);
  }

  // Get multiple users (40% of requests)
  if (Math.random() < 0.4) {
    const usersRes = http.post(`${BASE_URL}/graphql`, USERS_QUERY, params);
    check(usersRes, {
      'users query status is 200': (r) => r.status === 200,
      'users query has data': (r) => {
        const body = JSON.parse(r.body);
        return body.data && Array.isArray(body.data.users);
      },
    }) || errorRate.add(1);
  }

  // Create user mutation (10% of requests)
  if (Math.random() < 0.1) {
    const createRes = http.post(
      `${BASE_URL}/graphql`,
      CREATE_USER_MUTATION,
      params
    );
    check(createRes, {
      'create user status is 200': (r) => r.status === 200,
      'create user has data': (r) => {
        const body = JSON.parse(r.body);
        return body.data && body.data.createUser;
      },
    }) || errorRate.add(1);
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    'results/summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const colors = options.enableColors || false;

  return `
${indent}Test Results:
${indent}  Duration: ${data.state.testRunDurationMs / 1000}s
${indent}  Iterations: ${data.metrics.iterations.values.count}
${indent}  VUs: ${data.metrics.vus.values.value}
${indent}  
${indent}HTTP Metrics:
${indent}  Requests: ${data.metrics.http_reqs.values.count}
${indent}  Failed: ${data.metrics.http_req_failed.values.rate * 100}%
${indent}  Duration (p95): ${data.metrics.http_req_duration.values['p(95)']}ms
${indent}  Duration (p99): ${data.metrics.http_req_duration.values['p(99)']}ms
${indent}
${indent}Custom Metrics:
${indent}  Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%
  `;
}
