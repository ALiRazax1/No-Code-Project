import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { messageService } from '@/services/services';
import { formatRelativeTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Conversation, Message } from '@/types';

export function MessagesPage() {
  const qc = useQueryClient();
  const { data: conversations } = useQuery({ queryKey: ['conversations'], queryFn: messageService.conversations });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const active = (conversations ?? []).find((c) => c.id === activeId) ?? null;
  const { data: messages } = useQuery({
    queryKey: ['messages', activeId],
    queryFn: () => messageService.messages(activeId!),
    enabled: !!activeId,
  });

  useEffect(() => {
    if (conversations && !activeId) setActiveId(conversations[0]?.id ?? null);
  }, [conversations, activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMut = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => messageService.send(id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', activeId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setDraft('');
    },
  });

  // Realtime subscription for new messages in the active conversation
  useEffect(() => {
    if (!activeId) return;
    const sub = messageService.subscribeToMessages(activeId, () => {
      qc.invalidateQueries({ queryKey: ['messages', activeId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    });
    return () => sub.unsubscribe();
  }, [activeId, qc]);

  const handleSend = () => {
    if (!draft.trim() || !activeId) return;
    sendMut.mutate({ id: activeId, content: draft.trim() });
  };

  const filtered = (conversations ?? []).filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Messages" subtitle="Chat with your team and customers" breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Messages' }]} />

      <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Conversation list */}
        <div className="w-full shrink-0 border-r border-gray-200 dark:border-gray-800 sm:w-72 lg:w-80">
          <div className="border-b border-gray-200 p-3 dark:border-gray-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="input-base h-9 pl-9" />
            </div>
          </div>
          <div className="h-[calc(100%-4rem)] overflow-y-auto">
            {filtered.map((c: Conversation) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn('flex w-full items-center gap-3 border-b border-gray-50 p-3 text-left transition dark:border-gray-800/50', activeId === c.id ? 'bg-brand-50 dark:bg-brand-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50')}
              >
                <div className="relative">
                  <Avatar name={c.name} size="md" />
                  {c.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
                    <span className="text-xs text-gray-400">{formatRelativeTime(c.lastMessageAt)}</span>
                  </div>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{c.lastMessage}</p>
                </div>
                {c.unread > 0 && <Badge variant="brand" className="shrink-0">{c.unread}</Badge>}
              </button>
            ))}
          </div>
        </div>

        {/* Chat window */}
        {active ? (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
              <Avatar name={active.name} size="md" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{active.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{active.online ? 'Online' : 'Offline'}</p>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-950/50">
              {(messages ?? []).map((m: Message) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={cn('flex', m.outgoing ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5 text-sm', m.outgoing ? 'bg-brand-600 text-white' : 'bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-200')}>
                    {m.content}
                    <p className={cn('mt-1 text-[10px]', m.outgoing ? 'text-brand-100' : 'text-gray-400')}>{formatRelativeTime(m.createdAt)}</p>
                  </div>
                </motion.div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="border-t border-gray-200 p-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message…"
                  className="input-base flex-1"
                />
                <button onClick={handleSend} disabled={!draft.trim()} className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">Select a conversation</div>
        )}
      </div>
    </div>
  );
}
