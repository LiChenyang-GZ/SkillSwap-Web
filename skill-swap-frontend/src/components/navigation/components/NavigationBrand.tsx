import type { NavigationBrandProps } from "../models/navigationViewModel";

const BRAND_LOGO_SRC = "/brand/fox-logo.png";

export function NavigationBrand({ compact = false, onClick }: NavigationBrandProps) {
  const content = (
    <>
      <div
        className={`${compact ? "h-9 w-9" : "h-10 w-10"} overflow-hidden rounded-xl bg-secondary shadow-sm`}
      >
        <img src={BRAND_LOGO_SRC} alt="" className="h-full w-full object-cover" />
      </div>
      <span className="ml-3 text-lg font-bold tracking-tight text-foreground">SkillSwap</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Go to SkillSwap home"
        className="flex items-center rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </button>
    );
  }

  return <div className="flex items-center">{content}</div>;
}
