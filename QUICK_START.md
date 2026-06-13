# R2PConnect Backend - Quick Start Guide

## 🚀 Getting Started (5 minutes)

### Prerequisites
- PHP 7.4+ 
- MySQL 8.0+
- Composer (optional)

### Step 1: Configure Database

1. Navigate to backend folder:
```bash
cd backend
```

2. Copy environment template:
```bash
cp .env.example .env
```

3. Edit `.env` with your MySQL credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=r2pconnect
```

### Step 2: Setup Database

Run the setup script from the backend directory:
```bash
php setup_database.php
```

This will:
- ✓ Create the `r2pconnect` database
- ✓ Import 100+ tables from schema
- ✓ Import 79 CSV data files (300,000+ rows)
- ✓ Show progress and summary

**Expected output:**
```
╔════════════════════════════════════════╗
║  R2PConnect Database Setup Script      ║
╚════════════════════════════════════════╝

Configuration:
  Host: localhost
  Port: 3306
  User: root
  Database: r2pconnect

Step 1/5: Connecting to MySQL server...
  ✓ Connected successfully

Step 2/5: Creating database 'r2pconnect'...
  ✓ Database ready

Step 3/5: Importing database schema...
  ✓ Schema imported (156 statements)

Step 4/5: Verifying schema...
  ✓ Found 79 tables

Step 5/5: Importing CSV data...
  Found 79 CSV files
  ✓ users: 150 rows
  ✓ research_papers: 240 rows
  ... more tables ...

╔════════════════════════════════════════╗
║  ✓ Setup Complete!                    ║
╚════════════════════════════════════════╝
```

### Step 3: Start the Server

```bash
php -S localhost:8000 api.php
```

Output:
```
Development Server started at http://localhost:8000
Press Ctrl+C to quit
```

### Step 4: Test the API

#### Test Health Check:
```bash
curl http://localhost:8000/api.php?/auth/me
```

#### Register a User:
```bash
curl -X POST http://localhost:8000/api.php?/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"password123",
    "first_name":"John",
    "last_name":"Doe"
  }'
```

#### Login:
```bash
curl -X POST http://localhost:8000/api.php?/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"password123"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    }
  }
}
```

## 📊 Database Info

**79 Tables** organized by feature:

| Category | Tables | Examples |
|----------|--------|----------|
| Users | 5 | users, profiles, roles, subscriptions, credits |
| Research | 6 | papers, comments, views, downloads, reviews |
| Payments | 4 | payments, history, wallets, transactions |
| Features | 12 | challenges, documentaries, notifications, jobs |
| Collaboration | 8 | supervisors, collaborations, invites |
| Admin | 5 | logs, settings, flags, commissions |
| Other | 39 | referrals, coupons, FAQs, institutions, etc |

**Total Rows:** 300,000+

## 🔑 API Endpoints

### Authentication (7 endpoints)
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout
- `POST /auth/refresh-token` - Refresh JWT token
- `POST /auth/password/request-reset` - Request password reset
- `POST /auth/password/reset` - Reset password

### Users (12 endpoints)
- `GET /users/profile` - Get profile
- `PUT /users/profile` - Update profile
- `GET /users/wallet` - Get wallet balance
- `GET /users/subscriptions` - Get subscriptions
- And more...

### Research (12 endpoints)
- `POST /research` - Create paper
- `GET /research/{id}` - Get paper
- `GET /research/my-papers` - Get user's papers
- `GET /research/trending` - Get trending papers
- And more...

### Payments (4 endpoints)
- `POST /payments/initiate` - Initiate payment
- `POST /payments/verify` - Verify payment
- `GET /payments/history` - Payment history

### Challenges (10 endpoints)
- `GET /challenges` - List challenges
- `POST /challenges` - Create challenge
- `POST /challenges/{id}/submit` - Submit entry
- And more...

### And more...
- **Notifications** (8 endpoints)
- **Messaging** (7 endpoints)
- **Collaborations** (10 endpoints)
- **Supervisors** (10 endpoints)
- **Analytics** (7 endpoints)
- **Admin Dashboard** (11 endpoints)

**Total: 156+ endpoints**

## 📮 Testing with Postman

1. Import the collection:
   - File → Import → Select `postman_collection.json`

2. Set base URL:
   - Click "Environment" gear icon → "No Environment"
   - Edit → `base_url: http://localhost:8000`

