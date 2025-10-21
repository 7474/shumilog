import { describe, it, expect, beforeEach } from 'vitest';
import { createDrizzleDB, type DrizzleDB } from '../../src/db/drizzle.js';
import { LogService } from '../../src/services/LogService.js';
import { clearTestData, getTestD1Database, createTestUser } from '../helpers/app.js';

describe('Tag Order in Log List', () => {
  let drizzleDB: DrizzleDB;
  let logService: LogService;
  let testUserId: string;

  beforeEach(async () => {
    await clearTestData();
    drizzleDB = createDrizzleDB(getTestD1Database());
    logService = new LogService(drizzleDB);

    testUserId = 'user_test_list_order';
    await createTestUser(testUserId, 'Test User');
  });

  it('should maintain tag order when fetching logs via searchLogs', async () => {
    // Create a log with tags in specific order (reverse alphabetical)
    await logService.createLog(
      {
        title: 'Tag Order Test',
        content_md: 'Content with #Zebra #Yak #Xray tags',
        is_public: true
      },
      testUserId
    );

    // Fetch via searchLogs (this is what list views use)
    const result = await logService.searchLogs({ limit: 10, offset: 0 });
    
    expect(result.logs).toHaveLength(1);
    const fetchedLog = result.logs[0];
    
    // Tags should maintain the order from content (Zebra, Yak, Xray)
    // NOT alphabetical order (Xray, Yak, Zebra)
    expect(fetchedLog.associated_tags).toHaveLength(3);
    expect(fetchedLog.associated_tags[0].name).toBe('Zebra');
    expect(fetchedLog.associated_tags[1].name).toBe('Yak');
    expect(fetchedLog.associated_tags[2].name).toBe('Xray');
  });

  it('should maintain tag order when fetching public logs', async () => {
    await logService.createLog(
      {
        title: 'Public Log Tag Order',
        content_md: 'Testing #Zulu #Yankee #Whiskey',
        is_public: true
      },
      testUserId
    );

    const result = await logService.getPublicLogs(10, 0);
    
    expect(result.logs).toHaveLength(1);
    const fetchedLog = result.logs[0];
    
    expect(fetchedLog.associated_tags).toHaveLength(3);
    expect(fetchedLog.associated_tags[0].name).toBe('Zulu');
    expect(fetchedLog.associated_tags[1].name).toBe('Yankee');
    expect(fetchedLog.associated_tags[2].name).toBe('Whiskey');
  });
});
