import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createScene } from './scene.js';
import { setupControls } from './controls.js';
import { Astronaut, AstronautController } from './astronaut.js';
import { Rover } from './rover.js';
import { AudioManager } from './audioManager.js'; // NUEVO IMPORT

// NUEVO: Manager de audio global
const audioManager = new AudioManager();

async function init() {
    // NUEVO: Mostrar controles de audio
    createAudioControls();
    
    const canvas = document.querySelector('#bg');
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const { scene, camera, clickableObjects, terrain, rover } = await createScene(renderer);
    
    // NUEVO: Iniciar sonidos ambientales
    audioManager.playBackgroundMusic();
    audioManager.playMarsWind();
    
    // Crear astronauta con modelo GLB
    const astronaut = new Astronaut();
    const astronautModel = await astronaut.loadModel();
    scene.add(astronautModel);
    clickableObjects.push(astronautModel);

    // Inicializar controlador del astronauta
    const astronautController = new AstronautController(astronaut, terrain, camera, scene);
    astronaut.setPosition(0, 10, 5);

    // NUEVO: Sonidos del astronauta
    let footstepsSound = null;
    let isMoving = false;

    const orbitControls = setupControls(camera, renderer);

    // Detectar clicks (solo en modo libre)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const infoBox = document.getElementById('infoBox');

    window.addEventListener('click', (event) => {
        if (astronautController.getCurrentCameraMode() !== 'free') return;
        
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(clickableObjects, true);

        if (intersects.length > 0) {
            const obj = intersects[0].object;
            let infoText = obj.userData.info || 'Sin información';
            if (obj.userData.volume) {
                infoText += `\nVolumen: ${obj.userData.volume.toFixed(2)} m³`;
            }
            // Sonido al interactuar
            audioManager.playInterfaceClick();
            showTemporaryInfo(infoText, 3000);
        }
    });

    // Función para mostrar información temporal
    function showTemporaryInfo(text, duration) {
        infoBox.style.background = 'rgba(0, 100, 0, 0.8)';
        infoBox.innerHTML = text;
        
        setTimeout(() => {
            updateInstructions();
        }, duration);
    }

    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Actualizar instrucciones en pantalla
    const updateInstructions = () => {
        const mode = astronautController.getCurrentCameraMode();
        const modeNames = {
            'follow': 'Seguimiento con Zoom',
            'free': 'Libre'
        };
        const modeName = modeNames[mode] || mode;
        
        let zoomInfo = { distance: '0', percentage: '0' };
        if (astronautController.getZoomInfo) {
            zoomInfo = astronautController.getZoomInfo();
        }
        
        infoBox.style.background = 'rgba(0, 0, 0, 0.7)';
        infoBox.innerHTML = `
            <strong>Modo: ${modeName}</strong><br>
            Zoom: ${zoomInfo.distance}m (${zoomInfo.percentage}%)<br>
            Rueda Mouse: Acercar/Alejar<br>
            WASD: Movimiento astronauta<br>
            Espacio: Saltar<br>
            C: Cambiar modo cámara<br>
            M: Silenciar sonido
        `;
    };

    // NUEVO: Controles de teclado para audio
    window.addEventListener('keydown', (event) => {
        if (event.code === 'KeyM') {
            const soundEnabled = audioManager.toggleSound();
            updateAudioButton(soundEnabled);
        }
    });

    console.log("=== CONTROLES ===");
    console.log("WASD/Flechas: Movimiento del astronauta");
    console.log("Espacio: Saltar");
    console.log("Rueda del Mouse: Zoom (acercar/alejar)");
    console.log("C: Cambiar entre modo seguimiento y libre");
    console.log("M: Silenciar/Activar sonido");

    const clock = new THREE.Clock();
    
    function animate() {
        requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        
        // Actualizar astronauta y detectar movimiento para sonidos
        const wasMoving = isMoving;
        astronautController.update(delta);
        
        // NUEVO: Control de sonidos de pasos
        const currentMoving = astronaut.model?.userData?.isMoving || false;
        if (currentMoving && !wasMoving) {
            // Empezó a moverse
            footstepsSound = audioManager.playFootsteps();
            isMoving = true;
        } else if (!currentMoving && wasMoving) {
            // Se detuvo
            audioManager.stopFootsteps();
            isMoving = false;
        }
        
        // Actualizar rover
        if (rover && rover.update) {
            rover.update(delta, terrain);
        }
        
        const useOrbit = astronautController.getUseOrbitControls();
        orbitControls.enabled = useOrbit;
        
        if (useOrbit) {
            orbitControls.update();
        }
        
        updateInstructions();
        
        renderer.render(scene, camera);
    }
    
    updateInstructions();
    animate();
}

// NUEVO: Crear controles de audio en la UI
function createAudioControls() {
    const audioControls = document.createElement('div');
    audioControls.id = 'audioControls';
    audioControls.style.position = 'absolute';
    audioControls.style.top = '10px';
    audioControls.style.right = '10px';
    audioControls.style.zIndex = '1000';
    audioControls.style.background = 'rgba(0,0,0,0.8)';
    audioControls.style.padding = '10px';
    audioControls.style.borderRadius = '8px';
    audioControls.style.color = 'white';
    audioControls.style.fontFamily = 'Arial, sans-serif';
    audioControls.style.fontSize = '12px';
    
    document.body.appendChild(audioControls);
    
    // Event listeners para controles de audio
    document.getElementById('toggleSound').addEventListener('click', () => {
        const soundEnabled = audioManager.toggleSound();
        updateAudioButton(soundEnabled);
    });
    
    document.getElementById('volumeSlider').addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        audioManager.setGlobalVolume(volume);
    });
}

// NUEVO: Actualizar botón de audio
function updateAudioButton(soundEnabled) {
    const button = document.getElementById('toggleSound');
    if (soundEnabled) {
        button.textContent = 'Silenciar';
        button.style.background = '#FFB380';
    } else {
        button.textContent = 'Activar Sonido';
        button.style.background = '#666';
    }
}

// NUEVO: Limpiar audio al cerrar
/*window.addEventListener('beforeunload', () => {
    audioManager.cleanup();
});*/

init();