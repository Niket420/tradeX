"use client";

import { useState } from "react";
import { BrainCircuit, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { answerQuery, AiResponse, SUGGESTED_QUERIES } from "@/lib/ai-assistant";
import { cn } from "@/lib/utils";

interface Turn {
  question: string;
  response: AiResponse;
}

export function AIResearchPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);

  function ask(question: string) {
    if (!question.trim()) return;
    const response = answerQuery(question);
    setTurns((t) => [...t, { question, response }]);
    setInput("");
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <BrainCircuit className="h-3.5 w-3.5 text-primary" />
        AI Research
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <BrainCircuit className="h-4 w-4 text-primary" />
            AI Research Assistant
          </SheetTitle>
          <p className="text-xs text-muted-foreground">Answers are grounded in tracked signals and data — every response shows its sources.</p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-13rem)] px-4">
          <div className="flex flex-col gap-4 py-4">
            {turns.length === 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Try asking</span>
                {SUGGESTED_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-left text-xs text-foreground/90 hover:bg-muted"
                  >
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    {q}
                  </button>
                ))}
              </div>
            ) : null}

            {turns.map((turn, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                <div className="self-end rounded-lg rounded-br-sm bg-primary/15 px-3 py-2 text-xs text-foreground">{turn.question}</div>
                <div className="flex flex-col gap-2 rounded-lg rounded-bl-sm border border-border bg-card px-3 py-2.5">
                  <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/90">{turn.response.answer}</p>
                  {turn.response.sources.length > 0 ? (
                    <div className="flex flex-col gap-1 border-t border-border pt-2">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Underlying data</span>
                      {turn.response.sources.map((s, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className="font-mono tabular-nums text-foreground/80">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className={cn("flex items-center gap-2 border-t border-border p-3")}
        >
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about a company, sector, or screen..." className="h-9 text-xs" />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
