/**
 * Call Audio Service
 * Programmatic ringtone/ringback generation using Web Audio API
 * No audio files required — synthesizes tones directly
 */

let audioCtx: AudioContext | null = null;
let activeOscillators: OscillatorNode[] = [];
let activeGains: GainNode[] = [];
let ringInterval: ReturnType<typeof setInterval> | null = null;

function getAudioContext(): AudioContext {
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

/**
 * Play a tone burst (single beep)
 */
function playToneBurst(
    ctx: AudioContext,
    frequency: number,
    duration: number,
    volume: number = 0.15
): { oscillator: OscillatorNode; gain: GainNode } {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Smooth envelope to avoid clicks
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + duration - 0.02);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);

    activeOscillators.push(oscillator);
    activeGains.push(gain);

    // Cleanup on end
    oscillator.onended = () => {
        activeOscillators = activeOscillators.filter(o => o !== oscillator);
        activeGains = activeGains.filter(g => g !== gain);
        try { oscillator.disconnect(); } catch { /* already disconnected */ }
        try { gain.disconnect(); } catch { /* already disconnected */ }
    };

    return { oscillator, gain };
}

// ─── Ringback Tone (Caller hears while waiting) ────────────────────

/**
 * Standard ringback: 440Hz tone, 2s on / 4s off
 * Similar to US telephone ringback pattern
 */
export function playRingback(): void {
    stopAll();
    const ctx = getAudioContext();

    // Play first burst immediately
    playToneBurst(ctx, 440, 2, 0.12);

    // Then loop: 2s tone, 4s silence = 6s cycle
    ringInterval = setInterval(() => {
        try {
            const c = getAudioContext();
            playToneBurst(c, 440, 2, 0.12);
        } catch {
            stopAll(); // Stop if context is broken
        }
    }, 6000);

    console.log('[CallAudio] Ringback started');
}

// ─── Incoming Ringtone (Receiver hears) ────────────────────────────

/**
 * Incoming ring: Dual-tone alternating 440Hz/520Hz
 * 1s on / 2s off — sounds more like a phone ring
 */
export function playIncomingRing(): void {
    stopAll();
    const ctx = getAudioContext();

    const playRingBurst = () => {
        try {
            const c = getAudioContext();
            // Dual-tone for richer sound
            playToneBurst(c, 440, 0.8, 0.15);
            playToneBurst(c, 520, 0.8, 0.1);

            // Second burst after short gap
            setTimeout(() => {
                try {
                    const c2 = getAudioContext();
                    playToneBurst(c2, 440, 0.8, 0.15);
                    playToneBurst(c2, 520, 0.8, 0.1);
                } catch { /* ignore */ }
            }, 1000);
        } catch {
            stopAll();
        }
    };

    // Play first ring immediately
    playRingBurst();

    // Loop: ring burst group (2s) + silence (2s) = 4s cycle
    ringInterval = setInterval(playRingBurst, 4000);

    console.log('[CallAudio] Incoming ring started');
}

// ─── Call Connected Sound ──────────────────────────────────────────

/**
 * Short "connected" confirmation beep
 */
export function playConnectedTone(): void {
    try {
        const ctx = getAudioContext();
        playToneBurst(ctx, 600, 0.15, 0.1);
        setTimeout(() => {
            try {
                playToneBurst(getAudioContext(), 800, 0.15, 0.1);
            } catch { /* ignore */ }
        }, 180);
    } catch {
        console.warn('[CallAudio] Could not play connected tone');
    }
}

// ─── Call Ended Sound ──────────────────────────────────────────────

/**
 * Short "ended" confirmation beep (descending)
 */
export function playEndedTone(): void {
    try {
        const ctx = getAudioContext();
        playToneBurst(ctx, 600, 0.15, 0.1);
        setTimeout(() => {
            try {
                playToneBurst(getAudioContext(), 400, 0.2, 0.1);
            } catch { /* ignore */ }
        }, 180);
    } catch {
        console.warn('[CallAudio] Could not play ended tone');
    }
}

// ─── Stop All Audio ────────────────────────────────────────────────

/**
 * Stop all active tones and clear intervals
 */
export function stopAll(): void {
    // Clear ring loop
    if (ringInterval) {
        clearInterval(ringInterval);
        ringInterval = null;
    }

    // Stop all active oscillators
    activeOscillators.forEach(osc => {
        try { osc.stop(); } catch { /* already stopped */ }
        try { osc.disconnect(); } catch { /* already disconnected */ }
    });
    activeOscillators = [];

    // Disconnect all gain nodes
    activeGains.forEach(gain => {
        try { gain.disconnect(); } catch { /* already disconnected */ }
    });
    activeGains = [];

    console.log('[CallAudio] All audio stopped');
}

// ─── Cleanup ───────────────────────────────────────────────────────

/**
 * Full cleanup — close audio context
 */
export function dispose(): void {
    stopAll();
    if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => { /* ignore */ });
        audioCtx = null;
    }
}
