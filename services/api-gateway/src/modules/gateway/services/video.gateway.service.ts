import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';

export interface VideoEventDto {
  id: string;
  routeId: string;
  vehicleId: string;
  timestamp: string;
  eventType: string;
  videoUrl: string;
  thumbnailUrl?: string;
}

export interface CreateVideoEventDto {
  vehicleId: string;
  routeId: string;
  schoolId: string;
  eventType: string;
  timestamp: string;
  durationSeconds: number;
  videoUrl: string;
  thumbnailUrl?: string;
}

export interface VideoEventsQueryDto {
  routeId?: string;
  vehicleId?: string;
  eventType?: string;
  schoolId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class VideoGatewayService {
  private readonly videoServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
  ) {
    this.videoServiceUrl =
      this.configService.getOrThrow<string>('VIDEO_SERVICE_URL');
  }

  async getVideoEvents(query: VideoEventsQueryDto): Promise<VideoEventDto[]> {
    const params = new URLSearchParams();
    if (query.routeId) params.append('routeId', query.routeId);
    if (query.vehicleId) params.append('vehicleId', query.vehicleId);
    if (query.eventType) params.append('eventType', query.eventType);
    if (query.schoolId) params.append('schoolId', query.schoolId);
    if (query.from) params.append('from', query.from);
    if (query.to) params.append('to', query.to);
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());

    const url = `${this.videoServiceUrl}/api/v1/video-events?${params.toString()}`;
    return this.httpClient.get<VideoEventDto[]>(url);
  }

  async getVideoEventById(id: string): Promise<VideoEventDto> {
    const url = `${this.videoServiceUrl}/api/v1/video-events/${id}`;
    return this.httpClient.get<VideoEventDto>(url);
  }

  async createVideoEvent(
    dto: CreateVideoEventDto,
  ): Promise<{ videoEventId: string }> {
    const url = `${this.videoServiceUrl}/api/v1/video-events`;
    return this.httpClient.post<{ videoEventId: string }>(url, dto);
  }
}
