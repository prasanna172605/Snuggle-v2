/**
 * AccessibleModal Component Tests
 * Tests accessibility, focus management, and keyboard navigation
 */

import { render, screen, userEvent, waitFor } from '@/utils/testUtils';
import { AccessibleModal } from '../AccessibleComponents';

describe('AccessibleModal', () => {
    it('renders modal when open', () => {
        render(
            <AccessibleModal
                isOpen={true}
                onClose={jest.fn()}
                title="Test Modal"
            >
                <p>Modal content</p>
            </AccessibleModal>
        );

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Test Modal')).toBeInTheDocument();
        expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(
            <AccessibleModal
                isOpen={false}
                onClose={jest.fn()}
                title="Test Modal"
            >
                <p>Modal content</p>
            </AccessibleModal>
        );

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('has proper ARIA attributes', () => {
        render(
            <AccessibleModal
                isOpen={true}
                onClose={jest.fn()}
                title="Test Modal"
                description="This is a test modal"
            >
                <p>Content</p>
            </AccessibleModal>
        );

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
        expect(dialog).toHaveAttribute('aria-describedby', 'modal-description');
    });

    it('calls onClose when close button clicked', async () => {
        const onClose = jest.fn();
        const user = userEvent.setup();

        render(
            <AccessibleModal
                isOpen={true}
                onClose={onClose}
                title="Test Modal"
            >
                <p>Content</p>
            </AccessibleModal>
        );

        const closeButton = screen.getByRole('button', { name: /close dialog/i });
        await user.click(closeButton);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape pressed', async () => {
        const onClose = jest.fn();
        const user = userEvent.setup();

        render(
            <AccessibleModal
                isOpen={true}
                onClose={onClose}
                title="Test Modal"
            >
                <p>Content</p>
            </AccessibleModal>
        );

        await user.keyboard('{Escape}');

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('traps focus within modal', async () => {
        const user = userEvent.setup();

        render(
            <AccessibleModal
                isOpen={true}
                onClose={jest.fn()}
                title="Test Modal"
            >
                <input type="text" placeholder="First input" />
                <input type="text" placeholder="Second input" />
            </AccessibleModal>
        );

        const firstInput = screen.getByPlaceholderText('First input');
        const secondInput = screen.getByPlaceholderText('Second input');
        const closeButton = screen.getByRole('button', { name: /close dialog/i });

        // Tab should cycle through elements
        await user.tab();
        expect(closeButton).toHaveFocus();

        await user.tab();
        expect(firstInput).toHaveFocus();

        await user.tab();
        expect(secondInput).toHaveFocus();
    });
});
