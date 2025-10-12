import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Crown, Trophy, Flame, Skull, Swords, Target } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { PlayerRanking } from "@shared/schema";
import { useState, useEffect } from "react";

import sultan1 from "@assets/S2_1759294544784.png";
import sultan2 from "@assets/S1_1759294544782.png";
import sultan3 from "@assets/S3_1759294544785.png";
import cityBg from "@assets/stock_images/gta_5_cityscape_los__a8b6c683.jpg";

interface PlayerRankingWithUser extends PlayerRanking {
  user?: {
    username: string;
    avatar: string | null;
  };
}

const characterImages = [sultan1, sultan2, sultan3, sultan1, sultan2];

// Get current month name
const getCurrentMonth = () => {
  const months = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];
  return months[new Date().getMonth()];
};

// Strong Lightning Effect Component
function StrongLightning({ side }: { side: 'left' | 'right' }) {
  const [isVisible, setIsVisible] = useState(false);
  const [intensity, setIntensity] = useState(1);

  useEffect(() => {
    const triggerLightning = () => {
      // Flash sequence: quick flashes for realistic lightning
      setIsVisible(true);
      setIntensity(1);
      
      // First flash
      setTimeout(() => setIsVisible(false), 100);
      
      // Second flash (stronger)
      setTimeout(() => {
        setIsVisible(true);
        setIntensity(1.5);
      }, 150);
      
      setTimeout(() => setIsVisible(false), 250);
      
      // Third flash (weaker)
      setTimeout(() => {
        setIsVisible(true);
        setIntensity(0.8);
      }, 300);
      
      setTimeout(() => setIsVisible(false), 380);
      
      // Random next strike between 4-10 seconds
      const nextStrike = 4000 + Math.random() * 6000;
      setTimeout(triggerLightning, nextStrike);
    };

    const initialDelay = setTimeout(triggerLightning, side === 'left' ? 1000 : 2500);
    return () => clearTimeout(initialDelay);
  }, [side]);

  if (!isVisible) return null;

  return (
    <>
      {/* Lightning Bolt SVG */}
      <div
        className={`absolute top-0 pointer-events-none z-30 ${
          side === 'left' ? 'left-0' : 'right-0'
        }`}
        style={{
          width: '400px',
          height: '100vh',
          opacity: intensity,
        }}
      >
        <svg
          viewBox="0 0 200 800"
          className="w-full h-full"
          style={{
            filter: `drop-shadow(0 0 30px rgba(250, 204, 21, ${intensity})) drop-shadow(0 0 60px rgba(250, 204, 21, ${intensity * 0.8}))`,
          }}
        >
          <path
            d={
              side === 'left'
                ? 'M 20 0 L 80 200 L 50 200 L 100 400 L 60 400 L 120 650 L 80 650 L 140 800'
                : 'M 180 0 L 120 200 L 150 200 L 100 400 L 140 400 L 80 650 L 120 650 L 60 800'
            }
            stroke="#FACC15"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: 'drop-shadow(0 0 10px rgba(250, 204, 21, 1))',
            }}
          />
          {/* Inner glow */}
          <path
            d={
              side === 'left'
                ? 'M 20 0 L 80 200 L 50 200 L 100 400 L 60 400 L 120 650 L 80 650 L 140 800'
                : 'M 180 0 L 120 200 L 150 200 L 100 400 L 140 400 L 80 650 L 120 650 L 60 800'
            }
            stroke="#FFF"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
        </svg>
      </div>

      {/* Flash overlay for screen illumination */}
      <div
        className={`absolute inset-0 pointer-events-none z-20 ${
          side === 'left' ? 'bg-gradient-to-r' : 'bg-gradient-to-l'
        } from-yellow-400/30 via-yellow-400/10 to-transparent`}
        style={{
          opacity: intensity * 0.6,
          animation: 'flash 0.1s ease-out',
        }}
      />
    </>
  );
}

