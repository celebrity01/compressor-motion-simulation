// app.js - Integrated Compressor System Digital Twin & Motion Engine

// 1. GLOBAL STATE & CONFIGURATION
const state = {
  mode: 'explore',
  compressorState: 'loaded',
  motorSpeed: 100,
  motorRpm: 3000,
  ambientTemp: 25.0,
  dryerPower: true,
  hgbvOverride: false,
  
  dischargePressure: 7.5,
  dewPoint: 3.0,
  oilTemp: 82.4,
  moistureRate: 4.2,
  
  flowSpeed: 1.0,
  isFlowPaused: false,
  zoom: 1.0,
  panX: 0,
  panY: 0,
  isPanning: false,
  startPanX: 0,
  startPanY: 0,
  
  activeFluidFilter: null,
  inspectedComponent: 'screw-element',
  activeFault: null,
  
  tourStep: 0,
  tourAutoPlay: false,
  tourTimer: null,
  
  soundEnabled: false,
  audioCtx: null,
  motorOsc: null,
  motorGain: null,
  screwOsc: null,
  screwGain: null,
  noiseNode: null,
  noiseGain: null,
  
  quizIndex: 0,
  quizScore: 0,
  quizSelectedOption: null,
};

// 2. COMPONENT METADATA DATABASE (17+ Components)
const componentsData = {
  'air-filter': {
    title: 'Air Intake Filter',
    subsystem: 'Intake Filtration Stage',
    fluid: 'Atmospheric Air',
    badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    fluidBadge: 'AIR CIRCUIT',
    desc: 'Heavy-duty pleated micronic air filter removes 99.9% of dust, atmospheric particulates, and aerosols (>3 µm) before air enters the compression chamber, protecting screw lobes and lubricating oil.',
    inlet: '1.013 bar @ Amb. Temp',
    outlet: '0.98 bar (ΔP < 30 mbar)',
    fluidVal: 'Ambient Air (Dry/Moist)',
    maintVal: 'Replace @ 2,000 hrs / ΔP > 50 mbar',
    actionLabel: 'Simulate Pulse Jet Clean',
    actionFn: () => showNotification('Air Filter pulsed clean: ΔP normalized to 15 mbar.', 'success')
  },
  'intake-valve': {
    title: 'Air Intake Valve (Unloader)',
    subsystem: 'Pneumatic Flow Modulation',
    fluid: 'Intake Air',
    badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    fluidBadge: 'CONTROL VALVE',
    desc: 'Pneumatically actuated poppet unloader valve controls air suction volume. In loaded state it opens fully for full compression; in unloaded state it closes to idle mode, reducing motor power consumption by up to 70%.',
    inlet: '0.98 bar @ Ambient',
    outlet: 'Suction Vacuum (0.3 - 0.95 bar)',
    fluidVal: 'Regulated Intake Air',
    maintVal: 'Service Seals @ 8,000 hrs',
    actionLabel: 'Toggle Load / Unload Actuator',
    actionFn: () => toggleCompressorState()
  },
  'screw-element': {
    title: 'Compressor Element (Twin-Screw)',
    subsystem: 'Primary Compression Core',
    fluid: 'Air + Synthetic Oil Mixture',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    fluidBadge: 'TWIN FLUID MIX',
    desc: 'Precision asymmetric twin helical rotors (male 4-lobe driver & female 6-flute driven). Atmospheric air is trapped in flutes and compressed progressively along rotor axes while pressurized synthetic oil is continuously injected for cooling, gap sealing, and bearing lubrication.',
    inlet: '1.0 bar @ 20°C (Air)',
    outlet: '8.0 bar @ 85°C (Mix)',
    fluidVal: 'Air + Polyalphaolefin Oil',
    maintVal: 'Vibration & Bearing Check @ 4,000 hrs',
    actionLabel: 'Actuate Oil Injection Boost',
    actionFn: () => showNotification('Oil injection boosted: Element temp stabilized at 82°C.', 'info')
  },
  'check-valve': {
    title: 'Non-Return Valve (Check Valve)',
    subsystem: 'Discharge Protection',
    fluid: 'Oil/Air Mixture',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    fluidBadge: 'CHECK VALVE',
    desc: 'Spring-assisted directional check valve located directly downstream of compressor discharge. Prevents high-pressure oil and compressed air from surging backward into the screw chamber during sudden shutdowns, avoiding reverse rotor rotation.',
    inlet: '8.0 bar @ 85°C',
    outlet: '7.9 bar @ 85°C (ΔP < 0.1 bar)',
    fluidVal: 'High-Pressure Mixture',
    maintVal: 'Inspect Spring Seat @ 8,000 hrs',
    actionLabel: 'Test Backflow Resistance',
    actionFn: () => showNotification('Non-return valve check: Zero reverse leakage confirmed.', 'success')
  },
  'separator-tank': {
    title: 'Air/Oil Separator Vessel',
    subsystem: 'Two-Stage Separation System',
    fluid: 'Oil + Compressed Wet Air',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    fluidBadge: 'SEPARATION TANK',
    desc: 'Vertical pressure vessel utilizing centrifugal cyclonic action (95% bulk oil removal) followed by an internal deep-bed coalescing filter element (reduces residual oil carryover to < 3 ppm). Oil settles in the bottom sump; clean compressed air exits through the top.',
    inlet: '8.0 bar @ 85°C (Mixture)',
    outlet: 'Air: 7.7 bar / Oil: 7.8 bar',
    fluidVal: 'Synthetic Lubricant + Air',
    maintVal: 'Replace Element @ 4,000 hrs (ΔP < 0.8 bar)',
    actionLabel: 'Inspect Oil Sump Level',
    actionFn: () => showNotification('Oil sump sight glass: Nominal level within green band (75%).', 'info')
  },
  'mpv': {
    title: 'Minimum Pressure Valve (MPV)',
    subsystem: 'Pneumatic Pressure Retention',
    fluid: 'Wet Compressed Air',
    badgeClass: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    fluidBadge: 'PRESSURE VALVE',
    desc: 'Maintains a minimum internal vessel pressure (~4.5 bar) during startup and loaded cycles to guarantee uninterrupted oil circulation before air discharges downstream. Also acts as a plant check valve.',
    inlet: '7.8 bar (Tank Internal)',
    outlet: '7.5 bar (Discharge Line)',
    fluidVal: 'Moist Compressed Air',
    maintVal: 'Rebuild Kit @ 8,000 hrs',
    actionLabel: 'Test Spring Setpoint (4.5 bar)',
    actionFn: () => showNotification('MPV seat verified: Retains 4.5 bar internal pressure.', 'success')
  },
  'oil-cooler': {
    title: 'Oil Cooler (Radiator Section)',
    subsystem: 'Thermal Rejection Loop',
    fluid: 'Hot Lubricating Oil',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    fluidBadge: 'HEAT EXCHANGER',
    desc: 'Aluminum brazed plate-fin heat exchanger cooled by the axial fan. Dissipates the heat of compression absorbed by the oil, reducing oil temperature from ~88°C down to ~65°C before filtration and re-injection.',
    inlet: '88°C @ 7.8 bar (From Tank)',
    outlet: '65°C @ 7.6 bar (To Filter)',
    fluidVal: 'Hot Synthetic Compressor Oil',
    maintVal: 'Degrease Radiator Fins @ 1,000 hrs',
    actionLabel: 'Clean Radiator Matrix',
    actionFn: () => showNotification('Radiator matrix airflow clear: Thermal transfer efficiency 98%.', 'info')
  },
  'oil-filter': {
    title: 'Oil Filter Canister',
    subsystem: 'Lubrication Conditioning',
    fluid: 'Cooled Lubricating Oil',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    fluidBadge: 'OIL FILTER',
    desc: 'Spin-on fiberglass/synthetic filter element with a 10-micron absolute rating. Removes microscopic metal wear particles, soot, and varnish from oil before re-injecting into screw bearings and rotors. Features internal bypass valve.',
    inlet: '65°C @ 7.6 bar',
    outlet: '65°C @ 7.4 bar (ΔP < 0.2 bar)',
    fluidVal: 'Cleaned Compressor Oil',
    maintVal: 'Replace @ 2,000 hrs or oil change',
    actionLabel: 'Check Filter Bypass Status',
    actionFn: () => showNotification('Filter bypass closed: Normal full-flow filtration active.', 'success')
  },
  'aftercooler': {
    title: 'Compressed Air Aftercooler',
    subsystem: 'Thermal Moisture Precipitation',
    fluid: 'Wet Compressed Air',
    badgeClass: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    fluidBadge: 'AFTERCOOLER',
    desc: 'Air-cooled heat exchanger sharing the cooling fan block. Lowers compressed air discharge temperature from ~85°C down to ~35°C (approx. +10°C above ambient), condensing up to 70% of atmospheric water vapor into bulk liquid water.',
    inlet: '85°C @ 7.6 bar (From MPV)',
    outlet: '35°C @ 7.5 bar (Condensate Mix)',
    fluidVal: 'Wet Air + Condensed Water',
    maintVal: 'Check Fin Block @ 2,000 hrs',
    actionLabel: 'Measure Aftercooler Approach ΔT',
    actionFn: () => showNotification('Approach temp: +8.5°C over ambient. Excellent cooling.', 'info')
  },
  'cooler-assembly': {
    title: 'Combined Cooler & Electric Fan',
    subsystem: 'Dual Thermal Rejection Module',
    fluid: 'Oil + Wet Air + Cooling Air',
    badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    fluidBadge: 'FAN & RADIATOR',
    desc: 'High-efficiency dual core radiator block with integrated high-static axial fan providing forced convective cooling across both the oil cooler matrix and air aftercooler matrix simultaneously.',
    inlet: 'Combined Hot Inlets',
    outlet: 'Cooled Fluid Streams',
    fluidVal: 'Oil, Air, Ambient Airflow',
    maintVal: 'Motor Bearings @ 10,000 hrs',
    actionLabel: 'Toggle Fan High-Speed Mode',
    actionFn: () => showNotification('Cooling fan boosted to 100% RPM.', 'info')
  },
  'air-air-hx': {
    title: 'Air/Air Heat Exchanger (Economizer)',
    subsystem: 'Refrigeration Dryer Precooler/Reheater',
    fluid: 'Warm Wet Air vs Cold Dry Air',
    badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    fluidBadge: 'RECUPERATOR',
    desc: 'Counterflow plate heat exchanger. Pre-cools incoming warm wet air (35°C down to ~18°C) by transferring heat to the outgoing chilled dry air (+3°C up to ~25°C). Reduces required refrigeration chiller size by 50% and prevents pipe sweating downstream.',
    inlet: 'Warm Wet: 35°C / Cold Dry: +3°C',
    outlet: 'Precooled Wet: 18°C / Reheated Dry: 25°C',
    fluidVal: 'Counter-Current Compressed Air',
    maintVal: 'Check Pressure Drop @ 4,000 hrs',
    actionLabel: 'Verify Heat Recovery Efficiency',
    actionFn: () => showNotification('Air/Air Recuperation: 54% thermal energy recovered.', 'success')
  },
  'evaporator': {
    title: 'Direct Expansion Evaporator',
    subsystem: 'Refrigeration Chilling Core',
    fluid: 'Wet Air + Boiling Refrigerant',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    fluidBadge: 'EVAPORATOR CHILLER',
    desc: 'Brazed stainless steel / copper heat exchanger where low-pressure liquid refrigerant evaporates/boils at ~0°C, absorbing latent heat and chilling compressed air to the target Pressure Dew Point (+3°C / 37°F). Triggers massive moisture condensation.',
    inlet: 'Precooled Air @ 18°C / Liquid Ref @ 0°C',
    outlet: 'Chilled Air @ +3.0°C / Ref Gas @ +4°C',
    fluidVal: 'Air + R134a / R410A',
    maintVal: 'Leak Check @ Annual Inspection',
    actionLabel: 'Verify Frost Protection',
    actionFn: () => showNotification('Evaporator temperature: +3.0°C. No frost formation detected.', 'success')
  },
  'water-separator': {
    title: 'Water Separator with Auto Drain',
    subsystem: 'Condensate Extraction & Evacuation',
    fluid: 'Cold Air + Liquid Water Condensate',
    badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    fluidBadge: 'DEMISTER & DRAIN',
    desc: 'Centrifugal vortex demister bowl extracts 99% of liquid water droplets condensed in the aftercooler and evaporator. The integrated zero-loss electronic level-sensing or solenoid float drain purges liquid without losing compressed air.',
    inlet: 'Chilled Air + Droplets @ +3°C',
    outlet: 'Clean Dry Air (Top) / Water Drain (Bottom)',
    fluidVal: 'Condensed Water Condensate',
    maintVal: 'Clean Drain Strainer @ 2,000 hrs',
    actionLabel: 'Manual Solenoid Drain Test',
    actionFn: () => {
      triggerDrainPurgeAudio();
      showNotification('Condensate Drain Purged: 120 mL water discharged with zero air loss.', 'success');
    }
  },
  'accumulator': {
    title: 'Refrigerant Suction Accumulator',
    subsystem: 'Compressor Ingestion Protection',
    fluid: 'Refrigerant Vapor (+ Droplet Trap)',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    fluidBadge: 'REFRIGERANT VAPOR',
    desc: 'Vertical vessel in the refrigerant suction line that traps any unevaporated liquid refrigerant droplets during transient load drops, ensuring only 100% gaseous refrigerant vapor enters the refrigerant compressor suction port.',
    inlet: 'Suction Gas + Micro-droplets @ 3.5 bar',
    outlet: 'Superheated Vapor @ 3.4 bar / +5°C',
    fluidVal: 'R134a Refrigerant Gas',
    maintVal: 'Check Suction Insulation @ Annual',
    actionLabel: 'Check Superheat Value',
    actionFn: () => showNotification('Suction superheat: +5.2 K (Optimal liquid protection).', 'info')
  },
  'ref-compressor': {
    title: 'Refrigerant Compressor',
    subsystem: 'Vapor Compression Refrigeration Cycle',
    fluid: 'Refrigerant Gas',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    fluidBadge: 'HERMETIC COMPRESSOR',
    desc: 'Hermetically sealed reciprocating or scroll compressor. Draws low-pressure refrigerant vapor from the evaporator, compresses it to high pressure and temperature, and discharges superheated gas into the condenser coil.',
    inlet: '3.4 bar(g) @ +5°C (Suction)',
    outlet: '14.5 bar(g) @ +75°C (Discharge)',
    fluidVal: 'High-Pressure Refrigerant Gas',
    maintVal: 'Motor Winding Insulation @ 10,000 hrs',
    actionLabel: 'Check Compression Ratio',
    actionFn: () => showNotification('Refrigerant compression ratio: 3.8:1 (Nominal efficiency).', 'info')
  },
  'condenser': {
    title: 'Refrigerant Condenser & Fan',
    subsystem: 'Refrigeration Heat Rejection',
    fluid: 'Refrigerant Vapor to Liquid',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    fluidBadge: 'CONDENSER COIL',
    desc: 'Finned copper-tube coil cooled by a dedicated electric fan. Rejects latent condensation heat to the surrounding environment, turning high-pressure superheated refrigerant gas into subcooled high-pressure liquid.',
    inlet: '14.5 bar @ 75°C (Vapor)',
    outlet: '14.0 bar @ 40°C (Subcooled Liquid)',
    fluidVal: 'Liquid Refrigerant',
    maintVal: 'Clean Condenser Coil @ 500 hrs',
    actionLabel: 'Inspect Condenser Subcooling',
    actionFn: () => showNotification('Subcooling: 4.5 K. Full liquid seal at condenser outlet.', 'success')
  },
  'ref-filter-drier': {
    title: 'Liquid Refrigerant Filter/Drier',
    subsystem: 'Refrigerant Circuit Decontamination',
    fluid: 'High-Pressure Liquid Refrigerant',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    fluidBadge: 'DESICCANT DRIER',
    desc: 'Contains 100% molecular sieve desiccant beads and a mechanical strainer core. Absorbs moisture acid compounds and traps solid debris, preventing capillary tube freezing and copper plating in compressor bearings.',
    inlet: '14.0 bar @ 40°C',
    outlet: '13.9 bar @ 40°C (ΔP < 0.1 bar)',
    fluidVal: 'Subcooled Liquid Refrigerant',
    maintVal: 'Replace upon refrigerant service',
    actionLabel: 'Inspect Moisture Indicator Eye',
    actionFn: () => showNotification('Moisture sight eye: Dry (Green color ring).', 'success')
  },
  'hgbv': {
    title: 'Hot Gas Bypass Valve (HGBV)',
    subsystem: 'Capacity Regulation & Anti-Freeze',
    fluid: 'High-Pressure Refrigerant Gas',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    fluidBadge: 'BYPASS REGULATOR',
    desc: 'Modulating pressure-regulating valve. When compressed air flow is low or zero, it diverts hot refrigerant discharge gas directly into the evaporator suction line to maintain evaporating temperature at +1°C to +3°C, preventing evaporator freeze-up.',
    inlet: '14.5 bar @ 75°C',
    outlet: '3.5 bar @ 20°C',
    fluidVal: 'Hot Refrigerant Vapor',
    maintVal: 'Check Calibration @ 8,000 hrs',
    actionLabel: 'Toggle Bypass Override',
    actionFn: () => {
      state.hgbvOverride = !state.hgbvOverride;
      const toggle = document.getElementById('toggle-hgbv');
      if (toggle) toggle.checked = state.hgbvOverride;
      showNotification(`Hot Gas Bypass: ${state.hgbvOverride ? 'FORCED OPEN' : 'AUTO MODULATING'}`, 'info');
    }
  },
  'capillary': {
    title: 'Capillary Tube Expansion Meter',
    subsystem: 'Thermodynamic Expansion Device',
    fluid: 'Liquid to Liquid/Vapor Mixture',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    fluidBadge: 'EXPANSION TUBE',
    desc: 'Calibrated copper capillary tube with high flow resistance. Creates an abrupt pressure drop from 14 bar down to 3.5 bar, causing a flash evaporation temperature plunge from +40°C down to 0°C before entering the evaporator.',
    inlet: '13.9 bar @ 40°C (Liquid)',
    outlet: '3.5 bar @ 0°C (Two-Phase Mixture)',
    fluidVal: 'Chilled Expanding Refrigerant',
    maintVal: 'Check for restriction / frost on line',
    actionLabel: 'Inspect Flash Boiling Rate',
    actionFn: () => showNotification('Joule-Thomson expansion active: Temp drops 40 K across orifice.', 'info')
  },
  'supply-filter': {
    title: 'Final Supply Line Filter',
    subsystem: 'Point-of-Delivery Purification',
    fluid: 'High-Quality Dry Compressed Air',
    badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    fluidBadge: 'FINAL FILTER',
    desc: 'High-efficiency coalescing and particulate polishing filter bowl. Guarantees ISO 8573-1 Class 1.4.1 compressed air purity by eliminating any microscopic dust, pipe scale, or trace oil aerosols before air enters the factory distribution header.',
    inlet: '7.5 bar @ 25°C',
    outlet: '7.45 bar @ 25°C (Purity: 0.01 µm)',
    fluidVal: 'Ultra-Clean Dry Compressed Air',
    maintVal: 'Replace Element @ 4,000 hrs / Annual',
    actionLabel: 'Check Filter Element Status',
    actionFn: () => showNotification('Final supply filter: 100% integrity, clean differential pressure.', 'success')
  },
  'outlet-valve': {
    title: 'Plant Air Isolation Valve',
    subsystem: 'Compressed Air Distribution Outflow',
    fluid: 'ISO 8573-1 Dry Compressed Air',
    badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    fluidBadge: 'FACTORY SUPPLY',
    desc: 'Quarter-turn stainless steel ball valve providing positive isolation to the plant pneumatic ring main. Supplies cool, bone-dry compressed air to pneumatic machinery, robotics, painting booths, and instruments.',
    inlet: '7.45 bar @ 25°C (PDP +3°C)',
    outlet: 'Plant Grid Air Distribution',
    fluidVal: 'Dry, Clean, Oil-Free Air',
    maintVal: 'Verify Stem Seal Integrity',
    actionLabel: 'Actuate Supply Discharge Pulse',
    actionFn: () => showNotification('Plant distribution valve open: Delivering 3.5 m³/min @ 7.5 bar.', 'success')
  }
};

