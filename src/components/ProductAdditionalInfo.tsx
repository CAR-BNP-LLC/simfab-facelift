import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdditionalDescription {
  title: string;
  images: string[];
  description: string;
}


interface AssemblyManual {
  name: string;
  image: string;
  fileUrl: string;
}

interface ProductAdditionalInfoProps {
  additionalDescriptions?: AdditionalDescription[];
  assemblyManuals?: AssemblyManual[];
}

const ProductAdditionalInfo = ({
  additionalDescriptions = [],
  assemblyManuals = []
}: ProductAdditionalInfoProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<string, number>>({});

  const nextImage = (descriptionIndex: number, totalImages: number) => {
    const key = `desc-${descriptionIndex}`;
    const current = currentImageIndex[key] || 0;
    setCurrentImageIndex(prev => ({
      ...prev,
      [key]: current === totalImages - 1 ? 0 : current + 1
    }));
  };

  const prevImage = (descriptionIndex: number, totalImages: number) => {
    const key = `desc-${descriptionIndex}`;
    const current = currentImageIndex[key] || 0;
    setCurrentImageIndex(prev => ({
      ...prev,
      [key]: current === 0 ? totalImages - 1 : current - 1
    }));
  };

  const hasContent = additionalDescriptions.length > 0 || assemblyManuals.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="mt-16 space-y-16">
      {/* Additional Descriptions */}
      {additionalDescriptions.length > 0 && (
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-primary">Additional Information</h2>
          {additionalDescriptions.map((desc, index) => {
            const key = `desc-${index}`;
            const currentIndex = currentImageIndex[key] || 0;
            
            return (
              <div key={index} className="space-y-6">
                <h3 className="text-2xl font-bold text-primary">{desc.title}</h3>
                
                {desc.images.length > 0 && (
                  <div className="relative">
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      <img
                        src={desc.images[currentIndex]}
                        alt={`${desc.title} - Image ${currentIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {desc.images.length > 1 && (
                      <>
                        <button
                          onClick={() => prevImage(index, desc.images.length)}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => nextImage(index, desc.images.length)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                          {desc.images.map((_, imgIndex) => (
                            <button
                              key={imgIndex}
                              onClick={() => setCurrentImageIndex(prev => ({ ...prev, [key]: imgIndex }))}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                imgIndex === currentIndex ? 'bg-white' : 'bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                <p className="text-muted-foreground leading-relaxed">{desc.description}</p>
              </div>
            );
          })}
        </div>
      )}


      {/* Assembly Manuals */}
      {assemblyManuals.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-primary">Assembly Manuals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assemblyManuals.map((manual, index) => (
              <div key={index} className="bg-muted rounded-lg p-4 space-y-4">
                <div className="aspect-video bg-background rounded-lg overflow-hidden">
                  <img
                    src={manual.image}
                    alt={manual.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">{manual.name}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(manual.fileUrl, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Manual
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAdditionalInfo;