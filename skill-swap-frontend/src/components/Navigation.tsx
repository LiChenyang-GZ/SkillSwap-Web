import { useApp } from '../contexts/AppContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  Search,
  LayoutDashboard,
  History,
  MessageSquare,
  Bell,
  Target,
  ShieldCheck,
  PenSquare,
  Moon,
  Sun,
  Menu,
  X,
  Plus
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const navItems = [
  // { id: 'home', label: 'Home', icon: Home },
  { id: 'explore', label: 'Explore', icon: Search },
  { id: 'memory', label: 'Memory', icon: History },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
];

export function Navigation() {
  const {
    user,
    currentPage,
    setCurrentPage,
    isDarkMode,
    toggleDarkMode,
    isAuthenticated,
    isAdmin,
    notificationsUnreadCount,
    signOut
  } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const fullNavItems = navItems;

  const preloadCreateWorkshopPage = useCallback(() => {
    void import('./create-workshop/CreateWorkshopPage');
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = window.setTimeout(() => {
      preloadCreateWorkshopPage();
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isAuthenticated, preloadCreateWorkshopPage]);

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SS</span>
            </div>
            <h1 className="text-xl font-semibold">Skill Swap Club</h1>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {fullNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentPage === item.id ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentPage(item.id)}
                  className={`flex items-center space-x-2 ${currentPage === item.id ? "" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden xl:inline">{item.label}</span>
                </Button>
              );
            })}
          </div>

          {/* User Section */}
          <div className="flex items-center space-x-4">
            {/* 积分系统已停用：导航栏不再展示积分入口�?*/}
            {/*
            {user && (
              <Badge 
                variant="secondary" 
                className="flex items-center space-x-1 cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => setCurrentPage('credits')}
              >
                <CreditCard className="w-3 h-3" />
                <span>{user.creditBalance}</span>
              </Badge>
            )}
            */}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className="w-9 h-9 p-0"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {user ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatarUrl} alt={user.username} />
                      <AvatarFallback>{user.username.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="hidden xl:block text-left">
                      <p className="text-sm font-medium">{user.username}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCurrentPage('dashboard')}>
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onMouseEnter={preloadCreateWorkshopPage}
                    onFocus={preloadCreateWorkshopPage}
                    onClick={() => setCurrentPage('create')}
                  >
                    <Plus className="w-4 h-4" />
                    Host a Workshop
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCurrentPage('notifications')}>
                    <div className="relative">
                      <Bell className="w-4 h-4" />
                      {notificationsUnreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </div>
                    Notifications
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => setCurrentPage('adminReview')}>
                      <ShieldCheck className="w-4 h-4" />
                      Admin Review
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => setCurrentPage('adminMemory')}>
                      <PenSquare className="w-4 h-4" />
                      Memory Studio
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {isAuthenticated ? (
                    <DropdownMenuItem variant="destructive" onClick={signOut}>
                      Sign Out
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setCurrentPage('auth')}>
                      Sign In
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setCurrentPage('auth')}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-secondary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">SS</span>
            </div>
            <h1 className="text-lg font-semibold">Skill Swap</h1>
          </div>

          <div className="flex items-center space-x-3">
            {/* 积分系统已停用：移动端导航不再展示积分入口�?*/}
            {/*
            {user && (
              <Badge 
                variant="secondary" 
                className="flex items-center space-x-1 text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => setCurrentPage('credits')}
              >
                <CreditCard className="w-3 h-3" />
                <span>{user.creditBalance}</span>
              </Badge>
            )}
            */}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-8 h-8 p-0"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-background border-b border-border">
            <div className="px-4 py-4 space-y-2">
              {fullNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={currentPage === item.id ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setCurrentPage(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full justify-start flex items-center space-x-3 ${currentPage === item.id ? "" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Button>
                );
              })}
              
              <div className="pt-3 border-t border-border">
                {user && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentPage('dashboard');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start flex items-center space-x-3"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        preloadCreateWorkshopPage();
                        setCurrentPage('create');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start flex items-center space-x-3"
                    >
                      <Target className="w-4 h-4" />
                      <span>Host a Workshop</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentPage('notifications');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start flex items-center space-x-3"
                    >
                      <div className="relative">
                        <Bell className="w-4 h-4" />
                        {notificationsUnreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                        )}
                      </div>
                      <span>Notifications</span>
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCurrentPage('adminReview');
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full justify-start flex items-center space-x-3"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Admin Review</span>
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCurrentPage('adminMemory');
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full justify-start flex items-center space-x-3"
                      >
                        <PenSquare className="w-4 h-4" />
                        <span>Memory Studio</span>
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleDarkMode}
                  className="w-full justify-start flex items-center space-x-3"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </Button>
                
                {isAuthenticated ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full justify-start flex items-center space-x-3"
                  >
                    <span>Sign Out</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCurrentPage('auth');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full justify-start flex items-center space-x-3"
                  >
                    <span>Sign In</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

