/**
 * ErrorMessage Component Tests
 * Tests error states and retry functionality
 */

import { render, screen, userEvent } from '@/utils/testUtils';
import { ErrorMessage } from '../ErrorMessage';

describe('ErrorMessage', () => {
    it('renders error message', () => {
        render(<ErrorMessage message="Something went wrong" />);

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('shows retry button when onRetry provided', () => {
        const onRetry = jest.fn();
        render(<ErrorMessage message="Failed to load" onRetry={onRetry} />);

        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('calls onRetry when retry button clicked', async () => {
        const onRetry = jest.fn();
        const user = userEvent.setup();

        render(<ErrorMessage message="Failed to load" onRetry={onRetry} />);

        const retryButton = screen.getByRole('button', { name: /retry/i });
        await user.click(retryButton);

        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not show retry button when onRetry not provided', () => {
        render(<ErrorMessage message="Fatal error" />);

        expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    it('has proper ARIA attributes', () => {
        render(<ErrorMessage message="Error occurred" />);

        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
});
