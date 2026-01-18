/**
 * Test Utilities
 * Helpers for component testing
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';

/**
 * Custom render with providers
 */
export function renderWithProviders(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) {
    function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <BrowserRouter>
                <ThemeProvider>
                    <AuthProvider>
                        {children}
                    </AuthProvider>
                </ThemeProvider>
            </BrowserRouter>
        );
    }

    return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Mock Firebase Auth
 */
export const mockFirebaseAuth = {
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
};

/**
 * Mock Firebase Database
 */
export const mockFirebaseDatabase = {
    ref: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    onValue: jest.fn(),
    push: jest.fn(),
};

/**
 * Mock user object
 */
export const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/avatar.jpg',
};

/**
 * Wait for loading to complete
 */
export async function waitForLoadingToFinish() {
    const { queryByText } = await import('@testing-library/react');
    await import('@testing-library/react').then(({ waitFor }) =>
        waitFor(() => {
            expect(queryByText(/loading/i)).not.toBeInTheDocument();
        })
    );
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
