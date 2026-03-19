import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeSlot } from "@/hooks/useOutreachAnalytics";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  data: TimeSlot[] | undefined;
  isLoading: boolean;
  bestSlots: TimeSlot[];
}

export default function OutreachSendTimeHeatmap({ data, isLoading, bestSlots }: Props) {
  if (isLoading) return <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>;
  if (!data?.length) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Best Send Time</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left pr-2 text-muted-foreground font-medium">Day</th>
                {HOURS.map(h => <th key={h} className="text-center w-8 text-muted-foreground font-normal">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((dayName, dayIdx) => (
                <tr key={dayName}>
                  <td className="pr-2 py-0.5 font-medium text-muted-foreground">{dayName}</td>
                  {HOURS.map(h => {
                    const slot = data.find(s => s.day === dayIdx && s.hour === h);
                    const rate = slot?.openRate ?? 0;
                    const isBest = bestSlots.some(b => b.day === dayIdx && b.hour === h);
                    const opacity = slot ? Math.max(0.1, rate / 100) : 0;
                    return (
                      <td key={h} className="p-0.5" title={slot ? `${slot.sent} sent, ${rate}% open rate` : "No data"}>
                        <div
                          className={cn("w-6 h-6 rounded-sm flex items-center justify-center", isBest && "ring-2 ring-primary")}
                          style={{ backgroundColor: slot ? `hsl(var(--chart-2) / ${opacity})` : "hsl(var(--muted) / 0.3)" }}
                        >
                          {isBest && <Star className="h-3 w-3 text-primary" />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bestSlots.length > 0 && (
          <p className="text-sm text-muted-foreground mt-3">
            Best time to send: <strong>{bestSlots[0].dayName} at {bestSlots[0].hour}:00</strong> ({bestSlots[0].openRate}% open rate)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
