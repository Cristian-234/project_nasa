// welcomeManager.js - Gestor de la pantalla de bienvenida
class WelcomeManager {
    constructor() {
        this.soundEnabled = true;
        this.volume = 0.7;
        this.backgroundMusic = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAudioSettings();
        this.preloadSounds();
    }

    setupEventListeners() {
        const startButton = document.getElementById('startButton');
        const soundToggle = document.getElementById('soundToggle');
        const volumeSlider = document.getElementById('volumeSlider');

        startButton.addEventListener('click', () => this.startSimulation());
        
        soundToggle.addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
            this.updateAudio();
            this.saveAudioSettings();
        });

        volumeSlider.addEventListener('input', (e) => {
            this.volume = e.target.value / 100;
            this.updateAudio();
            this.saveAudioSettings();
        });

        // Efecto hover en botón de inicio
        startButton.addEventListener('mouseenter', () => {
            if (this.soundEnabled) {
                this.playSound('hover');
            }
        });
    }

    loadAudioSettings() {
        const savedSound = localStorage.getItem('marsSimulator_soundEnabled');
        const savedVolume = localStorage.getItem('marsSimulator_volume');
        
        if (savedSound !== null) {
            this.soundEnabled = savedSound === 'true';
            document.getElementById('soundToggle').checked = this.soundEnabled;
        }
        
        if (savedVolume !== null) {
            this.volume = parseFloat(savedVolume);
            document.getElementById('volumeSlider').value = this.volume * 100;
        }
    }

    saveAudioSettings() {
        localStorage.setItem('marsSimulator_soundEnabled', this.soundEnabled);
        localStorage.setItem('marsSimulator_volume', this.volume);
    }

    preloadSounds() {
        // Precargar sonidos para mejor experiencia
        this.sounds = {
            hover: this.createSound('sounds/ui_hover.mp3'),
            start: this.createSound('sounds/simulation_start.mp3')
        };
    }

    createSound(src) {
        const audio = new Audio();
        audio.src = src;
        audio.preload = 'auto';
        return audio;
    }

    playSound(type) {
        if (!this.soundEnabled || !this.sounds[type]) return;

        try {
            const sound = this.sounds[type].cloneNode();
            sound.volume = this.volume;
            sound.play().catch(e => console.log('Sonido no disponible'));
        } catch (error) {
            console.log('Error reproduciendo sonido:', error);
        }
    }

    updateAudio() {
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = this.volume * 0.3;
            
            if (this.soundEnabled && this.backgroundMusic.paused) {
                this.backgroundMusic.play().catch(e => console.log('Audio requiere interacción'));
            } else if (!this.soundEnabled) {
                this.backgroundMusic.pause();
            }
        }
    }

    startSimulation() {
        const startButton = document.getElementById('startButton');
        const loadingBar = document.getElementById('loadingBar');
        const loadingProgress = document.getElementById('loadingProgress');

        // Deshabilitar botón y mostrar carga
        startButton.disabled = true;
        startButton.textContent = 'LOADING SIMULATION...';
        loadingBar.style.display = 'block';

        // Sonido de inicio
        this.playSound('start');

        // Simular progreso de carga
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                
                // Transición a la simulación
                setTimeout(() => {
                    this.showSimulation();
                }, 500);
            }
            loadingProgress.style.width = progress + '%';
        }, 200);
    }

    showSimulation() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        const simulationScreen = document.getElementById('simulationScreen');

        // Ocultar bienvenida, mostrar simulación
        welcomeScreen.style.display = 'none';
        simulationScreen.style.display = 'block';

        // Pasar configuración de audio al juego principal
        window.marsSimulatorAudioSettings = {
            soundEnabled: this.soundEnabled,
            volume: this.volume
        };

        // Inicializar el juego (si no se inicializa automáticamente)
        if (typeof window.initGame === 'function') {
            window.initGame();
        }

        console.log('🚀 Simulación Mars Habitat iniciada!');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new WelcomeManager();
});