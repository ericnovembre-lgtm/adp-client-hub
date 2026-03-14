import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldQuestion, ShieldAlert, ShieldX } from "lucide-react";
import type { LocalKnockoutResult } from "@/lib/knockoutLocal";

export default function EligibilityBadge({ tier, message }: { tier: LocalKnockoutResult['tier']; message: string }) {
  const config = {
    clear: { label: 'Eligible', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300', icon: ShieldCheck },
    bluefield: { label: 'Conditional', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300', icon: ShieldQuestion },
    low_probability: { label: 'Low Probability', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300', icon: ShieldAlert },
    prohibited: { label: 'Prohibited', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300', icon: ShieldX },
  };
  const c = config[tier];
  const Icon = c.icon;

  if (tier === 'clear') {
    return (
      <Badge variant="outline" className={c.className}>
        <Icon className="h-3 w-3 mr-1" />
        {c.label}
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${c.className} cursor-help`}>
            <Icon className="h-3 w-3 mr-1" />
            {c.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          <p>{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
