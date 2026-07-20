import { SignIn, SignUp } from "@clerk/clerk-react";
import type { ComponentProps, RefObject } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "../../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import type { AuthTab } from "../hooks/useAuthTabState";

interface AuthFormCardProps {
  activeTab: AuthTab;
  authErrorNotice: string | null;
  signInPaneRef: RefObject<HTMLDivElement>;
  onTabChange: (value: string) => void;
  onSwitchToSignup: () => void;
  clerkAppearance: {
    [key: string]: unknown;
  } & NonNullable<ComponentProps<typeof SignIn>["appearance"]>;
}

const BRAND_LOGO_SRC = "/brand/fox-logo.png";

export function AuthFormCard({
  activeTab,
  authErrorNotice,
  signInPaneRef,
  onTabChange,
  onSwitchToSignup,
  clerkAppearance,
}: AuthFormCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/85 backdrop-blur-xl p-5 sm:p-6 shadow-xl shadow-slate-300/40">
      <div className="text-center mb-5">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-3 overflow-hidden">
          <img src={BRAND_LOGO_SRC} alt="Skill Swap Club" className="h-full w-full object-cover" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Welcome</h2>
        <p className="text-sm text-slate-600 mt-1">
          Sign in or create an account to continue
        </p>
      </div>

      {authErrorNotice && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100 p-1">
          <TabsTrigger
            value="signin"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600"
          >
            Sign In
          </TabsTrigger>
          <TabsTrigger
            value="signup"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600"
          >
            Sign Up
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="mt-5">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <LogIn className="w-5 h-5 text-orange-600" />
            Sign In
          </h3>
          <div ref={signInPaneRef}>
            <SignIn appearance={clerkAppearance} />
          </div>
        </TabsContent>

        <TabsContent value="signup" className="mt-5">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <UserPlus className="w-5 h-5 text-orange-600" />
            Create Account
          </h3>
          <SignUp appearance={clerkAppearance} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