// 3. GUIDED TOUR STAGES (7 Detailed Narrative Stages)
const tourStages = [
  {
    step: 1,
    title: 'Stage 1: Ambient Air Intake & Filtration',
    desc: 'Atmospheric air is drawn through the heavy-duty micronic Air Intake Filter to remove dust and debris. It then passes through the spring-loaded Air Intake Valve, which modulates opening based on factory air demand.',
    focusComponents: ['comp-air-filter', 'comp-intake-valve'],
    focusPipes: ['pipe-intake'],
    targetComp: 'air-filter',
    camera: { zoom: 1.35, panX: 300, panY: 100 }
  },
  {
    step: 2,
    title: 'Stage 2: Twin-Screw Compression & Oil Injection',
    desc: 'Air enters the Rotary Twin-Screw element. Intermeshing male and female helical rotors trap air pockets and compress them. Pressurized synthetic oil is injected directly into the chamber for rotor sealing, cooling, and bearing lubrication.',
    focusComponents: ['comp-screw-element', 'comp-check-valve'],
    focusPipes: ['pipe-mixture', 'pipe-oil'],
    targetComp: 'screw-element',
    camera: { zoom: 1.45, panX: 240, panY: -20 }
  },
  {
    step: 3,
    title: 'Stage 3: Primary Separation & Oil Recirculation',
    desc: 'The hot oil/air mixture discharges through the Non-Return Valve into the Separator Tank. Cyclonic velocity drops 95% of oil to the bottom sump. The remaining mist is filtered through a coalescing cartridge. Sump oil is routed through the Oil Cooler and Oil Filter back into the screw.',
    focusComponents: ['comp-separator-tank', 'comp-mpv', 'comp-oil-filter', 'sub-oil-cooler'],
    focusPipes: ['pipe-mixture', 'pipe-oil', 'pipe-wet'],
    targetComp: 'separator-tank',
    camera: { zoom: 1.3, panX: 80, panY: 40 }
  },
  {
    step: 4,
    title: 'Stage 4: Aftercooling & Heat Dissipation',
    desc: 'Clean wet air exits the separator tank through the Minimum Pressure Valve and enters the Aftercooler radiator. The shared axial fan cools the air down to +10°C above ambient, causing the majority of water vapor to condense into liquid droplets.',
    focusComponents: ['comp-mpv', 'sub-aftercooler', 'comp-cooler-fan'],
    focusPipes: ['pipe-wet'],
    targetComp: 'aftercooler',
    camera: { zoom: 1.35, panX: -80, panY: -80 }
  },
  {
    step: 5,
    title: 'Stage 5: Refrigeration Drying Cycle (Evaporator Chilling)',
    desc: 'Wet air enters the Refrigeration Dryer cabinet. It first passes the Air/Air Heat Exchanger (precooler) and then the Evaporator coil, where boiling refrigerant chills the compressed air down to +3°C (37°F Pressure Dew Point), forcing maximum moisture condensation.',
    focusComponents: ['comp-air-air-hx', 'comp-evaporator', 'comp-ref-compressor', 'comp-ref-condenser'],
    focusPipes: ['pipe-wet', 'pipe-gas', 'pipe-liquid'],
    targetComp: 'evaporator',
    camera: { zoom: 1.35, panX: -260, panY: -30 }
  },
  {
    step: 6,
    title: 'Stage 6: Centrifugal Water Separation & Auto Drainage',
    desc: 'The cold air/water mixture enters the Water Separator. Centrifugal vortex baffles capture the liquid droplets into the sump bowl. The automatic zero-loss solenoid drain valve periodically purges the water without losing valuable compressed air.',
    focusComponents: ['comp-water-separator'],
    focusPipes: ['pipe-wet', 'pipe-dry'],
    targetComp: 'water-separator',
    camera: { zoom: 1.5, panX: -240, panY: -160 }
  },
  {
    step: 7,
    title: 'Stage 7: Air Reheating, Supply Filtration & Delivery',
    desc: 'Cold dry air flows back through the reheat side of the Air/Air Heat Exchanger, warming back to ambient temperature (recovering thermal energy and preventing pipe sweating). It passes the Supply Filter and outlet valve into the factory air network!',
    focusComponents: ['comp-air-air-hx', 'comp-supply-filter', 'comp-outlet-valve'],
    focusPipes: ['pipe-dry'],
    targetComp: 'supply-filter',
    camera: { zoom: 1.25, panX: -320, panY: 60 }
  }
];

