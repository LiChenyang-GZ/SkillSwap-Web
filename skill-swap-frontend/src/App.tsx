import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { NavigationScreen } from './components/navigation/screen/NavigationScreen';
import { Toaster } from './components/ui/sonner';
import { MEMORY_ENTRY_PAGE_PREFIX } from './components/memory/constants/memoryRouteConstants';
import { AuthScreen } from './components/auth/screen/AuthScreen';
import { HeroScreen } from './components/hero/screen/HeroScreen';
import { MemoryScreen as Memory } from './components/memory/screen/MemoryScreen';
import { ExploreWorkshopsScreen as ExploreWorkshops } from './components/workshop/screen/ExploreWorkshopsScreen';

const HomePage = React.lazy(() => import('./components/archive/HomePage').then((m) => ({ default: m.HomePage })));
const Dashboard = React.lazy(() =>
  import('./components/dashboard/screen/DashboardScreen').then((m) => ({ default: m.DashboardScreen }))
);
const CreateWorkshop = React.lazy(() =>
  import('./components/create-workshop/screen/CreateWorkshopScreen').then((m) => ({ default: m.CreateWorkshopScreen }))
);
const WorkshopDetails = React.lazy(() =>
  import('./components/workshop/screen/WorkshopDetailsScreen').then((m) => ({ default: m.WorkshopDetailsScreen }))
);
const MemoryDetail = React.lazy(() =>
  import('./components/memory/screen/MemoryDetailScreen').then((m) => ({ default: m.MemoryDetailScreen }))
);
const AdminReview = React.lazy(() =>
  import('./components/adminReview/screen/AdminReviewScreen').then((m) => ({ default: m.AdminReviewScreen }))
);
const MemoryStudio = React.lazy(() =>
  import('./components/memory/screen/MemoryStudioScreen').then((m) => ({ default: m.MemoryStudioScreen }))
);
const Notifications = React.lazy(() =>
  import('./components/notifications/screen/NotificationsScreen').then((m) => ({ default: m.NotificationsScreen }))
);
const CampusExpansion = React.lazy(() =>
  import('./components/campus/screen/CampusExpansionScreen').then((m) => ({ default: m.CampusExpansionScreen }))
);
const UniversityOnboarding = React.lazy(() =>
  import('./components/onboarding/screen/UniversityOnboardingScreen').then((m) => ({ default: m.UniversityOnboardingScreen }))
);

const LOADING_FOX_SRC = '/brand/fox-empty-search.png';

function AppContent() {
  const { currentPage, isLoading, isAuthenticated, refreshData, setCurrentPage, user } = useApp();
  const lastAutoRefreshKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const refreshKey = `${currentPage}:${isAuthenticated ? 'auth' : 'anon'}`;
    const previousKey = lastAutoRefreshKeyRef.current;
    if (previousKey === refreshKey) {
      return;
    }
    lastAutoRefreshKeyRef.current = refreshKey;

    if (!isAuthenticated && currentPage !== 'home' && currentPage !== 'explore') {
      return;
    }

    const isPublicPage = currentPage === 'home' || currentPage === 'explore';
    const previousPage = previousKey?.split(':')[0] ?? null;
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

    // Dashboard 拉取“我 host + 我参加”的集合，不请求全量 public。
    if (currentPage === 'dashboard') {
      void refreshData('dashboard');
      return;
    }

    // Memory 页面使用独立的 memory API，不依赖 workshop 列表。
  }, [currentPage, isAuthenticated, refreshData]);

  React.useEffect(() => {
    if (isAuthenticated && user && !user.university && currentPage !== 'onboarding') {
      setCurrentPage('onboarding');
    }
  }, [currentPage, isAuthenticated, setCurrentPage, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <img
            src={LOADING_FOX_SRC}
            alt="Skill Swap Club"
            className="mx-auto mb-4 h-20 w-20 object-contain animate-pulse"
          />
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

    if (currentPage.startsWith(MEMORY_ENTRY_PAGE_PREFIX)) {
      const slug = currentPage.substring(MEMORY_ENTRY_PAGE_PREFIX.length);
      return <MemoryDetail slug={slug} />;
    }

    switch (currentPage) {
      case 'hero':
        return <HeroScreen />;
      case 'home':
        return <HomePage />;
      case 'explore':
        return <ExploreWorkshops />;
      case 'campuses':
        return <CampusExpansion />;
      case 'dashboard':
        return <Dashboard />;
      case 'create':
        return <CreateWorkshop />;
      case 'auth':
        return <AuthScreen />;
      case 'memory':
        return <Memory />;
      case 'adminReview':
        return <AdminReview />;
      case 'adminMemory':
        return <MemoryStudio />;
      case 'notifications':
        return <Notifications />;
      case 'onboarding':
        return <UniversityOnboarding />;
      default:
        // Show Hero page for non-authenticated users, Explore page for authenticated users
        return isAuthenticated ? <ExploreWorkshops /> : <HeroScreen />;
    }
  };

  // Show navigation only if not on hero/auth page or if user is authenticated
  const showNavigation =
    currentPage !== 'onboarding' && ((currentPage !== 'hero' && currentPage !== 'auth') || isAuthenticated);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showNavigation && <NavigationScreen />}
      <main>
        <React.Suspense
          fallback={
            <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
              <div className="flex flex-col items-center justify-center space-y-4 text-muted-foreground">
                <img
                  src={LOADING_FOX_SRC}
                  alt=""
                  aria-hidden="true"
                  className="h-20 w-20 object-contain animate-pulse"
                />
                <p>Loading page...</p>
              </div>
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
