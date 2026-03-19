import BattlecardPanel from "@/components/BattlecardPanel";
import { Swords } from "lucide-react";

export default function BattlecardsPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-6">
        <Swords className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Competitive Battlecards</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Generate a personalized competitive battlecard against any competitor. Includes weaknesses to exploit, ADP strengths to lead with, discovery questions, and a ready-to-send displacement email.
      </p>
      <BattlecardPanel />
    </div>
  );
}
