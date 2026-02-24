// Snuggle Pulse Service — Production-grade energy tracking with anti-spam
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { Pulse, PulseTheme, PULSE_LEVELS, ENERGY_VALUES } from '../types';

// ==================== HELPERS ====================

function getPulseId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

function calculateLevel(totalEnergy: number): number {
  return Math.floor(Math.sqrt(totalEnergy / 50));
}

function getLevelInfo(totalEnergy: number) {
  const level = calculateLevel(totalEnergy);
  // Find matching PULSE_LEVELS entry (highest that this level meets)
  let matched = PULSE_LEVELS[0];
  for (const pl of PULSE_LEVELS) {
    if (totalEnergy >= pl.minEnergy) matched = pl;
    else break;
  }
  return { level, ...matched };
}

// ==================== SERVICE ====================

export class PulseService {

  // ---- Get or Create Pulse ----
  static async getOrCreatePulse(uid1: string, uid2: string): Promise<Pulse> {
    const id = getPulseId(uid1, uid2);
    const ref = doc(db, 'pulses', id);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      return { id, ...snap.data() } as Pulse;
    }

    const [user1Id, user2Id] = [uid1, uid2].sort();
    const now = todayStr();

    const newPulse: Pulse = {
      id,
      user1Id,
      user2Id,
      pulseLevel: 0,
      pulseEnergy: 0,
      totalEnergy: 0,
      peakLevel: 0,
      streakDays: 0,
      lastInteractionDate: '',
      lastInteractionTimestamp: 0,
      pulseTheme: 'spark',
      dailyTextCount: 0,
      recentTimestamps: [],
      lastMessageHash: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, newPulse);
    return newPulse;
  }

  // ---- Get Pulse ----
  static async getPulse(uid1: string, uid2: string): Promise<Pulse | null> {
    const id = getPulseId(uid1, uid2);
    const ref = doc(db, 'pulses', id);
    const snap = await getDoc(ref);
    return snap.exists() ? { id, ...snap.data() } as Pulse : null;
  }

  // ---- Subscribe ----
  static subscribeToPulse(uid1: string, uid2: string, cb: (pulse: Pulse | null) => void): () => void {
    const id = getPulseId(uid1, uid2);
    const ref = doc(db, 'pulses', id);
    return onSnapshot(ref, (snap) => {
      cb(snap.exists() ? { id, ...snap.data() } as Pulse : null);
    });
  }

  // ---- Get all pulses for a user ----
  static async getUserPulses(userId: string): Promise<Pulse[]> {
    const q1 = query(collection(db, 'pulses'), where('user1Id', '==', userId));
    const q2 = query(collection(db, 'pulses'), where('user2Id', '==', userId));
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const pulses: Pulse[] = [];
    snap1.forEach(d => pulses.push({ id: d.id, ...d.data() } as Pulse));
    snap2.forEach(d => pulses.push({ id: d.id, ...d.data() } as Pulse));
    return pulses;
  }

  // ==================== CORE: Record Interaction ====================
  static async recordInteraction(
    uid1: string,
    uid2: string,
    type: 'text' | 'image' | 'voice' | 'video_call',
    messageText?: string
  ): Promise<{ energyGained: number; pulse: Pulse } | null> {
    const pulse = await this.getOrCreatePulse(uid1, uid2);
    const today = todayStr();
    const now = Date.now();

    // ---- Day rollover: reset daily counters ----
    const isNewDay = pulse.lastInteractionDate !== today;
    if (isNewDay) {
      pulse.pulseEnergy = 0;
      pulse.dailyTextCount = 0;
      pulse.recentTimestamps = [];
    }

    // ---- ANTI-SPAM CHECKS ----

    // 1. Daily energy cap
    if (pulse.pulseEnergy >= ENERGY_VALUES.DAILY_CAP) {
      return { energyGained: 0, pulse };
    }

    // 2. Spam burst: 5+ messages in 30 seconds
    const recentWindow = now - (ENERGY_VALUES.SPAM_WINDOW_SEC * 1000);
    const recentTs = (pulse.recentTimestamps || []).filter(t => t > recentWindow);
    if (recentTs.length >= ENERGY_VALUES.SPAM_MSG_THRESHOLD) {
      // Still track timestamps but give no energy
      recentTs.push(now);
      await this._updatePulse(pulse.id, { recentTimestamps: recentTs.slice(-10) });
      return { energyGained: 0, pulse };
    }

    // 3. Repeated message detection (text only)
    if (type === 'text' && messageText) {
      const hash = simpleHash(messageText.trim().toLowerCase());
      if (hash === pulse.lastMessageHash) {
        return { energyGained: 0, pulse };
      }
      pulse.lastMessageHash = hash;
    }

    // 4. Max 20 texts give energy per day
    if (type === 'text' && pulse.dailyTextCount >= ENERGY_VALUES.MAX_TEXT_ENERGY_COUNT) {
      return { energyGained: 0, pulse };
    }

    // ---- CALCULATE ENERGY ----
    let energy = 0;

    // Base energy
    const baseMap: Record<string, number> = {
      text: ENERGY_VALUES.text,
      image: ENERGY_VALUES.image,
      voice: ENERGY_VALUES.voice,
      video_call: ENERGY_VALUES.video_call,
    };
    energy += baseMap[type] || 0;

    // First interaction of the day bonus
    if (isNewDay && pulse.lastInteractionDate !== '') {
      energy += ENERGY_VALUES.first_interaction_bonus;
    }

    // Reply within 2 minutes bonus
    if (pulse.lastInteractionTimestamp > 0) {
      const timeSinceLast = now - pulse.lastInteractionTimestamp;
      if (timeSinceLast > 0 && timeSinceLast <= 2 * 60 * 1000) {
        energy += ENERGY_VALUES.reply_within_2min;
      }
    }

    // Apply daily cap
    energy = Math.min(energy, ENERGY_VALUES.DAILY_CAP - pulse.pulseEnergy);
    if (energy <= 0) {
      return { energyGained: 0, pulse };
    }

    // ---- UPDATE STREAK ----
    let newStreak = pulse.streakDays;
    if (isNewDay) {
      if (pulse.lastInteractionDate) {
        const lastDate = new Date(pulse.lastInteractionDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (86400000));
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1; // Reset — but no penalty on existing energy
        }
      } else {
        newStreak = 1; // First ever interaction
      }
    }

    // ---- STREAK BONUS (applied once per day) ----
    let streakBonus = 0;
    if (isNewDay && newStreak > 1) {
      streakBonus = Math.min(newStreak * ENERGY_VALUES.STREAK_MULTIPLIER, ENERGY_VALUES.MAX_STREAK_BONUS);
      energy += Math.min(streakBonus, ENERGY_VALUES.DAILY_CAP - pulse.pulseEnergy - energy);
    }

    // ---- ENERGY DECAY (check on new day) ----
    let totalEnergy = pulse.totalEnergy;
    if (isNewDay && pulse.lastInteractionDate) {
      const lastDate = new Date(pulse.lastInteractionDate);
      const todayDate = new Date(today);
      const inactiveDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000) - 1;
      if (inactiveDays >= ENERGY_VALUES.DECAY_INACTIVE_DAYS) {
        const decayDays = inactiveDays - ENERGY_VALUES.DECAY_INACTIVE_DAYS + 1;
        const decayFactor = Math.pow(1 - ENERGY_VALUES.DECAY_RATE, decayDays);
        totalEnergy = Math.floor(totalEnergy * decayFactor);
      }
    }

    // ---- APPLY ----
    totalEnergy += energy;
    const newLevel = calculateLevel(totalEnergy);
    const peakLevel = Math.max(pulse.peakLevel, newLevel);
    const levelInfo = getLevelInfo(totalEnergy);

    recentTs.push(now);

    const updates: Partial<Pulse> = {
      pulseEnergy: pulse.pulseEnergy + energy,
      totalEnergy,
      pulseLevel: newLevel,
      peakLevel,
      streakDays: newStreak,
      lastInteractionDate: today,
      lastInteractionTimestamp: now,
      pulseTheme: levelInfo.theme,
      dailyTextCount: type === 'text' ? pulse.dailyTextCount + 1 : pulse.dailyTextCount,
      recentTimestamps: recentTs.slice(-10),
      lastMessageHash: pulse.lastMessageHash,
      updatedAt: serverTimestamp(),
    };

    await this._updatePulse(pulse.id, updates);

    return {
      energyGained: energy,
      pulse: { ...pulse, ...updates } as Pulse,
    };
  }

  // ---- Internal update ----
  private static async _updatePulse(id: string, updates: Partial<Pulse>): Promise<void> {
    const ref = doc(db, 'pulses', id);
    await updateDoc(ref, updates as any);
  }

  // ==================== HELPERS ====================

  static calculateLevel(totalEnergy: number): number {
    return calculateLevel(totalEnergy);
  }

  static getProgressToNextLevel(totalEnergy: number): number {
    const currentLevel = calculateLevel(totalEnergy);
    const currentThreshold = currentLevel * currentLevel * 50;
    const nextThreshold = (currentLevel + 1) * (currentLevel + 1) * 50;
    const progress = (totalEnergy - currentThreshold) / (nextThreshold - currentThreshold);
    return Math.max(0, Math.min(100, progress * 100));
  }

  static getLevelInfo(totalEnergy: number) {
    return getLevelInfo(totalEnergy);
  }

  static getLevelByIndex(level: number) {
    // Find PULSE_LEVELS entry for this computed level
    const energy = level * level * 50;
    return getLevelInfo(energy);
  }

  static getUnlockedTheme(totalEnergy: number): PulseTheme {
    return getLevelInfo(totalEnergy).theme;
  }
}
