# ⚙️ Integrated Rotary Screw Compressor & Refrigeration Dryer: Interactive SCADA Digital Twin

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcelebrity01%2Fcompressor-motion-simulation)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![HTML5](https://img.shields.io/badge/HTML5-Canvas%20%26%20SVG-orange.svg)]()
[![Web Audio](https://img.shields.io/badge/Web%20Audio-Procedural%20Synth-green.svg)]()
[![Web Speech](https://img.shields.io/badge/Web%20Speech-Voice%20Narration-purple.svg)]()

An interactive, industrial-grade **motion simulation and thermodynamic digital twin** of an **Integrated Oil-Injected Rotary Screw Compressor System coupled with a Cycling Refrigeration Compressed Air Dryer**.

---

## 🚀 One-Click Deploy to Vercel

Click the button below to deploy this project directly to your Vercel account in seconds:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcelebrity01%2Fcompressor-motion-simulation)

---

## 🔬 System Circuits & Multiphase Flow Architecture

```
┌─────────────────────────────────────────────────────────────┬──────────────────────────────────────────┐
│              SCREW COMPRESSOR SECTION (AIR + OIL)           │     REFRIGERATION DRYER (DEW POINT +3°C) │
│   • Air Intake Filter → Unloader Valve → Twin Screws        │   • Air-to-Air Heat Exchanger (Economizer)│
│   • Oil Separator Tank (Sump + Coalescing Filter)           │   • Evaporator Heat Exchanger (Chiller)  │
│   • Thermostatic Valve → Oil Cooler & Filter → Return       │   • Integrated Moisture Separator & Drain│
│   • Minimum Pressure Valve (MPV) → Aftercooler              │   • Hot Gas Bypass Valve (HGBV) Control  │
└─────────────────────────────────────────────────────────────┴──────────────────────────────────────────┘
```

### 🌊 The 7 Continuous Fluid Circuits:
1. **Intake Air (Atmospheric)**: Ambient air at $1.0\text{ bar(a)}$ filtered down to $<3\ \mu\text{m}$.
2. **Oil/Air Mixture**: High-temperature multiphase emulsion at $8.0\text{ bar(e)}$ and $85^\circ\text{C}$.
3. **Pressurized Lubricating Oil**: Thermostatically routed between the oil cooler and bypass.
4. **Wet Compressed Air**: Saturated compressed air leaving the aftercooler at $\approx 35^\circ\text{C}$.
5. **Dry Compressed Air**: High-purity compressed air at $+3.0^\circ\text{C}$ Pressure Dew Point (ISO 8573-1 Class 4).
6. **Refrigerant Gas (R134a/R407C)**: Low-pressure vapor and bypassed hot gas.
7. **Refrigerant Liquid**: High-pressure condensed liquid passing through the thermostatic expansion valve (TXV).

---

## 🌟 Key Application Features

1. **60 FPS Vector Motion Engine**: Dual rotating helical screw rotors, spinning cooling fans, pulsating condensate droplets, and dynamic fluid streams.
2. **Fluid Circuit Isolation**: Click any of the 7 fluid legends in the right sidebar to highlight that exact pipeline and dim all others.
3. **17 Component Hotspots**: Click any component to inspect its operating parameters, thermodynamic condition, and maintenance intervals.
4. **Procedural Web Audio Engine**: Generates real-time 60Hz induction motor rumble and twin-screw whistling with zero external sound files.
5. **7-Stage Guided Voice Tour**: Synchronized audio narration and step-by-step interactive walkthrough.
6. **Fault Injection Lab**: Simulate clogged intake filters, oil cooler fouling, failed condensate drains, and refrigerant leaks.
7. **5-Question Knowledge Mastery Quiz**: Interactive evaluation with explanations and grading badges.
8. **3 Themes & SVG Snapshot Export**: Switch between Dark Industrial, Engineering Blueprint, and Clean Light themes.

---

## 🛠️ Local Development & Quick Start

Simply clone the repository and open `index.html` directly or serve via static server:

```bash
git clone https://github.com/celebrity01/compressor-motion-simulation.git
cd compressor-motion-simulation

# Start local server or double-click index.html
python -m http.server 8080
```

Open `http://localhost:8080` in your web browser.

---

## 📄 License

MIT License © 2026 SANI ZAHARADEEN
