# SimFab Products API Server

A TypeScript Express.js server for managing SimFab products with CSV upload functionality and complete authentication system.

## Features

### Products API
- **GET /api/products** - Retrieve all products
- **GET /api/products/:id** - Retrieve a specific product by ID
- **POST /api/products/upload** - Upload products from CSV file (replaces existing data)

### Authentication System
- **POST /api/auth/register** - Register a new user
- **POST /api/auth/login** - Login user
- **POST /api/auth/logout** - Logout user
- **GET /api/auth/profile** - Get current user profile (protected)
- **POST /api/auth/password-reset/request** - Request password reset
- **POST /api/auth/password-reset/reset** - Reset password with code
- **POST /api/auth/newsletter/subscribe** - Subscribe to newsletter
- **POST /api/auth/newsletter/unsubscribe** - Unsubscribe from newsletter

### System
- **GET /health** - Health check endpoint
- Session-based authentication with SQLite store
- Password hashing with bcrypt
- Newsletter subscription with date tracking

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build and start production server:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication Endpoints

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "subscribe_newsletter": true
}
```

#### Login User
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get User Profile (Protected)
```
GET /api/auth/profile
```

#### Request Password Reset
```
POST /api/auth/password-reset/request
Content-Type: application/json

{
  "email": "user@example.com"
}
```
**Note:** Reset code will be logged to console.

#### Reset Password
```
POST /api/auth/password-reset/reset
Content-Type: application/json

{
  "reset_code": "uuid-reset-code",
  "new_password": "newpassword123"
}
```

#### Subscribe to Newsletter
```
POST /api/auth/newsletter/subscribe
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Unsubscribe from Newsletter
```
POST /api/auth/newsletter/unsubscribe
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Products Endpoints

#### Get All Products
```
GET /api/products
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Flight Simulator Cockpit",
      "description": "Professional flight simulator cockpit...",
      "price": 2999.99,
      "category": "Flight Simulation",
      "stock": 5,
      "sku": "FS-COCKPIT-001",
      "image_url": "https://example.com/flight-cockpit.jpg",
      "created_at": "2025-09-16T19:12:00.000Z",
      "updated_at": "2025-09-16T19:12:00.000Z"
    }
  ],
  "count": 1
}
```

#### Get Product by ID
```
GET /api/products/1
```

#### Upload Products from CSV
```
POST /api/products/upload
Content-Type: multipart/form-data

Form data:
- csv: [CSV file]
```

CSV Format:
```csv
name,description,price,category,stock,sku,image_url
"Product Name","Product Description",99.99,"Category",10,"SKU-001","https://example.com/image.jpg"
```

**Important:** This endpoint will drop the existing products table and recreate it with the new data.

## Database

The server uses SQLite3 with multiple databases:

### Products Database (`products.db`)
- `id` (INTEGER PRIMARY KEY) - Auto-incrementing ID
- `name` (TEXT) - Product name (required)
- `description` (TEXT) - Product description (required)
- `price` (REAL) - Product price (required)
- `category` (TEXT) - Product category (required)
- `stock` (INTEGER) - Stock quantity (required)
- `sku` (TEXT UNIQUE) - Stock Keeping Unit (required, unique)
- `image_url` (TEXT) - Product image URL (optional)
- `created_at` (DATETIME) - Creation timestamp
- `updated_at` (DATETIME) - Last update timestamp

### Authentication Database (`auth.db`)
#### Users Table
- `id` (INTEGER PRIMARY KEY) - Auto-incrementing ID
- `email` (TEXT UNIQUE) - User email (required, unique)
- `password` (TEXT) - Hashed password (required)
- `first_name` (TEXT) - User's first name (required)
- `last_name` (TEXT) - User's last name (required)
- `is_active` (BOOLEAN) - Account status (default: true)
- `created_at` (DATETIME) - Creation timestamp
- `updated_at` (DATETIME) - Last update timestamp

#### Password Resets Table
- `id` (INTEGER PRIMARY KEY) - Auto-incrementing ID
- `user_id` (INTEGER) - Foreign key to users table
- `reset_code` (TEXT) - UUID reset code (required)
- `expires_at` (DATETIME) - Expiration timestamp (required)
- `used` (BOOLEAN) - Whether code has been used (default: false)
- `created_at` (DATETIME) - Creation timestamp

#### Newsletter Subscriptions Table
- `id` (INTEGER PRIMARY KEY) - Auto-incrementing ID
- `email` (TEXT UNIQUE) - Subscriber email (required, unique)
- `subscribed_at` (DATETIME) - Subscription date (required)
- `is_active` (BOOLEAN) - Subscription status (default: true)
- `created_at` (DATETIME) - Creation timestamp

### Sessions Database (`sessions.db`)
- Managed by express-session with SQLite store
- Stores user session data

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": ["Additional error details"]
}
```

## Development

- Server runs on port 3001 by default
- Uses TypeScript with strict type checking
- Includes CORS support for frontend integration
- File upload limit: 10MB
- Only CSV files are accepted for uploads

## Testing

Use the provided `sample-products.csv` file to test the upload functionality:

```bash
curl -X POST -F "csv=@sample-products.csv" http://localhost:3001/api/products/upload
```
