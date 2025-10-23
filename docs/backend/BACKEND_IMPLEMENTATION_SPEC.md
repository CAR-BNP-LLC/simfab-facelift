# SimFab Backend Implementation Specification
## Complete API Documentation with Examples, Status Codes, and Error Handling

### Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Authentication & User Management](#authentication--user-management)
3. [Product Management System](#product-management-system)
4. [Shopping Cart System](#shopping-cart-system)
5. [Product Recommendation Engine](#product-recommendation-engine)
6. [Order Management](#order-management)
7. [Payment Processing](#payment-processing)
8. [Shipping Integration](#shipping-integration)
9. [Admin Dashboard API](#admin-dashboard-api)
10. [Email & Notifications](#email--notifications)
11. [Error Handling Standards](#error-handling-standards)
12. [Database Schema](#database-schema)

---

## System Architecture Overview

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 14+
- **Session Store**: PostgreSQL (connect-pg-simple)
- **File Storage**: Local/S3 compatible storage
- **Payment Gateway**: PayPal Business API
- **Shipping API**: ShipStation
- **Email Service**: SendGrid/NodeMailer
- **Cache Layer**: Redis (recommended for production)

### Core Principles
1. **RESTful API Design**: Clear, predictable endpoints
2. **Stateless Authentication**: Session-based with secure cookies
3. **Comprehensive Error Handling**: Detailed error responses
4. **Data Validation**: Input validation on all endpoints
5. **Security First**: SQL injection prevention, XSS protection, CSRF tokens
6. **Performance**: Efficient queries, pagination, caching

---

## Authentication & User Management

### 1. User Registration

**Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "email": "customer@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1-555-0123",
  "subscribeNewsletter": true
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "Account created successfully. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": 1234,
      "email": "customer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "emailVerified": false,
      "createdAt": "2025-10-09T10:30:00Z"
    },
    "verificationEmailSent": true
  }
}
```

**Error Responses**:

400 Bad Request - Validation Error:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is already registered"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters with uppercase, lowercase, and numbers"
      }
    ]
  }
}
```

409 Conflict - Email Already Exists:
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "An account with this email already exists",
    "suggestion": "Try logging in or use password reset if you forgot your password"
  }
}
```

500 Internal Server Error:
```json
{
  "success": false,
  "error": {
    "code": "SERVER_ERROR",
    "message": "Unable to create account. Please try again later.",
    "requestId": "req_abc123xyz"
  }
}
```

---

### 2. User Login

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "customer@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1234,
      "email": "customer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "phone": "+1-555-0123",
      "emailVerified": true,
      "lastLogin": "2025-10-09T10:35:00Z"
    },
    "session": {
      "expiresAt": "2025-10-10T10:35:00Z"
    }
  }
}
```

**Error Responses**:

401 Unauthorized - Invalid Credentials:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "attempts": 3,
    "maxAttempts": 5
  }
}
```

423 Locked - Account Locked:
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Your account has been temporarily locked due to multiple failed login attempts",
    "lockedUntil": "2025-10-09T11:00:00Z"
  }
}
```

403 Forbidden - Email Not Verified:
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "Please verify your email address before logging in",
    "actions": {
      "resendVerification": "/api/auth/resend-verification"
    }
  }
}
```

---

### 3. Get User Profile

**Endpoint**: `GET /api/auth/profile`

**Headers**: 
```
Cookie: sessionId=abc123...
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1234,
      "email": "customer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1-555-0123",
      "company": "Tech Corp",
      "role": "customer",
      "emailVerified": true,
      "newsletterSubscribed": true,
      "createdAt": "2025-01-15T08:00:00Z",
      "lastLogin": "2025-10-09T10:35:00Z"
    },
    "addresses": [
      {
        "id": 1,
        "type": "shipping",
        "isDefault": true,
        "firstName": "John",
        "lastName": "Doe",
        "addressLine1": "123 Main St",
        "addressLine2": "Apt 4B",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "US",
        "phone": "+1-555-0123"
      }
    ],
    "stats": {
      "totalOrders": 5,
      "totalSpent": 4567.89,
      "lastOrderDate": "2025-09-15T14:30:00Z"
    }
  }
}
```

**Error Responses**:

401 Unauthorized:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "redirectTo": "/login"
  }
}
```

---

### 4. Update User Profile

**Endpoint**: `PUT /api/auth/profile`

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1-555-9999",
  "company": "New Company Inc"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": 1234,
      "email": "customer@example.com",
      "firstName": "John",
      "lastName": "Smith",
      "phone": "+1-555-9999",
      "company": "New Company Inc",
      "updatedAt": "2025-10-09T10:40:00Z"
    }
  }
}
```

---

### 5. Password Reset Request

**Endpoint**: `POST /api/auth/password-reset/request`

**Request Body**:
```json
{
  "email": "customer@example.com"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "If an account exists with this email, you will receive password reset instructions",
  "data": {
    "emailSent": true,
    "expiresIn": 3600
  }
}
```

---

### 6. Password Reset

**Endpoint**: `POST /api/auth/password-reset/reset`

**Request Body**:
```json
{
  "token": "reset_token_abc123xyz",
  "password": "NewSecurePass456!",
  "confirmPassword": "NewSecurePass456!"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {
    "redirectTo": "/login"
  }
}
```

**Error Responses**:

400 Bad Request - Invalid/Expired Token:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Password reset token is invalid or has expired",
    "actions": {
      "requestNewToken": "/api/auth/password-reset/request"
    }
  }
}
```

---

## Product Management System

### 1. List Products

**Endpoint**: `GET /api/products`

**Query Parameters**:
```
?page=1
&limit=20
&category=flight-sim
&search=cockpit
&sortBy=price
&sortOrder=asc
&minPrice=100
&maxPrice=5000
&inStock=true
&featured=true
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 101,
        "sku": "FS-TRAINER-001",
        "name": "SimFab Flight Sim Trainer Station",
        "slug": "flight-sim-trainer-station",
        "shortDescription": "Your Gateway to Precision Aviation Training",
        "price": {
          "min": 999.00,
          "max": 3522.00,
          "currency": "USD"
        },
        "images": [
          {
            "url": "https://cdn.simfab.com/products/trainer-main.jpg",
            "alt": "Flight Sim Trainer Station",
            "isPrimary": true
          }
        ],
        "categories": ["flight-sim", "cockpits"],
        "tags": ["best-seller", "modular"],
        "inStock": true,
        "stockQuantity": 15,
        "featured": true,
        "rating": {
          "average": 4.8,
          "count": 127
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 87,
      "totalPages": 5,
      "hasNext": true,
      "hasPrevious": false
    },
    "filters": {
      "categories": [
        { "id": "flight-sim", "name": "Flight Sim", "count": 35 },
        { "id": "sim-racing", "name": "Sim Racing", "count": 28 },
        { "id": "accessories", "name": "Accessories", "count": 24 }
      ],
      "priceRange": {
        "min": 24.99,
        "max": 5999.00
      }
    }
  }
}
```

