# Contract Snapshot: Hobby Content Log API

Source of truth: [`/api/v1/openapi.yaml`](../../api/v1/openapi.yaml) (canonical API specification)

## Authentication
| Endpoint | Method | Description | Success | Failure |
|----------|--------|-------------|---------|---------|
| `/auth/twitter` | GET | Initiate OAuth redirect flow | 302 redirect to Twitter | 400 malformed request |
| `/auth/callback` | GET | Exchange `code` + `state` for session | 302 redirect with `Set-Cookie: session` | 401 invalid state/code |
| `/auth/logout` | POST | Destroy active session | 200 JSON `{ success: true }` | 401 if no session |

## Users
| Endpoint | Method | Description | Success | Failure |
|----------|--------|-------------|---------|---------|
| `/users/me` | GET | Fetch currently authenticated user profile | 200 `User` payload | 401 unauthenticated |

## Tags
| Endpoint | Method | Description | Success | Failure |
|----------|--------|-------------|---------|---------|
| `/tags` | GET | Search/list tags (`search`, `limit`, `offset`) | 200 `{ items, total, limit, offset }` | — |
| `/tags` | POST | Create tag | 201 `Tag` | 400 invalid body · 401 unauthenticated |
| `/tags/{tagId}` | GET | Fetch tag detail | 200 `TagDetail` | 404 missing |
| `/tags/{tagId}` | PUT | Update tag | 200 `Tag` | 401 unauth · 403 forbidden · 404 missing |
| `/tags/{tagId}` | DELETE | Remove tag | 204 empty | 401 unauth · 403 forbidden · 404 missing |
| `/tags/{tagId}/associations` | GET | Related tags | 200 `[Tag]` | 404 missing |
| `/tags/{tagId}/associations` | POST | Associate tag | 201 empty | 400 invalid · 401 unauth · 404 missing |
| `/tags/{tagId}/associations` | DELETE | Remove association (`associated_tag_id` query) | 204 empty | 401 unauth · 404 missing |

## Logs
| Endpoint | Method | Description | Success | Failure |
|----------|--------|-------------|---------|---------|
| `/logs` | GET | Public logs (filter by `tag_ids`, `user_id`, `limit`, `offset`) | 200 `{ items, total }` | — |
| `/logs` | POST | Create log | 201 `Log` | 400 invalid · 401 unauth |
| `/logs/{logId}` | GET | Log detail | 200 `LogDetail` | 404 missing |
| `/logs/{logId}` | PUT | Update log | 200 `Log` | 401 unauth · 403 forbidden · 404 missing |
| `/logs/{logId}` | DELETE | Remove log | 204 empty | 401 unauth · 403 forbidden · 404 missing |
| `/logs/{logId}/related` | GET | Related logs (filter by `limit`) | 200 `{ items, total }` | 404 missing log |
| `/logs/{logId}/share` | POST | Share log to Twitter | 200 `{ twitter_post_id }` | 401 unauth · 403 forbidden · 404 missing |

## Contract Testing Notes
- Implement Vitest suites per top-level route group (`auth.contract.test.ts`, `users.contract.test.ts`, `tags.contract.test.ts`, `logs.contract.test.ts`).
- Leverage a shared helper to bootstrap Worker instance against seeded D1 database.
- Assert HTTP status codes, response schema subsets, and side-effects (e.g., D1 row creation) for mutating endpoints.
- Include negative assertions for authentication/authorization branches where applicable.
