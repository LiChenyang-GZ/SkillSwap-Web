import { Button } from "../../ui/button";
import type { NavigationPrimaryLinksProps } from "../models/navigationViewModel";

export function NavigationPrimaryLinks({
  items,
  currentPage,
  onNavigate,
  isMobile = false,
}: NavigationPrimaryLinksProps) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.key;
        return (
          <Button
            key={item.key}
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onNavigate(item)}
            className={
              isMobile
                ? `w-full justify-start flex items-center space-x-3 ${isActive ? "" : "text-muted-foreground hover:text-foreground"}`
                : `flex items-center gap-2 ${isActive ? "" : "text-muted-foreground hover:text-foreground"}`
            }
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{item.label}</span>
          </Button>
        );
      })}
    </>
  );
}
