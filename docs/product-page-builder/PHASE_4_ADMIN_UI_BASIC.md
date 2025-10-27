# Phase 4: Admin UI - Basic CRUD Operations

## Overview
This phase implements the basic admin interface for managing description components, including list view, create/edit dialogs, and basic CRUD operations.

## Implementation Steps

### 1. Create Description Components List

**File:** `src/components/admin/DescriptionComponentsList.tsx`

```typescript
import React, { useState } from 'react';
import { ProductDescriptionComponent } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import DescriptionComponentDialog from './DescriptionComponentDialog';

interface DescriptionComponentsListProps {
  productId: number;
  components: ProductDescriptionComponent[];
  onComponentCreate: (data: any) => Promise<void>;
  onComponentUpdate: (id: number, data: any) => Promise<void>;
  onComponentDelete: (id: number) => Promise<void>;
  onComponentReorder: (componentIds: number[]) => Promise<void>;
}

const DescriptionComponentsList: React.FC<DescriptionComponentsListProps> = ({
  productId,
  components,
  onComponentCreate,
  onComponentUpdate,
  onComponentDelete,
  onComponentReorder
}) => {
  const [editingComponent, setEditingComponent] = useState<ProductDescriptionComponent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateComponent = () => {
    setEditingComponent(null);
    setIsDialogOpen(true);
  };

  const handleEditComponent = (component: ProductDescriptionComponent) => {
    setEditingComponent(component);
    setIsDialogOpen(true);
  };

  const handleDeleteComponent = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this component?')) {
      await onComponentDelete(id);
    }
  };

  const getComponentTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'image': return '🖼️';
      case 'two_column': return '📊';
      case 'three_column': return '📋';
      case 'full_width_image': return '🖼️';
      default: return '❓';
    }
  };

  const getComponentTypeName = (type: string) => {
    switch (type) {
      case 'text': return 'Text Block';
      case 'image': return 'Image Block';
      case 'two_column': return 'Two Column Layout';
      case 'three_column': return 'Three Column Layout';
      case 'full_width_image': return 'Full Width Image';
      default: return 'Unknown';
    }
  };

  const getComponentPreview = (component: ProductDescriptionComponent) => {
    switch (component.component_type) {
      case 'text':
        return component.content.heading || component.content.paragraph?.substring(0, 50) + '...' || 'Empty text block';
      case 'image':
        return component.content.caption || component.content.altText || 'Image component';
      case 'two_column':
        return 'Two column layout';
      case 'three_column':
        return 'Three column layout';
      case 'full_width_image':
        return 'Full width image';
      default:
        return 'Unknown component';
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Product Description Components</CardTitle>
        <Button type="button" onClick={handleCreateComponent} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Component
        </Button>
      </CardHeader>
      <CardContent>
        {components.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No components added yet.</p>
            <p className="text-sm">Click "Add Component" to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {components.map((component, index) => (
              <div
                key={component.id}
                className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg">{getComponentTypeIcon(component.component_type)}</span>
                  <Badge variant={component.is_active ? 'default' : 'secondary'} className="text-xs">
                    {component.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">#{component.sort_order}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm mb-1">
                    {getComponentTypeName(component.component_type)}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {truncateText(getComponentPreview(component))}
                  </p>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditComponent(component)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteComponent(component.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <DescriptionComponentDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={async (data) => {
          if (editingComponent) {
            await onComponentUpdate(editingComponent.id, data);
          } else {
            await onComponentCreate(data);
          }
          setIsDialogOpen(false);
        }}
        component={editingComponent}
        productId={productId}
      />
    </Card>
  );
};

export default DescriptionComponentsList;
```

### 2. Create Component Dialog

