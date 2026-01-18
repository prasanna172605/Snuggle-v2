import { render, screen, fireEvent } from '@testing-library/react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { EmptyState } from '@/components/common/EmptyState';

describe('Common Components', () => {
    describe('LoadingSpinner', () => {
        it('renders with default size', () => {
            render(<LoadingSpinner />);
            const spinner = screen.getByRole('status');
            expect(spinner).toBeInTheDocument();
        });

        it('renders with custom text', () => {
            render(<LoadingSpinner text="Loading posts..." />);
            expect(screen.getByText('Loading posts...')).toBeInTheDocument();
        });

        it('applies size variants correctly', () => {
            const { rerender } = render(<LoadingSpinner size="sm" />);
            let svg = document.querySelector('svg');
            expect(svg).toHaveClass('w-4', 'h-4');

            rerender(<LoadingSpinner size="lg" />);
            svg = document.querySelector('svg');
            expect(svg).toHaveClass('w-12', 'h-12');
        });
    });

    describe('ErrorMessage', () => {
        it('renders error message', () => {
            render(<ErrorMessage message="Something went wrong" />);
            expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        });

        it('calls onRetry when retry button is clicked', () => {
            const onRetry = jest.fn();
            render(<ErrorMessage message="Error" onRetry={onRetry} />);

            const retryButton = screen.getByRole('button', { name: /try again/i });
            fireEvent.click(retryButton);

            expect(onRetry).toHaveBeenCalledTimes(1);
        });

        it('does not render retry button when onRetry is not provided', () => {
            render(<ErrorMessage message="Error" />);
            expect(screen.queryByRole('button')).not.toBeInTheDocument();
        });
    });

    describe('EmptyState', () => {
        it('renders title and description', () => {
            render(
                <EmptyState
                    title="No posts yet"
                    description="Start creating content"
                />
            );

            expect(screen.getByText('No posts yet')).toBeInTheDocument();
            expect(screen.getByText('Start creating content')).toBeInTheDocument();
        });

        it('renders action button when provided', () => {
            const onAction = jest.fn();
            render(
                <EmptyState
                    title="No posts"
                    actionLabel="Create Post"
                    onAction={onAction}
                />
            );

            const button = screen.getByRole('button', { name: /create post/i });
            fireEvent.click(button);

            expect(onAction).toHaveBeenCalledTimes(1);
        });
    });
});
