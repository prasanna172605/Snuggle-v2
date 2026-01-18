/**
 * LoadingSpinner Component Tests
 * Tests loading states and accessibility
 */

import { render, screen } from '@/utils/testUtils';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
    it('renders spinner with default text', () => {
        render(<LoadingSpinner />);

        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders spinner with custom text', () => {
        render(<LoadingSpinner text="Sending message..." />);

        expect(screen.getByText('Sending message...')).toBeInTheDocument();
    });

    it('renders different sizes', () => {
        const { container, rerender } = render(<LoadingSpinner size="sm" />);

        expect(container.querySelector('.w-4')).toBeInTheDocument();

        rerender(<LoadingSpinner size="lg" />);
        expect(container.querySelector('.w-12')).toBeInTheDocument();
    });

    it('has proper ARIA attributes', () => {
        render(<LoadingSpinner />);

        const status = screen.getByRole('status');
        expect(status).toHaveAttribute('aria-live', 'polite');
    });
});
