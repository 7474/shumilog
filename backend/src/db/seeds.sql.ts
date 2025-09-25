/**
 * Database seed data script for default tags
 * 
 * Creates initial tags for common anime, manga, and gaming content
 */

export interface SeedTagData {
  name: string;
  description?: string;
  metadata?: any;
}

/**
 * Default tags to seed the database with
 */
export const SEED_TAGS: SeedTagData[] = [
  // Base categories
  { name: 'anime', description: 'Japanese animation' },
  { name: 'manga', description: 'Japanese comics' },
  { name: 'game', description: 'Video games' },
  { name: 'novel', description: 'Light novels and books' },
  { name: 'movie', description: 'Movies and films' },
  
  // Popular anime series
  { 
    name: 'attack-on-titan', 
    description: 'Attack on Titan / Shingeki no Kyojin',
    metadata: {
      japanese_name: '進撃の巨人',
      mal_id: 16498
    }
  },
  { 
    name: 'demon-slayer', 
    description: 'Demon Slayer: Kimetsu no Yaiba',
    metadata: {
      japanese_name: '鬼滅の刃',
      mal_id: 38000
    }
  },
  { 
    name: 'one-piece', 
    description: 'One Piece',
    metadata: {
      japanese_name: 'ワンピース',
      mal_id: 21
    }
  },
  
  // Basic genres
  { name: 'action', description: 'Action and fighting' },
  { name: 'adventure', description: 'Adventure and exploration' },
  { name: 'comedy', description: 'Comedy and humor' },
  { name: 'drama', description: 'Drama and emotional stories' },
  { name: 'fantasy', description: 'Fantasy and magical elements' },
  { name: 'romance', description: 'Romance and love stories' },
  { name: 'sci-fi', description: 'Science fiction' },
  { name: 'slice-of-life', description: 'Slice of life and daily activities' },
  
  // Status tags
  { name: 'completed', description: 'Finished watching/reading' },
  { name: 'watching', description: 'Currently watching' },
  { name: 'reading', description: 'Currently reading' },
  { name: 'on-hold', description: 'Paused' },
  { name: 'dropped', description: 'Stopped watching/reading' },
  { name: 'plan-to-watch', description: 'Planning to watch' },
  { name: 'plan-to-read', description: 'Planning to read' }
];

/**
 * SQL for creating seed tags
 */
export function generateSeedTagsSQL(): string {
  const insertStatements = SEED_TAGS.map((tag, index) => {
    const id = `seed_tag_${index + 1}`;
    const metadata = JSON.stringify(tag.metadata || {});
    const createdAt = new Date().toISOString();
    
    return `INSERT INTO tags (id, name, description, metadata, created_by, created_at, updated_at) 
      VALUES ('${id}', '${tag.name}', '${tag.description || ''}', '${metadata}', 'system', '${createdAt}', '${createdAt}');`;
  });
  
  return insertStatements.join('\n');
}

/**
 * Check if database has been seeded
 */
export async function isDatabaseSeeded(db: any): Promise<boolean> {
  try {
    const result = await db.prepare(`
      SELECT COUNT(*) as count FROM tags
    `).get();
    
    return result.count > 0;
  } catch (error) {
    return false;
  }
}