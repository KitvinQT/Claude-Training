import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/App';
import { BANNER_TEXT, PROTOTYPE_STATEMENTS } from '@/content/disclaimers';

describe('App shell', () => {
  it('renders a single level-one heading', () => {
    render(<App />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Assess a project before you build it');
  });

  it('names the prototype in the header', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toHaveTextContent('The Feasibility Architect');
  });

  it('shows the prototype banner on screen', () => {
    render(<App />);
    const banner = screen.getByRole('note', { name: /prototype notice/i });
    expect(banner).toHaveTextContent(BANNER_TEXT);
  });

  it('states every required prototype disclaimer', () => {
    render(<App />);
    for (const statement of PROTOTYPE_STATEMENTS) {
      expect(screen.getByText(statement)).toBeInTheDocument();
    }
  });

  it('states that nothing is saved between page loads', () => {
    render(<App />);
    expect(screen.getByText(/refreshing or closing the page clears/i)).toBeInTheDocument();
  });

  it('provides a skip link to the main landmark', () => {
    render(<App />);
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });
});
