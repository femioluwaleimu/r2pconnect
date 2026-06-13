# R2P Connect Backend - PHP API

Complete PHP backend replacement for the R2P Connect application, migrating from Supabase to custom PHP with MySQL.

## Quick Start

### 1. Install MySQL Database

```bash
# Create database
mysql -u root -p < database/schema.sql
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# Required configurations:
# - DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
# - JWT_SECRET (generate a strong random string)
# - External API keys (Paystack, ZeptoMail, Lovable AI)
```

### 3. Run PHP Development Server

```bash
# From project root
php -S localhost:8000 -t backend

# API will be accessible at:
# http://localhost:8000/api.php
```

Or configure your web server (Apache/Nginx) to serve the `backend/` directory.

### 4. Update Frontend

Update React frontend API calls to point to new PHP backend:

```javascript
// Old (Supabase)
const response = await supabase.auth.signUp({...})

// New (PHP Backend)
const response = await fetch('http://localhost:8000/api.php?/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({...})
})
```

## Project Structure

```
backend/
├── app/
│   ├── Core/              # Core framework classes
│   │   ├── Database.php   # Database connection (PDO)
│   │   ├── Router.php     # Request routing
│   │   ├── Controller.php # Base controller
│   │   ├── Model.php      # Base model
│   │   ├── JWT.php        # JWT authentication
│   │   └── Response.php   # JSON response helper
│   ├── Controllers/       # API endpoint handlers
│   │   └── Auth.php       # Authentication endpoints
│   └── Models/            # Data models
│       └── User.php       # User model
├── config/
│   ├── database.php       # Database configuration
│   └── environment.php    # Environment loader
├── database/
│   └── schema.sql         # MySQL database schema
├── middleware/            # Request middleware (TODO)
├── utils/                 # Helper functions (TODO)
├── logs/                  # Application logs
├── storage/uploads/       # File uploads
├── api.php                # Main entry point
├── bootstrap.php          # Application bootstrap
├── .env.example           # Environment template
└── .gitignore             # Git ignore rules
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user (requires auth)
- `POST /auth/logout` - Logout user (requires auth)
- `POST /auth/refresh-token` - Refresh JWT token (requires auth)
- `POST /auth/password/request-reset` - Request password reset
- `POST /auth/password/reset` - Reset password with token

### Response Format

All endpoints return JSON:

```json
// Success (2xx)
{
  "success": true,
  "message": "Operation successful",
  "data": {...}
}

// Error (4xx, 5xx)
{
  "success": false,
  "error": "Error message",
  "errors": {...}  // Validation errors if applicable
}
```

## Authentication

### JWT Implementation

Tokens are JWT (JSON Web Tokens) with:
- Algorithm: HS256
- Expiration: 24 hours (configurable via JWT_EXPIRATION)
- Header: `Authorization: Bearer <token>`

### Example Usage

```javascript
// Login
const loginResponse = await fetch('http://localhost:8000/api.php?/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
})

const { data } = await loginResponse.json()
const token = data.token

// Use token in subsequent requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
}

// Get current user
const meResponse = await fetch('http://localhost:8000/api.php?/auth/me', { headers })
```

## Database Schema

MySQL database with 100+ tables including:
- Users and authentication
- Research papers and materials
- Supervisors and reviews
- Challenges and submissions
- Subscriptions and payments
- Wallets and transactions
- Notifications and messaging
- And more...

See [database/schema.sql](database/schema.sql) for complete schema.

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=r2pconnect
DB_USERNAME=root
DB_PASSWORD=

# Application
APP_NAME="R2P Connect"
APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost:8000

# Security
JWT_SECRET=your_strong_random_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRATION=86400

# External APIs
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
ZEPTOMAIL_API_KEY=
LOVABLE_API_KEY=

# Storage
STORAGE_PATH=./storage/uploads
MAX_FILE_SIZE=52428800

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Development

### Creating New Endpoints

1. Create controller in `app/Controllers/`:

```php
<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;

class MyController extends Controller {
    public function action() {
        // Your code here
        Response::success(['data' => 'value']);
    }
}
```

2. Register route in `api.php`:

```php
$router->post('/endpoint', 'MyController@action');
```

### Creating Models

1. Create model in `app/Models/`:

```php
<?php
namespace App\Models;

use App\Core\Model;

class MyModel extends Model {
    protected string $table = 'my_table';
}
```

2. Use in controller:

```php
$model = new MyModel();
$data = $model->all();
```

## Migrating Edge Functions

From Supabase Deno edge functions to PHP endpoints:

| Edge Function | PHP Endpoint | Status |
|---|---|---|
| `paystack/*` | `/payments/*` | TODO |
| `ai-research/*` | `/ai/*` | TODO |
| `verify-code/*` | `/auth/verify-code` | TODO |
| `reset-password/*` | `/auth/password/reset` | TODO |
| And 14+ more | Various endpoints | TODO |

## Security Considerations

- All passwords are hashed using Argon2ID
- JWT tokens are signed with HMAC-SHA256
- Prepared statements prevent SQL injection
- CORS is configurable per environment
- All inputs are validated before processing
- Sensitive errors are logged, not exposed to clients

## Performance

- Database connection pooling (PDO)
- Query optimization with proper indexes
- JSON response caching (TODO)
- Asset compression (TODO)
- Rate limiting (TODO)

## Troubleshooting

### "Database connection failed"
- Check MySQL is running
- Verify credentials in .env
- Check database exists: `mysql -u root -p -e "SHOW DATABASES;"`

### "Route not found"
- Verify route is registered in `api.php`
- Check controller and method exist
- Review request path format

### "Unauthorized"
- Ensure Authorization header is present
- Verify JWT token is valid
- Check token hasn't expired

### "CORS error"
- Verify frontend URL is in CORS_ALLOWED_ORIGINS
- Check Content-Type header is set

## Next Steps

1. ✅ Database schema created
2. ✅ Core infrastructure (routing, auth, models)
3. ✅ Authentication endpoints created
4. TODO: Create remaining endpoint controllers
5. TODO: Implement middleware for logging, caching
6. TODO: Update frontend to use new API
7. TODO: Set up CI/CD pipeline
8. TODO: Deploy to production server

## Support

For issues or questions:
1. Check error logs in `logs/error.log`
2. Enable `APP_DEBUG=true` in .env for detailed errors
3. Review database schema for table structure
4. Check existing controllers for implementation patterns
