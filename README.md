# VibeQuest

VibeQuest is an AI-powered platform that helps users discover new interests and connect with friends who share similar passions. Powered by a sophisticated recommendation engine and real-time chat capabilities, VibeQuest creates personalized suggestions based on users' interests, location, and social connections.

## Features

- **Lena AI**: Advanced chatbot providing personalized recommendations
- **Interest Management**: Create and manage interest categories with ratings
- **Friend System**: Connect with others and share interests
- **Location-Based Recommendations**: Get suggestions based on your location
- **Tiered Subscription Model**: Free, Basic, and Premium plans
- **Real-Time Chat**: Interactive conversations with AI
- **Secure Authentication**: JWT-based authentication system
- **Payment Integration**: Secure payment processing with Stripe
- **Responsive Design**: Full mobile compatibility

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **AI Integration**: OpenAI API
- **Authentication**: JWT
- **Payment Processing**: Stripe
- **Email Service**: SendGrid
- **Geolocation**: OpenCage API

## Setup

1. Clone the repository
```bash
git clone [repository-url]
cd vibequest
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
# Backend (.env)
PORT=5000
DATABASE_URL=your_postgres_url
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret
OPENAI_API_KEY=your_openai_key
SENDGRID_API_KEY=your_sendgrid_key
OPENCAGE_API_KEY=your_opencage_key

# Frontend (.env)
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_public_key
```

4. Initialize database
```bash
psql -U postgres -f db.sql
```

5. Start the development servers
```bash
# Backend
npm run server

# Frontend
npm start
```

## API Documentation

### Authentication
- POST `/api/auth/login`: User login
- POST `/api/auth/signup`: User registration
- POST `/api/auth/forgot-password`: Password reset request
- POST `/api/auth/reset-password/:token`: Password reset

### User Management
- GET `/api/users/profile`: Get user profile
- PUT `/api/users/:userId/profile`: Update profile
- POST `/api/users/close-account`: Close account

### Interests
- POST `/api/interests`: Create interest category
- POST `/api/interests/:categoryId/items`: Add item to category
- DELETE `/api/interests/:categoryId`: Delete category
- PUT `/api/interests/:categoryId/items/:itemId`: Update item rating

### AI Integration
- POST `/api/recommendations/get-recommendation`: Get AI recommendation
- GET `/api/recommendations/daily`: Get daily recommendations
- GET `/api/chat-history`: Get chat history
- POST `/api/chat-history`: Save chat message

## Subscription Tiers

### Free
- 3 interest categories
- 6 AI prompts per day
- Basic features

### Basic ($9.99/month)
- 10 interest categories
- 15 AI prompts per day
- Friend connections (up to 10)
- Enhanced features

### Premium ($19.99/month)
- 20 interest categories
- Unlimited AI prompts
- Unlimited friend connections
- Daily personalized recommendations
- All premium features

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
