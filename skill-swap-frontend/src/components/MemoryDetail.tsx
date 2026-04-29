import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { memoryAPI, resolveAssetUrl } from '../lib/api';
import { MemoryEntry } from '../types';
import { Button } from './ui/button';
import { ArrowLeft, CalendarDays, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

interface MemoryDetailProps {
  slug: string;
}

const markdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'u'],
};

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

        <article className="markdown-preview max-w-none px-1">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}
            components={{
              img: ({ src, alt }) => (
                <img
                  src={resolveAssetUrl(src)}
                  alt={alt || ''}
                  className="w-full rounded-xl border border-border/70"
                  loading="lazy"
                />
              ),
              a: ({ href, children, ...props }) => {
                if (!href) return <a {...props}>{children}</a>;

                const ytMatch = href.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                if (ytMatch && ytMatch[1]) {
                  const videoId = ytMatch[1];
                  return (
                    <div className="my-6 aspect-video w-full rounded-xl overflow-hidden shadow-lg border border-border/70 bg-muted">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  );
                }

                const igMatch = href.match(/instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/i);
                if (igMatch && igMatch[0]) {
                  return (
                    <div className="my-6 w-full max-w-[400px] mx-auto overflow-hidden rounded-xl border border-border/70 bg-muted">
                      <iframe
                        src={`https://www.${igMatch[0]}/embed`}
                        width="100%"
                        height="480"
                        frameBorder="0"
                        scrolling="no"
                        allowTransparency={true}
                      ></iframe>
                    </div>
                  );
                }

                return <a href={href} className="text-primary hover:underline" target="_blank" rel="noreferrer" {...props}>{children}</a>;
              }
            }}
          >
            {body || '*No content available.*'}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
