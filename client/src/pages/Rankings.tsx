import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Crown, Trophy, Star, Medal } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { PlayerRanking } from "@shared/schema";

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
      
      {/* Black & Yellow Background */}
      <div className="relative min-h-screen bg-black overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src={cityBg} 
            alt="Background"
            className="w-full h-full object-cover opacity-5"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-zinc-950" />
        </div>

        <div className="container mx-auto px-4 py-16 relative z-10">
          {/* Header - Sultan of Month */}
          <div className="text-center mb-16">
            <div className="mb-4">
              <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" 
                     style={{ filter: "drop-shadow(0 0 20px rgba(234, 179, 8, 0.6))" }} />
            </div>
            <h1 className="text-5xl md:text-6xl font-bebas text-yellow-500 tracking-wider mb-2" 
                style={{ 
                  textShadow: "0 0 30px rgba(234, 179, 8, 0.5), 2px 2px 0px rgba(0, 0, 0, 0.8)"
                }}
                data-testid="title-rankings">
              SULTAN OF {getCurrentMonth()}
            </h1>
            <div className="h-1 w-64 mx-auto bg-gradient-to-r from-transparent via-yellow-500 to-transparent mb-4" />
            <p className="text-zinc-400 uppercase tracking-widest text-sm font-russo">
              Monthly Leaderboard
            </p>
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
                      
                      // Black & Yellow rank styles
                      const rankStyles = {
                        1: { 
                          border: 'border-yellow-500',
                          glow: 'shadow-[0_0_50px_rgba(234,179,8,0.6)]',
                          accent: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
                          textGlow: '0 0 20px rgba(234,179,8,0.8)',
                          icon: <Crown className="w-6 h-6" />,
                          label: 'CHAMPION'
                        },
                        2: { 
                          border: 'border-zinc-500',
                          glow: 'shadow-[0_0_40px_rgba(113,113,122,0.4)]',
                          accent: 'bg-gradient-to-r from-zinc-500 to-zinc-600',
                          textGlow: '0 0 15px rgba(113,113,122,0.6)',
                          icon: <Medal className="w-6 h-6" />,
                          label: 'RUNNER-UP'
                        },
                        3: { 
                          border: 'border-amber-600',
                          glow: 'shadow-[0_0_40px_rgba(217,119,6,0.4)]',
                          accent: 'bg-gradient-to-r from-amber-600 to-amber-700',
                          textGlow: '0 0 15px rgba(217,119,6,0.6)',
                          icon: <Star className="w-6 h-6" />,
                          label: 'THIRD PLACE'
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
                            
                            {/* Character Image - 60% */}
                            <div className="relative h-[60%] overflow-hidden">
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

                            {/* Info Section - 40% */}
                            <div className="relative h-[40%] bg-black/95 p-5 flex flex-col justify-between">
                              <h3 className="text-2xl font-bebas text-white uppercase tracking-widest text-center" 
                                 data-testid={`player-name-${player.rank}`}
                                 style={{ textShadow: style.textGlow }}>
                                {player.playerName}
                              </h3>

                              {/* Crowns Display */}
                              <div className="flex items-center justify-center gap-2">
                                <div className="flex gap-1">
                                  {Array.from({ length: Math.min(player.stars, 5) }).map((_, i) => (
                                    <Crown key={i} className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                                  ))}
                                </div>
                                {player.stars > 5 && (
                                  <span className="text-yellow-500 font-bold text-sm font-bebas">
                                    +{player.stars - 5}
                                  </span>
                                )}
                              </div>

                              <div className={`${style.accent} px-4 py-2 flex items-center justify-center gap-2`}
                                   style={{ clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)' }}>
                                <Crown className="w-4 h-4 text-white" />
                                <span className="text-white font-bebas text-lg tracking-wider">
                                  {player.stars} CROWNS
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

              {/* Rankings Table - Black & Yellow */}
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center gap-3">
                    <div className="h-px w-20 bg-gradient-to-r from-transparent to-yellow-500" />
                    <h3 className="text-3xl font-bebas text-yellow-500 uppercase tracking-widest">
                      OTHER SULTANS
                    </h3>
                    <div className="h-px w-20 bg-gradient-to-l from-transparent to-yellow-500" />
                  </div>
                </div>
                
                <div className="bg-zinc-900/50 border border-yellow-500/20 overflow-hidden backdrop-blur-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-yellow-500/30 bg-black/80">
                          <th className="py-4 px-6 text-left font-bebas text-lg text-yellow-500 uppercase tracking-widest">
                            Rank
                          </th>
                          <th className="py-4 px-6 text-left font-bebas text-lg text-yellow-500 uppercase tracking-widest">
                            Player
                          </th>
                          <th className="py-4 px-6 text-left font-bebas text-lg text-yellow-500 uppercase tracking-widest">
                            Crowns
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
                              className="border-b border-zinc-800 hover:bg-yellow-500/10 transition-all duration-300 group relative"
                              data-testid={`row-rank-${player.rank}`}
                            >
                              <td className="py-5 px-6 relative">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-zinc-800 flex items-center justify-center"
                                       style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                                    <span className="text-xl font-bold font-bebas text-zinc-400 group-hover:text-yellow-500 transition-colors">
                                      {player.rank}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-5 px-6 relative">
                                <div className="flex items-center gap-4">
                                  <div className="relative">
                                    <Avatar className="w-12 h-12 ring-2 ring-zinc-700 group-hover:ring-yellow-500 transition-all">
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
                                      <Crown
                                        key={i}
                                        className="w-5 h-5 fill-yellow-500 text-yellow-500"
                                      />
                                    ))}
                                    {player.stars > 5 && (
                                      <span className="text-yellow-500 font-bold text-sm font-bebas ml-1">
                                        +{player.stars - 5}
                                      </span>
                                    )}
                                  </div>
                                  <div className="bg-zinc-800 px-4 py-1 group-hover:bg-yellow-950 transition-colors"
                                       style={{ clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)' }}>
                                    <span className="text-zinc-300 font-bebas text-lg group-hover:text-yellow-400 transition-colors">
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
