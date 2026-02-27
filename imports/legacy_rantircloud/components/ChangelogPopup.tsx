import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import newDocumentIntegrationsImg from "@/assets/changelog/new_document_integrations.jpg";
import newVisualDeveloperImg from "@/assets/changelog/new_visual_developer.jpg";
import newWorkflowsDeployImg from "@/assets/changelog/new_workflows_and_deploy.jpg";
import betterModelsImg from "@/assets/changelog/better_models.jpg";

interface ChangelogSlide {
  title: string;
  description: string;
  date: string;
  imagePlaceholder: string;
  comingSoon?: boolean;
}

const slides: ChangelogSlide[] = [
  {
    title: "New Documents with New Integrations",
    description: "Create notion-like documentation within the database with signage component for contracts and more",
    date: "December 2025",
    imagePlaceholder: newDocumentIntegrationsImg
  },
  {
    title: "Visual Builder Got Smarter",
    description: "AI builder utilizing Astro exports for fast Websites and Applications",
    date: "January 2026",
    imagePlaceholder: newVisualDeveloperImg
  },
  {
    title: "Integration Workflows includes Webhooks",
    description: "Add integration workflows with a single prompt by telling the tool and the workflow you have been dreaming of",
    date: "December 2025",
    imagePlaceholder: newWorkflowsDeployImg
  },
  {
    title: "Better Cloud Hosting with Better AI Models",
    description: "Plugin Development with an AI generated plugin, widget or internal tool creator directly inside Rantir Cloud",
    date: "February 2026",
    imagePlaceholder: betterModelsImg,
    comingSoon: true
  }
];

interface ChangelogPopupProps {
  hide?: boolean;
}

export function ChangelogPopup({ hide = false }: ChangelogPopupProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen || hide) return null;

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const currentSlideData = slides[currentSlide];

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-in-right">
      <Card className="w-80 shadow-xl border-2 overflow-hidden">
        {/* Header */}
        <div className="bg-primary/5 px-4 py-2 flex items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">What's New</span>
            <div className="flex gap-1">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    index === currentSlide ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-destructive/10"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Image Placeholder */}
          <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
            <img
              src={currentSlideData.imagePlaceholder}
              alt={currentSlideData.title}
              className="w-full h-full object-cover"
            />
            {currentSlideData.comingSoon && (
              <Badge
                variant="secondary"
                className="absolute top-2 right-2 bg-primary text-primary-foreground"
              >
                Coming Soon
              </Badge>
            )}
          </div>

          {/* Title and Date */}
          <div>
            <h3 className="text-sm font-semibold leading-tight mb-0.5">
              {currentSlideData.title}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {currentSlideData.date}
            </p>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {currentSlideData.description}
          </p>
        </div>

        {/* Navigation */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={handlePrev}
            disabled={currentSlide === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-xs text-muted-foreground">
            {currentSlide + 1} / {slides.length}
          </span>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={handleNext}
            disabled={currentSlide === slides.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
