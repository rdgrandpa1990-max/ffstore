import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Check, 
  AlertCircle, 
  FileText, 
  LogIn, 
  User, 
  ChevronRight,
  Info,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { 
  LEGAL_OPERATOR, 
  LAST_UPDATED, 
  REFUND_POLICY_INTRO, 
  REFUND_POLICY_SECTIONS, 
  MANDATORY_LEGAL_COVENANTS_INTRO, 
  COVENANTS_SECTIONS,
  PolicySection
} from '../legalData';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';

interface LegalGateProps {
  currentUserEmail: string;
  currentUsername: string;
  setCurrentUserEmail: (email: string) => void;
  setCurrentUsername: (username: string) => void;
  setHasAcceptedTerms: (accepted: boolean) => void;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function LegalGate({
  currentUserEmail,
  currentUsername,
  setCurrentUserEmail,
  setCurrentUsername,
  setHasAcceptedTerms,
  showToast
}: LegalGateProps) {
  // Local state for authentication modes and inputs
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [agreeCheckbox, setAgreeCheckbox] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [authErrorType, setAuthErrorType] = useState<'operation-not-allowed' | string | null>(null);
  
  // Tab control inside the T&C container
  const [activeTab, setActiveTab] = useState<'refund' | 'covenants'>('refund');
  const [showPolicies, setShowPolicies] = useState<boolean>(false);

  const handleEnterDemoMode = () => {
    const demoEmail = emailInput.trim() || 'demo_player@gamershield.com';
    const demoUser = usernameInput.trim() || 'Demo_Gamer';

    localStorage.setItem('gamershield_demo_email', demoEmail);
    localStorage.setItem('gamershield_demo_username', demoUser);
    localStorage.setItem('gamershield_accepted_terms_demo', 'true');

    setCurrentUserEmail(demoEmail);
    setCurrentUsername(demoUser);
    setHasAcceptedTerms(true);

    showToast("Demo Mode bypass activated successfully! Enjoy GamerShield.", "success");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailInput.trim() || !passwordInput.trim()) {
      showToast("Please provide your login email and password.", "error");
      return;
    }

    if (isSignUp && !usernameInput.trim()) {
      showToast("Please provide a Gamer Handle / Name.", "error");
      return;
    }

    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    // Check custom hardcoded admin credential bypass
    if (cleanEmail === 'alok1303@gmail.com' && cleanPassword === 'alok1303') {
      setLoading(true);
      setTimeout(() => {
        setCurrentUserEmail('alok1303@gmail.com');
        setCurrentUsername('Admin Alok');
        
        // Persist session to local storage for automatic re-auth on refresh
        localStorage.setItem('gamershield_demo_email', 'alok1303@gmail.com');
        localStorage.setItem('gamershield_demo_username', 'Admin Alok');
        localStorage.setItem('gamershield_accepted_terms_demo', 'true');
        
        showToast("Successfully logged in as Administrator Alok!", "success");
        setHasAcceptedTerms(true);
        setLoading(false);
      }, 800);
      return;
    }

    setLoading(true);
    setAuthErrorType(null);

    try {
      if (isSignUp) {
        // Sign Up Flow
        const userCredential = await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput.trim());
        const user = userCredential.user;
        
        // Update profile displayName
        await updateProfile(user, {
          displayName: usernameInput.trim()
        });

        // Propagate states to App (keeps terms acceptance as false)
        setCurrentUserEmail(user.email || '');
        setCurrentUsername(usernameInput.trim());

        showToast("Account created successfully! Please review and agree to the covenants to continue.", "success");
      } else {
        // Log In Flow
        const userCredential = await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput.trim());
        const user = userCredential.user;

        // Propagate states to App
        setCurrentUserEmail(user.email || '');
        setCurrentUsername(user.displayName || 'Gamer_Pro');

        showToast("Successfully logged in! Please accept the platform covenants to enter.", "success");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      let errorMsg = error.message || "Authentication failed. Please check credentials.";
      if (error.code === "auth/operation-not-allowed" || (error.message && error.message.includes("operation-not-allowed"))) {
        setAuthErrorType("operation-not-allowed");
        errorMsg = "Firebase Email/Password Auth is disabled. Click the bypass option below to test with a Demo profile!";
      } else if (error.code === "auth/email-already-in-use") {
        errorMsg = "This email is already registered. Please login instead.";
      } else if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        errorMsg = "Invalid email or password. Please try again.";
      } else if (error.code === "auth/weak-password") {
        errorMsg = "Password should be at least 6 characters long.";
      } else if (error.code === "auth/invalid-email") {
        errorMsg = "Please enter a valid email address.";
      } else if (error.code === "auth/user-not-found") {
        errorMsg = "No account found with this email. Please sign up.";
      }
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAgreementSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeCheckbox) {
      showToast("You must unconditionally agree to the legal covenants to proceed.", "error");
      return;
    }

    const currentUid = auth.currentUser?.uid;
    if (currentUid) {
      localStorage.setItem(`gamershield_accepted_terms_${currentUid}`, 'true');
    }

    setHasAcceptedTerms(true);
    showToast("Legal covenants accepted! GamerShield secure escrow portal unlocked.", "success");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUserEmail('');
      setCurrentUsername('');
      setHasAcceptedTerms(false);
      showToast("Logged out successfully.", "info");
    } catch (error) {
      showToast("Failed to log out.", "error");
    }
  };

  const isUserLoggedIn = !!currentUserEmail;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-violet-600 selection:text-white relative overflow-hidden">
      
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[92vh]">
        
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-6 py-5 border-b border-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-violet-600 to-cyan-500 p-2 rounded-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider text-white uppercase block">
                GamerShield Secure Gate
              </h2>
              <span className="text-[10px] font-bold text-cyan-400 block tracking-widest uppercase">
                Operator: {LEGAL_OPERATOR} | v3.5
              </span>
            </div>
          </div>
          <span className="text-[10px] bg-slate-900 text-slate-500 border border-slate-800 px-2 py-1 rounded font-mono font-bold">
            UPDATED: {LAST_UPDATED}
          </span>
        </div>

        {/* Scrollable contents */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {!isUserLoggedIn ? (
            /* ==================== STEP 1: AUTHENTICATION ==================== */
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-violet-400" />
                  Gamer Login / Sign Up
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter your email and password to verify your player ID. In the next step, you will read and agree to Shivam Bhatt's trading covenants.
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-5">
                {/* Auth Mode Tabs */}
                <div className="flex bg-slate-950 border border-slate-850 p-1 rounded-xl">
                  <button
                    id="toggle-login-tab"
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      !isSignUp
                        ? 'bg-violet-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    Log In
                  </button>
                  <button
                    id="toggle-signup-tab"
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSignUp
                        ? 'bg-violet-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    Sign Up
                  </button>
                </div>

                {/* Inputs Form Container */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                  {isSignUp && (
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1.5 flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-500" />
                        Gamer Handle / Name
                      </label>
                      <input
                        id="gate-username-input"
                        type="text"
                        required={isSignUp}
                        placeholder="e.g. Gamer_Pro"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-200 placeholder-slate-600 transition-all font-bold"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1.5 flex items-center gap-1">
                        <LogIn className="h-3 w-3 text-slate-500" />
                        Secure Email
                      </label>
                      <input
                        id="gate-email-input"
                        type="email"
                        required
                        placeholder="player@gmail.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-200 placeholder-slate-600 transition-all font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1.5 flex items-center gap-1">
                        <Lock className="h-3 w-3 text-slate-500" />
                        Password
                      </label>
                      <input
                        id="gate-password-input"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-violet-500 text-slate-200 placeholder-slate-600 transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  id="gate-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold py-3.5 rounded-xl text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Checking Player ID...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      {isSignUp ? "Create Player Profile" : "Secure Log In"}
                    </>
                  )}
                </button>

                {authErrorType === 'operation-not-allowed' && (
                  <div className="mt-4 bg-amber-950/40 border border-amber-500/30 rounded-xl p-4 space-y-3 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-start gap-2.5 text-amber-300">
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" />
                      <div>
                        <h4 className="font-black uppercase tracking-wider text-amber-200 text-[11px]">
                          Firebase Email/Password Auth Disabled
                        </h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                          The <strong>Email/Password</strong> sign-in provider is not enabled in your Firebase project console.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-950/80 border border-slate-850 p-3 rounded-lg space-y-2 text-[10px] text-slate-400 font-mono">
                      <p className="text-white font-bold uppercase tracking-wide">How to fix this in your Firebase Console:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Open your <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-cyan-400 underline hover:text-cyan-300">Firebase Console</a></li>
                        <li>Click on <strong className="text-slate-200">Build &gt; Authentication</strong> in the left menu</li>
                        <li>Select the <strong className="text-slate-200">Sign-in method</strong> tab at the top</li>
                        <li>Click <strong className="text-slate-200">Add new provider</strong>, choose <strong className="text-slate-200">Email/Password</strong>, enable it, and save.</li>
                      </ol>
                    </div>

                    <div className="pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <span className="text-[10px] text-slate-500 font-sans font-bold uppercase tracking-wider">
                        Want to test the app right now?
                      </span>
                      <button
                        id="gate-bypass-demo-btn"
                        type="button"
                        onClick={handleEnterDemoMode}
                        className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black px-4 py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Bypass and Use Demo Mode
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          ) : (
            /* ==================== STEP 2: COVENANT AGREEMENT ==================== */
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-850">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Signed in as:</span>
                    <strong className="text-xs text-white block">{currentUsername} ({currentUserEmail})</strong>
                  </div>
                </div>
                <button
                  id="gate-change-account-btn"
                  onClick={handleLogout}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-black uppercase flex items-center gap-1 bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <LogOut className="h-3 w-3" />
                  Sign Out
                </button>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  Review & Unconditionally Accept Covenants
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Before you can access the secure escrow portal, please read the mandatory refund policies and platform covenants.
                </p>
              </div>

              <form onSubmit={handleAgreementSubmit} className="space-y-6">
                
                {/* Document Tab Switchers & Scrollable legal frame - Collapsed by default */}
                <div className="space-y-3">
                  {!showPolicies ? (
                    <div className="text-center py-2 bg-slate-950/40 rounded-xl border border-slate-850/60 p-4">
                      <button
                        id="toggle-show-policies-btn"
                        type="button"
                        onClick={() => setShowPolicies(true)}
                        className="text-xs text-violet-400 hover:text-violet-300 font-bold underline transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Read full Terms, Refund Policy & Covenants details
                      </button>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Click to review the 12 binding sections, operational fees, and Garena terms.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-slate-950/20 p-2 rounded-xl border border-slate-850/40">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-1.5 px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Documents Viewer</span>
                        <button
                          id="toggle-hide-policies-btn"
                          type="button"
                          onClick={() => setShowPolicies(false)}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer"
                        >
                          Hide Details
                        </button>
                      </div>

                      <div className="flex gap-2 border-b border-slate-850 pb-0.5">
                        <button
                          id="tab-toggle-refund"
                          type="button"
                          onClick={() => setActiveTab('refund')}
                          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'refund'
                              ? 'border-violet-500 text-white'
                              : 'border-transparent text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Cancellation & Refund Policy
                        </button>
                        <button
                          id="tab-toggle-covenants"
                          type="button"
                          onClick={() => setActiveTab('covenants')}
                          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'covenants'
                              ? 'border-violet-500 text-white'
                              : 'border-transparent text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <Shield className="h-3.5 w-3.5" />
                          Mandatory Legal Covenants (T&C)
                        </button>
                      </div>

                      {/* Scrollable Legal Frame */}
                      <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 max-h-56 overflow-y-auto space-y-4 text-[11px] leading-relaxed text-slate-400 font-mono scrollbar-thin scrollbar-thumb-slate-800">
                        {activeTab === 'refund' ? (
                          <div className="space-y-3">
                            <div className="text-amber-500 font-bold border-b border-slate-900 pb-1.5">
                              ⚠️ ABSOLUTE NON-REFUNDABLE POLICY
                            </div>
                            <p className="font-sans text-slate-300 italic">{REFUND_POLICY_INTRO}</p>
                            {REFUND_POLICY_SECTIONS.map((sec, i) => (
                              <div key={i} className="space-y-1 bg-slate-900/50 p-2.5 rounded border border-slate-900">
                                <strong className="text-slate-200 font-sans block">{sec.title}</strong>
                                <p>{sec.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="text-violet-400 font-bold border-b border-slate-900 pb-1.5">
                              ⚖️ BINDING STATUTORY COVENANTS (SECTION 1 TO 12)
                            </div>
                            <p className="font-sans text-slate-300 leading-normal text-justify">{MANDATORY_LEGAL_COVENANTS_INTRO}</p>
                            {COVENANTS_SECTIONS.map((sec, i) => (
                              <div key={i} className="space-y-1 bg-slate-900/50 p-2.5 rounded border border-slate-900">
                                <strong className="text-slate-200 font-sans block">{sec.title}</strong>
                                <p className="text-justify uppercase text-[10px] text-slate-300 font-black">{sec.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Checkbox agreement statement */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 flex items-start gap-3">
                  <input
                    id="gate-agree-checkbox"
                    type="checkbox"
                    required
                    checked={agreeCheckbox}
                    onChange={(e) => setAgreeCheckbox(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-800 bg-slate-900 text-violet-600 focus:ring-violet-500 focus:ring-offset-slate-950 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <label 
                      htmlFor="gate-agree-checkbox" 
                      className="text-[11px] font-bold text-slate-200 leading-snug block cursor-pointer select-none"
                    >
                      I have read, understood, and agree to the <span className="text-cyan-400 underline font-extrabold">Terms & Conditions</span> and the <span className="text-cyan-400 underline font-extrabold">Cancellation & Refund Policy</span>.
                    </label>
                  </div>
                </div>

                {/* Agree & Continue button */}
                <button
                  id="gate-agree-submit-btn"
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3.5 rounded-xl text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <Check className="h-4 w-4 font-black" />
                  Agree and Continue to Dashboard
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Warning Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-850 flex items-center gap-2 text-[10px] text-slate-500 leading-snug">
          <AlertCircle className="h-4 w-4 text-violet-400 shrink-0" />
          <span>
            <strong>Security Notice:</strong> All transactions are securely processed through our escrow platform to guarantee safety and transparency for both buyers and sellers.
          </span>
        </div>

      </div>
    </div>
  );
}
