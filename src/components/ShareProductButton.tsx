import React, { useState } from 'react';
import { Share2, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { sharedConfigsAPI, ProductConfiguration } from '@/services/api';

interface ShareProductButtonProps {
  productId: number;
  configuration: ProductConfiguration;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ShareProductButton: React.FC<ShareProductButtonProps> = ({
  productId,
  configuration,
  variant = 'outline',
  size = 'md',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    try {
      setLoading(true);
      const response = await sharedConfigsAPI.createSharedConfig(productId, configuration);
      
      if (response.success && response.data) {
        setShareUrl(response.data.url);
        setOpen(true);
      } else {
        throw new Error('Failed to create shared configuration');
      }
    } catch (error) {
      console.error('Error creating shared config:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create shareable link',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Shareable link copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Button
        onClick={handleShare}
        disabled={loading}
        variant={variant}
        size={size}
        className={className}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Product Configuration</DialogTitle>
            <DialogDescription>
              Copy this link to share your product configuration with others.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1 font-mono text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can view and use your product configuration.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

