import { SignIn, SignUp } from "@clerk/clerk-react";
import type { ComponentProps, RefObject } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "../../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import type { AuthTab } from "../hooks/useAuthTabState";

interface AuthFormCardProps {
  isDarkMode: boolean;
  activeTab: AuthTab;
  authErrorNotice: string | null;
  signInPaneRef: RefObject<HTMLDivElement | null>;
  onTabChange: (value: string) => void;
  onSwitchToSignup: () => void;
  clerkAppearance: {
    [key: string]: unknown;
  } & NonNullable<ComponentProps<typeof SignIn>["appearance"]>;
}

export function AuthFormCard({
  isDarkMode,
  activeTab,
  authErrorNotice,
  signInPaneRef,
  onTabChange,
  onSwitchToSignup,
  clerkAppearance,
}: AuthFormCardProps) {
  return (
    <section
      className={
        isDarkMode
          ? "rounded-3xl border border-slate-300/45 bg-slate-900/88 backdrop-blur-xl p-5 sm:p-6 shadow-2xl shadow-black/70"
          : "rounded-3xl border border-slate-200 bg-white/85 backdrop-blur-xl p-5 sm:p-6 shadow-xl shadow-slate-300/40"
      }
    >
      <div className="text-center mb-5">
        <div
          className={
            isDarkMode
              ? "w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto mb-3"
              : "w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-3"
          }
        >
          <span className="text-slate-900 font-black text-lg">SS</span>
        </div>
        <h2 className={isDarkMode ? "text-2xl font-bold text-white" : "text-2xl font-bold text-slate-900"}>Welcome</h2>
        <p className={isDarkMode ? "text-sm text-slate-100 mt-1" : "text-sm text-slate-600 mt-1"}>
          Sign in or create an account to continue
        </p>
      </div>

      {authErrorNotice && (
        <div
          className={
            isDarkMode
              ? "mb-4 rounded-xl border border-amber-300/50 bg-amber-200/10 px-4 py-3 text-sm text-amber-100"
              : "mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          }
        >
          <p>{authErrorNotice}</p>
          <Button
            type="button"
            onClick={onSwitchToSignup}
            className="mt-2 h-8 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-slate-950 hover:bg-amber-400"
          >
            Switch to Sign Up
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList
          className={
            isDarkMode
              ? "grid w-full grid-cols-2 rounded-xl bg-slate-700/90 p-1 border border-slate-300/40"
              : "grid w-full grid-cols-2 rounded-xl bg-slate-100 p-1"
          }
        >
          <TabsTrigger
            value="signin"
            className={
              isDarkMode
                ? "rounded-lg data-[state=active]:bg-amber-300 data-[state=active]:text-slate-950 text-slate-100"
                : "rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600"
            }
          >
            Sign In
          </TabsTrigger>
          <TabsTrigger
            value="signup"
            className={
              isDarkMode
                ? "rounded-lg data-[state=active]:bg-amber-300 data-[state=active]:text-slate-950 text-slate-100"
                : "rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600"
            }
          >
            Sign Up
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="mt-5">
          <h3
            className={
              isDarkMode
                ? "mb-3 flex items-center gap-2 text-lg font-semibold text-white"
                : "mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900"
            }
          >
            <LogIn className={isDarkMode ? "w-5 h-5 text-orange-300" : "w-5 h-5 text-orange-600"} />
            Sign In
          </h3>
          <div ref={signInPaneRef}>
            <SignIn appearance={clerkAppearance} />
          </div>
        </TabsContent>

        <TabsContent value="signup" className="mt-5">
          <h3
            className={
              isDarkMode
                ? "mb-3 flex items-center gap-2 text-lg font-semibold text-white"
                : "mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900"
            }
          >
            <UserPlus className={isDarkMode ? "w-5 h-5 text-orange-300" : "w-5 h-5 text-orange-600"} />
            Create Account
          </h3>
          <SignUp appearance={clerkAppearance} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
