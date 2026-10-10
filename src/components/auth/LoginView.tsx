import {CompanyLogo} from '../common/CompanyLogo';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, setClientPortalMode } = useApp();

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!emailInput.trim()) {
      setErrorMessage('Please enter your official team member email address.');
      return;
    }

    setIsLoading(true);
    setTimeout(async () => {
      const result = await login(emailInput, passwordInput);
      setIsLoading(false);
      if (!result.success) {
        setErrorMessage(result.message || 'Authentication failed. Please verify your credentials.');
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-400 selection:text-slate-950 font-sans">
      {/* Top Banner / Domain indicator */}
      <div className="w-full border-b border-slate-800 bg-slate-900/70 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CompanyLogo className="w-8 h-8"/>
          <div>
            <span className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <span>Vrinda Spaces LLP</span>
            </span>
          </div>
        </div>


      </div>

      {/* Main Login Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-lg">
          
          {/* Login Form */}
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Enterprise Workforce Sign In</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Sign In to ERP Studio
              </h1>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">
                  Official Email ID <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="praveen.anantha@vrindaspaces.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Must match the email registered on your employee profile.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    Login Password / Passcode <span className="text-rose-600">*</span>
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="vrinda123"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Owner Default Helper */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-amber-900">Owner Default Credentials</div>
                  <div className="text-[11px] text-amber-700 font-mono mt-0.5">
                    praveen.anantha@vrindaspaces.com · vrinda123
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmailInput('praveen.anantha@vrindaspaces.com');
                    setPasswordInput('vrinda123');
                  }}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer shrink-0 ml-2"
                >
                  Auto Fill
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer text-sm"
                >
                  {isLoading ? (
                    <span>Signing In...</span>
                  ) : (
                    <>
                      <span>Sign In to ERP Studio</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Secure Session Encryption (TLS 1.3)</span>
              <span>Vrinda Spaces LLP © 2026</span>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="w-full border-t border-slate-900 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500">
        Vrinda Spaces LLP · Residential Luxury & Turnkey Interior Architecture ERP Platform · Hyderabad, India
      </div>
    </div>
  );
};
