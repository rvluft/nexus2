# Nexus — Changelog

All notable changes to the Nexus project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2026-03-12

### Added
- Initial release (refactored from PHP/MySQL to NestJS/PostgreSQL)
- Complete backend API (NestJS 10 + TypeScript)
  - Authentication (JWT with Passport)
  - RBAC (roles + permissions)
  - Files management (upload, list, delete, reprocess)
  - Knowledge base CRUD
  - Ingestion jobs tracking
  - Audit logs (interceptor global)
  - Health check endpoint
  - Swagger documentation
- Complete frontend (React 19 + Vite + Tailwind)
  - Login page
  - Dashboard with stats
  - Files page (upload, table, actions)
  - Knowledge page (list, search, edit)
  - Admin: Users management
  - Admin: Audit logs
  - Responsive layout with Lumen design system
- Docker support (dev + prod)
- PostgreSQL schema with seed data
- Documentation (README, QUICKSTART, PROJECT_SUMMARY, MIGRATION_GUIDE)
- Security baseline (JWT, bcrypt, CORS, headers)

### Changed
- N/A (initial version)

### Deprecated
- N/A (initial version)

### Removed
- N/A (initial version)

### Fixed
- N/A (initial version)

### Security
- JWT tokens with 15min expiry
- Bcrypt password hashing (12 rounds)
- Global audit interceptor (logs all authenticated requests)
- CORS restricted to frontend origin
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)

---

## [Unreleased]

### Planned
- n8n webhook callbacks for job status updates
- Google Drive API integration for direct uploads
- Vector search with pgvector
- Rate limiting middleware
- Automated tests (Jest unit + e2e)
- CI/CD pipeline
- Monitoring (Prometheus + Grafana)
- Refresh tokens for JWT
- Export audit logs to CSV
- Internationalization (i18n)
- Dark mode support

---

## Migration Notes

From: `/Nexus` (PHP/Lumen + MySQL)
To: `/Nexus2` (NestJS + PostgreSQL)

See `MIGRATION_GUIDE.md` for detailed instructions.

---

**Legend**:
- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability patches
