import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChevronLeft, ChevronRight, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdditionalDescription {
  title: string;
  images: string[];
  description: string;
}


interface AssemblyManual {
  id?: number;
  name: string;
  image?: string | null;
  fileUrl: string;
  viewUrl?: string; // URL for online viewing (/manuals/:id)
  description?: string;
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
    <div className="mt-16 space-y-16 bg-black text-white px-4 md:px-8 py-10 w-screen relative left-1/2 right-1/2 -ml-[50vw]">
      {/* Additional Descriptions */}
      {additionalDescriptions.length > 0 && (
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-primary">Additional Information</h2>
          {additionalDescriptions.map((desc, index) => {
            // Skip blocks without images so text is always paired with imagery
            if (!desc.images || desc.images.length === 0) {
              return null;
            }

            const key = `desc-${index}`;
            const currentIndex = currentImageIndex[key] || 0;
            const imageFirstOnDesktop = index % 2 === 1; // text left/image right for first, then alternate

            return (
              <div key={index} className="space-y-6">
                <div className="grid md:grid-cols-5 gap-8 items-stretch">
                  {/* Text column */}
                  <div
                    className={
                      (imageFirstOnDesktop ? 'md:order-2 md:col-span-2 ' : 'md:col-span-2 ') +
                      'space-y-3 flex flex-col justify-center'
                    }
                  >
                    <h3 className="text-2xl font-bold text-primary">{desc.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-base md:text-lg whitespace-pre-line">
                      {desc.description}
                    </p>
                  </div>

                  {/* Image column */}
                  {desc.images.length > 0 && (
                    <div className={imageFirstOnDesktop ? 'md:order-1 md:col-span-3' : 'md:order-2 md:col-span-3'}>
                      <div className="relative">
                        <div className="bg-transparent rounded-lg overflow-hidden flex items-center justify-center">
                          <img
                            src={desc.images[currentIndex]}
                            alt={`${desc.title} - Image ${currentIndex + 1}`}
                            className="max-w-full h-auto max-h-[420px] object-contain"
                          />
                        </div>

                        {desc.images.length > 1 && (
                          <>
                            <button
                              onClick={() => prevImage(index, desc.images.length)}
                              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => nextImage(index, desc.images.length)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>

                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
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
                    </div>
                  )}
                </div>
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
              <div key={manual.id || index} className="bg-muted rounded-lg p-4 space-y-4 border">
                {manual.image && (
                <div className="bg-background rounded-lg overflow-hidden" style={{ aspectRatio: '210 / 297' }}>
                  <img
                    src={manual.image}
                    alt={manual.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                )}
                <div className="space-y-2">
                  <h4 className="font-semibold">{manual.name}</h4>
                  {manual.description && (
                    <p className="text-sm text-muted-foreground">{manual.description}</p>
                  )}
                  <div className="flex gap-2">
                    {manual.viewUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(manual.viewUrl, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Online
                      </Button>
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                      className={manual.viewUrl ? "flex-1" : "w-full"}
                    onClick={() => window.open(manual.fileUrl, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                      Download
                  </Button>
                  </div>
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