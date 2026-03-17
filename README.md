# Smart Water Management System

An AI-powered web application for controlling and monitoring water distribution across different zones in a house.

## Features

- Zone-based water control (kitchen, bathroom, garden, etc.)
- Precise water deployment (1-1000 liters per zone)
- Real-time monitoring and progress tracking
- AI-powered recommendations for water savings
- Emergency shutoff capability
- Responsive web design (mobile, tablet, desktop)

## Tech Stack

**Frontend:**
- React 18 with TypeScript
- Material-UI (MUI)
- Recharts for data visualization
- Socket.io-client for real-time updates
- Vite for build tooling

**Backend:**
- Node.js with Express
- TypeScript
- PostgreSQL for data persistence
- Redis for real-time state management
- Socket.io for WebSocket communication
- MQTT for IoT device communication

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment files:
   ```bash
   cp packages/backend/.env.example packages/backend/.env
   cp packages/frontend/.env.example packages/frontend/.env
   ```

4. Start PostgreSQL and Redis:
   ```bash
   npm run docker:up
   ```

5. Start development servers:
   ```bash
   npm run dev
   ```

The frontend will be available at http://localhost:3000
The backend API will be available at http://localhost:3001

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both packages for production
- `npm run test` - Run tests in all packages
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier
- `npm run docker:up` - Start PostgreSQL and Redis containers
- `npm run docker:down` - Stop and remove containers

## Project Structure

```
smart-water-management/
├── packages/
│   ├── backend/          # Node.js/Express backend
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/         # React frontend
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── docker-compose.yml    # PostgreSQL and Redis setup
├── package.json          # Root package with workspaces
└── README.md
```

## Development

This project uses a monorepo structure with npm workspaces. Each package (frontend and backend) can be developed independently.

### Testing

Run tests with:
```bash
npm run test
```

The project uses Jest for unit testing and fast-check for property-based testing.

### Code Quality

- ESLint for linting
- Prettier for code formatting
- Husky for Git hooks
- lint-staged for pre-commit checks

## License

MIT
