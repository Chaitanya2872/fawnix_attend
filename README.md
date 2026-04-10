# Employee Management System - Monolithic Application

A complete Flask-based monolithic application for employee authentication, attendance tracking, and activity management.

## 🏗️ Architecture

**Monolithic** - Single unified application with all features in one codebase.

## ✨ Features

### Authentication
- OTP-based login via WhatsApp
- JWT token authentication
- Role-based access control (Admin, User Manager, Employee)

### Attendance Management
- Clock in/out with GPS location
- Automatic geocoding (address from coordinates)
- Working hours calculation
- Attendance history

### Activity Tracking
- Start/end activities (visits, breaks)
- Break management (meal, tea, rest breaks)
- Activity history and duration tracking

## 📁 Project Structure

```
employee-management-monolith/
├── app.py                  # Main application
├── config.py              # Configuration
├── run.py                 # Development runner
├── requirements.txt       # Dependencies
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose
├── .env.example           # Environment template
├── routes/                # API endpoints
│   ├── auth.py
│   ├── attendance.py
│   ├── activities.py
│   ├── users.py
│   └── admin.py
├── services/              # Business logic
│   ├── auth_service.py
│   ├── otp_service.py
│   ├── whatsapp_service.py
│   ├── attendance_service.py
│   ├── activity_service.py
│   └── geocoding_service.py
├── middleware/            # Middleware
│   ├── auth_middleware.py
│   ├── error_handler.py
│   └── logging_middleware.py
├── database/              # Database utilities
│   └── connection.py
└── logs/                  # Application logs
```

## 🚀 Quick Start

### Option 1: Local Development

```bash
# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Setup environment
cp .env.example .env
# Edit .env with your configuration

# 4. Run application
python app.py
# or
python run.py
```

### Option 2: Docker

```bash
# 1. Setup environment
cp .env.example .env

# 2. Start services
docker-compose up -d

# 3. Check logs
docker-compose logs -f app
```

### Option 3: Production with Gunicorn

```bash
# Install dependencies
pip install -r requirements.txt

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 📋 API Endpoints

### Authentication
- `POST /api/auth/request-otp` - Request OTP for login
- `POST /api/auth/verify-otp` - Verify OTP and get JWT token
- `GET /api/auth/me` - Get current user profile

### Attendance
- `POST /api/attendance/login` - Clock in
- `POST /api/attendance/logout` - Clock out  
- `GET /api/attendance/status` - Get attendance status
- `GET /api/attendance/history` - Get attendance history

### Activities
- `POST /api/activities/start` - Start activity
- `POST /api/activities/end` - End activity
- `GET /api/activities` - List activities
- `POST /api/activities/break/start` - Start break
- `POST /api/activities/break/end` - End break

## 🔧 Configuration

Edit `.env` file:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=Intimation
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_EXPIRE_MINUTES=1440

# WhatsApp (optional)
WHATSAPP_TOKEN=your-token
PHONE_NUMBER_ID=your-phone-id

# Application
DEBUG=True
PORT=5000
```

## 📝 Example API Calls

### 1. Request OTP
```bash
curl -X POST http://localhost:5000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"emp_code": "EMP001"}'
```

### 2. Verify OTP
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"emp_code": "EMP001", "otp": "123456"}'
```

### 3. Clock In (with JWT token)
```bash
curl -X POST http://localhost:5000/api/attendance/login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "latitude": "28.6139",
    "longitude": "77.2090"
  }'
```

### 4. Get Profile
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🗄️ Database Setup

The application automatically creates tables on startup. Ensure:

1. PostgreSQL is running
2. Database "Intimation" exists
3. `employees` and `branch` tables exist (from your original SQL files)

Required tables created automatically:
- `users` - User authentication and roles
- `otp_codes` - OTP management
- `attendance` - Todays Activity
- `activities` - Activity tracking

## 🧪 Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=.
```

## 📊 Monitoring

- **Logs**: Check `logs/app.log`
- **Health**: `GET /health`
- **API Docs**: `GET /api/docs`

## 🔒 Security Notes

1. **Change JWT_SECRET_KEY** in production
2. **Use HTTPS** in production
3. **Configure CORS** properly
4. **Use strong database passwords**
5. **Enable WhatsApp API** for OTP

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
psql -U postgres -d Intimation

# Verify DATABASE_* env variables
```

### Import Errors
```bash
# Install dependencies
pip install -r requirements.txt

# Check Python version (3.9+)
python --version
```

### Port Already in Use
```bash
# Change PORT in .env
PORT=5001

# Or kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

## 📄 License

This project is provided as-is.

## 🤝 Support

For issues:
1. Check logs: `logs/app.log`
2. Verify configuration: `.env`
3. Test database connection: `GET /health`

---

**Version**: 1.0.0  
**Architecture**: Monolithic  
**Framework**: Flask