**File:** `src/components/admin/DescriptionComponentDialog.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { ProductDescriptionComponent } from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, X } from 'lucide-react';
import TextBlockEditor from './description/TextBlockEditor';
import ImageBlockEditor from './description/ImageBlockEditor';
import TwoColumnEditor from './description/TwoColumnEditor';
import ThreeColumnEditor from './description/ThreeColumnEditor';

interface DescriptionComponentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  component?: ProductDescriptionComponent | null;
  productId: number;
}

const DescriptionComponentDialog: React.FC<DescriptionComponentDialogProps> = ({
  open,
  onClose,
  onSave,
  component,
  productId
}) => {
  const [componentType, setComponentType] = useState<string>('text');
  const [componentData, setComponentData] = useState<any>({});
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (component) {
        setComponentType(component.component_type);
        setComponentData(component.content);
        setIsActive(component.is_active);
      } else {
        setComponentType('text');
        setComponentData({});
        setIsActive(true);
      }
    }
  }, [open, component]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        component_type: componentType,
        content: componentData,
        is_active: isActive
      };

      await onSave(submitData);
    } catch (error) {
      console.error('Error saving component:', error);
    } finally {
      setLoading(false);
    }
  };

  const getComponentTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'image': return '🖼️';
      case 'two_column': return '📊';
      case 'three_column': return '📋';
      case 'full_width_image': return '🖼️';
      default: return '❓';
    }
  };

  const renderComponentEditor = () => {
    switch (componentType) {
      case 'text':
        return (
          <TextBlockEditor
            data={componentData}
            onChange={setComponentData}
          />
        );
      case 'image':
        return (
          <ImageBlockEditor
            data={componentData}
            onChange={setComponentData}
            productId={productId}
          />
        );
      case 'two_column':
        return (
          <TwoColumnEditor
            data={componentData}
            onChange={setComponentData}
            productId={productId}
          />
        );
      case 'three_column':
        return (
          <ThreeColumnEditor
            data={componentData}
            onChange={setComponentData}
          />
        );
      case 'full_width_image':
        return (
          <ImageBlockEditor
            data={{ ...componentData, width: 'full' }}
            onChange={(data) => setComponentData({ ...data, width: 'full' })}
            productId={productId}
          />
        );
      default:
        return <div>Select a component type</div>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{getComponentTypeIcon(componentType)}</span>
            {component ? 'Edit Component' : 'Create New Component'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Component Type Selection */}
          <div>
            <Label htmlFor="component_type">Component Type</Label>
            <Select
              value={componentType}
              onValueChange={setComponentType}
              disabled={!!component} // Don't allow changing type when editing
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">
                  <div className="flex items-center gap-2">
                    <span>📝</span>
                    Text Block
                  </div>
                </SelectItem>
                <SelectItem value="image">
                  <div className="flex items-center gap-2">
                    <span>🖼️</span>
                    Image Block
                  </div>
                </SelectItem>
                <SelectItem value="two_column">
                  <div className="flex items-center gap-2">
                    <span>📊</span>
                    Two Column Layout
                  </div>
                </SelectItem>
                <SelectItem value="three_column">
                  <div className="flex items-center gap-2">
                    <span>📋</span>
                    Three Column Layout
                  </div>
                </SelectItem>
                <SelectItem value="full_width_image">
                  <div className="flex items-center gap-2">
                    <span>🖼️</span>
                    Full Width Image
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Component Editor */}
          <div>
            <Label>Component Content</Label>
            <div className="mt-2">
              {renderComponentEditor()}
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Active (visible to customers)</Label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {component ? 'Update Component' : 'Create Component'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DescriptionComponentDialog;
```

### 3. Create Text Block Editor

**File:** `src/components/admin/description/TextBlockEditor.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bold, Italic, Palette } from 'lucide-react';

interface TextBlockEditorProps {
  data: any;
  onChange: (data: any) => void;
}

const TextBlockEditor: React.FC<TextBlockEditorProps> = ({ data, onChange }) => {
  const [formData, setFormData] = useState({
    heading: data.heading || '',
    headingSize: data.headingSize || '2xl',
    headingColor: data.headingColor || '#ffffff',
    paragraph: data.paragraph || '',
    textColor: data.textColor || '#e5e5e5',
    alignment: data.alignment || 'left',
    padding: data.padding || { top: 16, bottom: 16, left: 0, right: 0 }
  });

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePaddingChange = (side: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      padding: { ...prev.padding, [side]: value }
    }));
  };

  const insertRichText = (tag: string, style: string = '') => {
    const textarea = document.getElementById('paragraph-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const replacement = `<${tag}${style ? ` style="${style}"` : ''}>${selectedText}</${tag}>`;
      
      const newText = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
      handleInputChange('paragraph', newText);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + replacement.length, start + replacement.length);
      }, 0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Basic Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="heading">Heading</Label>
          <Input
            id="heading"
            value={formData.heading}
            onChange={(e) => handleInputChange('heading', e.target.value)}
            placeholder="Enter heading..."
          />
        </div>
        <div>
          <Label htmlFor="headingSize">Heading Size</Label>
          <Select
            value={formData.headingSize}
            onValueChange={(value) => handleInputChange('headingSize', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xl">Large (xl)</SelectItem>
              <SelectItem value="2xl">Extra Large (2xl)</SelectItem>
              <SelectItem value="3xl">3xl</SelectItem>
              <SelectItem value="4xl">4xl</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Paragraph with Rich Text Tools */}
      <div>
        <Label htmlFor="paragraph">Paragraph Content</Label>
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertRichText('strong')}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertRichText('em')}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertRichText('span', 'color:#ef4444;font-weight:bold')}
            >
              <Palette className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            id="paragraph-textarea"
            value={formData.paragraph}
            onChange={(e) => handleInputChange('paragraph', e.target.value)}
            placeholder="Enter paragraph content... Use the buttons above to format text."
            rows={6}
          />
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="headingColor">Heading Color</Label>
          <Input
            id="headingColor"
            type="color"
            value={formData.headingColor}
            onChange={(e) => handleInputChange('headingColor', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="textColor">Text Color</Label>
          <Input
            id="textColor"
            type="color"
            value={formData.textColor}
            onChange={(e) => handleInputChange('textColor', e.target.value)}
          />
        </div>
      </div>

      {/* Alignment */}
      <div>
        <Label htmlFor="alignment">Alignment</Label>
        <Select
          value={formData.alignment}
          onValueChange={(value) => handleInputChange('alignment', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Padding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Padding (px)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="padding-top">Top</Label>
              <Input
                id="padding-top"
                type="number"
                min="0"
                max="100"
                value={formData.padding.top}
                onChange={(e) => handlePaddingChange('top', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="padding-bottom">Bottom</Label>
              <Input
                id="padding-bottom"
                type="number"
                min="0"
                max="100"
                value={formData.padding.bottom}
                onChange={(e) => handlePaddingChange('bottom', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="padding-left">Left</Label>
              <Input
                id="padding-left"
                type="number"
                min="0"
                max="100"
                value={formData.padding.left}
                onChange={(e) => handlePaddingChange('left', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="padding-right">Right</Label>
              <Input
                id="padding-right"
                type="number"
                min="0"
                max="100"
                value={formData.padding.right}
                onChange={(e) => handlePaddingChange('right', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TextBlockEditor;
```

