import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ApiDocsPage } from '@/pages/ApiDocsPage';

describe('ApiDocsPage', () => {
  it('should render API documentation page', () => {
    const { container } = render(
      <BrowserRouter>
        <ApiDocsPage />
      </BrowserRouter>
    );
    
    // Verify the component renders without errors
    expect(container).toBeTruthy();
    
    // Verify the container has content
    expect(container.firstChild).toBeTruthy();
  });

  it('should have full screen layout', () => {
    const { container } = render(
      <BrowserRouter>
        <ApiDocsPage />
      </BrowserRouter>
    );
    
    // Verify the main container has full screen styles
    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv.className).toContain('w-full');
    expect(mainDiv.className).toContain('h-screen');
  });

  it('should render back to site link', () => {
    render(
      <BrowserRouter>
        <ApiDocsPage />
      </BrowserRouter>
    );
    
    // Verify the back link is present
    const backLink = screen.getByText('Shumilogに戻る');
    expect(backLink).toBeTruthy();
  });
});
