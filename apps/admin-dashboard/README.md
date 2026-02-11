# Admin Dashboard

## 🖥️ Overview

The Admin Dashboard is the command center for the School Bus Transport Management System (SBMS). It allows school administrators to manage routes, track vehicles in real-time, view alerts, and handle student and driver data.

## ✨ Features

- **Real-time Map**: Live tracking of all buses using Leaflet
- **Fleet Management**: CRUD operations for buses and drivers
- **Route Optimization**: Creation and modification of bus routes
- **Alert Monitoring**: Dashboard for active emergency alerts
- **Analytics**: Charts and graphs for system usage and performance via Recharts

## 🏗️ Architecture

### Tech Stack
- **Framework**: React 19 (Vite)
- **Styling**: TailwindCSS
- **Maps**: React Leaflet
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP**: Axios
- **Testing**: Vitest + React Testing Library

### Module Structure
```
src/
├── components/       # Reusable UI components
├── pages/            # Page layouts
├── hooks/            # Custom React hooks
├── services/         # API integration
└── utils/            # Helper functions
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Start development server**:
```bash
npm run dev
```

3. **Build for production**:
```bash
npm run build
```

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

## 🔧 Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API Gateway base URL (default: `http://localhost:3001`) |

## 🔒 Security

- JWT-based authentication with gateway-backed data
- Protected routes (Admin role only)

## 📝 License

UNLICENSED - Private project
