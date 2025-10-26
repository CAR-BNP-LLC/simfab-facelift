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