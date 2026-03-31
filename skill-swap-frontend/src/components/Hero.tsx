import React, { useState } from "react";
import { supabase } from "../utils/supabase/supabase";
import { useApp } from "../contexts/AppContext";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Calendar, Users, Clock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function HeroPage() {


//  future fetch from backend
const stats = {
  members: 50,
  skills: 25,
  workshops: 100,
};  
  const { setCurrentPage, workshops } = useApp();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Use real workshops from AppContext, showing first 3 as featured
  const featuredWorkshops = workshops.slice(0, 3);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    // This would integrate with Supabase auth
    console.log(isSignUp ? "Sign up" : "Sign in");
    setIsAuthModalOpen(false);
    setCurrentPage("home");
  };

  // Handle Google OAuth sign-in
  const handleGoogleAuth = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/home" }
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation - Only logo and Get Started button */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">SS</span>
              </div>
              <span className="ml-3 text-xl font-bold text-foreground">SkillSwap</span>
            </div>
            <Button
              onClick={() => setCurrentPage('auth')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden ">
        <div className="absolute inset-0 bg-gradient-to-br from-cream-100 via-background to-cream-200 opacity-60"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 lg:pt-24 pb-16">
          <div className="text-center max-w-4xl mx-auto">
            {/* Main Heading */}
            <h1 className="text-display lg:text-6xl mb-6 text-foreground">
              Welcome to <span className="text-secondary">Skill Swap Club</span>
            </h1>
            
            <p className="text-h3 lg:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Learn new skills, teach what you know, and grow together.<br />
              <span className="text-secondary">Join workshops to learn • Host workshops to share</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button 
                onClick={() => {
                  setCurrentPage('auth');
                  localStorage.setItem('skill-swap-authTab', 'signup');
                }}
                size="lg"
                className="px-8 py-3 text-lg min-w-[200px] group"
              >
                <Users className="w-5 h-5 mr-3" />
                Join
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                onClick={handleGoogleAuth}
                variant="outline"
                size="lg"
                className="px-8 py-3 text-lg min-w-[200px] border-2 border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </Button>
            </div>

            {/* Stats */}
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

      {/* Featured Workshops Section */}
      <section id="workshops" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-h1 lg:text-5xl mb-4 text-foreground">
              Featured <span className="text-secondary">Workshops</span>
            </h2>
            <p className="text-body text-muted-foreground max-w-2xl mx-auto">
              Discover upcoming workshops from our community experts. Join to learn new skills and connect with fellow learners.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredWorkshops.map((workshop) => (
              <Card key={workshop.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer">
                <div className="relative h-56 overflow-hidden">
                  <ImageWithFallback
                    src={workshop.image}
                    alt={workshop.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-secondary text-secondary-foreground">
                      Open Access
                    </Badge>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
                    {workshop.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    by {workshop.facilitator?.name || 'Unknown'}
                  </p>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2 text-primary" />
                      {workshop.date}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-2 text-primary" />
                      {workshop.time}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="w-4 h-4 mr-2 text-primary" />
                      {workshop.currentParticipants || 0}/{workshop.maxParticipants} participants
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(workshop.tags || []).map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="text-xs border-secondary/20 text-secondary hover:bg-secondary hover:text-secondary-foreground"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={() => {
                      setIsSignUp(true);
                      setIsAuthModalOpen(true);
                    }}
                    className="w-full btn-primary group"
                  >
                    Join Workshop
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          
        </div>
      </section>

      {/* How It Works Section */}
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
                Join with your Google account and set up your profile in minutes
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

      {/* Auth Modal [] direct link to authpage without nav TODO */} 
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">
              {isSignUp ? "Join SkillSwap" : "Welcome Back"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                required
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  className="w-full pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  required
                  className="w-full"
                />
              </div>
            )}

            <Button type="submit" className="w-full">
              {isSignUp ? "Get Started" : "Sign In"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            onClick={handleGoogleAuth}
            variant="outline"
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </Button>

          <div className="text-center text-sm">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-primary hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
