# Contributing to PlotForge

Thank you for your interest in contributing to **PlotForge**! We welcome bug fixes, documentation improvements, new single-stroke fonts, algorithmic art generators, and printer kinematics profiles from the maker community worldwide.

---

## Code of Conduct

All contributors and participants are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat everyone with respect, kindness, and professionalism.

---

## Development Setup

PlotForge is built with **Next.js 14 (App Router)**, **TypeScript 5.7**, **Tailwind CSS**, and **Zustand**.

### Prerequisites
- **Node.js**: v18.18+ or v20+ LTS recommended
- **npm**: v9+ (or `pnpm` / `yarn`)

### Getting Started

```bash
# 1. Fork and clone the repository
git clone https://github.com/kumawat007/PlotForge.git
cd PlotForge

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## Quality & Testing Guidelines

Before opening a pull request, ensure all tests, type checks, and static production exports pass cleanly:

```bash
# 1. Run unit test suite (Vitest)
npm test

# 2. Verify TypeScript strict types
npx tsc --noEmit

# 3. Check linting standards
npm run lint

# 4. Confirm static export builds without errors
npm run build
```

---

## Pull Request Process

1. **Branch Naming**: Use clean, descriptive branch names (e.g. `feat/new-font-engine`, `fix/svg-arc-converter`, `docs/hardware-guide`).
2. **Commit Conventions**: We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New user-facing feature or CAM capability
   - `fix:` Bug fix or path optimization correction
   - `docs:` Documentation updates
   - `perf:` Performance or TSP path optimization improvement
   - `test:` Adding or refining unit tests
3. **Protected Folders**:
   - `cad_models/a1_mini_partdesign/`: Contains verified physical snap mounts for the Bambu Lab A1 Mini. Do not edit existing production CAD geometry without prior maintainer discussion.
4. **Submit PR**: Open your Pull Request against the `main` branch. Fill out the PR template with screenshots and testing notes.
