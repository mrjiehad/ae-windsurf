import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Star, Trophy, Crown, Medal, Sparkles } from "lucide-react";
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

  const currentMonth = getCurrentMonth();
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
    <div className="min-h-screen bg-[#000000]">
      <Header cartItemCount={0} onCartClick={() => {}} />
      
      {/* Hero Section with Background */}
      <div className="relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={cityBg} 
            alt="GTA City Background"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#000000]/80 via-[#000000]/90 to-[#000000]" />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          {/* Title - Smaller Size */}
          <div className="text-center mb-12">
            <div className="relative inline-block">
              {/* Animated Trophy - Smaller */}
              <div className="relative mb-4">
                <Trophy className="w-16 h-16 text-neon-yellow mx-auto animate-pulse" 
                       style={{ filter: "drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))" }} />
                <Sparkles className="w-6 h-6 text-neon-yellow absolute -top-1 -right-1 animate-spin" 
                         style={{ animationDuration: "3s" }} />
                <Sparkles className="w-4 h-4 text-neon-yellow absolute -bottom-1 -left-1 animate-ping" />
              </div>
              
              {/* Dynamic Month Title - Smaller */}
              <h1 className="text-3xl md:text-4xl font-russo text-white mb-1 uppercase" 
                  style={{ textShadow: "2px 2px 0px rgba(0,0,0,0.8), 0 0 20px rgba(255, 215, 0, 0.4)" }}
                  data-testid="title-rankings">
                SULTAN OF
              </h1>
              <h2 className="text-4xl md:text-5xl font-bebas text-neon-yellow mb-3" 
                  style={{ textShadow: "0 0 30px rgba(255, 215, 0, 0.6)" }}>
                {currentMonth}
              </h2>
              <div className="h-0.5 w-48 mx-auto bg-gradient-to-r from-transparent via-neon-yellow to-transparent" />
            </div>
            <p className="text-gray-300 font-russo text-sm uppercase tracking-widest mt-4">
              🏆 HALL OF LEGENDS 🏆
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
              {/* Top 3 Podium - Smaller Cards with Proper Heights */}
              {top3.length > 0 && (
                <div className="mb-16">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-end">
                    {top3.map((player, index) => {
                      const orderClass = getPodiumOrder(player.rank);
                      const isWinner = player.rank === 1;
                      // Podium heights: #1 tallest, #2 medium, #3 shortest
                      const heightClass = player.rank === 1 ? 'h-[420px]' : player.rank === 2 ? 'h-[380px]' : 'h-[340px]';
                      // Use uploaded image if available, otherwise use default
                      const characterImage = player.imageUrl || characterImages[index % characterImages.length];
                      
                      // Color schemes for each rank
                      const rankColors = {
                        1: { border: 'border-neon-yellow', glow: 'rgba(255, 215, 0, 0.6)', bg: 'from-yellow-900/20 via-black to-black', accent: 'bg-neon-yellow text-black' },
                        2: { border: 'border-gray-300', glow: 'rgba(192, 192, 192, 0.4)', bg: 'from-gray-800/20 via-black to-black', accent: 'bg-gray-300 text-black' },
                        3: { border: 'border-amber-600', glow: 'rgba(217, 119, 6, 0.4)', bg: 'from-amber-900/20 via-black to-black', accent: 'bg-amber-600 text-white' }
                      };
                      const colors = rankColors[player.rank as keyof typeof rankColors];
                      
                      return (
                        <div
                          key={player.id}
                          className={`${orderClass} relative group`}
                          data-testid={`podium-${player.rank}`}
                        >
                          {/* Main Card - Fixed Height */}
                          <div className={`relative ${heightClass} bg-gradient-to-br ${colors.bg} border-3 ${colors.border} rounded-xl overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-2xl`}
                          style={{ 
                            boxShadow: `0 0 30px ${colors.glow}, 0 15px 40px rgba(0, 0, 0, 0.8)` 
                          }}>
                            
                            {/* Top Section - Image Display (60% height) */}
                            <div className="relative h-[60%] overflow-hidden">
                              {/* Clear Character Image */}
                              <img 
                                src={characterImage} 
                                alt={player.playerName}
                                className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                              />
                              {/* Subtle gradient overlay only at bottom */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                              
                              {/* Rank Badge - Top Left - Smaller */}
                              <div className="absolute top-3 left-3 z-10">
                                <div className={`${colors.accent} px-4 py-2 rounded-lg shadow-2xl border-2 border-black/50`}>
                                  <span className="text-2xl font-bold font-bebas">#{player.rank}</span>
                                </div>
                              </div>

                              {/* Winner Crown - Floating - Smaller */}
                              {isWinner && (
                                <div className="absolute top-3 right-3 z-10">
                                  <Crown className="w-10 h-10 fill-neon-yellow text-neon-yellow animate-bounce" 
                                         style={{ filter: "drop-shadow(0 0 20px rgba(255, 215, 0, 1))" }} />
                                </div>
                              )}
                            </div>

                            {/* Bottom Section - Player Info (40% height) */}
                            <div className="relative h-[40%] bg-black/95 p-3 flex flex-col justify-center gap-2">
                              {/* Player Name - Smaller */}
                              <div className="text-center">
                                <h3 className={`${isWinner ? 'text-xl' : 'text-lg'} font-russo text-white tracking-wider mb-1 uppercase truncate px-2`} 
                                   data-testid={`player-name-${player.rank}`}
                                   style={{ textShadow: `0 0 15px ${colors.glow}` }}>
                                  {player.playerName}
                                </h3>
                                <div className={`inline-flex items-center gap-1 ${colors.accent} px-2 py-0.5 rounded-full text-xs`}>
                                  <Trophy className="w-3 h-3" />
                                  <span className="font-russo font-bold uppercase tracking-wider">
                                    {isWinner ? 'CHAMPION' : player.rank === 2 ? 'RUNNER-UP' : '3RD PLACE'}
                                  </span>
                                </div>
                              </div>

                              {/* Stars Display - Compact */}
                              <div className="space-y-1">
                                <div className="flex gap-0.5 justify-center items-center">
                                  {Array.from({ length: Math.min(player.stars, 5) }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className="w-3.5 h-3.5 fill-neon-yellow text-neon-yellow"
                                      style={{ filter: "drop-shadow(0 0 3px rgba(255, 215, 0, 0.8))" }}
                                    />
                                  ))}
                                  {player.stars > 5 && (
                                    <span className="text-neon-yellow font-bold text-xs font-bebas ml-1">
                                      +{player.stars - 5}
                                    </span>
                                  )}
                                </div>
                                <div className={`text-center ${colors.accent} py-1 rounded`}>
                                  <span className="font-bebas text-base font-bold">
                                    {player.stars} STARS
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Decorative Corner Accents - Smaller */}
                            <div className={`absolute top-0 right-0 w-20 h-20 ${colors.border} opacity-10 rounded-bl-full`} />
                            <div className={`absolute bottom-0 left-0 w-20 h-20 ${colors.border} opacity-10 rounded-tr-full`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rankings Table */}
              <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-8">
                  <h3 className="text-4xl font-russo text-white uppercase mb-2" 
                      style={{ textShadow: "2px 2px 0px rgba(0,0,0,0.8)" }}>
                    OTHER SULTANS
                  </h3>
                  <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-neon-yellow to-transparent" />
                </div>
                
                <div className="bg-gradient-to-br from-[#1a1a1a]/90 to-[#000000]/90 backdrop-blur-sm border-2 border-neon-yellow/20 overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-neon-yellow/40 bg-black/60">
                          <th className="py-6 px-8 text-left font-russo text-xl text-neon-yellow uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="py-6 px-8 text-left font-russo text-xl text-neon-yellow uppercase tracking-wider">
                            Player
                          </th>
                          <th className="py-6 px-8 text-left font-russo text-xl text-neon-yellow uppercase tracking-wider">
                            Stars
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
                              className="border-b border-neon-yellow/10 hover:bg-neon-yellow/5 hover:border-neon-yellow/30 transition-all duration-300 group relative"
                              data-testid={`row-rank-${player.rank}`}
                            >
                              <td className="py-6 px-8 relative">
                                {/* Background character image on hover */}
                                <div className="absolute inset-0 left-0 right-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none -z-10" style={{ width: 'calc(300%)' }}>
                                  <img 
                                    src={characterImage}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex items-center gap-4">
                                  {player.rank <= 6 && (
                                    <Medal className={`w-8 h-8 ${getMedalColor(player.rank)}`} />
                                  )}
                                  <span className={`text-3xl font-bold font-bebas ${getMedalColor(player.rank)}`}>
                                    #{player.rank}
                                  </span>
                                </div>
                              </td>
                              <td className="py-6 px-8 relative">
                                <div className="flex items-center gap-5">
                                  <div className="relative">
                                    <Avatar className="w-16 h-16 ring-4 ring-white/20 group-hover:ring-neon-yellow/60 transition-all shadow-xl">
                                      <AvatarImage src={player.user?.avatar || undefined} />
                                      <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-900 text-white font-bold text-xl">
                                        {player.playerName.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                  <span className="text-2xl text-white font-russo font-bold group-hover:text-neon-yellow transition-colors uppercase" 
                                        data-testid={`player-name-${player.rank}`}>
                                    {player.playerName}
                                  </span>
                                </div>
                              </td>
                              <td className="py-6 px-8 relative">
                                <div className="flex items-center gap-3">
                                  <div className="flex gap-1.5">
                                    {Array.from({ length: Math.min(player.stars, 7) }).map((_, i) => (
                                      <Crown
                                        key={i}
                                        className="w-6 h-6 fill-neon-yellow text-neon-yellow"
                                        style={{ filter: "drop-shadow(0 0 4px rgba(255, 215, 0, 0.8))" }}
                                      />
                                    ))}
                                    {player.stars > 7 && (
                                      <span className="text-neon-yellow font-bold text-xl ml-2 font-bebas">
                                        +{player.stars - 7}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-neon-yellow font-bebas text-2xl ml-2">
                                    {player.stars}
                                  </span>
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
