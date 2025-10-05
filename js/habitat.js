import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HabitatLoader } from './habitatLoader.js';

const habitatLoader = new HabitatLoader();
const zoneLoader = new GLTFLoader();

export async function createHabitat(shape = 'sphere', radius = 1.5, height = 3, zones = []) {
    const habitatGroup = new THREE.Group();
    
    // Cargar modelo GLB
    const habitatModel = await habitatLoader.loadHabitatModel(shape);
    
    // Calcular volumen según la forma
    let volume = 0;
    if (shape === 'sphere') {
        volume = (4 / 3) * Math.PI * Math.pow(radius, 3);
    } else if (shape === 'cylinder') {
        volume = Math.PI * Math.pow(radius, 2) * height;
    } else if (shape === 'inflatable') {
        volume = 2 * Math.PI * Math.pow(height / 4, 2) * radius;
    }

    // Configurar el modelo cargado
    habitatModel.scale.set(radius, shape === 'sphere' ? radius : height, radius);
    
    // Configurar materiales y sombras del hábitat
    habitatModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Aplicar material transparente si es el hábitat principal
            if (child.material && !child.userData.isZone) {
                child.material.transparent = true;
                child.material.opacity = 0.7;
            }
        }
    });

    habitatGroup.add(habitatModel);

    // Crear zonas funcionales (FUERA del hábitat para mejor visibilidad)
    await createZones(habitatGroup, shape, radius, height, zones);

    // Posicionar el hábitat
    habitatGroup.position.set(0, shape === 'sphere' ? radius : height / 2, 0);
    
    // Datos del usuario
    habitatGroup.userData = {
        info: `Hábitat ${shape} con volumen total ${volume.toFixed(2)} m³.`,
        volume: volume,
        shape: shape,
        radius: radius,
        height: height,
        zones: zones
    };

    return habitatGroup;
}

async function createZones(habitatGroup, shape, radius, height, zones) {
    // Rutas CORREGIDAS de modelos de zona
    const zoneModels = {
        'Descanso': './models/z_descanso.glb',
        'Ejercicio': './models/z_ejercicio.glb',
        'Soporte Vital': './models/z_svit.glb',
        'Alimentos': './models/z_comida.glb',
        'Higiene': './models/z_hig.glb'
    };

    // ESCALAS INDIVIDUALES POR TIPO DE ZONA
    const zoneScaleFactors = {
        'Descanso': 1.3,
        'Ejercicio': 0.01,
        'Soporte Vital': 1.5,
        'Alimentos': 0.03,
        'Higiene': 0.04
    };

    for (const zone of zones) {
        let zoneMesh;
        let zoneLoaded = false;
        
        try {
            const zoneModelPath = zoneModels[zone.type];
            if (zoneModelPath) {
                const gltf = await zoneLoader.loadAsync(zoneModelPath);
                zoneMesh = gltf.scene;
                
                // Escala específica para cada tipo
                const scaleFactor = zoneScaleFactors[zone.type] || 2.5;
                zoneMesh.scale.set(
                    zone.size.x * scaleFactor, 
                    zone.size.y * scaleFactor, 
                    zone.size.z * scaleFactor
                );
                
                zoneLoaded = true;
                console.log(`✅ Zona ${zone.type} - Escala: ${scaleFactor}`);
            }
        } catch (error) {
            console.warn(`❌ No se pudo cargar modelo para zona ${zone.type}:`, error);
        }

        // Fallback a geometría básica si no se cargó el modelo
        if (!zoneLoaded) {
            const zoneGeo = new THREE.BoxGeometry(zone.size.x, zone.size.y, zone.size.z);
            const zoneMat = new THREE.MeshPhongMaterial({ 
                color: zone.color, 
                transparent: true, 
                opacity: 0.8 // Más opaco para mejor visibilidad
            });
            zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
            console.log(`📦 Usando geometría básica para zona ${zone.type}`);
        }

        // POSICIONAR LAS ZONAS FUERA del hábitat para mejor visibilidad
        // Ajustar posición para que estén alrededor del hábitat, no dentro
        const zonePosition = new THREE.Vector3(...zone.position);
        
        // Si la posición es muy cercana al centro, moverla hacia afuera
        if (zonePosition.length() < radius * 0.5) {
            zonePosition.normalize().multiplyScalar(radius * 1.2);
        }
        
        zoneMesh.position.copy(zonePosition);
        
        // Configurar la zona
        zoneMesh.userData = {
            type: zone.type,
            volume: zone.size.x * zone.size.y * zone.size.z,
            info: `Zona: ${zone.type}. Volumen: ${(zone.size.x * zone.size.y * zone.size.z).toFixed(2)} m³.`,
            isZone: true
        };

        // Configurar sombras - hacerlas más visibles
        zoneMesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Hacer las zonas más visibles
                if (child.material && !zoneLoaded) { // Solo para fallbacks
                    child.material.transparent = true;
                    child.material.opacity = 0.8;
                }
            }
        });

        habitatGroup.add(zoneMesh);
    }
}

// Función DEBUG para verificar qué se está cargando
export function debugHabitat(habitatGroup) {
    console.log('🔍 DEBUG Hábitat:');
    console.log('- Total children:', habitatGroup.children.length);
    
    habitatGroup.children.forEach((child, index) => {
        console.log(`  ${index}:`, child.name || 'sin nombre', 
                  'type:', child.type,
                  'position:', child.position,
                  'scale:', child.scale);
        
        if (child.userData && child.userData.isZone) {
            console.log(`    📍 ZONA: ${child.userData.type}`);
        }
    });
}

// Función para actualizar hábitat existente
export async function updateHabitat(habitatGroup, newShape, newRadius, newHeight, newZones) {
    // Remover modelo antiguo
    while(habitatGroup.children.length > 0) { 
        habitatGroup.remove(habitatGroup.children[0]); 
    }

    // Crear nuevo modelo
    const newModel = await createHabitat(newShape, newRadius, newHeight, newZones);
    
    // Copiar propiedades
    habitatGroup.add(...newModel.children);
    habitatGroup.userData = newModel.userData;
    habitatGroup.position.copy(newModel.position);

    // DEBUG: Verificar el nuevo hábitat
    debugHabitat(habitatGroup);

    return habitatGroup;
}