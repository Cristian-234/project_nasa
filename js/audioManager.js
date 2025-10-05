export class AudioManager {
    constructor() {
        this.sounds = new Map();
        this.backgroundMusic = null;
        this.footstepsAudio = null; // 👈 NUEVO
        this.soundEnabled = true;
        this.globalVolume = 0.7;

        this.loadSounds();
    }

    loadSounds() {
        this.sounds.set('mars_wind', './sounds/mars_wind.mp3');
        this.sounds.set('rover_movement', './sounds/rover.mp3');
        this.sounds.set('habitat_ambient', './sounds/ambiental.mp3');
        this.sounds.set('interface_click', './sounds/interface_click.mp3');
        this.sounds.set('environment_change', './sounds/environment_change.mp3');
        
        // 👣 Sonido de pasos persistente
        this.footstepsAudio = new Audio('./sounds/footsteps.mp3');
        this.footstepsAudio.loop = true;
        this.footstepsAudio.volume = 0.2 * this.globalVolume;

        // 🎵 Música de fondo
        this.backgroundMusic = new Audio('./sounds/ambiental.mp3');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.3 * this.globalVolume;
    }

    playFootsteps() {
        if (!this.soundEnabled || !this.footstepsAudio) return null;
        this.footstepsAudio.play().catch(e => {
            console.warn('Error al reproducir pasos:', e);
        });
        return this.footstepsAudio;
    }

    stopFootsteps() {
        if (this.footstepsAudio) {
            this.footstepsAudio.pause();
            this.footstepsAudio.currentTime = 0;
        }
    }

    async playSound(soundName, volume = 1.0, loop = false) {
        if (!this.soundEnabled) return null;

        try {
            const soundPath = this.sounds.get(soundName);
            if (!soundPath) {
                console.warn(`Sonido no encontrado: ${soundName}`);
                return null;
            }

            const audio = new Audio(soundPath);
            audio.volume = volume * this.globalVolume;
            audio.loop = loop;
            
            await audio.play();
            return audio;
        } catch (error) {
            console.warn(`Error reproduciendo sonido ${soundName}:`, error);
            return null;
        }
    }

    playBackgroundMusic() {
        if (this.soundEnabled && this.backgroundMusic) {
            this.backgroundMusic.play().catch(e => {
                console.log('La música de fondo requiere interacción del usuario primero');
            });
        }
    }

    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
        }
    }

    setBackgroundMusicVolume(volume) {
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = volume * this.globalVolume;
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        
        if (!this.soundEnabled) {
            this.stopBackgroundMusic();
            // Pausar todos los sonidos activos
            this.sounds.forEach((path, name) => {
                // En una implementación real, necesitarías rastrear las instancias de audio activas
            });
        } else {
            this.playBackgroundMusic();
        }
        
        return this.soundEnabled;
    }

    setGlobalVolume(volume) {
        this.globalVolume = Math.max(0, Math.min(1, volume));
        
        // Actualizar volumen de música de fondo
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = 0.3 * this.globalVolume;
        }
    }

    // Efectos específicos para la simulación
    playRoverMovement() {
        return this.playSound('rover_movement', 0.4, true);
    }

    playMarsWind() {
        return this.playSound('mars_wind', 0.3, true);
    }

    playFootsteps() {
        return this.playSound('footsteps', 0.2, false);
    }

    playInterfaceClick() {
        return this.playSound('interface_click', 0.5, false);
    }

    playEnvironmentChange() {
        return this.playSound('environment_change', 0.6, false);
    }
    // Limpiar recursos
    cleanup() {
        this.stopBackgroundMusic();
        this.sounds.clear();
    }
}