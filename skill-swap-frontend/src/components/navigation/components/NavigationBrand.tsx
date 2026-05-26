import type { NavigationBrandProps } from "../models/navigationViewModel";

const BRAND_LOGO_SRC = "/brand/fox-logo.png";

export function NavigationBrand({ compact = false }: NavigationBrandProps) {
  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-7 h-7 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
          <img src={BRAND_LOGO_SRC} alt="Skill Swap Club" className="h-full w-full object-cover" />
        </div>
        <h1 className="text-lg font-semibold">Skill Swap</h1>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
        <img src={BRAND_LOGO_SRC} alt="Skill Swap Club" className="h-full w-full object-cover" />
      </div>
      <h1 className="text-xl font-semibold">Skill Swap Club</h1>
    </div>
  );
}