3. Get Auth Token:
   - Run "Login" request
   - Copy token from response
   - Paste into Postman variable `{{token}}`

4. Test other endpoints with token

## 🔧 Troubleshooting

### Database Connection Error
```
SQLSTATE[HY000]: General error: 2006 MySQL server has gone away
```
**Solution:** MySQL connection timeout. Increase `max_allowed_packet`:
```bash
mysql -u root -p
SET GLOBAL max_allowed_packet = 256*1024*1024;
```

### Permission Denied
```
Error: Access denied for user 'root'@'localhost'
```
**Solution:** Check credentials in `.env` or create MySQL user:
```sql
CREATE USER 'r2pconnect'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON r2pconnect.* TO 'r2pconnect'@'localhost';
FLUSH PRIVILEGES;
```

### Schema Import Failed
```
Table already exists
```
**Solution:** Drop database and retry:
```bash
mysql -u root -p -e "DROP DATABASE r2pconnect;"
php setup_database.php
```

### CSV Import Not Running
```
CSV path not found: c:\Users\...\r2pconnect_tables
```
**Solution:** Either:
- Keep the zip file extracted at that location
- Or edit setup script with correct path
- Or run import manually:
```bash
php scripts/import_csv_data.php "C:\correct\path\to\csv"
```

## 📁 Project Structure

```
backend/
├── api.php                      # Main entry point
├── bootstrap.php                # Application initialization
├── setup_database.php           # Database setup script
├── .env                         # Database config (create from .env.example)
├── .env.example                 # Config template
├── app/
│   ├── Core/                    # Framework classes
│   │   ├── Database.php         # Database connection
│   │   ├── Router.php           # Route dispatcher
│   │   ├── Controller.php       # Base controller
│   │   ├── Model.php            # Base model
│   │   ├── JWT.php              # JWT authentication
│   │   └── Response.php         # Response formatter
│   ├── Controllers/             # API endpoints (13 controllers)
│   │   ├── Auth.php
│   │   ├── UserController.php
│   │   ├── ResearchController.php
│   │   ├── PaymentController.php
│   │   ├── ChallengeController.php
│   │   ├── CollaborationController.php
│   │   ├── SupervisorController.php
│   │   ├── AnalyticsController.php
│   │   ├── AdminDashboardController.php
│   │   └── ... more
│   └── Models/                  # Data models
├── config/
│   ├── database.php             # Database configuration
│   └── environment.php          # Environment loader
├── database/
│   └── schema.sql               # Complete schema (100+ tables)
├── scripts/
│   └── import_csv_data.php      # CSV import script
├── logs/                        # Error logs
└── storage/uploads/             # File uploads
```

## 🚀 Next Steps

1. **Frontend Integration**
   - Update React API calls to use PHP backend
   - Configure CORS if needed
   - Update environment variables in React

2. **Deployment**
   - Configure for production server
   - Set up SSL/HTTPS
   - Configure environment variables
   - Setup error logging and monitoring

3. **Testing**
   - Run Postman collection
   - Test all user workflows
   - Load testing
   - Security testing

## 📞 Support

For issues:
1. Check `backend/logs/error.log`
2. Verify MySQL connection
3. Ensure `.env` has correct credentials
4. Check database was created: `mysql -u root -p r2pconnect -e "SHOW TABLES;"`

## 📝 Notes

- JWT tokens expire after 24 hours
- Passwords are hashed with Argon2ID
- All data uses UTF-8 encoding
- Database supports transactions for complex operations
- Error logging is enabled by default
