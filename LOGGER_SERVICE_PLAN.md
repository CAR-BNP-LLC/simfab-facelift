# Logger Service Implementation Plan

## Overview

Create a centralized logging service that saves server errors (HTTP 5xx status codes) to the database. The logger will be integrated as root-level middleware that captures all server errors, storing them for monitoring, debugging, and analysis.

## Goals

1. ✅ Save all server errors (5xx status codes) to database
2. ✅ Implement as root-level middleware
3. ✅ Integrate with existing error handler
4. ✅ Provide structured error logging with comprehensive context
5. ✅ Ensure logging doesn't fail the request processing

## Architecture

### Components

1. **Database Table**: `server_error_logs` - Stores error logs
2. **LoggerService**: Service class for database operations
3. **Middleware Integration**: Update error handler middleware to use LoggerService
4. **Migration**: SQL migration to create the logs table

---

## 1. Database Schema

### Table: `server_error_logs`

Store structured error information for server errors only (5xx).

```sql
CREATE TABLE IF NOT EXISTS server_error_logs (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(255) NOT NULL,
  status_code INTEGER NOT NULL,
  error_code VARCHAR(100),
  error_name VARCHAR(255) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  http_method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  query_params JSONB,
  request_body JSONB,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  request_headers JSONB,
  error_details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes for Performance

```sql
CREATE INDEX IF NOT EXISTS idx_server_error_logs_status_code ON server_error_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_server_error_logs_created_at ON server_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_server_error_logs_user_id ON server_error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_server_error_logs_error_code ON server_error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_server_error_logs_path ON server_error_logs(path);
```

---

## 2. LoggerService Class

**Location**: `server/src/services/LoggerService.ts`

### Interface

```typescript
interface ServerErrorLog {
  id?: number;
  request_id: string;
  status_code: number;
  error_code?: string;
  error_name: string;
  error_message: string;
  error_stack?: string;
  http_method: string;
  path: string;
  query_params?: any;
  request_body?: any;
  user_id?: number;
  ip_address?: string;
  user_agent?: string;
  request_headers?: any;
  error_details?: any;
  created_at?: Date;
}

interface LogErrorParams {
  requestId: string;
  error: Error;
  req: Request;
  statusCode: number;
  errorCode?: string;
  details?: any;
}

class LoggerService {
  constructor(private pool: Pool) {}
  
  /**
   * Log server error (5xx) to database
   * Non-blocking - won't throw errors
   */
  async logServerError(params: LogErrorParams): Promise<void>
  
