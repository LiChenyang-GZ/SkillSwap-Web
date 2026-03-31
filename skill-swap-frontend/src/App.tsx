import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { Navigation } from './components/Navigation';
import { HeroPage } from './components/Hero';
import { HomePage } from './components/HomePage';
import { ExploreWorkshops } from './components/ExploreWorkshops';
import { PastWorkshops } from './components/PastWorkshops';
import { Dashboard } from './components/Dashboard';
import { CreateWorkshop } from './components/CreateWorkshop';
import { AuthPage } from './components/AuthPage';
import { WorkshopDetails } from './components/WorkshopDetails';
import { AdminReview } from './components/AdminReview';
import { Notifications } from './components/Notifications';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { currentPage, isLoading, isDarkMode, isAuthenticated, refreshData } = useApp();

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
    // 仅在依赖 workshop 列表的页面切换时按需拉取最新数据。
    if (
      currentPage === 'home' ||
      currentPage === 'explore' ||
      currentPage === 'dashboard' ||
      currentPage === 'pastWorkshops'
    ) {
      void refreshData();
    }
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
      case 'pastWorkshops':
        return <PastWorkshops />;
      case 'adminReview':
        return <AdminReview />;
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
        {renderPage()}
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
