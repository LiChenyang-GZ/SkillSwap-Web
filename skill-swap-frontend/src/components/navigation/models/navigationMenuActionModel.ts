export interface NavigationMenuActions {
  navigateToPage: (page: string) => void;
  navigateToPageAndCloseMobile: (page: string) => void;
  navigateToCreateAndCloseMobile: () => void;
  signOutAndCloseMobile: () => void;
}
