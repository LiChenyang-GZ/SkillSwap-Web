import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, GraduationCap, LogOut, Users } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../../../contexts/AppContext";
import type { UniversityCode } from "../../../types/user";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { UniversityFields } from "../components/UniversityFields";

const BENEFITS = [
  "Find workshops and people around your campus",
  "Get more relevant skill recommendations",
  "Help build a trusted student community",
];

export function UniversityOnboardingScreen() {
  const { signOut, setCurrentPage, updateCurrentUserProfile, user } = useApp();
  const [universityCode, setUniversityCode] = useState<UniversityCode | "">(user?.universityCode || "");
  const [universityName, setUniversityName] = useState(user?.universityName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!universityCode) {
      setError("Please select your university.");
      return;
    }

    const normalizedName = universityName.trim().replace(/\s+/g, " ");
    if (universityCode === "OTHER" && normalizedName.length < 2) {
      setError("Please enter your university name.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await updateCurrentUserProfile({
        universityCode,
        universityName: universityCode === "OTHER" ? normalizedName : undefined,
      });
      toast.success("Your campus has been added.");
      setCurrentPage("explore");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save your university.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,rgba(229,152,46,0.24),transparent_32%),radial-gradient(circle_at_90%_85%,rgba(184,51,43,0.16),transparent_34%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <button type="button" className="flex items-center gap-3" onClick={() => setCurrentPage("hero")}>
            <img src="/brand/fox-logo.png" alt="" className="h-11 w-11 rounded-2xl" />
            <span className="text-xl font-bold tracking-tight">SkillSwap</span>
          </button>
          <Button type="button" variant="ghost" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>

        <div className="grid items-center gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/15 px-4 py-2 text-sm font-semibold text-foreground">
              <GraduationCap className="h-4 w-4 text-secondary" /> One last step
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">Which university community are you part of?</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Your university helps us make SkillSwap more local, useful and connected. You can update it later from your profile.
            </p>
            <div className="mt-8 space-y-4">
              {BENEFITS.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-secondary" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <Card className="gap-0 rounded-[2rem] border-foreground/10 bg-card p-6 shadow-2xl shadow-primary/10 sm:p-9">
            <div className="flex items-start gap-4 border-b border-foreground/10 pb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Users className="h-6 w-6" /></div>
              <div>
                <h2 className="text-2xl font-semibold">Welcome, {user.username}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose your campus to finish setting up your account.</p>
              </div>
            </div>

            <form onSubmit={(event) => void handleSubmit(event)} className="mt-7 space-y-6">
              <UniversityFields
                idPrefix="onboarding"
                universityCode={universityCode}
                universityName={universityName}
                disabled={isSaving}
                onUniversityCodeChange={setUniversityCode}
                onUniversityNameChange={setUniversityName}
              />

              {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

              <Button type="submit" size="lg" disabled={isSaving} className="h-12 w-full rounded-full text-base">
                {isSaving ? "Saving your campus..." : "Continue to SkillSwap"}
                {!isSaving && <ArrowRight className="h-5 w-5" />}
              </Button>
              <p className="text-center text-xs text-muted-foreground">We only use this to improve campus discovery and matching.</p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
