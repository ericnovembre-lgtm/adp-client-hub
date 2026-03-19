import { useState, useRef, useEffect } from "react";
import {
  Bot, Sparkles, RotateCcw, ArrowUp, Search, BarChart3,
  ShieldCheck, Pencil, Plus, FileText, Mail, Wrench, ChevronDown,
  Copy, Check,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAgentChat, AgentMessage, AgentToolCall } from "@/hooks/useAgentChat";
import { useAgentRecommendations } from "@/hooks/useAgentRecommendations";

const QUICK_ACTIONS = [
  { label: "Show my pipeline", message: "Show me my current pipeline summary with deal values by stage" },
  { label: "Stalled deals", message: "Find deals that have had no activity in the last 14 days" },
  { label: "Draft outreach", message: "Help me draft an outreach email for my highest-priority uncontacted lead" },
  { label: "Score leads", message: "Score my new leads and tell me which ones to prioritize" },
  { label: "Run lead gen", message: "Run the lead generation pipeline to discover, enrich, and draft outreach for new leads" },
  { label: "Review outreach", message: "Show me pending outreach emails waiting for my review" },
];

function getToolIcon(name: string) {
  if (name.startsWith("search_")) return Search;
  if (name === "get_pipeline" || name === "get_activity") return BarChart3;
  if (name === "check_knockout") return ShieldCheck;
  if (name.startsWith("update_")) return Pencil;
  if (name === "create_task") return Plus;
  if (name === "log_activity") return FileText;
  if (name === "draft_email") return Mail;
  return Wrench;
}

function formatToolName(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isMediumRisk(name: string) {
  return ["update_lead", "update_deal", "create_task"].includes(name);
}

function ToolCallCard({ tc }: { tc: AgentToolCall }) {
  const Icon = getToolIcon(tc.name);
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 w-full text-left text-xs px-3 py-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
            isMediumRisk(tc.name) && "border-l-4 border-l-yellow-500"
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 font-medium truncate">{formatToolName(tc.name)}</span>
          {tc.success === true && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">done</Badge>}
          {tc.success === false && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">error</Badge>}
          {tc.result === undefined && (
            <span className="h-3 w-3 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
          )}
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-1 p-2 rounded bg-muted text-[11px] overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
          {tc.result !== undefined ? JSON.stringify(tc.result, null, 2) : "Running…"}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

function extractEmail(text: string): string | null {
  const match = text.match(/subject\s*:/i);
  if (!match || match.index === undefined) return null;
  const start = match.index;
  const endPattern = /\n\s*(?:STRATEGY|WHY THIS WORKS|KEY POINTS|NOTES|---)\s*[:\n]/i;
  const rest = text.slice(start);
  const endMatch = rest.match(endPattern);
  return (endMatch ? rest.slice(0, endMatch.index) : rest).trim() || null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleCopy}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-background/80 hover:bg-accent text-muted-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top"><p>Copy full response</p></TooltipContent>
    </Tooltip>
  );
}

function CopyEmailButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const emailText = extractEmail(text);
  if (!emailText) return null;
  const handleCopy = async () => {
    await navigator.clipboard.writeText(emailText);
    setCopied(true);
    toast.success("Email copied!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleCopy}
          className="absolute top-1 right-8 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-background/80 hover:bg-accent text-muted-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top"><p>Copy email only</p></TooltipContent>
    </Tooltip>
  );
}

function MessageBubble({ msg }: { msg: AgentMessage }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%] text-sm whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2">
        {msg.content && (
          <div className="relative group">
            <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm px-4 py-2 text-sm whitespace-pre-wrap">
              {msg.content}
            </div>
            <TooltipProvider delayDuration={300}>
              <CopyEmailButton text={msg.content} />
              <CopyButton text={msg.content} />
            </TooltipProvider>
          </div>
        )}
        {msg.toolCalls?.map((tc, i) => (
          <ToolCallCard key={i} tc={tc} />
        ))}
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function AgentPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage, clearChat } = useAgentChat();
  const { count } = useAgentRecommendations();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Listen for external "agent-panel-message" events (e.g. from Score All Leads button)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.message) {
        setOpen(true);
        // Small delay to ensure panel is open before sending
        setTimeout(() => sendMessage(detail.message), 100);
      }
    };
    window.addEventListener("agent-panel-message", handler);
    return () => window.removeEventListener("agent-panel-message", handler);
  }, [sendMessage]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (message: string) => {
    sendMessage(message);
  };

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
      >
        <Bot className="h-6 w-6" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
            {count}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:w-[480px] sm:max-w-[480px] p-0 flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-4 pt-4 pb-3 border-b space-y-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Agent
              </SheetTitle>
              <Button variant="ghost" size="sm" onClick={clearChat} className="h-8 gap-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" />
                New Chat
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Can search, update, and manage your CRM</p>
          </SheetHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-3">
              {messages.length === 0 && !isLoading && (
                <p className="text-center text-sm text-muted-foreground py-12">
                  Ask me anything about your CRM data.
                </p>
              )}
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && <LoadingDots />}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Quick actions + input */}
          <div className="border-t px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {QUICK_ACTIONS.map((qa) => (
                  <button
                    key={qa.label}
                    onClick={() => handleQuickAction(qa.message)}
                    disabled={isLoading}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-full border bg-card hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask the AI agent…"
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 max-h-28 overflow-y-auto"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="h-9 w-9 shrink-0 rounded-lg"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
