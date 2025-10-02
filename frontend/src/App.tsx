import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Note {
  id: string;
  text: string;
  status: "TODO" | "DONE";
  created_at: string;
  updated_at: string;
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function fetchNotes() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:3000/message", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: "list all notes" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      setNotes(payload.notes ?? []);
    } catch (e: any) {
      console.error("fetchNotes error", e);
      setError(e?.message || "Failed to fetch notes");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:3000/message", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: message }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      setNotes(payload.notes ?? []);
      setMessage("");
    } catch (e: any) {
      setError(e?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    fetchNotes();
  }, []);

  // Small helper to format date
  function fmt(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  }

  // Helper to produce a subtle sticky-note look and small random rotation per note id
  function stickyStyle(id: string) {
    const colors = [
      "bg-yellow-200",
      "bg-pink-200",
      "bg-green-200",
      "bg-blue-200",
      "bg-amber-200",
    ];
    // deterministic-ish pick by hashing id
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    const color = colors[Math.abs(h) % colors.length];
    const rot = (Math.abs(h) % 9) - 4; // -4..4 degrees
    return { color, rot };
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 pb-32 relative">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Sticky Notes</h1>
          <div className="flex items-center gap-2">
            <Button onClick={fetchNotes} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            Error: {error}
          </div>
        )}

        {notes.length === 0 && !loading ? (
          <div className="text-center text-sm text-slate-500">
            No notes yet — click Refresh or add notes from the backend.
          </div>
        ) : null}

        {/* Scrollable notes container */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 140px)" }}
        >
          {notes.map((n) => {
            const { color, rot } = stickyStyle(n.id);
            return (
              <div
                key={n.id}
                className={`relative transform-gpu transition-shadow hover:shadow-2xl rounded-lg ${color} p-3`}
                style={{ transform: `rotate(${rot}deg)` }}
              >
                <Card className="shadow-none bg-transparent">
                  <CardHeader className="p-0 mb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base mr-2 truncate max-w-[120px]">
                        {n.text.split("\n")[0]}
                      </CardTitle>
                      <Badge
                        variant={n.status === "DONE" ? "secondary" : "default"}
                      >
                        {n.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {n.text}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                      <span>Updated: {fmt(n.updated_at)}</span>
                      <span className="ml-2">ID: {n.id.slice(0, 6)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
      {/* Fixed textarea input at bottom */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-lg z-50">
        <div className="max-w-5xl mx-auto flex items-center gap-2 p-4">
          <textarea
            className="flex-1 resize-none border rounded p-2 text-base bg-slate-50 focus:outline-none focus:ring"
            rows={2}
            placeholder="Send a message to your notes assistant..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
          />
          <Button
            onClick={sendMessage}
            disabled={sending || !message.trim()}
            className="ml-2"
          >
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
