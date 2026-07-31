import type { NavigationBrandProps } from "../models/navigationViewModel";

const BRAND_LOGO_SRC = "/brand/fox-logo.png";

export function NavigationBrand({ compact = false, onClick }: NavigationBrandProps) {
  const content = (
    <>
      <div
        className={`${compact ? "w-7 h-7" : "w-8 h-8"} bg-secondary rounded-full flex items-center justify-center overflow-hidden`}
      >
        <img src={BRAND_LOGO_SRC} alt="Skill Swap Club" className="h-full w-full object-cover" />
      </div>
      <h1 className={compact ? "text-lg font-semibold" : "text-xl font-semibold"}>
        {compact ? "Skill Swap" : "Skill Swap Club"}
      </h1>
    </>
  );

  const layoutClass = `flex items-center ${compact ? "space-x-2" : "space-x-3"}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Go to SkillSwap home"
        className={`${layoutClass} rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        {content}
      </button>
    );
  }

  return <div className={layoutClass}>{content}</div>;
}
