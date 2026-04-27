import { useState, useRef, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Sparkles } from "lucide-react";

interface Message {
  id: number;
  text: string;
  sender: "bot" | "user";
}

const SUGGESTIONS = [
  "Horaires du coordinateur",
  "Procédure d'évacuation",
  "Contact maintenance",
  "Règlement intérieur",
];

const BOT_RESPONSES: Record<string, string> = {
  "horaires du coordinateur": "Le coordinateur commercial est ouvert du lundi au samedi de 9h à 21h, et le dimanche de 10h à 19h.",
  "procédure d'évacuation": "En cas d'évacuation : 1) Alertez le PC sécurité via SOS. 2) Guidez les clients vers les sorties de secours. 3) Ne prenez pas les ascenseurs. 4) Rejoignez le point de rassemblement sur le parking P2.",
  "contact maintenance": "Maintenance technique : poste 4500 ou maintenance@coordinateur-commercial.fr. Disponible 24h/24.",
  "règlement intérieur": "Le règlement intérieur est disponible sur l'intranet. Points clés : ouverture 30 min avant le public, propreté des vitrines, respect des horaires de livraison (6h-9h).",
};

export default function ChatbotModule({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Bonjour ! Je suis Steel Com IA, votre assistant. Comment puis-je vous aider ?", sender: "bot" },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now(), text, sender: "user" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const key = Object.keys(BOT_RESPONSES).find(k => text.toLowerCase().includes(k));
      const response = key ? BOT_RESPONSES[key] : "Je n'ai pas compris votre demande. Essayez l'une des suggestions ci-dessous ou reformulez votre question.";
      setMessages(prev => [...prev, { id: Date.now() + 1, text: response, sender: "bot" }]);
    }, 600);
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-40 h-40 rounded-full bg-teal/10 blur-[80px]" />
      <AppHeader onBack={onBack} />
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fade-up`}>
              <div className={`flex items-start gap-2 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.sender === "bot"
                    ? "bg-gradient-to-br from-teal to-info"
                    : "bg-gradient-to-br from-primary to-violet"
                }`}>
                  {msg.sender === "bot" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
                </div>
                <div className={`px-4 py-3 rounded-2xl text-sm ${
                  msg.sender === "bot"
                    ? "glass-card"
                    : "bg-gradient-to-r from-primary to-violet text-white"
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="px-3 py-1.5 rounded-xl glass border-teal/20 text-teal text-xs font-medium font-display whitespace-nowrap hover:bg-teal/10 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 glass border-t-0">
          <form
            onSubmit={e => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Votre message..."
              className="flex-1 bg-secondary/50 border-border/50 rounded-xl"
            />
            <Button type="submit" size="icon" className="bg-gradient-to-r from-teal to-info hover:opacity-90 rounded-xl h-10 w-10">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
