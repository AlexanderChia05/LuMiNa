
import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff, Loader, Key, ChevronLeft, RefreshCw, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from './UI';
import { AuthService } from '../services/auth';
import { formatPhoneNumber } from '../utils/helpers';

interface AuthUIProps {
  onLoginSuccess: () => void;
  defaultMode: 'client' | 'admin' | 'staff';
}

export const AuthUI: React.FC<AuthUIProps> = ({ onLoginSuccess, defaultMode }) => {
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'otp' | 'reset_password'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState(''); 
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Track flow to differentiate OTP for signup vs recovery
  const [authFlow, setAuthFlow] = useState<'signup' | 'recovery'>('signup');

  // Check for pending reset state on mount
  useEffect(() => {
    const isResetPending = localStorage.getItem('lumina_reset_pending') === 'true';
    if (isResetPending) {
        setView('reset_password');
    }
  }, []);

  // Set defaults for Admin and Staff
  useEffect(() => {
    if (defaultMode === 'admin' && view === 'login') {
      setEmail('admin@gmail.com');
      setPassword('admin1234');
    } else if (defaultMode === 'staff' && view === 'login') {
      setEmail('s0001@lumina.com');
      setPassword('s0001Lumina');
    }
  }, [defaultMode, view]);

  // Handle Resend Cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Helper: Password Strength Validator
  const validatePasswordStrength = (pwd: string) => {
      const hasLength = pwd.length >= 8;
      const hasNumber = /\d/.test(pwd);
      const hasLetter = /[a-zA-Z]/.test(pwd);
      return hasLength && hasNumber && hasLetter;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await AuthService.signIn(email, password);
    
    if (error) {
       if (email === 'demo@gmail.com' && (error.message.includes('Invalid login') || error.message.includes('not found'))) {
          const { data: signUpData, error: signUpError } = await AuthService.signUp(email, password, 'Demo User', '+60 123456789', '123456', 'customer');
          if (!signUpError && signUpData.session) {
               setLoading(false);
               onLoginSuccess();
               return;
          }
       }
       if (defaultMode === 'admin' && email === 'admin@gmail.com' && (error.message.includes('Invalid login') || error.message.includes('not found'))) {
          const { data: signUpData, error: signUpError } = await AuthService.signUp(email, password, 'Admin User', '', '000000', 'admin');
          if (!signUpError && signUpData.session) {
               setLoading(false);
               onLoginSuccess();
               return;
          }
       }
    }

    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (data.session) {
      onLoginSuccess();
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length !== 6) {
        setError("Please enter a valid 6-digit Security PIN.");
        return;
    }
    
    if (!validatePasswordStrength(password)) {
        setError("Password must be at least 8 characters and include both letters and numbers.");
        return;
    }

    setLoading(true);
    setError(null);
    setAuthFlow('signup');

    const { data, error } = await AuthService.signUp(email, password, name, phone, pin);
    
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      if (data.session) {
        onLoginSuccess();
      } else {
        setView('otp');
        setResendCooldown(30);
      }
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Set flag before verification if recovery, to prevent App.tsx from switching views immediately
    if (authFlow === 'recovery') {
        localStorage.setItem('lumina_reset_pending', 'true');
    }

    const type = authFlow === 'recovery' ? 'recovery' : 'signup';
    const { data, error } = await AuthService.verifyOtp(email, otp, type);
    
    setLoading(false);
    if (error) {
      if (authFlow === 'recovery') localStorage.removeItem('lumina_reset_pending'); // Clear if failed
      setError(error.message);
    } else if (data.session) {
      if (authFlow === 'recovery') {
          // Explicitly transition to Reset Password View
          setView('reset_password');
          setError(null);
          setNewPassword('');
          setConfirmPassword('');
      } else {
          onLoginSuccess();
      }
    }
  };

  const handleForgotPass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAuthFlow('recovery');
    
    const { error } = await AuthService.resetPasswordForEmail(email);
    setLoading(false);
    
    if (error) {
        setError(error.message);
    } else {
        setView('otp');
        setResendCooldown(30);
        setOtp('');
    }
  };
  
  const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          setError("Passwords do not match.");
          return;
      }
      
      if (!validatePasswordStrength(newPassword)) {
          setError("Password must be at least 8 characters and include both letters and numbers.");
          return;
      }

      setLoading(true);
      setError(null);
      
      const { error } = await AuthService.updateUserPassword(newPassword);
      
      setLoading(false);
      if (error) {
          setError(error.message);
      } else {
          localStorage.removeItem('lumina_reset_pending'); // Clear flag
          alert("Success! Your password has been updated.");
          onLoginSuccess(); 
      }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    
    const type = authFlow === 'recovery' ? 'recovery' : 'signup';
    if (type === 'recovery') {
        const { error } = await AuthService.resetPasswordForEmail(email);
        setLoading(false);
        if (error) setError(error.message);
        else { setResendCooldown(60); }
    } else {
        const { error } = await AuthService.resendOtp(email, 'signup');
        setLoading(false);
        if (error) setError(error.message);
        else { setResendCooldown(60); }
    }
  };

  const containerClasses = (defaultMode === 'client' || defaultMode === 'staff')
    ? "w-full h-full md:w-[440px] md:h-[956px] md:rounded-[60px] border-0 md:border-8 md:ring-1"
    : "w-full h-full rounded-0 border-0";

  // Real-time validation for Reset Password View button state
  const isPasswordValid = validatePasswordStrength(newPassword) && newPassword === confirmPassword;

  return (
    <div className="flex items-center justify-center w-screen h-screen bg-gray-900 overflow-hidden">
      <div 
        className={`bg-white dark:bg-black relative overflow-hidden flex flex-col items-center justify-center p-8 transition-all duration-500 shadow-2xl border-gray-800 ring-white/10 ${containerClasses}`}
      >
        {(defaultMode === 'client' || defaultMode === 'staff') && (
           <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-b-3xl z-50"></div>
        )}

        <div className="w-full max-w-sm z-10">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-rose-500 rounded-[22px] flex items-center justify-center text-white font-black text-4xl shadow-xl shadow-rose-500/30 mx-auto mb-6 transition-transform hover:scale-110">L</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
              {view === 'login' ? 'Welcome Back' : 
               view === 'register' ? 'Join Lumina' : 
               view === 'otp' ? 'Confirm Identity' : 
               view === 'reset_password' ? 'New Password' : 
               'Reset Password'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-[14px] font-medium leading-relaxed px-4">
              {view === 'otp' ? `We've sent a 6-digit code to ${email}` : 
               view === 'reset_password' ? 'Create a new secure password for your account.' :
               'Elegance and luxury in every appointment.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 backdrop-blur-md animate-shake">
              <div className="w-1 h-8 bg-red-50 rounded-full"></div>
              <p className="text-red-600 dark:text-red-400 text-xs font-bold flex-1">{error}</p>
            </div>
          )}

          <div className="space-y-5">
            <form onSubmit={
              view === 'login' ? handleLogin : 
              view === 'register' ? handleRegister : 
              view === 'otp' ? handleOtpVerify : 
              view === 'reset_password' ? handleResetPassword : 
              handleForgotPass
            } className="space-y-4">
              
              {view === 'register' && (
                <>
                  <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl flex items-center px-4 py-4 border border-gray-100 dark:border-white/5 focus-within:border-rose-500/50 transition-all shadow-sm">
                    <User className="text-rose-400 mr-3" size={20} />
                    <input 
                      type="text" 
                      placeholder="Full Name" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-transparent w-full outline-none text-gray-900 dark:text-white font-medium placeholder:text-gray-400"
                      required
                    />
                  </div>
                  <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl flex items-center px-4 py-4 border border-gray-100 dark:border-white/5 focus-within:border-rose-500/50 transition-all shadow-sm">
                    <Phone className="text-rose-400 mr-3" size={20} />
                    <input 
                      type="tel" 
                      placeholder="+60 12 345 6789" 
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                      className="bg-transparent w-full outline-none text-gray-900 dark:text-white font-medium placeholder:text-gray-400"
                      required
                    />
                  </div>
                  <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl flex items-center px-4 py-4 border border-gray-100 dark:border-white/5 focus-within:border-rose-500/50 transition-all shadow-sm">
                    <Lock className="text-rose-400 mr-3" size={20} />
                    <input 
                      type="password" 
                      placeholder="6-Digit Security PIN" 
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g,'').slice(0,6))}
                      className="bg-transparent w-full outline-none text-gray-900 dark:text-white font-medium placeholder:text-gray-400 tracking-widest"
                      required
                      minLength={6}
                      maxLength={6}
                      inputMode="numeric"
                    />
                  </div>
                </>
              )}

              {view === 'otp' ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl flex items-center px-4 py-4 border border-gray-100 dark:border-white/5 focus-within:border-rose-500/50 transition-all shadow-sm">
                    <Key className="text-rose-400 mr-3" size={20} />
                    <input 
                      type="text" 
                      placeholder="123456" 
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                      className="bg-transparent w-full outline-none text-gray-900 dark:text-white font-bold tracking-[0.5em] text-2xl text-center"
                      required
                      maxLength={6}
                      inputMode="numeric"
                      autoFocus
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    className="w-full text-center text-xs font-bold text-rose-500 hover:text-rose-600 disabled:text-gray-400 transition-colors flex items-center justify-center gap-2"
                  >
                    {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : <><RefreshCw size={12} /> Resend Code</>}
                  </button>
                </div>
              ) : view === 'reset_password' ? (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl flex items-center px-4 py-4 border border-gray-100 dark:border-white/5 focus-within:border-rose-500/50 transition-all shadow-sm">
                        <ShieldCheck className="text-rose-400 mr-3" size={20} />
                        <input 
                          type={showPassword ? "text" : "password"}
                          placeholder="New Password" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-transparent w-full outline-none text-gray-900 dark:text-white font-medium placeholder:text-gray-400"
                          required
                          minLength={8}
                          autoFocus
                        />
                    </div>
                    <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl flex items-center px-4 py-4 border border-gray-100 dark:border-white/5 focus-within:border-rose-500/50 transition-all shadow-sm">
                        <Lock className="text-rose-400 mr-3" size={20} />
                        <input 
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirm New Password" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="bg-transparent w-full outline-none text-gray-900 dark:text-white font-medium placeholder:text-gray-400"
                          required
                          minLength={8}
                        />
                        {confirmPassword && newPassword === confirmPassword && (
                           <CheckCircle2 size={18} className="text-green-500 ml-2" />
                        )}
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="w-full text-right text-[11px] font-bold text-gray-400 hover:text-rose-500 transition-colors uppercase tracking-widest"
                    >
                      {showPassword ? "Hide Characters" : "Show Characters"}
                    </button>

                    <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                       <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                         Requirement: Minimum 8 characters. Must include letters and numbers.
                       </p>
                    </div>
                  </div>
              ) : (
                <>
                  <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl flex items-center px-4 py-4 border border-gray-100 dark:border-white/5 focus-within:border-rose-500/50 transition-all shadow-sm">
                    <Mail className="text-rose-400 mr-3" size={20} />
                    <input 
                      type="email" 
                      placeholder="Email Address" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-transparent w-full outline-none text-gray-900 dark:text-white font-medium placeholder:text-gray-400"
                      required
                    />
                  </div>

                  {view !== 'forgot' && (
                    <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl flex items-center px-4 py-4 border border-gray-100 dark:border-white/5 focus-within:border-rose-500/50 transition-all shadow-sm">
                      <Lock className="text-rose-400 mr-3" size={20} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-transparent w-full outline-none text-gray-900 dark:text-white font-medium placeholder:text-gray-400"
                        required
                        minLength={view === 'register' ? 8 : undefined}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-rose-500 transition-colors p-1"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  )}
                </>
              )}

              <Button 
                type="submit" 
                disabled={loading || (view === 'reset_password' && !isPasswordValid)}
                className={`w-full h-14 text-[17px] font-bold rounded-2xl text-white shadow-lg flex items-center justify-center gap-2 mt-4 transition-all active:scale-[0.98] ${view === 'reset_password' && !isPasswordValid ? 'bg-gray-300 cursor-not-allowed opacity-50' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30'}`}
              >
                {loading ? <Loader className="animate-spin" /> : (
                  <>
                    {view === 'login' ? 'Sign In' : 
                     view === 'register' ? 'Create Account' : 
                     view === 'otp' ? 'Confirm Code' : 
                     view === 'reset_password' ? 'Update & Log In' : 
                     'Send Reset Code'} 
                    {view !== 'otp' && <ArrowRight size={20} strokeWidth={2.5} />}
                  </>
                )}
              </Button>
            </form>

            <div className="pt-2 flex flex-col items-center gap-4">
              {view === 'login' && (
                <>
                  <button onClick={() => setView('forgot')} className="text-[13px] font-medium text-gray-500 dark:text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors">
                    Forgot Password?
                  </button>

                  {defaultMode === 'client' && (
                    <div className="w-full pt-4 border-t border-gray-100 dark:border-white/5 mt-2 text-center">
                       <span className="text-[13px] text-gray-400 mr-2">New to Lumina?</span>
                       <button onClick={() => setView('register')} className="text-[13px] font-bold text-rose-500 hover:underline">
                         Join Now
                       </button>
                    </div>
                  )}
                </>
              )}
              
              {(view === 'register' || view === 'forgot' || view === 'otp' || view === 'reset_password') && (
                <button onClick={() => setView('login')} className="flex items-center gap-1 text-[13px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                   <ChevronLeft size={14} /> Back to Sign In
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
      </div>
    </div>
  );
};
