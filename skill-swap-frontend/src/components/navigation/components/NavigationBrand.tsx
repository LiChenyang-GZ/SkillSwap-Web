import type { NavigationBrandProps } from "../models/navigationViewModel";

export function NavigationBrand({ compact = false }: NavigationBrandProps) {
  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-7 h-7 bg-secondary rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">SS</span>
        </div>
        <h1 className="text-lg font-semibold">Skill Swap</h1>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">SS</span>
      </div>
      <h1 className="text-xl font-semibold">Skill Swap Club</h1>
    </div>
  );
}