---

### 2. Get Product Details

**Endpoint**: `GET /api/products/:id`

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 101,
      "sku": "FS-TRAINER-001",
      "name": "SimFab Flight Sim Trainer Station",
      "slug": "flight-sim-trainer-station",
      "description": "SimFab's Trainer Station is focused on providing precise and exact replication of popular aircrafts with true to life controls placement in an ergonomically correct framework.",
      "shortDescription": "Your Gateway to Precision Aviation Training",
      "type": "configurable",
      "status": "active",
      "featured": true,
      "price": {
        "min": 999.00,
        "max": 3522.00,
        "currency": "USD"
      },
      "images": [
        {
          "id": 1,
          "url": "https://cdn.simfab.com/products/trainer-main.jpg",
          "alt": "Main cockpit view",
          "isPrimary": true,
          "sortOrder": 0
        },
        {
          "id": 2,
          "url": "https://cdn.simfab.com/products/trainer-side.jpg",
          "alt": "Side view",
          "isPrimary": false,
          "sortOrder": 1
        }
      ],
      "colors": [
        {
          "id": 1,
          "name": "Black",
          "colorCode": "#000000",
          "imageUrl": "https://cdn.simfab.com/colors/black.jpg",
          "isAvailable": true,
          "sortOrder": 0
        },
        {
          "id": 2,
          "name": "Blue",
          "colorCode": "#0066CC",
          "imageUrl": "https://cdn.simfab.com/colors/blue.jpg",
          "isAvailable": true,
          "sortOrder": 1
        }
      ],
      "variations": {
        "model": [
          {
            "id": 1,
            "variationType": "model",
            "name": "Base Cockpit Configuration",
            "description": "Standard cockpit setup with essential components",
            "imageUrl": "https://cdn.simfab.com/variations/base-config.jpg",
            "priceAdjustment": 0,
            "isDefault": true,
            "sortOrder": 0
          }
        ],
        "dropdown": [
          {
            "id": 2,
            "variationType": "dropdown",
            "name": "What rudder pedals are you using?",
            "isRequired": true,
            "options": [
              {
                "id": 1,
                "name": "Standard Rudder Pedals",
                "value": "standard",
                "priceAdjustment": 0,
                "isDefault": true
              },
              {
                "id": 2,
                "name": "Premium Rudder Pedals",
                "value": "premium",
                "priceAdjustment": 150.00
              },
              {
                "id": 3,
                "name": "Custom Rudder Pedals",
                "value": "custom",
                "priceAdjustment": 300.00
              }
            ]
          }
        ]
      },
      "addons": [
        {
          "id": 1,
          "name": "Active Articulating Arm with Keyboard & Mouse or Laptop Tray kit",
          "description": "Adjustable arm for keyboard and mouse positioning",
          "price": {
            "min": 199.00,
            "max": 229.00
          },
          "isRequired": false,
          "hasOptions": true,
          "options": [
            {
              "id": 1,
              "name": "Keyboard & Mouse Tray",
              "price": 199.00,
              "imageUrl": "https://cdn.simfab.com/addons/keyboard-tray.jpg",
              "isAvailable": true
            },
            {
              "id": 2,
              "name": "Laptop Tray",
              "price": 229.00,
              "imageUrl": "https://cdn.simfab.com/addons/laptop-tray.jpg",
              "isAvailable": true
            }
          ]
        }
      ],
      "specifications": {
        "weight": {
          "value": 73.6,
          "unit": "lbs"
        },
        "dimensions": {
          "length": 37,
          "width": 23,
          "height": 16,
          "unit": "inches"
        }
      },
      "shipping": {
        "requiresShipping": true,
        "shippingClass": "large-item",
        "estimatedDays": {
          "min": 3,
          "max": 7
        }
      },
      "inventory": {
        "inStock": true,
        "quantity": 15,
        "lowStockThreshold": 5,
        "allowBackorders": false
      },
      "faqs": [
        {
          "id": 1,
          "question": "Can you use the Triple Monitor Stand for bigger monitors?",
          "answer": "The Triple Monitor Stand can support monitors up to 55 inches with a maximum weight of 35 lbs per monitor.",
          "sortOrder": 0
        }
      ],
      "assemblyManuals": [
        {
          "id": 1,
          "name": "Assembly Guide PDF",
          "description": "Complete assembly instructions",
          "fileUrl": "https://cdn.simfab.com/manuals/trainer-assembly.pdf",
          "fileType": "pdf",
          "fileSize": 2457600,
          "thumbnailUrl": "https://cdn.simfab.com/manuals/thumbs/trainer.jpg"
        }
      ],
      "additionalInfo": [
        {
          "id": 1,
          "title": "Product Features",
          "contentType": "text",
          "content": "This trainer station features modular design for easy customization..."
        }
      ],
      "categories": ["flight-sim", "cockpits", "trainer-stations"],
      "tags": ["best-seller", "modular", "customizable"],
      "rating": {
        "average": 4.8,
        "count": 127,
        "distribution": {
          "5": 95,
          "4": 25,
          "3": 5,
          "2": 1,
          "1": 1
        }
      },
      "seo": {
        "title": "SimFab Flight Sim Trainer Station - Professional Aviation Simulator",
        "description": "Experience precision aviation training with SimFab's modular Flight Sim Trainer Station. Customizable, ergonomic design for serious flight simulation enthusiasts."
      },
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2025-10-08T14:30:00Z"
    },
    "relatedProducts": [
      {
        "id": 102,
        "name": "Triple Monitor Stand",
        "slug": "triple-monitor-stand",
        "price": { "min": 399.00, "max": 399.00 },
        "imageUrl": "https://cdn.simfab.com/products/monitor-stand.jpg"
      }
    ],
    "frequentlyBoughtTogether": [
      {
        "id": 103,
        "name": "Racing Seat Cushion Set",
        "price": 79.99,
        "imageUrl": "https://cdn.simfab.com/products/cushion-set.jpg"
      }
    ]
  }
}
```

**Error Responses**:

404 Not Found:
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found",
    "productId": 999
  }
}
```

