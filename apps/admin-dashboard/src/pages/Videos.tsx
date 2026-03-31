import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter } from 'lucide-react';
import { Header, Card, LoadingSpinner } from '../components/common';
import { VideoList, VideoPlayer } from '../components/videos';
import { videoApi, routesApi } from '../services/api';
import { queryKeys } from '../services/query-keys';
import type { VideoEvent, Route } from '../types';

const Videos: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState<VideoEvent | null>(null);
  const [filterRoute, setFilterRoute] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.videos.events(), 'with-routes'],
    queryFn: async () => {
      const [videosData, routesData] = await Promise.all([
        videoApi.getVideoEvents(),
        routesApi.getAllRoutes(),
      ]);
      return { videos: videosData, routes: routesData };
    },
  });

  const videos = data?.videos ?? [];
  const routes = data?.routes ?? [];

  const eventTypes = [...new Set(videos.map((v) => v.eventType))];

  const filteredVideos = videos.filter((video) => {
    let matches = true;
    if (filterRoute !== 'all') matches = video.routeId === filterRoute;
    if (filterType !== 'all') matches = matches && video.eventType === filterType;
    return matches;
  });

  if (isLoading) {
    return (
      <>
        <Header title="Videos" />
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" text="Loading video events..." />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Video Event Review" subtitle={`${videos.length} video events`} />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Filter size={18} />
              <span className="font-medium">Filters:</span>
            </div>

            <select
              value={filterRoute}
              onChange={(e) => setFilterRoute(e.target.value)}
              className="px-4 py-2 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm"
            >
              <option value="all">All Routes</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm"
            >
              <option value="all">All Event Types</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {(filterRoute !== 'all' || filterType !== 'all') && (
              <button
                onClick={() => {
                  setFilterRoute('all');
                  setFilterType('all');
                }}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                Clear Filters
              </button>
            )}
          </div>
        </Card>

        {/* Videos List */}
        <Card title={`Video Events (${filteredVideos.length})`}>
          <VideoList
            videos={filteredVideos}
            onVideoClick={setSelectedVideo}
            emptyMessage="No video events found"
          />
        </Card>
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
    </>
  );
};

export default Videos;
