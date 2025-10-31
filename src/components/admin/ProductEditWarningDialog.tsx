import { AlertTriangle, Link2, Unlink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProductEditWarningDialogProps {
  open: boolean;
  onClose: () => void;
  onCancel: () => void;
  onEditBoth: () => void;
  onEditOnlyThis: () => void;
  product: any;
  pairedProduct?: any;
}

const ProductEditWarningDialog = ({
  open,
  onClose,
  onCancel,
  onEditBoth,
  onEditOnlyThis,
  product,
  pairedProduct
}: ProductEditWarningDialogProps) => {
  if (!product) return null;

  const oppositeRegion = product.region === 'us' ? 'EU' : 'US';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600" />
            Product is Linked
          </DialogTitle>
          <DialogDescription>
            This product is linked with the {oppositeRegion} product. Changes to shared fields will affect both products.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Editing this product will automatically sync changes to name, description, price, and other shared fields to the {oppositeRegion} product. Stock quantities will remain separate.
            </AlertDescription>
          </Alert>

          {pairedProduct && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Linked Product:</p>
              <div className="text-sm text-muted-foreground">
                <p><strong>Name:</strong> {pairedProduct.name}</p>
                <p><strong>SKU:</strong> {pairedProduct.sku}</p>
                <p><strong>Region:</strong> {pairedProduct.region?.toUpperCase()}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">What would you like to do?</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li><strong>Edit Both:</strong> Save changes and sync to the {oppositeRegion} product</li>
              <li><strong>Edit Only This:</strong> Break the link and edit this product independently (cannot be undone)</li>
            </ul>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Breaking the link will separate the two products permanently. They will no longer sync automatically, and you'll need to manage them separately.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={onEditBoth} 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Link2 className="h-4 w-4 mr-2" />
            Edit Both
          </Button>
          <Button 
            variant="destructive" 
            onClick={onEditOnlyThis} 
            className="flex-1"
          >
            <Unlink className="h-4 w-4 mr-2" />
            Edit Only This
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductEditWarningDialog;

