// Snuggle Moments Service — 24h stories with views, likes, comments
import { db } from './firebase';
import {
  doc, collection, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, Timestamp, increment
} from 'firebase/firestore';
import { Moment, MomentView, MomentLike, MomentComment } from '../types';
import { uploadFile, compressImage, generateVideoThumbnail } from './fileUpload';

// ==================== HELPERS ====================

function is24hValid(expiresAt: any): boolean {
  if (!expiresAt) return false;
  const exp = expiresAt.toMillis ? expiresAt.toMillis() : expiresAt;
  return exp > Date.now();
}

function get24hFromNow(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

// ==================== SERVICE ====================

export class MomentService {

  // ---- Create Moment ----
  static async createMoment(
    userId: string,
    type: Moment['type'],
    media?: File | Blob,
    textOverlay?: string,
    mentions?: string[],
    filter?: string
  ): Promise<Moment> {
    let mediaUrl: string | undefined;
    let thumbnailUrl: string | undefined;

    if (media && (type === 'image' || type === 'layout')) {
      // Compress image to 1080p WebP
      const compressed = await compressImage(media as File, 1080, 0.85);
      const result = await uploadFile(compressed, userId, undefined, 'moment.webp');
      mediaUrl = result.url;
      thumbnailUrl = result.thumbnailUrl || result.url;
    } else if (media && type === 'video') {
      // Upload video + generate thumbnail
      const result = await uploadFile(media as File, userId, undefined, 'moment.mp4');
      mediaUrl = result.url;
      try {
        const thumb = await generateVideoThumbnail(media);
        const thumbResult = await uploadFile(thumb, userId, undefined, 'moment_thumb.webp');
        thumbnailUrl = thumbResult.url;
      } catch {
        thumbnailUrl = result.thumbnailUrl || result.url;
      }
    }

    const momentData = {
      userId,
      type,
      mediaUrl: mediaUrl || null,
      thumbnailUrl: thumbnailUrl || null,
      textOverlay: textOverlay || null,
      mentions: mentions || [],
      filter: filter || null,
      viewCount: 0,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(get24hFromNow()),
    };

    const ref = await addDoc(collection(db, 'moments'), momentData);
    return { id: ref.id, ...momentData } as unknown as Moment;
  }

  // ---- Get user's active moments ----
  static async getMoments(userId: string): Promise<Moment[]> {
    const q = query(
      collection(db, 'moments'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }) as Moment)
      .filter(m => is24hValid(m.expiresAt));
  }

  // ---- Get feed moments (from list of user IDs) ----
  static async getFeedMoments(userIds: string[]): Promise<Map<string, Moment[]>> {
    const result = new Map<string, Moment[]>();
    if (userIds.length === 0) return result;

    // Firestore `in` queries limited to 30 items
    const chunks: string[][] = [];
    for (let i = 0; i < userIds.length; i += 30) {
      chunks.push(userIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const q = query(
        collection(db, 'moments'),
        where('userId', 'in', chunk),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const moment = { id: d.id, ...d.data() } as Moment;
        if (!is24hValid(moment.expiresAt)) continue;
        const existing = result.get(moment.userId) || [];
        existing.push(moment);
        result.set(moment.userId, existing);
      }
    }

    return result;
  }

  // ---- Subscribe to user's moments ----
  static subscribeToUserMoments(userId: string, cb: (moments: Moment[]) => void): () => void {
    const q = query(
      collection(db, 'moments'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      const moments = snap.docs
        .map(d => ({ id: d.id, ...d.data() }) as Moment)
        .filter(m => is24hValid(m.expiresAt));
      cb(moments);
    });
  }

  // ---- Record view ----
  static async recordView(momentId: string, viewerId: string): Promise<void> {
    const viewRef = doc(db, 'moments', momentId, 'views', viewerId);
    const existing = await getDoc(viewRef);
    if (existing.exists()) return; // Already viewed

    await Promise.all([
      // Add view record
      import('firebase/firestore').then(({ setDoc }) =>
        setDoc(viewRef, { momentId, viewerId, viewedAt: serverTimestamp() })
      ),
      // Increment view count
      updateDoc(doc(db, 'moments', momentId), { viewCount: increment(1) }),
    ]);
  }

  // ---- Check if user viewed a moment ----
  static async hasViewed(momentId: string, viewerId: string): Promise<boolean> {
    const viewRef = doc(db, 'moments', momentId, 'views', viewerId);
    const snap = await getDoc(viewRef);
    return snap.exists();
  }

  // ---- Get viewers of a moment ----
  static async getViewers(momentId: string): Promise<MomentView[]> {
    const q = query(collection(db, 'moments', momentId, 'views'), orderBy('viewedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as MomentView);
  }

  // ---- Toggle like ----
  static async toggleLike(momentId: string, userId: string): Promise<boolean> {
    const likeRef = doc(db, 'moments', momentId, 'likes', userId);
    const existing = await getDoc(likeRef);

    if (existing.exists()) {
      await deleteDoc(likeRef);
      return false; // Unliked
    } else {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(likeRef, { momentId, userId, createdAt: serverTimestamp() });
      return true; // Liked
    }
  }

  // ---- Check if liked ----
  static async isLiked(momentId: string, userId: string): Promise<boolean> {
    const likeRef = doc(db, 'moments', momentId, 'likes', userId);
    const snap = await getDoc(likeRef);
    return snap.exists();
  }

  // ---- Add comment ----
  static async addComment(momentId: string, userId: string, text: string): Promise<MomentComment> {
    const data = { momentId, userId, text, createdAt: serverTimestamp() };
    const ref = await addDoc(collection(db, 'moments', momentId, 'comments'), data);
    return { id: ref.id, ...data } as unknown as MomentComment;
  }

  // ---- Get comments ----
  static async getComments(momentId: string): Promise<MomentComment[]> {
    const q = query(
      collection(db, 'moments', momentId, 'comments'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as MomentComment);
  }

  // ---- Delete moment ----
  static async deleteMoment(momentId: string): Promise<void> {
    await deleteDoc(doc(db, 'moments', momentId));
  }

  // ---- Get viewed moment IDs for a user ----
  static async getViewedMomentIds(userId: string, momentIds: string[]): Promise<Set<string>> {
    const viewed = new Set<string>();
    // Check each moment's views subcollection (batched)
    const promises = momentIds.map(async (mid) => {
      const viewRef = doc(db, 'moments', mid, 'views', userId);
      const snap = await getDoc(viewRef);
      if (snap.exists()) viewed.add(mid);
    });
    await Promise.all(promises);
    return viewed;
  }
}