---

### 3. Product Price Calculator

**Endpoint**: `POST /api/products/:id/calculate-price`

**Request Body**:
```json
{
  "colorId": 1,
  "modelVariationId": 1,
  "dropdownSelections": {
    "2": 2,
    "3": 1
  },
  "addons": [
    {
      "addonId": 1,
      "optionId": 1
    }
  ],
  "quantity": 1
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "pricing": {
      "basePrice": 999.00,
      "variationAdjustments": [
        {
          "name": "Premium Rudder Pedals",
          "amount": 150.00
        }
      ],
      "addonsTotal": 199.00,
      "subtotal": 1348.00,
      "quantity": 1,
      "total": 1348.00,
      "currency": "USD"
    },
    "breakdown": {
      "base": 999.00,
      "variations": 150.00,
      "addons": 199.00
    }
  }
}
```

---

### 4. Search Products

**Endpoint**: `GET /api/products/search`

**Query Parameters**:
```
?q=racing cockpit
&category=sim-racing
&page=1
&limit=10
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "query": "racing cockpit",
    "results": [
      {
        "id": 105,
        "name": "Gen3 Racing Modular Cockpit",
        "slug": "gen3-racing-cockpit",
        "price": { "min": 799.00, "max": 2500.00 },
        "imageUrl": "https://cdn.simfab.com/products/gen3-racing.jpg",
        "matchScore": 0.95,
        "matchedFields": ["name", "description", "tags"]
      }
    ],
    "suggestions": [
      "sim racing",
      "racing seat",
      "racing wheel stand"
    ],
    "total": 12,
    "page": 1,
    "limit": 10
  }
}
```

---

## Shopping Cart System

### 1. Get Cart

**Endpoint**: `GET /api/cart`

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "cart": {
      "id": "cart_abc123",
      "userId": 1234,
      "sessionId": "sess_xyz789",
      "items": [
        {
          "id": "item_1",
          "productId": 101,
          "productName": "SimFab Flight Sim Trainer Station",
          "productSku": "FS-TRAINER-001",
          "productImage": "https://cdn.simfab.com/products/trainer-main.jpg",
          "quantity": 1,
          "configuration": {
            "colorId": 1,
            "colorName": "Black",
            "modelVariationId": 1,
            "dropdownSelections": [
              {
                "variationId": 2,
                "variationName": "Rudder Pedals",
                "optionId": 2,
                "optionName": "Premium Rudder Pedals",
                "priceAdjustment": 150.00
              }
            ],
            "addons": [
              {
                "addonId": 1,
                "addonName": "Articulating Arm Kit",
                "optionId": 1,
                "optionName": "Keyboard & Mouse Tray",
                "price": 199.00
              }
            ]
          },
          "pricing": {
            "unitPrice": 1348.00,
            "lineTotal": 1348.00,
            "originalPrice": 1348.00,
            "discount": 0
          },
          "addedAt": "2025-10-09T10:00:00Z"
        }
      ],
      "totals": {
        "subtotal": 1348.00,
        "discount": 0,
        "shipping": 0,
        "tax": 0,
        "total": 1348.00,
        "currency": "USD",
        "itemCount": 1
      },
      "appliedCoupons": [],
      "shippingEstimate": {
        "available": false,
        "message": "Enter shipping address to calculate shipping"
      },
      "createdAt": "2025-10-09T10:00:00Z",
      "updatedAt": "2025-10-09T10:05:00Z",
      "expiresAt": "2025-10-16T10:00:00Z"
    }
  }
}
```

**Error Responses**:

404 Not Found - Empty Cart:
```json
{
  "success": false,
  "error": {
    "code": "CART_EMPTY",
    "message": "Your cart is empty"
  }
}
```

---

### 2. Add to Cart

**Endpoint**: `POST /api/cart/add`

**Request Body**:
```json
{
  "productId": 101,
  "quantity": 1,
  "configuration": {
    "colorId": 1,
    "modelVariationId": 1,
    "dropdownSelections": {
      "2": 2,
      "3": 1
    },
    "addons": [
      {
        "addonId": 1,
        "optionId": 1
      }
    ]
  }
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "Product added to cart",
  "data": {
    "cartItem": {
      "id": "item_1",
      "productId": 101,
      "productName": "SimFab Flight Sim Trainer Station",
      "quantity": 1,
      "unitPrice": 1348.00,
      "lineTotal": 1348.00
    },
    "cartTotals": {
      "subtotal": 1348.00,
      "total": 1348.00,
      "itemCount": 1
    }
  }
}
```

**Error Responses**:

400 Bad Request - Invalid Configuration:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CONFIGURATION",
    "message": "Product configuration is invalid",
    "details": [
      {
        "field": "dropdownSelections.2",
        "message": "Required variation 'Rudder Pedals' must be selected"
      }
    ]
  }
}
```

404 Not Found - Product Not Available:
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_AVAILABLE",
    "message": "This product is currently unavailable",
    "productId": 101,
    "reason": "out_of_stock"
  }
}
```

409 Conflict - Insufficient Stock:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Not enough stock available",
    "requested": 5,
    "available": 2,
    "productId": 101
  }
}
```

---

### 3. Update Cart Item

**Endpoint**: `PUT /api/cart/items/:itemId`

**Request Body**:
```json
{
  "quantity": 2
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Cart updated",
  "data": {
    "cartItem": {
      "id": "item_1",
      "quantity": 2,
      "unitPrice": 1348.00,
      "lineTotal": 2696.00
    },
    "cartTotals": {
      "subtotal": 2696.00,
      "total": 2696.00,
      "itemCount": 2
    }
  }
}
```

**Error Responses**:

