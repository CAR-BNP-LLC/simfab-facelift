import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, ArrowLeft, Loader2, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  const [pdfLoadError, setPdfLoadError] = useState(false);

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
        const manualData = data.data;
        setManual(manualData);
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
            <p className="text-muted-foreground mb-6">
              {error || 'The manual you are looking for does not exist or is not publicly available.'}
            </p>
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
                onClick={() => window.open(`${API_URL}${manual.file_url}`, '_blank')}
                className="shrink-0"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="bg-card rounded-lg p-6 border">
            {(() => {
              const pdfUrl = manual.file_url.startsWith('http') 
                ? manual.file_url 
                : `${API_URL}${manual.file_url}`;
              
              
              return (
                <div className="w-full bg-muted rounded overflow-hidden" style={{ minHeight: '600px', position: 'relative' }}>
                  {pdfLoadError ? (
                    <div className="flex flex-col items-center justify-center h-[600px] p-8 text-center">
                      <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                      <p className="text-lg font-semibold mb-2">PDF cannot be displayed</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Your browser may be blocking the PDF display. Please use the buttons below to view or download.
                      </p>
                      <div className="flex gap-4">
                        <Button
                          onClick={() => window.open(pdfUrl, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open in New Tab
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = pdfUrl;
                            link.download = `${manual.name}.pdf`;
                            link.click();
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      src={pdfUrl}
                      className="w-full border-0"
                      style={{ minHeight: '600px', height: 'calc(100vh - 300px)', width: '100%' }}
                      title={manual.name}
                      allow="fullscreen"
                      onLoad={() => {
                        setPdfLoadError(false);
                      }}
                      onError={() => {
                        console.error('PDF iframe load error');
                        setPdfLoadError(true);
                      }}
                    />
                  )}
                </div>
              );
            })()}
            <div className="mt-4 p-4 bg-muted rounded text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Having trouble viewing the PDF?
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const pdfUrl = manual.file_url.startsWith('http') 
                      ? manual.file_url 
                      : `${API_URL}${manual.file_url}`;
                    window.open(pdfUrl, '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const pdfUrl = manual.file_url.startsWith('http') 
                      ? manual.file_url 
                      : `${API_URL}${manual.file_url}`;
                    const link = document.createElement('a');
                    link.href = pdfUrl;
                    link.download = `${manual.name}.pdf`;
                    link.click();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ManualView;

