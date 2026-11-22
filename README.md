# PlotForge Studio 🖋️

<div align="center">

![PlotForge Studio](https://img.shields.io/badge/PLOTFORGE-STUDIO_v1.0-EA580C?style=for-the-badge&logoColor=white)
[![Next.js 14](https://img.shields.io/badge/Next.js_14-App_Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript_5.7-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vitest](https://img.shields.io/badge/Vitest-84_Tests_Passing-059669?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev)
[![100% Client-Side](https://img.shields.io/badge/Privacy-100%25_Client--Side-0284C7?style=for-the-badge)](#-100-client-side--private)
[![License: MIT](https://img.shields.io/badge/License-MIT-D97706?style=for-the-badge)](LICENSE)

### Turn your 3D printer into a high-precision pen plotter in 60 seconds.
**Optimized for Bambu Lab A1 Mini & A1 • Also supports Ender 3, Marlin & GRBL**  
**100% Free • Runs in your browser • Zero sign-up • Zero cloud servers**

[**⚡ Launch Studio**](http://localhost:3000) • [**📦 Download 3D Printable Pen Mounts**](https://makerworld.com/en/@kumawat007) • [**☕ Buy Me a Coffee**](https://buymeacoffee.com/kumawat007)

</div>

---

## ⚡ Quick 3-Step Start

```
1. 3D Print Mount  ──▶  2. Design in PlotForge  ──▶  3. Export & Plot!
   (Snap-on PIP bracket)   (Text, Photos, SVGs)        (Standard .gcode)
```

1. **3D Print the Mount**: Download the 1-piece snap-on pen mount from [MakerWorld](https://makerworld.com/en/@kumawat007) or use the models in [`cad_models/a1_mini_partdesign/`](cad_models/a1_mini_partdesign/).
2. **Design Your Plot**: Open PlotForge, type single-stroke text, drop an image/SVG, or draw freehand.
3. **Export & Plot**: Click **Export G-Code**, save the `.gcode` file to your SD card (or send via Wi-Fi), insert your pen, and press print!

---

## ✨ Features You'll Love

- 🖨️ **Bambu Lab A1 Mini & A1 Plug & Play**: Pre-configured with safety clearances for the 30mm front pen mount (nozzle-to-pen nib offset).
- ✍️ **Real Pen Handwriting**: Built-in Hershey single-stroke fonts and cursive ligatures write like a real human hand — no hollow double outlines!
- 🖼️ **PicSVG Photo Vectorizer**: Drag-and-drop any photo (PNG, JPG, WebP) and instantly convert it into clean line-art with smooth shading.
- 🎨 **Multi-Color Pen Layers**: Assign different pens and colors to layers. PlotForge automatically pauses (`M400 U1`) and parks for easy pen changes.
- 📐 **Interactive CAD Canvas**: Metric rulers (mm), layer lock, 4-way nudge arrows, rotation, and live dimension previews.
- ⚡ **2-Opt Path Optimization**: Built-in Traveling Salesperson algorithm cuts air travel time by over 40%.
- 🔒 **100% Private**: Runs entirely inside your browser. No files are uploaded to any server.

---

## 🛠️ Hardware & Pen Recommendations

| Item | Recommendation | Notes |
| :--- | :--- | :--- |
| **3D Printer** | Bambu Lab A1 Mini / A1 | Ender 3, Klipper, Marlin & GRBL also supported |
| **Pen Mount** | Kumawat007 PIP Snap Mount | 30mm forward offset pre-configured (`Y ≤ 150mm`) |
| **Fineliner Pens** | Sakura Pigma Micron (0.4mm), Staedtler | Crisp, fast-drying, no bleed |
| **Gel Pens** | Sakura Gelly Roll (0.5mm / 0.8mm) | Great for dark/kraft paper with white ink |
| **Paper** | 120gsm+ Smooth Bristol or Cardstock | Secure to bed with blue painter's tape |

> [!TIP]
> **Safety First**: PlotForge automatically keeps your hotend 10mm elevated above the bed while drawing and lifts the pen during all travel moves.

---

## ⌨️ Helpful Keyboard Shortcuts

- <kbd>Space</kbd> — Play / Pause toolpath simulation
- <kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>Ctrl</kbd> + <kbd>Y</kbd> — Undo / Redo canvas changes
- <kbd>Arrow Keys</kbd> — Nudge selected layer (1mm)
- <kbd>Shift</kbd> + <kbd>Arrow</kbd> — Large nudge (10mm)
- <kbd>Alt</kbd> + <kbd>Arrow</kbd> — Micro nudge (0.1mm)
- <kbd>Delete</kbd> / <kbd>Backspace</kbd> — Delete selected element
- <kbd>Esc</kbd> — Deselect active element

---

## 💻 Developer Quick Start

If you want to run or contribute to PlotForge locally:

```bash
# Clone the repository
git clone https://github.com/kumawat007/PlotForge.git
cd PlotForge

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

```bash
# Run unit tests (84 tests, 15 suites)
npm test

# Build static production export
npm run build
```

---

## 🤝 Community & Support

PlotForge is open-source and free for the maker community. If it saved you time or made you smile:

- ⭐ **Star this repository** on GitHub!
- 📦 **Download 3D Mounts**: [MakerWorld @kumawat007](https://makerworld.com/en/@kumawat007)
- ☕ **Support the Creator**: [Buy Me a Coffee](https://buymeacoffee.com/kumawat007)

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.
