/**
 * Database seed data script for default tags
 * 
 * Creates initial tags for common anime, manga, and gaming content
 */

import { TagCategory } from '../models/Tag.js';

export interface SeedTagData {
  name: string;
  category: TagCategory;
  description?: string;
  metadata?: any;
  parent_name?: string; // Will be resolved to parent_id
}

/**
 * Default tags to seed the database with
 */
export const SEED_TAGS: SeedTagData[] = [
  // Base categories
  { name: 'anime', category: 'general', description: 'Japanese animation' },
  { name: 'manga', category: 'general', description: 'Japanese comics' },
  { name: 'game', category: 'general', description: 'Video games' },
  { name: 'novel', category: 'general', description: 'Light novels and books' },
  { name: 'movie', category: 'general', description: 'Movies and films' },
  
  // Popular anime series
  { 
    name: 'attack-on-titan', 
    category: 'anime', 
    description: 'Attack on Titan / Shingeki no Kyojin',
    metadata: {
      japanese_name: '進撃の巨人',
      mal_id: 16498,
      series_type: 'tv',
      status: 'completed',
      episode_count: 87,
      start_date: '2013-04-07',
      end_date: '2023-11-04'
    }
  },
  { 
    name: 'demon-slayer', 
    category: 'anime', 
    description: 'Demon Slayer: Kimetsu no Yaiba',
    metadata: {
      japanese_name: '鬼滅の刃',
      mal_id: 38000,
      series_type: 'tv',
      status: 'airing',
      start_date: '2019-04-06'
    }
  },
  { 
    name: 'one-piece', 
    category: 'anime', 
    description: 'One Piece',
    metadata: {
      japanese_name: 'ワンピース',
      mal_id: 21,
      series_type: 'tv',
      status: 'airing',
      start_date: '1999-10-20'
    }
  },
  { 
    name: 'naruto', 
    category: 'anime', 
    description: 'Naruto series',
    metadata: {
      japanese_name: 'ナルト',
      mal_id: 20,
      series_type: 'tv',
      status: 'completed'
    }
  },
  { 
    name: 'dragon-ball', 
    category: 'anime', 
    description: 'Dragon Ball series',
    metadata: {
      japanese_name: 'ドラゴンボール',
      series_type: 'tv'
    }
  },

  // Anime genres
  { name: 'action', category: 'genre', description: 'Action and fighting' },
  { name: 'adventure', category: 'genre', description: 'Adventure and exploration' },
  { name: 'comedy', category: 'genre', description: 'Comedy and humor' },
  { name: 'drama', category: 'genre', description: 'Drama and emotional stories' },
  { name: 'fantasy', category: 'genre', description: 'Fantasy and magical elements' },
  { name: 'horror', category: 'genre', description: 'Horror and scary content' },
  { name: 'mystery', category: 'genre', description: 'Mystery and detective stories' },
  { name: 'romance', category: 'genre', description: 'Romance and love stories' },
  { name: 'sci-fi', category: 'genre', description: 'Science fiction' },
  { name: 'slice-of-life', category: 'genre', description: 'Slice of life and daily activities' },
  { name: 'sports', category: 'genre', description: 'Sports and competition' },
  { name: 'supernatural', category: 'genre', description: 'Supernatural and paranormal' },
  { name: 'thriller', category: 'genre', description: 'Thriller and suspense' },

  // Animation studios
  { name: 'studio-ghibli', category: 'studio', description: 'Studio Ghibli films' },
  { name: 'madhouse', category: 'studio', description: 'Madhouse animations' },
  { name: 'toei-animation', category: 'studio', description: 'Toei Animation' },
  { name: 'mappa', category: 'studio', description: 'MAPPA studio' },
  { name: 'bones', category: 'studio', description: 'Studio Bones' },
  { name: 'ufotable', category: 'studio', description: 'Ufotable studio' },
  { name: 'wit-studio', category: 'studio', description: 'WIT Studio' },

  // Popular manga
  { 
    name: 'one-piece-manga', 
    category: 'manga', 
    description: 'One Piece manga',
    metadata: {
      japanese_name: 'ワンピース',
      mal_id: 13,
      status: 'publishing',
      start_date: '1997-07-22'
    }
  },
  { 
    name: 'attack-on-titan-manga', 
    category: 'manga', 
    description: 'Attack on Titan manga',
    metadata: {
      japanese_name: '進撃の巨人',
      mal_id: 23390,
      status: 'completed',
      start_date: '2009-09-09',
      end_date: '2021-04-09'
    }
  },

  // Gaming platforms and genres
  { name: 'nintendo-switch', category: 'game', description: 'Nintendo Switch games' },
  { name: 'playstation', category: 'game', description: 'PlayStation games' },
  { name: 'xbox', category: 'game', description: 'Xbox games' },
  { name: 'pc', category: 'game', description: 'PC games' },
  { name: 'mobile', category: 'game', description: 'Mobile games' },
  { name: 'jrpg', category: 'genre', description: 'Japanese RPG games' },
  { name: 'action-rpg', category: 'genre', description: 'Action RPG games' },
  { name: 'platformer', category: 'genre', description: 'Platform games' },
  { name: 'puzzle', category: 'genre', description: 'Puzzle games' },
  { name: 'fighting', category: 'genre', description: 'Fighting games' },

  // Rating tags
  { name: 'masterpiece', category: 'rating', description: '5-star rating' },
  { name: 'excellent', category: 'rating', description: '4-star rating' },
  { name: 'good', category: 'rating', description: '3-star rating' },
  { name: 'mediocre', category: 'rating', description: '2-star rating' },
  { name: 'poor', category: 'rating', description: '1-star rating' },

  // Status tags
  { name: 'watching', category: 'status', description: 'Currently watching' },
  { name: 'completed', category: 'status', description: 'Finished watching/reading' },
  { name: 'on-hold', category: 'status', description: 'Paused' },
  { name: 'dropped', category: 'status', description: 'Discontinued' },
  { name: 'plan-to-watch', category: 'status', description: 'Planning to watch' },

  // Seasonal tags
  { name: 'spring-2024', category: 'season', description: 'Spring 2024 anime season' },
  { name: 'summer-2024', category: 'season', description: 'Summer 2024 anime season' },
  { name: 'fall-2024', category: 'season', description: 'Fall 2024 anime season' },
  { name: 'winter-2025', category: 'season', description: 'Winter 2025 anime season' },

  // Year tags (recent years)
  { name: '2024', category: 'year', description: '2024 releases', metadata: { year: 2024 } },
  { name: '2023', category: 'year', description: '2023 releases', metadata: { year: 2023 } },
  { name: '2022', category: 'year', description: '2022 releases', metadata: { year: 2022 } },
  { name: '2021', category: 'year', description: '2021 releases', metadata: { year: 2021 } },
  { name: '2020', category: 'year', description: '2020 releases', metadata: { year: 2020 } },

  // Popular characters (examples)
  { 
    name: 'eren-yeager', 
    category: 'character', 
    description: 'Eren Yeager from Attack on Titan',
    parent_name: 'attack-on-titan',
    metadata: {
      full_name: 'Eren Yeager',
      japanese_name: 'エレン・イェーガー'
    }
  },
  { 
    name: 'tanjiro-kamado', 
    category: 'character', 
    description: 'Tanjiro Kamado from Demon Slayer',
    parent_name: 'demon-slayer',
    metadata: {
      full_name: 'Tanjiro Kamado',
      japanese_name: '竈門 炭治郎'
    }
  },
  { 
    name: 'monkey-d-luffy', 
    category: 'character', 
    description: 'Monkey D. Luffy from One Piece',
    parent_name: 'one-piece',
    metadata: {
      full_name: 'Monkey D. Luffy',
      japanese_name: 'モンキー・D・ルフィ'
    }
  }
];

