import { useEffect } from "react";

interface UseAuthRedirectParams {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  setCurrentPage: (page: string, authTab?: "signin" | "signup") => void;
}

export const useAuthRedirect = ({ isLoaded, isSignedIn, setCurrentPage }: UseAuthRedirectParams) => {
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      setCurrentPage("explore");
    }
  }, [isLoaded, isSignedIn, setCurrentPage]);
};
