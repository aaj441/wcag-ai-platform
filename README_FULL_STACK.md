# WCAG AI Platform - Complete Full-Stack Application 🚀

A comprehensive, production-ready WCAG (Web Content Accessibility Guidelines) compliance platform built with modern technologies. This platform helps organizations scan, monitor, and improve the accessibility of their websites and applications.

## 🏗️ Architecture Overview

This is a **full-stack monorepo** application consisting of:

- **Backend**: Express.js API with TypeScript, Prisma ORM, and PostgreSQL
- **Frontend**: Next.js with TypeScript, Tailwind CSS, and React
- **Real-time**: WebSocket connections for live scan progress
- **Security**: JWT authentication, rate limiting, and comprehensive validation
- **Accessibility**: Built with accessibility as a first-class concern

## ✨ Key Features

### 🤖 AI-Powered Scanning
- **Automated WCAG Compliance Scanning** using Puppeteer and axe-core
- **Real-time Progress Updates** via WebSocket connections
- **Comprehensive Issue Detection** with severity classification
- **Multi-format Reports** (PDF, HTML, CSV, JSON)
- **Screenshot Capture** for visual documentation

### 👥 Multi-Tenant Architecture
- **Organizations & Projects** for team collaboration
- **Role-Based Access Control** (Admin, Owner, Member)
- **User Management** with email notifications
- **Audit Logging** for security and compliance

### 🎨 Modern Frontend
- **Responsive Design** with mobile-first approach
- **Dark Mode** with system preference detection
- **Accessibility Settings** (font size, contrast, reduced motion)
- **Real-time Notifications** (toast + browser notifications)
- **Keyboard Navigation** and screen reader support

### 🔒 Enterprise Security
- **JWT Authentication** with refresh tokens
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization
- **CORS Configuration** and security headers
- **SQL Injection Prevention** with Prisma ORM

## 📁 Project Structure

```
wcag-ai-platform/
├── packages/
│   ├── api/                    # Backend Application
│   │   ├── src/
│   │   │   ├── index.ts        # Main server file
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── routes/         # API routes
│   │   │   ├── services/       # Business logic
│   │   │   ├── utils/          # Utility functions
│   │   │   └── contexts/       # Context providers
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema
│   │   └── package.json        # Backend dependencies
│   └── frontend/               # Frontend Application
│       ├── src/
│       │   ├── pages/          # Next.js pages
│       │   ├── components/     # React components
│       │   ├── contexts/       # React contexts
│       │   ├── hooks/          # Custom hooks
│       │   ├── utils/          # Utility functions
│       │   └── styles/         # CSS styles
│       ├── public/             # Static assets
│       └── package.json        # Frontend dependencies
├── docker-compose.yml          # Development environment
├── railway.toml               # Railway deployment config
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL database
- Redis server (for caching and real-time features)
- Git and GitHub CLI

### 1. Clone the Repository
```bash
gh repo clone aaj441/wcag-ai-platform
cd wcag-ai-platform
git checkout full-stack-implementation
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd packages/api && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 3. Environment Setup

#### Backend Environment
```bash
cd packages/api
cp .env.example .env
```

Configure the following variables in `.env`:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/wcag_ai_platform"

# Server
PORT=3001
NODE_ENV=development
API_VERSION=v1

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Puppeteer
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=30000
```

#### Frontend Environment
```bash
cd packages/frontend
cp .env.local.example .env.local
```

Configure the following variables in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Database Setup
```bash
cd packages/api

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database (optional)
npm run db:seed
```

### 5. Start Development Servers

#### Start Backend
```bash
cd packages/api
npm run dev
```
The backend will be available at `http://localhost:3001`

#### Start Frontend
```bash
cd packages/frontend
npm run dev
```
The frontend will be available at `http://localhost:3000`

### 6. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/v1/docs

## 📊 Available Features

### 🔐 Authentication
- User registration and login
- JWT-based authentication
- Password reset functionality
- Profile management
- Session management

