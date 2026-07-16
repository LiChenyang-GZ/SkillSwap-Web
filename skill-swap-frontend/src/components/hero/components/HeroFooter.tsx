export function HeroFooter() {
  return (
    <footer className="border-t border-foreground/10 px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <img src="/brand/fox-logo.png" alt="" className="h-9 w-9 rounded-xl" />
          <span className="font-semibold text-foreground">SkillSwap</span>
        </div>
        <p>Learn generously. Teach curiously. Connect respectfully.</p>
        <p>Made in Sydney</p>
      </div>
    </footer>
  );
}