/**
 * Create seed data in the database
 */
export async function seedDatabase(db: any): Promise<void> {
  try {
    console.log('Starting database seeding...');
    
    // Create a map to track tag IDs by name for parent relationships
    const tagIdMap = new Map<string, number>();
    
    // First pass: Create all tags without parent relationships
    for (const tagData of SEED_TAGS) {
      const { parent_name, ...insertData } = tagData;
      
      const result = await db.prepare(`
        INSERT OR IGNORE INTO tags (name, category, description, metadata)
        VALUES (?, ?, ?, ?)
      `).run(
        insertData.name,
        insertData.category,
        insertData.description || null,
        JSON.stringify(insertData.metadata || {})
      );
      
      // Get the tag ID (either newly created or existing)
      const tag = await db.prepare(`
        SELECT id FROM tags WHERE name = ?
      `).get(insertData.name);
      
      if (tag) {
        tagIdMap.set(insertData.name, tag.id);
      }
    }
    
    // Second pass: Update parent relationships
    for (const tagData of SEED_TAGS) {
      if (tagData.parent_name) {
        const parentId = tagIdMap.get(tagData.parent_name);
        const childId = tagIdMap.get(tagData.name);
        
        if (parentId && childId) {
          // Update the child tag with parent_id
          await db.prepare(`
            UPDATE tags SET parent_id = ? WHERE id = ?
          `).run(parentId, childId);
          
          // Create tag association
          await db.prepare(`
            INSERT OR IGNORE INTO tag_associations 
            (parent_tag_id, child_tag_id, relationship_type, metadata)
            VALUES (?, ?, 'parent-child', '{"source": "seed"}')
          `).run(parentId, childId);
        }
      }
    }
    
    console.log(`Successfully seeded ${SEED_TAGS.length} tags`);
    
    // Update usage counts (will be 0 initially)
    await db.exec(`
      UPDATE tags SET usage_count = 0 WHERE usage_count IS NULL
    `);
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

/**
 * Clear all seed data (for testing)
 */
export async function clearSeedData(db: any): Promise<void> {
  try {
    await db.exec('DELETE FROM tag_associations WHERE JSON_EXTRACT(metadata, "$.source") = "seed"');
    await db.exec('DELETE FROM tags WHERE id > 0'); // Clear all tags
    console.log('Seed data cleared successfully');
  } catch (error) {
    console.error('Error clearing seed data:', error);
    throw error;
  }
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