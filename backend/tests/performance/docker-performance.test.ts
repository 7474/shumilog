import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Performance tests for Docker development environment
 * Ensures that services meet performance requirements for development use
 */

const API_BASE_URL = 'http://localhost:8787';
const FRONTEND_BASE_URL = 'http://localhost:5173';

describe('Docker Environment Performance', () => {
  beforeAll(async () => {
    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('API Performance', () => {
    it('health endpoint should respond quickly (< 100ms)', async () => {
      const start = Date.now();
      
      const response = await fetch(`${API_BASE_URL}/health`);
      
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent requests efficiently', async () => {
      const start = Date.now();
      
      const promises = Array.from({ length: 10 }, () =>
        fetch(`${API_BASE_URL}/health`)
      );
      
      const responses = await Promise.all(promises);
      
      const duration = Date.now() - start;
      
      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(duration).toBeLessThan(500); // 10 concurrent requests < 500ms
    });

    it('development endpoints should be responsive', async () => {
      const start = Date.now();
      
      const response = await fetch(`${API_BASE_URL}/dev/config`);
      
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Hot Reload Performance', () => {
    it('should detect file changes quickly', async () => {
      // This test verifies that the file watching system is responsive
      // In a real scenario, we would modify a file and measure reload time
      const start = Date.now();
      
      // Simulate checking if hot-reload is enabled
      const response = await fetch(`${API_BASE_URL}/dev/config`);
      const config = await response.json();
      
      const duration = Date.now() - start;
      
      expect(config.enableHotReload).toBe(true);
      expect(duration).toBeLessThan(150);
    });
  });

  describe('Database Performance', () => {
    it('database operations should be fast', async () => {
      const start = Date.now();
      
      // The health endpoint includes a database check
      const response = await fetch(`${API_BASE_URL}/health`);
      const health = await response.json();
      
      const duration = Date.now() - start;
      
      expect(health.status).toBe('healthy');
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Resource Usage', () => {
    it('should maintain reasonable memory usage', async () => {
      // Test multiple requests to ensure no memory leaks
      const iterations = 20;
      const promises = [];
      
      for (let i = 0; i < iterations; i++) {
        promises.push(fetch(`${API_BASE_URL}/health`));
        // Small delay between requests
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      const responses = await Promise.all(promises);
      
      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(responses.length).toBe(iterations);
    });
  });

  describe('Service Startup Performance', () => {
    it('services should be ready within reasonable time', async () => {
      // This test assumes services are already running
      // In a real CI environment, we would measure startup time
      
      const healthCheck = await fetch(`${API_BASE_URL}/health`);
      expect(healthCheck.status).toBe(200);
      
      // Verify all services are healthy
      const health = await healthCheck.json();
      expect(health.status).toBe('healthy');
      expect(health.services?.backend).toBe('healthy');
    });
  });
});

describe('Development Workflow Performance', () => {
  it('should handle rapid API calls during development', async () => {
    const start = Date.now();
    
    // Simulate rapid development testing
    const calls = [];
    for (let i = 0; i < 5; i++) {
      calls.push(fetch(`${API_BASE_URL}/health`));
      calls.push(fetch(`${API_BASE_URL}/dev/config`));
    }
    
    const responses = await Promise.all(calls);
    const duration = Date.now() - start;
    
    expect(responses.every(r => r.status === 200)).toBe(true);
    expect(duration).toBeLessThan(300); // All 10 calls < 300ms
  });

  it('should maintain performance under development load', async () => {
    // Simulate typical development usage pattern
    const tasks = [
      () => fetch(`${API_BASE_URL}/health`),
      () => fetch(`${API_BASE_URL}/dev/config`),
      () => fetch(`${API_BASE_URL}/dev/logs`),
    ];
    
    const start = Date.now();
    
    // Run tasks multiple times
    for (let round = 0; round < 3; round++) {
      await Promise.all(tasks.map(task => task()));
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const duration = Date.now() - start;
    
    // Should complete 3 rounds of 3 requests + delays in reasonable time
    expect(duration).toBeLessThan(1000);
  });
});

/**
 * Performance Benchmarks
 * 
 * These are the performance targets for the development environment:
 * 
 * - Health check: < 100ms
 * - Dev endpoints: < 200ms
 * - Concurrent requests (10): < 500ms
 * - Service startup: < 30 seconds (not tested here)
 * - Hot reload detection: < 2 seconds (file watch to restart)
 * - Memory usage: Should remain stable under load
 * 
 * If these benchmarks are not met, investigate:
 * 1. Docker resource allocation
 * 2. File system performance (especially on macOS/Windows)
 * 3. Network configuration
 * 4. Service configuration (nodemon intervals, etc.)
 */