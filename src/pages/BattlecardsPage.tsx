import BattlecardPanel from "@/components/BattlecardPanel";
import KlueIntelPanel from "@/components/KlueIntelPanel";
import { Swords } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BattlecardsPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-6">
        <Swords className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Competitive Battlecards</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Generate a personalized competitive battlecard against any competitor, or search your Klue intelligence for live competitive data.
      </p>
      <Tabs defaultValue="ai-battlecard">
        <TabsList className="w-full">
          <TabsTrigger value="ai-battlecard" className="flex-1">AI Battlecard</TabsTrigger>
          <TabsTrigger value="klue-intel" className="flex-1">Klue Intel</TabsTrigger>
        </TabsList>
        <TabsContent value="ai-battlecard">
          <BattlecardPanel />
        </TabsContent>
        <TabsContent value="klue-intel">
          <KlueIntelPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
