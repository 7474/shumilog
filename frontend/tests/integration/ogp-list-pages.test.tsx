import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { LogsPage } from '../../src/pages/LogsPage';
import { TagsPage } from '../../src/pages/TagsPage';
import { MyLogsPage } from '../../src/pages/MyLogsPage';

import { mockApi, mockUseAuth } from '../mocks/setup';

describe('OGP metadata on list pages', () => {
  beforeEach(() => {
    // Clear any existing meta tags
    document.head.innerHTML = '';
    mockApi.GET.mockClear();
  });

  afterEach(() => {
    mockApi.GET.mockRestore();
  });

  it('should set OGP metadata on LogsPage', async () => {
    mockUseAuth.isAuthenticated = false;
    mockUseAuth.user = null;

    mockApi.GET.mockResolvedValue({
      data: { items: [], has_more: false, limit: 20 },
      error: undefined,
    });

    render(
      <MemoryRouter>
        <LogsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Check document title
      expect(document.title).toBe('Shumilog - Shumilog');

      // Check basic meta tags
      expect(document.querySelector('meta[name="title"]')?.getAttribute('content')).toBe('Shumilog');
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Your Personal Hobby Logger');

      // Check OGP tags
      expect(document.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('website');
      expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Shumilog');
      expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('Your Personal Hobby Logger');
    });
  });

  it('should set OGP metadata on TagsPage', async () => {
    mockUseAuth.isAuthenticated = false;
    mockUseAuth.user = null;

    mockApi.GET.mockResolvedValue({
      data: { items: [], has_more: false, limit: 20 },
      error: undefined,
    });

    render(
      <MemoryRouter>
        <TagsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Check document title
      expect(document.title).toBe('タグ管理 - Shumilog');

      // Check basic meta tags
      expect(document.querySelector('meta[name="title"]')?.getAttribute('content')).toBe('タグ管理');
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('ログを整理するためのタグを管理しましょう');

      // Check OGP tags
      expect(document.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('website');
      expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('タグ管理');
      expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('ログを整理するためのタグを管理しましょう');
    });
  });

  it('should set OGP metadata on MyLogsPage', async () => {
    mockUseAuth.isAuthenticated = true;
    mockUseAuth.user = { id: '1', name: 'Test User' };

    mockApi.GET.mockResolvedValue({
      data: { items: [], has_more: false, limit: 20 },
      error: undefined,
    });

    render(
      <MemoryRouter>
        <MyLogsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Check document title
      expect(document.title).toBe('マイログ - Shumilog');

      // Check basic meta tags
      expect(document.querySelector('meta[name="title"]')?.getAttribute('content')).toBe('マイログ');
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('あなたの趣味ログを管理');

      // Check OGP tags
      expect(document.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('website');
      expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('マイログ');
      expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('あなたの趣味ログを管理');
    });
  });

  it('should update OGP metadata when navigating between pages', async () => {
    mockUseAuth.isAuthenticated = false;
    mockUseAuth.user = null;

    mockApi.GET.mockResolvedValue({
      data: { items: [], has_more: false, limit: 20 },
      error: undefined,
    });

    // Render LogsPage first
    const { rerender } = render(
      <MemoryRouter>
        <LogsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.title).toBe('Shumilog - Shumilog');
      expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Shumilog');
    });

    // Then rerender with TagsPage
    rerender(
      <MemoryRouter>
        <TagsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.title).toBe('タグ管理 - Shumilog');
      expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('タグ管理');
    });
  });
});
