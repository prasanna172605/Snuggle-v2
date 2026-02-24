import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Moment } from '../types';
import { Plus } from 'lucide-react';
import { MomentService } from '../services/momentService';

interface StoriesRowProps {
  currentUser: User;
  chatUsers: User[];
}

interface UserMomentGroup {
  user: User;
  moments: Moment[];
  hasUnviewed: boolean;
}

const StoriesRow: React.FC<StoriesRowProps> = ({ currentUser, chatUsers }) => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<UserMomentGroup[]>([]);
  const [ownMoments, setOwnMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMoments = async () => {
      try {
        const allUserIds = [currentUser.id, ...chatUsers.map(u => u.id)];
        const momentMap = await MomentService.getFeedMoments(allUserIds);

        setOwnMoments(momentMap.get(currentUser.id) || []);

        const userGroups: UserMomentGroup[] = [];
        for (const user of chatUsers) {
          const userMoments = momentMap.get(user.id);
          if (userMoments && userMoments.length > 0) {
            const viewedIds = await MomentService.getViewedMomentIds(
              currentUser.id,
              userMoments.map(m => m.id)
            );
            const hasUnviewed = userMoments.some(m => !viewedIds.has(m.id));
            userGroups.push({ user, moments: userMoments, hasUnviewed });
          }
        }

        userGroups.sort((a, b) => (a.hasUnviewed === b.hasUnviewed ? 0 : a.hasUnviewed ? -1 : 1));
        setGroups(userGroups);
      } catch (err) {
        console.error('Failed to load moments:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMoments();
  }, [currentUser.id, chatUsers]);

  const openViewer = (userIndex: number) => {
    const feed = groups.map(g => ({ user: g.user, moments: g.moments }));
    sessionStorage.setItem('momentViewerFeed', JSON.stringify(feed));
    sessionStorage.setItem('momentViewerIndex', String(userIndex));
    sessionStorage.setItem('momentViewerCurrentUserId', currentUser.id);
    navigate('/moments/view');
  };

  const openOwnViewer = () => {
    if (ownMoments.length === 0) {
      navigate('/moments/create');
      return;
    }
    const feed = [{ user: currentUser, moments: ownMoments }];
    sessionStorage.setItem('momentViewerFeed', JSON.stringify(feed));
    sessionStorage.setItem('momentViewerIndex', '0');
    sessionStorage.setItem('momentViewerCurrentUserId', currentUser.id);
    navigate('/moments/view');
  };

  const getAvatar = (u: User) => u.avatar || u.photoURL || '';
  const getInitial = (u: User) => (u.fullName || u.username || '?')[0].toUpperCase();
  const getFirstName = (u: User) => (u.fullName || u.username || '').split(' ')[0];

  return (
    <div className="px-3 py-2.5">
      <div
        className="flex gap-4 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* ========== YOUR STORY ========== */}
        <button
          onClick={ownMoments.length > 0 ? openOwnViewer : () => navigate('/moments/create')}
          className="flex flex-col items-center gap-1 flex-shrink-0 w-[68px]"
        >
          <div className="relative">
            {/* Gradient ring for own moments */}
            <div className={`w-[68px] h-[68px] rounded-full p-[3px] ${
              ownMoments.length > 0
                ? 'bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600'
                : ''
            }`}>
              <div className={`w-full h-full rounded-full overflow-hidden ${
                ownMoments.length > 0 ? 'border-[2.5px] border-black' : 'border-[2.5px] border-zinc-800'
              }`}>
                {getAvatar(currentUser) ? (
                  <img
                    src={getAvatar(currentUser)}
                    alt="You"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-zinc-300 font-bold text-lg">
                    {getInitial(currentUser)}
                  </div>
                )}
              </div>
            </div>

            {/* Plus badge if no moments */}
            {ownMoments.length === 0 && (
              <div className="absolute -bottom-0.5 -right-0.5 w-[22px] h-[22px] rounded-full bg-blue-500 border-[2.5px] border-black flex items-center justify-center">
                <Plus className="w-3 h-3 text-white stroke-[3px]" />
              </div>
            )}
          </div>
          <span className="text-[11px] font-medium text-zinc-400 truncate w-full text-center leading-tight">
            Add mom...
          </span>
        </button>

        {/* ========== OTHER USERS' STORIES ========== */}
        {groups.map((group, index) => (
          <button
            key={group.user.id}
            onClick={() => openViewer(index)}
            className="flex flex-col items-center gap-1 flex-shrink-0 w-[68px]"
          >
            {/* Gradient ring: colorful if unviewed, gray if viewed */}
            <div className={`w-[68px] h-[68px] rounded-full p-[3px] ${
              group.hasUnviewed
                ? 'bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600'
                : 'bg-zinc-600'
            }`}>
              <div className="w-full h-full rounded-full overflow-hidden border-[2.5px] border-black">
                {getAvatar(group.user) ? (
                  <img
                    src={getAvatar(group.user)}
                    alt={group.user.username || ''}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-zinc-400 font-bold text-lg">
                    {getInitial(group.user)}
                  </div>
                )}
              </div>
            </div>
            <span className={`text-[11px] font-medium truncate w-full text-center leading-tight ${
              group.hasUnviewed ? 'text-zinc-200' : 'text-zinc-500'
            }`}>
              {getFirstName(group.user)}
            </span>
          </button>
        ))}

        {/* Skeleton loaders */}
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={`skel-${i}`} className="flex flex-col items-center gap-1 flex-shrink-0 w-[68px] animate-pulse">
            <div className="w-[68px] h-[68px] rounded-full bg-zinc-800" />
            <div className="w-10 h-2.5 rounded bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoriesRow;
