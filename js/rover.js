import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Rover {
    constructor() {
        this.model = null;
        this.mixer = null;
        this.animations = new Map();
        
        // Sistema de movimiento aleatorio
        this.speed = 0.02;
        this.rotationSpeed = 0.02;
        this.moveDistance = 0;
        this.maxMoveDistance = 50;
        this.rotationAngle = 0;
        
        // Estados y objetivos
        this.isMoving = false;
        this.targetPosition = new THREE.Vector3();
        this.targetRotation = 0;
        
        // Para colisiones con el terreno
        this.raycaster = new THREE.Raycaster();
        this.groundHeight = 0;
    }

    async loadModel() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            
            loader.load(
                './public/models/rover.glb', 
                (gltf) => {
                    this.model = gltf.scene;
                    this.model.scale.set(0.8, 0.8, 0.8);
                    
                    // Configurar el modelo
                    this.model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    // Sistema de animaciones
                    this.mixer = new THREE.AnimationMixer(this.model);
                    
                    if (gltf.animations.length > 0) {
                        gltf.animations.forEach((clip) => {
                            const action = this.mixer.clipAction(clip);
                            this.animations.set(clip.name, action);
                        });
                        this.setupAnimations();
                    }

                    this.model.userData = {
                        info: "Rover explorador - Estudia la superficie marciana",
                        type: "rover",
                        speed: this.speed
                    };

                    // Iniciar movimiento aleatorio
                    this.setNewRandomTarget();
                    
                    resolve(this.model);
                },
                undefined,
                (error) => {
                    console.error('Error loading rover model:', error);
                    // Crear rover básico temporal
                    this.createBasicRover();
                    resolve(this.model);
                }
            );
        });
    }

    setupAnimations() {
        // Buscar animaciones comunes
        const idleAnim = this.findAnimation(['Idle', 'idle']);
        const moveAnim = this.findAnimation(['Move', 'move', 'Drive', 'drive']);
        
        this.animations.set('idle', idleAnim);
        this.animations.set('move', moveAnim);

        if (idleAnim) {
            idleAnim.play();
        }
    }

    findAnimation(names) {
        for (let name of names) {
            const anim = this.animations.get(name);
            if (anim) return anim;
        }
        return this.animations.values().next().value;
    }

    playAnimation(name, fadeDuration = 0.3) {
        const newAction = this.animations.get(name);
        if (!newAction) return;

        const currentAction = this.animations.get(this.isMoving ? 'move' : 'idle');
        if (currentAction) {
            currentAction.fadeOut(fadeDuration);
        }

        newAction.reset().fadeIn(fadeDuration).play();
    }

    createBasicRover() {
        const group = new THREE.Group();

        // Cuerpo del rover (mejorado)
        const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 1.2);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x666666, shininess: 80 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.8;
        group.add(body);

        // Ruedas (mejoradas)
        const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16);
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });

        const positions = [
            [-0.9, 0.3, 0.6],   // Delantera izquierda
            [0.9, 0.3, 0.6],    // Delantera derecha
            [-0.9, 0.3, -0.6],  // Trasera izquierda
            [0.9, 0.3, -0.6],   // Trasera derecha
        ];

        positions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(...pos);
            group.add(wheel);
        });

        // Antena
        const antennaGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
        const antennaMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444 });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.set(0, 1.5, -0.3);
        group.add(antenna);

        group.userData = {
            info: "Rover explorador - Estudia la superficie marciana",
            type: "rover",
            speed: this.speed
        };

        this.model = group;
        return group;
    }

    setNewRandomTarget() {
        if (!this.model) return;

        // Generar nueva posición objetivo aleatoria
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 30; // Entre 10 y 40 unidades
        
        this.targetPosition.set(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
        );

        // Calcular rotación hacia el objetivo
        const direction = new THREE.Vector3()
            .subVectors(this.targetPosition, this.model.position)
            .normalize();
        
        this.targetRotation = Math.atan2(direction.x, direction.z);
        
        // Reiniciar contadores
        this.moveDistance = 0;
        this.isMoving = true;
        
        // Reproducir animación de movimiento
        this.playAnimation('move');
        
        console.log(`🎯 Rover: Nuevo objetivo en (${this.targetPosition.x.toFixed(1)}, ${this.targetPosition.z.toFixed(1)})`);
    }

    update(deltaTime, terrain) {
        if (!this.model || !this.isMoving) return;

        // Actualizar animaciones
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }

        // Rotar suavemente hacia el objetivo
        const currentRotation = this.model.rotation.y;
        this.model.rotation.y = THREE.MathUtils.lerp(
            currentRotation, 
            this.targetRotation, 
            this.rotationSpeed
        );

        // Mover hacia adelante
        const moveStep = new THREE.Vector3(0, 0, this.speed)
            .applyQuaternion(this.model.quaternion);
        
        this.model.position.add(moveStep);
        this.moveDistance += this.speed;

        // Mantener el rover en el terreno
        this.adjustToTerrain(terrain);

        // Verificar si llegó al objetivo o se movió suficiente distancia
        const distanceToTarget = this.model.position.distanceTo(this.targetPosition);
        
        if (distanceToTarget < 2 || this.moveDistance >= this.maxMoveDistance) {
            // Pausa antes de nuevo movimiento
            this.isMoving = false;
            this.playAnimation('idle');
            
            setTimeout(() => {
                this.setNewRandomTarget();
            }, 2000 + Math.random() * 3000); // Espera 2-5 segundos
        }

        // Rotar ruedas si es el modelo básico
        this.rotateWheels();
    }

    adjustToTerrain(terrain) {
        if (!terrain) return;

        // Lanzar rayo hacia abajo para detectar altura del terreno
        const position = this.model.position.clone();
        position.y += 5; // Empezar desde arriba

        this.raycaster.set(position, new THREE.Vector3(0, -1, 0));
        const intersects = this.raycaster.intersectObject(terrain, true);

        if (intersects.length > 0) {
            this.groundHeight = intersects[0].point.y;
            this.model.position.y = this.groundHeight + 0.8; // Altura del rover
        }
    }

    rotateWheels() {
        // Rotar ruedas para efecto visual (solo para modelo básico)
        if (!this.mixer && this.model) {
            this.model.traverse((child) => {
                if (child.isMesh && child.position.y < 0.5) { // Probablemente una rueda
                    child.rotation.x += this.speed * 10; // Rotación proporcional a la velocidad
                }
            });
        }
    }

    setPosition(x, y, z) {
        if (this.model) {
            this.model.position.set(x, y, z);
            this.setNewRandomTarget(); // Nuevo objetivo desde nueva posición
        }
    }

    getPosition() {
        return this.model ? this.model.position : new THREE.Vector3();
    }

    getModel() {
        return this.model;
    }
}

// Función de compatibilidad hacia atrás
export function createRover() {
    const rover = new Rover();
    rover.createBasicRover();
    return rover.getModel();
}