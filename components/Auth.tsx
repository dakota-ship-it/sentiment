import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebase';

const Auth: React.FC = () => {
    const [error, setError] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (err) {
            console.error("Login failed:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to login with Google";
            setError(errorMessage);
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-brand-surface border border-brand-muted rounded-xl p-8 text-center">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">ADCLASS <span className="text-brand-cyan">.</span></h1>
                    <p className="text-brand-muted">Sentiment AI & Client Intelligence</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-bold py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                    </button>
                </div>

                {error && (
                    <div className="mt-6 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Auth;
