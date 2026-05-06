import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '../Header';

import { vi } from 'vitest';

vi.mock('../../../modules/ticketer/store/useBookingStore', () => ({
  useBookingStore: vi.fn((selector) => {
    const state = {
      user: { id: 'U1', name: 'Test', role: 'Ticketer', walletBalance: 0 },
    };
    return selector ? selector(state) : state;
  }),
}));

describe('Header component', () => {
  it('shows hamburger and toggles menu on mobile', () => {
    // Force small width
    window.innerWidth = 500;
    const { container } = render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );

    const burger = container.querySelector('button[aria-label="Open navigation"]');
    expect(burger).toBeInTheDocument();

    fireEvent.click(burger!);
    const busStatusLinks = screen.getAllByText('Bus Status');
    expect(busStatusLinks[1]).toBeVisible();

    const closeBtn = container.querySelector('button[aria-label="Close navigation"]');
    fireEvent.click(closeBtn!);
    expect(busStatusLinks[1]).not.toBeVisible();
  });
});