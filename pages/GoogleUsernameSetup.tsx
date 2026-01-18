
import React, { useState } from 'react';
import { DBService } from '../services/database';
import { AtSign, Loader2, ArrowRight } from 'lucide-react';

interface GoogleUsernameSetupProps {
  googleData: { email: string; fullName: string; avatar: string };
  onSignup: (user: import('../types').User) => void;
  onCancel: () => void;
}

const GoogleUsernameSetup: React.FC<GoogleUsernameSetupProps> = ({ googleData, onSignup, onCancel }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }

    try {
      // Register using the Google data + new username
      const user = await DBService.completeGoogleSignup({
        fullName: googleData.fullName,
        username: username.toLowerCase().replace(/\s/g, ''),
        email: googleData.email,
        avatar: googleData.avatar
      });
      onSignup(user);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-snuggle-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-20%] w-[500px] h-[500px] bg-emerald-200/50 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-teal-200/50 rounded-full blur-[80px]" />

      <div className="w-full max-w-sm bg-white rounded-bento shadow-[0_20px_40px_rgba(0,0,0,0.05)] p-8 relative z-10 animate-in fade-in zoom-in-95">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-snuggle-400 to-emerald-500 mb-4">
            <img src={googleData.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover border-4 border-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight text-center">One Last Step!</h2>
          <p className="text-gray-400 text-sm font-medium mt-1 text-center">
            Hi <span className="text-gray-800 font-bold">{googleData.fullName}</span>,<br />choose a unique username to finish up.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 rounded-[20px] p-2 border-2 border-transparent focus-within:border-snuggle-100 focus-within:bg-white transition-all flex items-center">
            <AtSign className="w-5 h-5 text-gray-400 ml-2" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              className="w-full bg-transparent text-gray-900 font-semibold focus:outline-none ml-2 text-sm"
              placeholder="username"
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-xs font-bold text-center bg-red-50 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 text-gray-500 font-bold py-4 rounded-[24px] hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] bg-black text-white font-bold py-4 rounded-[24px] shadow-lg hover:bg-gray-900 transform transition-all active:scale-95 flex justify-center items-center gap-2 group"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                <>
                  All Set! <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoogleUsernameSetup;
