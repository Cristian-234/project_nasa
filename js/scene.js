import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createHabitat } from './habitat.js';
import { createSky } from './sky.js';
import { Rover } from './rover.js';
import { Domo, DomoController } from './domo.js';
import { Domo2, Domo2Controller } from './domo2.js';
import * as dat from 'dat.gui';

export async function createScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0A0A1A); // Fondo oscuro como en el código del compañero

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(50, 50, 100); // Posición de cámara más alejada para ver todo

  const clock = new THREE.Clock();

  // ========================================
  // ✅ SISTEMA DE TIEMPO MARCIANO (del compañero)
  // ========================================
  let skyChangeInterval;
  let isSkyChanging = false;
  let currentSkyColor = new THREE.Color(0x0A0A1A);
  let targetSkyColor = new THREE.Color(0x0A0A1A);
  let transitionProgress = 1;
  let isTransitioning = false;
  let lastTime = Date.now();
  let currentColorIndex = 0;
  let marsTime = { hours: 0, minutes: 0, seconds: 0 };
  let currentTemperature = -73;
  let currentSol = 1;

  // ========================================
  // ✅ PANELES DE UI (del compañero)
  // ========================================
  const skyTimerDisplay = document.createElement('div');
  skyTimerDisplay.style.position = 'absolute';
  skyTimerDisplay.style.bottom = '100px';
  skyTimerDisplay.style.left = '10px';
  skyTimerDisplay.style.color = 'white';
  skyTimerDisplay.style.backgroundColor = 'rgba(0,0,0,0.8)';
  skyTimerDisplay.style.padding = '15px';
  skyTimerDisplay.style.borderRadius = '8px';
  skyTimerDisplay.style.fontFamily = 'Arial, sans-serif';
  skyTimerDisplay.style.fontSize = '14px';
  skyTimerDisplay.style.zIndex = '1000';
  skyTimerDisplay.style.minWidth = '280px';
  skyTimerDisplay.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
  skyTimerDisplay.innerHTML = 'Iniciando simulación...';
  document.body.appendChild(skyTimerDisplay);

  const resourcePanel = document.createElement('div');
  resourcePanel.style.position = 'absolute';
  resourcePanel.style.top = '10px';
  resourcePanel.style.left = '10px';
  resourcePanel.style.color = 'white';
  resourcePanel.style.backgroundColor = 'rgba(0,0,0,0.8)';
  resourcePanel.style.padding = '15px';
  resourcePanel.style.borderRadius = '8px';
  resourcePanel.style.fontFamily = 'Arial, sans-serif';
  resourcePanel.style.fontSize = '14px';
  resourcePanel.style.zIndex = '1000';
  resourcePanel.style.minWidth = '280px';
  resourcePanel.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
  document.body.appendChild(resourcePanel);

  // ========================================
  // ✅ SISTEMA DE RECURSOS (del compañero)
  // ========================================
  const resources = {
    food: { initial: 10000, current: 10000, unit: 'kg', consumptionPerCrewPerDay: 2 },
    water: { initial: 20000, current: 20000, unit: 'L', consumptionPerCrewPerDay: 4 },
    oxygen: { initial: 5000, current: 5000, unit: 'kg', consumptionPerCrewPerDay: 1 }
  };

  let totalMissionSols = 365 * 2;

  // ========================================
  // ✅ FORMULARIO INICIAL (del compañero)
  // ========================================
  resourcePanel.innerHTML = `
    <div style="border-bottom: 2px solid #FFB380; padding-bottom: 10px; margin-bottom: 10px;">
      <strong style="font-size: 18px;">📊 Resource Configuration</strong>
    </div>
    <label>Years on Mars: <input type="number" id="missionYears" value="2" step="0.5" min="0.5"></label><br>
    <label>Crew Members: <input type="number" id="crewSize" value="4" min="1"></label><br>
    <label>Initial Food (kg): <input type="number" id="foodInitial" value="10000" min="0"></label><br>
    <label>Initial Water (L): <input type="number" id="waterInitial" value="20000" min="0"></label><br>
    <label>Initial Oxygen (kg): <input type="number" id="oxygenInitial" value="5000" min="0"></label><br>
    <label>Food/Crew/Day (kg): <input type="number" id="foodPerCrewDay" value="2" step="0.1" min="0"></label><br>
    <label>Water/Crew/Day (L): <input type="number" id="waterPerCrewDay" value="4" step="0.1" min="0"></label><br>
    <label>Oxygen/Crew/Day (kg): <input type="number" id="oxygenPerCrewDay" value="1" step="0.1" min="0"></label><br>
    <button id="startSimulation" style="margin-top: 10px; padding: 5px 10px; background: #FFB380; border: none; color: white; cursor: pointer;">Start Simulation</button>
  `;

  // ========================================
  // ✅ ILUMINACIÓN (combinada)
  // ========================================
  const ambientLight = new THREE.AmbientLight(0xadd8e6, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(10, 20, 10);
  directionalLight.target.position.set(0, 0, 0);
  scene.add(directionalLight);
  scene.add(directionalLight.target);

  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -200;
  directionalLight.shadow.camera.right = 200;
  directionalLight.shadow.camera.top = 200;
  directionalLight.shadow.camera.bottom = -200;

  const hemisphereLight = new THREE.HemisphereLight(0xb1e1ff, 0xb97a20, 0.3);
  scene.add(hemisphereLight);

  // ========================================
  // ✅ TERRENO (de tu código)
  // ========================================
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('./models/superficie.glb');
  const terrain = gltf.scene;
  terrain.scale.set(10, 10, 10);
  terrain.position.set(0, 0, 0);

  terrain.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material && !(child.material instanceof THREE.MeshStandardMaterial) && !(child.material instanceof THREE.MeshPhysicalMaterial)) {
        child.material = new THREE.MeshStandardMaterial({
          map: child.material.map,
          color: child.material.color,
        });
        child.material.needsUpdate = true;
      }
    }
  });
  scene.add(terrain);

  const clickableObjects = [];

  // ========================================
  // ✅ HÁBITAT (de tu código - mejorado)
  // ========================================
  const initialZones = [
    { type: 'Descanso', position: [0, 0, -0.5], size: {x:0.8, y:0.8, z:0.8}, color: 0x00ff00 },
    { type: 'Ejercicio', position: [0, 0, 0.5], size: {x:0.8, y:0.8, z:0.8}, color: 0xff0000 },
    { type: 'Soporte Vital', position: [0.5, 0, 0], size: {x:0.8, y:0.8, z:0.8}, color: 0x0000ff }
  ];
  
  let habitat = await createHabitat('sphere', 1.5, 3, initialZones);
  habitat.position.set(0, 5, 0);
  scene.add(habitat);
  clickableObjects.push(habitat);
  habitat.children.forEach(child => clickableObjects.push(child));

  // ========================================
  // ✅ ROVER (de tu código)
  // ========================================
  const rover = new Rover();
  const roverModel = await rover.loadModel(); 
  roverModel.position.set(10, 3, 10);
  scene.add(roverModel);
  clickableObjects.push(roverModel);

  createSky(scene);

  // ========================================
  // ✅ DOMOS (del compañero)
  // ========================================
  const domo = new Domo();
  let domoController = null;

  try {
    console.log('🚀 Iniciando carga del domo...');
    const domoModel = await domo.loadModel();
    domoModel.position.set(15, 5, 15);
    scene.add(domoModel);
    
    domoController = new DomoController(domo, terrain, camera, scene, renderer);
    
    console.log('✅ Domo agregado exitosamente en:', domoModel.position);
    clickableObjects.push(domoModel);
  } catch (error) {
    console.error('❌ Error al agregar domo:', error);
  }

  const domo2 = new Domo2();
  let domo2Controller = null;

  try {
    console.log('🚀 Iniciando carga del domo2...');
    const domo2Model = await domo2.loadModel();
    domo2Model.position.set(-20, 12, -20);
    scene.add(domo2Model);
    
    domo2Controller = new Domo2Controller(domo2, terrain, camera, scene, renderer);
    
    console.log('✅ Domo2 agregado exitosamente en:', domo2Model.position);
    clickableObjects.push(domo2Model);
  } catch (error) {
    console.error('❌ Error al agregar domo2:', error);
  }

  // ========================================
  // ✅ UI DAT.GUI (combinada)
  // ========================================
  const gui = new dat.GUI();
  const params = { 
    shape: 'sphere', 
    radius: 1.5, 
    height: 3, 
    crewSize: 4, 
    missionDuration: 30, 
    zones: initialZones,
    timeSpeed: 30,
    // Parámetros del sistema de recursos
    missionYears: 2,
    foodInitial: resources.food.initial,
    waterInitial: resources.water.initial,
    oxygenInitial: resources.oxygen.initial,
    foodPerCrewDay: resources.food.consumptionPerCrewPerDay,
    waterPerCrewDay: resources.water.consumptionPerCrewPerDay,
    oxygenPerCrewDay: resources.oxygen.consumptionPerCrewPerDay
  };

  // ========================================
  // ✅ CONTROLES DOMOS (del compañero)
  // ========================================
  const domoFolder = gui.addFolder('🛸 Control del Domo 1');
  const domoParams = {
    posX: 15,
    posY: 5,
    posZ: 15,
    scale: 2,
    resetPosition: () => {
      domo.setPosition(domoParams.posX, domoParams.posY, domoParams.posZ);
    }
  };
  
  domoFolder.add(domoParams, 'posX', -50, 50, 1).name('Posición X').onChange(val => {
    domo.setPosition(val, domoParams.posY, domoParams.posZ);
  });
  domoFolder.add(domoParams, 'posY', 0, 50, 1).name('Posición Y').onChange(val => {
    domo.setPosition(domoParams.posX, val, domoParams.posZ);
  });
  domoFolder.add(domoParams, 'posZ', -50, 50, 1).name('Posición Z').onChange(val => {
    domo.setPosition(domoParams.posX, domoParams.posY, val);
  });
  domoFolder.add(domoParams, 'scale', 0.5, 5, 0.1).name('Escala').onChange(val => {
    if (domo.model) domo.model.scale.set(val, val, val);
  });
  domoFolder.add(domoParams, 'resetPosition').name('Resetear Posición');
  domoFolder.open();

  const domo2Folder = gui.addFolder('🛸 Control del Domo 2');
  const domo2Params = {
    posX: -20,
    posY: 5,
    posZ: -20,
    scale: 2.5,
    resetPosition: () => {
      domo2.setPosition(domo2Params.posX, domo2Params.posY, domo2Params.posZ);
    }
  };
  
  domo2Folder.add(domo2Params, 'posX', -50, 50, 1).name('Posición X').onChange(val => {
    domo2.setPosition(val, domo2Params.posY, domo2Params.posZ);
  });
  domo2Folder.add(domo2Params, 'posY', 0, 50, 1).name('Posición Y').onChange(val => {
    domo2.setPosition(domo2Params.posX, val, domo2Params.posZ);
  });
  domo2Folder.add(domo2Params, 'posZ', -50, 50, 1).name('Posición Z').onChange(val => {
    domo2.setPosition(domo2Params.posX, domo2Params.posY, val);
  });
  domo2Folder.add(domo2Params, 'scale', 0.5, 5, 0.1).name('Escala').onChange(val => {
    if (domo2.model) domo2.model.scale.set(val, val, val);
  });
  domo2Folder.add(domo2Params, 'resetPosition').name('Resetear Posición');
  domo2Folder.open();

  // ========================================
  // ✅ SISTEMA DE TIEMPO MARCIANO (del compañero)
  // ========================================
  const skyColorsCycle = [
    { name: 'Medianoche', hex: 0x0A0A1A, hour: 0 },
    { name: 'Madrugada', hex: 0x1A1A3A, hour: 3 },
    { name: 'Pre-amanecer', hex: 0x4A3A5A, hour: 6 },
    { name: 'Amanecer', hex: 0xFF7744, hour: 9 },
    { name: 'Mañana', hex: 0xFFAA77, hour: 12 },
    { name: 'Mediodía', hex: 0xFFB380, hour: 15 },
    { name: 'Tarde', hex: 0xFF9966, hour: 18 },
    { name: 'Atardecer', hex: 0xFF6644, hour: 21 }
  ];

  const skyFolder = gui.addFolder('⏰ Tiempo Marciano');
  skyFolder.add(params, 'timeSpeed', 1, 120, 1)
    .name('Velocidad Tiempo (x)')
    .onChange(updateTimeSpeed);
  skyFolder.open();

  const resourcesFolder = gui.addFolder('📊 Simulación de Recursos');
  resourcesFolder.add(params, 'missionYears', 0.5, 10, 0.5).name('Años en Marte').onChange(updateMissionDuration);
  resourcesFolder.add(params, 'crewSize', 1, 20, 1).name('Tripulantes').onChange(resetResources);
  resourcesFolder.add(params, 'foodInitial', 1000, 50000, 100).name('Comida Inicial (kg)').onChange(resetResources);
  resourcesFolder.add(params, 'waterInitial', 1000, 50000, 100).name('Agua Inicial (L)').onChange(resetResources);
  resourcesFolder.add(params, 'oxygenInitial', 1000, 50000, 100).name('Oxígeno Inicial (kg)').onChange(resetResources);
  resourcesFolder.add(params, 'foodPerCrewDay', 0.5, 5, 0.1).name('Comida/Trip/Día (kg)').onChange(resetResources);
  resourcesFolder.add(params, 'waterPerCrewDay', 1, 10, 0.1).name('Agua/Trip/Día (L)').onChange(resetResources);
  resourcesFolder.add(params, 'oxygenPerCrewDay', 0.5, 2, 0.1).name('Oxígeno/Trip/Día (kg)').onChange(resetResources);
  resourcesFolder.add({ resetSimulation: resetResources }, 'resetSimulation').name('Resetear Recursos');
  resourcesFolder.open();

  // ========================================
  // ✅ CONTROLES HÁBITAT (de tu código)
  // ========================================
  gui.add(params, 'shape', ['sphere', 'cylinder', 'inflatable']).name('Forma').onChange(updateHabitat);
  gui.add(params, 'radius', 1, 5, 0.1).name('Radio (m)').onChange(updateHabitat);
  gui.add(params, 'height', 2, 10, 0.1).name('Altura (m)').onChange(updateHabitat);
  gui.add(params, 'crewSize', 1, 10, 1).name('Tripulantes').onChange(checkRules);
  gui.add(params, 'missionDuration', 1, 365, 1).name('Duración (días)').onChange(checkRules);

  const terrainFolder = gui.addFolder('Terreno');
  const scaleParams = { scaleX: 10, scaleY: 10, scaleZ: 10 };
  terrainFolder.add(scaleParams, 'scaleX', 1, 50, 1).name('Escala X').onChange(val => terrain.scale.x = val);
  terrainFolder.add(scaleParams, 'scaleY', 1, 50, 1).name('Escala Y').onChange(val => terrain.scale.y = val);
  terrainFolder.add(scaleParams, 'scaleZ', 1, 50, 1).name('Escala Z').onChange(val => terrain.scale.z = val);
  const rotParams = { rotX: 0, rotY: 0, rotZ: 0 };
  terrainFolder.add(rotParams, 'rotX', -Math.PI, Math.PI, 0.01).name('Rot X').onChange(val => terrain.rotation.x = val);
  terrainFolder.add(rotParams, 'rotY', -Math.PI, Math.PI, 0.01).name('Rot Y').onChange(val => terrain.rotation.y = val);
  terrainFolder.add(rotParams, 'rotZ', -Math.PI, Math.PI, 0.01).name('Rot Z').onChange(val => terrain.rotation.z = val);

  const zonesFolder = gui.addFolder('Zonas Funcionales');
  function refreshZonesFolders() {
    Object.keys(zonesFolder.__folders).forEach(key => {
      zonesFolder.removeFolder(zonesFolder.__folders[key]);
    });

    params.zones.forEach((zone, i) => {
      const zoneFolder = zonesFolder.addFolder(`${zone.type} #${i+1}`);
      zoneFolder.add(zone, 'type', ['Descanso', 'Ejercicio', 'Soporte Vital', 'Alimentos', 'Higiene']).onChange(updateHabitat);
      zoneFolder.add(zone.size, 'x', 0.5, params.radius, 0.1).name('Ancho').onChange(updateHabitat);
      zoneFolder.add(zone.size, 'y', 0.5, params.height, 0.1).name('Alto').onChange(updateHabitat);
      zoneFolder.add(zone.size, 'z', 0.5, params.radius, 0.1).name('Profundo').onChange(updateHabitat);
      zoneFolder.add(zone.position, '0', -params.radius, params.radius, 0.1).name('Pos X').onChange(updateHabitat);
      zoneFolder.add(zone.position, '1', 0, params.height, 0.1).name('Pos Y').onChange(updateHabitat);
      zoneFolder.add(zone.position, '2', -params.radius, params.radius, 0.1).name('Pos Z').onChange(updateHabitat);
    });
  }
  refreshZonesFolders();

  zonesFolder.add({ addZone: () => {
    params.zones.push({ type: 'Nueva', position: [0,0,0], size: {x:1,y:1,z:1}, color: 0xffffff });
    updateHabitat();
    refreshZonesFolders();
  }}, 'addZone').name('Añadir Zona');

  // ========================================
  // ✅ FUNCIONES DEL SISTEMA DE RECURSOS (del compañero)
  // ========================================
  function updateMissionDuration() {
    totalMissionSols = Math.floor(params.missionYears * 365);
    params.missionDuration = totalMissionSols;
    resetResources();
  }

  function resetResources() {
    resources.food.initial = params.foodInitial;
    resources.food.current = params.foodInitial;
    resources.food.consumptionPerCrewPerDay = params.foodPerCrewDay;

    resources.water.initial = params.waterInitial;
    resources.water.current = params.waterInitial;
    resources.water.consumptionPerCrewPerDay = params.waterPerCrewDay;

    resources.oxygen.initial = params.oxygenInitial;
    resources.oxygen.current = params.oxygenInitial;
    resources.oxygen.consumptionPerCrewPerDay = params.oxygenPerCrewDay;

    console.log('Recursos reseteados. Simulación lista.');
    updateResourceDisplay();
  }

  function getPhaseDuration() {
    const realTimeDuration = 180;
    return realTimeDuration / params.timeSpeed;
  }

  function updateTimeSpeed() {
    if (isSkyChanging) {
      stopSkyChange();
      isSkyChanging = true;
      lastTime = Date.now();
      
      const phaseDuration = getPhaseDuration();
      skyChangeInterval = setInterval(() => {
        startNewTransition();
      }, phaseDuration * 1000);
      
      console.log(`Velocidad actualizada a ${params.timeSpeed}x`);
    }
  }

  function startSkyChange() {
    isSkyChanging = true;
    scene.background.setHex(skyColorsCycle[0].hex);
    currentColorIndex = 0;
    marsTime = { hours: 0, minutes: 0, seconds: 0 };
    currentTemperature = -73;
    currentSol = 1;
    
    resetResources();
    
    console.log(`Iniciando simulación de clima de Marte a velocidad ${params.timeSpeed}x`);
    
    lastTime = Date.now();
    startNewTransition();
    
    const phaseDuration = getPhaseDuration();
    skyChangeInterval = setInterval(() => {
      startNewTransition();
    }, phaseDuration * 1000);
  }

  function stopSkyChange() {
    isSkyChanging = false;
    if (skyChangeInterval) {
      clearInterval(skyChangeInterval);
      skyChangeInterval = null;
    }
  }

  function getNextColor() {
    currentColorIndex = (currentColorIndex + 1) % skyColorsCycle.length;
    return skyColorsCycle[currentColorIndex];
  }

  function startNewTransition() {
    currentSkyColor.copy(scene.background);
    const nextColorObj = getNextColor();
    targetSkyColor.setHex(nextColorObj.hex);
    transitionProgress = 0;
    isTransitioning = true;
    lastTime = Date.now();
  }

  function getCurrentColorName() {
    const currentHex = scene.background.getHex();
    const colorObj = skyColorsCycle.find(c => c.hex === currentHex);
    return colorObj ? colorObj.name : 'Transición';
  }

  function smoothStep(t) {
    return t * t * (3 - 2 * t);
  }

  function updateSkyTransition() {
    if (!isSkyChanging) return;
    
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    updateMarsTime(deltaTime);
    
    if (isTransitioning) {
      const phaseDuration = getPhaseDuration();
      transitionProgress += deltaTime / phaseDuration;
      
      if (transitionProgress > 1.0) {
        transitionProgress = 1.0;
      }
      
      const smoothProgress = smoothStep(transitionProgress);
      scene.background.lerpColors(currentSkyColor, targetSkyColor, smoothProgress);
      
      if (transitionProgress >= 1.0) {
        isTransitioning = false;
      }
    }
    
    updateTimerDisplay();
    updateResourceDisplay();
  }

  function updateMarsTime(deltaTime) {
    const totalSecondsForFullCycle = getPhaseDuration() * skyColorsCycle.length;
    const marsHoursPerSecond = 24 / totalSecondsForFullCycle;
    const marsSecondsPerSecond = marsHoursPerSecond * 3600;
    
    const deltaMarsSeconds = marsSecondsPerSecond * deltaTime;
    marsTime.seconds += deltaMarsSeconds;
    
    if (marsTime.seconds >= 60) {
      marsTime.minutes += Math.floor(marsTime.seconds / 60);
      marsTime.seconds = marsTime.seconds % 60;
    }
    
    if (marsTime.minutes >= 60) {
      marsTime.hours += Math.floor(marsTime.minutes / 60);
      marsTime.minutes = marsTime.minutes % 60;
    }
    
    if (marsTime.hours >= 24) {
      const daysPassed = Math.floor(marsTime.hours / 24);
      currentSol += daysPassed;
      marsTime.hours = marsTime.hours % 24;
      
      consumeResources(daysPassed);
    }
    
    updateMarsTemperature();
  }

  function consumeResources(daysPassed) {
    const dailyConsumption = params.crewSize * daysPassed;
    
    resources.food.current -= dailyConsumption * resources.food.consumptionPerCrewPerDay;
    resources.water.current -= dailyConsumption * resources.water.consumptionPerCrewPerDay;
    resources.oxygen.current -= dailyConsumption * resources.oxygen.consumptionPerCrewPerDay;
    
    resources.food.current = Math.max(0, resources.food.current);
    resources.water.current = Math.max(0, resources.water.current);
    resources.oxygen.current = Math.max(0, resources.oxygen.current);
    
    if (resources.food.current === 0 || resources.water.current === 0 || resources.oxygen.current === 0) {
      console.warn('¡Recursos agotados! Simulación crítica.');
    }
    
    if (currentSol >= totalMissionSols) {
      console.log('Misión completada.');
      stopSkyChange();
    }
  }

  function updateMarsTemperature() {
    const hour = marsTime.hours;
    
    const temperatureCurve = [
      { hour: 0, temp: -90 },
      { hour: 3, temp: -95 },
      { hour: 6, temp: -85 },
      { hour: 9, temp: -40 },
      { hour: 12, temp: -5 },
      { hour: 15, temp: 0 },
      { hour: 18, temp: -30 },
      { hour: 21, temp: -65 },
      { hour: 24, temp: -90 }
    ];
    
    let lowerPoint = temperatureCurve[0];
    let upperPoint = temperatureCurve[1];
    
    for (let i = 0; i < temperatureCurve.length - 1; i++) {
      if (hour >= temperatureCurve[i].hour && hour < temperatureCurve[i + 1].hour) {
        lowerPoint = temperatureCurve[i];
        upperPoint = temperatureCurve[i + 1];
        break;
      }
    }
    
    const hourRange = upperPoint.hour - lowerPoint.hour;
    const tempRange = upperPoint.temp - lowerPoint.temp;
    const hourProgress = (hour - lowerPoint.hour) / hourRange;
    
    currentTemperature = lowerPoint.temp + (tempRange * hourProgress);
    
    const variation = (Math.random() - 0.5) * 4;
    currentTemperature += variation;
  }

  function getTemperatureColor(temp) {
    if (temp < -80) return '#4A90E2';
    if (temp < -50) return '#6BA3E8';
    if (temp < -20) return '#87CEEB';
    if (temp < 0) return '#FFB347';
    return '#FF6B6B';
  }

  function getTemperatureIcon(temp) {
    if (temp < -80) return '🥶';
    if (temp < -50) return '❄';
    if (temp < -20) return '🌡';
    if (temp < 0) return '🌤';
    return '🌡';
  }

  function formatMarsTime() {
    const h = Math.floor(marsTime.hours).toString().padStart(2, '0');
    const m = Math.floor(marsTime.minutes).toString().padStart(2, '0');
    const s = Math.floor(marsTime.seconds).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function updateTimerDisplay() {
    if (isSkyChanging) {
      const currentName = getCurrentColorName();
      const timeStr = formatMarsTime();
      
      let icon = '🌙';
      const hour = Math.floor(marsTime.hours);
      if (hour >= 0 && hour < 6) icon = '🌙';
      else if (hour >= 6 && hour < 9) icon = '🌅';
      else if (hour >= 9 && hour < 12) icon = '🌄';
      else if (hour >= 12 && hour < 18) icon = '☀';
      else if (hour >= 18 && hour < 21) icon = '🌆';
      else icon = '🌙';
      
      const tempColor = getTemperatureColor(currentTemperature);
      const tempIcon = getTemperatureIcon(currentTemperature);
      const tempFormatted = currentTemperature.toFixed(1);
      
      skyTimerDisplay.innerHTML = `
        <div style="border-bottom: 2px solid #FFB380; padding-bottom: 10px; margin-bottom: 10px;">
          <strong style="font-size: 18px;">${icon} Marte - Sol ${currentSol}</strong>
        </div>
        
        <div style="margin-bottom: 8px;">
          <strong style="font-size: 22px; color: #FFB380;">⏰ ${timeStr}</strong>
        </div>
        
        <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 5px; margin-bottom: 8px;">
          <strong style="font-size: 16px;">${tempIcon} Temperatura:</strong><br>
          <span style="font-size: 28px; color: ${tempColor}; font-weight: bold;">${tempFormatted}°C</span>
        </div>
        
        <div style="font-size: 12px; opacity: 0.9;">
          <strong>Fase:</strong> ${currentName}<br>
          <strong>Velocidad:</strong> ${params.timeSpeed}x
        </div>
      `;
    } else {
      skyTimerDisplay.innerHTML = 'Simulación pausada. Inicie desde el panel de recursos.';
    }
  }

  function updateResourceDisplay() {
    if (isSkyChanging) {
      let html = `
        <div style="border-bottom: 2px solid #FFB380; padding-bottom: 10px; margin-bottom: 10px;">
          <strong style="font-size: 18px;">📊 Recursos - Misión: ${params.missionYears} años</strong>
        </div>
        
        <div style="margin-bottom: 8px;">
          <strong>Tripulantes:</strong> ${params.crewSize}<br>
          <strong>Soles restantes:</strong> ${Math.max(0, totalMissionSols - currentSol)} / ${totalMissionSols}
        </div>
        
        <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 5px; margin-bottom: 8px;">
          <strong>🍲 Comida:</strong> ${resources.food.current.toFixed(0)} / ${resources.food.initial} ${resources.food.unit}<br>
          <progress value="${resources.food.current}" max="${resources.food.initial}" style="width: 100%;"></progress>
        </div>
        
        <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 5px; margin-bottom: 8px;">
          <strong>💧 Agua:</strong> ${resources.water.current.toFixed(0)} / ${resources.water.initial} ${resources.water.unit}<br>
          <progress value="${resources.water.current}" max="${resources.water.initial}" style="width: 100%;"></progress>
        </div>
        
        <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 5px;">
          <strong>🌬 Oxígeno:</strong> ${resources.oxygen.current.toFixed(0)} / ${resources.oxygen.initial} ${resources.oxygen.unit}<br>
          <progress value="${resources.oxygen.current}" max="${resources.oxygen.initial}" style="width: 100%;"></progress>
        </div>
      `;
      
      resourcePanel.innerHTML = html;
    }
  }

  // ========================================
  // ✅ FUNCIONES HÁBITAT (de tu código)
  // ========================================
  async function updateHabitat() {
    scene.remove(habitat);
    try {
      habitat = await createHabitat(params.shape, params.radius, params.height, params.zones);
      habitat.position.set(0, 5, 0);
      scene.add(habitat);
      
      clickableObjects.splice(0, clickableObjects.length, habitat);
      habitat.children.forEach(child => clickableObjects.push(child));
      
      checkRules();
      refreshZonesFolders();
    } catch (error) {
      console.error('Error actualizando hábitat:', error);
    }
  }

  function checkRules() {
    if (!habitat || !habitat.userData) return;
    
    const minVolumePerCrew = 25 * params.missionDuration / 30;
    const requiredVolume = params.crewSize * minVolumePerCrew;
    const status = habitat.userData.volume >= requiredVolume ? 'Verde: Adecuado' : 'Rojo: Insuficiente';
    habitat.userData.info = `Hábitat ${params.shape} con volumen total ${habitat.userData.volume.toFixed(2)} m³.\nEstado: ${status} (Requerido: ${requiredVolume.toFixed(2)} m³)`;
    
    if (habitat.children[0] && habitat.children[0].material) {
      habitat.children[0].material.color.set(status.startsWith('Verde') ? 0x00aaff : 0xff0000);
    }

    const minZoneVols = {
      'Descanso': 10 * params.crewSize,
      'Ejercicio': 5 * params.crewSize,
      'Soporte Vital': 15 * (params.missionDuration / 30),
      'Alimentos': 8 * params.crewSize,
      'Higiene': 4 * params.crewSize
    };
    
    habitat.children.slice(1).forEach((zone, i) => {
      if (zone.material && zone.userData) {
        const type = params.zones[i].type;
        const req = minZoneVols[type] || 0;
        const zStatus = zone.userData.volume >= req ? 'Verde: Adecuado' : 'Rojo: Insuficiente';
        zone.userData.info = `Zona: ${type}. Volumen: ${zone.userData.volume.toFixed(2)} m³.\nEstado: ${zStatus} (Requerido: ${req.toFixed(2)} m³)`;
        zone.material.color.set(zStatus.startsWith('Verde') ? params.zones[i].color : 0xff0000);
      }
    });
  }

  // ========================================
  // ✅ EVENTOS (del compañero)
  // ========================================
  document.getElementById('startSimulation').addEventListener('click', () => {
    params.missionYears = parseFloat(document.getElementById('missionYears').value) || 2;
    params.crewSize = parseInt(document.getElementById('crewSize').value) || 4;
    params.foodInitial = parseFloat(document.getElementById('foodInitial').value) || 10000;
    params.waterInitial = parseFloat(document.getElementById('waterInitial').value) || 20000;
    params.oxygenInitial = parseFloat(document.getElementById('oxygenInitial').value) || 5000;
    params.foodPerCrewDay = parseFloat(document.getElementById('foodPerCrewDay').value) || 2;
    params.waterPerCrewDay = parseFloat(document.getElementById('waterPerCrewDay').value) || 4;
    params.oxygenPerCrewDay = parseFloat(document.getElementById('oxygenPerCrewDay').value) || 1;

    updateMissionDuration();
    resetResources();
    startSkyChange();
  });

  // ========================================
  // ✅ LOOP DE ANIMACIÓN (combinado)
  // ========================================
  function animateScene() {
    requestAnimationFrame(animateScene);
    
    const deltaTime = clock.getDelta();
    
    // Actualizar sistema de tiempo marciano
    updateSkyTransition();
    
    // Actualizar rover (de tu código)
    if (rover && rover.update) {
      rover.update(deltaTime, terrain);
    }
    
    // Actualizar domos (del compañero)
    if (domoController) {
      domoController.update(deltaTime);
    }
    
    if (domo2Controller) {
      domo2Controller.update(deltaTime);
    }
    
    // Renderizar
    renderer.render(scene, camera);
  }
  animateScene();

  // Inicializaciones
  updateTimerDisplay();
  checkRules();

  // Retorno con todas las propiedades
  return { 
    scene, 
    camera, 
    clickableObjects, 
    terrain,
    domo,
    domo2,
    rover, // Añadido para que main.js pueda acceder al rover
    cleanup: () => {
      stopSkyChange();
      if (skyTimerDisplay.parentNode) {
        skyTimerDisplay.parentNode.removeChild(skyTimerDisplay);
      }
      if (resourcePanel.parentNode) {
        resourcePanel.parentNode.removeChild(resourcePanel);
      }
    }
  };
}