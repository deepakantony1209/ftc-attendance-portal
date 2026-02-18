import React, { useState } from 'react';

function Login({ onLogin, onPasswordReset }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await onLogin(username, password);
    if (!result.success) {
      switch (result.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Incorrect email or password. Please try again.'); break;
        case 'auth/too-many-requests':
          setError('Access temporarily disabled due to too many failed attempts. Reset your password or try later.'); break;
        default:
          setError('An unexpected error occurred. Please try again.'); break;
      }
    }
    setIsLoading(false);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    const success = await onPasswordReset(resetEmail);
    setResetMessage(success
      ? `A password reset link has been sent to ${resetEmail}.`
      : 'Could not send reset email. Please ensure the email address is correct.');
  };

  const openResetModal = () => { setError(''); setResetMessage(''); setResetEmail(''); setShowResetModal(true); };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #141416 0%, #1a1d2e 50%, #0f1117 100%)' }}>
        {/* Decorative glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(55,114,255,0.4) 0%, transparent 70%)' }}></div>
        <div className="w-full max-w-md relative z-10">
          <div className="rounded-3xl border border-white/8 shadow-2xl p-8 sm:p-10 animate-fade-in" style={{ background: 'rgba(26, 29, 46, 0.95)', backdropFilter: 'blur(20px)' }}>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-white/20 dark:bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-music-note-beamed text-3xl text-white dark:text-primary-400"></i>
              </div>
              <h2 className="text-2xl font-extrabold text-white dark:text-white">FTC Attendance Portal</h2>
              <p className="text-white/60 dark:text-slate-400 text-sm mt-1">Sign in to your account</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/30 text-red-100 dark:text-red-300 rounded-xl px-4 py-3 text-sm mb-6 flex items-start gap-2">
                <i className="bi bi-exclamation-circle-fill mt-0.5 flex-shrink-0"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 dark:text-slate-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-white/10 dark:bg-slate-700 border border-white/20 dark:border-slate-600 rounded-xl px-4 py-3 text-white dark:text-slate-200 placeholder-white/40 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30 dark:focus:ring-primary-500/40 transition-all"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 dark:text-slate-400 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white/10 dark:bg-slate-700 border border-white/20 dark:border-slate-600 rounded-xl px-4 py-3 pr-12 text-white dark:text-slate-200 placeholder-white/40 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30 dark:focus:ring-primary-500/40 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                  >
                    <i className={`bi ${isPasswordVisible ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-primary-700 hover:bg-white/90 dark:bg-primary-600 dark:text-white dark:hover:bg-primary-700 font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><div className="spinner spinner-sm border-primary-700 dark:border-white border-r-transparent"></div> Logging In...</>
                ) : (
                  'Log In'
                )}
              </button>
            </form>

            <div className="text-center mt-4">
              <button onClick={openResetModal} className="text-white/60 hover:text-white dark:text-slate-400 dark:hover:text-slate-200 text-sm transition-colors">
                Forgot Password?
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white">Reset Password</h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="p-5">
              {resetMessage ? (
                <div className={`alert ${resetMessage.includes('sent') ? 'alert-success' : 'alert-danger'}`}>
                  <i className={`bi ${resetMessage.includes('sent') ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`}></i>
                  {resetMessage}
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <label className="form-label">Enter your account email</label>
                    <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required className="form-input" />
                  </div>
                  <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl transition-colors">
                    Send Reset Email
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Login;
