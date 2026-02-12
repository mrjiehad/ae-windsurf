import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Sparkles, TrendingUp, Zap, X } from "lucide-react";
import { motion } from "framer-motion";

function TypingText({ text, speed = 100 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayedText("");
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return <>{displayedText}<span className="animate-pulse">_</span></>;
}

function CyclingTypingText({ phrases, speed = 80, pauseDuration = 2000 }: { phrases: string[]; speed?: number; pauseDuration?: number }) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    const typingDuration = currentPhrase.length * speed;
    const totalDuration = typingDuration + pauseDuration;

    const timer = setTimeout(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, totalDuration);

    return () => clearTimeout(timer);
  }, [currentPhraseIndex, phrases, speed, pauseDuration]);

  return <TypingText text={phrases[currentPhraseIndex]} speed={speed} />;
}

import gta1 from "@assets/gta1_1759551121573.png";
import trailerThumb from "@assets/hqdefault_1759551446234.jpg";

interface HeroSetting {
  id: string;
  backgroundImage: string;
  videoThumbnail: string | null;
  isActive: boolean;
}

interface ModernGTAHeroProps {
  onShopClick?: () => void;
  onPackagesClick?: () => void;
  onRankingsClick?: () => void;
}

export function ModernGTAHero({ onShopClick, onPackagesClick, onRankingsClick }: ModernGTAHeroProps) {
  const subtitlePhrases = [
    "MODERN CURRENCY",
    "AE OFFICIAL",
    "PREMIUM REWARDS",
    "INSTANT DELIVERY"
  ];

  // Fetch hero settings from API
  const { data: heroSetting } = useQuery<HeroSetting>({
    queryKey: ["/api/hero"],
  });

  // Use database image if available, otherwise fallback to default
  const backgroundImage = heroSetting?.backgroundImage || gta1;
  const videoThumbnail = heroSetting?.videoThumbnail || trailerThumb;
  const [showTrailer, setShowTrailer] = useState(false);

  return (
    <section className="relative min-h-screen bg-black overflow-hidden flex items-center pt-16">
      {/* Animated Background with Parallax Effect */}
      <motion.div 
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: `url(${backgroundImage})`,
          backgroundPosition: 'center center',
        }}
      >
        {/* Multi-layer Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        
        {/* Radial Glow Effect */}
        <div className="absolute inset-0 gta-radial-glow" />
        
        {/* Scan Line Effect */}
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-neon-yellow to-transparent animate-scan-line" />
        </div>
      </motion.div>

      <div className="container mx-auto px-6 md:px-8 h-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 h-full items-center">
          {/* Left Content - Enhanced */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-6 max-w-2xl pt-16 lg:pt-0"
          >
            {/* Main Title - Professional Gangster Style */}
            <div className="space-y-3">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bebas text-white leading-none tracking-wider uppercase"
                style={{
                  textShadow: '3px 3px 0px rgba(0,0,0,0.8), 0 0 30px rgba(255, 215, 0, 0.3)'
                }}
              >
                AECOIN
              </motion.h1>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-2xl sm:text-3xl md:text-4xl font-russo font-bold tracking-wider text-neon-yellow uppercase"
                style={{
                  textShadow: '2px 2px 4px rgba(0,0,0,0.9)'
                }}
              >
                <CyclingTypingText phrases={subtitlePhrases} speed={80} pauseDuration={2000} />
              </motion.div>
            </div>

            {/* Stats Bar - Gangster Style */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-wrap gap-8 py-3"
            >
              <div className="flex items-center gap-2.5 border-l-2 border-neon-yellow pl-3">
                <Zap className="w-4 h-4 text-neon-yellow" />
                <div>
                  <div className="text-white font-bebas text-xl tracking-wider">INSTANT</div>
                  <div className="text-gray-500 text-xs font-rajdhani uppercase tracking-wide">Delivery</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 border-l-2 border-neon-yellow pl-3">
                <Sparkles className="w-4 h-4 text-neon-yellow" />
                <div>
                  <div className="text-white font-bebas text-xl tracking-wider">24/7</div>
                  <div className="text-gray-500 text-xs font-rajdhani uppercase tracking-wide">Available</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 border-l-2 border-neon-yellow pl-3">
                <TrendingUp className="w-4 h-4 text-neon-yellow" />
                <div>
                  <div className="text-white font-bebas text-xl tracking-wider">SECURE</div>
                  <div className="text-gray-500 text-xs font-rajdhani uppercase tracking-wide">Payment</div>
                </div>
              </div>
            </motion.div>

            {/* About Section - Gangster Professional */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="space-y-3 pt-1"
            >
              <div className="flex items-center gap-3">
                <div className="h-0.5 w-12 bg-neon-yellow" />
                <h2 className="text-white font-bebas text-base tracking-[0.25em] uppercase">
                  About the Currency
                </h2>
              </div>
              <p className="text-gray-400 text-sm md:text-base font-rajdhani leading-relaxed pl-0">
                AECOIN is the premium virtual currency for AE OFFICIAL. Get instant access to luxury vehicles, high-end weapon skins, and exclusive items. Fast delivery, secure payment, no hassle.
              </p>
            </motion.div>

            {/* CTA Buttons - Gangster Professional */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="pt-2 flex flex-wrap gap-4"
            >
              <Button
                onClick={onShopClick}
                className="bg-neon-yellow hover:bg-yellow-400 text-black font-bold text-base px-12 h-14 uppercase font-russo tracking-wider shadow-lg shadow-neon-yellow/30 transition-all duration-300 hover:scale-105"
                data-testid="button-buy-coins"
              >
                BUY NOW
              </Button>
              <Button
                onClick={onRankingsClick}
                variant="outline"
                className="border-2 border-white/40 text-white hover:bg-white/10 hover:border-white/80 font-bold text-base px-12 h-14 uppercase font-russo tracking-wider transition-all duration-300"
                data-testid="button-explore-rankings"
              >
                RANKINGS
              </Button>
            </motion.div>
          </motion.div>

          {/* Right Content - Video Section Enhanced */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex items-center justify-center lg:justify-end"
          >
            <div className="space-y-4 w-full max-w-md">
              {/* Label */}
              <div className="flex items-center justify-end gap-3">
                <span className="text-neon-yellow text-xs font-rajdhani font-bold tracking-[0.3em] uppercase">
                  Watch Now
                </span>
                <div className="h-0.5 w-12 bg-neon-yellow animate-shimmer" 
                     style={{ backgroundImage: 'linear-gradient(90deg, transparent, #FFD700, transparent)' }} />
              </div>
              
              <h3 className="text-white font-bebas text-2xl tracking-widest uppercase text-right">
                RELEASE TRAILER
              </h3>
              
              {/* Video Thumbnail with Enhanced Effects */}
              <button 
                onClick={() => setShowTrailer(true)}
                className="relative block w-full aspect-video rounded-lg overflow-hidden group cursor-pointer shadow-2xl border-2 border-neon-yellow/20 hover:border-neon-yellow/60 transition-all duration-300"
                data-testid="link-release-trailer"
              >
                <img 
                  src={videoThumbnail} 
                  alt="Video Thumbnail"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 group-hover:from-black/40 transition-all duration-300" />
                
                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Pulsing Ring */}
                    <div className="absolute inset-0 rounded-full bg-neon-yellow/30 animate-ping" />
                    
                    {/* Button */}
                    <div className="relative w-20 h-20 rounded-full bg-neon-yellow group-hover:bg-white transition-all duration-300 flex items-center justify-center shadow-xl gta-gold-glow">
                      <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
                    </div>
                  </div>
                </div>
                
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-neon-yellow/50 group-hover:border-neon-yellow transition-colors duration-300" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-neon-yellow/50 group-hover:border-neon-yellow transition-colors duration-300" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />

      {/* Video Modal */}
      {showTrailer && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setShowTrailer(false)}
        >
          <div 
            className="relative w-full max-w-4xl mx-4 aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute -top-12 right-0 text-white hover:text-neon-yellow transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <iframe
              src="https://www.youtube.com/embed/z_Ix7Ybq8hQ?autoplay=1&rel=0"
              title="Release Trailer"
              className="w-full h-full rounded-lg border-2 border-neon-yellow/30"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </section>
  );
}
