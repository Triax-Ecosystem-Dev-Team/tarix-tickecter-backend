import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingScreen from '../LoadingScreen';

describe('LoadingScreen Component', () => {
  it('renders the loading text and logo', () => {
    render(<LoadingScreen />);
    
    // Check if the loading text is present
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Check if the logo image is rendered
    const logoImage = screen.getByAltText('TARIX');
    expect(logoImage).toBeInTheDocument();
    expect(logoImage).toHaveClass('grayscale');
  });
});
