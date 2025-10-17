import { useToast } from '@/hooks/use-toast';
import { getErrorDetails, isRetryableError, getRetryDelay } from '@/services/api';

export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = (error: unknown, context?: string) => {
    console.error(`${context ? `${context}: ` : ''}`, error);
    const errorDetails = getErrorDetails(error);
    
    if (errorDetails.code === 'RATE_LIMIT_EXCEEDED') {
      toast({
        title: 'Rate Limit Exceeded',
        description: `Please wait ${errorDetails.retryAfter || 60} seconds before trying again.`,
        variant: 'destructive'
      });
    } else if (errorDetails.code === 'VALIDATION_ERROR') {
      toast({
        title: 'Validation Error',
        description: errorDetails.message,
        variant: 'destructive'
      });
    } else if (errorDetails.code === 'UNAUTHORIZED') {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to continue.',
        variant: 'destructive'
      });
    } else if (errorDetails.code === 'FORBIDDEN') {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to perform this action.',
        variant: 'destructive'
      });
    } else if (errorDetails.code === 'NOT_FOUND') {
      toast({
        title: 'Not Found',
        description: 'The requested resource was not found.',
        variant: 'destructive'
      });
    } else if (errorDetails.code === 'SERVER_ERROR') {
      toast({
        title: 'Server Error',
        description: 'Something went wrong on our end. Please try again later.',
        variant: 'destructive'
      });
    } else if (errorDetails.code === 'TIMEOUT') {
      toast({
        title: 'Request Timeout',
        description: 'The request took too long. Please check your connection and try again.',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Error',
        description: errorDetails.message,
        variant: 'destructive'
      });
    }
  };

  const handleSuccess = (message: string, title: string = 'Success') => {
    toast({
      title,
      description: message
    });
  };

  return {
    handleError,
    handleSuccess,
    isRetryableError,
    getRetryDelay
  };
}