### 4. Create Image Block Editor

**File:** `src/components/admin/description/ImageBlockEditor.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface ImageBlockEditorProps {
  data: any;
  onChange: (data: any) => void;
  productId: number;
}

const ImageBlockEditor: React.FC<ImageBlockEditorProps> = ({ data, onChange, productId }) => {
  const [formData, setFormData] = useState({
    imageUrl: data.imageUrl || '',
    altText: data.altText || '',
    caption: data.caption || '',
    width: data.width || 'full',
    alignment: data.alignment || 'center',
    padding: data.padding || { top: 8, bottom: 8, left: 0, right: 0 }
  });

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePaddingChange = (side: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      padding: { ...prev.padding, [side]: value }
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Here you would typically upload to your server
    // For now, we'll use a placeholder URL
    const imageUrl = `/uploads/${file.name}`;
    handleInputChange('imageUrl', imageUrl);
  };

  return (
    <div className="space-y-4">
      {/* Image Upload */}
      <div>
        <Label htmlFor="image-upload">Image</Label>
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </Button>
          </div>
          <Input
            value={formData.imageUrl}
            onChange={(e) => handleInputChange('imageUrl', e.target.value)}
            placeholder="Enter image URL..."
          />
          {formData.imageUrl && (
            <div className="mt-2">
              <img
                src={formData.imageUrl}
                alt="Preview"
                className="w-32 h-32 object-cover rounded border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Alt Text and Caption */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="altText">Alt Text</Label>
          <Input
            id="altText"
            value={formData.altText}
            onChange={(e) => handleInputChange('altText', e.target.value)}
            placeholder="Enter alt text..."
          />
        </div>
        <div>
          <Label htmlFor="caption">Caption</Label>
          <Input
            id="caption"
            value={formData.caption}
            onChange={(e) => handleInputChange('caption', e.target.value)}
            placeholder="Enter caption..."
          />
        </div>
      </div>

      {/* Width and Alignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="width">Width</Label>
          <Select
            value={formData.width}
            onValueChange={(value) => handleInputChange('width', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
              <SelectItem value="full">Full Width</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="alignment">Alignment</Label>
          <Select
            value={formData.alignment}
            onValueChange={(value) => handleInputChange('alignment', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Padding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Padding (px)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="padding-top">Top</Label>
              <Input
                id="padding-top"
                type="number"
                min="0"
                max="100"
                value={formData.padding.top}
                onChange={(e) => handlePaddingChange('top', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="padding-bottom">Bottom</Label>
              <Input
                id="padding-bottom"
                type="number"
                min="0"
                max="100"
                value={formData.padding.bottom}
                onChange={(e) => handlePaddingChange('bottom', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="padding-left">Left</Label>
              <Input
                id="padding-left"
                type="number"
                min="0"
                max="100"
                value={formData.padding.left}
                onChange={(e) => handlePaddingChange('left', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="padding-right">Right</Label>
              <Input
                id="padding-right"
                type="number"
                min="0"
                max="100"
                value={formData.padding.right}
                onChange={(e) => handlePaddingChange('right', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageBlockEditor;
```

