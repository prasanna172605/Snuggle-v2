import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';

const VerifyEmail = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your email...');
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Invalid verification link.');
                return;
            }

            try {
                const response = await fetch(`/api/v1/auth/verify-email/${token}`, {
                    method: 'POST'
                });
                const data = await response.json();

                if (response.ok) {
                    setStatus('success');
                    setMessage('Email verified successfully!');
                } else {
                    setStatus('error');
                    setMessage(data.message || 'Verification failed.');
                }
            } catch (error) {
                setStatus('error');
                setMessage('Something went wrong. Please try again.');
            }
        };

        verify();
    }, [token]);

    useEffect(() => {
        if (status === 'success') {
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        navigate('/');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [status, navigate]);

    return (
        <div className="min-h-screen bg-snuggle-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl text-center">
                <div className="flex justify-center mb-6">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white
                        ${status === 'verifying' ? 'bg-cyan-500' :
                            status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                        {status === 'verifying' && <Loader2 className="w-10 h-10 animate-spin" />}
                        {status === 'success' && <CheckCircle className="w-10 h-10" />}
                        {status === 'error' && <XCircle className="w-10 h-10" />}
                    </div>
                </div>

                <h1 className="text-2xl font-bold mb-2">
                    {status === 'verifying' ? 'Verifying...' :
                        status === 'success' ? 'Verified!' : 'Verification Failed'}
                </h1>

                <p className="text-gray-500 font-medium mb-8">
                    {message}
                </p>

                {status === 'success' && (
                    <div className="text-sm font-bold text-gray-400">
                        Redirecting to home in {countdown}s...
                    </div>
                )}

                {status === 'error' && (
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 mx-auto hover:bg-gray-800 transition-colors"
                    >
                        Go to Login <ArrowRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
