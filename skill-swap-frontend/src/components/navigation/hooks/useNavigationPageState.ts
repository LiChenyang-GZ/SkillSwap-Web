import { useApp } from "../../../contexts/AppContext";

export function useNavigationPageState() {
  const { currentPage, setCurrentPage } = useApp();

  return {
    currentPage,
    setCurrentPage,
  };
}
