/**
 * EmptyState Component Tests
 * Tests empty state rendering and actions
 */

import { render, screen, userEvent } from '@/utils/testUtils';
import { EmptyState } from '../EmptyState';
import { MessageSquare } from 'lucide-react';

describe('EmptyState', () => {
    it('renders title and description', () => {
        render(
            <EmptyState
                title="No messages"
                description="Start a conversation"
            />
        );

        expect(screen.getByText('No messages')).toBeInTheDocument();
        expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    });

    it('renders with icon', () => {
        const { container } = render(
            <EmptyState
                icon={MessageSquare}
                title="No messages"
                description="Start a conversation"
            />
        );

        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders action button when provided', () => {
        const onAction = jest.fn();

        render(
            <EmptyState
                title="No messages"
                description="Start a conversation"
                actionLabel="New Message"
                onAction={onAction}
            />
        );

        expect(screen.getByRole('button', { name: 'New Message' })).toBeInTheDocument();
    });

    it('calls onAction when button clicked', async () => {
        const onAction = jest.fn();
        const user = userEvent.setup();

        render(
            <EmptyState
                title="No messages"
                description="Start a conversation"
                actionLabel="New Message"
                onAction={onAction}
            />
        );

        await user.click(screen.getByRole('button', { name: 'New Message' }));

        expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('does not render action button when onAction not provided', () => {
        render(
            <EmptyState
                title="No messages"
                description="Start a conversation"
            />
        );

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
