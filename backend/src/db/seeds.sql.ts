/**
 * Database seed data script for default tags
 * 
 * Creates initial tags for common anime, manga, and gaming content
 */

export interface SeedTagData {
  title: string;
  description?: string;
  metadata?: any;
}

/**
 * Default tags to seed the database with
 */
export const SEED_TAGS: SeedTagData[] = [
  // Base categories
  { title: 'anime', description: 'Japanese animation' },
  { title: 'manga', description: 'Japanese comics' },
  { title: 'game', description: 'Video games' },
  { title: 'novel', description: 'Light novels and books' },
  { title: 'movie', description: 'Movies and films' },
  
  // Popular anime series
  { 
    title: 'attack-on-titan', 
    description: 'Attack on Titan / Shingeki no Kyojin',
    metadata: {
      japanese_name: '進撃の巨人',
      mal_id: 16498
    }
  },
  { 
    title: 'demon-slayer', 
    description: 'Demon Slayer: Kimetsu no Yaiba',
    metadata: {
      japanese_name: '鬼滅の刃',
      mal_id: 38000
    }
  },
  { 
    title: 'one-piece', 
    description: 'One Piece',
    metadata: {
      japanese_name: 'ワンピース',
      mal_id: 21
    }
  },
  
  // Basic genres
  { title: 'action', description: 'Action and fighting' },
  { title: 'adventure', description: 'Adventure and exploration' },
  { title: 'comedy', description: 'Comedy and humor' },
  { title: 'drama', description: 'Drama and emotional stories' },
  { title: 'fantasy', description: 'Fantasy and magical elements' },
  { title: 'romance', description: 'Romance and love stories' },
  { title: 'sci-fi', description: 'Science fiction' },
  { title: 'slice-of-life', description: 'Slice of life and daily activities' },
  
  // Status tags
  { title: 'completed', description: 'Finished watching/reading' },
  { title: 'watching', description: 'Currently watching' },
  { title: 'reading', description: 'Currently reading' },
  { title: 'on-hold', description: 'Paused' },
  { title: 'dropped', description: 'Stopped watching/reading' },
  { title: 'plan-to-watch', description: 'Planning to watch' },
  { title: 'plan-to-read', description: 'Planning to read' }
];

/**
 * SQL for creating seed tags
 */
export function generateSeedTagsSQL(): string {
  const insertStatements = SEED_TAGS.map((tag, index) => {
    const id = `seed_tag_${index + 1}`;
    const metadata = JSON.stringify(tag.metadata || {});
    const createdAt = new Date().toISOString();
    
    return `INSERT INTO tags (id, title, description, metadata, created_by, created_at, updated_at) 
      VALUES ('${id}', '${tag.title}', '${tag.description || ''}', '${metadata}', 'system', '${createdAt}', '${createdAt}');`;
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