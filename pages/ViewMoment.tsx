import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MomentViewer from '../components/moments/MomentViewer';
import { Moment, User } from '../types';

interface ViewMomentProps {
  currentUser: User;
}

const ViewMoment: React.FC<ViewMomentProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<{ user: User; moments: Moment[] }[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);

  useEffect(() => {
    try {
      const feedStr = sessionStorage.getItem('momentViewerFeed');
      const indexStr = sessionStorage.getItem('momentViewerIndex');
      if (feedStr) {
        setFeed(JSON.parse(feedStr));
        setInitialIndex(parseInt(indexStr || '0', 10));
      } else {
        navigate('/messages');
      }
    } catch {
      navigate('/messages');
    }
  }, [navigate]);

  const handleClose = () => {
    sessionStorage.removeItem('momentViewerFeed');
    sessionStorage.removeItem('momentViewerIndex');
    sessionStorage.removeItem('momentViewerCurrentUserId');
    navigate('/messages');
  };

  const handleReply = (moment: Moment, userId: string) => {
    handleClose();
    navigate(`/chat/${userId}`);
  };

  if (feed.length === 0) return null;

  return (
    <MomentViewer
      feed={feed}
      initialUserIndex={initialIndex}
      currentUserId={currentUser.id}
      onClose={handleClose}
      onReply={handleReply}
    />
  );
};

export default ViewMoment;
