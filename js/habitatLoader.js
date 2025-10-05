import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const habitatModels = {
    sphere: './models/hab_1.glb',
    cylinder: './models/hab_2.glb',
    inflatable: './models/hab_3.glb'
};

export class HabitatLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.cache = new Map();
    }

    async loadHabitatModel(shape) {
        // Si ya está en caché, devolverlo
        if (this.cache.has(shape)) {
            return this.cloneModel(this.cache.get(shape));
        }

        const modelPath = habitatModels[shape];
        if (!modelPath) {
            console.warn(`Modelo no encontrado para forma: ${shape}, usando geometría básica`);
            return this.createBasicHabitat(shape);
        }

        try {
            const gltf = await this.loader.loadAsync(modelPath);
            const model = gltf.scene;
            
            // REESCALADO DE HÁBITATS - AJUSTA ESTE VALOR
            const HABITAT_SCALE_FACTOR = 1.2; // ← Para hábitats principales
            model.scale.set(HABITAT_SCALE_FACTOR, HABITAT_SCALE_FACTOR, HABITAT_SCALE_FACTOR);
            
            this.cache.set(shape, model);
            return this.cloneModel(model);
        } catch (error) {
            console.error(`Error cargando modelo para ${shape}:`, error);
            return this.createBasicHabitat(shape);
        }
    }

    cloneModel(model) {
        return model.clone();
    }

    createBasicHabitat(shape) {
        // Fallback a geometrías básicas si no hay modelos GLB
        let geometry;
        let volume = 0;

        if (shape === 'sphere') {
            geometry = new THREE.SphereGeometry(1.5, 32, 32);
            volume = (4 / 3) * Math.PI * Math.pow(1.5, 3);
        } else if (shape === 'cylinder') {
            geometry = new THREE.CylinderGeometry(1.5, 1.5, 3, 32);
            volume = Math.PI * Math.pow(1.5, 2) * 3;
        } else if (shape === 'inflatable') {
            geometry = new THREE.TorusGeometry(1.5, 0.75, 16, 100);
            volume = 2 * Math.PI * Math.pow(0.75, 2) * 1.5;
        }

        const material = new THREE.MeshPhongMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.7,
            shininess: 100
        });

        const mesh = new THREE.Mesh(geometry, material);
        const group = new THREE.Group();
        group.add(mesh);

        return group;
    }
}