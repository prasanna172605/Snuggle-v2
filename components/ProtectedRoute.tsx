
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { User } from '../types';
import { Loader2 } from 'lucide-react';
import { DBService } from '../services/database';

interface ProtectedRouteProps {
    children: React.ReactNode;
    currentUser: User | null;
    allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    currentUser,
    allowedRoles
}) => {
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);

    useEffect(() => {
        // If no user is apparently logged in, wait a bit or check DBService/Auth state?
        // Actually App.tsx handles the main "isLoading" auth check.
        // So if we reach here and currentUser is null, they are definitely logged out.

        if (!currentUser) {
            setHasAccess(false);
            setIsChecking(false);
            return;
        }

        if (allowedRoles && allowedRoles.length > 0) {
            // Check role
            // Assuming currentUser has a 'role' property from the recent schema update
            const userRole = currentUser.role || 'user';

            if (allowedRoles.includes(userRole)) {
                setHasAccess(true);
            } else {
                setHasAccess(false);
            }
        } else {
            setHasAccess(true);
        }
        setIsChecking(false);

    }, [currentUser, allowedRoles]);


    if (isChecking) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-black">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
        );
    }

    if (!currentUser) {
        // Redirect to login, saving the location they tried to access
        return <Navigate to="/" state={{ from: location }} replace />;
        // Note: In Snuggle App.tsx, the "/" route handles Login vs Feed conditionally.
        // If we redirect to "/" while logged out, App.tsx renders Login. Correct.
    }

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
                <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
                <p className="text-gray-600 dark:text-gray-400">You do not have permission to view this page.</p>
                <button
                    onClick={() => window.history.back()}
                    className="mt-4 px-4 py-2 bg-gray-200 rounded-lg font-medium"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;
