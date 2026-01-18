import React, { useState, useEffect } from 'react';
import { ViewState, User } from '../types';
import { Mail, Lock, User as UserIcon, Loader2, AtSign, ArrowRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SignupProps {
  onSignup: (user: User) => void;
  onNavigate: (view: ViewState) => void;
  onSwitchToLogin?: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSignup, onNavigate }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Password strength calculator
  useEffect(() => {
    const pwd = formData.password;
    let score = 0;
    if (pwd.length > 5) score++;
    if (pwd.length > 9) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    setPasswordStrength(score);
  }, [formData.password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'username' ? value.toLowerCase().replace(/\s/g, '') : value
    }));
    setError('');
  };

  const validate = () => {
    if (!formData.fullName.trim()) return 'Full name is required';
    if (!formData.username.trim()) return 'Username is required';
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email)) return 'Invalid email address';
    if (formData.password.length < 6) return 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    if (!termsAccepted) return 'You must accept the Terms & Conditions';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Using Backend API for Signup
      const response = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Signup failed');
      }

      setSuccess(data.message || 'Account created! Redirecting...');

      // Delay to show success message before redirecting to login
      setTimeout(() => {
        onNavigate(ViewState.LOGIN);
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Signup failed');
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength < 2) return 'bg-red-400';
    if (passwordStrength < 4) return 'bg-yellow-400';
    return 'bg-green-400';
  };

  const getStrengthText = () => {
    if (formData.password.length === 0) return '';
    if (passwordStrength < 2) return 'Weak';
    if (passwordStrength < 4) return 'Medium';
    return 'Strong';
  };

  return (
    <div className="min-h-screen bg-snuggle-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-20%] w-[500px] h-[500px] bg-emerald-200/50 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-teal-200/50 rounded-full blur-[80px]" />

      <div className="w-full max-w-sm bg-white rounded-bento shadow-[0_20px_40px_rgba(0,0,0,0.05)] p-8 relative z-10 my-10 border border-white/50 backdrop-blur-sm">
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Create Account</h2>
          <p className="text-gray-400 text-sm font-medium mt-1">Join the world of Snuggle</p>
        </div>

        {success ? (
          <div className="text-center py-10 animate-fade-in">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800">Success!</h3>
            <p className="text-gray-600 mt-2">{success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="bg-gray-50 rounded-[20px] p-2 border-2 border-transparent focus-within:border-snuggle-100 focus-within:bg-white transition-all flex items-center">
              <UserIcon className="w-5 h-5 text-gray-400 ml-2" />
              <input
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full bg-transparent text-gray-900 font-semibold focus:outline-none ml-2 text-sm"
                placeholder="Full Name"
                required
              />
            </div>

            <div className="bg-gray-50 rounded-[20px] p-2 border-2 border-transparent focus-within:border-snuggle-100 focus-within:bg-white transition-all flex items-center">
              <AtSign className="w-5 h-5 text-gray-400 ml-2" />
              <input
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-transparent text-gray-900 font-semibold focus:outline-none ml-2 text-sm"
                placeholder="Username"
                required
              />
            </div>

            <div className="bg-gray-50 rounded-[20px] p-2 border-2 border-transparent focus-within:border-snuggle-100 focus-within:bg-white transition-all flex items-center">
              <Mail className="w-5 h-5 text-gray-400 ml-2" />
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-transparent text-gray-900 font-semibold focus:outline-none ml-2 text-sm"
                placeholder="Email"
                required
              />
            </div>

            <div className="bg-gray-50 rounded-[20px] p-2 border-2 border-transparent focus-within:border-snuggle-100 focus-within:bg-white transition-all flex items-center">
              <Lock className="w-5 h-5 text-gray-400 ml-2" />
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-transparent text-gray-900 font-semibold focus:outline-none ml-2 text-sm"
                placeholder="Password"
                required
              />
            </div>

            {/* Password Strength */}
            {formData.password.length > 0 && (
              <div className="px-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Strength</span>
                  <span className={`font-bold ${passwordStrength < 2 ? 'text-red-500' : passwordStrength < 4 ? 'text-yellow-500' : 'text-green-500'}`}>{getStrengthText()}</span>
                </div>
                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${getStrengthColor()}`} style={{ width: `${(passwordStrength / 5) * 100}%` }}></div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-[20px] p-2 border-2 border-transparent focus-within:border-snuggle-100 focus-within:bg-white transition-all flex items-center">
              <Lock className="w-5 h-5 text-gray-400 ml-2" />
              <input
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full bg-transparent text-gray-900 font-semibold focus:outline-none ml-2 text-sm"
                placeholder="Confirm Password"
                required
              />
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start px-2 mt-2">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 mr-2 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-gray-500 leading-tight cursor-pointer select-none">
                I agree to the <span className="text-black font-bold">Terms of Service</span> and <span className="text-black font-bold">Privacy Policy</span>
              </label>
            </div>

            {error && (
              <div className="text-red-500 text-xs font-bold text-center bg-red-50 py-3 rounded-xl flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-bold py-4 rounded-[24px] shadow-lg hover:bg-gray-900 transform transition-all active:scale-95 flex justify-center items-center gap-2 group mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                <>
                  Sign Up <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">Already a member?</p>
          <button
            onClick={() => onNavigate(ViewState.LOGIN)}
            className="text-snuggle-600 font-black hover:underline mt-1"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;
