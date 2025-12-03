class SoundEffects {
  private audioContext: AudioContext | null = null
  private enabled = true

  constructor() {
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  private playTone(frequency: number, duration: number, volume = 0.3) {
    if (!this.enabled || !this.audioContext) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = "sine"

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)

    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + duration)
  }

  playBallDrop() {
    this.playTone(800, 0.05, 0.1)
  }

  playSmallWin() {
    this.playTone(523.25, 0.2, 0.2) // C5
    setTimeout(() => this.playTone(659.25, 0.3, 0.2), 100) // E5
  }

  playMediumWin() {
    this.playTone(523.25, 0.15, 0.25) // C5
    setTimeout(() => this.playTone(659.25, 0.15, 0.25), 80) // E5
    setTimeout(() => this.playTone(783.99, 0.3, 0.25), 160) // G5
  }

  playBigWin() {
    // Epic ascending chord
    const notes = [261.63, 329.63, 392, 523.25, 659.25] // C4, E4, G4, C5, E5
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 0.3), i * 100)
    })

    // Final high note
    setTimeout(() => {
      this.playTone(1046.5, 0.8, 0.35) // C6
    }, 500)
  }

  playLoss() {
    this.playTone(196, 0.4, 0.15) // G3 - somber tone
  }
}

export const soundEffects = new SoundEffects()
