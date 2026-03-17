#!/usr/bin/env npx tsx
/**
 * Load test for StarAIGateway gateway /v1/chat/completions endpoint.
 *
 * Prerequisites:
 *   1. Start the app server: npm run build && npm run preview (or docker compose up)
 *   2. Ensure a valid API key exists in the database
 *   3. Set env vars: LOAD_TEST_URL (default: http://localhost:3000)
 *                     LOAD_TEST_API_KEY (required: sk-th-... key)
 *
 * Usage: npx tsx scripts/load-test.ts
 *
 * NOTE: For accurate gateway-only benchmarking, mock the upstream LLM provider
 * to return instant responses (e.g., via a simple Express server or by configuring
 * LITELLM_API_URL to point at a mock).
 */

import autocannon from 'autocannon';

const BASE_URL = process.env.LOAD_TEST_URL ?? 'http://localhost:3000';
const API_KEY = process.env.LOAD_TEST_API_KEY;

if (!API_KEY) {
	console.error('ERROR: LOAD_TEST_API_KEY env var is required (e.g., sk-th-...)');
	process.exit(1);
}

const CONNECTIONS = 100;
const AMOUNT = 1000; // total requests
const P95_THRESHOLD_MS = 200;
const MAX_ERROR_RATE = 0; // 0% errors allowed

const requestBody = JSON.stringify({
	model: 'gpt-4o',
	messages: [{ role: 'user', content: 'Hello, this is a load test request.' }]
});

async function run(): Promise<void> {
	console.log('--- StarAIGateway Gateway Load Test ---');
	console.log(`Target: ${BASE_URL}/v1/chat/completions`);
	console.log(`Connections: ${CONNECTIONS}`);
	console.log(`Total requests: ${AMOUNT}`);
	console.log(`p95 threshold: ${P95_THRESHOLD_MS}ms`);
	console.log('');

	const result = await autocannon({
		url: `${BASE_URL}/v1/chat/completions`,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${API_KEY}`
		},
		body: requestBody,
		connections: CONNECTIONS,
		amount: AMOUNT,
		timeout: 30 // seconds per request
	});

	// Extract metrics
	const p95 = result.latency.p95;
	const totalRequests = result.requests.total;
	const errors = result.errors;
	const non2xx = result.non2xx;
	const errorCount = errors + non2xx;
	const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
	const throughput = result.requests.average;

	console.log('--- Results ---');
	console.log(`Total requests:  ${totalRequests}`);
	console.log(`Throughput:      ${throughput.toFixed(1)} req/sec`);
	console.log(`Latency p50:     ${result.latency.p50}ms`);
	console.log(`Latency p95:     ${p95}ms`);
	console.log(`Latency p99:     ${result.latency.p99}ms`);
	console.log(`Errors:          ${errors}`);
	console.log(`Non-2xx:         ${non2xx}`);
	console.log(`Error rate:      ${errorRate.toFixed(2)}%`);
	console.log('');

	// Pass/fail checks
	let passed = true;

	if (p95 > P95_THRESHOLD_MS) {
		console.log(`FAIL: p95 latency ${p95}ms exceeds threshold ${P95_THRESHOLD_MS}ms`);
		passed = false;
	} else {
		console.log(`PASS: p95 latency ${p95}ms within threshold ${P95_THRESHOLD_MS}ms`);
	}

	if (errorRate > MAX_ERROR_RATE) {
		console.log(`FAIL: error rate ${errorRate.toFixed(2)}% exceeds threshold ${MAX_ERROR_RATE}%`);
		passed = false;
	} else {
		console.log(`PASS: error rate ${errorRate.toFixed(2)}% within threshold ${MAX_ERROR_RATE}%`);
	}

	console.log('');
	if (passed) {
		console.log('RESULT: PASSED');
		process.exit(0);
	} else {
		console.log('RESULT: FAILED');
		process.exit(1);
	}
}

run().catch((err) => {
	console.error('Load test error:', err);
	process.exit(1);
});
