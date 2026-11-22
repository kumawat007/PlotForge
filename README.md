# PlotForge Studio

<div align="center">

![PlotForge Studio Banner](https://img.shields.io/badge/PLOTFORGE-STUDIO_2026-EA580C?style=for-the-badge&logoColor=white)
[![Next.js](https://img.shields.io/badge/Next.js_14-App_Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript_5.7-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-2026_Light_Studio-0284C7?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/Vitest-84_Tests_Passing-059669?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev)
[![Static Export](https://img.shields.io/badge/Client--Side-100%25_Private-059669?style=for-the-badge)](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
[![License: MIT](https://img.shields.io/badge/License-MIT-D97706?style=for-the-badge)](LICENSE)

### **Professional Pen-Plotter CAM & Vector Design Studio for Bambu Lab 3D Printers**
**Bambu Lab A1 mini (180 × 180 mm) • Bambu Lab A1 (256 × 256 mm)**
**Official Kumawat007 1-Piece Print-in-Place (PIP) Snap Mount (`cad_models/a1_mini_partdesign/`)**

[**Explore 3D Printable Pen Mounts on MakerWorld**](https://makerworld.com/en/@kumawat007) • [**Support on Buy Me a Coffee**](https://buymeacoffee.com/kumawat007)

</div>

---

## ⚡ Overview

**PlotForge Studio** is a high-precision, client-side computer-aided manufacturing (CAM) studio that transforms vector SVGs, Hershey single-stroke typography, hand-drawn vector sketches, and generative mathematical artwork into collision-safe, multi-pen G-code for standard 3D printers and CNC pen plotters.

Designed specifically for the modern makerspace and 3D printing community — with first-class engineering optimizations for **Bambu Lab A1 mini** and **Bambu Lab A1** — PlotForge runs **100% in the browser** with zero cloud servers, zero tracking cookies, and zero external telemetry (`output: 'export'`).

---

## 🌟 Key Features & Capabilities

```
+-----------------------------------------------------------------------------------------+
|                                  PLOTFORGE ARCHITECTURE                                 |
|                                                                                         |
|   [ Typography Engine ]   [ PicSVG Studio ]   [ Draw Studio ]   [ Art Generative Lab ]  |
|     Hershey Single-Stroke   18 Plotter Filters   Freehand Pen      Guilloche / Spirograph|
|     OS & Local TTF/OTF      Sauvola / Chaikin    Box / Star / Poly Ridge Waves           |
|     Cursive Ligatures       Snake Infill Hatch   Eraser Reticle    Spiral Halftone       |
|             │                      │                   │                  │             |
|             └──────────────────────┴─────────┬─────────┴──────────────────┘             |
|                                              ▼                                          |
|                                  [ Spatial Plotter Canvas ]                             |
|                                    True Metric Bed Rulers (mm)                          |
|                                    30mm Kinematic Offset Bounds                         |
|                                    Interactive D-Pad Nudge & Keys                       |
|                                    Pen Colors & Stroke Widths                           |
|                                              │                                          |
|                                              ▼                                          |
|                                    [ 2-Opt TSP Optimizer ]                              |
|                                    Air Travel Minimized >40%                            |
|                                              │                                          |
|                                              ▼                                          |
|                                 [ Hardware-Safe G-Code CAM ]                            |
|                                    Bambu Lab M400 U1 Pause                              |
|                                    Poop Chute Park & Resume                             |
|                                    Elevated Z=10mm Drawing                              |
+-----------------------------------------------------------------------------------------+
```

1. **Official Kumawat007 30mm Front PIP Mount Integration**:
   - Calibrated kinematic offset: $\Delta X = 0.00\text{ mm}, \Delta Y = -30.00\text{ mm}$.
   - Hardware-safe reachable bed envelope ($180 \times 150\text{ mm}$ for A1 Mini, $256 \times 226\text{ mm}$ for A1).
   - Real-time hatched safety barrier for unreachable zones ($Y > 150\text{ mm}$ on A1 Mini, $Y > 226\text{ mm}$ on A1).
2. **Bambu Lab Firmware Pause (`M400 U1`) & Poop Chute Park**:
   - Safe `G28` homing with pen completely clear of the bed.
   - Automatic toolhead elevation to $Z = 25.0\text{ mm}$ and parking over the poop chute (waste bin) at rear-left for pen insertion and height calibration.
   - Elevated drawing height ($Z = 10.0\text{ mm}$) keeping the hotend nozzle safely 10mm above the paper bed.
3. **PicSVG Vectorizer Engine & SVG Studio**:
   - 19 dedicated plotter filters including **Inkscape (High Quality)** autotrace, Smooth, Clean, Edge, Internal, and Artistic categories.
   - 4 detail sensitivity presets: `Great`, `Strong` (Recommended), `Medium`, `Soft`.
   - Continuous boustrophedon "snake" hatching for solid-filled vector logos, eliminating wasteful air-travel moves.
   - Real-time SVG Live Preview with stroke statistics, path length, and 1-click "Download SVG" or "Add to Plotter Canvas".
4. **Interactive Draw Studio**:
   - Freehand pen with adaptive Catmull-Rom spline smoothing and Chaikin corner-cutting.
   - Geometric shapes: Box (with rounded corners and infill), Circle/Ellipse, Star (4, 5, 6, 8 points), Polygon (3 to 8 sides), Line/Arrow.
   - Dynamic cursor states (`crosshair` for drawing, `cell` for eraser, `default` for selection).
   - High-precision circular eraser reticle to quickly remove unwanted strokes and elements.
5. **4-Way Directional Movement (Nudge) & Layout Positioning**:
   - Directional D-Pad: Up (⬆️), Down (⬇️), Left (⬅️), Right (➡️), and Center (🎯).
   - Step size switches: `0.5mm`, `1mm`, `5mm`, `10mm`.
   - Full keyboard arrow support: Arrow keys (1mm), Shift+Arrow (10mm), Alt+Arrow (0.1mm), Delete/Backspace, Escape.
   - Floating canvas toolbar with quick move, rotate 90°, center, fit-to-bed, and delete.
6. **Pen Color & Stroke Controls**:
   - Dedicated **Pens** tab with curated 12-color plotter palette, custom hex picker, and stroke widths (0.1mm to 1.5mm).
   - 1-click Pen Profile Presets: Technical Fineliner (0.2mm), Sakura Gelly Roll (0.4mm), Bic Ballpoint (0.5mm), Liquid Rollerball, Sharpie Felt Marker, Calligraphy Chisel, Drafting Pencil.
   - Per-pen custom draw speeds (mm/s), touchdown Z heights, and capillary dwell delays (ms).
7. **Single-Stroke Hershey Typography & System Fonts**:
   - 6 curated single-stroke fonts (Modern Soft Rounded, CAD Drafting, Classical Serif, Executive Italic, Simplex, Hershey Script).
   - Cursive ligature bridging for continuous cursive writing with zero pen lifts.
   - Direct Local Font File Picker (`.ttf`, `.otf`, `.woff`) pointing to `C:\Windows\Fonts` and Chromium Local Font Access API (`window.queryLocalFonts()`).
8. **Generative Mathematical Art Lab**:
   - Guilloche Spirograph patterns, Ridge Wave terrain landscapes, and Spiral Halftone portrait vectorizers.
9. **Full Undo / Redo & Layer Locking**:
   - 30-level state history stack with top-bar `Undo` / `Redo` buttons and standard shortcuts (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`).
   - Layer / Element Lock: Click `Lock` on the floating toolbar or left sidebar to safeguard positioned designs against accidental drag, nudge, or deletion.
10. **Bambu Lab IP Normalizer & Safe Kinematics**:
    - Intelligent IP parser normalizes octets with leading zeroes (e.g., `10.222.00.000` -> `10.222.0.0`) and persists in `localStorage`.
    - Soft, clean, and fast plotting kinematics: `M204 P1000 T1500` acceleration clamping, `M205 X6 Y6 Z3` jerk dampening, RDP micro-segment decimation (15µm), and continuous path stitching (0.05mm).

---

## 🚀 Step-by-Step Workflow: Bambu Lab A1 Mini Pen Plotting

Follow this complete step-by-step guide to run your very first physical pen plot safely with zero mistakes:

```
+-----------------------------------------------------------------------------------+
|                           FIRST-TIME PLOTTING WORKFLOW                            |
|                                                                                   |
|  [1. Print Mount]   ➔   [2. Prep Bed & Paper]   ➔   [3. Snap Mount to Toolhead]   |
|         │                        │                             │                  |
|         ▼                        ▼                             ▼                  |
|  [4. Export G-Code] ➔   [5. Transfer to MicroSD]➔   [6. Start Print on A1 Mini]   |
|         │                                                      │                  |
|         │                                                      ▼                  |
|         │                                           [7. Machine Homes (G28)]      |
|         │                                                      │                  |
|         │                                                      ▼                  |
|         │                                         [8. Hardware Pause (M400 U1)]   |
|         │                                         (Toolhead Parks Over Poop Chute)|
|         │                                                      │                  |
|         ▼                                                      ▼                  |
|  [Done! Watch Plot] ◀────── [10. Press Resume]  ◀─── [9. Slide Pen Down & Clamp]  |
+-----------------------------------------------------------------------------------+
```

### Step 1: 3D Print the Official Kumawat007 PIP Snap Mount
- **File**: `cad_models/a1_mini_partdesign/Bambu_A1_Mini_PIP_PartDesign-A1_Mini.stl`
- **Slicer Settings**:
  - Material: PLA or PETG
  - Layer Height: `0.20mm Standard`
  - Wall Loops: `4 walls` (ensures strong spring flex in the side clips)
  - Infill: `20% Gyroid`
  - Orientation: Place the **flat base flush on the build plate** ($Z = 0.00\text{ mm}$).
  - Supports: **NONE (100% Support-Free Print)**
  - Print Time: $\approx 28\text{--}32\text{ minutes}$ ($\approx 4.8\text{ grams}$ filament)

### Step 2: Prepare the Printer & Bed
1. **Unload Filament**: Make sure no filament is loaded in the extruder or hotend.
2. **Cold Hotend & Bed**: Ensure the nozzle and heated bed are at ambient room temperature ($0^\circ\text{C}$). PlotForge automatically enforces `M104 S0` and `M140 S0` in G-code, preventing accidental paper scorch.
3. **Tape Paper to Bed**: Place your drawing paper flat on the textured PEI plate within the reachable area ($X: 0\text{--}180\text{ mm}, Y: 0\text{--}150\text{ mm}$). Secure all four corners firmly with blue painter's tape or masking tape.

### Step 3: Snap Mount onto Toolhead Housing
1. Snap the printed 1-piece mount onto the front face of the toolhead cover.
2. The side clips snap snugly around the $55.00\text{ mm}$ housing span.
3. **CRITICAL SAFETY RULE FOR HOMING (`G28`)**:
   > [!IMPORTANT]
   > **DO NOT insert the pen fully downward before homing!**
   > During initial startup, the A1 mini executes `G28` (Homing all axes). The toolhead moves down to detect the build plate using its strain-gauge load cell.
   > If your pen tip extends below the hotend nozzle during homing, the pen nib will strike the bed before the nozzle can register bed contact.
   > **Always keep the pen pulled high up (or uninserted) until the printer reaches the poop chute pause!**

### Step 4: Create Design & Export G-Code in PlotForge
1. Open [http://localhost:3000](http://localhost:3000) (or your hosted PlotForge instance).
2. The Top Toolbar automatically defaults to:
   - **Printer**: `Bambu Lab A1 mini` (or `Bambu Lab A1`)
   - **Mount**: `Kumawat007 A1 / A1 Mini PIP Mount (30mm Front Offset) ★`
   - **Canvas**: `Full Bed Canvas (100% Build Plate)`
3. Add single-stroke text, import/vectorize an image with PicSVG Studio, or draw shapes.
4. Click **Export G-Code** in the top-right toolbar.
5. Complete the 3-point preflight checklist and click **Download .GCODE**.

### Step 5: Transfer G-Code to Printer
- **Method A (Most Reliable — Micro-SD Card)**:
  1. Copy the downloaded `.gcode` file to the root directory of your printer's Micro-SD card.
  2. Insert the card into the A1 mini.
  3. On the printer touchscreen, tap **Print Files ➔ MicroSD ➔ Select File ➔ Print**.
- **Method B (1-Click Wi-Fi FTPS Direct Transfer)**:
  1. In the PlotForge Preflight modal, switch to **Wi-Fi Direct (FTP)** mode.
  2. Enter your printer's IP and Access Code (found on the touchscreen under **Settings ➔ Network ➔ Wi-Fi**).
  3. Copy and run the generated 1-click command in PowerShell/Terminal:
     ```bash
     curl -k --ssl-reqd "ftps://bblp:ACCESS_CODE@PRINTER_IP:990/plotforge_bambu-a1-mini.gcode" -T "plotforge_bambu-a1-mini.gcode"
     ```

### Step 6: Pen Height Calibration on Poop Chute Pause (`M400 U1`)
1. The printer safely homes all axes (`G28`) with the pen clear of the bed.
2. The toolhead elevates to safe clearance ($Z = 25.0\text{ mm}$) and executes `M400 U1`.
3. **Bambu Lab firmware automatically parks the toolhead over the poop chute (waste bin)** at the rear-left corner.
4. **Slide your pen into the PIP mount**:
   - Seat the pen so the nib tip extends $\approx 10\text{--}12\text{ mm}$ below the nozzle.
   - The integrated compliant spring mechanism provides gentle, constant downward tension when the nozzle drops to $Z = 10.0\text{ mm}$ (`penDownZ`).
5. **Press "Resume"** on the printer touchscreen or in the Bambu Handy app.
6. The toolhead safely travels from the poop chute directly to the paper bed and begins drawing at $Z = 10.0\text{ mm}$ with $10\text{ mm}$ nozzle clearance above the paper!

---

## 📐 Official Kumawat007 PIP Mount Geometry & Kinematics

The official Kumawat007 Bambu Lab A1 / A1 mini Print-in-Place (PIP) Pen Mount was engineered specifically for zero toolhead modification and full build envelope utilization:

```
                  [ Front View: A1 / A1 Mini Toolhead & Mount ]

                          +----------------------+
                          |   Bambu Lab A1 Mini  |
                          |     Toolhead Body    |
                          +----------+-----------+
                                     |
                [Left Snap] +--------+--------+ [Right Snap]
                |<--------> |  55mm Inner Span| <--------->|
                +-----------+                 +------------+
                |                                          |
                |               +---------+                |
                |               | (O)     | Collet Bore:   |
                |               |  | 3mm  | 10.0mm dia     |
                |               |  | Slit | (8.5-11.5mm)   |
                +---------------+---------+----------------+
                                     |
                                     ▼
                            [ Pen Nib Tip ]
                          ΔX = 0mm, ΔY = -30mm
```

### Technical Specifications:

| Engineering Property | Dimension / Spec | Design Rationale |
| :--- | :--- | :--- |
| **Model Type** | 1-Piece Print-in-Place Compliant Snap Mount | No screws, nuts, magnets, or tools needed |
| **B-Rep Solid Status** | Watertight (`isSolid = True`, 0 non-manifold edges) | Flawless slicer mesh slicing without repair warnings |
| **Facet Count** | 83,428 triangles / 41,716 vertices | High circular fidelity for precise pen bore concentricity |
| **Outer Dimensions** | $59.00\text{ mm}\,(W) \times 37.81\text{ mm}\,(D) \times 30.00\text{ mm}\,(H)$ | Ultra-compact, low center of gravity |
| **Toolhead Grip Span** | $55.00\text{ mm}$ inner / $59.00\text{ mm}$ outer | Rigid friction clip onto A1 / A1 mini toolhead housing |
| **Pen Collet Diameter** | $\varnothing 10.00\text{ mm}$ with $3.00\text{ mm}$ expansion slit | Accommodates standard pens ($8.5\text{ mm}$ to $11.5\text{ mm}$) |
| **Kinematic Offset** | **$\Delta X = 0.00\text{ mm}, \quad \Delta Y = -30.00\text{ mm}$** | Pen is perfectly centered along the X axis |
| **Bed Contact Area** | $283\text{ mm}^2$ flat planar base at $Z = 0.00\text{ mm}$ | Zero warping, maximum bed adhesion without brim |
| **Part Mass** | $\approx 4.8\text{ grams}$ (PLA) | Minimal cantilever mass to prevent inertia ringing |

### Reachable Bed Envelope with 30mm Front Mount:

Because the pen is mounted $30\text{ mm}$ forward of the hotend nozzle ($\Delta Y = -30\text{ mm}$), the physical relationship is:
$$X_{\text{nozzle}} = X_{\text{pen}} - 0 = X_{\text{pen}}$$
$$Y_{\text{nozzle}} = Y_{\text{pen}} - (-30) = Y_{\text{pen}} + 30\text{ mm}$$

Since the maximum nozzle reach is limited by printer travel ($Y_{\text{nozzle}} \le 180\text{ mm}$ on A1 Mini, $Y_{\text{nozzle}} \le 256\text{ mm}$ on A1), the maximum reachable pen coordinate is:
$$Y_{\text{pen, max}} = Y_{\text{nozzle, max}} - 30\text{ mm}$$

| Printer Model | Physical Bed Size | Max Safe Pen Bounds | Reachable Plot Envelope | Reachable Center Point | Unreachable Zone ($Y$) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Bambu Lab A1 mini** | $180 \times 180\text{ mm}$ | $X \in [0, 180], Y \in [0, 150]$ | **$180 \times 150\text{ mm}$** | **$(X = 90, Y = 75\text{ mm})$** | $Y > 150\text{ mm}$ (Hatched Barrier) |
| **Bambu Lab A1** | $256 \times 256\text{ mm}$ | $X \in [0, 256], Y \in [0, 226]$ | **$256 \times 226\text{ mm}$** | **$(X = 128, Y = 113\text{ mm})$** | $Y > 226\text{ mm}$ (Hatched Barrier) |

PlotForge automatically projects an amber hatched barrier across $Y > 150\text{ mm}$ (or $Y > 226\text{ mm}$) labeled `⊘ 30mm NOZZLE REACH LIMIT • UNREACHABLE BY FRONT MOUNT`. Any elements or paths placed into this zone trigger instant red visual boundary alerts and prevent G-code export until repositioned.

---

## 🖼️ PicSVG Studio: Realistic Image to Vectorizer

PlotForge integrates a client-side **PicSVG Vectorizer Engine** (inspired by [PicSVG.com](https://picsvg.com/)) with real-time vector path generation, live preview, and direct SVG export:

### 1. 18 Dedicated Plotter Filters

| Category | Filters | Description & Best Use Case |
| :--- | :--- | :--- |
| **Smooth & Clean Curves** | `Smooth 1`, `Smooth 2`, `Clean 1` | **Smooth 1**: Gaussian pre-filtering + Chaikin corner smoothing (silky, organic curves with zero jerk).<br>**Smooth 2**: High-blur curve fitting for minimalist art.<br>**Clean 1**: Global Otsu binarization with speckle noise filter for clean vector logos and icons. |
| **Contour Outlines** | `Edge 1` .. `Edge 6` | Multi-scale boundary detection from fine Sobel line art (`Edge 1`), DoG bandpass outlines (`Edge 3`), heavy double-stroke contours (`Edge 4`), to Laplacian zero-crossing outlines (`Edge 6`). |
| **Internal Features & Shading** | `Internal 1` .. `Internal 5` | Adaptive local window binarization (Sauvola/Bradley) capturing interior facial details, eyes, lips, and shading contours. |
| **Special & Artistic** | `Sharp 1`, `Detail 1`, `Artistic 1`, `Artistic 2` | **Sharp 1**: 3×3 unsharp masking kernel.<br>**Detail 1**: Dual-pass fusion (DoG outline + internal features).<br>**Artistic 1**: Multi-threshold posterized luminance bands (woodcut/linocut aesthetic).<br>**Artistic 2**: Etched illustration with directional cross-hatching inside shadows. |

### 2. Selectable Detail Tiers (`Details: Strong` Default)
- **`Great`**: Highest sensitivity with micro-feature retention ($\epsilon = 0.10\text{ mm}$, min length 3).
- **`Strong` (Recommended)**: Crisp, prominent outlines calibrated for smooth, tear-free plotting ($\epsilon = 0.16\text{ mm}$, min length 4).
- **`Medium`**: Balanced detail for rapid plotting ($\epsilon = 0.28\text{ mm}$).
- **`Soft`**: Generalized flowing curves with minimal node count ($\epsilon = 0.45\text{ mm}$).

### 3. Reactive Boustrophedon Snake Hatching for Solid SVGs
When vectorizing solid black graphics (like logos, silhouettes, and text badges such as `kw0kD3H01.svg`), PlotForge automatically detects closed planar loops and generates continuous alternating boustrophedon (snake) hatch paths:
- Eliminates repeated pen lifts and retract moves during solid fill shading.
- Connects adjacent parallel scan lines directly at path endpoints.
- User-selectable hatch pitch ($0.4\text{ mm}$ to $1.2\text{ mm}$) and fill angle ($0^\circ$, $45^\circ$, $90^\circ$).

---

## ✏️ Interactive Draw Studio

PlotForge provides a dedicated **Draw Studio** for creating freehand and geometric vector artwork directly on the virtual build plate:

1. **Freehand Pen (`✏️`)**:
   - Live rubberband drawing with real-time Catmull-Rom spline curve smoothing.
   - Dynamic stroke generation with configurable pen color and stroke width.
2. **Geometric Shapes**:
   - **Box (`🔲`)**: Rectangles and squares with interactive corner rounding ($0\text{ mm}$ to $20\text{ mm}$) and optional solid infill hatching.
   - **Circle / Ellipse (`⚪`)**: Perfect circles and ellipses with optional boustrophedon solid hatching.
   - **Star (`⭐`)**: Multi-point stars (4, 5, 6, 8 points) with inner-to-outer radius ratio and hatch infill.
   - **Polygon (`⬡`)**: Regular polygons (3 to 8 sides: triangle, pentagon, hexagon, octagon) with infill.
   - **Line & Arrow (`➡️`)**: Straight lines and arrows with customizable arrowheads.
3. **High-Precision Eraser (`🧹`)**:
   - Interactive red circular reticle ($10\text{ mm}$ radius) with dynamic `cell` cursor.
   - Click to delete strokes or entire elements instantly.
4. **Persistent Floating Canvas Toolbar**:
   - Quick tool switcher: `[ 🖐️ Select ] [ ✏️ Free Pen ] [ 🔲 Box ] [ ⚪ Circle ] [ 🧹 Eraser ]`.
   - Dynamic cursor updates according to active tool (`crosshair`, `cell`, `default`).

---

## 🎯 4-Way Directional Movement (Nudge) & Keyboard Controls

PlotForge features precision alignment and movement controls for all canvas elements:

1. **Move & Position D-Pad**:
   - **Up (⬆️), Down (⬇️), Left (⬅️), Right (➡️)**: Shift selected element along X and Y axes.
   - **Center (🎯)**: Snaps element directly to the reachable center of the active bed ($X = 90, Y = 75\text{ mm}$ on A1 Mini).
   - **Step Switches**: Instant toggle between `0.5mm`, `1mm`, `5mm`, and `10mm` nudge increments.
   - **Real-Time Coordinates**: Live display of current $(X, Y)$ position in millimeters.
2. **Canvas Floating Toolbar Controls**:
   - Directional arrows `[←] [↑] [↓] [→]` directly above selected element.
   - **Rotate 90° (`🔄`)**: Rotates element in $90^\circ$ steps around its bounding box center.
   - **Fit to Bed (`📐`)**: Scales element proportionally to fit maximum safe printable bounds.
   - **Delete (`🗑️`)**: Deletes element with instant undo support.
3. **Global Keyboard Shortcuts**:
   - `Arrow Keys`: Nudge active element by $1.0\text{ mm}$.
   - `Shift + Arrow Keys`: Rapid nudge by $10.0\text{ mm}$.
   - `Alt + Arrow Keys`: Micro-fine nudge by $0.1\text{ mm}$.
   - `Delete` or `Backspace`: Delete active element.
   - `Escape`: Deselect all elements and return to Select tool.

---

## 🎨 Pen Studio & Multi-Pen CAM Layers

All pen styling, tool assignment, and hardware kinematics are consolidated cleanly into the dedicated **Pens** tab, keeping the design tabs (Text, SVG, Draw) focused and uncluttered:

1. **Active Drawing Pen Selection**:
   - 1-click **ACTIVE** / **Set Active** star button to designate the active pen layer for new text, shapes, or freehand strokes.
2. **Layer Visibility & Plotting Toggle (Mute / Solo)**:
   - Eye / EyeOff icon toggles individual pen layers. Muted layers are hidden from the canvas and automatically excluded from G-code generation.
3. **Layer Execution Reordering**:
   - Move Up (⬆️) and Move Down (⬇️) buttons control the sequence in which pen colors are plotted (e.g., plot light background colors first, black outlines last).
4. **1-Click Pen Profile Presets**:
   - Automatically tunes stroke width, draw speed, and ink flow dwell:
     - 🖊️ **0.2mm Fineliner**: $0.2\text{ mm}$ stroke, $60\text{ mm/s}$ fast plotting, $0\text{ ms}$ dwell.
     - 🖋️ **0.4mm Gel Pen**: $0.4\text{ mm}$ stroke, $45\text{ mm/s}$, $40\text{ ms}$ ink settle dwell.
     - 🖊️ **0.5mm Ballpoint**: $0.5\text{ mm}$ stroke, $50\text{ mm/s}$, $0\text{ ms}$ dwell.
     - ✒️ **0.5mm Rollerball**: $0.5\text{ mm}$ stroke, $40\text{ mm/s}$, $60\text{ ms}$ ink flow dwell.
     - 🖍️ **0.7mm Sharpie Marker**: $0.7\text{ mm}$ stroke, $35\text{ mm/s}$, $25\text{ ms}$ dwell.
     - 🖌️ **1.0mm Calligraphy / Chisel**: $1.0\text{ mm}$ stroke, $25\text{ mm/s}$, $80\text{ ms}$ dwell.
     - ✏️ **0.3mm Drafting Pencil**: $0.3\text{ mm}$ stroke, $45\text{ mm/s}$, $0\text{ ms}$ dwell.
5. **12 Curated Designer Plotter Colors + Hex Picker**:
   - Quick palette swatches: Pitch Black (`#0f172a`), Dark Slate (`#334155`), Cobalt Navy (`#1d4ed8`), Sky Cyan (`#0284c7`), Crimson Red (`#dc2626`), Coral Orange (`#ea580c`), Amber Gold (`#d97706`), Emerald Green (`#059669`), Forest Green (`#15803d`), Royal Purple (`#7c3aed`), Fuchsia Pink (`#db2777`), Silver Gray (`#94a3b8`).
6. **8 Stroke Width Presets**:
   - Instant buttons: `0.1mm`, `0.2mm`, `0.3mm`, `0.4mm`, `0.5mm`, `0.7mm`, `1.0mm`, `1.5mm`.
7. **Advanced Hardware & CAM Settings (Expandable Drawer)**:
   - **Draw Speed (mm/s)**: Per-pen plotting feedrate ($10\text{--}100\text{ mm/s}$). Overrides default machine speed for delicate or bold pens.
   - **Pen Down Z Contact (mm)**: Fine-tune contact height (e.g. $10.0\text{ mm} \pm 0.1\text{ mm}$) to compensate for slight pen length variations in multi-color sets without adjusting physical mount screws.
   - **Ink Flow Settle Dwell (ms)**: Emits `G4 P{dwell}` after pen drop so fountain/rollerball ink contacts paper before motion starts, eliminating dry stroke starts.
   - **Pause LCD Note (`M117`)**: Custom toolhead pause message displayed on printer touchscreen during hardware pause (e.g., *"Insert Sakura Pigma 0.4mm Blue"*).
8. **Element Assignment**:
   - `Assign Selected to Pen`: 1-click button to reassign the active element on the canvas to this pen layer.
   - Live element counter showing how many paths are assigned to each pen.

---

## 🛡️ Hardware Safety & Kinematics Architecture

PlotForge is engineered to protect physical 3D printers during pen plotting operations:

```
+-------------------------------------------------------------+
|                 Bambu Lab / 3D Printer Bed                  |
|                                                             |
|   +-----------------------+     +-----------------------+   |
|   | Safe Reachable Bounds |     | Filament Cutter Lever |   |
|   |                       |     | [ KEEP-OUT ZONE ]     |   |
|   |   +---------------+   |     |                       |   |
|   |   |  Full Bed     |   |     | X: 174 -> 180 mm      |   |
|   |   |  Plot Canvas  |   |     | (Nozzle blocked)      |   |
|   |   +---------------+   |     |                       |   |
|   |   +---------------+   |     +-----------------------+   |
|   +-----------------------+                                 |
+-------------------------------------------------------------+
```

1. **Dual-Layer Boundary Validation**:
   - Physical nozzle coordinates never exceed axis limits:
     $$X_{\text{nozzle}} = X_{\text{pen}} - \Delta X \in [\text{minSafeX}, \text{maxSafeX}]$$
     $$Y_{\text{nozzle}} = Y_{\text{pen}} - \Delta Y \in [\text{minSafeY}, \text{maxSafeY}]$$
2. **Keep-Out Exclusion Zones**:
   - Filament cutter lever ($X \in [174, 180]$) is protected by kinematic guards.
3. **Elevated Nozzle Drawing Clearance**:
   - Drawing occurs at $Z = 10.0\text{ mm}$ (`penDownZ`), keeping the nozzle elevated 10mm above the paper to completely eliminate nozzle rubbing or paper tear!
4. **Firmware Thermal & Motion Smoothing Guards**:
   - Automatically shuts off heaters and fans at program start and finish:
     ```gcode
     M104 S0 ; Extruder heater OFF
     M140 S0 ; Bed heater OFF
     M107    ; Part cooling fan OFF
     ```
   - Clamps acceleration (`M204 P1000 T1500`) to eliminate cantilever arm vibration and prevent ink starvation.
   - Restricts corner jerk (`M205 X6 Y6 Z3`) to eliminate pen bounce and corner hooks on sharp turns.
   - Emits modal G1 feedrates and suppresses micro-dwells ($< 0.005\text{ mm}$) to eliminate ink pooling dots at stroke starts.

---

## 🛠️ Verification & Test Suite

PlotForge includes a comprehensive automated test suite comprising **76 unit and integration tests** across 13 test suites:

```bash
# Run Vitest test suite (84 tests, 15 suites)
npm run test

# Run TypeScript strict type check
npx tsc --noEmit

# Run ESLint validation
npm run lint

# Run Next.js static production build
npm run build
```

### Test Suite Coverage:
- `validator.test.ts`: Kinematic safety, keep-out zone enforcement, boundary clipping (7 tests)
- `textEngine.test.ts`: Hershey font layout, cursive ligatures, line wrapping, metric scaling (11 tests)
- `imageVectorizer.test.ts`: PicSVG filters, Sauvola thresholding, Chaikin smoothing (9 tests)
- `shapeGenerator.test.ts`: Box, Circle, Star, Polygon, Line, smoothed Freehand strokes (6 tests)
- `picsvgImport.test.ts`: Solid SVG parsing, bounding box calculation, boustrophedon snake hatching (1 test)
- `inkscapeSvg.test.ts`: Smooth cubic Bezier conversion and high-resolution SVG autotrace (1 test)
- `tspOptimizer.test.ts`: 2-Opt Traveling Salesperson path distance minimization (6 tests)
- `generator.test.ts`: G-code generation, M400 U1 pauses, elevated Z-drawing (6 tests)
- `ipNormalizer.test.ts`: Bambu Lab IPv4 octet normalization, leading-zero cleanup, protocol stripping (5 tests)
- `localFontManager.test.ts`: Web Local Font API detection and OpenType glyph parsing (3 tests)
- `potraceEngine.test.ts`: High-resolution bitmap polygon tracing (1 test)
- `svgParser.test.ts`: SVG path parsing, transform matrices, polyline extraction (7 tests)
- `artGenerators.test.ts`: Guilloche, Ridge Waves, and Spiral Halftone algorithms (7 tests)
- `bezier.test.ts`: De Casteljau subdivision and cubic/quadratic curve conversion (7 tests)
- `store.test.ts`: Zustand store state management, undo/redo history, and layer locking (7 tests)

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/kumawat007/PlotForge.git
cd PlotForge

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Repository Structure

```
PlotForge/
├── cad_models/                     # Official 3D CAD files (DO NOT MODIFY)
│   └── a1_mini_partdesign/        # Official Kumawat007 1-piece PIP snap mount files
│       ├── Bambu_A1_Mini_PIP_PartDesign-A1_Mini.stl
│       ├── Bambu_A1_Mini_PIP_PartDesign.3mf
│       └── Bambu_A1_Mini_PIP_PartDesign.FCStd
├── src/
│   ├── app/                       # Next.js App Router (layout, page, globals.css)
│   ├── components/                # React UI components
│   │   ├── DrawTabPanel.tsx       # Draw Studio (Pen, Box, Circle, Star, Polygon, Eraser)
│   │   ├── LeftSidebar.tsx        # Navigation tabs, Text, SVG/PicSVG, Art Gen, Pens
│   │   ├── PicSvgStudioModal.tsx  # PicSVG vectorizer modal
│   │   ├── PlotCanvas.tsx         # Metric CAD canvas, rulers, barriers, D-Pad toolbar
│   │   ├── PreflightModal.tsx     # Hardware preflight checklist & G-code download
│   │   ├── TopToolbar.tsx         # Machine preset, mount selector, export actions
│   │   └── ...
│   ├── lib/
│   │   ├── fonts/                 # Hershey single-stroke fonts & local font engine
│   │   ├── gcode/                 # Kinematic transform, validator, G-code generator
│   │   ├── generators/            # Algorithmic shapes, Guilloche, Ridge, Spiral
│   │   ├── image/                 # PicSVG vectorizer, Sauvola, Potrace engine
│   │   ├── optimizer/             # TSP 2-Opt path distance optimizer
│   │   └── svg/                   # SVG parser, Boustrophedon snake hatch, Bezier
│   ├── store/                     # Zustand central plotter state
│   └── types/                     # TypeScript data contracts & type definitions
├── README.md                      # Comprehensive project documentation
└── package.json                   # Dependencies, scripts, and build configuration
```

---

## 🤝 Community & Creator Support

- **MakerWorld 3D Printable Pen Mounts**: [makerworld.com/en/@kumawat007](https://makerworld.com/en/@kumawat007)
- **Support PlotForge Development**: [buymeacoffee.com/kumawat007](https://buymeacoffee.com/kumawat007)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
