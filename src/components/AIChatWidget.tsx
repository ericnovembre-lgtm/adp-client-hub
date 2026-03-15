import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, ArrowLeft, Trash2, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

type Msg = { role: "user" | "assistant"; content: string; timestamp: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

async function streamChat({
  messages,
  token,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  token: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    onError(body.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) { onError("No response stream"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { done: readerDone, value } = await reader.read();
    if (readerDone) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }

  if (buf.trim()) {
    for (let raw of buf.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw.startsWith("data: ")) continue;
      const json = raw.slice(6).trim();
      if (json === "[DONE]") continue;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {}
    }
  }

  onDone();
}

export default function AIChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadedRef = useRef(false);

  // Load messages from DB when widget opens
  useEffect(() => {
    if (!open || !user || loadedRef.current) return;
    loadedRef.current = true;
    setDbLoading(true);
    supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setMessages(
            data.map((r) => ({
              role: r.role as "user" | "assistant",
              content: r.content,
              timestamp: r.created_at ?? new Date().toISOString(),
            }))
          );
        }
        setDbLoading(false);
      });
  }, [open, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const insertMsg = useCallback(
    async (role: "user" | "assistant", content: string) => {
      if (!user) return;
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        role,
        content,
      });
    },
    [user]
  );

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    const now = new Date().toISOString();
    const userMsg: Msg = { role: "user", content: text, timestamp: now };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Persist user message
    insertMsg("user", text);

    let assistantSoFar = "";
    const assistantTimestamp = new Date().toISOString();
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant" as const, content: assistantSoFar, timestamp: assistantTimestamp }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsert,
        onDone: () => {
          setIsLoading(false);
          // Persist final assistant message
          if (assistantSoFar) insertMsg("assistant", assistantSoFar);
        },
        onError: (msg) => {
          toast.error(msg);
          setIsLoading(false);
        },
      });
    } catch {
      toast.error("Failed to connect to AI assistant");
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    setMessages([]);
    if (user) {
      await supabase.from("chat_messages").delete().eq("user_id", user.id);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Open AI chat assistant"
        >
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      {open && (
        <div className={cn(
          "fixed z-50 flex flex-col overflow-hidden bg-background border shadow-2xl",
          "inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-[400px] md:h-[500px] md:rounded-xl"
        )}>
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20 md:hidden" onClick={() => setOpen(false)} aria-label="Close chat">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-sm">CRM Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20" onClick={clearChat} aria-label="Clear chat">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20 hidden md:flex" onClick={() => setOpen(false)} aria-label="Close chat">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {dbLoading ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-10 w-2/3 ml-auto" />
                <Skeleton className="h-10 w-3/4" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <p className="font-medium">👋 Hi! I'm your CRM Assistant.</p>
                <p className="mt-1">Ask me about outreach emails, sales pitches, or lead strategies.</p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  )}>
                    {m.content}
                    {m.role === "assistant" && isLoading && i === messages.length - 1 && (
                      <span className="inline-block w-1.5 h-4 bg-foreground/50 animate-pulse ml-0.5 rounded-sm" />
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-3 flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask me anything…"
              disabled={isLoading}
              className="text-sm"
              aria-label="Chat message input"
            />
            <Button size="icon" onClick={send} disabled={isLoading || !input.trim()} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