// 4. KNOWLEDGE QUIZ QUESTIONS
const quizQuestions = [
  {
    q: "Why is synthetic oil injected directly into the twin-screw compressor element?",
    options: [
      "Solely to clean the atmospheric dust out of the rotors",
      "To lubricate bearings, seal the rotor gaps, and absorb the intense heat of compression",
      "To increase the humidity of the compressed air",
      "To power the hydraulic unloader valve"
    ],
    correct: 1,
    explanation: "Oil-flooded rotary screw compressors inject oil for three critical functions: lubricating the intermeshing lobes/bearings, providing an airtight hydraulic seal between rotors, and dissipating the thermodynamic heat of compression."
  },
  {
    q: "What is the primary thermodynamic purpose of the Air/Air Heat Exchanger inside the Refrigeration Dryer?",
    options: [
      "To pre-cool incoming wet air using outgoing cold air, and reheat outgoing dry air to prevent pipe condensation",
      "To boil the refrigerant gas before entering the condenser",
      "To separate oil from the refrigerant circuit",
      "To heat the incoming air to increase compressor volumetric efficiency"
    ],
    correct: 0,
    explanation: "The Air/Air Heat Exchanger (Economizer) acts as both a precooler and reheater. It cuts refrigeration load by ~50% and raises the discharge air temperature to ambient so factory pipes don't sweat with condensation."
  },
  {
    q: "What role does the Minimum Pressure Valve (MPV) perform at the top of the separator tank?",
    options: [
      "It blows off excess air to prevent overpressure explosion",
      "It maintains at least 4.5 bar internal pressure to guarantee continuous oil circulation and prevents backflow",
      "It regulates refrigerant gas bypass into the evaporator",
      "It injects water into the aftercooler"
    ],
    correct: 1,
    explanation: "The MPV ensures internal vessel pressure never drops below ~4.5 bar(e) during startup or load transitions, which is required to force lubricating oil through the cooler, filter, and element without needing an auxiliary oil pump."
  },
  {
    q: "If the Refrigeration Dryer's Hot Gas Bypass Valve (HGBV) opens, what condition is it preventing?",
    options: [
      "Excessive discharge pressure in the factory air line",
      "Evaporator freeze-up and ice formation during low compressed air load conditions",
      "Overheating of the oil sump tank",
      "Clogging of the air intake filter"
    ],
    correct: 1,
    explanation: "Under zero or low air demand, the evaporator temperature can drop below 0°C, causing condensed moisture to freeze solid into ice and block air passage. The HGBV injects hot refrigerant gas to maintain the coil at +1°C to +3°C."
  },
  {
    q: "What standard Pressure Dew Point (PDP) does this refrigeration dryer system achieve?",
    options: [
      "-40°C (-40°F)",
      "+3.0°C (37.4°F)",
      "+25.0°C (77°F)",
      "-70°C (-94°F)"
    ],
    correct: 1,
    explanation: "Direct-expansion refrigeration dryers achieve an ISO 8573-1 Class 4 Pressure Dew Point of +3°C (37.4°F), which condenses almost all vapor without freezing water lines. Desiccant adsorption dryers are used for sub-zero (-40°C) requirements."
  }
];

