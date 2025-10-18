import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { ProductFAQ, CreateFAQData, UpdateFAQData } from '@/services/api';

interface FAQManagementDialogProps {
  open: boolean;
  onClose: () => void;
  faq?: ProductFAQ | null;
  onSave: (data: CreateFAQData | UpdateFAQData) => Promise<void>;
}

const FAQManagementDialog = ({
  open,
  onClose,
  faq,
  onSave
}: FAQManagementDialogProps) => {
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    is_active: '1'
  });
  const [loading, setLoading] = useState(false);

  // Reset form when dialog opens/closes or faq changes
  useEffect(() => {
    if (open) {
      if (faq) {
        setFormData({
          question: faq.question,
          answer: faq.answer,
          is_active: faq.is_active
        });
      } else {
        setFormData({
          question: '',
          answer: '',
          is_active: '1'
        });
      }
    }
  }, [open, faq]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.question.trim() || !formData.answer.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving FAQ:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {faq ? 'Edit FAQ' : 'Add New FAQ'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="question">Question *</Label>
            <Textarea
              id="question"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="Enter the FAQ question..."
              rows={2}
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <Label htmlFor="answer">Answer *</Label>
            <Textarea
              id="answer"
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              placeholder="Enter the FAQ answer..."
              rows={4}
              required
              disabled={loading}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active === '1'}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked ? '1' : '0' })}
              disabled={loading}
            />
            <Label htmlFor="is_active">Active (visible to customers)</Label>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.question.trim() || !formData.answer.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : (faq ? 'Update FAQ' : 'Create FAQ')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FAQManagementDialog;
