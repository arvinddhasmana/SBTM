# Video Capture Integration Service

## 🎥 Overview

The Video Capture Integration Service is a standalone microservice for the School Bus Transport Management System (SBTM). It handles video event creation, secure upload/download, metadata storage, and real-time notifications for emergency and incident recordings.

## ✨ Features

- **Video Event Management**: Create, track, and manage video events from drivers
- **Secure Upload/Download**: Presigned URLs for secure video and thumbnail uploads
- **Multiple Storage Backends**: Support for MinIO (S3-compatible) and local storage
- **Real-time Notifications**: WebSocket support for live video event updates
- **Access Logging**: Complete audit trail of video access
- **Flexible Querying**: Filter and paginate video events by multiple criteria
- **RESTful API**: Clean, versioned API design

## 🏗️ Architecture

### Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with TypeORM
- **Object Storage**: MinIO (S3-compatible) or local storage
- **Real-time**: Socket.IO WebSockets
- **Testing**: Jest (Unit, Integration, E2E)

### Module Structure

```
src/
├── modules/
│   ├── video-events/     # Core video event logic
│   ├── upload/           # File upload handling
│   ├── storage/          # Storage abstraction (MinIO/Local)
│   └── realtime/         # WebSocket gateway
├── app.module.ts
└── main.ts
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- MinIO (optional, for S3-compatible storage)
- Docker & Docker Compose (optional)

### Installation

1. **Install dependencies**:

```bash
pnpm install
```

2. **Configure environment**:

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Run database migrations** (auto-sync enabled in development):

```bash
pnpm run start:dev
```

### Running the Service

**Development mode**:

```bash
pnpm run start:dev
```

**Production mode**:

```bash
pnpm run build
pnpm run start:prod
```

**Docker Compose** (recommended):

```bash
docker-compose up -d
```

## 📡 API Endpoints

### Video Events

#### Create Video Event

```http
POST /api/v1/video-events
Content-Type: application/json

{
  "vehicleId": "bus-123",
  "routeId": "route-456",
  "driverId": "driver-789",
  "timestamp": "2025-01-10T14:25:10Z",
  "eventType": "EMERGENCY",
  "durationSeconds": 20
}
```

**Response**:

```json
{
  "videoEventId": "uuid",
  "uploadUrl": "https://...",
  "thumbnailUploadUrl": "https://..."
}
```

#### Complete Video Upload

```http
POST /api/v1/video-events/{id}/complete
Content-Type: application/json

{
  "videoUrl": "https://storage.example.com/video.mp4",
  "thumbnailUrl": "https://storage.example.com/thumb.jpg"
}
```

#### List Video Events

```http
GET /api/v1/video-events?vehicleId=bus-123&page=1&limit=10
```

#### Get Video Event

```http
GET /api/v1/video-events/{id}
X-User-Id: user-123
```

**Response includes secure playback URL**:

```json
{
  "id": "uuid",
  "vehicleId": "bus-123",
  "status": "READY",
  "playbackUrl": "https://...",
  ...
}
```

#### Delete Video Event

```http
DELETE /api/v1/video-events/{id}
```

### WebSocket Events

Connect to `/ws/video-events`:

```javascript
const socket = io('http://localhost:3005/ws/video-events');

// Subscribe to events
socket.emit('subscribe', { userId: 'user-123', role: 'ADMIN' });

// Listen for new video events
socket.on('new-video-event', (event) => {
  console.log('New video event:', event);
});

// Listen for status changes
socket.on('video-event-status-change', (event) => {
  console.log('Status changed:', event);
});
```

## 🧪 Testing

### Unit Tests

```bash
pnpm run test
```

### Integration Tests

```bash
pnpm run test:integration
```

### E2E Tests

```bash
pnpm run test:e2e
```

### Test Coverage

```bash
pnpm run test:cov
```

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t video-service:latest .
```

### Run Container

```bash
docker run -p 3005:3005 \
  -e DB_HOST=postgres \
  -e MINIO_ENDPOINT=minio \
  video-service:latest
```

### Docker Compose

```bash
docker-compose up -d
```

This starts:

- Video Service (port 3005)
- PostgreSQL (port 5432)
- MinIO (port 9000, console: 9001)

## 🔧 Configuration

### Environment Variables

| Variable               | Description                          | Default         |
| ---------------------- | ------------------------------------ | --------------- |
| `PORT`                 | Service port                         | `3005`          |
| `DB_HOST`              | PostgreSQL host                      | `localhost`     |
| `DB_PORT`              | PostgreSQL port                      | `5432`          |
| `DB_USERNAME`          | Database username                    | `postgres`      |
| `DB_PASSWORD`          | Database password                    | `postgres`      |
| `DB_DATABASE`          | Database name                        | `video_service` |
| `STORAGE_TYPE`         | Storage backend (`minio` or `local`) | `minio`         |
| `MINIO_ENDPOINT`       | MinIO endpoint                       | `localhost`     |
| `MINIO_PORT`           | MinIO port                           | `9000`          |
| `MINIO_ACCESS_KEY`     | MinIO access key                     | `minioadmin`    |
| `MINIO_SECRET_KEY`     | MinIO secret key                     | `minioadmin`    |
| `MINIO_BUCKET_NAME`    | S3 bucket name                       | `videos`        |
| `PRESIGNED_URL_EXPIRY` | URL expiry (seconds)                 | `3600`          |

## 📊 Database Schema

### VideoEvent

- `id`: UUID (PK)
- `vehicleId`: string
- `routeId`: string
- `driverId`: string
- `timestamp`: timestamp
- `eventType`: enum (EMERGENCY, INCIDENT, MANUAL)
- `durationSeconds`: integer
- `videoUrl`: string (nullable)
- `thumbnailUrl`: string (nullable)
- `status`: enum (UPLOADING, READY, FAILED)
- `createdAt`: timestamp
- `updatedAt`: timestamp

### VideoAccessLog

- `id`: UUID (PK)
- `videoEventId`: UUID (FK)
- `userId`: string
- `timestamp`: timestamp
- `ipAddress`: string

## 🔒 Security

- **Presigned URLs**: All uploads/downloads use time-limited presigned URLs
- **Access Logging**: Every video access is logged with user and IP
- **No Public URLs**: Videos are never publicly accessible
- **Input Validation**: All inputs validated using class-validator
- **CORS**: Configurable CORS settings

## 📈 Monitoring

### Health Check

```http
GET /api/v1/health
```

Returns service status and timestamp.

### Logging

Structured JSON logging with different levels:

- Application events
- Database queries (configurable)
- Access logs
- Error tracking

## 🛠️ Development

### Code Quality

```bash
pnpm run lint          # Run ESLint
pnpm run format        # Format with Prettier
```

### Database Migrations

In production, disable `DB_SYNCHRONIZE` and use TypeORM migrations:

```bash
pnpm run migration:generate -- -n MigrationName
pnpm run migration:run
```

## 🚦 Roadmap

### Current (MVP)

- ✅ Video event creation and management
- ✅ Secure upload/download with presigned URLs
- ✅ MinIO and local storage support
- ✅ Real-time WebSocket notifications
- ✅ Access logging and audit trail

### Future Enhancements

- [ ] Automatic thumbnail generation
- [ ] Video transcoding for multiple formats
- [ ] AI-based video analysis (incident detection)
- [ ] Integration with enterprise DVR systems
- [ ] Video retention policies and auto-deletion
- [ ] Advanced search and filtering
- [ ] Video streaming optimization

## 📝 License

UNLICENSED - Private project

## 👥 Support

For issues or questions, contact the development team.
