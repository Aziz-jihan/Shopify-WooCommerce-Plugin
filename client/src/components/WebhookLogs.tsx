import React, { useState, useEffect } from 'react';
import { api, WebhookEvent } from '../api.ts';
import { Activity, RefreshCw, CheckCircle, AlertTriangle, Clock, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  storeId: string;
}

export const WebhookLogs: React.FC<Props> = ({ storeId }) => {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getWebhookLogs(storeId);
      setEvents(res.events);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // Poll every 5 seconds for live webhook events
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, [storeId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-medium text-slate-300">Live Webhook Stream</span>
        </div>
        <button
          onClick={loadLogs}
          disabled={isLoading}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800/60">
        {events.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No webhook events received yet. When changes occur in your store, they will stream here.
          </div>
        ) : (
          events.map((event) => {
            const isExpanded = expandedId === event.id;
            return (
              <div key={event.id} className="p-4 hover:bg-slate-800/20 transition">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-white">
                          {event.topic}
                        </span>
                        <span className="text-xs uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {event.platform}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(event.createdAt).toLocaleTimeString()} · {new Date(event.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {event.status === 'processed' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3" /> Processed & Synced
                      </span>
                    )}
                    {event.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3 animate-spin" /> Pending
                      </span>
                    )}
                    {event.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <AlertTriangle className="w-3 h-3" /> Failed
                      </span>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    {event.errorMessage && (
                      <div className="mb-2 text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded border border-rose-800/40">
                        Error: {event.errorMessage}
                      </div>
                    )}
                    <div className="text-xs font-mono text-slate-400 mb-1">Raw Payload:</div>
                    <pre className="max-h-60 overflow-y-auto rounded-lg bg-slate-950 p-3 text-xs font-mono text-emerald-300">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
