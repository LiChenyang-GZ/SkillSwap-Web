import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { NAVIGATION_PAGE_KEYS } from "../constants/navigationPageKeys";
import type { NavigationUserMenuProps } from "../models/navigationViewModel";
import { selectVisibleMenuEntries } from "../utils/navigationMenuUtils";
import { getUserInitials } from "../utils/navigationUserUtils";
import { NavigationMenuEntryIcon } from "./NavigationMenuEntryIcon";

export function NavigationUserMenu({
  user,
  isAdmin,
  isAuthenticated,
  notificationsUnreadCount,
  onNavigate,
  onSignOut,
  onPreloadCreate,
}: NavigationUserMenuProps) {
  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(NAVIGATION_PAGE_KEYS.auth)}
        className="text-muted-foreground hover:text-foreground"
      >
        Sign In
      </Button>
    );
  }

  return (
      <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Open user menu for ${user.username}`} className="flex items-center space-x-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.avatarUrl} alt={user.username} />
            <AvatarFallback>{getUserInitials(user.username)}</AvatarFallback>
          </Avatar>
          <div className="hidden xl:block text-left">
            <p className="text-sm font-medium">{user.username}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {selectVisibleMenuEntries(isAdmin).map((entry) => (
          <DropdownMenuItem
            key={entry.page}
            onMouseEnter={entry.preload ? onPreloadCreate : undefined}
            onFocus={entry.preload ? onPreloadCreate : undefined}
            onClick={() => onNavigate(entry.page)}
          >
            <NavigationMenuEntryIcon entry={entry} notificationsUnreadCount={notificationsUnreadCount} />
            {entry.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {isAuthenticated ? (
          <DropdownMenuItem variant="destructive" onClick={onSignOut}>
            Sign Out
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onNavigate(NAVIGATION_PAGE_KEYS.auth)}>Sign In</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