### 🌐 Website Scanning
- URL accessibility scanning
- Real-time progress tracking
- WCAG 2.1 compliance checking
- Issue severity classification
- Screenshot capture
- Custom scan options

### 📈 Dashboard & Analytics
- Accessibility score overview
- Scan history and trends
- Issue breakdown by severity
- Organization-level analytics
- Performance metrics

### 🏢 Organization Management
- Multi-tenant support
- Team member invitations
- Role-based permissions
- Project organization
- Usage tracking

### 📋 Reporting
- PDF report generation
- HTML interactive reports
- CSV data export
- JSON API export
- Custom report templates

### 🔔 Notifications
- Real-time scan updates
- Email notifications
- Browser push notifications
- System announcements
- Activity alerts

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Authentication**: JWT with refresh tokens
- **Scanning**: Puppeteer + axe-core
- **Email**: Nodemailer
- **Real-time**: WebSocket (Socket.io)
- **Validation**: Joi, express-validator

### Frontend
- **Framework**: Next.js 13+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context, Zustand
- **Data Fetching**: React Query, SWR
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast
- **Animations**: Framer Motion
- **Real-time**: Socket.io Client

### DevOps & Deployment
- **Containerization**: Docker
- **Deployment**: Railway, Vercel
- **CI/CD**: GitHub Actions
- **Monitoring**: Winston logging
- **Security**: Helmet, CORS, rate limiting

## 🔧 Development Commands

### Backend Commands
```bash
cd packages/api

npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Run linter
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
```

### Frontend Commands
```bash
cd packages/frontend

npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linter
npm run type-check   # TypeScript checking
npm run test         # Run tests
npm run analyze      # Bundle analysis
```

## 🚀 Deployment

### Railway Deployment
```bash
# Configure environment variables in Railway
# Deploy backend
cd packages/api && railway up

# Deploy frontend
cd packages/frontend && railway up
```

### Manual Deployment
```bash
# Build backend
cd packages/api && npm run build

# Build frontend
cd packages/frontend && npm run build

# Deploy to your preferred hosting platform
```

## 🧪 Testing

### Backend Testing
```bash
cd packages/api
npm run test              # Run unit tests
npm run test:coverage     # Run tests with coverage
npm run test:watch        # Run tests in watch mode
```

### Frontend Testing
```bash
cd packages/frontend
npm run test              # Run component tests
npm run test:e2e          # Run end-to-end tests
npm run test:coverage     # Run tests with coverage
```

## 🔒 Security Features

- **Authentication**: JWT with secure token handling
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Prevent abuse and attacks
- **SQL Injection Prevention**: Parameterized queries with Prisma
- **XSS Protection**: Input sanitization and output encoding
- **CSRF Protection**: CSRF tokens and secure headers
- **Security Headers**: Helmet middleware for security headers

## ♿ Accessibility Features

- **WCAG 2.1 AA Compliance**: Built to accessibility standards
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Keyboard Navigation**: Full keyboard accessibility
- **High Contrast Mode**: Adjustable contrast settings
- **Font Size Control**: Adjustable text sizes
- **Reduced Motion**: Respect motion preferences
- **Focus Management**: Clear focus indicators
- **Color Blind Support**: Color blind friendly design

## 📈 Performance Features

- **Lazy Loading**: Code splitting and lazy loading
- **Caching**: Redis caching for improved performance
- **Image Optimization**: Optimized image loading
- **Bundle Optimization**: Optimized build sizes
- **Database Indexing**: Optimized database queries
- **CDN Support**: Static asset optimization
- **Service Worker**: Offline support (planned)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit them
4. Push to the branch: `git push origin feature-name`
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions
- **Email**: support@wcagplatform.com

## 🗺️ Roadmap

- [ ] Mobile app development
- [ ] Advanced AI-powered recommendations
- [ ] Integration with popular CMS platforms
- [ ] Advanced analytics and reporting
- [ ] Enterprise SSO integration
- [ ] Advanced workflow automation
- [ ] API rate limiting and usage tracking
- [ ] Advanced security features

---

**Built with ❤️ for a more accessible web**