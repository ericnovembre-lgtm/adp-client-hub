import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AgentToolCall {
  name: string;
  input: Record<string, any>;
  result?: any;
  risk?: string;
  success?: boolean;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: AgentToolCall[];
  timestamp: Date;
}

const AGENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-agent`;

function makeId(): string {
  return crypto.randomUUID();
}

export function useAgentChat() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(makeId);
  const assistantRef = useRef<{ content: string; toolCalls: AgentToolCall[] }>({
    content: "",
    toolCalls: [],
  });

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(makeId());
    assistantRef.current = { content: "", toolCalls: [] };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      if (!session?.access_token) {
        toast.error("Please sign in to use the AI agent");
        return;
      }

      const userMsg: AgentMessage = {
        id: makeId(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      const prevMessages = [...messages, userMsg];
      setMessages(prevMessages);
      setIsLoading(true);

      const assistantId = makeId();
      assistantRef.current = { content: "", toolCalls: [] };

      const updateAssistant = () => {
        const { content, toolCalls } = assistantRef.current;
        setMessages([
          ...prevMessages,
          {
            id: assistantId,
            role: "assistant",
            content,
            toolCalls: [...toolCalls],
            timestamp: new Date(),
          },
        ]);
      };

      try {
        const resp = await fetch(AGENT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: prevMessages.map((m) => ({ role: m.role, content: m.content })),
            session_id: sessionId,
          }),
        });

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          toast.error(body.error || `Error ${resp.status}`);
          setIsLoading(false);
          return;
        }

        if (!resp.body) {
          toast.error("No response stream");
          setIsLoading(false);
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ") || line.trim() === "") continue;

            const json = line.slice(6).trim();
            if (json === "[DONE]") {
              setIsLoading(false);
              return;
            }

            try {
              const evt = JSON.parse(json);

              if (evt.type === "text") {
                assistantRef.current.content += evt.content;
                updateAssistant();
              } else if (evt.type === "tool_call") {
                assistantRef.current.toolCalls.push({
                  name: evt.tool,
                  input: evt.input,
                  risk: evt.risk,
                });
                updateAssistant();
              } else if (evt.type === "tool_result") {
                const tc = assistantRef.current.toolCalls.find(
                  (t) => t.name === evt.tool && t.result === undefined
                );
                if (tc) {
                  tc.result = evt.result;
                  tc.success = evt.success;
                  updateAssistant();
                }
              } else if (evt.type === "error") {
                toast.error(evt.error);
              }
            } catch {
              // incomplete JSON, put back
              buf = line + "\n" + buf;
              break;
            }
          }
        }

        // Process remaining buffer
        if (buf.trim()) {
          for (let raw of buf.split("\n")) {
            if (!raw || !raw.startsWith("data: ")) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            const json = raw.slice(6).trim();
            if (json === "[DONE]") continue;
            try {
              const evt = JSON.parse(json);
              if (evt.type === "text") {
                assistantRef.current.content += evt.content;
                updateAssistant();
              }
            } catch {}
          }
        }

        setIsLoading(false);
      } catch {
        toast.error("Failed to connect to AI agent");
        setIsLoading(false);
      }
    },
    [messages, isLoading, session, sessionId]
  );

  return { messages, isLoading, sessionId, sendMessage, clearChat };
}
