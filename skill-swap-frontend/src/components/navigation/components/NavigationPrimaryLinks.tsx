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
        return (
          <Button
            key={item.id}
            variant={currentPage === item.id ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onNavigate(item.id)}
            className={
              isMobile
                ? `w-full justify-start flex items-center space-x-3 ${currentPage === item.id ? "" : "text-muted-foreground hover:text-foreground"}`
                : `flex items-center space-x-2 ${currentPage === item.id ? "" : "text-muted-foreground hover:text-foreground"}`
            }
          >
            <Icon className="w-4 h-4" />
            {isMobile ? <span>{item.label}</span> : <span className="hidden xl:inline">{item.label}</span>}
          </Button>
        );
      })}
    </>
  );
}