400 Bad Request - Invalid Quantity:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUANTITY",
    "message": "Quantity must be between 1 and 10",
    "min": 1,
    "max": 10
  }
}
```

---

### 4. Remove from Cart

**Endpoint**: `DELETE /api/cart/items/:itemId`

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Item removed from cart",
  "data": {
    "removedItemId": "item_1",
    "cartTotals": {
      "subtotal": 0,
      "total": 0,
      "itemCount": 0
    }
  }
}
```

---

### 5. Apply Coupon

**Endpoint**: `POST /api/cart/apply-coupon`

**Request Body**:
```json
{
  "couponCode": "SAVE10"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Coupon applied successfully",
  "data": {
    "coupon": {
      "code": "SAVE10",
      "type": "percentage",
      "value": 10,
      "description": "10% off your order"
    },
    "discount": {
      "amount": 134.80,
      "percentage": 10
    },
    "cartTotals": {
      "subtotal": 1348.00,
      "discount": 134.80,
      "total": 1213.20,
      "itemCount": 1
    }
  }
}
```

**Error Responses**:

400 Bad Request - Invalid Coupon:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_COUPON",
    "message": "Coupon code is invalid or has expired",
    "couponCode": "SAVE10"
  }
}
```

400 Bad Request - Minimum Order Not Met:
```json
{
  "success": false,
  "error": {
    "code": "MINIMUM_NOT_MET",
    "message": "This coupon requires a minimum order of $500",
    "required": 500.00,
    "current": 350.00
  }
}
```

---

### 6. Calculate Shipping

**Endpoint**: `POST /api/cart/calculate-shipping`

**Request Body**:
```json
{
  "shippingAddress": {
    "addressLine1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US"
  }
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "shippingOptions": [
      {
        "id": "standard",
        "name": "Standard Shipping",
        "carrier": "USPS",
        "serviceCode": "usps_priority",
        "cost": 25.00,
        "estimatedDays": {
          "min": 3,
          "max": 5
        },
        "description": "Delivered in 3-5 business days"
      },
      {
        "id": "express",
        "name": "Express Shipping",
        "carrier": "FedEx",
        "serviceCode": "fedex_2day",
        "cost": 45.00,
        "estimatedDays": {
          "min": 2,
          "max": 2
        },
        "description": "Delivered in 2 business days"
      },
      {
        "id": "overnight",
        "name": "Overnight Shipping",
        "carrier": "FedEx",
        "serviceCode": "fedex_overnight",
        "cost": 89.00,
        "estimatedDays": {
          "min": 1,
          "max": 1
        },
        "description": "Next business day delivery"
      }
    ],
    "freeShippingThreshold": {
      "enabled": true,
      "threshold": 500.00,
      "current": 1348.00,
      "qualified": true,
      "message": "You qualify for free standard shipping!"
    }
  }
}
```

**Error Responses**:

400 Bad Request - Invalid Address:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_ADDRESS",
    "message": "Unable to calculate shipping for this address",
    "details": [
      {
        "field": "postalCode",
        "message": "Postal code not found"
      }
    ]
  }
}
```

422 Unprocessable Entity - Cannot Ship to Location:
```json
{
  "success": false,
  "error": {
    "code": "SHIPPING_RESTRICTED",
    "message": "We cannot ship to this location",
    "reason": "Product restrictions apply to Alaska and Hawaii for oversized items",
    "alternativeOptions": [
      {
        "message": "Contact customer service for freight shipping quote",
        "contact": "1-888-299-2746"
      }
    ]
  }
}
```

---

## Product Recommendation Engine

### 1. Get Personalized Recommendations

**Endpoint**: `GET /api/recommendations/personalized`

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "section": "based-on-browsing",
        "title": "Based on Your Browsing History",
        "products": [
          {
            "id": 102,
            "name": "Triple Monitor Stand",
            "price": { "min": 399.00, "max": 399.00 },
            "imageUrl": "https://cdn.simfab.com/products/monitor-stand.jpg",
            "relevanceScore": 0.92,
            "reason": "Viewed similar products"
          }
        ]
      },
      {
        "section": "frequently-bought-together",
        "title": "Customers Also Bought",
        "products": [
          {
            "id": 103,
            "name": "Racing Seat Cushion Set",
            "price": { "min": 79.99, "max": 79.99 },
            "imageUrl": "https://cdn.simfab.com/products/cushion.jpg",
            "relevanceScore": 0.88,
            "reason": "95% of customers who bought this also purchased this item"
          }
        ]
      },
      {
        "section": "trending",
        "title": "Trending Now",
        "products": [
          {
            "id": 104,
            "name": "Articulating Keyboard Arm",
            "price": { "min": 199.00, "max": 229.00 },
            "imageUrl": "https://cdn.simfab.com/products/keyboard-arm.jpg",
            "relevanceScore": 0.85,
            "reason": "Popular this week"
          }
        ]
      }
    ],
    "metadata": {
      "personalized": true,
      "userId": 1234,
      "generatedAt": "2025-10-09T10:30:00Z"
    }
  }
}
```

---

### 2. Get Product Recommendations

**Endpoint**: `GET /api/recommendations/products/:productId`

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 101,
      "name": "SimFab Flight Sim Trainer Station"
    },
    "recommendations": {
      "relatedProducts": [
        {
          "id": 105,
          "name": "DCS Flight Sim Modular Cockpit",
          "reason": "Similar category",
          "similarity": 0.89
        }
      ],
      "frequentlyBoughtTogether": [
        {
          "id": 103,
          "name": "Racing Seat Cushion Set",
          "coOccurrenceRate": 0.75,
          "reason": "Often purchased together"
        }
      ],
      "upgrades": [
        {
          "id": 106,
          "name": "Professional Flight Sim Station",
          "priceDifference": 1500.00,
          "reason": "Premium alternative"
        }
      ],
      "accessories": [
        {
          "id": 107,
          "name": "Lumbar Support Pillow",
          "reason": "Recommended accessory"
        }
      ]
    }
  }
}
```

---

### 3. Recently Viewed Products

