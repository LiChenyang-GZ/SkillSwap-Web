import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { memoryAPI, resolveAssetUrl } from '../lib/api';
import { MemoryEntry } from '../types';
import { Button } from './ui/button';
import { ArrowLeft, CalendarDays, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MemoryDetailProps {
  slug: string;
}

function stripFrontMatter(content?: string): string {
  if (!content) return '';
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return normalized;
  return normalized.slice(match[0].length);
}

function toDisplayDate(entry: MemoryEntry): string {
  const raw = entry.publishedAt || entry.updatedAt || entry.createdAt;
  if (!raw) return '';

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function MemoryDetail({ slug }: MemoryDetailProps) {
  const { setCurrentPage } = useApp();
  const [entry, setEntry] = useState<MemoryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await memoryAPI.getBySlug(slug);
        setEntry(data);
      } catch (error) {
        console.error('Failed to load memory detail:', error);
        setEntry(null);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [slug]);

  const body = useMemo(() => stripFrontMatter(entry?.content), [entry]);
  const displayDate = useMemo(() => (entry ? toDisplayDate(entry) : ''), [entry]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="animate-pulse">Loading memory...</p>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center px-4">
        <div className="max-w-xl text-center space-y-4">
          <h1 className="text-3xl font-bold">Memory not found</h1>
          <p className="text-muted-foreground">This memory may still be a draft or the link is no longer available.</p>
          <Button onClick={() => setCurrentPage('memory')}>Back to Memory Wall</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Button variant="outline" onClick={() => setCurrentPage('memory')}>
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

        <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none px-1">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ src, alt }) => (
                <img
                  src={resolveAssetUrl(src)}
                  alt={alt || ''}
                  className="w-full rounded-xl border border-border/70"
                  loading="lazy"
                />
              ),
            }}
          >
            {body || '*No content available.*'}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
