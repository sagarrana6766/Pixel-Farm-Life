import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types/game';
import { Send, MessageCircle, X } from 'lucide-react';
import { lofiAudio } from '../audio/lofiAudio';

interface ChatOverlayProps {
  messages: ChatMessage[];
  isOpen: boolean;
  onSendMessage: (text: string) => void;
  onClose: () => void;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  messages,
  isOpen,
  onSendMessage,
  onClose,
}) => {
  const [inputText, setInputText] = useState('');
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
    lofiAudio.playFootstep();
  };

  return (
    <div className="absolute bottom-20 left-4 z-40 max-w-xs w-full pointer-events-none select-none">
      {/* Recent Messages Log (Always visible or semi-transparent) */}
      <div
        ref={chatScrollRef}
        className={`max-h-48 overflow-y-auto space-y-1 p-2 rounded-xl transition-all duration-200 pointer-events-auto ${
          isOpen
            ? 'bg-[#fffbeb]/95 border-2 border-[#78350f] shadow-xl'
            : 'bg-black/30 backdrop-blur-xs'
        }`}
      >
        {messages.slice(-8).map(msg => (
          <div
            key={msg.id}
            className={`text-xs font-mono leading-relaxed ${
              msg.isSystem ? 'text-amber-300 italic' : isOpen ? 'text-[#451a03]' : 'text-white drop-shadow-sm'
            }`}
          >
            {!msg.isSystem && (
              <span className="font-bold text-emerald-400 mr-1.5 drop-shadow-xs">
                {msg.name}:
              </span>
            )}
            <span>{msg.text}</span>
          </div>
        ))}
      </div>

      {/* Input bar when chat opened */}
      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-2 flex items-center gap-1.5 bg-[#fffbeb] p-1.5 rounded-xl border-2 border-[#78350f] shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-2 duration-150"
        >
          <input
            ref={inputRef}
            type="text"
            maxLength={100}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type message to LAN friends..."
            className="flex-1 px-2.5 py-1 text-xs font-mono font-medium text-[#451a03] bg-transparent focus:outline-none"
          />
          <button
            type="submit"
            className="p-1.5 bg-[#15803d] hover:bg-[#16a34a] text-white rounded-lg transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-500 hover:text-stone-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
