# 📚 Assembly Manuals CMS - Phase 5: Public Viewing & Product Integration

**Goal**: Create public manual viewing page and integrate manuals into product detail pages.

---

## 🎯 Overview

This phase focuses on:
- Creating public manual viewing page (for QR code scanning)
- Updating ProductService to fetch manuals for products
- Updating ProductAdditionalInfo component to display manuals
- Adding "View Online" functionality
- Updating product detail page to show assigned manuals
  
---

## 🌐 Public Manual Viewing Page

### File: `src/pages/ManualView.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, ArrowLeft, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { API_URL } from '@/config';

interface Manual {
  id: number;
  name: string;
  description?: string;
  file_url: string;
  file_type: string;
  is_public: boolean;
}

const ManualView = () => {
  const { id } = useParams();
  const [manual, setManual] = useState<Manual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchManual();
    }
  }, [id]);

  const fetchManual = async () => {
    try {
      const response = await fetch(`${API_URL}/api/manuals/${id}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setManual(data.data);
      } else {
        setError(data.error?.message || 'Manual not found');
      }
    } catch (error) {
      setError('Failed to load manual. Please try again.');
      console.error('Error fetching manual:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading manual...</p>
        </div>
      </div>
    );
  }

  if (error || !manual) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 mt-20">
          <div className="max-w-2xl mx-auto text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-3xl font-bold mb-4">Manual Not Found</h1>
            <p className="text-muted-foreground mb-6">{error || 'The manual you are looking for does not exist or is not publicly available.'}</p>
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Home
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/shop">Browse Products</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Manual Header */}
          <div className="bg-card rounded-lg p-6 mb-6 border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{manual.name}</h1>
                {manual.description && (
                  <p className="text-muted-foreground mb-4">{manual.description}</p>
                )}
              </div>
              <Button
                onClick={() => window.open(manual.file_url, '_blank')}
                className="shrink-0"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="bg-card rounded-lg p-6 border">
            <iframe
              src={manual.file_url}
              className="w-full h-screen min-h-[600px] border-0 rounded"
              title={manual.name}
            />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Having trouble viewing? <button 
                onClick={() => window.open(manual.file_url, '_blank')}
                className="text-primary hover:underline"
              >
                Download the PDF
              </button> instead.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ManualView;
```

---

## 🛣️ Add Route

### File: `src/App.tsx`

Add the import and route:

```typescript
// Add to imports
import ManualView from './pages/ManualView';

// Add to routes (usually with other page routes)
<Route path="/manuals/:id" element={<ManualView />} />
```

---

## 🔗 Update Product Service

### File: `server/src/services/ProductService.ts`

#### 1. Import Assembly Manual Service
Add to imports at top of file:

```typescript
import { AssemblyManualService } from './AssemblyManualService';
```

#### 2. Initialize Service in Constructor
Add to constructor:

```typescript
private assemblyManualService: AssemblyManualService;

constructor(pool: Pool) {
  // ... existing code
  this.assemblyManualService = new AssemblyManualService(pool);
}
```

#### 3. Update getProductBySlug Method
Find the `getProductBySlug` method and add assembly manuals:

```typescript
// In getProductBySlug method, find where other data is fetched
// Add this after other data fetching:

// Fetch assembly manuals for this product
const assemblyManuals = await this.assemblyManualService.getManualsForProduct(product.id);

// Then include in the returned product object:
return {
  ...product,
  // ... existing fields
  assemblyManuals: assemblyManuals.map(manual => ({
    id: manual.id,
    name: manual.name,
    description: manual.description,
    fileUrl: manual.file_url,
    viewUrl: `/manuals/${manual.id}`,
    image: manual.thumbnail_url || null
  }))
};
```

---

## 🎨 Update Product Additional Info Component

### File: `src/components/ProductAdditionalInfo.tsx`

#### 1. Update AssemblyManual Interface
```typescript
interface AssemblyManual {
  id: number;
  name: string;
  image?: string | null;
  fileUrl: string;
  viewUrl?: string; // Add this for online viewing
  description?: string;
}
```

#### 2. Update Manual Display Section
Find the assembly manuals section (around line 118) and update:

```typescript
{/* Assembly Manuals */}
{assemblyManuals.length > 0 && (
  <div className="space-y-6">
    <h2 className="text-3xl font-bold text-primary">Assembly Manuals</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assemblyManuals.map((manual) => (
        <div key={manual.id} className="bg-muted rounded-lg p-4 space-y-4 border">
          {manual.image && (
            <div className="aspect-video bg-background rounded-lg overflow-hidden">
              <img
                src={manual.image}
                alt={manual.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="space-y-2">
            <h4 className="font-semibold">{manual.name}</h4>
            {manual.description && (
              <p className="text-sm text-muted-foreground">{manual.description}</p>
            )}
            <div className="flex gap-2">
              {manual.viewUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(manual.viewUrl, '_blank')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Online
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => window.open(manual.fileUrl, '_blank')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

#### 3. Add Eye Icon Import
```typescript
import { ChevronLeft, ChevronRight, Download, Eye } from "lucide-react";
```

---

## 🔍 Verify Product Detail Page Integration

### File: `src/pages/ProductDetail.tsx`

Verify that the product detail page is already passing `assemblyManuals` to `ProductAdditionalInfo`. The component should already be set up, but verify:

```typescript
// In ProductDetail component, verify assemblyManuals is being passed:
<ProductAdditionalInfo
  additionalDescriptions={additionalDescriptions}
  assemblyManuals={assemblyManuals}
/>
```

The `assemblyManuals` should come from the product data fetched from the API (which now includes manuals via updated ProductService).

---

## ✅ Testing Checklist

### Public Manual Viewing
- [ ] Navigate to `/manuals/:id` with valid public manual ID
- [ ] Manual details display correctly
- [ ] PDF viewer loads (iframe)
- [ ] Download button opens PDF in new tab
- [ ] Back button returns to home
- [ ] Test with invalid manual ID (shows error)
- [ ] Test with private manual ID (shows 403 error)
- [ ] Page is mobile responsive

### Product Integration
- [ ] Product detail page shows assigned manuals
- [ ] Manuals appear at bottom of product page
- [ ] "View Online" button opens manual viewing page
- [ ] "Download" button opens PDF directly
- [ ] Manual thumbnails display (if provided)
- [ ] Multiple manuals display correctly
- [ ] Manuals are sorted correctly
- [ ] Product without manuals shows no manual section

### QR Code Flow
- [ ] Scan QR code with phone camera
- [ ] QR code opens `/manuals/:id` URL
- [ ] Manual viewing page loads correctly
- [ ] Manual is publicly accessible

---

## 🎨 UI/UX Improvements (Optional)

### Enhance Manual Cards
- Add loading skeleton while fetching
- Add error boundary for PDF viewer
- Add manual type badge (e.g., "Assembly", "Installation")
- Add manual version info

### Product Detail Page
- Add manual count badge
- Add manual filtering/search
- Add manual categories
- Show most recent manuals first

---

## ✅ Phase 5 Completion Criteria

- [x] Public manual viewing page created
- [ ] Route added to App.tsx
- [ ] ProductService updated to fetch manuals
- [ ] ProductAdditionalInfo component updated
- [ ] "View Online" button working
- [ ] Manuals display on product detail pages
- [ ] QR code scanning flow working
- [ ] All tests passing

**Next Phase**: Phase 6 - Testing & Deployment

