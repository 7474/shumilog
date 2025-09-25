# Quickstart: Hobby Content Log Service

## User Journey Testing Scenarios

### Scenario 1: New User Registration and First Log
**Goal**: Complete user onboarding and create first content log using tag system

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

3. **Create tags and first log**
   - Navigate to "Add Log" page
   - Search for existing tags or create new ones as needed:
     * Search: "Attack on Titan" - no results found
     * Create new tag: "Attack on Titan"
     * Add metadata: `{"year": 2013, "studio": "Studio WIT", "official_url": "https://attackontitan.com"}`
     * Create association between "Attack on Titan" and "Anime" tags
   - Fill log form:
     * Title: "Amazing first season!"
     * Content (Markdown): "This anime really hooked me from episode 1. The animation quality is top-notch and the story keeps you guessing."
     * Associated tags: Select "Anime" and "Attack on Titan" tags
     * Privacy: Keep private initially
   - Submit log
   - Verify tags are created, associated with each other, and log is linked to multiple tags

4. **Make log public and share**
   - Edit the log to make it public
   - Use "Share to Twitter" feature
   - Verify Twitter post is created with log content
   - Verify log appears in public tag-based browsing

**Expected Results**:
- User successfully authenticates via Twitter OAuth
- New content tag is created and associated with anime tag
- Log is created with Markdown formatting properly rendered
- Privacy controls work correctly
- Twitter integration posts log content
- Log appears in tag-based content browsing

### Scenario 2: Episode-Level Review Tracking with Tag Associations
**Goal**: Log reviews for individual episodes using tag parent-child relationships

**Steps**:
1. **Find or create content tag**
   - Search for "One Piece" tag
   - If not found, create new tag:
     * Title: "One Piece"
     * Metadata: `{"year": 1999, "studio": "Toei Animation", "episode_count": 1000}`
     * Create association with "Anime" tag

2. **Create episode tag and review**
   - Navigate to tag management
   - Create new episode tag:
     * Title: "Romance Dawn"
     * Metadata: `{"episode_number": 1, "air_date": "1999-10-20"}`
     * Create association with "One Piece" tag
   - Create episode log:
     * Title: "Great series opener"
     * Content: "Perfect introduction to Luffy's character. Sets up the adventure perfectly."
     * Associated tags: Select "Anime", "One Piece", and "Romance Dawn" tags
     * Make public immediately
   - Submit and verify log is associated with all three tags

3. **Track progress through series**
   - Update progress status for "One Piece" tag to "watching"
   - Set current episode number to 1
   - Verify progress tracking shows correct status

4. **Browse tag associations and logs**
   - Navigate to "One Piece" tag page
   - See associated episode tags organized by episode number
   - Verify tag-based browsing shows associated episode organization
   - Browse through tag associations: Anime ↔ One Piece ↔ Episode tags

**Expected Results**:
- Episode tags are created and associated with related content tags
- Logs can be associated with multiple related tags simultaneously
- Progress tracking works at tag level
- Tag associations enable flexible browsing patterns
- Episode metadata is stored flexibly in tag system

### Scenario 3: Tag-Based Content Discovery and Flexible Metadata
**Goal**: Discover content through tag-based browsing and utilize flexible metadata storage

**Steps**:
1. **Browse public logs by tags**
   - Navigate to public logs section
   - Filter by tag: "Anime"
   - Browse tags associated with anime
   - Find interesting tags through log aggregation

2. **Access flexible tag metadata**
   - Click on tag with good logs (e.g., "Demon Slayer")
   - View tag metadata displaying:
     * Wikipedia URL from metadata JSON
     * Official website from metadata JSON
     * Studio, year, episode count from metadata
   - See log count for this tag

3. **Add to personal tracking**
   - Add discovered tag to "plan to watch" list
   - Verify it appears in personal tag progress tracking
   - Set initial status as "plan_to_watch"
   - Create log associated with multiple related tags

**Expected Results**:
- Tag-based browsing effectively surfaces popular tags
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

2. **Complete full log workflow on mobile**
   - Authenticate via Twitter (mobile OAuth flow)
   - Create new log using mobile interface
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

### Scenario 5: Dynamic Tag Creation and Management
**Goal**: Test creation and management of custom tags

**Steps**:
1. **View available tags**
   - Navigate to tag browsing section
   - View list of default tags (anime, manga, game, etc.)
   - See tag associations and usage statistics

2. **Create new tag**
   - Add new tag: "Light Novel"
   - Fill form:
     * Title: "Light Novel"
     * Description: "Japanese light novels and web novels"
     * Metadata: `{"supports_episodes": true, "icon": "📖"}`
   - Submit and verify new tag is created

3. **Create associated tags**
   - Create new tag: "Overlord"
   - Add metadata: `{"volumes": 16, "author": "Kugane Maruyama"}`
   - Create association between "Overlord" and "Light Novel" tags
   - Create episode tags for specific volumes and associate them
   - Create log associated with multiple related tags
   - Verify tag associations work for browsing and filtering

4. **Modify category tag**
   - Edit the "Light Novel" category tag
   - Update description or metadata
   - Verify changes don't break existing content tag relationships

5. **Test tag validation and associations**
   - Try to create association between non-existent tags
   - Try to create duplicate associations
   - Try to associate tag with itself
   - Verify proper validation errors for association rules

**Expected Results**:
- New tags can be created and associated freely
- Tag associations are bidirectional and flexible
- Tag modifications maintain referential integrity
- Validation enforces proper association rules

### Scenario 6: Error Handling and Edge Cases
**Goal**: Verify graceful handling of error conditions

**Steps**:
1. **Test authentication failures**
   - Attempt access to protected endpoints without authentication
   - Verify proper 401 responses and redirect to login

2. **Test invalid tag scenarios**
   - Try to create log with non-existent tag IDs
   - Submit log with invalid data (empty content, no associated tags)
   - Try to create tag association with non-existent tag
   - Try to associate log with tags that don't exist
   - Verify proper error messages and validation

3. **Test Twitter integration failures**
   - Attempt to share log when Twitter API is unavailable
   - Verify graceful degradation (log still saved, sharing fails gracefully)

4. **Test tag creation edge cases**
   - Try to create duplicate tag associations
   - Create tags with missing optional fields
   - Try to delete tag that has associated logs
   - Try to delete tag that has associated tags
   - Verify database constraints and foreign key relationships are enforced

**Expected Results**:
- Authentication failures handled gracefully with clear messaging
- Tag validation prevents invalid associations
- External service failures don't break core functionality
- Database integrity maintained with proper cascading rules
- Tag associations properly enforced

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
- [ ] Dynamic tag creation and associations work seamlessly
- [ ] Tag metadata storage handles diverse content information flexibly
- [ ] Multiple tag associations enable flexible log categorization
- [ ] Log filtering by associated tags works correctly
- [ ] Tag association validation prevents invalid configurations
- [ ] Custom tags integrate properly with all existing features