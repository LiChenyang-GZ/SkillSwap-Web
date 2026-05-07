import { useMemo } from "react";
import { ArrowLeft, CalendarDays, Loader2 } from "lucide-react";
import { useApp } from "../../../contexts/AppContext";
import { Button } from "../../ui/button";
import {
  MEMORY_DETAIL_LOADING_MESSAGE,
  MEMORY_DETAIL_NOT_FOUND_DESCRIPTION,
  MEMORY_DETAIL_NOT_FOUND_TITLE,
} from "../constants/memoryMessages";
import { useMemoryDetailQuery } from "../hooks/useMemoryDetailQuery";
import { stripMemoryFrontMatter } from "../utils/memoryDocument";
import { toMemoryDisplayDate } from "../utils/memoryDate";
import { MemoryMarkdownRenderer } from "../components/MemoryMarkdownRenderer";

interface MemoryDetailScreenProps {
  slug: string;
}

export function MemoryDetailScreen({ slug }: MemoryDetailScreenProps) {
  const { setCurrentPage } = useApp();
  const { entry, isLoading } = useMemoryDetailQuery(slug);

  const body = useMemo(() => stripMemoryFrontMatter(entry?.content), [entry]);
  const displayDate = useMemo(() => (entry ? toMemoryDisplayDate(entry) : ""), [entry]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="animate-pulse">{MEMORY_DETAIL_LOADING_MESSAGE}</p>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center px-4">
        <div className="max-w-xl text-center space-y-4">
          <h1 className="text-3xl font-bold">{MEMORY_DETAIL_NOT_FOUND_TITLE}</h1>
          <p className="text-muted-foreground">{MEMORY_DETAIL_NOT_FOUND_DESCRIPTION}</p>
          <Button onClick={() => setCurrentPage("memory")}>Back to Memory Wall</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Button variant="outline" onClick={() => setCurrentPage("memory")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Memory Wall
        </Button>

        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{entry.title}</h1>
          {displayDate && (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="w-4 h-4" />
              <span>{displayDate}</span>
            </div>
          )}
        </header>

        <article className="markdown-preview max-w-none px-1">
          <MemoryMarkdownRenderer
            content={body}
            fallbackMarkdown="*No content available.*"
            imageClassName="w-full rounded-xl border border-border/70"
          />
        </article>
      </div>
    </div>
  );
}
