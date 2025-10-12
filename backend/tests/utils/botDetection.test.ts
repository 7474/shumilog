import { describe, it, expect } from 'vitest';
import { isOgpBot } from '../../src/utils/botDetection.js';

describe('botDetection', () => {
  describe('isOgpBot', () => {
    it('should detect Twitter bot', () => {
      expect(isOgpBot('Twitterbot/1.0')).toBe(true);
      expect(isOgpBot('Mozilla/5.0 (compatible; Twitterbot/1.0)')).toBe(true);
    });

    it('should detect Facebook bot', () => {
      expect(isOgpBot('facebookexternalhit/1.1')).toBe(true);
      expect(isOgpBot('Mozilla/5.0 (compatible; facebookexternalhit/1.1)')).toBe(true);
    });

    it('should detect LinkedIn bot', () => {
      expect(isOgpBot('LinkedInBot/1.0')).toBe(true);
    });

    it('should detect Slack bot', () => {
      expect(isOgpBot('Slackbot-LinkExpanding 1.0')).toBe(true);
    });

    it('should detect Discord bot', () => {
      expect(isOgpBot('Mozilla/5.0 (compatible; Discordbot/2.0)')).toBe(true);
    });

    it('should not detect regular browsers', () => {
      expect(isOgpBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')).toBe(false);
      expect(isOgpBot('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)')).toBe(false);
      expect(isOgpBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false);
    });

    it('should return false for undefined user agent', () => {
      expect(isOgpBot(undefined)).toBe(false);
    });

    it('should return false for empty user agent', () => {
      expect(isOgpBot('')).toBe(false);
    });
  });
});