### 5. Create Placeholder Editors

**File:** `src/components/admin/description/TwoColumnEditor.tsx`

```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TwoColumnEditorProps {
  data: any;
  onChange: (data: any) => void;
  productId: number;
}

const TwoColumnEditor: React.FC<TwoColumnEditorProps> = ({ data, onChange, productId }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Two Column Layout Editor</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Two column layout editor will be implemented in Phase 5.
          For now, this is a placeholder.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange({
            leftColumn: { type: 'text', content: { heading: 'Left Column' } },
            rightColumn: { type: 'text', content: { heading: 'Right Column' } },
            columnRatio: '50-50'
          })}
        >
          Set Default Content
        </Button>
      </CardContent>
    </Card>
  );
};

export default TwoColumnEditor;
```

**File:** `src/components/admin/description/ThreeColumnEditor.tsx`

```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ThreeColumnEditorProps {
  data: any;
  onChange: (data: any) => void;
}

const ThreeColumnEditor: React.FC<ThreeColumnEditorProps> = ({ data, onChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Three Column Layout Editor</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Three column layout editor will be implemented in Phase 5.
          For now, this is a placeholder.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange({
            columns: [
              { heading: 'Feature 1', text: 'Description 1' },
              { heading: 'Feature 2', text: 'Description 2' },
              { heading: 'Feature 3', text: 'Description 3' }
            ]
          })}
        >
          Set Default Content
        </Button>
      </CardContent>
    </Card>
  );
};

export default ThreeColumnEditor;
```

### 6. Integrate into Admin Product Edit

**File:** `src/components/admin/ProductEditDialog.tsx` (update existing file)

Add this import and tab:

```typescript
import DescriptionComponentsList from './DescriptionComponentsList';

// Add this tab to the existing tabs array:
{
  value: "description",
  label: "Description Builder",
  content: (
    <DescriptionComponentsList
      productId={product.id}
      components={descriptionComponents}
      onComponentCreate={handleCreateDescriptionComponent}
      onComponentUpdate={handleUpdateDescriptionComponent}
      onComponentDelete={handleDeleteDescriptionComponent}
      onComponentReorder={handleReorderDescriptionComponents}
    />
  )
}
```

Add these state variables and handlers:

```typescript
const [descriptionComponents, setDescriptionComponents] = useState<ProductDescriptionComponent[]>([]);

const handleCreateDescriptionComponent = async (data: any) => {
  try {
    const newComponent = await productDescriptionsAPI.createDescriptionComponent(product.id, data);
    setDescriptionComponents(prev => [...prev, newComponent]);
  } catch (error) {
    console.error('Error creating component:', error);
  }
};

const handleUpdateDescriptionComponent = async (id: number, data: any) => {
  try {
    const updatedComponent = await productDescriptionsAPI.updateDescriptionComponent(id, data);
    setDescriptionComponents(prev => prev.map(c => c.id === id ? updatedComponent : c));
  } catch (error) {
    console.error('Error updating component:', error);
  }
};

const handleDeleteDescriptionComponent = async (id: number) => {
  try {
    await productDescriptionsAPI.deleteDescriptionComponent(id);
    setDescriptionComponents(prev => prev.filter(c => c.id !== id));
  } catch (error) {
    console.error('Error deleting component:', error);
  }
};

const handleReorderDescriptionComponents = async (componentIds: number[]) => {
  try {
    await productDescriptionsAPI.reorderDescriptionComponents(product.id, componentIds);
    // Reload components to get updated order
    const components = await productDescriptionsAPI.getAllProductDescriptionComponents(product.id);
    setDescriptionComponents(components);
  } catch (error) {
    console.error('Error reordering components:', error);
  }
};
```

## Testing Instructions

1. **Test Admin Interface:**
   ```bash
   # Start the frontend
   npm run dev
   
   # Navigate to admin product edit page
   # Verify Description Builder tab appears
   # Test creating text and image components
   ```

2. **Test Rich Text Editing:**
   - Create a text component
   - Use the formatting buttons to add bold, italic, and colored text
   - Verify the HTML is generated correctly

3. **Test Component Management:**
   - Create multiple components
   - Edit existing components
   - Delete components
   - Toggle active/inactive status

## Next Steps

After completing Phase 4:
- Basic CRUD operations work
- Text and image components can be created/edited
- Rich text formatting is available
- Ready for advanced features in Phase 5

## Notes

- Rich text editor uses simple HTML insertion
- Image upload is placeholder (needs backend integration)
- Two/three column editors are placeholders for Phase 5
- Components integrate with existing admin interface

