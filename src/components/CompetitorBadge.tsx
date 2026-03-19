import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Swords, Flame, HelpCircle } from "lucide-react";

interface CompetitorBadgeProps {
  currentProvider: string | null;
  providerType: string | null;
  displacementDifficulty: string | null;
  providerConfidence: string | null;
  onOpenBattlecard?: () => void;
}

const DISPLACEMENT_STYLES: Record<string, string> = {
  Easy: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-700",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700",
  Hard: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700",
};

export default function CompetitorBadge({
  currentProvider,
  providerType,
  displacementDifficulty,
  providerConfidence,
  onOpenBattlecard,
}: CompetitorBadgeProps) {
  if (!currentProvider && !providerType) return null;

  const isDIY = providerType === "DIY/None";
  const isUnknown = !currentProvider || currentProvider === "Unknown" || providerConfidence === "Unknown";

  if (isDIY) {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-700 cursor-pointer gap-1"
        onClick={onOpenBattlecard}
      >
        <Flame className="h-3 w-3" />
        No Provider — Hot Lead
      </Badge>
    );
  }

  if (isUnknown) {
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1">
        <HelpCircle className="h-3 w-3" />
        Provider Unknown
      </Badge>
    );
  }

  const style = DISPLACEMENT_STYLES[displacementDifficulty ?? ""] ?? DISPLACEMENT_STYLES.Medium;
  const tooltipText = `${currentProvider} (${providerType}) — ${providerConfidence} • Displacement: ${displacementDifficulty}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${style} cursor-pointer gap-1`}
            onClick={onOpenBattlecard}
          >
            <Swords className="h-3 w-3" />
            {currentProvider}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
