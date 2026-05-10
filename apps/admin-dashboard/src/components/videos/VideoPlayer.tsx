import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import type { VideoEvent } from '../../types';
import { formatTimestamp, formatEventType } from '../../utils/formatters';

interface VideoPlayerProps {
  video: VideoEvent;
  onClose: () => void;
  routeName?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onClose, routeName }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dashboard-card rounded-2xl border border-dashboard-border max-w-4xl w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dashboard-border">
          <div>
            <h3 className="text-lg font-bold text-white">{formatEventType(video.eventType)}</h3>
            <p className="text-sm text-slate-400">
              {video.vehicleId} • {formatTimestamp(video.timestamp)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={video.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={18} className="text-slate-400" />
            </a>
            <a
              href={video.videoUrl}
              download
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              title="Download"
            >
              <Download size={18} className="text-slate-400" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={18} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Video */}
        <div className="aspect-video bg-black">
          <video src={video.videoUrl} controls autoPlay className="w-full h-full">
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Info */}
        <div className="p-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Route</p>
            <p className="text-white font-medium">{routeName || 'Unknown Route'}</p>
          </div>
          <div>
            <p className="text-slate-500">Vehicle</p>
            <p className="text-white font-medium">{video.vehicleId}</p>
          </div>
          <div>
            <p className="text-slate-500">Duration</p>
            <p className="text-white font-medium">
              {video.durationSeconds
                ? `${Math.floor(video.durationSeconds / 60)}:${String(video.durationSeconds % 60).padStart(2, '0')}`
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
