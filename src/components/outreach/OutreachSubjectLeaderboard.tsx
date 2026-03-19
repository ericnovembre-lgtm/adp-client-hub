import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SubjectMetric } from "@/hooks/useOutreachAnalytics";

interface Props {
  data: SubjectMetric[] | undefined;
  isLoading: boolean;
}

export default function OutreachSubjectLeaderboard({ data, isLoading }: Props) {
  if (isLoading) return <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>;
  if (!data?.length) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Subject Line Leaderboard</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject Line</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Opens</TableHead>
                <TableHead className="text-right">Open Rate</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Click Rate</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s, i) => {
                const isTop = i < 5;
                const isBottom = i >= data.length - 3 && data.length > 5;
                return (
                  <TableRow key={s.subject} className={cn(isTop && "bg-emerald-500/5", isBottom && "bg-red-500/5")}>
                    <TableCell className="max-w-[300px] truncate font-medium">{s.subject}</TableCell>
                    <TableCell className="text-right">{s.sent}</TableCell>
                    <TableCell className="text-right">{s.opens}</TableCell>
                    <TableCell className="text-right"><Badge variant={isTop ? "default" : isBottom ? "destructive" : "secondary"}>{s.openRate}%</Badge></TableCell>
                    <TableCell className="text-right">{s.clicks}</TableCell>
                    <TableCell className="text-right">{s.clickRate}%</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(s.subject); toast.success("Copied!"); }}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
