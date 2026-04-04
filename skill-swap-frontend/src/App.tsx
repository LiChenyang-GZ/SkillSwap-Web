import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { Navigation } from './components/Navigation';
import { Toaster } from './components/ui/sonner';

const HeroPage = React.lazy(() => import('./components/Hero').then((m) => ({ default: m.HeroPage })));
const HomePage = React.lazy(() => import('./components/HomePage').then((m) => ({ default: m.HomePage })));
const ExploreWorkshops = React.lazy(() => import('./components/workshop/ExploreWorkshopsPage').then((m) => ({ default: m.ExploreWorkshops })));
const Memory = React.lazy(() => import('./components/Memory').then((m) => ({ default: m.Memory })));
const Dashboard = React.lazy(() => import('./components/Dashboard').then((m) => ({ default: m.Dashboard })));
const CreateWorkshop = React.lazy(() => import('./components/create-workshop/CreateWorkshopPage').then((m) => ({ default: m.CreateWorkshopPage })));
const AuthPage = React.lazy(() => import('./components/AuthPage').then((m) => ({ default: m.AuthPage })));
const WorkshopDetails = React.lazy(() => import('./components/workshop/WorkshopDetailsPage').then((m) => ({ default: m.WorkshopDetails })));
const MemoryDetail = React.lazy(() => import('./components/MemoryDetail.tsx').then((m) => ({ default: m.MemoryDetail })));
const AdminReview = React.lazy(() => import('./components/AdminReview').then((m) => ({ default: m.AdminReview })));
const MemoryStudio = React.lazy(() => import('./components/MemoryStudio.tsx').then((m) => ({ default: m.MemoryStudio })));
const Notifications = React.lazy(() => import('./components/Notifications').then((m) => ({ default: m.Notifications })));

function AppContent() {
  const { currentPage, isLoading, isDarkMode, isAuthenticated, refreshData } = useApp();
  const lastAutoRefreshPageRef = React.useRef<string | null>(null);

  // Apply theme class to html element
  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  React.useEffect(() => {
    const previousPage = lastAutoRefreshPageRef.current;
    if (previousPage === currentPage) {
      return;
    }
    lastAutoRefreshPageRef.current = currentPage;

    const isPublicPage = currentPage === 'home' || currentPage === 'explore';
    const wasPublicPage = previousPage === 'home' || previousPage === 'explore';

    // 首页/探索页只拉公开列表，避免额外个人数据请求拖慢首屏。
    if (isPublicPage) {
      // Home 与 Explore 共享同一批 public 数据，互相切换时不重复请求。
      if (wasPublicPage) {
        return;
      }
      void refreshData('public');
      return;
    }

    // Dashboard 仅拉 mine，避免 create 跳转后同时请求 public + mine。
    if (currentPage === 'dashboard') {
      void refreshData('mine');
      return;
    }

    // Memory 页面使用独立的 memory API，不依赖 workshop 列表。
  }, [currentPage, refreshData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-xl">SS</span>
          </div>
          <p className="text-muted-foreground">Loading Skill Swap Club...</p>
        </div>
      </div>
    );
  }

  // Page Switcher - Return HeroPage by default for non-authenticated users
  const renderPage = () => {
    // Check if currentPage is a workshop detail page (workshop-{id})
    if (currentPage.startsWith('workshop-')) {
      const workshopId = currentPage.substring('workshop-'.length);
      return <WorkshopDetails workshopId={workshopId} />;
    }

    if (currentPage.startsWith('memory-entry-')) {
      const slug = currentPage.substring('memory-entry-'.length);
      return <MemoryDetail slug={slug} />;
    }

    switch (currentPage) {
      case 'hero':
        return <HeroPage />;
      case 'home':
        return <HomePage />;
      case 'explore':
        return <ExploreWorkshops />;
      case 'dashboard':
        return <Dashboard />;
      case 'credits':
        // 积分系统已停用：原本跳转 Credits 页面。
        // return <Credits />;
        return <Dashboard />;
      case 'create':
        return <CreateWorkshop />;
      case 'auth':
        return <AuthPage />;
      case 'memory':
        return <Memory />;
      case 'adminReview':
        return <AdminReview />;
      case 'adminMemory':
        return <MemoryStudio />;
      case 'notifications':
        return <Notifications />;
      case 'feedback':
        return <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Feedback & Reviews</h1>
            <p className="text-muted-foreground">Coming soon! Rate workshops and provide feedback.</p>
          </div>
        </div>;
      default:
        // Show Hero page for non-authenticated users, Home page for authenticated users
        return isAuthenticated ? <HomePage /> : <HeroPage />;
    }
  };

  // Show navigation only if not on hero/auth page or if user is authenticated
  const showNavigation = (currentPage !== 'hero' && currentPage !== 'auth') || isAuthenticated;

  return (
    <div className="min-h-screen bg-background">
      {showNavigation && <Navigation />}
      <main>
        <React.Suspense
          fallback={
            <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
              <p className="text-muted-foreground">Loading page...</p>
            </div>
          }
        >
          {renderPage()}
        </React.Suspense>
      </main>
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
