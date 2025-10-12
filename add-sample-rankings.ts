import "dotenv/config";
import { db } from './server/db.js';
import { playerRankings } from './shared/schema.js';

const samplePlayers = [
  { userId: "player-4", playerName: "SHADOW KING", stars: 850, rank: 4 },
  { userId: "player-5", playerName: "VIPER ACE", stars: 720, rank: 5 },
  { userId: "player-6", playerName: "GHOST RIDER", stars: 650, rank: 6 },
  { userId: "player-7", playerName: "THUNDER BOLT", stars: 580, rank: 7 },
  { userId: "player-8", playerName: "IRON WOLF", stars: 520, rank: 8 },
  { userId: "player-9", playerName: "DARK PHOENIX", stars: 460, rank: 9 },
  { userId: "player-10", playerName: "STORM BREAKER", stars: 400, rank: 10 },
];

async function addSampleRankings() {
  try {
    console.log('Adding sample rankings for positions 4-10...');
    
    for (const player of samplePlayers) {
      await db.insert(playerRankings)
        .values(player)
        .onConflictDoUpdate({
          target: playerRankings.userId,
          set: {
            playerName: player.playerName,
            stars: player.stars,
            rank: player.rank,
            updatedAt: new Date(),
          }
        });
      console.log(`✓ Added/Updated: ${player.playerName} (Rank #${player.rank}, ${player.stars} stars)`);
    }
    
    console.log('\n✅ Sample rankings added successfully!');
    console.log('Visit /rankings to see the complete leaderboard');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding sample rankings:', error);
    process.exit(1);
  }
}

addSampleRankings();
