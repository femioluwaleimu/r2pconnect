# Database Installation Guide

## Quick Start

### Prerequisites
- PHP 7.4 or higher with PDO MySQL extension
- MySQL 8.0 or higher
- Database access credentials

### Installation Steps

#### 1. Configure Environment Variables

Copy `.env.example` to `.env` and update your database credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=r2pconnect
```

#### 2. Create Database and Import Schema

```bash
php setup_database.php
```

This script will:
- ✓ Create the MySQL database if it doesn't exist
- ✓ Import the complete database schema (100+ tables)
- ✓ Import all data from CSV exports

#### 3. Verify Installation

Check if the database was created successfully:

```bash
mysql -u root -p -e "USE r2pconnect; SHOW TABLES;" | wc -l
```

Should show 79+ tables.

### Manual Installation (Step by Step)

If you prefer to do it manually:

#### Create Database
```sql
CREATE DATABASE IF NOT EXISTS `r2pconnect` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE r2pconnect;
```

#### Import Schema
```bash
mysql -u root -p r2pconnect < backend/database/schema.sql
```

#### Import CSV Data
```bash
php backend/scripts/import_csv_data.php "c:\Users\Femi Oluwaleimu\Downloads\r2pconnect_tables\r2pconnect tables"
```

Or with different CSV path:
```bash
php backend/scripts/import_csv_data.php "/path/to/csv/files"
```

### Database Structure

The database includes 79 tables organized by feature:

**User Management**
- users
- user_profiles
- user_roles
- user_subscriptions
- user_credits

**Research Papers**
- research_papers
- research_comments
- paper_reviews
- research_chapter_reviews

**Payments & Wallet**
- payments
- payment_history
- wallet_transactions
- subscriptions
- subscription_plans

**Features**
- challenges
- challenge_submissions
- documentaries
- notifications
- messages

**Collaboration & Supervision**
- researcher_collaborations
- supervisor_* (multiple tables)
- external_supervisor_invites

**Additional Features**
- job_postings
- job_applications
- institution_*
- referral_*
- coupons_*
- And more...

### Troubleshooting

#### Error: "SQLSTATE[HY000]: General error: 2006 MySQL server has gone away"
- Increase MySQL `max_allowed_packet` in my.cnf:
  ```ini
  max_allowed_packet=256M
  ```
- Restart MySQL service

#### Error: "Table already exists"
- Use the setup script which handles this automatically with `CREATE IF NOT EXISTS`
- Or drop the database first: `DROP DATABASE r2pconnect;`

#### Error: "Access denied for user"
- Verify credentials in `.env`
- Ensure MySQL user has proper privileges:
  ```sql
  GRANT ALL PRIVILEGES ON r2pconnect.* TO 'username'@'localhost';
  FLUSH PRIVILEGES;
  ```

#### CSV Import Issues
- Ensure CSV path is correct (Windows uses backslashes or escaped)
- Check that CSV files exist in the specified directory
- Verify file permissions are readable

### Verify Installation Success

```bash
# Check table count
mysql -u root -p r2pconnect -e "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='r2pconnect';"

# Check data import
mysql -u root -p r2pconnect -e "SELECT COUNT(*) as user_count FROM users;"
mysql -u root -p r2pconnect -e "SELECT COUNT(*) as paper_count FROM research_papers;"
```

### Next Steps

1. Start the PHP development server:
   ```bash
   php -S localhost:8000 api.php
   ```

2. Test an endpoint:
   ```bash
   curl http://localhost:8000/api.php?/auth/register \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

3. Use Postman to test all endpoints (see Postman collection)

### Support

For issues or questions:
- Check error logs: `backend/logs/`
- Verify database connection: Test with `mysql` command line
- Check PHP error log: `php -S localhost:8000` shows output
