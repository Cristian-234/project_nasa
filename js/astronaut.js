import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Astronaut {
    constructor() {
        this.model = null;
        this.mixer = null;
        this.animations = new Map();
        this.currentAction = null;
        
        // Sistema de movimiento mejorado
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.isOnGround = true;
        this.gravity = -0.005;
        this.jumpForce = 0.06;
        
        // Control de movimiento suave
        this.moveSpeed = 0.06;
        this.acceleration = 0.2;
        this.deceleration = 0.4;
        
        this.keys = {};
        this.setupControls();
    }

    async loadModel() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            
            loader.load(
                './models/astronauta.glb',
                (gltf) => {
                    this.model = gltf.scene;
                    this.model.scale.set(0.8, 0.8, 0.8);
                    
                    // Dentro de loader.load(), después de this.model = gltf.scene;
                    this.model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            // Asegurar que el material tenga color
                            if (child.material) {
                                // Si el material no tiene color, asignarle uno
                                if (!child.material.color) {
                                    child.material = new THREE.MeshPhongMaterial({
                                        color: 0xffffff,  // Color blanco por defecto
                                        shininess: 30
                                    });
                                } else {
                                    // Asegurar que el material sea Phong para mejor iluminación
                                    child.material = new THREE.MeshPhongMaterial({
                                        color: child.material.color,
                                        map: child.material.map,
                                        shininess: 30
                                    });
                                }
                            }
                        }
                    });

                    // Sistema de animaciones principal
                    this.mixer = new THREE.AnimationMixer(this.model);
                    
                    if (gltf.animations.length > 0) {
                        gltf.animations.forEach((clip) => {
                            const action = this.mixer.clipAction(clip);
                            this.animations.set(clip.name, action);
                        });
                        
                        this.setupAnimations();
                    } else {
                        // Si no hay animaciones, crear movimiento básico
                        this.setupBasicMovement();
                    }

                    this.model.userData = {
                        info: "Astronauta - Miembro de la tripulación marciana",
                        type: "astronaut",
                        speed: this.moveSpeed,
                        isMoving: false
                    };

                    resolve(this.model);
                },
                undefined,
                (error) => {
                    console.error('Error loading astronaut model:', error);
                    // Crear modelo básico temporal
                    this.createBasicAstronaut();
                    resolve(this.model);
                }
            );
        });
    }

    setupAnimations() {
        // Buscar animaciones específicas
        const idleAnim = this.findAnimation(['Idle', 'idle', 'T-Pose', 't-pose']);
        const walkAnim = this.findAnimation(['Walk', 'walk', 'Running', 'running']);
        const jumpAnim = this.findAnimation(['Jump', 'jump']);
        
        this.animations.set('idle', idleAnim);
        this.animations.set('walk', walkAnim);
        this.animations.set('jump', jumpAnim);

        // Iniciar con animación idle
        if (idleAnim) {
            idleAnim.play();
            this.currentAction = idleAnim;
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
        
        if (!newAction || this.currentAction === newAction) return;

        if (this.currentAction) {
            this.currentAction.fadeOut(fadeDuration);
        }

        newAction.reset().fadeIn(fadeDuration).play();
        this.currentAction = newAction;
    }

    setupBasicMovement() {
        // Sistema para animar solo brazos y piernas al caminar
        this.basicAnimation = {
            time: 0,
            walkCycle: 0,
            isMoving: false,
            
            update: (delta, isMoving) => {
                this.basicAnimation.time += delta;
                this.basicAnimation.isMoving = isMoving;
                
                if (isMoving) {
                    // Incrementar ciclo de caminata
                    this.basicAnimation.walkCycle += delta * 10;
                    
                    // ANIMAR SOLO BRAZOS Y PIERNAS
                    this.model.traverse((child) => {
                        // Brazos - movimiento opuesto
                        if (child.name.includes('Arm') || child.name.includes('arm')) {
                            const armSide = child.name.includes('Left') || child.name.includes('left') ? 1 : -1;
                            child.rotation.x = Math.sin(this.basicAnimation.walkCycle) * 0.4 * armSide;
                        }
                        
                        // Piernas - movimiento alternado
                        if (child.name.includes('Leg') || child.name.includes('leg')) {
                            const legSide = child.name.includes('Left') || child.name.includes('left') ? 0 : Math.PI;
                            child.rotation.x = Math.sin(this.basicAnimation.walkCycle + legSide) * 0.6;
                        }
                    });
                } else {
                    // IDLE - solo ligero movimiento de brazos (respiración)
                    this.model.traverse((child) => {
                        if (child.name.includes('Arm') || child.name.includes('arm')) {
                            child.rotation.x = Math.sin(this.basicAnimation.time * 2) * 0.05;
                        }
                        // Piernas quietas en idle
                        if (child.name.includes('Leg') || child.name.includes('leg')) {
                            child.rotation.x = 0;
                        }
                    });
                }
            }
        };
    }

    createBasicAstronaut() {
    const group = new THREE.Group();

    // Cuerpo (no se anima) - CON COLOR
    const bodyGeometry = new THREE.CapsuleGeometry(0.3, 1.2, 4, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff,  // Color blanco para el traje
        shininess: 30
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.0;
    body.name = 'Body';
    group.add(body);

    // BRAZOS (se animan al caminar) - CON COLOR
    const leftArm = this.createLimb(0.08, 0.7, new THREE.Vector3(-0.35, 1.0, 0), 0xffffff);
    const rightArm = this.createLimb(0.08, 0.7, new THREE.Vector3(0.35, 1.0, 0), 0xffffff);
    leftArm.name = 'Left_Arm';
    rightArm.name = 'Right_Arm';
    
    // PIERNAS (se animan al caminar) - CON COLOR
    const leftLeg = this.createLimb(0.1, 0.8, new THREE.Vector3(-0.12, 0.2, 0), 0xffffff);
    const rightLeg = this.createLimb(0.1, 0.8, new THREE.Vector3(0.12, 0.2, 0), 0xffffff);
    leftLeg.name = 'Left_Leg';
    rightLeg.name = 'Right_Leg';

    // CASCO (añadir para más realismo) - CON COLOR
    const helmetGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const helmetMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.set(0, 1.8, 0);
    helmet.name = 'Helmet';
    group.add(helmet);

    // MOCHILA (añadir para más realismo) - CON COLOR
    const backpackGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.2);
    const backpackMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x444444  // Color gris oscuro
    });
    const backpack = new THREE.Mesh(backpackGeometry, backpackMaterial);
    backpack.position.set(-0.25, 1.0, 0.15);
    backpack.name = 'Backpack';
    group.add(backpack);

    group.add(leftArm);
    group.add(rightArm);
    group.add(leftLeg);
    group.add(rightLeg);

    group.userData = {
        info: "Astronauta - Miembro de la tripulación marciana",
        type: "astronaut",
        speed: this.moveSpeed,
        isMoving: false
    };

    this.model = group;
    this.setupBasicMovement();
    return group;
    }

    createLimb(radius, height, position, color) {
    const geometry = new THREE.CapsuleGeometry(radius, height, 4, 8);
    const material = new THREE.MeshPhongMaterial({ 
        color: color,
        shininess: 20
    });
    const limb = new THREE.Mesh(geometry, material);
    limb.position.copy(position);
    return limb;
    }

    setupControls() {
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
        });

        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
    }

    update(deltaTime, terrain) {
        if (!this.model) return;

        // Actualizar animaciones del mixer si existe
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }

        // Detectar si se está moviendo (para animaciones específicas)
        const isMoving = this.keys['KeyW'] || this.keys['KeyS'] || this.keys['KeyA'] || this.keys['KeyD'] ||
                       this.keys['ArrowUp'] || this.keys['ArrowDown'] || this.keys['ArrowLeft'] || this.keys['ArrowRight'];

        // Actualizar animación básica (solo brazos/piernas)
        if (this.basicAnimation) {
            this.basicAnimation.update(deltaTime, isMoving);
        }

        // Control de animaciones principales
        if (isMoving && !this.model.userData.isMoving) {
            this.playAnimation('walk');
            this.model.userData.isMoving = true;
        } else if (!isMoving && this.model.userData.isMoving) {
            this.playAnimation('idle');
            this.model.userData.isMoving = false;
        }

        // Aplicar gravedad marciana suave
        if (!this.isOnGround) {
            this.velocity.y += this.gravity;
        }

        // Movimiento suave con aceleración/desaceleración
        const targetDirection = new THREE.Vector3();
        
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            targetDirection.z = -1;
        }
        if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            targetDirection.z = 1;
        }
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            targetDirection.x = -1;
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            targetDirection.x = 1;
        }

        // Suavizar el movimiento
        if (targetDirection.length() > 0) {
            targetDirection.normalize();
            this.direction.lerp(targetDirection, this.acceleration);
            
            // Rotación suave hacia la dirección del movimiento
            const targetRotation = Math.atan2(this.direction.x, this.direction.z);
            this.model.rotation.y = THREE.MathUtils.lerp(this.model.rotation.y, targetRotation, 0.2);
        } else {
            // Desaceleración suave
            this.direction.lerp(new THREE.Vector3(), this.deceleration);
        }

        // Aplicar velocidad de movimiento
        const currentSpeed = this.model.userData.speed * deltaTime * 60;
        this.velocity.x = this.direction.x * currentSpeed;
        this.velocity.z = this.direction.z * currentSpeed;

        // Sistema de colisión con el terreno
        this.updateGroundCollision(terrain);

        // Salto controlado
        if (this.keys['Space'] && this.isOnGround) {
            this.velocity.y = this.jumpForce;
            this.isOnGround = false;
            this.playAnimation('jump');
        }

        // Aplicar movimiento vertical solo si no está en el suelo
        if (!this.isOnGround) {
            this.velocity.y += this.gravity;
        } else {
            this.velocity.y = 0;
        }

        // Aplicar movimiento final
        this.model.position.add(this.velocity);
    }

    updateGroundCollision(terrain) {
        if (!this.model || !terrain) return;

        const raycaster = new THREE.Raycaster();
        const position = this.model.position.clone();
        
        // Múltiples rayos para mejor detección
        const rayOrigins = [
            new THREE.Vector3(position.x, position.y + 0.5, position.z),
            new THREE.Vector3(position.x + 0.2, position.y + 0.5, position.z),
            new THREE.Vector3(position.x - 0.2, position.y + 0.5, position.z),
            new THREE.Vector3(position.x, position.y + 0.5, position.z + 0.2),
            new THREE.Vector3(position.x, position.y + 0.5, position.z - 0.2)
        ];

        let highestGround = -Infinity;
        let hasGround = false;

        rayOrigins.forEach(origin => {
            raycaster.set(origin, new THREE.Vector3(0, -1, 0));
            const intersects = raycaster.intersectObject(terrain, true);

            if (intersects.length > 0) {
                const groundY = intersects[0].point.y;
                if (groundY > highestGround) {
                    highestGround = groundY;
                    hasGround = true;
                }
            }
        });

        if (hasGround) {
            const astronautBottom = position.y - 0.8;
            const groundDistance = astronautBottom - highestGround;
            
            if (groundDistance <= 0.1) {
                this.model.position.y = highestGround + 0.8;
                this.isOnGround = true;
                this.velocity.y = Math.max(0, this.velocity.y);
            } else if (groundDistance > 0.1) {
                this.isOnGround = false;
            }
        } else {
            this.isOnGround = false;
        }
    }

    setPosition(x, y, z) {
        if (this.model) {
            this.model.position.set(x, y, z);
            this.velocity.set(0, 0, 0);
            this.isOnGround = false;
        }
    }

    getPosition() {
        return this.model ? this.model.position : new THREE.Vector3();
    }

    getModel() {
        return this.model;
    }
}

