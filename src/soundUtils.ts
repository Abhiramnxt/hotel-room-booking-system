/**
 * Sri Nirvana Resort & Plaza - Premium Luxury Hotel Audio Synthesis Library
 * Synthesizes subtle luxury corporate sound effects using the Web Audio API. No external file downloads.
 * Responsive, zero-latency and highly professional.
 */

// Local persistence settings
let isAudioEnabled = true;
let volumeLevel: 'low' | 'medium' | 'high' = 'low';

if (typeof window !== 'undefined') {
  const storedEnabled = localStorage.getItem('sai_nirvana_ui_sounds');
  if (storedEnabled !== null) {
    isAudioEnabled = storedEnabled === 'true';
  } else {
    localStorage.setItem('sai_nirvana_ui_sounds', 'true');
  }

  const storedVolume = localStorage.getItem('sai_nirvana_ui_volume');
  if (storedVolume !== null) {
    volumeLevel = storedVolume as 'low' | 'medium' | 'high';
  } else {
    localStorage.setItem('sai_nirvana_ui_volume', 'low');
  }
}

export function setAudioEnabled(enabled: boolean) {
  isAudioEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('sai_nirvana_ui_sounds', String(enabled));
  }
}

export function getAudioEnabled(): boolean {
  return isAudioEnabled;
}

export function setVolumeLevel(level: 'low' | 'medium' | 'high') {
  volumeLevel = level;
  if (typeof window !== 'undefined') {
    localStorage.setItem('sai_nirvana_ui_volume', level);
  }
}

export function getVolumeLevel(): 'low' | 'medium' | 'high' {
  return volumeLevel;
}

// Convert volume levels into active multiplier scalars
const VOLUME_MULTIPLIERS = {
  low: 0.20,      // Soft, non-intrusive
  medium: 0.50,   // Standard balanced
  high: 0.90      // Audible and crisp
};

export type SoundType = 
  | 'click' 
  | 'tap' 
  | 'success' 
  | 'notification' 
  | 'container' 
  | 'hover' 
  | 'assistant' 
  | 'offer' 
  | 'print' 
  | 'error'
  | 'confirm'
  | 'dispatch'
  | 'room';

/**
 * Synthesizes a high-end luxury acoustic or digital hotel tone dynamically.
 */
export function playSound(type: SoundType) {
  if (!isAudioEnabled) return;
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Set Master Gain based on the volume settings chosen by user
    const masterGain = ctx.createGain();
    const multiplier = VOLUME_MULTIPLIERS[volumeLevel] || 0.20;
    masterGain.gain.setValueAtTime(multiplier, ctx.currentTime);
    masterGain.connect(ctx.destination);

    if (type === 'hover') {
      // Do NOT play sounds on hover as per prompt instructions
      return;
    }

    if (
      type === 'click' ||
      type === 'tap' ||
      type === 'confirm' ||
      type === 'dispatch' ||
      type === 'print' ||
      type === 'room' ||
      type === 'container' ||
      type === 'assistant'
    ) {
      // PROFESSIONAL MOUSE CLICK: Tactile mechanical switch mouse click synthesis
      // Characteristics: Soft, Clean, Realistic, Modern, Minimal, volume 15%-25%

      // Transient 1: High frequency snap
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(2400, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.012);
      
      gain1.gain.setValueAtTime(0.20, ctx.currentTime); // Precise 20% comfort volume
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
      
      osc1.connect(gain1);
      gain1.connect(masterGain);

      // Transient 2: Subtle housing resonance pop
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(350, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.022);
      
      gain2.gain.setValueAtTime(0.10, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
      
      osc2.connect(gain2);
      gain2.connect(masterGain);

      osc1.start();
      osc1.stop(ctx.currentTime + 0.02);
      
      osc2.start();
      osc2.stop(ctx.currentTime + 0.03);

    } else if (type === 'offer') {
      // OFFER NOTIFICATION: Luxury Offer Bell
      // Characteristics: Soft Bell, Premium Tone. Volume: Low.
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime); // E6 high bell frequency for gold-toned reward indication

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gainNode);
      gainNode.connect(masterGain);

      osc.start();
      osc.stop(ctx.currentTime + 0.40);

    } else if (type === 'success') {
      // SUCCESS EVENT: Elegant Success Chime
      // Characteristics: Positive, Professional. Volume: Medium. Duration: 200–400ms.
      const playTone = (freq: number, start: number, duration: number, finalVol: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

        gainNode.gain.setValueAtTime(0, ctx.currentTime + start);
        gainNode.gain.linearRampToValueAtTime(finalVol * 0.22, ctx.currentTime + start + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

        osc.connect(gainNode);
        gainNode.connect(masterGain);

        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // F major/C major 9th ascending arpeggio subset
      playTone(523.25, 0, 0.35, 0.85);       // C5
      playTone(659.25, 0.06, 0.35, 0.85);    // E5
      playTone(783.99, 0.12, 0.38, 0.90);    // G5
      playTone(1046.50, 0.18, 0.40, 0.95);   // C6

    } else if (type === 'error') {
      // ERROR EVENT: Soft Warning Tone
      // Characteristics: Professional, Calm, Low Volume. Avoid alarm sounds.
      const playWarmTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

        gainNode.gain.setValueAtTime(0, ctx.currentTime + start);
        gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + start + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

        osc.connect(gainNode);
        gainNode.connect(masterGain);

        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Gentle non-aggressive minor dyad (ebony/ivory aesthetic alert)
      playWarmTone(246.94, 0, 0.26); // B3
      playWarmTone(261.63, 0.06, 0.28); // C4 - extremely close frequency for soft indicator, low pass vibe

    } else {
      // Fallback
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gainNode);
      gainNode.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch (e) {
    console.warn("Web Audio sound playback ignored:", e);
  }
}
