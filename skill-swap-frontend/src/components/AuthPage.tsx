import { useEffect } from 'react';
import { useState } from 'react';
import { SignIn, SignUp, useAuth } from '@clerk/clerk-react';
import { useApp } from '../contexts/AppContext';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  LogIn, 
  UserPlus, 
  ArrowLeft,
  Sun,
  Moon
} from 'lucide-react';

export function AuthPage() {
  const { setCurrentPage, isDarkMode, toggleDarkMode } = useApp();
  const { isLoaded, isSignedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [authErrorNotice, setAuthErrorNotice] = useState<string | null>(null);
  const handleAuthTabChange = (value: string) => {
    if (value === 'signin' || value === 'signup') {
      setActiveTab(value);
    }
  };

  const clerkAppearance = {
    layout: {
      unsafe_disableDevelopmentModeWarnings: true,
    },
    variables: isDarkMode
      ? {
          colorPrimary: '#f59e0b',
          colorBackground: 'transparent',
          colorText: '#ffffff',
          colorInputBackground: 'rgba(30,41,59,0.95)',
          colorInputText: '#ffffff',
          colorNeutral: '#cbd5e1',
          colorDanger: '#fda4af',
          borderRadius: '0.75rem',
        }
      : {
          colorPrimary: '#ea580c',
          colorBackground: 'transparent',
          colorText: '#0f172a',
          colorInputBackground: 'rgba(15,23,42,0.03)',
          colorInputText: '#0f172a',
          colorNeutral: '#475569',
          colorDanger: '#e11d48',
          borderRadius: '0.75rem',
        },
    elements: {
      rootBox: 'w-full',
      cardBox: 'w-full shadow-none',
      card: 'w-full bg-transparent shadow-none border-0 p-0',
      headerTitle: 'hidden',
      headerSubtitle: 'hidden',
      socialButtonsBlockButton:
        isDarkMode
          ? 'h-11 rounded-xl border border-slate-300/60 bg-slate-700 text-white hover:bg-slate-600 transition'
          : 'h-11 rounded-xl border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 transition',
      socialButtonsBlockButtonText: isDarkMode ? 'text-sm font-medium text-white' : 'text-sm font-medium text-slate-900',
      dividerLine: isDarkMode ? 'bg-slate-300/50' : 'bg-slate-300',
      dividerText: isDarkMode ? 'text-slate-100 text-xs' : 'text-slate-500 text-xs',
      formFieldLabel: isDarkMode ? 'text-slate-100 text-sm font-medium' : 'text-slate-700 text-sm',
      formFieldInput:
        isDarkMode
          ? 'h-11 rounded-xl border border-slate-300/60 bg-slate-700 text-white placeholder:text-slate-200/95 focus:border-amber-300 focus:ring-0'
          : 'h-11 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:ring-0',
      formButtonPrimary:
        isDarkMode
          ? 'h-11 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition'
          : 'h-11 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-500 transition',
      identityPreviewText: isDarkMode ? 'text-slate-300' : 'text-slate-600',
      formResendCodeLink: isDarkMode ? 'text-orange-300 hover:text-orange-200' : 'text-orange-600 hover:text-orange-500',
      otpCodeFieldInput:
        isDarkMode
          ? 'rounded-xl border border-slate-300/60 bg-slate-700 text-white focus:border-amber-300'
          : 'rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-orange-500',
      alertText: isDarkMode ? 'text-rose-300 text-sm' : 'text-rose-600 text-sm',
      formFieldErrorText: isDarkMode ? 'text-rose-300 text-xs' : 'text-rose-600 text-xs',
      footer: '!hidden',
      footerAction: '!hidden',
      // Fallback selectors for current Clerk DOM variants.
      formFooterAction: '!hidden',
      formFooterActionText: '!hidden',
      formFooterActionLink: '!hidden',
      footerActionText: '!hidden',
      footerActionLink: '!hidden',
      formFieldSuccessText: isDarkMode ? 'text-emerald-300 text-xs' : 'text-emerald-600 text-xs',
    },
  } as const;

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      setCurrentPage('explore');
    }
  }, [isLoaded, isSignedIn, setCurrentPage]);

  useEffect(() => {
    const message = sessionStorage.getItem('skill_swap_auth_error');
    if (!message) return;
    setAuthErrorNotice(message);
    setActiveTab('signup');
    sessionStorage.removeItem('skill_swap_auth_error');
  }, []);

  return (
    <div
      className={
        isDarkMode
          ? 'min-h-screen bg-[radial-gradient(1200px_520px_at_15%_0%,rgba(245,158,11,0.28),transparent),linear-gradient(135deg,#020617_0%,#0f172a_45%,#1e293b_100%)] pt-20 lg:pt-24'
          : 'min-h-screen bg-[radial-gradient(1100px_420px_at_10%_0%,rgba(251,146,60,0.25),transparent),linear-gradient(135deg,#fff7ed_0%,#f8fafc_55%,#eef2ff_100%)] pt-20 lg:pt-24'
      }
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setCurrentPage('hero')}
            className={isDarkMode ? 'flex items-center gap-2 text-slate-300 hover:text-white' : 'flex items-center gap-2 text-slate-700 hover:text-slate-900'}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <Button
            variant="outline"
            onClick={toggleDarkMode}
            className={
              isDarkMode
                ? 'border-slate-300/60 bg-slate-700/90 text-white hover:bg-slate-600'
                : 'border-slate-300 bg-white/70 text-slate-900 hover:bg-white'
            }
          >
            {isDarkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] items-start">
          <section className={isDarkMode ? 'text-white' : 'text-slate-900'}>
            <p className={isDarkMode
              ? 'inline-flex items-center rounded-full border border-orange-300/30 bg-orange-400/15 px-3 py-1 text-xs tracking-wide text-orange-100'
              : 'inline-flex items-center rounded-full border border-orange-300/50 bg-orange-100 px-3 py-1 text-xs tracking-wide text-orange-700'}>
              SKILL SWAP CLUB
            </p>
            <h1 className="mt-4 text-4xl lg:text-5xl font-black leading-tight">
              Learn together,
              <br />
              teach each other.
            </h1>
            <p className={isDarkMode ? 'mt-4 max-w-md text-slate-200/90' : 'mt-4 max-w-md text-slate-700'}>
              Join workshops, share practical skills, and connect with people who are excited to build with you.
            </p>
          </section>

          <section className={
            isDarkMode
              ? 'rounded-3xl border border-slate-300/45 bg-slate-900/88 backdrop-blur-xl p-5 sm:p-6 shadow-2xl shadow-black/70'
              : 'rounded-3xl border border-slate-200 bg-white/85 backdrop-blur-xl p-5 sm:p-6 shadow-xl shadow-slate-300/40'
          }>
            <div className="text-center mb-5">
              <div className={
                isDarkMode
                  ? 'w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto mb-3'
                  : 'w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-3'
              }>
                <span className="text-slate-900 font-black text-lg">SS</span>
              </div>
              <h2 className={isDarkMode ? 'text-2xl font-bold text-white' : 'text-2xl font-bold text-slate-900'}>Welcome</h2>
              <p className={isDarkMode ? 'text-sm text-slate-100 mt-1' : 'text-sm text-slate-600 mt-1'}>Sign in or create an account to continue</p>
            </div>

            {authErrorNotice && (
              <div className={isDarkMode
                ? 'mb-4 rounded-xl border border-amber-300/50 bg-amber-200/10 px-4 py-3 text-sm text-amber-100'
                : 'mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900'}>
                <p>{authErrorNotice}</p>
                <Button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className="mt-2 h-8 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-slate-950 hover:bg-amber-400"
                >
                  Switch to Sign Up
                </Button>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={handleAuthTabChange} className="w-full">
              <TabsList className={
                isDarkMode
                  ? 'grid w-full grid-cols-2 rounded-xl bg-slate-700/90 p-1 border border-slate-300/40'
                  : 'grid w-full grid-cols-2 rounded-xl bg-slate-100 p-1'
              }>
                <TabsTrigger
                  value="signin"
                  className={
                    isDarkMode
                      ? 'rounded-lg data-[state=active]:bg-amber-300 data-[state=active]:text-slate-950 text-slate-100'
                      : 'rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600'
                  }
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className={
                    isDarkMode
                      ? 'rounded-lg data-[state=active]:bg-amber-300 data-[state=active]:text-slate-950 text-slate-100'
                      : 'rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600'
                  }
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-5">
                <h3 className={isDarkMode ? 'mb-3 flex items-center gap-2 text-lg font-semibold text-white' : 'mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900'}>
                  <LogIn className={isDarkMode ? 'w-5 h-5 text-orange-300' : 'w-5 h-5 text-orange-600'} />
                  Sign In
                </h3>
                <SignIn appearance={clerkAppearance} />
              </TabsContent>

              <TabsContent value="signup" className="mt-5">
                <h3 className={isDarkMode ? 'mb-3 flex items-center gap-2 text-lg font-semibold text-white' : 'mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900'}>
                  <UserPlus className={isDarkMode ? 'w-5 h-5 text-orange-300' : 'w-5 h-5 text-orange-600'} />
                  Create Account
                </h3>
                <SignUp appearance={clerkAppearance} />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
    </div>
  );
}
