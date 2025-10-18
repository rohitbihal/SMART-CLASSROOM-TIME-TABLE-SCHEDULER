import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HomeIcon } from '../../components/Icons'; // Adjust path as necessary
import React from 'react';

describe('Icon Components', () => {
  it('should render the HomeIcon correctly', () => {
    render(<HomeIcon data-testid="home-icon" />);
    const iconElement = screen.getByTestId('home-icon');
    expect(iconElement).toBeInTheDocument();
    expect(iconElement.tagName).toBe('svg');
  });
});
