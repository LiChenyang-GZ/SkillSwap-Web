import { WORKSHOP_EXPLORE_SUBTITLE, WORKSHOP_EXPLORE_TITLE } from '../constants/workshopExploreUiConstants';

export function ExploreWorkshopsHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold mb-4">{WORKSHOP_EXPLORE_TITLE}</h1>
      <p className="text-lg text-muted-foreground">{WORKSHOP_EXPLORE_SUBTITLE}</p>
    </div>
  );
}
