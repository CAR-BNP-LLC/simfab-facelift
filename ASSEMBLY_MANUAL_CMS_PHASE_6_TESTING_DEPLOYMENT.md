# 📚 Assembly Manuals CMS - Phase 6: Testing & Deployment

**Goal**: Comprehensive testing checklist and deployment guide.

---

## 🎯 Overview

This phase covers:
- Complete testing checklist
- Deployment considerations
- Environment variables
- File storage setup
- Security verification
- Performance optimization
- Troubleshooting guide

---

## ✅ Complete Testing Checklist

### Backend Testing

#### Database & Migration
- [ ] Migration runs successfully
- [ ] Tables created correctly
- [ ] Indexes created
- [ ] Foreign keys working
- [ ] Cascade deletes working
- [ ] Existing data migrated (if applicable)

#### QR Code Service
- [ ] QR code directory created automatically
- [ ] QR code generation works
- [ ] QR code file saved correctly
- [ ] QR code URL format correct
- [ ] QR code regeneration works
- [ ] QR code deletion works
- [ ] QR code contains correct URL

#### Assembly Manual Service
- [ ] `getAllManuals()` - no filters
- [ ] `getAllManuals()` - filter by `is_public`
- [ ] `getAllManuals()` - filter by `product_id`
- [ ] `getManualById()` - with products
- [ ] `getManualById()` - without products
- [ ] `createManual()` - creates with QR code
- [ ] `updateManual()` - partial updates
- [ ] `deleteManual()` - deletes QR code
- [ ] `assignToProducts()` - single product
- [ ] `assignToProducts()` - multiple products
- [ ] `assignToProducts()` - remove all
- [ ] `getManualsForProduct()` - only public
- [ ] `regenerateQRCode()` - creates new QR

#### Controller Endpoints
- [ ] GET `/api/admin/assembly-manuals` - list all
- [ ] GET `/api/admin/assembly-manuals?is_public=true` - filtered
- [ ] GET `/api/admin/assembly-manuals?product_id=1` - filtered
- [ ] GET `/api/admin/assembly-manuals/:id` - get by ID
- [ ] POST `/api/admin/assembly-manuals` - create (with file)
- [ ] PUT `/api/admin/assembly-manuals/:id` - update
- [ ] DELETE `/api/admin/assembly-manuals/:id` - delete
- [ ] POST `/api/admin/assembly-manuals/:id/assign-products` - assign
- [ ] POST `/api/admin/assembly-manuals/:id/regenerate-qr` - regenerate
- [ ] GET `/api/manuals/:id` - public view (public manual)
- [ ] GET `/api/manuals/:id` - public view (private manual - 403)

### Frontend Testing

#### Admin Dashboard
- [ ] Tab appears in admin dashboard
- [ ] Management component loads
- [ ] Manuals list displays
- [ ] Search works
- [ ] Create dialog opens
- [ ] Edit dialog opens with data
- [ ] Product selection works
- [ ] File upload works
- [ ] Create manual successful
- [ ] Update manual successful
- [ ] Delete manual works (with confirmation)
- [ ] Assign products works
- [ ] View PDF opens
- [ ] Download QR code works
- [ ] Regenerate QR code works
- [ ] Empty state displays correctly
- [ ] Error messages display
- [ ] Success toasts appear
- [ ] Loading states show

#### Public Pages
- [ ] Manual viewing page loads
- [ ] PDF viewer displays
- [ ] Download button works
- [ ] Back button works
- [ ] Error handling works
- [ ] Mobile responsive
- [ ] QR code scan opens page

#### Product Integration
- [ ] Manuals appear on product detail page
- [ ] Multiple manuals display correctly
- [ ] "View Online" button works
- [ ] "Download" button works
- [ ] Manual thumbnails display
- [ ] Manuals sorted correctly
- [ ] No manual section if none assigned

### Integration Testing

