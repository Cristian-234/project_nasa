import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Domo2 {
    constructor() {
        this.model = null;
        this.mixer = null;
        this.animations = new Map();
        this.currentAction = null;

        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.isOnGround = false;
        this.gravity = -0.02;

        this.keys = {};
        this.setupControls();
        
        // Debug
        this.debugBox = null;
        this.createDebugBox();
    }

    createDebugBox() {
        const geometry = new THREE.BoxGeometry(3, 2, 3);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xff00ff, // Color diferente para distinguirlo
            transparent: true,
            opacity: 0.7
        });
        this.debugBox = new THREE.Mesh(geometry, material);
        this.debugBox.visible = false;
    }

    createLabel(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;

        // Fondo del letrero
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 15);
        context.fill();

        // Texto
        context.font = 'Bold 48px Arial';
        context.fillStyle = '#00ffff'; // Color diferente
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(10, 2.5, 1);
        
        return sprite;
    }

    async loadModel() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();

            console.log('🛸 Intentando cargar modelo domo2...');

            loader.load(
                './models/domo2.glb', // ← RUTA DEL SEGUNDO MODELO
                (gltf) => {
                    console.log('✅ Domo2 cargado exitosamente:', gltf);
                    this.model = gltf.scene;

                    this.model.scale.set(0.05, 0.05, 0.05); // Escala ligeramente diferente
                    this.model.position.set(10, 0, 25);
                    
                    this.model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            if (child.material) {
                                child.material.side = THREE.DoubleSide;
                                child.material.needsUpdate = true;
                            }
                        }
                    });

                    this.mixer = new THREE.AnimationMixer(this.model);
                    
                    if (gltf.animations && gltf.animations.length > 0) {
                        console.log('Animaciones del domo2:', gltf.animations.map(a => a.name));
                        gltf.animations.forEach((clip) => {
                            const action = this.mixer.clipAction(clip);
                            this.animations.set(clip.name, action);
                        });
                        this.setupAnimations();
                    }

                    this.model.userData = {
                        info: "Domo2 marciano - módulo de investigación",
                        type: "domo2",
                        speed: 0.04,
                        isMoving: false
                    };

                    resolve(this.model);
                },
                (xhr) => {
                    console.log(`📦 Cargando domo2: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
                },
                (error) => {
                    console.error('❌ Error cargando domo2:', error);
                    console.log('🔄 Usando caja de debug para domo2');
                    
                    this.model = this.debugBox;
                    this.model.visible = true;
                    this.model.scale.set(3, 2, 3);
                    
                    this.model.userData = {
                        info: "Domo2 (Debug Mode)",
                        type: "domo2",
                        speed: 0.04,
                        isMoving: false
                    };

                    resolve(this.model);
                }
            );
        });
    }

    setupAnimations() {
        if (this.animations.size === 0) {
            console.log('ℹ El domo2 no tiene animaciones');
            return;
        }

        const idleAnim = this.animations.get('Idle') || this.animations.values().next().value;
        if (idleAnim) {
            idleAnim.play();
            this.currentAction = idleAnim;
        }
    }

    playAnimation(name, fadeDuration = 0.1) {
        const newAction = this.animations.get(name);
        if (!newAction || this.currentAction === newAction) return;

        if (this.currentAction) this.currentAction.fadeOut(fadeDuration);
        newAction.reset().fadeIn(fadeDuration).play();
        this.currentAction = newAction;
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
        if (this.mixer) this.mixer.update(deltaTime);
    }

    setPosition(x, y, z) {
        if (this.model) this.model.position.set(x, y, z);
    }

    getPosition() {
        return this.model ? this.model.position : new THREE.Vector3();
    }

    getModel() {
        return this.model;
    }
}

export class Domo2Controller {
    constructor(domo2, terrain, camera, scene, renderer) {
        this.domo2 = domo2;
        this.terrain = terrain;
        this.camera = camera;
        this.scene = scene;
        this.renderer = renderer;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.isActive = false;
        this.cameraTargetPosition = null;
        this.cameraLookAtTarget = new THREE.Vector3(0, 0, 0);

        this.initializeCamera();
        this.setupClickEvent();
        this.setupKeyboardControls();
    }

    initializeCamera() {
        const initialHeight = 100;
        const initialOffset = new THREE.Vector3(0, initialHeight, 0);
        
        this.cameraTargetPosition = initialOffset.clone();
        this.camera.position.copy(this.cameraTargetPosition);
        this.camera.lookAt(this.cameraLookAtTarget);
        
        console.log("🌍 Cámara inicializada para Domo2");
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            if (!this.isActive) return;
            
            if (event.code === 'KeyR') {
                this.resetCamera();
            }
            
            if (event.code === 'Equal' || event.code === 'NumpadAdd') {
                this.adjustZoom(-5);
            }
            if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
                this.adjustZoom(5);
            }
        });

        this.renderer.domElement.addEventListener('wheel', (event) => {
            if (!this.isActive) return;
            event.preventDefault();
            const zoomAmount = event.deltaY * 0.05;
            this.adjustZoom(zoomAmount);
        });
    }

    adjustZoom(amount) {
        const direction = this.camera.position.clone().sub(this.cameraLookAtTarget).normalize();
        const newPosition = this.camera.position.clone().add(direction.multiplyScalar(amount));
        
        if (newPosition.y > 5 && newPosition.y < 200) {
            this.cameraTargetPosition = newPosition;
        }
    }

    resetCamera() {
        const initialHeight = 100;
        this.cameraTargetPosition = new THREE.Vector3(0, initialHeight, 0);
        this.cameraLookAtTarget = new THREE.Vector3(0, 0, 0);
        console.log("🔄 Cámara reseteada (Domo2)");
    }

    setupClickEvent() {
        this.renderer.domElement.addEventListener('click', (event) => {
            if (!this.isActive) return;
            
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);

            if (intersects.length > 0) {
                const clickedPoint = intersects[0].point;
                const clickedObject = intersects[0].object;
                this.zoomToPoint(clickedPoint, clickedObject);
            }
        });

        this.renderer.domElement.addEventListener('dblclick', (event) => {
            if (!this.isActive) return;
            
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);

            if (intersects.length > 0) {
                const clickedPoint = intersects[0].point;
                const clickedObject = intersects[0].object;
                this.zoomToPoint(clickedPoint, clickedObject, true);
            }
        });
    }

    zoomToPoint(point, object, closeZoom = false) {
        let distance = closeZoom ? 8 : 20;
        let heightOffset = closeZoom ? 5 : 15;

        if (object.userData && object.userData.type === 'domo2') {
            distance = closeZoom ? 5 : 15;
            heightOffset = closeZoom ? 3 : 10;
            console.log(closeZoom ? "👁 Vista interior del domo2" : "🏠 Zoom al domo2");
        } else {
            console.log(closeZoom ? "🔍 Zoom cercano" : "📍 Zoom al punto");
        }

        this.cameraTargetPosition = new THREE.Vector3(
            point.x,
            point.y + heightOffset,
            point.z + distance
        );

        this.cameraLookAtTarget = point.clone();
    }

    activate() {
        this.isActive = true;
        console.log("🗺 Modo Mapa activado (Domo2)");
    }

    deactivate() {
        this.isActive = false;
    }

    update(deltaTime) {
        this.domo2.update(deltaTime, this.terrain);
        
        if (this.isActive) {
            this.updateCamera();
        }
    }

    updateCamera() {
        if (!this.cameraTargetPosition) return;

        this.camera.position.lerp(this.cameraTargetPosition, 0.1);
        this.camera.lookAt(this.cameraLookAtTarget);
    }

    getUseOrbitControls() {
        return false;
    }
}