**Endpoint**: `GET /api/recommendations/recently-viewed`

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 101,
        "name": "SimFab Flight Sim Trainer Station",
        "price": { "min": 999.00, "max": 3522.00 },
        "imageUrl": "https://cdn.simfab.com/products/trainer.jpg",
        "viewedAt": "2025-10-09T10:25:00Z"
      },
      {
        "id": 102,
        "name": "Triple Monitor Stand",
        "price": { "min": 399.00, "max": 399.00 },
        "imageUrl": "https://cdn.simfab.com/products/monitor-stand.jpg",
        "viewedAt": "2025-10-09T10:20:00Z"
      }
    ],
    "total": 5,
    "limit": 10
  }
}
```

---

## Order Management

### 1. Create Order

**Endpoint**: `POST /api/orders`

**Request Body**:
```json
{
  "billingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "company": "Tech Corp",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US",
    "phone": "+1-555-0123",
    "email": "customer@example.com"
  },
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US",
    "phone": "+1-555-0123"
  },
  "shippingMethodId": "standard",
  "paymentMethodId": "paypal",
  "orderNotes": "Please leave at front desk",
  "subscribeNewsletter": true
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": 5001,
      "orderNumber": "SF-20251009-5001",
      "status": "pending_payment",
      "paymentStatus": "pending",
      "totals": {
        "subtotal": 1348.00,
        "shipping": 25.00,
        "tax": 120.00,
        "discount": 0,
        "total": 1493.00,
        "currency": "USD"
      },
      "items": [
        {
          "id": 1,
          "productId": 101,
          "productName": "SimFab Flight Sim Trainer Station",
          "quantity": 1,
          "unitPrice": 1348.00,
          "total": 1348.00
        }
      ],
      "billingAddress": {
        "firstName": "John",
        "lastName": "Doe",
        "addressLine1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "US"
      },
      "shippingAddress": {
        "firstName": "John",
        "lastName": "Doe",
        "addressLine1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "US"
      },
      "payment": {
        "method": "paypal",
        "status": "pending",
        "paymentUrl": "https://paypal.com/checkout?token=abc123"
      },
      "createdAt": "2025-10-09T10:45:00Z"
    },
    "nextSteps": {
      "action": "complete_payment",
      "url": "https://paypal.com/checkout?token=abc123",
      "message": "Complete payment to confirm your order"
    }
  }
}
```

**Error Responses**:

400 Bad Request - Cart Empty:
```json
{
  "success": false,
  "error": {
    "code": "CART_EMPTY",
    "message": "Cannot create order with empty cart"
  }
}
```

400 Bad Request - Stock Unavailable:
```json
{
  "success": false,
  "error": {
    "code": "STOCK_UNAVAILABLE",
    "message": "Some items in your cart are no longer available",
    "unavailableItems": [
      {
        "productId": 101,
        "productName": "SimFab Flight Sim Trainer Station",
        "requested": 2,
        "available": 1
      }
    ]
  }
}
```

---

### 2. Get Order Details

**Endpoint**: `GET /api/orders/:orderNumber`

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 5001,
      "orderNumber": "SF-20251009-5001",
      "status": "shipped",
      "paymentStatus": "paid",
      "shippingStatus": "in_transit",
      "totals": {
        "subtotal": 1348.00,
        "shipping": 25.00,
        "tax": 120.00,
        "discount": 0,
        "total": 1493.00,
        "currency": "USD"
      },
      "items": [
        {
          "id": 1,
          "productId": 101,
          "productName": "SimFab Flight Sim Trainer Station",
          "productSku": "FS-TRAINER-001",
          "productImage": "https://cdn.simfab.com/products/trainer.jpg",
          "quantity": 1,
          "unitPrice": 1348.00,
          "total": 1348.00,
          "configuration": {
            "color": "Black",
            "variations": [
              {
                "name": "Rudder Pedals",
                "value": "Premium Rudder Pedals"
              }
            ],
            "addons": [
              {
                "name": "Articulating Arm Kit",
                "option": "Keyboard & Mouse Tray"
              }
            ]
          }
        }
      ],
      "customer": {
        "email": "customer@example.com",
        "phone": "+1-555-0123"
      },
      "billingAddress": {
        "firstName": "John",
        "lastName": "Doe",
        "addressLine1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "US"
      },
      "shippingAddress": {
        "firstName": "John",
        "lastName": "Doe",
        "addressLine1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "US"
      },
      "shipping": {
        "method": "Standard Shipping",
        "carrier": "USPS",
        "trackingNumber": "9400111899223347123456",
        "trackingUrl": "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223347123456",
        "estimatedDelivery": "2025-10-14T17:00:00Z",
        "shippedAt": "2025-10-10T09:00:00Z"
      },
      "payment": {
        "method": "PayPal",
        "transactionId": "PAY-12345ABC",
        "paidAt": "2025-10-09T10:50:00Z"
      },
      "timeline": [
        {
          "status": "pending",
          "timestamp": "2025-10-09T10:45:00Z",
          "message": "Order placed"
        },
        {
          "status": "processing",
          "timestamp": "2025-10-09T10:50:00Z",
          "message": "Payment confirmed"
        },
        {
          "status": "shipped",
          "timestamp": "2025-10-10T09:00:00Z",
          "message": "Order shipped"
        }
      ],
      "notes": "Please leave at front desk",
      "createdAt": "2025-10-09T10:45:00Z",
      "updatedAt": "2025-10-10T09:00:00Z"
    }
  }
}
```

**Error Responses**:

404 Not Found:
```json
{
  "success": false,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order not found",
    "orderNumber": "SF-20251009-9999"
  }
}
```

403 Forbidden - Not Your Order:
```json
{
  "success": false,
  "error": {
    "code": "ACCESS_DENIED",
    "message": "You don't have permission to view this order"
  }
}
```

---

### 3. List User Orders

**Endpoint**: `GET /api/orders`

