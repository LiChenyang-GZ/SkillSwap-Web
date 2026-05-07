import { LayoutDashboard, PenSquare, Plus, ShieldCheck } from "lucide-react";
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
import { getUserInitials } from "../utils/navigationUserUtils";
import { NavigationNotificationDot } from "./NavigationNotificationDot";

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
      <Button variant="default" size="sm" onClick={() => onNavigate(NAVIGATION_PAGE_KEYS.auth)}>
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
        <DropdownMenuItem onClick={() => onNavigate(NAVIGATION_PAGE_KEYS.dashboard)}>
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem
          onMouseEnter={onPreloadCreate}
          onFocus={onPreloadCreate}
          onClick={() => onNavigate(NAVIGATION_PAGE_KEYS.create)}
        >
          <Plus className="w-4 h-4" />
          Host a Workshop
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNavigate(NAVIGATION_PAGE_KEYS.notifications)}>
          <NavigationNotificationDot unreadCount={notificationsUnreadCount} />
          Notifications
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => onNavigate(NAVIGATION_PAGE_KEYS.adminReview)}>
            <ShieldCheck className="w-4 h-4" />
            Admin Review
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem onClick={() => onNavigate(NAVIGATION_PAGE_KEYS.adminMemory)}>
            <PenSquare className="w-4 h-4" />
            Memory Studio
          </DropdownMenuItem>
        )}
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