  /**
   * Check if status code is a server error (5xx)
   */
  private isServerError(statusCode: number): boolean
}
```

### Key Features

- **Only logs 5xx errors**: Filters out client errors (4xx)
- **Non-blocking**: Catches its own errors to prevent logging failures from breaking requests
- **Structured data**: Stores all relevant request context
- **Error-safe**: If database write fails, logs to console and continues

---

## 3. Migration File

**Location**: `server/src/migrations/sql/030_create_server_error_logs.sql`

### Migration Content

- Create `server_error_logs` table
- Create indexes for common queries
- Add comments/documentation
- Follow existing migration patterns

---

## 4. Integration with Error Handler

**File**: `server/src/middleware/errorHandler.ts`

### Changes Required

1. Import LoggerService
2. Initialize LoggerService instance (or pass pool)
3. In `errorHandler` middleware:
   - Check if status code is 5xx
   - Call `loggerService.logServerError()` after determining status code
   - Wrap in try/catch to ensure it doesn't affect error response

### Implementation Pattern

```typescript
// After determining error status code
if (statusCode >= 500) {
  loggerService.logServerError({
    requestId,
    error: err,
    req,
    statusCode,
    errorCode: code,
    details: ...
  }).catch(logError => {
    // Fallback to console if DB write fails
    console.error('Failed to log error to database:', logError);
  });
}
```

---

## 5. Middleware Setup

**File**: `server/src/index.ts`

### Changes Required

1. Import LoggerService
2. Initialize LoggerService instance
3. Pass to error handler (or use singleton pattern)
4. Ensure error handler middleware remains last (already is)

**Note**: Error handler is already at root level as the last middleware (line 173), so no positioning changes needed.

---

## 6. Implementation Steps

### Step 1: Create Migration File
- [ ] Create `server/src/migrations/sql/030_create_server_error_logs.sql`
- [ ] Define table schema with all required fields
- [ ] Add indexes for performance
- [ ] Add table/column comments

### Step 2: Create LoggerService Class
- [ ] Create `server/src/services/LoggerService.ts`
- [ ] Implement constructor with Pool dependency
- [ ] Implement `logServerError()` method
- [ ] Implement `isServerError()` helper method
- [ ] Add error handling to prevent logging failures from breaking requests
- [ ] Sanitize sensitive data (passwords, tokens) from request body/headers

### Step 3: Update Error Handler Middleware
- [ ] Import LoggerService in `server/src/middleware/errorHandler.ts`
- [ ] Accept LoggerService instance (via constructor or parameter)
- [ ] Add logging call after status code determination
- [ ] Ensure only 5xx errors are logged
- [ ] Wrap logging in try/catch for safety

### Step 4: Update Server Index
- [ ] Initialize LoggerService in `server/src/index.ts`
- [ ] Pass to error handler or make available globally
- [ ] Ensure initialization doesn't block server startup

### Step 5: Test Implementation
- [ ] Run migration: `npm run migrate:up`
- [ ] Test with 500 error (should log to DB)
- [ ] Test with 400 error (should NOT log to DB)
- [ ] Test with 404 error (should NOT log to DB)
- [ ] Test logger service error handling (DB connection fails)
- [ ] Verify logs appear in database

### Step 6: Optional Enhancements
- [ ] Add environment variable to enable/disable logging
- [ ] Add log retention/cleanup job (optional, can be Phase 2)
- [ ] Add admin endpoint to view logs (optional, can be Phase 2)

---

## 7. Data Structure

### Error Log Entry Example

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "status_code": 500,
  "error_code": "DATABASE_ERROR",
  "error_name": "QueryFailedError",
  "error_message": "Connection to database failed",
  "error_stack": "Error: Connection failed\n    at ...",
  "http_method": "POST",
  "path": "/api/orders",
  "query_params": { "page": "1" },
  "request_body": { "productId": 123, "quantity": 2 },
  "user_id": 42,
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "request_headers": { "content-type": "application/json" },
  "error_details": { "database": "postgres", "operation": "INSERT" },
  "created_at": "2025-01-15T10:30:00Z"
}
```

---

## 8. Security Considerations

1. **Sensitive Data Sanitization**:
   - Remove passwords from request body
   - Remove authorization tokens from headers
   - Remove credit card numbers
   - Truncate large request bodies (>10KB)

2. **Error Details**:
   - In production: Hide sensitive stack traces
   - In development: Include full stack traces

3. **Access Control**:
   - Log table should only be accessible to admins
   - Consider encryption for sensitive fields (future enhancement)

---

## 9. Performance Considerations

1. **Async Logging**: Don't block request processing
2. **Indexes**: Proper indexes for common queries (by date, status, user)
3. **Batch Logging**: Consider batching writes for high-volume (future optimization)
4. **Connection Pooling**: Reuse existing pool connection

---

## 10. Future Enhancements (Out of Scope)

- Admin dashboard for viewing logs
- Log retention policies and cleanup
- Log aggregation and alerts
- Rate limiting for error logging
- Integration with external logging services (Sentry, DataDog)
- Error grouping and deduplication

---

## Files to Create/Modify

### New Files
- ✅ `LOGGER_SERVICE_PLAN.md` (this file)
- `server/src/services/LoggerService.ts`
- `server/src/migrations/sql/030_create_server_error_logs.sql`

### Modified Files
- `server/src/middleware/errorHandler.ts`
- `server/src/index.ts`

---

## Success Criteria

- [ ] Migration runs successfully
- [ ] Server errors (5xx) are logged to database
- [ ] Client errors (4xx) are NOT logged to database
- [ ] Logging failures don't break error responses
- [ ] All error context is captured (request, user, stack, etc.)
- [ ] No sensitive data is logged (passwords, tokens)

---

## Testing Checklist

1. ✅ Create 500 error → Should log to DB
2. ✅ Create 503 error → Should log to DB
3. ✅ Create 400 error → Should NOT log to DB
4. ✅ Create 404 error → Should NOT log to DB
5. ✅ Error with user session → Should capture user_id
6. ✅ Error without user session → Should handle gracefully
7. ✅ Database connection fails → Should log to console, not crash
8. ✅ Large request body → Should handle/truncate appropriately
9. ✅ Request with sensitive data → Should sanitize before logging

---

## Notes

- LoggerService follows existing service patterns (like EmailService)
- Uses existing database pool from config
- Integrates seamlessly with existing error handler
- Middleware is already at root level, no repositioning needed
- Follows existing migration numbering scheme (030)


