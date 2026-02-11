# Driver App

## 🚌 Overview

The Driver App is the mobile companion for school bus drivers in the SBMS ecosystem. It provides route navigation, student presence logging, and emergency alert triggering capabilities.

## ✨ Features

- **Route Navigation**: Maps and turn-by-turn guidance
- **Presence Logging**: Manual check-in/check-out for students
- **Emergency Mode**: One-tap panic button and breakdown reporting
- **Schedule View**: Daily route assignments
- **Profile Management**: Driver status and shift tracking

## 🏗️ Architecture

### Tech Stack
- **Framework**: React Native (Expo)
- **State Management**: Zustand
- **Navigation**: React Navigation
- **Maps**: React Native Maps
- **Storage**: Expo Secure Store

### Module Structure
```
src/
├── app/              # Navigation & Screens
├── components/       # UI Components
├── store/            # Zustand stores
├── services/         # API integration
└── hooks/            # Custom hooks
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Expo CLI
- Android Studio / Xcode (for simulators)

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Start Metro Bundler**:
```bash
npm start
```

### Running

- **Android**: `npm run android`
- **iOS**: `npm run ios`
- **Web**: `npm run web`

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

## 🔧 Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | API Gateway base URL (include `/api/v1`) |

## 🔒 Security

- Secure storage for authentication tokens
- Biometric authentication scope (planned)

## 📝 License

UNLICENSED - Private project