export class AstronautController {
    constructor(astronaut, terrain, camera, scene) {
        this.astronaut = astronaut;
        this.terrain = terrain;
        this.camera = camera;
        this.scene = scene;
        
        // Configuración de cámaras con ZOOM
        this.cameraModes = ['follow', 'free'];
        this.currentCameraMode = 'follow';
        
        // Configuración de ZOOM
        this.zoomDistance = 5; // Distancia inicial
        this.minZoom = 2;      // Zoom máximo (más cerca)
        this.maxZoom = 50;     // Zoom mínimo (más lejos) - ¡Aumentado para ver toda la superficie!
        this.zoomSpeed = 0.5;  // Velocidad de zoom
        
        // Configuración de cámara de seguimiento
        this.cameraHeight = 2; // Altura de la cámara
        this.cameraSmoothness = 0.1; // Suavidad del seguimiento
        
        this.setupControls();
    }

    setupControls() {
        // Tecla C para cambiar entre modos de cámara
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyC') {
                this.cycleCameraMode();
            }
        });

        // Zoom con rueda del mouse
        document.addEventListener('wheel', (event) => {
            this.handleZoom(event);
        }, { passive: false });
    }

    handleZoom(event) {
        event.preventDefault();
        
        // Invertir la dirección para que sea intuitivo
        const zoomDirection = event.deltaY > 0 ? -1 : 1;
        
        // Aplicar zoom
        this.zoomDistance += zoomDirection * this.zoomSpeed;
        
        // Limitar zoom entre min y max
        this.zoomDistance = THREE.MathUtils.clamp(
            this.zoomDistance, 
            this.minZoom, 
            this.maxZoom
        );
    }

    cycleCameraMode() {
        const currentIndex = this.cameraModes.indexOf(this.currentCameraMode);
        const nextIndex = (currentIndex + 1) % this.cameraModes.length;
        this.currentCameraMode = this.cameraModes[nextIndex];
        
        console.log(`Modo cámara: ${this.getCameraModeName(this.currentCameraMode)}`);
    }

    getCameraModeName(mode) {
        const names = {
            'follow': 'Seguimiento con Zoom',
            'free': 'Libre'
        };
        return names[mode] || mode;
    }

    // MÉTODOS PARA MAIN.JS
    getCurrentCameraMode() {
        return this.currentCameraMode;
    }

    getUseOrbitControls() {
        return this.currentCameraMode === 'free';
    }

    update(deltaTime) {
        if (this.currentCameraMode === 'follow') {
            this.astronaut.update(deltaTime, this.terrain);
        }
        this.updateCamera();
    }

    updateCamera() {
        if (!this.astronaut.model) return;

        switch (this.currentCameraMode) {
            case 'follow':
                this.updateFollowCamera();
                break;
            case 'free':
                this.updateFreeCamera();
                break;
        }
    }

    updateFollowCamera() {
        const astronaut = this.astronaut.model;
        
        // Calcular posición objetivo de la cámara
        const cameraOffset = new THREE.Vector3(0, this.cameraHeight, this.zoomDistance);
        cameraOffset.applyQuaternion(astronaut.quaternion);
        
        const targetPosition = astronaut.position.clone().add(cameraOffset);
        
        // Suavizar movimiento de cámara
        this.camera.position.lerp(targetPosition, this.cameraSmoothness);
        
        // Mirar al astronauta
        const lookAtPosition = astronaut.position.clone();
        lookAtPosition.y += 1.5; // Mirar a la altura del pecho
        this.camera.lookAt(lookAtPosition);
    }

    updateFreeCamera() {
        // En modo libre, la cámara se controla con OrbitControls
        // No hacemos nada aquí, OrbitControls se encarga
    }

    // Método para obtener información del zoom (para la UI)
    getZoomInfo() {
        const zoomPercentage = ((this.zoomDistance - this.minZoom) / (this.maxZoom - this.minZoom)) * 100;
        return {
            distance: this.zoomDistance.toFixed(1),
            percentage: Math.round(zoomPercentage)
        };
    }
}