**Query Parameters**:
```
?page=1&limit=10&status=all
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 5001,
        "orderNumber": "SF-20251009-5001",
        "status": "shipped",
        "paymentStatus": "paid",
        "total": 1493.00,
        "currency": "USD",
        "itemCount": 1,
        "preview": {
          "firstItemName": "SimFab Flight Sim Trainer Station",
          "firstItemImage": "https://cdn.simfab.com/products/trainer.jpg"
        },
        "tracking": {
          "carrier": "USPS",
          "number": "9400111899223347123456"
        },
        "createdAt": "2025-10-09T10:45:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### 4. Cancel Order

**Endpoint**: `POST /api/orders/:orderNumber/cancel`

**Request Body**:
```json
{
  "reason": "Changed my mind",
  "comments": "Found a better deal elsewhere"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "order": {
      "orderNumber": "SF-20251009-5001",
      "status": "cancelled",
      "refund": {
        "amount": 1493.00,
        "method": "paypal",
        "estimatedProcessingDays": 5,
        "status": "processing"
      }
    }
  }
}
```

**Error Responses**:

400 Bad Request - Cannot Cancel:
```json
{
  "success": false,
  "error": {
    "code": "CANNOT_CANCEL",
    "message": "Order cannot be cancelled at this stage",
    "reason": "Order has already shipped",
    "currentStatus": "shipped",
    "suggestion": "Please contact customer service for assistance"
  }
}
```

---

## Payment Processing

### 1. Create Payment

**Endpoint**: `POST /api/payments/create`

**Request Body**:
```json
{
  "orderNumber": "SF-20251009-5001",
  "paymentMethod": "paypal",
  "returnUrl": "https://simfab.com/checkout/success",
  "cancelUrl": "https://simfab.com/checkout/cancel"
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "pay_abc123",
      "orderId": 5001,
      "amount": 1493.00,
      "currency": "USD",
      "status": "created",
      "method": "paypal"
    },
    "approval": {
      "approvalUrl": "https://www.paypal.com/checkoutnow?token=EC-ABC123",
      "token": "EC-ABC123",
      "expiresAt": "2025-10-09T13:45:00Z"
    }
  }
}
```

---

### 2. Execute Payment

**Endpoint**: `POST /api/payments/execute`

**Request Body**:
```json
{
  "paymentId": "pay_abc123",
  "payerId": "PAYERID123",
  "token": "EC-ABC123"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Payment completed successfully",
  "data": {
    "payment": {
      "id": "pay_abc123",
      "orderId": 5001,
      "orderNumber": "SF-20251009-5001",
      "amount": 1493.00,
      "currency": "USD",
      "status": "completed",
      "transactionId": "PAY-12345ABC",
      "paidAt": "2025-10-09T10:50:00Z"
    },
    "order": {
      "orderNumber": "SF-20251009-5001",
      "status": "processing",
      "paymentStatus": "paid"
    },
    "receipt": {
      "url": "https://simfab.com/orders/SF-20251009-5001/receipt",
      "emailSent": true
    }
  }
}
```

**Error Responses**:

400 Bad Request - Payment Failed:
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "Payment could not be processed",
    "reason": "Insufficient funds",
    "paymentId": "pay_abc123",
    "canRetry": true
  }
}
```

402 Payment Required - Payment Declined:
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_DECLINED",
    "message": "Payment was declined by your financial institution",
    "suggestion": "Please try a different payment method or contact your bank"
  }
}
```

---

### 3. Process Refund

**Endpoint**: `POST /api/payments/:paymentId/refund`

**Request Body**:
```json
{
  "amount": 1493.00,
  "reason": "customer_request",
  "notes": "Customer requested cancellation"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "refund": {
      "id": "ref_xyz789",
      "paymentId": "pay_abc123",
      "amount": 1493.00,
      "currency": "USD",
      "status": "pending",
      "reason": "customer_request",
      "estimatedProcessingDays": 5,
      "processedAt": "2025-10-09T11:00:00Z"
    },
    "order": {
      "orderNumber": "SF-20251009-5001",
      "status": "refunded",
      "paymentStatus": "refunded"
    }
  }
}
```

---

## Shipping Integration

### 1. Get Shipping Rates

**Endpoint**: `POST /api/shipping/rates`

**Request Body**:
```json
{
  "fromAddress": {
    "postalCode": "33101",
    "country": "US",
    "state": "FL"
  },
  "toAddress": {
    "postalCode": "10001",
    "country": "US",
    "state": "NY"
  },
  "packages": [
    {
      "weight": 73.6,
      "length": 37,
      "width": 23,
      "height": 16,
      "weightUnit": "lbs",
      "dimensionUnit": "inches"
    }
  ]
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "rates": [
      {
        "id": "rate_1",
        "carrier": "USPS",
        "service": "Priority Mail",
        "serviceCode": "usps_priority",
        "rate": 25.00,
        "currency": "USD",
        "deliveryDays": 3,
        "deliveryDate": "2025-10-12T17:00:00Z",
        "estimatedDeliveryDate": "Saturday, October 12"
      },
      {
        "id": "rate_2",
        "carrier": "FedEx",
        "service": "FedEx Ground",
        "serviceCode": "fedex_ground",
        "rate": 28.50,
        "currency": "USD",
        "deliveryDays": 4,
        "deliveryDate": "2025-10-13T17:00:00Z",
        "estimatedDeliveryDate": "Monday, October 13"
      }
    ],
    "warnings": [
      {
        "code": "OVERSIZED",
        "message": "Package exceeds standard size limits. Additional handling fees may apply."
      }
    ]
  }
}
```

---

### 2. Create Shipping Label

**Endpoint**: `POST /api/shipping/labels`

**Request Body**:
```json
{
  "orderId": 5001,
  "carrierCode": "usps_priority",
  "shipDate": "2025-10-10"
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "Shipping label created",
  "data": {
    "label": {
      "id": "label_abc123",
      "orderId": 5001,
      "trackingNumber": "9400111899223347123456",
      "carrier": "USPS",
      "service": "Priority Mail",
      "cost": 25.00,
      "labelUrl": "https://cdn.simfab.com/labels/label_abc123.pdf",
      "labelFormat": "pdf",
      "trackingUrl": "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223347123456",
      "estimatedDelivery": "2025-10-14T17:00:00Z",
      "createdAt": "2025-10-10T09:00:00Z"
    }
  }
}
```

---

### 3. Track Shipment

**Endpoint**: `GET /api/shipping/tracking/:trackingNumber`

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tracking": {
      "trackingNumber": "9400111899223347123456",
      "carrier": "USPS",
      "status": "in_transit",
      "statusDescription": "In Transit to Next Facility",
      "estimatedDelivery": "2025-10-14T17:00:00Z",
      "actualDelivery": null,
      "events": [
        {
          "timestamp": "2025-10-10T09:00:00Z",
          "status": "picked_up",
          "description": "Picked up by carrier",
          "location": {
            "city": "Miami",
            "state": "FL",
            "country": "US"
          }
        },
        {
          "timestamp": "2025-10-11T14:30:00Z",
          "status": "in_transit",
          "description": "Departed shipping facility",
          "location": {
            "city": "Jacksonville",
            "state": "FL",
            "country": "US"
          }
        }
      ],
      "shipment": {
        "from": {
          "city": "Miami",
          "state": "FL",
          "country": "US"
        },
        "to": {
          "city": "New York",
          "state": "NY",
          "country": "US"
        }
      }
    }
  }
}
```

