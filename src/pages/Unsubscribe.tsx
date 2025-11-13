/**
 * Unsubscribe Page
 * Public page for users to unsubscribe from marketing emails via token
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { authAPI } from '@/services/api';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid unsubscribe link. No token provided.');
      return;
    }

    // Call unsubscribe API via GET endpoint (for email links)
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    fetch(`${API_BASE_URL}/api/auth/newsletter/unsubscribe?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (response) => {
        const data = await response.json();
        if (response.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'You have been successfully unsubscribed from marketing emails.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to unsubscribe. Please try again or contact support.');
        }
      })
      .catch((error) => {
        console.error('Unsubscribe error:', error);
        setStatus('error');
        setMessage(error.message || 'An error occurred while processing your unsubscribe request. Please contact support.');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 sm:py-16 lg:py-20 max-w-2xl">
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl text-center">
              Unsubscribe from Marketing Emails
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {status === 'loading' && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Processing your unsubscribe request...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Successfully Unsubscribed</h2>
                <p className="text-muted-foreground text-center mb-6">{message}</p>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  You will no longer receive marketing emails from SimFab. You may still receive important account-related emails.
                </p>
                <Button onClick={() => navigate('/')} variant="default">
                  Return to Home
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Unsubscribe Failed</h2>
                <p className="text-muted-foreground text-center mb-6">{message}</p>
                <div className="space-y-2 text-sm text-muted-foreground text-center">
                  <p>If you continue to receive emails, please contact us at:</p>
                  <p>
                    <a href="mailto:info@simfab.com" className="text-primary hover:underline">
                      info@simfab.com
                    </a>
                  </p>
                </div>
                <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
                  Return to Home
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Unsubscribe;

