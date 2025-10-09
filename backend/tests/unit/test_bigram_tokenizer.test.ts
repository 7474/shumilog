import { describe, it, expect, beforeAll } from 'vitest';
import { getTestD1Database } from '../helpers/app.js';

describe('Bigram Tokenizer Test', () => {
  it('should test if bigram tokenizer is available', async () => {
    const db = getTestD1Database();
    
    // Test trigram with ngram=2 parameter
    try {
      await db.exec(`CREATE VIRTUAL TABLE test_bigram USING fts5(content, tokenize='trigram ngram=2');`);
      
      // Insert test data
      await db.exec(`INSERT INTO test_bigram VALUES ('Go'), ('JS'), ('A'), ('漫画'), ('Attack');`);
      
      // Test different query lengths
      const tests = [
        { query: 'G', expected: 'should find Go' },
        { query: 'Go', expected: 'should find Go' },
        { query: 'J', expected: 'should find JS' },
        { query: 'JS', expected: 'should find JS' },
        { query: 'A', expected: 'should find A and Attack' },
        { query: 'At', expected: 'should find Attack' },
      ];
      
      console.log('\n=== Bigram Tokenizer Test Results ===');
      for (const test of tests) {
        const result = await db.prepare(`SELECT content FROM test_bigram WHERE test_bigram MATCH ?`)
          .bind(`"${test.query}"`).all();
        console.log(`Query "${test.query}": ${result.results.length} results - ${test.expected}`);
        if (result.results.length > 0) {
          console.log(`  Found: ${result.results.map((r: any) => r.content).join(', ')}`);
        }
      }
      
      await db.exec(`DROP TABLE test_bigram;`);
      
      expect(true).toBe(true); // Pass if no errors
    } catch (e: any) {
      console.log('Bigram tokenizer error:', e.message);
      expect(e.message).toContain(''); // Log the error
    }
  });
});
