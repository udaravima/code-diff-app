# CodeDiff App (Version Lens)

A modern, high-performance web application for comparing files matches across two directories. Built with React and Vite, it offers an intuitive interface for visualizing code changes with support for intra-line highlighting, smart folding, and directory comparisons.

## ✨ Features

- **Directory Comparison**: Easily select "Base" and "Target" directories to compare entire project structures.
- **Smart File Matching**: Automatically matches files between directories based on fuzzy identity (slugs), handling moved or slightly renamed files.
- **Advanced Diff Engine**:
  - **Line-by-Line Diff**: Standard unified diff view.
  - **Intra-Line Highlighting**: Granular word-level diffs to pinpoint exact changes within a line.
  - **Smart Folding**: Automatically collapses large blocks of unchanged code to focus on what matters.
- **Visual Navigation**:
  - **Mini-Map**: Interactive heatmap sidebar to quickly jump to changes (Added/Removed/Modified).
  - **File Statistics**: Quick summary of Added, Removed, and Modified files.
- **Workspace Policy**: Customizable ignore patterns (e.g., `node_modules`, `.git`, images) to keep the comparison clean.
- **Modern UI**:
  - Sleek Dark Mode design.
  - Resizable sidebar.
  - Responsive and fluid animations.
  - One-click copy to clipboard.

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Linting**: ESLint

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd code-diff-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`).

### Building for Production

To create a production-ready build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## 📖 Usage

1. **Select Directories**:
   - Click **Select Base Folder** to choose the original version of your code.
   - Click **Select New Folder** to choose the modified version.
2. **Navigate Files**:
   - The sidebar lists all matched files.
   - Files are color-coded: **Blue** (Modified), **Green** (Added), **Red** (Deleted).
   - Use the search bar to filter files by name.
3. **Analyze Diffs**:
   - Click on a file to view the comparison.
   - Use the **Mini-Map** on the right to jump to different sections of the file.
   - Expand collapsed "Unchanged Lines" blocks if you need more context.
4. **Settings**:
   - Click the **Gear Icon** to manage excluded file patterns (e.g., ignore specific extensions or folders).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[MIT](LICENSE)