// 5. VECTOR FLUID PATH TRAJECTORIES (For Canvas Particle Flow)
const fluidPaths = [
  // 1. INTAKE AIR PATH (Filter -> Intake Valve -> Screw Inlet)
  {
    id: 'intake-1',
    fluid: 'intake',
    color: '#93c5fd',
    glowColor: 'rgba(147, 197, 253, 0.8)',
    size: 3.5,
    speed: 1.4,
    points: [
      { x: 100, y: 515 },
      { x: 140, y: 515 },
      { x: 160, y: 480 },
      { x: 160, y: 360 },
      { x: 180, y: 340 },
      { x: 220, y: 340 },
      { x: 220, y: 390 },
      { x: 220, y: 440 }
    ]
  },
  // 2. SCREW ELEMENT COMPRESSION (Screw mesh -> Non-return check valve)
  {
    id: 'screw-compression',
    fluid: 'mixture',
    color: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.85)',
    size: 4,
    speed: 1.8,
    points: [
      { x: 220, y: 440 },
      { x: 240, y: 480 },
      { x: 260, y: 520 },
      { x: 285, y: 550 },
      { x: 285, y: 580 },
      { x: 310, y: 610 },
      { x: 320, y: 610 },
      { x: 345, y: 580 },
      { x: 345, y: 480 }
    ]
  },
  // 3. OIL RECIRCULATION (Separator Sump -> Cooler -> Filter -> Screw)
  {
    id: 'oil-loop-1',
    fluid: 'oil',
    color: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.85)',
    size: 3.8,
    speed: 1.3,
    points: [
      { x: 380, y: 580 },
      { x: 410, y: 580 },
      { x: 430, y: 550 },
      { x: 430, y: 520 },
      { x: 450, y: 490 },
      { x: 492, y: 490 },
      { x: 570, y: 490 },
      { x: 570, y: 520 },
      { x: 492, y: 520 },
      { x: 570, y: 545 },
      { x: 492, y: 545 }
    ]
  },
  {
    id: 'oil-loop-2',
    fluid: 'oil',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.85)',
    size: 3.5,
    speed: 1.3,
    points: [
      { x: 492, y: 545 },
      { x: 460, y: 550 },
      { x: 445, y: 520 },
      { x: 445, y: 470 },
      { x: 435, y: 440 },
      { x: 420, y: 440 },
      { x: 415, y: 470 },
      { x: 415, y: 620 },
      { x: 395, y: 640 },
      { x: 250, y: 640 },
      { x: 230, y: 620 },
      { x: 230, y: 540 }
    ]
  },
  // 4. WET AIR LINE (Separator Top / MPV -> Aftercooler -> Dryer HX -> Evaporator)
  {
    id: 'wet-air-1',
    fluid: 'wetAir',
    color: '#0d9488',
    glowColor: 'rgba(13, 148, 136, 0.85)',
    size: 4,
    speed: 1.6,
    points: [
      { x: 370, y: 330 },
      { x: 460, y: 330 },
      { x: 480, y: 350 },
      { x: 480, y: 630 },
      { x: 500, y: 650 },
      { x: 570, y: 650 },
      { x: 605, y: 650 },
      { x: 620, y: 630 },
      { x: 620, y: 540 },
      { x: 645, y: 540 },
      { x: 680, y: 540 },
      { x: 710, y: 540 },
      { x: 710, y: 570 },
      { x: 745, y: 570 }
    ]
  },
  // 5. CHILLED WET AIR TO WATER SEPARATOR
  {
    id: 'wet-air-to-drain',
    fluid: 'wetAir',
    color: '#14b8a6',
    glowColor: 'rgba(20, 184, 166, 0.85)',
    size: 4,
    speed: 1.5,
    points: [
      { x: 745, y: 570 },
      { x: 760, y: 610 },
      { x: 760, y: 640 },
      { x: 740, y: 660 },
      { x: 660, y: 660 },
      { x: 660, y: 680 }
    ]
  },
  // 6. DRY AIR LINE (Water Separator -> Recuperator Reheater -> Supply Filter -> Out)
  {
    id: 'dry-air-supply',
    fluid: 'dryAir',
    color: '#0284c7',
    glowColor: 'rgba(2, 132, 199, 0.9)',
    size: 4.2,
    speed: 1.7,
    points: [
      { x: 645, y: 680 },
      { x: 645, y: 580 },
      { x: 665, y: 580 },
      { x: 665, y: 440 },
      { x: 800, y: 440 },
      { x: 885, y: 440 },
      { x: 970, y: 440 },
      { x: 1040, y: 440 }
    ]
  },
  // 7. REFRIGERANT GAS SUCTION (Evaporator -> Accumulator -> Ref Compressor)
  {
    id: 'ref-gas-suction',
    fluid: 'refGas',
    color: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.85)',
    size: 3.2,
    speed: 1.5,
    points: [
      { x: 780, y: 530 },
      { x: 780, y: 670 },
      { x: 830, y: 670 },
      { x: 848, y: 700 },
      { x: 848, y: 745 },
      { x: 805, y: 745 }
    ]
  },
  // 8. REFRIGERANT GAS DISCHARGE (Ref Compressor -> Condenser)
  {
    id: 'ref-gas-discharge',
    fluid: 'refGas',
    color: '#facc15',
    glowColor: 'rgba(250, 204, 21, 0.9)',
    size: 3.4,
    speed: 1.9,
    points: [
      { x: 805, y: 720 },
      { x: 850, y: 720 },
      { x: 875, y: 750 },
      { x: 940, y: 750 }
    ]
  },
  // 9. HOT GAS BYPASS BRANCH (Discharge branch -> HGBV -> Evaporator suction)
  {
    id: 'ref-hgbv',
    fluid: 'refGas',
    color: '#ca8a04',
    glowColor: 'rgba(202, 138, 4, 0.85)',
    size: 2.8,
    speed: 1.4,
    points: [
      { x: 860, y: 720 },
      { x: 860, y: 685 },
      { x: 890, y: 685 },
      { x: 910, y: 685 },
      { x: 910, y: 670 },
      { x: 848, y: 670 }
    ]
  },
  // 10. REFRIGERANT LIQUID LINE (Condenser -> Filter Drier -> Capillary -> Evaporator)
  {
    id: 'ref-liquid-line',
    fluid: 'refLiquid',
    color: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.9)',
    size: 3.2,
    speed: 1.4,
    points: [
      { x: 940, y: 770 },
      { x: 993, y: 770 },
      { x: 993, y: 680 },
      { x: 993, y: 625 },
      { x: 993, y: 550 },
      { x: 910, y: 550 },
      { x: 895, y: 510 },
      { x: 780, y: 510 }
    ]
  }
];

