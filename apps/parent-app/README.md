# Parent App

## 👨‍👩‍👧‍👦 Overview

The Parent App enables guardians to track their children's school bus journey in real-time. It provides peace of mind through live notifications, ETAs, and viewing attendance history.

## ✨ Features

- **Live Tracking**: Real-time map view of the child's bus
- **Notifications**: Push alerts for boarding, alighting, and delays
- **Attendance History**: Log of past trips
- **ETA Updates**: Estimated arrival time at drop-off points

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js (React)
- **Styling**: CSS Modules / Tailwind (Configurable)
- **HTTP**: Fetch API / Axios

### Module Structure
```
src/
├── app/              # Next.js App Router
├── components/       # UI Components
├── lib/              # Utilities
└── services/         # API calls
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
| `NEXT_PUBLIC_API_URL` | API Gateway URL |

## 🔒 Security

- Secure login flow
- Data privacy (child visibility restricted to parent)

## 📝 License

UNLICENSED - Private project
