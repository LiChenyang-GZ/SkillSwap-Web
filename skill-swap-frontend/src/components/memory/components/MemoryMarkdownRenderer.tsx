import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { resolveAssetUrl } from "../../../lib/api";
import { memoryMarkdownSanitizeSchema } from "../constants/memoryUiConstants";

interface MemoryMarkdownRendererProps {
  content: string;
  fallbackMarkdown: string;
  imageClassName: string;
  wrapperClassName?: string;
  embedClassName?: string;
}

export function MemoryMarkdownRenderer({
  content,
  fallbackMarkdown,
  imageClassName,
  wrapperClassName,
  embedClassName = "my-6",
}: MemoryMarkdownRendererProps) {
  const markdownNode = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, memoryMarkdownSanitizeSchema]]}
      components={{
        img: ({ src, alt, width }) => (
          <img
            src={resolveAssetUrl(src)}
            alt={alt || ""}
            className={imageClassName}
            style={width ? { maxWidth: /^\d+$/.test(String(width)) ? `${width}px` : String(width) } : undefined}
            loading="lazy"
          />
        ),
        a: ({ href, children, ...props }) => {
          if (!href) return <a {...props}>{children}</a>;

          const ytMatch = href.match(
            /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i
          );
          if (ytMatch && ytMatch[1]) {
            const videoId = ytMatch[1];
            return (
              <div className={`${embedClassName} aspect-video w-full rounded-xl overflow-hidden shadow-lg border border-border/70 bg-muted`}>
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
              <div className={`${embedClassName} w-full max-w-[400px] mx-auto overflow-hidden rounded-xl border border-border/70 bg-muted`}>
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

          return (
            <a href={href} className="text-primary hover:underline" target="_blank" rel="noreferrer" {...props}>
              {children}
            </a>
          );
        },
      }}
    >
      {content || fallbackMarkdown}
    </ReactMarkdown>
  );

  if (!wrapperClassName) {
    return markdownNode;
  }

  return (
    <div className={wrapperClassName}>
      {markdownNode}
    </div>
  );
}