#### End-to-End Flows
- [ ] Admin uploads manual → Appears in list
- [ ] Admin assigns manual to product → Shows on product page
- [ ] Manual appears on product page → User clicks "View Online"
- [ ] QR code generated → Admin downloads QR code
- [ ] QR code printed → User scans → Opens manual page
- [ ] Admin deletes manual → Removed from all products
- [ ] Admin updates manual → Changes reflect everywhere
- [ ] Admin regenerates QR → New QR code generated

#### Data Consistency
- [ ] Manual deletion removes from all products
- [ ] Product deletion removes manual assignments
- [ ] QR code deleted when manual deleted
- [ ] File cleanup works correctly
- [ ] Public flag respected everywhere

---

## 🚀 Deployment Considerations

### Environment Variables

#### Required in `.env` or server config:
```env
# Frontend URL (for QR code generation)
FRONTEND_URL=https://simfab.com

# Or for development:
FRONTEND_URL=http://localhost:5173
```

#### Optional (if using different domains):
```env
# API URL
API_URL=https://api.simfab.com

# File storage (if using cloud storage)
STORAGE_TYPE=local  # or 's3', 'gcs', etc.
```

### File Storage Setup

#### Local Storage
1. Ensure directories exist:
   ```bash
   mkdir -p uploads
   mkdir -p uploads/qr-codes
   ```

2. Set permissions:
   ```bash
   chmod 755 uploads
   chmod 755 uploads/qr-codes
   ```

3. For production, consider:
   - Moving uploads to separate volume
   - Using symbolic links
   - Setting up backup routine

#### Cloud Storage (Future Enhancement)
- AWS S3
- Google Cloud Storage
- Azure Blob Storage
- Update `FileUploadService` and `QRCodeService` to use cloud storage

### Database Migration

#### Pre-Deployment
- [ ] Backup production database
- [ ] Test migration on staging
- [ ] Verify data migration (if existing data)
- [ ] Check foreign key constraints
- [ ] Verify indexes created

#### Deployment Steps
1. Run migration:
   ```bash
   npm run migrate:up
   ```

2. Verify migration:
   ```sql
   SELECT * FROM assembly_manuals_cms;
   SELECT * FROM product_assembly_manuals;
   ```

3. Test basic operations:
   - Create manual
   - Assign to product
   - View on product page

### File Upload Limits

#### Update FileUploadService if needed:
```typescript
// For larger PDFs, update max file size
private maxFileSize: number = 20 * 1024 * 1024; // 20MB instead of 10MB
```

#### Update nginx/express limits:
```nginx
# nginx.conf
client_max_body_size 20M;
```

```typescript
// express app
app.use(express.json({ limit: '20mb' }));
```

### Static File Serving

#### Ensure uploads are served:
```typescript
// In server/src/index.ts or similar
app.use('/uploads', express.static('uploads'));
```

Or via nginx:
```nginx
location /uploads {
    alias /path/to/uploads;
    expires 30d;
}
```

---

## 🔒 Security Verification

### Authentication & Authorization
- [ ] Admin routes require authentication
- [ ] Admin routes require admin role
- [ ] Public routes accessible without auth
- [ ] Private manuals not accessible publicly
- [ ] File upload restricted to admins

### File Upload Security
- [ ] Only PDF files allowed
- [ ] File size limits enforced
- [ ] File names sanitized
- [ ] No executable files allowed
- [ ] Virus scanning (optional, recommended)

### SQL Injection Protection
- [ ] All queries use parameterized statements
- [ ] No raw SQL with user input
- [ ] Input validation on all endpoints

### XSS Protection
- [ ] User input sanitized
- [ ] File URLs validated
- [ ] Content Security Policy headers set

---

## ⚡ Performance Optimization

### Database Indexes
- [x] `idx_product_assembly_manuals_product_id` - for product queries
- [x] `idx_product_assembly_manuals_manual_id` - for manual queries
- [x] `idx_assembly_manuals_cms_public` - for public manual queries
- [x] `idx_assembly_manuals_cms_sort_order` - for sorting