// 6. PARTICLE ENGINE CLASS
class ParticleFlowEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.paths = [];
    this.initPaths();
    this.initParticles();
  }

  initPaths() {
    this.paths = fluidPaths.map(def => {
      let totalLength = 0;
      const segments = [];
      for (let i = 0; i < def.points.length - 1; i++) {
        const p1 = def.points[i];
        const p2 = def.points[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        segments.push({ p1, p2, dx, dy, len, startDist: totalLength });
        totalLength += len;
      }
      return { ...def, segments, totalLength };
    });
  }

  initParticles() {
    this.particles = [];
    this.paths.forEach((path, pathIdx) => {
      const count = Math.max(12, Math.floor(path.totalLength / 22));
      for (let i = 0; i < count; i++) {
        this.particles.push({
          pathIdx,
          dist: (i / count) * path.totalLength + (Math.random() * 5),
          speedFactor: 0.85 + Math.random() * 0.3,
          sizeOffset: (Math.random() - 0.5) * 1.5,
          phase: Math.random() * Math.PI * 2,
          jitterX: (Math.random() - 0.5) * 1.5,
          jitterY: (Math.random() - 0.5) * 1.5
        });
      }
    });
  }

  getPosition(path, dist) {
    const d = ((dist % path.totalLength) + path.totalLength) % path.totalLength;
    for (let seg of path.segments) {
      if (d >= seg.startDist && d <= seg.startDist + seg.len) {
        const segDist = d - seg.startDist;
        const t = seg.len > 0 ? segDist / seg.len : 0;
        return {
          x: seg.p1.x + seg.dx * t,
          y: seg.p1.y + seg.dy * t
        };
      }
    }
    return path.points[0];
  }

  update(deltaTime) {
    if (state.isFlowPaused) return;

    const baseSpeed = state.compressorState === 'loaded' ? 1.0 : state.compressorState === 'unloaded' ? 0.35 : 0.05;
    const motorScale = state.motorSpeed / 100;
    const globalMultiplier = state.flowSpeed * baseSpeed * (0.3 + 0.7 * motorScale);

    this.particles.forEach(p => {
      const path = this.paths[p.pathIdx];
      
      if (path.id === 'ref-hgbv' && !state.hgbvOverride && state.compressorState === 'loaded') {
        p.alpha = 0.15;
      } else {
        p.alpha = 1.0;
      }

      if (state.activeFluidFilter && path.fluid !== state.activeFluidFilter) {
        p.filtered = true;
      } else {
        p.filtered = false;
      }

      const move = path.speed * globalMultiplier * p.speedFactor * deltaTime * 55;
      p.dist += move;
      p.phase += deltaTime * 3;
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach(p => {
      if (p.filtered) return;

      const path = this.paths[p.pathIdx];
      const pos = this.getPosition(path, p.dist);
      const radius = Math.max(1.8, path.size + p.sizeOffset);
      const alpha = p.alpha * (0.8 + 0.2 * Math.sin(p.phase));

      this.ctx.save();
      this.ctx.globalAlpha = alpha;

      if (path.fluid === 'intake') {
        this.ctx.beginPath();
        this.ctx.arc(pos.x + p.jitterX, pos.y + p.jitterY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = path.color;
        this.ctx.shadowColor = path.glowColor;
        this.ctx.shadowBlur = 6;
        this.ctx.fill();
      } else if (path.fluid === 'oil') {
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = path.color;
        this.ctx.shadowColor = path.glowColor;
        this.ctx.shadowBlur = 8;
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(pos.x - 1, pos.y - 1, radius * 0.35, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fef08a';
        this.ctx.fill();
      } else if (path.fluid === 'mixture') {
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius * 1.1, 0, Math.PI * 2);
        this.ctx.fillStyle = path.color;
        this.ctx.shadowColor = path.glowColor;
        this.ctx.shadowBlur = 7;
        this.ctx.fill();
      } else if (path.fluid === 'wetAir') {
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = path.color;
        this.ctx.shadowColor = path.glowColor;
        this.ctx.shadowBlur = 6;
        this.ctx.fill();
      } else if (path.fluid === 'dryAir') {
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = path.color;
        this.ctx.shadowColor = path.glowColor;
        this.ctx.shadowBlur = 10;
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius * 0.4, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
      } else if (path.fluid === 'refGas') {
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = path.color;
        this.ctx.shadowColor = path.glowColor;
        this.ctx.shadowBlur = 8;
        this.ctx.fill();
      } else if (path.fluid === 'refLiquid') {
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = path.color;
        this.ctx.shadowColor = path.glowColor;
        this.ctx.shadowBlur = 6;
        this.ctx.fill();
      }

      this.ctx.restore();
    });
  }
}

// 7. WEB AUDIO PROCEDURAL SYNTHESIZER
function initAudioEngine() {
  if (state.audioCtx) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new AudioContext();

    state.masterGain = state.audioCtx.createGain();
    state.masterGain.gain.setValueAtTime(0.3, state.audioCtx.currentTime);
    state.masterGain.connect(state.audioCtx.destination);

    // 1. Motor Sub-Bass
    state.motorOsc = state.audioCtx.createOscillator();
    state.motorOsc.type = 'sawtooth';
    state.motorOsc.frequency.setValueAtTime(58, state.audioCtx.currentTime);

    state.motorFilter = state.audioCtx.createBiquadFilter();
    state.motorFilter.type = 'lowpass';
    state.motorFilter.frequency.setValueAtTime(140, state.audioCtx.currentTime);

    state.motorGain = state.audioCtx.createGain();
    state.motorGain.gain.setValueAtTime(0, state.audioCtx.currentTime);

    state.motorOsc.connect(state.motorFilter);
    state.motorFilter.connect(state.motorGain);
    state.motorGain.connect(state.masterGain);
    state.motorOsc.start();

    // 2. Twin-Screw High Tone
    state.screwOsc = state.audioCtx.createOscillator();
    state.screwOsc.type = 'triangle';
    state.screwOsc.frequency.setValueAtTime(420, state.audioCtx.currentTime);

    state.screwGain = state.audioCtx.createGain();
    state.screwGain.gain.setValueAtTime(0, state.audioCtx.currentTime);

    state.screwOsc.connect(state.screwGain);
    state.screwGain.connect(state.masterGain);
    state.screwOsc.start();

    // 3. Airflow Hiss Noise
    const bufferSize = state.audioCtx.sampleRate * 2;
    const noiseBuffer = state.audioCtx.createBuffer(1, bufferSize, state.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    state.noiseNode = state.audioCtx.createBufferSource();
    state.noiseNode.buffer = noiseBuffer;
    state.noiseNode.loop = true;

    state.noiseFilter = state.audioCtx.createBiquadFilter();
    state.noiseFilter.type = 'bandpass';
    state.noiseFilter.frequency.setValueAtTime(800, state.audioCtx.currentTime);
    state.noiseFilter.Q.setValueAtTime(1.5, state.audioCtx.currentTime);

    state.noiseGain = state.audioCtx.createGain();
    state.noiseGain.gain.setValueAtTime(0, state.audioCtx.currentTime);

    state.noiseNode.connect(state.noiseFilter);
    state.noiseFilter.connect(state.noiseGain);
    state.noiseGain.connect(state.masterGain);
    state.noiseNode.start();

    state.soundEnabled = true;
    updateAudioParameters();
    updateSoundIcon();
    showNotification('Industrial Audio Engine Online (Synthesized).', 'info');
  } catch (err) {
    console.warn('AudioContext init error:', err);
  }
}

function updateAudioParameters() {
  if (!state.audioCtx || !state.soundEnabled) return;
  const t = state.audioCtx.currentTime;
  const rpmScale = state.motorSpeed / 100;

  if (state.compressorState === 'loaded') {
    state.motorGain.gain.setTargetAtTime(0.18 * rpmScale, t, 0.1);
    state.motorOsc.frequency.setTargetAtTime(50 + 25 * rpmScale, t, 0.1);
    state.screwGain.gain.setTargetAtTime(0.08 * rpmScale, t, 0.1);
    state.screwOsc.frequency.setTargetAtTime(300 + 500 * rpmScale, t, 0.1);
    state.noiseGain.gain.setTargetAtTime(0.12 * rpmScale, t, 0.1);
  } else if (state.compressorState === 'unloaded') {
    state.motorGain.gain.setTargetAtTime(0.09 * rpmScale, t, 0.1);
    state.motorOsc.frequency.setTargetAtTime(45 + 15 * rpmScale, t, 0.1);
    state.screwGain.gain.setTargetAtTime(0.02 * rpmScale, t, 0.1);
    state.screwOsc.frequency.setTargetAtTime(220 + 200 * rpmScale, t, 0.1);
    state.noiseGain.gain.setTargetAtTime(0.03, t, 0.1);
  } else {
    state.motorGain.gain.setTargetAtTime(0, t, 0.2);
    state.screwGain.gain.setTargetAtTime(0, t, 0.2);
    state.noiseGain.gain.setTargetAtTime(0, t, 0.2);
  }
}

function triggerDrainPurgeAudio() {
  if (!state.audioCtx || !state.soundEnabled) return;
  try {
    const t = state.audioCtx.currentTime;
    const blast = state.audioCtx.createOscillator();
    const blastGain = state.audioCtx.createGain();
    blast.type = 'sawtooth';
    blast.frequency.setValueAtTime(180, t);
    blast.frequency.exponentialRampToValueAtTime(40, t + 0.28);
    blastGain.gain.setValueAtTime(0.35, t);
    blastGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    blast.connect(blastGain);
    blastGain.connect(state.masterGain);
    blast.start(t);
    blast.stop(t + 0.32);
  } catch (e) {
    console.warn(e);
  }
}

function toggleSound() {
  if (!state.audioCtx) {
    initAudioEngine();
    return;
  }
  state.soundEnabled = !state.soundEnabled;
  if (state.soundEnabled) {
    state.masterGain.gain.setTargetAtTime(0.3, state.audioCtx.currentTime, 0.05);
    updateAudioParameters();
    showNotification('Audio Engine Unmuted', 'info');
  } else {
    state.masterGain.gain.setTargetAtTime(0, state.audioCtx.currentTime, 0.05);
    showNotification('Audio Engine Muted', 'info');
  }
  updateSoundIcon();
}

function updateSoundIcon() {
  const icon = document.getElementById('icon-sound');
  if (!icon) return;
  if (state.soundEnabled) {
    icon.classList.remove('text-slate-500');
    icon.classList.add('text-emerald-400');
    icon.setAttribute('data-lucide', 'volume-2');
  } else {
    icon.classList.remove('text-emerald-400');
    icon.classList.add('text-slate-500');
    icon.setAttribute('data-lucide', 'volume-x');
  }
  if (window.lucide) lucide.createIcons();
}

// 8. REAL-TIME SYSTEM PHYSICS SIMULATION
function updatePhysicsSimulation(deltaTime) {
  const rpmFactor = state.motorSpeed / 100;
  
  // 1. Discharge Pressure calculation
  let targetPressure = 0.0;
  if (state.compressorState === 'loaded') {
    targetPressure = 7.5 * (0.2 + 0.8 * rpmFactor);
    if (state.activeFault === 'clogged-filter') targetPressure -= 2.3;
  } else if (state.compressorState === 'unloaded') {
    targetPressure = 4.5;
  } else {
    targetPressure = 0.0;
  }
  state.dischargePressure += (targetPressure - state.dischargePressure) * Math.min(1, deltaTime * 2.5);

  // 2. Oil Sump Temperature calculation
  let targetOilTemp = 20.0;
  if (state.compressorState === 'loaded') {
    targetOilTemp = 60.0 + (state.ambientTemp * 0.6) + (20.0 * rpmFactor);
    if (state.activeFault === 'cooler-fouling') targetOilTemp += 32.0;
  } else if (state.compressorState === 'unloaded') {
    targetOilTemp = 50.0 + (state.ambientTemp * 0.4);
  } else {
    targetOilTemp = state.ambientTemp;
  }
  state.oilTemp += (targetOilTemp - state.oilTemp) * Math.min(1, deltaTime * 0.8);

  // 3. Pressure Dew Point (PDP) calculation
  let targetDewPoint = 3.0;
  if (!state.dryerPower || state.activeFault === 'ref-leak') {
    targetDewPoint = state.ambientTemp + 8.0;
  } else {
    targetDewPoint = 3.0 + 0.08 * (state.ambientTemp - 25.0) + (state.hgbvOverride ? 2.5 : 0.0);
  }
  state.dewPoint += (targetDewPoint - state.dewPoint) * Math.min(1, deltaTime * 1.2);

  // 4. Moisture Extraction Rate (L/hr)
  let targetMoisture = 0.0;
  if (state.compressorState === 'loaded') {
    const moistureFactor = Math.pow(1.045, state.ambientTemp);
    targetMoisture = 3.8 * rpmFactor * moistureFactor;
    if (state.activeFault === 'failed-drain') targetMoisture = 0.2;
  } else {
    targetMoisture = 0.0;
  }
  state.moistureRate += (targetMoisture - state.moistureRate) * Math.min(1, deltaTime * 1.5);

  updateTelemetryUI();
  updateMechanicalAnimations(rpmFactor);
}

function updateTelemetryUI() {
  const pEl = document.getElementById('gauge-pressure');
  const dpEl = document.getElementById('gauge-dewpoint');
  const otEl = document.getElementById('gauge-oiltemp');
  const mEl = document.getElementById('gauge-moisture');

  const pBar = document.getElementById('bar-pressure');
  const dpBar = document.getElementById('bar-dewpoint');
  const otBar = document.getElementById('bar-oiltemp');
  const mBar = document.getElementById('bar-moisture');

  if (pEl) pEl.textContent = state.dischargePressure.toFixed(1);
  if (dpEl) {
    const sign = state.dewPoint >= 0 ? '+' : '';
    dpEl.textContent = `${sign}${state.dewPoint.toFixed(1)}`;
    if (state.dewPoint > 10) {
      dpEl.className = 'text-2xl font-black font-mono text-rose-400';
    } else {
      dpEl.className = 'text-2xl font-black font-mono text-emerald-400';
    }
  }
  if (otEl) {
    otEl.textContent = state.oilTemp.toFixed(1);
    if (state.oilTemp > 100) {
      otEl.className = 'text-2xl font-black font-mono text-rose-500 animate-pulse';
    } else {
      otEl.className = 'text-2xl font-black font-mono text-amber-400';
    }
  }
  if (mEl) mEl.textContent = state.moistureRate.toFixed(1);

  if (pBar) pBar.style.width = `${Math.min(100, (state.dischargePressure / 10) * 100)}%`;
  if (dpBar) dpBar.style.width = `${Math.min(100, (Math.max(0, state.dewPoint) / 35) * 100)}%`;
  if (otBar) otBar.style.width = `${Math.min(100, (state.oilTemp / 120) * 100)}%`;
  if (mBar) mBar.style.width = `${Math.min(100, (state.moistureRate / 8) * 100)}%`;

  const statusTxt = document.getElementById('system-status-text');
  const substatusTxt = document.getElementById('system-substatus-text');
  const statusDot = document.getElementById('status-dot');
  const statusPing = document.getElementById('status-ping');

  if (statusTxt && substatusTxt) {
    if (state.activeFault) {
      statusTxt.textContent = `SYSTEM ALERT: ${state.activeFault.toUpperCase()}`;
      statusTxt.className = 'text-xs font-bold uppercase tracking-wider text-rose-400 animate-pulse';
      substatusTxt.textContent = `${state.dischargePressure.toFixed(1)} Bar(e) | FAULT TRIPPED | Check Inspector`;
      if (statusDot) statusDot.className = 'relative inline-flex rounded-full h-3 w-3 bg-rose-500';
      if (statusPing) statusPing.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75';
    } else if (state.compressorState === 'loaded') {
      statusTxt.textContent = 'COMPRESSOR LOADED (RUNNING)';
      statusTxt.className = 'text-xs font-bold uppercase tracking-wider text-slate-200';
      substatusTxt.textContent = `${state.dischargePressure.toFixed(1)} Bar(e) | PDP ${state.dewPoint >= 0 ? '+' : ''}${state.dewPoint.toFixed(1)}°C | Normal Delivery`;
      if (statusDot) statusDot.className = 'relative inline-flex rounded-full h-3 w-3 bg-emerald-500';
      if (statusPing) statusPing.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
    } else if (state.compressorState === 'unloaded') {
      statusTxt.textContent = 'COMPRESSOR UNLOADED (IDLING)';
      statusTxt.className = 'text-xs font-bold uppercase tracking-wider text-amber-300';
      substatusTxt.textContent = `${state.dischargePressure.toFixed(1)} Bar(e) | Energy Saving Standby`;
      if (statusDot) statusDot.className = 'relative inline-flex rounded-full h-3 w-3 bg-amber-500';
      if (statusPing) statusPing.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75';
    } else {
      statusTxt.textContent = 'COMPRESSOR STOPPED (OFF)';
      statusTxt.className = 'text-xs font-bold uppercase tracking-wider text-slate-400';
      substatusTxt.textContent = '0.0 Bar(e) | Ready to Start';
      if (statusDot) statusDot.className = 'relative inline-flex rounded-full h-3 w-3 bg-slate-600';
      if (statusPing) statusPing.className = 'hidden';
    }
  }
}

function updateMechanicalAnimations(rpmFactor) {
  const root = document.documentElement;
  if (state.compressorState === 'loaded') {
    const screwSec = (0.7 / Math.max(0.2, rpmFactor)).toFixed(2);
    const fanSec = (1.0 / Math.max(0.2, rpmFactor)).toFixed(2);
    root.style.setProperty('--screw-speed', `${screwSec}s`);
    root.style.setProperty('--fan-speed', `${fanSec}s`);
  } else if (state.compressorState === 'unloaded') {
    root.style.setProperty('--screw-speed', `2.5s`);
    root.style.setProperty('--fan-speed', `2.8s`);
  } else {
    root.style.setProperty('--screw-speed', `999s`);
    root.style.setProperty('--fan-speed', `999s`);
  }
}

// 9. COMPONENT INSPECTOR & HOTSPOT CONTROLLER
function inspectComponent(compKey) {
  const data = componentsData[compKey];
  if (!data) return;

  state.inspectedComponent = compKey;

  document.querySelectorAll('.interactive-component').forEach(el => {
    el.classList.remove('active-inspected');
  });
  const activeSvgGroup = document.querySelector(`[data-comp="${compKey}"]`);
  if (activeSvgGroup) {
    activeSvgGroup.classList.add('active-inspected');
  }

  const titleEl = document.getElementById('insp-title');
  const subEl = document.getElementById('insp-subtitle');
  const badgeEl = document.getElementById('insp-badge');
  const fluidBadgeEl = document.getElementById('insp-fluid-badge');
  const descEl = document.getElementById('insp-desc');
  const inletEl = document.getElementById('insp-inlet-val');
  const outletEl = document.getElementById('insp-outlet-val');
  const fluidEl = document.getElementById('insp-fluid-val');
  const maintEl = document.getElementById('insp-maint-val');
  const actionBtn = document.getElementById('btn-insp-action');
  const actionLabel = document.getElementById('insp-action-label');

  if (titleEl) titleEl.textContent = data.title;
  if (subEl) subEl.textContent = data.subsystem;
  if (badgeEl) {
    badgeEl.textContent = data.subsystem.toUpperCase();
    badgeEl.className = `px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${data.badgeClass}`;
  }
  if (fluidBadgeEl) fluidBadgeEl.textContent = data.fluidBadge;
  if (descEl) descEl.textContent = data.desc;
  if (inletEl) inletEl.textContent = data.inlet;
  if (outletEl) outletEl.textContent = data.outlet;
  if (fluidEl) fluidEl.textContent = data.fluidVal;
  if (maintEl) maintEl.textContent = data.maintVal;

  if (actionLabel) actionLabel.textContent = data.actionLabel;
  if (actionBtn) {
    actionBtn.onclick = () => {
      if (typeof data.actionFn === 'function') data.actionFn();
    };
  }
}

// 10. GUIDED TOUR CONTROLLER
function setMode(newMode) {
  state.mode = newMode;
  document.querySelectorAll('.mode-tab').forEach(tab => tab.classList.remove('active'));

  const activeTab = document.getElementById(`nav-mode-${newMode}`);
  if (activeTab) activeTab.classList.add('active');

  const tourBanner = document.getElementById('tour-banner');
  const quizModal = document.getElementById('quiz-modal');
  const svg = document.getElementById('schematic-svg');

  if (newMode === 'tour') {
    if (tourBanner) tourBanner.classList.remove('hidden');
    if (svg) svg.classList.add('spotlight-active');
    goToTourStep(0);
  } else {
    if (tourBanner) tourBanner.classList.add('hidden');
    if (svg) svg.classList.remove('spotlight-active');
    clearTourHighlights();
    stopTourAutoPlay();
    resetViewport();
  }

  if (newMode === 'quiz') {
    openQuizModal();
  } else {
    if (quizModal) quizModal.classList.add('hidden');
  }

  if (newMode === 'explore') {
    showNotification('Interactive Explorer Active: Click any component or legend item.', 'info');
  }
}

function goToTourStep(index) {
  if (index < 0) index = 0;
  if (index >= tourStages.length) index = tourStages.length - 1;
  state.tourStep = index;

  const stage = tourStages[index];
  const badge = document.getElementById('tour-step-badge');
  const title = document.getElementById('tour-step-title');
  const desc = document.getElementById('tour-step-desc');

  if (badge) badge.textContent = `${stage.step}/7`;
  if (title) title.textContent = stage.title;
  if (desc) desc.textContent = stage.desc;

  clearTourHighlights();

  stage.focusComponents.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('tour-focus');
  });
  stage.focusPipes.forEach(cls => {
    document.querySelectorAll(`.${cls}`).forEach(el => el.classList.add('tour-focus'));
  });

  inspectComponent(stage.targetComp);

  if (stage.camera) {
    setCamera(stage.camera.zoom, stage.camera.panX, stage.camera.panY);
  }
}

function clearTourHighlights() {
  document.querySelectorAll('.tour-focus').forEach(el => el.classList.remove('tour-focus'));
}

function startTourAutoPlay() {
  state.tourAutoPlay = true;
  const playBtn = document.getElementById('btn-tour-playpause');
  const playIcon = document.getElementById('icon-tour-play');
  if (playIcon) playIcon.setAttribute('data-lucide', 'pause');
  if (playBtn) playBtn.innerHTML = '<i data-lucide="pause" class="w-3.5 h-3.5"></i> Pause';
  if (window.lucide) lucide.createIcons();

  state.tourTimer = setInterval(() => {
    let nextStep = state.tourStep + 1;
    if (nextStep >= tourStages.length) nextStep = 0;
    goToTourStep(nextStep);
  }, 6000);
}

function stopTourAutoPlay() {
  state.tourAutoPlay = false;
  if (state.tourTimer) {
    clearInterval(state.tourTimer);
    state.tourTimer = null;
  }
  const playBtn = document.getElementById('btn-tour-playpause');
  if (playBtn) playBtn.innerHTML = '<i data-lucide="play" id="icon-tour-play" class="w-3.5 h-3.5"></i> Auto-Play';
  if (window.lucide) lucide.createIcons();
}

// 11. FAULT INJECTION LAB
function injectFault(faultKey) {
  state.activeFault = faultKey;
  
  document.querySelectorAll('.fault-btn').forEach(btn => {
    if (btn.getAttribute('data-fault') === faultKey) {
      btn.classList.add('border-rose-500', 'bg-rose-950/40');
    } else {
      btn.classList.remove('border-rose-500', 'bg-rose-950/40');
    }
  });

  if (faultKey === 'clogged-filter') {
    inspectComponent('air-filter');
    showNotification('FAULT INJECTED: Air intake filter clogged. High suction restriction reduces air output to 5.2 bar.', 'warning');
  } else if (faultKey === 'cooler-fouling') {
    inspectComponent('oil-cooler');
    showNotification('FAULT INJECTED: Oil cooler fouled. Oil temperature climbing dangerously (>108°C).', 'danger');
  } else if (faultKey === 'failed-drain') {
    inspectComponent('water-separator');
    showNotification('FAULT INJECTED: Condensate drain valve stuck closed. Separator bowl flooding into supply line!', 'danger');
  } else if (faultKey === 'ref-leak') {
    inspectComponent('evaporator');
    showNotification('FAULT INJECTED: Refrigerant charge lost. Evaporator warming up; PDP climbing to +28°C (wet air).', 'warning');
  }
}

function clearFaults() {
  state.activeFault = null;
  document.querySelectorAll('.fault-btn').forEach(btn => {
    btn.classList.remove('border-rose-500', 'bg-rose-950/40');
  });
  showNotification('All injected faults cleared. Systems normalized.', 'success');
}

// 12. QUIZ CONTROLLER
function openQuizModal() {
  const modal = document.getElementById('quiz-modal');
  if (!modal) return;
  state.quizIndex = 0;
  state.quizScore = 0;
  state.quizSelectedOption = null;
  renderQuizQuestion();
  modal.classList.remove('hidden');
}

function renderQuizQuestion() {
  const qData = quizQuestions[state.quizIndex];
  const container = document.getElementById('quiz-content');
  const progress = document.getElementById('quiz-progress');
  const nextBtn = document.getElementById('btn-quiz-next');

  if (progress) progress.textContent = `Question ${state.quizIndex + 1} of ${quizQuestions.length}`;
  if (nextBtn) nextBtn.innerHTML = '<span>Submit Answer</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>';
  if (window.lucide) lucide.createIcons();

  if (!container) return;
  container.innerHTML = `
    <div class="space-y-3">
      <h3 class="text-sm md:text-base font-semibold text-slate-100">${qData.q}</h3>
      <div class="space-y-2">
        ${qData.options.map((opt, i) => `
          <button data-opt-idx="${i}" class="quiz-opt-btn w-full text-left p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-all">
            <span class="font-bold text-sky-400 mr-2">${String.fromCharCode(65 + i)}.</span> ${opt}
          </button>
        `).join('')}
      </div>
      <div id="quiz-feedback-box" class="hidden p-3 rounded-xl text-xs"></div>
    </div>
  `;

  document.querySelectorAll('.quiz-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.quiz-opt-btn').forEach(b => b.classList.remove('border-sky-500', 'bg-sky-950/60'));
      btn.classList.add('border-sky-500', 'bg-sky-950/60');
      state.quizSelectedOption = parseInt(btn.getAttribute('data-opt-idx'), 10);
    });
  });
}

