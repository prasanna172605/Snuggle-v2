// Snuggle Thoughts Service — 24h text notes (like Instagram Notes)
import { db } from './firebase';
import {
  doc, collection, addDoc, getDoc, getDocs, deleteDoc, setDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { Thought } from '../types';

function is24hValid(expiresAt: any): boolean {
  if (!expiresAt) return false;
  const exp = expiresAt.toMillis ? expiresAt.toMillis() : expiresAt;
  return exp > Date.now();
}

function get24hFromNow(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export class ThoughtService {

  // ---- Create or replace thought (one per user) ----
  static async createThought(userId: string, text: string, emoji?: string): Promise<Thought> {
    const trimmed = text.trim().slice(0, 60); // Max 60 chars
    const thoughtData = {
      userId,
      text: trimmed,
      emoji: emoji || null,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(get24hFromNow()),
    };

    // Use userId as doc ID so each user has only one active thought
    const ref = doc(db, 'thoughts', userId);
    await setDoc(ref, thoughtData);
    return { id: userId, ...thoughtData } as unknown as Thought;
  }

  // ---- Get user's active thought ----
  static async getThought(userId: string): Promise<Thought | null> {
    const ref = doc(db, 'thoughts', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const thought = { id: snap.id, ...snap.data() } as Thought;
    return is24hValid(thought.expiresAt) ? thought : null;
  }

  // ---- Get thoughts from multiple users ----
  static async getFeedThoughts(userIds: string[]): Promise<Thought[]> {
    if (userIds.length === 0) return [];

    const thoughts: Thought[] = [];
    const chunks: string[][] = [];
    for (let i = 0; i < userIds.length; i += 30) {
      chunks.push(userIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      // Since doc IDs = userIds, we can fetch directly
      const promises = chunk.map(async (uid) => {
        const ref = doc(db, 'thoughts', uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const t = { id: snap.id, ...snap.data() } as Thought;
          if (is24hValid(t.expiresAt)) thoughts.push(t);
        }
      });
      await Promise.all(promises);
    }

    // Sort newest first
    thoughts.sort((a, b) => {
      const aT = a.createdAt?.toMillis?.() || 0;
      const bT = b.createdAt?.toMillis?.() || 0;
      return bT - aT;
    });

    return thoughts;
  }

  // ---- Subscribe to a user's thought ----
  static subscribeToThought(userId: string, cb: (thought: Thought | null) => void): () => void {
    const ref = doc(db, 'thoughts', userId);
    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) { cb(null); return; }
      const t = { id: snap.id, ...snap.data() } as Thought;
      cb(is24hValid(t.expiresAt) ? t : null);
    });
  }

  // ---- Delete thought ----
  static async deleteThought(userId: string): Promise<void> {
    await deleteDoc(doc(db, 'thoughts', userId));
  }
}