### Query Optimization
- [ ] Use `SELECT` specific columns, not `*`
- [ ] Limit results with pagination (if many manuals)
- [ ] Cache product manuals (optional)

### File Storage
- [ ] Optimize PDF file sizes
- [ ] Generate thumbnails for preview (future)
- [ ] CDN for file serving (future)

---

## 🐛 Troubleshooting Guide

### Common Issues

#### QR Code Not Generating
**Symptoms**: QR code URL is null or empty
**Solutions**:
1. Check `FRONTEND_URL` environment variable
2. Verify `uploads/qr-codes` directory exists and is writable
3. Check file permissions
4. Verify `qrcode` package installed

#### Manual Not Appearing on Product Page
**Symptoms**: Manual assigned but not showing
**Solutions**:
1. Verify manual has `is_public = true`
2. Check `product_assembly_manuals` junction table
3. Verify ProductService is fetching manuals
4. Check browser console for errors

#### File Upload Failing
**Symptoms**: Upload returns error
**Solutions**:
1. Check file size (max 10MB default)
2. Verify file is PDF format
3. Check uploads directory exists and is writable
4. Verify file upload middleware configured
5. Check server logs for detailed errors

#### QR Code Links Not Working
**Symptoms**: QR code scan doesn't open page
**Solutions**:
1. Verify `FRONTEND_URL` matches actual frontend URL
2. Check route is registered in App.tsx
3. Verify manual is public
4. Test URL manually: `{FRONTEND_URL}/manuals/{id}`

#### Manual Not Deletable
**Symptoms**: Delete operation fails
**Solutions**:
1. Check foreign key constraints
2. Verify admin authentication
3. Check database permissions
4. Review error logs

---

## 📊 Monitoring & Maintenance

### Recommended Monitoring
- File storage disk usage
- QR code generation success rate
- Manual upload success rate
- API response times
- Error rates

### Maintenance Tasks
- [ ] Periodic cleanup of orphaned QR codes
- [ ] Backup uploads directory
- [ ] Review and optimize large PDFs
- [ ] Monitor database size growth
- [ ] Update dependencies regularly

### Cleanup Script (Optional)
```typescript
// server/src/scripts/cleanup-orphaned-qr-codes.ts
// Remove QR codes for deleted manuals
// Run periodically via cron
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Database migration tested
- [ ] Environment variables set
- [ ] File directories created
- [ ] Permissions set correctly
- [ ] Security verified

### Deployment
- [ ] Backup database
- [ ] Run migration
- [ ] Deploy backend code
- [ ] Deploy frontend code
- [ ] Verify routes working
- [ ] Test file upload
- [ ] Test QR code generation
- [ ] Verify manual viewing

### Post-Deployment
- [ ] Monitor error logs
- [ ] Verify file uploads working
- [ ] Test QR code scanning
- [ ] Verify product pages show manuals
- [ ] Check performance metrics
- [ ] Document any issues

---

## 🎯 Success Criteria

✅ All tests passing  
✅ Manuals can be uploaded  
✅ Manuals can be assigned to products  
✅ Manuals appear on product pages  
✅ QR codes generated correctly  
✅ QR codes can be scanned  
✅ Public viewing page works  
✅ Admin dashboard functional  
✅ Security verified  
✅ Performance acceptable  

---

## 📝 Post-Deployment Notes

### Future Enhancements
- Manual categories/tags
- Manual versioning
- Batch upload functionality
- Advanced search and filtering
- Manual analytics (views, downloads)
- Cloud storage integration
- CDN for file serving
- Print-friendly QR code labels

---

## ✅ Phase 6 Completion Criteria

- [x] Complete testing checklist
- [ ] All tests passing
- [ ] Deployment guide documented
- [ ] Security verified
- [ ] Performance optimized
- [ ] Monitoring set up
- [ ] Documentation complete

**Implementation Complete!** 🎉

