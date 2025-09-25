# Quickstart: Hobby Content Review Logging Service

## User Journey Testing Scenarios

### Scenario 1: New User Registration and First Review
**Goal**: Complete user onboarding and create first content review using tag system

**Steps**:
1. **Navigate to landing page**
   - Open https://shumilog.example.com
   - Verify mobile-responsive design loads correctly
   - See simple, lightweight interface with plain HTML styling

2. **Authenticate with Twitter**
   - Click "Login with Twitter" button
   - Redirect to Twitter OAuth page
   - Grant permissions to the application
   - Redirect back to application with successful authentication
   - Verify user profile shows Twitter username and avatar

3. **Create content tag and first review**
   - Navigate to "Add Review" page
   - Search for existing content tag or create new one:
     * Search: "Attack on Titan" - no results found
     * Create new content tag: "Attack on Titan"
     * Select parent category tag: "Anime"
     * Add metadata: `{"year": 2013, "studio": "Studio WIT", "official_url": "https://attackontitan.com"}`
   - Fill review form:
     * Title: "Amazing first season!"
     * Content (Markdown): "This anime really hooked me from episode 1. The animation quality is top-notch and the story keeps you guessing."
     * Rating: 5 stars
     * Privacy: Keep private initially
   - Submit review
   - Verify content tag is created and review is saved

4. **Make review public and share**
   - Edit the review to make it public
   - Use "Share to Twitter" feature
   - Verify Twitter post is created with review content
   - Verify review appears in public tag-based browsing

**Expected Results**:
- User successfully authenticates via Twitter OAuth
- New content tag is created under anime category
- Review is created with Markdown formatting properly rendered
- Privacy controls work correctly
- Twitter integration posts review content
- Review appears in tag-based content browsing

### Scenario 2: Episode-Level Review Tracking with Tag Hierarchy
**Goal**: Log reviews for individual episodes using tag parent-child relationships

**Steps**:
1. **Find or create serialized content tag**
   - Search for "One Piece" content tag
   - If not found, create new content tag:
     * Title: "One Piece"
     * Type: content
     * Parent: "Anime" category tag
     * Metadata: `{"year": 1999, "studio": "Toei Animation", "episode_count": 1000}`

2. **Create episode tag and review**
   - Navigate to One Piece content tag page
   - Click "Add Episode Review"
   - Create new episode tag:
     * Title: "Romance Dawn"
     * Type: episode
     * Parent: "One Piece" content tag
     * Metadata: `{"episode_number": 1, "air_date": "1999-10-20"}`
   - Create episode review:
     * Title: "Great series opener"
     * Content: "Perfect introduction to Luffy's character. Sets up the adventure perfectly."
     * Rating: 4 stars
     * Make public immediately
   - Submit and verify episode tag and review are created

3. **Track progress through series**
   - Update progress status for "One Piece" content tag to "watching"
   - Set current episode number to 1
   - Verify progress tracking shows correct status

4. **Browse tag hierarchy and reviews**
   - Navigate to "One Piece" content tag page
   - See child episode tags organized by episode number
   - Verify tag-based browsing shows hierarchical episode organization
   - Browse from Anime category → One Piece content → Episode tags

**Expected Results**:
- Episode tags are properly created as children of content tags
- Progress tracking works at content tag level
- Tag hierarchy enables content-centric browsing
- Episode metadata is stored flexibly in tag system

### Scenario 3: Tag-Based Content Discovery and Flexible Metadata
**Goal**: Discover content through tag-based browsing and utilize flexible metadata storage

**Steps**:
1. **Browse public reviews by tags**
   - Navigate to public reviews section
   - Filter by category tag: "Anime"
   - Browse content tags under anime category
   - Find highly-rated content tags through review aggregation

2. **Access flexible tag metadata**
   - Click on content tag with good reviews (e.g., "Demon Slayer")
   - View tag metadata displaying:
     * Wikipedia URL from metadata JSON
     * Official website from metadata JSON
     * Studio, year, episode count from metadata
   - See aggregate rating and review count for this content tag

3. **Add to personal tracking**
   - Add discovered content tag to "plan to watch" list
   - Verify it appears in personal tag progress tracking
   - Set initial status as "plan_to_watch"

**Expected Results**:
- Tag-based browsing effectively surfaces popular content tags
- Flexible metadata system displays diverse content information
- External links to Wikipedia and official sites work correctly
- Personal tracking integrates with content discovery
- Aggregate ratings provide useful decision-making information

### Scenario 4: Mobile-First Experience
**Goal**: Verify excellent mobile user experience

**Steps**:
1. **Access on mobile device**
   - Open application on smartphone browser
   - Verify responsive design adapts to mobile screen
   - Test portrait and landscape orientations

