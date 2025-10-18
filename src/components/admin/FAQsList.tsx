import { useState } from 'react';
import { Edit, Trash2, GripVertical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductFAQ, CreateFAQData, UpdateFAQData } from '@/services/api';
import FAQManagementDialog from './FAQManagementDialog';

interface FAQsListProps {
  productId: number;
  faqs: ProductFAQ[];
  onFAQCreate: (data: CreateFAQData) => Promise<void>;
  onFAQUpdate: (id: number, data: UpdateFAQData) => Promise<void>;
  onFAQDelete: (id: number) => Promise<void>;
  onFAQReorder: (faqIds: number[]) => Promise<void>;
}

const FAQsList = ({
  productId,
  faqs,
  onFAQCreate,
  onFAQUpdate,
  onFAQDelete,
  onFAQReorder
}: FAQsListProps) => {
  const [editingFAQ, setEditingFAQ] = useState<ProductFAQ | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleCreateFAQ = () => {
    setEditingFAQ(null);
    setIsDialogOpen(true);
  };

  const handleEditFAQ = (faq: ProductFAQ) => {
    setEditingFAQ(faq);
    setIsDialogOpen(true);
  };

  const handleDeleteFAQ = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      await onFAQDelete(id);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newFAQs = [...faqs];
    const draggedFAQ = newFAQs[draggedIndex];
    newFAQs.splice(draggedIndex, 1);
    newFAQs.splice(dropIndex, 0, draggedFAQ);

    // Update sort orders
    const faqIds = newFAQs.map(faq => faq.id);
    await onFAQReorder(faqIds);
    
    setDraggedIndex(null);
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
        <Button type="button" onClick={handleCreateFAQ} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add FAQ
        </Button>
      </CardHeader>
      <CardContent>
        {faqs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No FAQs added yet.</p>
            <p className="text-sm">Click "Add FAQ" to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={faq.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={`
                  flex items-start gap-3 p-3 border rounded-lg bg-card
                  ${draggedIndex === index ? 'opacity-50' : ''}
                  hover:bg-muted/50 transition-colors
                `}
              >
                <div className="flex items-center gap-2 mt-1">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <Badge variant={faq.is_active === '1' ? 'default' : 'secondary'} className="text-xs">
                    {faq.is_active === '1' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm mb-1">{faq.question}</h4>
                  <p className="text-sm text-muted-foreground">
                    {truncateText(faq.answer)}
                  </p>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditFAQ(faq)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteFAQ(faq.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <FAQManagementDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        faq={editingFAQ}
        onSave={async (data) => {
          if (editingFAQ) {
            await onFAQUpdate(editingFAQ.id, data);
          } else {
            await onFAQCreate(data);
          }
          setIsDialogOpen(false);
        }}
      />
    </Card>
  );
};

export default FAQsList;
