# LeetCode Student Progress Tracker

A comprehensive LeetCode performance tracking and analytics platform designed to provide students with deep insights into their coding journey, featuring automated weekly progress calculations and detailed performance metrics.

## 🚀 Live Demo


## ✨ Features

- **Real-time Progress Tracking**: Automated LeetCode data synchronization
- **Comprehensive Dashboards**: Student and admin analytics panels
- **Batch Management**: Support for multiple student cohorts
- **Achievement System**: Automated badge awarding for milestones
- **Weekly Progress Reports**: Detailed increment tracking and analysis
- **Leaderboards**: Competitive rankings and progression tracking
- **Activity Heatmaps**: GitHub-style coding activity visualization
- **CSV Data Import**: Flexible weekly progress import system

## 🛠 Tech Stack

### Frontend
- **React** with TypeScript
- **Wouter** for routing
- **TanStack Query** for state management
- **Radix UI** + **shadcn/ui** for components
- **Tailwind CSS** for styling
- **Recharts** for data visualization

### Backend
- **Node.js** with Express
- **TypeScript** (ES modules)
- **Drizzle ORM** for database operations
- **PostgreSQL** (Neon Database)
- **JWT Authentication** with bcrypt
- **LeetCode GraphQL API** integration

## 🚀 Quick Deploy to Render

### 1. One-Click Deploy
Click the "Deploy to Render" button above, or follow these steps:

### 2. Manual Deployment

1. **Fork this repository**
2. **Create a Neon Database**:
   - Sign up at [Neon.tech](https://neon.tech)
   - Create project: "leetcode-tracker-production"
   - Copy the connection string

3. **Deploy to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render auto-detects configuration from `render.yaml`

4. **Set Environment Variables**:
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=your_neon_connection_string
   ```

5. **Deploy**: Click "Create Web Service" and wait ~3-5 minutes

### 3. Post-Deployment Setup
1. Visit your deployed app
2. Login with admin credentials
3. Import student data via admin panel
4. Start LeetCode data synchronization

## 🏃‍♂️ Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL database (Neon recommended)

### Setup
```bash
# Clone repository
git clone <your-repo-url>
cd leetcode-tracker

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# Push database schema
npm run db:push

# Start development server
npm run dev
```

Access the app at `http://localhost:5000`

## 📁 Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route components
│   │   ├── contexts/    # React contexts
│   │   └── lib/         # Utilities and configs
├── server/              # Express backend
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic
│   ├── middleware/      # Auth and validation
│   └── db.ts           # Database connection
├── shared/              # Shared types and schemas
│   └── schema.ts       # Drizzle database schema
└── attached_assets/     # Static files and data
```

## 🔧 Configuration Files

- `render.yaml` - Render deployment configuration
- `deploy-simple.cjs` - Production build script
- `vite.config.ts` - Frontend build configuration
- `drizzle.config.ts` - Database migration config
- `.nvmrc` - Node.js version specification
- `Procfile` - Process configuration for Heroku compatibility

## 📊 Key Features

### Admin Dashboard
- Student management and data import
- Weekly progress upload (CSV)
- Batch-specific analytics
- Real-time sync controls
- System performance metrics

### Student Experience
- Personal progress tracking
- Peer comparison leaderboards
- Achievement badge system
- Activity heatmap visualization
- Weekly increment analysis

### Data Integration
- Automated LeetCode API synchronization
- Flexible CSV import system
- Real-time progress calculations
- Badge awarding automation
- Activity streak tracking

## 🔒 Security

- JWT-based authentication
- bcrypt password hashing
- Role-based access control
- SQL injection protection via Drizzle ORM
- Environment variable configuration
- HTTPS/SSL enforcement in production

## 🌐 Database Schema

- **Students**: Profile information and settings
- **Daily Progress**: Day-by-day LeetCode statistics
- **Weekly Progress**: Aggregated weekly metrics
- **Badges**: Achievement tracking
- **Settings**: Application configuration

## 📱 Responsive Design

Fully responsive interface optimized for:
- Desktop dashboards
- Tablet analytics viewing
- Mobile progress checking

## 🔄 API Endpoints

- `/api/auth/*` - Authentication
- `/api/students/*` - Student management
- `/api/dashboard/*` - Analytics data
- `/api/leaderboard/*` - Rankings
- `/api/badges/*` - Achievement system
- `/api/weekly-progress/*` - Progress tracking

## 🚀 Performance

- Optimized bundle splitting
- Lazy loading for large components
- Database query optimization
- CDN-ready static assets
- Gzip compression enabled

## 📞 Support

For deployment issues or questions:
- Check the deployment logs in Render dashboard
- Verify environment variables are set correctly
- Ensure database connection is working
- Review the [troubleshooting guide](RENDER_DEPLOYMENT_SETUP.md)

## 📄 License

MIT License - feel free to use this project for educational purposes.

---

**Ready to track your coding journey?** Deploy now and start analyzing your LeetCode progress!
