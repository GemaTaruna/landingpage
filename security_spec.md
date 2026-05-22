# Security Specification for Gema Taruna Landing Page

## Data Invariants
- `Personnel` documents must have a valid `angkatan` (string) and a non-empty `name`.
- `Gallery` documents must have a valid `imageUrl`.
- `Settings` can only be updated by the admin.
- Public can read all data, but only defined admins can write.

## Identity Roles
- **Admin:** `nupha7@gmail.com` (user who requested the feature).
- **Public:** Any unauthenticated or non-admin user.

## The Dirty Dozen (Forbidden Payloads)
1. Unauthenticated user trying to create a Personnel record.
2. Authenticated non-admin trying to update Settings.
3. Admin trying to inject a 1MB string into Personnel name.
4. Admin trying to create Personnel without `createdAt`.
5. Admin trying to create Gallery item with invalid `isLarge` type (e.g., string instead of bool).
6. Admin trying to update Personnel without updating `updatedAt` (if we implement it, but for now we enforce `createdAt` on create).
7. Non-admin trying to delete a Gallery image.
8. Admin trying to use a non-alphanumeric ID for a document.
9. Anonymous user trying to skip Google verification (if allowed, but we require email verification).
10. Admin trying to set `createdAt` to a future/past date instead of `request.time`.
11. Bypassing the whitelist of fields in `Settings` update.
12. Creating a Personnel record with missing `instrument` field.
