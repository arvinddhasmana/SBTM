import React from 'react';
import type { VideoEvent } from '../../types';
import VideoCard from './VideoCard';

interface VideoListProps {
  videos: VideoEvent[];
  onVideoClick?: (video: VideoEvent) => void;
  emptyMessage?: string;
  routeNames?: Record<string, string>;
}

const VideoList: React.FC<VideoListProps> = ({
  videos,
  onVideoClick,
  emptyMessage = 'No video events',
  routeNames = {},
}) => {
  if (videos.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onClick={() => onVideoClick?.(video)}
          routeName={routeNames[video.routeId]}
        />
      ))}
    </div>
  );
};

export default VideoList;
