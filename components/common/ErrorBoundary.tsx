import React, { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ErrorMessage } from './ErrorMessage';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
        });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-4">
                    <ErrorMessage
                        title="Something went wrong"
                        message={
                            this.state.error?.message ||
                            'An unexpected error occurred. Please try refreshing the page.'
                        }
                        onRetry={this.handleReset}
                    />
                </div>
            );
        }

        return this.props.children;
    }
}

// Feature-specific error boundaries

export const FeedErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <ErrorBoundary
            fallback={
                <div className="min-h-[400px] flex items-center justify-center">
                    <ErrorMessage
                        title="Feed unavailable"
                        message="We're having trouble loading your feed. Please try again."
                        onRetry={() => window.location.reload()}
                    />
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
};

export const ChatErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <ErrorBoundary
            fallback={
                <div className="min-h-[400px] flex items-center justify-center">
                    <ErrorMessage
                        title="Chat unavailable"
                        message="We're having trouble loading messages. Please try again."
                        onRetry={() => window.location.reload()}
                    />
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
};

export const ProfileErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <ErrorBoundary
            fallback={
                <div className="min-h-[400px] flex items-center justify-center">
                    <ErrorMessage
                        title="Profile unavailable"
                        message="We're having trouble loading this profile. Please try again."
                        onRetry={() => window.location.reload()}
                    />
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
};

export default ErrorBoundary;