function handleQuizSubmit() {
  const qData = quizQuestions[state.quizIndex];
  const feedbackBox = document.getElementById('quiz-feedback-box');
  const nextBtn = document.getElementById('btn-quiz-next');

  if (state.quizSelectedOption === null) {
    showNotification('Please select an answer first.', 'warning');
    return;
  }

  if (feedbackBox && !feedbackBox.classList.contains('hidden')) {
    state.quizIndex++;
    state.quizSelectedOption = null;
    if (state.quizIndex < quizQuestions.length) {
      renderQuizQuestion();
    } else {
      showQuizResults();
    }
    return;
  }

  const isCorrect = state.quizSelectedOption === qData.correct;
  if (isCorrect) state.quizScore++;

  if (feedbackBox) {
    feedbackBox.classList.remove('hidden');
    feedbackBox.className = `p-3.5 rounded-xl text-xs border ${isCorrect ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200' : 'bg-rose-950/60 border-rose-500 text-rose-200'}`;
    feedbackBox.innerHTML = `
      <div class="font-bold mb-1 flex items-center gap-1.5">
        <i data-lucide="${isCorrect ? 'check-circle' : 'alert-circle'}" class="w-4 h-4"></i>
        ${isCorrect ? 'Correct!' : 'Incorrect.'}
      </div>
      <p>${qData.explanation}</p>
    `;
  }

  document.querySelectorAll('.quiz-opt-btn').forEach((btn, idx) => {
    if (idx === qData.correct) {
      btn.classList.add('border-emerald-500', 'bg-emerald-950/60', 'text-emerald-200');
    } else if (idx === state.quizSelectedOption && !isCorrect) {
      btn.classList.add('border-rose-500', 'bg-rose-950/60', 'text-rose-200');
    }
  });

  if (nextBtn) {
    nextBtn.innerHTML = `<span>${state.quizIndex + 1 < quizQuestions.length ? 'Next Question' : 'View Results'}</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
  }
  if (window.lucide) lucide.createIcons();
}

function showQuizResults() {
  const container = document.getElementById('quiz-content');
  const progress = document.getElementById('quiz-progress');
  const nextBtn = document.getElementById('btn-quiz-next');

  if (progress) progress.textContent = 'Quiz Completed!';
  if (nextBtn) {
    nextBtn.innerHTML = '<span>Restart Quiz</span> <i data-lucide="rotate-ccw" class="w-4 h-4"></i>';
    nextBtn.onclick = () => openQuizModal();
  }

  const pct = Math.round((state.quizScore / quizQuestions.length) * 100);
  let gradeBadge = pct >= 80 ? 'Master Certified (Level 3)' : pct >= 60 ? 'Skilled Operator (Level 2)' : 'Trainee (Level 1)';

  if (container) {
    container.innerHTML = `
      <div class="text-center py-6 space-y-4">
        <div class="w-16 h-16 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 mx-auto flex items-center justify-center text-2xl font-bold font-mono">
          ${pct}%
        </div>
        <div>
          <h3 class="text-lg font-bold text-white">Score: ${state.quizScore} / ${quizQuestions.length} Correct</h3>
          <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mt-2">
            ${gradeBadge}
          </span>
        </div>
        <p class="text-xs text-slate-300 max-w-md mx-auto">
          ${pct >= 80 ? 'Exceptional comprehension of rotary screw compression, two-stage oil separation, and direct-expansion refrigeration drying principles!' : 'Good effort! Review the Guided Tour to solidify your grasp of the heat exchanger and bypass systems.'}
        </p>
      </div>
    `;
  }
  if (window.lucide) lucide.createIcons();
}

// 13. VIEWPORT PAN & ZOOM CONTROLLER
function setCamera(zoom, panX, panY) {
  state.zoom = Math.max(0.6, Math.min(2.5, zoom));
  state.panX = panX;
  state.panY = panY;
  applyTransform();
}

function resetViewport() {
  state.zoom = 1.0;
  state.panX = 0;
  state.panY = 0;
  applyTransform();
}

function applyTransform() {
  const el = document.getElementById('viewport-transform');
  if (el) {
    el.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  }
}

function initPanZoomEvents() {
  const container = document.getElementById('diagram-container');
  if (!container) return;

  container.addEventListener('mousedown', (e) => {
    if (e.target.closest('.interactive-component') || e.target.closest('.legend-row')) return;
    state.isPanning = true;
    state.startPanX = e.clientX - state.panX;
    state.startPanY = e.clientY - state.panY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.isPanning) return;
    state.panX = e.clientX - state.startPanX;
    state.panY = e.clientY - state.startPanY;
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    state.isPanning = false;
  });

  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    state.zoom = Math.max(0.6, Math.min(2.5, state.zoom + delta));
    applyTransform();
  }, { passive: false });

  document.getElementById('btn-zoom-in')?.addEventListener('click', () => setCamera(state.zoom + 0.15, state.panX, state.panY));
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => setCamera(state.zoom - 0.15, state.panX, state.panY));
  document.getElementById('btn-zoom-fit')?.addEventListener('click', resetViewport);
}

// 14. NOTIFICATIONS & EXPORT
function showNotification(msg, type = 'info') {
  const existing = document.getElementById('app-notification');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'app-notification';
  let color = 'bg-sky-600 text-white border-sky-400';
  if (type === 'success') color = 'bg-emerald-600 text-white border-emerald-400';
  if (type === 'warning') color = 'bg-amber-600 text-white border-amber-400';
  if (type === 'danger') color = 'bg-rose-600 text-white border-rose-400';

  el.className = `fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl border transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 ${color}`;
  el.innerHTML = `<i data-lucide="info" class="w-4 h-4"></i> <span>${msg}</span>`;

  document.body.appendChild(el);
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    el.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

function exportDiagramSnapshot() {
  const svg = document.getElementById('schematic-svg');
  if (!svg) return;

  const svgData = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `integrated-compressor-diagram-${new Date().toISOString().slice(0, 10)}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification('High-Resolution Vector SVG Diagram Exported.', 'success');
}

// 15. INITIALIZATION & EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('flow-canvas');
  const flowEngine = new ParticleFlowEngine(canvas);

  let lastTime = performance.now();
  function animationLoop(now) {
    const deltaTime = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    updatePhysicsSimulation(deltaTime);
    flowEngine.update(deltaTime);
    flowEngine.draw();

    requestAnimationFrame(animationLoop);
  }
  requestAnimationFrame(animationLoop);

  // Mode Tabs
  document.getElementById('nav-mode-explore')?.addEventListener('click', () => setMode('explore'));
  document.getElementById('nav-mode-tour')?.addEventListener('click', () => setMode('tour'));
  document.getElementById('nav-mode-simulator')?.addEventListener('click', () => setMode('simulator'));
  document.getElementById('nav-mode-faults')?.addEventListener('click', () => setMode('faults'));
  document.getElementById('nav-mode-quiz')?.addEventListener('click', () => setMode('quiz'));

  // Theme Dropdown
  const themeMenuBtn = document.getElementById('btn-theme-menu');
  const themeDropdown = document.getElementById('theme-dropdown');
  themeMenuBtn?.addEventListener('click', () => themeDropdown?.classList.toggle('hidden'));

  document.querySelectorAll('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme');
      document.body.className = `theme-${theme} font-sans min-h-screen overflow-x-hidden select-none`;
      themeDropdown?.classList.add('hidden');
      showNotification(`Theme changed to ${btn.textContent.trim()}`, 'info');
    });
  });

  // Flow Play / Pause & Speed
  const playPauseBtn = document.getElementById('btn-flow-playpause');
  const playPauseIcon = document.getElementById('icon-flow-playpause');
  playPauseBtn?.addEventListener('click', () => {
    state.isFlowPaused = !state.isFlowPaused;
    if (playPauseIcon) playPauseIcon.setAttribute('data-lucide', state.isFlowPaused ? 'play' : 'pause');
    if (window.lucide) lucide.createIcons();
    showNotification(state.isFlowPaused ? 'Fluid Motion Paused' : 'Fluid Motion Resumed', 'info');
  });

  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active', 'bg-sky-600', 'text-white'));
      btn.classList.add('active', 'bg-sky-600', 'text-white');
      state.flowSpeed = parseFloat(btn.getAttribute('data-speed'));
      showNotification(`Flow Velocity set to ${state.flowSpeed}x`, 'info');
    });
  });

  // Sound Engine
  document.getElementById('btn-toggle-sound')?.addEventListener('click', toggleSound);

  // Export Diagram
  document.getElementById('btn-export-diagram')?.addEventListener('click', exportDiagramSnapshot);

  // Reset All
  document.getElementById('btn-reset-all')?.addEventListener('click', () => {
    state.compressorState = 'loaded';
    state.motorSpeed = 100;
    state.ambientTemp = 25.0;
    state.dryerPower = true;
    state.hgbvOverride = false;
    state.activeFluidFilter = null;
    clearFaults();
    resetViewport();
    const sliderRpm = document.getElementById('slider-rpm');
    const sliderAmb = document.getElementById('slider-ambient');
    const lblRpm = document.getElementById('label-rpm');
    const lblAmb = document.getElementById('label-ambient');
    const togDryer = document.getElementById('toggle-dryer');
    const togHgbv = document.getElementById('toggle-hgbv');
    if (sliderRpm) sliderRpm.value = 100;
    if (sliderAmb) sliderAmb.value = 25;
    if (lblRpm) lblRpm.textContent = '3,000 RPM (100%)';
    if (lblAmb) lblAmb.textContent = '25.0 °C';
    if (togDryer) togDryer.checked = true;
    if (togHgbv) togHgbv.checked = false;
    document.querySelectorAll('.state-btn').forEach(b => b.classList.remove('active', 'bg-sky-600', 'text-white'));
    document.querySelector('[data-state="loaded"]')?.classList.add('active', 'bg-sky-600', 'text-white');
    document.querySelectorAll('.legend-row').forEach(r => r.classList.remove('inactive'));
    document.querySelectorAll('.pipe-bg, .pipe-inner').forEach(p => p.classList.remove('fluid-filtered-out'));
    showNotification('System reset to default factory operating parameters.', 'info');
  });

  // Compressor State Buttons
  document.querySelectorAll('.state-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.state-btn').forEach(b => b.classList.remove('active', 'bg-sky-600', 'text-white'));
      btn.classList.add('active', 'bg-sky-600', 'text-white');
      state.compressorState = btn.getAttribute('data-state');
      const label = document.getElementById('label-state-mode');
      if (label) {
        label.textContent = state.compressorState === 'loaded' ? 'Loaded (Full Output)' : state.compressorState === 'unloaded' ? 'Unloaded (Idling)' : 'Standby (Stopped)';
      }
      updateAudioParameters();
    });
  });

  // Sliders
  document.getElementById('slider-rpm')?.addEventListener('input', (e) => {
    state.motorSpeed = parseInt(e.target.value, 10);
    state.motorRpm = Math.round((state.motorSpeed / 100) * 3000);
    const rpmLabel = document.getElementById('label-rpm');
    const loadBadge = document.getElementById('load-badge');
    if (rpmLabel) rpmLabel.textContent = `${state.motorRpm.toLocaleString()} RPM (${state.motorSpeed}%)`;
    if (loadBadge) loadBadge.textContent = `${state.motorSpeed}% LOAD`;
    updateAudioParameters();
  });

  document.getElementById('slider-ambient')?.addEventListener('input', (e) => {
    state.ambientTemp = parseFloat(e.target.value);
    const ambLabel = document.getElementById('label-ambient');
    if (ambLabel) ambLabel.textContent = `${state.ambientTemp.toFixed(1)} °C`;
  });

  // Toggles
  document.getElementById('toggle-dryer')?.addEventListener('change', (e) => {
    state.dryerPower = e.target.checked;
    showNotification(`Refrigeration Dryer: ${state.dryerPower ? 'ENABLED (Chilling active)' : 'DISABLED (Warm air pass)'}`, state.dryerPower ? 'info' : 'warning');
  });

  document.getElementById('toggle-hgbv')?.addEventListener('change', (e) => {
    state.hgbvOverride = e.target.checked;
    showNotification(`Hot Gas Bypass: ${state.hgbvOverride ? 'FORCED OPEN' : 'AUTO MODULATING'}`, 'info');
  });

  // Fault Buttons
  document.querySelectorAll('.fault-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fault = btn.getAttribute('data-fault');
      if (state.activeFault === fault) {
        clearFaults();
      } else {
        injectFault(fault);
      }
    });
  });
  document.getElementById('btn-clear-faults')?.addEventListener('click', clearFaults);

  // SVG Hotspot Interactions
  document.querySelectorAll('.interactive-component').forEach(comp => {
    comp.addEventListener('click', () => {
      const key = comp.getAttribute('data-comp');
      if (key) inspectComponent(key);
    });
  });

  // Fluid Legend Filter Interactions
  document.querySelectorAll('.legend-row').forEach(row => {
    row.addEventListener('click', () => {
      const fluid = row.getAttribute('data-fluid');
      if (state.activeFluidFilter === fluid) {
        state.activeFluidFilter = null;
        document.querySelectorAll('.legend-row').forEach(r => r.classList.remove('inactive'));
        document.querySelectorAll('.pipe-bg, .pipe-inner').forEach(p => p.classList.remove('fluid-filtered-out'));
        showNotification('Showing all fluid flow circuits.', 'info');
      } else {
        state.activeFluidFilter = fluid;
        document.querySelectorAll('.legend-row').forEach(r => {
          if (r.getAttribute('data-fluid') === fluid) {
            r.classList.remove('inactive');
          } else {
            r.classList.add('inactive');
          }
        });
        document.querySelectorAll('.pipe-bg, .pipe-inner').forEach(p => {
          if (p.classList.contains(`pipe-${fluid}`)) {
            p.classList.remove('fluid-filtered-out');
          } else {
            p.classList.add('fluid-filtered-out');
          }
        });
        showNotification(`Filtered view: Isolated ${fluid.toUpperCase()} circuit.`, 'info');
      }
    });
  });

  // Guided Tour Controls
  document.getElementById('btn-tour-prev')?.addEventListener('click', () => goToTourStep(state.tourStep - 1));
  document.getElementById('btn-tour-next')?.addEventListener('click', () => goToTourStep(state.tourStep + 1));
  document.getElementById('btn-tour-playpause')?.addEventListener('click', () => {
    if (state.tourAutoPlay) stopTourAutoPlay();
    else startTourAutoPlay();
  });
  document.getElementById('btn-tour-close')?.addEventListener('click', () => setMode('explore'));

  // Quiz Controls
  document.getElementById('btn-quiz-next')?.addEventListener('click', handleQuizSubmit);
  document.getElementById('btn-close-quiz')?.addEventListener('click', () => {
    document.getElementById('quiz-modal')?.classList.add('hidden');
    setMode('explore');
  });

  // Pan & Zoom
  initPanZoomEvents();

  // Inspect default component
  inspectComponent('screw-element');
});




