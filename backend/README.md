# Pawverse Backend

Unified backend service for Pawverse Pet Health Assistant with authentication and API gateway.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Backend API    │    │   ML Service    │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Python)      │
│   Port: 5173    │    │   Port: 8000    │    │   Port: 8001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Features

- ✅ User authentication (register/login)
- ✅ JWT token management (access + refresh)
- ✅ PostgreSQL database integration
- ✅ API gateway for ML service proxy
- ✅ Rate limiting and security
- ✅ Input validation
- ✅ CORS support

## Setup Instructions

### 1. Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Python ML service (running on port 8001)

### 2. Database Setup

1. Create a new PostgreSQL database:
```bash
createdb pawverse_backend
```

2. Run the schema file:
```bash
psql -d pawverse_backend -f database/schema.sql
```

### 3. Environment Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Edit `.env` with your configuration:
```env
PORT=8000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pawverse_backend
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_jwt_key_here
FRONTEND_URL=http://localhost:5173
ML_SERVICE_URL=http://localhost:8001
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:8000`

## API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login user | No |
| POST | `/refresh` | Refresh access token | No |
| GET | `/profile` | Get user profile | Yes |
| POST | `/logout` | Logout user | Yes |

### ML Service Routes (`/api/ml`)

All ML service endpoints are proxied through `/api/ml`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ml/predict` | Disease prediction from images |
| POST | `/api/ml/symptom/start` | Start symptom checker |
| POST | `/api/ml/symptom/answer` | Answer symptom question |
| GET | `/api/ml/symptom/results/{id}` | Get symptom results |
| POST | `/api/ml/diagnosis/combine` | Combine image and symptom results |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health status |

## API Usage Examples

### Register User

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Access ML Service (Proxied)

```bash
curl -X POST http://localhost:8000/api/ml/predict \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@pet_image.jpg" \
  -F "species=dog"
```

## Security Features

- **Password Hashing**: Uses bcrypt with 12 salt rounds
- **JWT Tokens**: Access tokens (15min) + refresh tokens (7days)
- **Rate Limiting**: 5 auth attempts per 15 minutes
- **Input Validation**: Joi schemas for all inputs
- **CORS Protection**: Configured for frontend domain
- **Security Headers**: Helmet middleware

## Database Schema

### Users Table
- `id`: UUID primary key
- `email`: Unique email address
- `password_hash`: Bcrypt hashed password
- `first_name`, `last_name`: User name
- `created_at`, `updated_at`: Timestamps
- `last_login`: Last login timestamp
- `is_active`: Account status
- `email_verified`: Email verification status

### Refresh Tokens Table
- Stores refresh tokens for token rotation
- Automatic expiration and revocation

## Development

### Project Structure

```
backend/
├── config/
│   └── database.js     # PostgreSQL connection
├── middleware/
│   └── auth.js         # Authentication middleware
├── routes/
│   └── auth.js         # Authentication routes
├── utils/
│   ├── jwt.js          # JWT utilities
│   └── validation.js   # Input validation schemas
├── database/
│   └── schema.sql      # Database schema
├── User.js             # User model
├── server.js           # Express server with API gateway
├── package.json
└── README.md
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8000 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | pawverse_backend |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRE` | JWT expiration | 15m |
| `FRONTEND_URL` | Frontend URL | http://localhost:5173 |
| `ML_SERVICE_URL` | ML service URL | http://localhost:8001 |

## Integration with Frontend

The frontend should use these endpoints:

1. **Authentication**: `http://localhost:8000/api/auth/*`
2. **ML Services**: `http://localhost:8000/api/ml/*`

The backend handles:
- Authentication and authorization
- Token management
- Request routing to ML service
- Security and rate limiting

## License

MIT License