2. **Complete full review workflow on mobile**
   - Authenticate via Twitter (mobile OAuth flow)
   - Create new review using mobile interface
   - Use GitHub Flavored Markdown formatting
   - Submit and share to Twitter

3. **Browse content on mobile**
   - Navigate content browsing interface
   - Verify smooth scrolling and touch interactions
   - Test search functionality with mobile keyboard

**Expected Results**:
- Mobile interface is fully functional and responsive
- Touch interactions work smoothly
- Text input and formatting work well on mobile keyboards
- All core functionality accessible without desktop

### Scenario 5: Dynamic Category Tag Creation and Management
**Goal**: Test creation and management of custom category tags

**Steps**:
1. **View available category tags**
   - Navigate to tag browsing section
   - Filter by type: "category"
   - View list of default category tags (anime, manga, game, etc.)
   - See tag hierarchy and usage statistics

2. **Create new category tag**
   - Add new category tag: "Light Novel"
   - Fill form:
     * Title: "Light Novel"
     * Type: "category"
     * Description: "Japanese light novels and web novels"
     * Parent: None (root-level category)
     * Metadata: `{"supports_episodes": true, "icon": "📖"}`
   - Submit and verify new category tag is created

3. **Create content under new category**
   - Create new content tag: "Overlord"
   - Set parent to "Light Novel" category tag
   - Add content metadata: `{"volumes": 16, "author": "Kugane Maruyama"}`
   - Create episode tags for specific volumes
   - Create review for specific volume episode tag
   - Verify category filtering works with new tag hierarchy

4. **Modify category tag**
   - Edit the "Light Novel" category tag
   - Update description or metadata
   - Verify changes don't break existing content tag relationships

5. **Test tag validation and relationships**
   - Try to create category tag with invalid parent (content or episode tag)
   - Try to create content tag without category parent
   - Try to create episode tag without content tag parent
   - Verify proper validation errors for hierarchy rules

**Expected Results**:
- New category tags can be created and form proper hierarchy
- Content and episode tags correctly reference category parents
- Tag modifications maintain referential integrity
- Validation enforces proper tag hierarchy rules

### Scenario 6: Error Handling and Edge Cases
**Goal**: Verify graceful handling of error conditions

**Steps**:
1. **Test authentication failures**
   - Attempt access to protected endpoints without authentication
   - Verify proper 401 responses and redirect to login

2. **Test invalid tag scenarios**
   - Try to create review for non-existent content tag
   - Submit review with invalid data (empty content, invalid rating)
   - Try to create content tag without valid category parent
   - Try to create episode tag with content tag as parent that doesn't exist
   - Verify proper error messages and validation

3. **Test Twitter integration failures**
   - Attempt to share review when Twitter API is unavailable
   - Verify graceful degradation (review still saved, sharing fails gracefully)

4. **Test tag creation edge cases**
   - Try to create duplicate episode tags under same content tag
   - Create tags with missing optional fields
   - Try to delete category tag that has child content tags
   - Try to delete content tag that has child episode tags or reviews
   - Verify database constraints and foreign key relationships are enforced

**Expected Results**:
- Authentication failures handled gracefully with clear messaging
- Tag validation prevents invalid hierarchy relationships
- External service failures don't break core functionality
- Database integrity maintained with proper cascading rules
- Tag dependencies properly enforced throughout hierarchy

## Performance and Cost Validation

### Performance Targets
- **Page Load Time**: < 2 seconds on mobile 3G connection
- **API Response Time**: < 200ms for most endpoints
- **Search Response**: < 500ms for content/review search

### Cost Monitoring
- **Cloudflare Workers**: Monitor request count against 100k/day free limit
- **D1 Database**: Track reads/writes against 25M reads/month limit
- **KV Storage**: Monitor session storage usage
- **Twitter API**: Track authentication and posting requests

### Scalability Testing
- Test with 50 concurrent users creating reviews
- Verify database performance with 1000+ content items
- Test search functionality with large dataset

## Success Criteria
- [ ] All user journey scenarios complete successfully
- [ ] Mobile experience is smooth and fully functional
- [ ] Error conditions handled gracefully
- [ ] Performance targets met consistently
- [ ] Cost remains within free tier limits
- [ ] Twitter integration works reliably
- [ ] Tag-based browsing provides good content discovery experience
- [ ] Markdown rendering works correctly in all contexts
- [ ] Dynamic category tag creation and hierarchical relationships work seamlessly
- [ ] Tag metadata storage handles diverse content information flexibly
- [ ] Content type validation prevents invalid configurations
- [ ] Custom content types integrate properly with all existing features