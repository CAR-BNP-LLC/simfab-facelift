# Phase 5: Admin UI - Advanced Features

## Overview
This phase implements advanced admin features including drag-and-drop reordering, advanced rich text editor, and sophisticated multi-column layout editors.

## Implementation Steps

### 1. Install Required Dependencies

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-color @tiptap/extension-text-style
```

### 2. Create Advanced Rich Text Editor

**File:** `src/components/admin/description/RichTextEditor.tsx`

```typescript
import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Palette, Type } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3 border rounded',
      },
    },
  });

  const setColor = (color: string) => {
    editor?.chain().focus().setColor(color).run();
  };

  const toggleBold = () => {
    editor?.chain().focus().toggleBold().run();
  };

  const toggleItalic = () => {
    editor?.chain().focus().toggleItalic().run();
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg">
      <div className="flex items-center gap-2 p-2 border-b bg-muted/50">
        <Button
          type="button"
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          onClick={toggleBold}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          onClick={toggleItalic}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <input
            type="color"
            defaultValue="#ef4444"
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 rounded border"
          />
          <Palette className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
```

### 3. Update Text Block Editor with Rich Text

**File:** `src/components/admin/description/TextBlockEditor.tsx` (update existing)

Replace the paragraph section with:

```typescript
import RichTextEditor from './RichTextEditor';

// Replace the paragraph section with:
<div>
  <Label htmlFor="paragraph">Paragraph Content</Label>
  <div className="mt-2">
    <RichTextEditor
      value={formData.paragraph}
      onChange={(value) => handleInputChange('paragraph', value)}
      placeholder="Enter paragraph content..."
    />
  </div>
</div>
```

### 4. Create Drag and Drop Components List

**File:** `src/components/admin/DescriptionComponentsList.tsx` (update existing)

Replace the entire file with this enhanced version:

```typescript
import React, { useState } from 'react';
import { ProductDescriptionComponent } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DescriptionComponentDialog from './DescriptionComponentDialog';

interface DescriptionComponentsListProps {
  productId: number;
  components: ProductDescriptionComponent[];
  onComponentCreate: (data: any) => Promise<void>;
  onComponentUpdate: (id: number, data: any) => Promise<void>;
  onComponentDelete: (id: number) => Promise<void>;
  onComponentReorder: (componentIds: number[]) => Promise<void>;
}

interface SortableComponentItemProps {
  component: ProductDescriptionComponent;
  onEdit: (component: ProductDescriptionComponent) => void;
  onDelete: (id: number) => void;
}

const SortableComponentItem: React.FC<SortableComponentItemProps> = ({ 
  component, 
  onEdit, 
  onDelete 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div
        className="flex items-center gap-2 mt-1 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
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
          onClick={() => onEdit(component)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(component.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = components.findIndex((item) => item.id === active.id);
      const newIndex = components.findIndex((item) => item.id === over.id);

      const newComponents = arrayMove(components, oldIndex, newIndex);
      const componentIds = newComponents.map(c => c.id);
      
      await onComponentReorder(componentIds);
    }
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={components.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {components.map((component) => (
                  <SortableComponentItem
                    key={component.id}
                    component={component}
                    onEdit={handleEditComponent}
                    onDelete={handleDeleteComponent}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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

### 5. Create Advanced Two Column Editor

**File:** `src/components/admin/description/TwoColumnEditor.tsx` (replace existing)

```typescript
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import TextBlockEditor from './TextBlockEditor';
import ImageBlockEditor from './ImageBlockEditor';

interface TwoColumnEditorProps {
  data: any;
  onChange: (data: any) => void;
  productId: number;
}

const TwoColumnEditor: React.FC<TwoColumnEditorProps> = ({ data, onChange, productId }) => {
  const [formData, setFormData] = useState({
    leftColumn: data.leftColumn || { type: 'text', content: {} },
    rightColumn: data.rightColumn || { type: 'text', content: {} },
    columnRatio: data.columnRatio || '50-50',
    gap: data.gap || 24,
    reverseOnMobile: data.reverseOnMobile || false,
    padding: data.padding || { top: 24, bottom: 24, left: 0, right: 0 }
  });

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const handleColumnChange = (side: 'left' | 'right', field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [side + 'Column']: {
        ...prev[side + 'Column'],
        [field]: value
      }
    }));
  };

  const handlePaddingChange = (side: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      padding: { ...prev.padding, [side]: value }
    }));
  };

  const renderColumnEditor = (side: 'left' | 'right') => {
    const column = formData[side + 'Column'];
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{side === 'left' ? 'Left' : 'Right'} Column</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Column Type</Label>
            <Select
              value={column.type}
              onValueChange={(value) => handleColumnChange(side, 'type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Block</SelectItem>
                <SelectItem value="image">Image Block</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Content</Label>
            {column.type === 'text' ? (
              <TextBlockEditor
                data={column.content}
                onChange={(content) => handleColumnChange(side, 'content', content)}
              />
            ) : (
              <ImageBlockEditor
                data={column.content}
                onChange={(content) => handleColumnChange(side, 'content', content)}
                productId={productId}
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Layout Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Layout Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="columnRatio">Column Ratio</Label>
              <Select
                value={formData.columnRatio}
                onValueChange={(value) => setFormData(prev => ({ ...prev, columnRatio: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50-50">50% - 50%</SelectItem>
                  <SelectItem value="60-40">60% - 40%</SelectItem>
                  <SelectItem value="40-60">40% - 60%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="gap">Gap (px)</Label>
              <Input
                id="gap"
                type="number"
                min="0"
                max="100"
                value={formData.gap}
                onChange={(e) => setFormData(prev => ({ ...prev, gap: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="reverseOnMobile"
              checked={formData.reverseOnMobile}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reverseOnMobile: checked }))}
            />
            <Label htmlFor="reverseOnMobile">Reverse columns on mobile</Label>
          </div>
        </CardContent>
      </Card>

      {/* Column Editors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderColumnEditor('left')}
        {renderColumnEditor('right')}
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

export default TwoColumnEditor;
```

### 6. Create Advanced Three Column Editor

**File:** `src/components/admin/description/ThreeColumnEditor.tsx` (replace existing)

```typescript
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Upload } from 'lucide-react';

interface ThreeColumnEditorProps {
  data: any;
  onChange: (data: any) => void;
}

const ThreeColumnEditor: React.FC<ThreeColumnEditorProps> = ({ data, onChange }) => {
  const [formData, setFormData] = useState({
    columns: data.columns || [
      { heading: '', text: '', icon: '', iconColor: '#ef4444', textColor: '#ffffff' },
      { heading: '', text: '', icon: '', iconColor: '#ef4444', textColor: '#ffffff' },
      { heading: '', text: '', icon: '', iconColor: '#ef4444', textColor: '#ffffff' }
    ],
    gap: data.gap || 16,
    alignment: data.alignment || 'center',
    backgroundColor: data.backgroundColor || '#1a1a1a',
    padding: data.padding || { top: 32, bottom: 32, left: 16, right: 16 }
  });

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const handleColumnChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => 
        i === index ? { ...col, [field]: value } : col
      )
    }));
  };

  const handlePaddingChange = (side: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      padding: { ...prev.padding, [side]: value }
    }));
  };

  const handleIconUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const iconUrl = `/uploads/${file.name}`;
      handleColumnChange(index, 'icon', iconUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* Layout Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Layout Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="gap">Gap (px)</Label>
              <Input
                id="gap"
                type="number"
                min="0"
                max="100"
                value={formData.gap}
                onChange={(e) => setFormData(prev => ({ ...prev, gap: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="alignment">Alignment</Label>
              <Select
                value={formData.alignment}
                onValueChange={(value) => setFormData(prev => ({ ...prev, alignment: value }))}
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
            <div>
              <Label htmlFor="backgroundColor">Background Color</Label>
              <Input
                id="backgroundColor"
                type="color"
                value={formData.backgroundColor}
                onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Editors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {formData.columns.map((column, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-sm">Column {index + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor={`icon-${index}`}>Icon</Label>
                <div className="flex gap-2">
                  <input
                    id={`icon-${index}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleIconUpload(index, e)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById(`icon-${index}`)?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Input
                    value={column.icon}
                    onChange={(e) => handleColumnChange(index, 'icon', e.target.value)}
                    placeholder="Icon URL..."
                  />
                </div>
                {column.icon && (
                  <div className="mt-2">
                    <img
                      src={column.icon}
                      alt="Icon preview"
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor={`heading-${index}`}>Heading</Label>
                <Input
                  id={`heading-${index}`}
                  value={column.heading}
                  onChange={(e) => handleColumnChange(index, 'heading', e.target.value)}
                  placeholder="Enter heading..."
                />
              </div>

              <div>
                <Label htmlFor={`text-${index}`}>Text</Label>
                <Input
                  id={`text-${index}`}
                  value={column.text}
                  onChange={(e) => handleColumnChange(index, 'text', e.target.value)}
                  placeholder="Enter description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`iconColor-${index}`}>Icon Color</Label>
                  <Input
                    id={`iconColor-${index}`}
                    type="color"
                    value={column.iconColor}
                    onChange={(e) => handleColumnChange(index, 'iconColor', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`textColor-${index}`}>Text Color</Label>
                  <Input
                    id={`textColor-${index}`}
                    type="color"
                    value={column.textColor}
                    onChange={(e) => handleColumnChange(index, 'textColor', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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

export default ThreeColumnEditor;
```

## Testing Instructions

1. **Test Drag and Drop:**
   ```bash
   # Start the frontend
   npm run dev
   
   # Navigate to admin product edit page
   # Create multiple components
   # Test dragging to reorder components
   # Verify order persists after page refresh
   ```

2. **Test Rich Text Editor:**
   - Create a text component
   - Use the rich text toolbar to format text
   - Test bold, italic, and color formatting
   - Verify HTML is generated correctly

3. **Test Advanced Layouts:**
   - Create two-column and three-column layouts
   - Test different column ratios
   - Test responsive settings
   - Verify padding and gap settings

4. **Test Image Upload:**
   - Upload icons for three-column layouts
   - Test image preview functionality
   - Verify images display correctly in components

## Next Steps

After completing Phase 5:
- Full drag-and-drop reordering works
- Advanced rich text editing is available
- Sophisticated layout editors are complete
- All advanced admin features are implemented

## Notes

- Rich text editor uses TipTap for professional editing experience
- Drag and drop uses @dnd-kit for smooth interactions
- All layout editors provide comprehensive customization options
- Image upload integration is ready for backend implementation
- Components are fully responsive and mobile-friendly

