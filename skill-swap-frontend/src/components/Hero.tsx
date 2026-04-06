import { useEffect, useMemo, useState } from "react";
import { useApp } from "../contexts/AppContext";
import { memoryAPI } from "../lib/api";
import { MemoryEntry } from "../types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Archive, ArrowRight, ChevronLeft, ChevronRight, Loader2, Users } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const fallbackCover = "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80";

function pickCover(entry: MemoryEntry): string {
  const raw = (entry.coverUrl || entry.mediaUrls[0] || "").trim();
  if (!raw) return fallbackCover;

  const unquoted = raw.replace(/^['\"]|['\"]$/g, "");
  const markdownImage = unquoted.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
  if (markdownImage?.[1]) {
    return markdownImage[1].trim() || fallbackCover;
  }

  return unquoted;
}

export function HeroPage() {
  const { setCurrentPage, workshops } = useApp();
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(true);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);

  const stats = {
    members: 50,
    skills: 25,
    workshops: workshops.length || 100,
  };

  useEffect(() => {
    const loadMemories = async () => {
      setIsLoadingMemories(true);
      try {
        const data = await memoryAPI.getPublic();
        setEntries(data);
      } catch (error) {
        console.error("Failed to load memories:", error);
        setEntries([]);
      } finally {
        setIsLoadingMemories(false);
      }
    };

    void loadMemories();
  }, []);

  const featuredMemories = useMemo(
    () =>
      [...entries].sort((a, b) => {
        const aTime = new Date(a.publishedAt || a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.publishedAt || b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      }),
    [entries]
  );

  const hasCarouselControls = featuredMemories.length > 3;

  useEffect(() => {
    if (featuredMemories.length === 0) {
      setCarouselStartIndex(0);
      return;
    }

    if (carouselStartIndex >= featuredMemories.length) {
      setCarouselStartIndex(0);
    }
  }, [carouselStartIndex, featuredMemories.length]);

  const visibleMemories = useMemo(() => {
    if (featuredMemories.length <= 3) {
      return featuredMemories;
    }

    return Array.from({ length: 3 }, (_, offset) => {
      const index = (carouselStartIndex + offset) % featuredMemories.length;
      return featuredMemories[index];
    });
  }, [carouselStartIndex, featuredMemories]);

  const handlePrevMemories = () => {
    if (!hasCarouselControls) return;
    setCarouselStartIndex((prev) => (prev - 1 + featuredMemories.length) % featuredMemories.length);
  };

  const handleNextMemories = () => {
    if (!hasCarouselControls) return;
    setCarouselStartIndex((prev) => (prev + 1) % featuredMemories.length);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">SS</span>
              </div>
              <span className="ml-3 text-xl font-bold text-foreground">SkillSwap</span>
            </div>
            <Button
              onClick={() => setCurrentPage("auth", "signup")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden ">
        <div className="absolute inset-0 bg-gradient-to-br from-cream-100 via-background to-cream-200 opacity-60"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 lg:pt-24 pb-16">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-display lg:text-6xl mb-6 text-foreground">
              Welcome to <span className="text-secondary">Skill Swap Club</span>
            </h1>

            <p className="text-h3 lg:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Learn new skills, teach what you know, and grow together.
              <br />
              <span className="text-secondary">Join workshops to learn • Host workshops to share</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                onClick={() => setCurrentPage("auth", "signup")}
                size="lg"
                className="px-8 py-3 text-lg min-w-[200px] group"
              >
                <Users className="w-5 h-5 mr-3" />
                Join with Email
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button
                onClick={() => setCurrentPage("auth", "signin")}
                variant="outline"
                size="lg"
                className="px-8 py-3 text-lg min-w-[200px] border-2 border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
              >
                Sign In
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-h1 text-secondary mb-2">{stats.members}+</div>
                <div className="text-caption text-muted-foreground">Active Members</div>
              </div>
              <div className="text-center">
                <div className="text-h1 text-secondary mb-2">{stats.skills}+</div>
                <div className="text-caption text-muted-foreground">Skills Available</div>
              </div>
              <div className="text-center">
                <div className="text-h1 text-secondary mb-2">{stats.workshops}+</div>
                <div className="text-caption text-muted-foreground">Workshops Hosted</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workshops" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-h1 lg:text-5xl mb-4 text-foreground">
              Our <span className="text-secondary">Memories</span>
            </h2>
          </div>

          {isLoadingMemories ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p>Loading featured memories...</p>
            </div>
          ) : featuredMemories.length > 0 ? (
            <>
              <div className="flex items-center justify-center gap-4 lg:gap-6">
                {hasCarouselControls && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="hidden sm:inline-flex h-11 w-11 rounded-full"
                    onClick={handlePrevMemories}
                    aria-label="Show previous memories"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}

                <div className="flex flex-wrap justify-center gap-6 lg:gap-8">
                  {visibleMemories.map((entry) => (
                    <Card
                      key={entry.id}
                      className="w-full sm:w-[320px] overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer"
                      onClick={() => {
                        if (entry.slug) {
                          setCurrentPage(`memory-entry-${entry.slug}`);
                          return;
                        }
                        setCurrentPage("memory");
                      }}
                    >
                      <div className="relative aspect-[4/5] overflow-hidden">
                        <ImageWithFallback
                          src={pickCover(entry)}
                          alt={entry.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
                        <div className="absolute inset-x-0 bottom-0 p-6 text-white text-center">
                          <p className="text-xs uppercase tracking-[0.2em] text-white/70 mb-2">Memory</p>
                          <h3 className="text-2xl font-semibold leading-snug line-clamp-3">{entry.title}</h3>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {hasCarouselControls && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="hidden sm:inline-flex h-11 w-11 rounded-full"
                    onClick={handleNextMemories}
                    aria-label="Show next memories"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {hasCarouselControls && (
                <div className="sm:hidden mt-6 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={handlePrevMemories}
                    aria-label="Show previous memories"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={handleNextMemories}
                    aria-label="Show next memories"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}

              <div className="mt-10 text-center">
                <Button variant="outline" size="lg" className="group" onClick={() => setCurrentPage("memory")}>
                  See more
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </>
          ) : (
            <div className="max-w-md mx-auto text-center px-4 py-12">
              <div className="bg-muted/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5">
                <Archive className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No featured memories yet</h3>
              <p className="text-muted-foreground mb-6">
                New memories will appear here after upcoming events.
              </p>
              <Button onClick={() => setCurrentPage("memory")} variant="outline">
                Go to Memory page
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-h1 lg:text-5xl mb-4 text-foreground">
              How It <span className="text-secondary">Works</span>
            </h2>
            <p className="text-body text-muted-foreground max-w-2xl mx-auto">
              A community-first model that keeps learning and teaching simple for everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-secondary-foreground font-bold text-xl">1</span>
              </div>
              <h3 className="text-h3 mb-2 text-foreground">Sign Up</h3>
              <p className="text-caption text-muted-foreground">
                Create your account with email and start exploring in minutes
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-secondary-foreground font-bold text-xl">2</span>
              </div>
              <h3 className="text-h3 mb-2 text-foreground">Learn Skills</h3>
              <p className="text-caption text-muted-foreground">
                Attend workshops and learn directly from community experts
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-secondary-foreground font-bold text-xl">3</span>
              </div>
              <h3 className="text-h3 mb-2 text-foreground">Teach Others</h3>
              <p className="text-caption text-muted-foreground">
                Host workshops in your area of expertise and help others grow
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-secondary-foreground font-bold text-xl">4</span>
              </div>
              <h3 className="text-h3 mb-2 text-foreground">Grow Together</h3>
              <p className="text-caption text-muted-foreground">
                Build connections and expand your skillset within our community
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