---

## Admin Dashboard API

### 1. Dashboard Statistics

**Endpoint**: `GET /api/admin/dashboard/stats`

**Headers**:
```
Authorization: Bearer admin_token_xyz
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "overview": {
      "todaySales": {
        "amount": 15678.90,
        "orderCount": 12,
        "changePercentage": 8.5,
        "comparedTo": "yesterday"
      },
      "monthSales": {
        "amount": 234567.89,
        "orderCount": 187,
        "changePercentage": 15.2,
        "comparedTo": "last_month"
      },
      "pendingOrders": 23,
      "processingOrders": 45,
      "lowStockProducts": 8
    },
    "recentOrders": [
      {
        "id": 5001,
        "orderNumber": "SF-20251009-5001",
        "customerName": "John Doe",
        "total": 1493.00,
        "status": "processing",
        "createdAt": "2025-10-09T10:45:00Z"
      }
    ],
    "topProducts": [
      {
        "id": 101,
        "name": "SimFab Flight Sim Trainer Station",
        "salesCount": 45,
        "revenue": 60660.00
      }
    ],
    "salesChart": {
      "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      "data": [12000, 15000, 13500, 18000, 16000, 14000, 11500]
    }
  }
}
```

**Error Responses**:

403 Forbidden - Not Admin:
```json
{
  "success": false,
  "error": {
    "code": "ADMIN_ACCESS_REQUIRED",
    "message": "This endpoint requires administrator privileges"
  }
}
```

---

### 2. Admin - Update Order Status

**Endpoint**: `PUT /api/admin/orders/:orderNumber/status`

**Request Body**:
```json
{
  "status": "shipped",
  "trackingNumber": "9400111899223347123456",
  "carrier": "USPS",
  "notes": "Package shipped via USPS Priority Mail"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Order status updated",
  "data": {
    "order": {
      "orderNumber": "SF-20251009-5001",
      "status": "shipped",
      "shippingStatus": "in_transit",
      "trackingNumber": "9400111899223347123456",
      "updatedAt": "2025-10-10T09:00:00Z"
    },
    "notifications": {
      "customerEmailSent": true,
      "emailType": "shipping_notification"
    }
  }
}
```

---

### 3. Admin - Create Product

**Endpoint**: `POST /api/admin/products`

**Request Body**:
```json
{
  "sku": "NEW-PRODUCT-001",
  "name": "New Racing Cockpit",
  "slug": "new-racing-cockpit",
  "description": "Complete racing cockpit with adjustable features",
  "shortDescription": "Professional racing setup",
  "type": "configurable",
  "status": "active",
  "featured": false,
  "price": {
    "min": 799.00,
    "max": 2499.00
  },
  "specifications": {
    "weight": 65.0,
    "length": 40,
    "width": 25,
    "height": 18
  },
  "inventory": {
    "quantity": 50,
    "lowStockThreshold": 10,
    "manageStock": true,
    "allowBackorders": false
  },
  "categories": ["sim-racing", "cockpits"],
  "tags": ["new", "racing"],
  "seo": {
    "title": "Professional Racing Cockpit - SimFab",
    "description": "High-quality racing cockpit for serious sim racers"
  }
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product": {
      "id": 108,
      "sku": "NEW-PRODUCT-001",
      "name": "New Racing Cockpit",
      "slug": "new-racing-cockpit",
      "status": "active",
      "createdAt": "2025-10-09T11:00:00Z"
    },
    "nextSteps": [
      "Add product images",
      "Configure variations",
      "Set up add-ons"
    ]
  }
}
```

**Error Responses**:

409 Conflict - SKU Exists:
```json
{
  "success": false,
  "error": {
    "code": "SKU_EXISTS",
    "message": "A product with this SKU already exists",
    "sku": "NEW-PRODUCT-001",
    "existingProductId": 99
  }
}
```

---

### 4. Admin - User Management

**Endpoint**: `GET /api/admin/users`

**Query Parameters**:
```
?page=1&limit=50&search=john&role=customer
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1234,
        "email": "customer@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "customer",
        "emailVerified": true,
        "stats": {
          "totalOrders": 5,
          "totalSpent": 7845.67,
          "lastOrderDate": "2025-09-15T14:30:00Z"
        },
        "createdAt": "2025-01-15T08:00:00Z",
        "lastLogin": "2025-10-09T10:35:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1247,
      "totalPages": 25
    }
  }
}
```

---

## Error Handling Standards

### Standard Error Response Format

All errors follow this consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [],
    "requestId": "req_abc123",
    "timestamp": "2025-10-09T10:45:00Z"
  }
}
```

### HTTP Status Codes

| Status Code | Meaning | Usage |
|-------------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST creating resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (duplicate) |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Temporary unavailability |

### Common Error Codes

```typescript
// Authentication Errors
UNAUTHORIZED = "UNAUTHORIZED"
INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
TOKEN_EXPIRED = "TOKEN_EXPIRED"
EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED"
ACCOUNT_LOCKED = "ACCOUNT_LOCKED"

// Validation Errors
VALIDATION_ERROR = "VALIDATION_ERROR"
INVALID_INPUT = "INVALID_INPUT"
REQUIRED_FIELD = "REQUIRED_FIELD"
INVALID_FORMAT = "INVALID_FORMAT"

// Resource Errors
NOT_FOUND = "NOT_FOUND"
PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND"
ORDER_NOT_FOUND = "ORDER_NOT_FOUND"
USER_NOT_FOUND = "USER_NOT_FOUND"

// Business Logic Errors
OUT_OF_STOCK = "OUT_OF_STOCK"
INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK"
INVALID_CONFIGURATION = "INVALID_CONFIGURATION"
CART_EMPTY = "CART_EMPTY"
INVALID_COUPON = "INVALID_COUPON"
MINIMUM_NOT_MET = "MINIMUM_NOT_MET"

