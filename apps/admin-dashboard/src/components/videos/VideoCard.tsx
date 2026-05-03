import React from 'react';
import { Video, Clock, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VideoEvent } from '../../types';
import { formatRelativeTime, formatEventType } from '../../utils/formatters';

interface VideoCardProps {
  video: VideoEvent;
  onClick?: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onClick }) => {
  const { t } = useTranslation(['routes']);
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className="p-4 bg-dashboard-card border border-dashboard-border rounded-xl hover:bg-slate-800 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="relative w-32 h-20 bg-dashboard-bg rounded-lg overflow-hidden flex-shrink-0">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt="Video thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video size={24} className="text-slate-500" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <div className="w-0 h-0 border-l-[10px] border-l-white border-y-[6px] border-y-transparent ml-1" />
            </div>
          </div>
          {video.durationSeconds && (
            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
              {Math.floor(video.durationSeconds / 60)}:
              {String(video.durationSeconds % 60).padStart(2, '0')}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white mb-1">{formatEventType(video.eventType)}</h4>
          <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1">
              <Truck size={12} />
              {video.vehicleId}
            </span>
            <span>{t('routes:videoCard.routeLabel', { id: video.routeId })}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock size={12} />
            {formatRelativeTime(video.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
