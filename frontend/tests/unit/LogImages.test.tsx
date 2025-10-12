import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LogImages } from '@/components/LogImages';
import type { LogImage } from '@/models';

describe('LogImages', () => {
  const mockImages: LogImage[] = [
    {
      id: 'image_1',
      user_id: 'user_1',
      file_name: 'test-image-1.jpg',
      content_type: 'image/jpeg',
      file_size: 1024,
      r2_key: 'key_1',
      width: 800,
      height: 600,
      created_at: '2025-01-01T00:00:00Z',
      display_order: 0,
    },
    {
      id: 'image_2',
      user_id: 'user_1',
      file_name: 'test-image-2.png',
      content_type: 'image/png',
      file_size: 2048,
      r2_key: 'key_2',
      width: 1024,
      height: 768,
      created_at: '2025-01-01T00:00:00Z',
      display_order: 1,
    },
  ];

  it('画像がない場合は何も表示しない', () => {
    const { container } = render(<LogImages logId="log_1" images={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('画像がある場合は画像を表示する', () => {
    const { container } = render(<LogImages logId="log_1" images={mockImages} />);
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(2);
  });

  it('環境変数からAPI base URLを使用する', () => {
    const { container } = render(<LogImages logId="log_1" images={mockImages} />);
    const images = container.querySelectorAll('img');

    // In test environment, VITE_API_BASE_URL is set to http://localhost:8787/api
    const expectedBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    
    // 画像URLには最適化パラメータが含まれている
    const src1 = images[0].getAttribute('src');
    expect(src1).toContain(`${expectedBaseUrl}/logs/log_1/images/image_1`);
    expect(src1).toContain('width=1920');
    expect(src1).toContain('fit=scale-down');
    
    const src2 = images[1].getAttribute('src');
    expect(src2).toContain(`${expectedBaseUrl}/logs/log_1/images/image_2`);
    expect(src2).toContain('width=1920');

    // リンク先は元のURLのまま
    const links = container.querySelectorAll('a');
    expect(links[0]).toHaveAttribute('href', `${expectedBaseUrl}/logs/log_1/images/image_1`);
    expect(links[1]).toHaveAttribute('href', `${expectedBaseUrl}/logs/log_1/images/image_2`);
  });

  it('VITE_API_BASE_URL 環境変数を使用する', () => {
    // Mock the environment variable
    const originalEnv = import.meta.env.VITE_API_BASE_URL;
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.shumilog.dev/api');

    const { container } = render(<LogImages logId="log_1" images={mockImages} />);
    const images = container.querySelectorAll('img');

    // 画像URLには最適化パラメータが含まれている
    const src1 = images[0].getAttribute('src');
    expect(src1).toContain('https://api.shumilog.dev/api/logs/log_1/images/image_1');
    expect(src1).toContain('width=1920');
    expect(src1).toContain('fit=scale-down');
    
    const src2 = images[1].getAttribute('src');
    expect(src2).toContain('https://api.shumilog.dev/api/logs/log_1/images/image_2');
    expect(src2).toContain('width=1920');

    // リンク先は元のURLのまま
    const links = container.querySelectorAll('a');
    expect(links[0]).toHaveAttribute(
      'href',
      'https://api.shumilog.dev/api/logs/log_1/images/image_1'
    );
    expect(links[1]).toHaveAttribute(
      'href',
      'https://api.shumilog.dev/api/logs/log_1/images/image_2'
    );

    // Restore original environment
    if (originalEnv) {
      vi.stubEnv('VITE_API_BASE_URL', originalEnv);
    } else {
      vi.unstubAllEnvs();
    }
  });

  it('画像にlazy loading属性が設定されている', () => {
    const { container } = render(<LogImages logId="log_1" images={mockImages} />);
    const images = container.querySelectorAll('img');

    images.forEach((img) => {
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });
});
