# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-01-29

### Added
- **Directory Comparison**: Ability to select "Base" and "Target" directories to compare file structures.
- **Smart File Matching**: Fuzzy identity matching (slugs) to handle moved or renamed files.
- **Diff Engine**:
  - Myers' diff algorithm for line-by-line comparison.
  - Intra-line highlighting for word-level changes.
  - Smart folding for unchanged code blocks.
- **UI Components**:
  - Dark mode design.
  - Mini-map for quick navigation of changes.
  - File statistics summary (Added/Removed/Modified counts).
- **Workspace Policy**: Settings to exclude specific file patterns.
- **Clipboard**: One-click copy functionality for file content.

### Infrastructure
- Initial project setup with React 19 and Vite.
- Tailwind CSS 4 integration.
