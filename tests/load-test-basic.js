import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:5000';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.05'],    // Error rate must be less than 5%
  },
};

export default function () {
  // Test homepage
  let res = http.get(`${BASE_URL}/`);
  check(res, {
    'homepage status 200': (r) => r.status === 200,
    'homepage response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test catalog
  res = http.get(`${BASE_URL}/catalog`);
  check(res, {
    'catalog status 200': (r) => r.status === 200,
    'catalog response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}