export default function Rankings() {
  const { data: rankings = [], isLoading } = useQuery<PlayerRankingWithUser[]>({
    queryKey: ["/api/rankings"],
  });

  const currentMonth = new Date().toLocaleString('default', { month: 'long' }).toUpperCase();
  const top3 = rankings.slice(0, 3);
  const restOfRankings = rankings.slice(3);

  const getPodiumOrder = (rank: number) => {
    // Rank 1 = middle (order-2), Rank 2 = left (order-1), Rank 3 = right (order-3)
    if (rank === 1) return 'order-2';
    if (rank === 2) return 'order-1';
    return 'order-3';
  };

  const getMedalColor = (rank: number) => {
    if (rank === 1) return "text-neon-yellow";
    if (rank === 2) return "text-gray-300";
    if (rank === 3) return "text-amber-600";
    return "text-gray-600";
  };

  return (
    <div className="min-h-screen bg-black">
      <Header cartItemCount={0} onCartClick={() => {}} />
      
      {/* Killer Gaming Background */}
      <div className="relative min-h-screen bg-black overflow-hidden">
        {/* Dark Grunge Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src={cityBg} 
            alt="Background"
            className="w-full h-full object-cover opacity-10 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-900/95 to-black" />
          {/* Hexagon pattern overlay */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }} />
        </div>

        {/* Lightning Effects */}
        <StrongLightning side="left" />
        <StrongLightning side="right" />

        <div className="container mx-auto px-4 py-12 relative z-10">
          {/* Killer Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-4 mb-6">
              <Swords className="w-10 h-10 text-red-500" />
              <h1 className="text-6xl md:text-7xl font-bebas text-white tracking-wider" 
                  style={{ 
                    textShadow: "0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(0, 0, 0, 0.8)",
                    WebkitTextStroke: "2px rgba(239, 68, 68, 0.3)"
                  }}
                  data-testid="title-rankings">
                KILL LEADERBOARD
              </h1>
              <Swords className="w-10 h-10 text-red-500" />
            </div>
            <div className="flex items-center justify-center gap-3 text-zinc-400 uppercase tracking-widest text-sm font-russo">
              <Target className="w-4 h-4" />
              <span>{currentMonth} SEASON</span>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block w-16 h-16 border-4 border-neon-yellow border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rankings.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="w-24 h-24 text-gray-600 mx-auto mb-6" />
              <p className="text-gray-400 text-2xl font-rajdhani">No rankings available yet</p>
            </div>
          ) : (
            <>
              {/* Top 3 - Killer Professional Design */}
              {top3.length > 0 && (
                <div className="mb-20">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto items-end">
                    {top3.map((player, index) => {
                      const orderClass = getPodiumOrder(player.rank);
                      const isWinner = player.rank === 1;
                      const heightClass = player.rank === 1 ? 'h-[480px]' : player.rank === 2 ? 'h-[420px]' : 'h-[400px]';
                      const characterImage = player.imageUrl || characterImages[index % characterImages.length];
                      
                      // Killer rank styles
                      const rankStyles = {
                        1: { 
                          border: 'border-red-600',
                          glow: 'shadow-[0_0_50px_rgba(220,38,38,0.6),0_0_100px_rgba(220,38,38,0.3)]',
                          accent: 'bg-gradient-to-r from-red-600 via-red-500 to-orange-500',
                          textGlow: '0 0 20px rgba(220,38,38,0.8)',
                          icon: <Skull className="w-6 h-6" />,
                          label: 'APEX PREDATOR'
                        },
                        2: { 
                          border: 'border-zinc-400',
                          glow: 'shadow-[0_0_40px_rgba(161,161,170,0.4)]',
                          accent: 'bg-gradient-to-r from-zinc-400 to-zinc-500',
                          textGlow: '0 0 15px rgba(161,161,170,0.6)',
                          icon: <Trophy className="w-6 h-6" />,
                          label: 'ELITE KILLER'
                        },
                        3: { 
                          border: 'border-amber-700',
                          glow: 'shadow-[0_0_40px_rgba(180,83,9,0.4)]',
                          accent: 'bg-gradient-to-r from-amber-700 to-amber-800',
                          textGlow: '0 0 15px rgba(180,83,9,0.6)',
                          icon: <Flame className="w-6 h-6" />,
                          label: 'ASSASSIN'
                        }
                      };
                      const style = rankStyles[player.rank as keyof typeof rankStyles];
                      
                      return (
                        <div
                          key={player.id}
                          className={`${orderClass} relative group`}
                          data-testid={`podium-${player.rank}`}
                        >
                          <div className={`relative ${heightClass} bg-zinc-900 border-2 ${style.border} overflow-hidden ${style.glow} transition-all duration-500 hover:scale-[1.03] hover:${style.glow.replace('0.6', '0.8')}`}
                               style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                            
                            {/* Character Image - 70% */}
                            <div className="relative h-[70%] overflow-hidden">
                              <img 
                                src={characterImage} 
                                alt={player.playerName}
                                className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-700"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
                              
                              {/* Rank Badge - Hexagon */}
                              <div className="absolute top-4 right-4">
                                <div className={`relative ${style.accent} w-16 h-16 flex items-center justify-center`}
                                     style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                                  <span className="text-white font-bebas text-3xl font-bold">
                                    {player.rank}
                                  </span>
                                </div>
                              </div>

                              {/* Rank Label */}
                              <div className="absolute top-4 left-4">
                                <div className={`${style.accent} px-3 py-1 flex items-center gap-2`}
                                     style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
                                  {style.icon}
                                  <span className="text-white font-russo text-xs font-bold tracking-wider">
                                    {style.label}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Info Section - 30% */}
                            <div className="relative h-[30%] bg-black/95 p-4 flex flex-col justify-center gap-2">
                              <h3 className="text-2xl font-bebas text-white uppercase tracking-widest text-center truncate" 
                                 data-testid={`player-name-${player.rank}`}
                                 style={{ textShadow: style.textGlow }}>
                                {player.playerName}
                              </h3>

                              {/* Kill Count */}
                              <div className="flex items-center justify-center gap-3">
                                <div className="flex gap-1">
                                  {Array.from({ length: Math.min(player.stars, 5) }).map((_, i) => (
                                    <Skull key={i} className="w-5 h-5 fill-red-500 text-red-500" />
                                  ))}
                                </div>
                                {player.stars > 5 && (
                                  <span className="text-red-500 font-bold text-sm font-bebas">
                                    +{player.stars - 5}
                                  </span>
                                )}
                              </div>

                              <div className={`${style.accent} px-4 py-2 flex items-center justify-center gap-2`}
                                   style={{ clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)' }}>
                                <Target className="w-4 h-4 text-white" />
                                <span className="text-white font-bebas text-lg tracking-wider">
                                  {player.stars} KILLS
                                </span>
                              </div>
                            </div>

                            {/* Corner Accent */}
                            <div className={`absolute bottom-0 right-0 w-20 h-20 ${style.accent} opacity-20`}
                                 style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rankings Table - Killer Design */}
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center gap-3">
                    <div className="h-px w-20 bg-gradient-to-r from-transparent to-red-600" />
                    <h3 className="text-3xl font-bebas text-zinc-300 uppercase tracking-widest">
                      REMAINING HUNTERS
                    </h3>
                    <div className="h-px w-20 bg-gradient-to-l from-transparent to-red-600" />
                  </div>
                </div>
                
                <div className="bg-zinc-900/50 border border-zinc-800 overflow-hidden backdrop-blur-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-red-900/50 bg-black/80">
                          <th className="py-4 px-6 text-left font-bebas text-lg text-zinc-400 uppercase tracking-widest">
                            Rank
                          </th>
                          <th className="py-4 px-6 text-left font-bebas text-lg text-zinc-400 uppercase tracking-widest">
                            Player
                          </th>
                          <th className="py-4 px-6 text-left font-bebas text-lg text-zinc-400 uppercase tracking-widest">
                            Kills
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {restOfRankings.map((player, index) => {
                          // Use uploaded image if available, otherwise use default
                          const characterImage = player.imageUrl || characterImages[(index + 3) % characterImages.length];
                          
                          return (
                            <tr
                              key={player.id}
                              className="border-b border-zinc-800 hover:bg-red-950/20 transition-all duration-300 group relative"
                              data-testid={`row-rank-${player.rank}`}
                            >
                              <td className="py-5 px-6 relative">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-zinc-800 flex items-center justify-center"
                                       style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                                    <span className="text-xl font-bold font-bebas text-zinc-400 group-hover:text-red-500 transition-colors">
                                      {player.rank}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-5 px-6 relative">
                                <div className="flex items-center gap-4">
                                  <div className="relative">
                                    <Avatar className="w-12 h-12 ring-2 ring-zinc-700 group-hover:ring-red-600 transition-all">
                                      <AvatarImage src={player.user?.avatar || undefined} />
                                      <AvatarFallback className="bg-zinc-800 text-zinc-400 font-bold text-lg">
                                        {player.playerName.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                  <span className="text-xl text-zinc-300 font-bebas group-hover:text-white transition-colors uppercase tracking-wide" 
                                        data-testid={`player-name-${player.rank}`}>
                                    {player.playerName}
                                  </span>
                                </div>
                              </td>
                              <td className="py-5 px-6 relative">
                                <div className="flex items-center gap-4">
                                  <div className="flex gap-1">
                                    {Array.from({ length: Math.min(player.stars, 5) }).map((_, i) => (
                                      <Skull
                                        key={i}
                                        className="w-5 h-5 fill-red-600 text-red-600 opacity-80"
                                      />
                                    ))}
                                    {player.stars > 5 && (
                                      <span className="text-red-500 font-bold text-sm font-bebas ml-1">
                                        +{player.stars - 5}
                                      </span>
                                    )}
                                  </div>
                                  <div className="bg-zinc-800 px-4 py-1 group-hover:bg-red-950 transition-colors"
                                       style={{ clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)' }}>
                                    <span className="text-zinc-300 font-bebas text-lg group-hover:text-red-400 transition-colors">
                                      {player.stars}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