// Payment Errors
PAYMENT_FAILED = "PAYMENT_FAILED"
PAYMENT_DECLINED = "PAYMENT_DECLINED"
INVALID_PAYMENT_METHOD = "INVALID_PAYMENT_METHOD"

// Shipping Errors
SHIPPING_RESTRICTED = "SHIPPING_RESTRICTED"
INVALID_ADDRESS = "INVALID_ADDRESS"
SHIPPING_CALCULATION_FAILED = "SHIPPING_CALCULATION_FAILED"

// System Errors
SERVER_ERROR = "SERVER_ERROR"
DATABASE_ERROR = "DATABASE_ERROR"
SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
```

---

## Database Schema

### Key Tables Summary

1. **users** - Customer and admin accounts
2. **user_addresses** - Billing/shipping addresses
3. **products** - Product catalog
4. **product_images** - Product image gallery
5. **product_colors** - Color variations
6. **product_variations** - Model/dropdown variations
7. **variation_options** - Options for variations
8. **product_addons** - Optional add-ons
9. **addon_options** - Add-on configuration options
10. **product_faqs** - Product FAQ sections
11. **assembly_manuals** - Assembly instructions
12. **product_additional_info** - Extended product information
13. **carts** - Shopping cart sessions
14. **cart_items** - Items in shopping carts
15. **orders** - Order records
16. **order_items** - Products in orders
17. **payments** - Payment transactions
18. **shipments** - Shipping information
19. **coupons** - Discount codes
20. **newsletter_subscriptions** - Email subscribers
21. **admin_activity_logs** - Audit trail
22. **system_settings** - Configuration

### Indexes for Performance

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Product searches
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_featured ON products(featured);
CREATE INDEX idx_products_categories ON products USING GIN(categories);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);

-- Order lookups
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Cart management
CREATE INDEX idx_carts_session ON carts(session_id);
CREATE INDEX idx_carts_user ON carts(user_id);

-- Performance indexes
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_product_images_product ON product_images(product_id);
```

---

## Implementation Priorities

### Phase 1: Core Foundation (Week 1-2)
- [ ] Enhanced database schema migration
- [ ] User authentication with roles
- [ ] Session management
- [ ] Basic error handling

### Phase 2: Product System (Week 3-4)
- [ ] Product CRUD with variations
- [ ] Image upload system
- [ ] Product search and filtering
- [ ] Inventory management

### Phase 3: Shopping Cart (Week 5)
- [ ] Cart session management
- [ ] Add/update/remove operations
- [ ] Price calculation engine
- [ ] Coupon system

### Phase 4: Checkout & Orders (Week 6-7)
- [ ] Order creation workflow
- [ ] Address validation
- [ ] Order management
- [ ] Order history

### Phase 5: Payment Integration (Week 8-9)
- [ ] PayPal API integration
- [ ] Payment processing
- [ ] Refund handling
- [ ] Payment webhooks

### Phase 6: Shipping Integration (Week 10-11)
- [ ] ShipStation API integration
- [ ] Rate calculation
- [ ] Label generation
- [ ] Tracking system

### Phase 7: Admin Dashboard (Week 12-14)
- [ ] Admin authentication
- [ ] Dashboard analytics
- [ ] Order management interface
- [ ] Product management interface
- [ ] User management

### Phase 8: Recommendations (Week 15)
- [ ] Product recommendation engine
- [ ] Browsing history tracking
- [ ] Frequently bought together
- [ ] Related products

### Phase 9: Email System (Week 16)
- [ ] Email template engine
- [ ] Order confirmation emails
- [ ] Shipping notifications
- [ ] Newsletter system

### Phase 10: Testing & Optimization (Week 17-18)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance optimization
- [ ] Security audit

---

## Security Considerations

### 1. Authentication & Authorization
```typescript
// Middleware for protecting routes
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required"
      }
    });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.session.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: "ADMIN_ACCESS_REQUIRED",
        message: "Administrator privileges required"
      }
    });
  }
  next();
};
```

### 2. Input Validation
```typescript
// Example validation middleware
const validateProduct = (req, res, next) => {
  const { sku, name, price } = req.body;
  
  const errors = [];
  
  if (!sku || sku.length < 3) {
    errors.push({
      field: "sku",
      message: "SKU must be at least 3 characters"
    });
  }
  
  if (!name || name.length < 5) {
    errors.push({
      field: "name",
      message: "Name must be at least 5 characters"
    });
  }
  
  if (!price || price.min < 0) {
    errors.push({
      field: "price",
      message: "Price must be positive"
    });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input data",
        details: errors
      }
    });
  }
  
  next();
};
```

### 3. Rate Limiting
```typescript
// Rate limiting configuration
const rateLimit = {
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // 100 requests per window
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5 // 5 login attempts
  },
  admin: {
    windowMs: 60 * 1000,
    max: 60 // 60 requests per minute
  }
};
```

### 4. SQL Injection Prevention
```typescript
// Always use parameterized queries
const getProduct = async (id: number) => {
  const result = await pool.query(
    'SELECT * FROM products WHERE id = $1',
    [id]
  );
  return result.rows[0];
};
```

### 5. Password Security
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// Hash password
const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

// Verify password
const verifyPassword = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};
```

---

## Monitoring & Logging

### Request Logging
```typescript
// Log all API requests
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  
  next();
});
```

### Error Logging
```typescript
// Global error handler
app.use((err, req, res, next) => {
  const requestId = generateRequestId();
  
  // Log error
  console.error({
    requestId,
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    userId: req.session?.userId
  });
  
  // Send error response
  res.status(500).json({
    success: false,
    error: {
      code: "SERVER_ERROR",
      message: "An unexpected error occurred",
      requestId
    }
  });
});
```

---

## Conclusion

This comprehensive backend specification provides:

✅ **Complete API Documentation** with request/response examples
✅ **Detailed Error Handling** with status codes and error messages
✅ **Security Best Practices** for authentication, validation, and data protection
✅ **Scalable Architecture** for growth and performance
✅ **Clear Implementation Roadmap** with phases and priorities
✅ **Product Recommendation System** for enhanced user experience
✅ **Shopping Cart Management** with configuration support
✅ **Order Processing** with payment and shipping integration
✅ **Admin Dashboard** for complete business management

The system is designed to support SimFab's complex product configurations, provide excellent customer experience, and enable efficient business operations through a powerful admin dashboard.

