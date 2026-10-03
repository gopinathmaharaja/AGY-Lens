import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';

declare global {
  interface Window {
    acquireVsCodeApi?: () => any;
  }
}

const vscode = typeof window.acquireVsCodeApi === 'function' ? window.acquireVsCodeApi() : null;

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'prompts' | 'conversations' | 'models' | 'sources' | 'profile' | 'report'>('overview');
  const [convSearchText, setConvSearchText] = useState('');
  const [convSourceFilter, setConvSourceFilter] = useState<'all' | 'cli' | 'app' | 'ide'>('all');
  const [data, setData] = useState<any>(null);
  const [coachInput, setCoachInput] = useState('');
  const [coachAnalysis, setCoachAnalysis] = useState<any>(null);
  const [coachImproved, setCoachImproved] = useState('');
  const [copied, setCopied] = useState(false);
  const [promptSearchText, setPromptSearchText] = useState('');
  const [promptSourceFilter, setPromptSourceFilter] = useState<'all' | 'cli' | 'app' | 'ide'>('all');
  const [promptCategoryFilter, setPromptCategoryFilter] = useState<string>('all');
  const [promptSortBy, setPromptSortBy] = useState<'timestamp' | 'tokens' | 'score'>('timestamp');
  const [expandedPromptIdx, setExpandedPromptIdx] = useState<number | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === 'dashboardData') {
        setData(msg.payload);
      } else if (msg.type === 'promptAnalyzed') {
        setCoachAnalysis(msg.analysis);
      } else if (msg.type === 'promptImproved') {
        setCoachImproved(msg.improved);
      }
    };

    window.addEventListener('message', handleMessage);
    if (vscode) {
      vscode.postMessage({ command: 'ready' });
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleRefresh = () => {
    if (vscode) {
      vscode.postMessage({ command: 'refresh' });
    }
  };

  const handleRescan = () => {
    if (vscode) {
      vscode.postMessage({ command: 'rescanAll' });
    }
  };

  const handleAnalyzePrompt = () => {
    if (!coachInput.trim()) return;
    if (vscode) {
      vscode.postMessage({ command: 'analyzePrompt', prompt: coachInput });
    }
  };

  const handleImprovePrompt = () => {
    if (!coachInput.trim()) return;
    if (vscode) {
      vscode.postMessage({ command: 'improvePrompt', prompt: coachInput });
    }
  };

  const handleCopyImproved = () => {
    if (!coachImproved) return;
    if (vscode) {
      vscode.postMessage({ command: 'copyToClipboard', text: coachImproved });
    } else {
      navigator.clipboard.writeText(coachImproved);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const snap = data?.snapshot || {};
  const today = data?.todaySummary || {};
  const week = data?.weekSummary || {};
  const currentModel = data?.currentModel || snap.model || 'Gemini 3.8 Flash';
  const daily = (data?.dailyUsage || []).slice().reverse();
  const models = data?.modelUsage || [];
  const prompts = data?.recentPrompts || [];
  const sessions = data?.recentSessions || [];
  const usageBySource = data?.usageBySource || [];
  const tokensByCategory = data?.tokensByCategory || [];
  const profile = data?.profile;
  const weeklyReport = data?.weeklyReport;

  const filteredPrompts = prompts
    .filter((p: any) => {
      if (promptSourceFilter !== 'all' && p.source !== promptSourceFilter) return false;
      if (promptCategoryFilter !== 'all' && p.category !== promptCategoryFilter) return false;
      if (promptSearchText.trim()) {
        const q = promptSearchText.toLowerCase();
        return (
          (p.prompt && p.prompt.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.missing_items && p.missing_items.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a: any, b: any) => {
      if (promptSortBy === 'tokens') {
        const tokensA = (a.estimated_input_tokens || 0) + (a.estimated_output_tokens || 0);
        const tokensB = (b.estimated_input_tokens || 0) + (b.estimated_output_tokens || 0);
        return tokensB - tokensA;
      }
      if (promptSortBy === 'score') {
        return (b.prompt_score || 0) - (a.prompt_score || 0);
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>🚀 Antigravity Usage Intelligence</h1>
          <p style={{ fontSize: 13, color: 'var(--subtext)' }}>
            Personal AI Usage Analyst, Quota Monitor & Prompt Quality Coach
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12, background: 'rgba(137, 180, 250, 0.15)', color: '#89b4fa', fontWeight: 600 }}>
            {snap.model || 'Gemini 3.8 Flash (High)'}
          </span>
          <button
            onClick={handleRefresh}
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-fg)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13
            }}
          >
            Live Sync
          </button>
          <button
            onClick={handleRescan}
            style={{
              background: 'var(--card-bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              padding: '8px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13
            }}
          >
            Rescan All History
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'usage', label: 'Usage & Tokens' },
          { id: 'prompts', label: 'Prompt Coach' },
          { id: 'conversations', label: 'Conversations' },
          { id: 'models', label: 'Models' },
          { id: 'sources', label: 'Source Comparison' },
          { id: 'profile', label: 'Personal Profile' },
          { id: 'report', label: 'Weekly Report' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: activeTab === tab.id ? '1px solid var(--border)' : '1px solid transparent',
              background: activeTab === tab.id ? 'var(--card-bg)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--subtext)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Current Model</div>
              <div style={{ fontSize: 18, fontWeight: 700, margin: '8px 0', color: '#fff', wordBreak: 'break-word' }}>
                {currentModel}
              </div>
              <div style={{ fontSize: 12, color: 'var(--accent)' }}>Runtime: {snap.agentState || 'IDLE'}</div>
            </div>

            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Today's Tokens</div>
              <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', color: '#89b4fa' }}>
                {(today.tokens || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>
                Across {today.requests || 0} user {today.requests === 1 ? 'prompt' : 'prompts'}
              </div>
            </div>

            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Today's Requests</div>
              <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', color: '#a6e3a1' }}>
                {today.requests || 0}
              </div>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>
                Avg {today.requests > 0 ? Math.round((today.tokens || 0) / today.requests).toLocaleString() : 0} tk/prompt
              </div>
            </div>

            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>This Week</div>
              <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', color: '#cba6f7' }}>
                {(week.tokens || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>
                {week.requests || 0} prompts past 7 days
              </div>
            </div>

            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Avg Prompt Quality</div>
              <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', color: '#f9e2af' }}>
                {data?.avgScore || 0}/100
              </div>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Across 7 transparent dimensions</div>
            </div>

            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Remaining Quota</div>
              <div style={{ fontSize: 18, fontWeight: 700, margin: '8px 0', color: 'var(--subtext)' }}>
                Unavailable
              </div>
              <div style={{ fontSize: 11, color: 'var(--subtext)' }}>
                Not exposed locally by Antigravity
              </div>
            </div>
          </div>

          {/* Context Window Usage */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Active Context Window Usage</span>
              <span style={{ fontSize: 13, color: 'var(--accent)' }}>{snap.contextPercentage || 0}%</span>
            </div>
            <div style={{ background: 'var(--border)', height: 10, borderRadius: 5, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  background: (snap.contextPercentage || 0) > 85 ? 'var(--danger)' : 'var(--primary)',
                  width: `${snap.contextPercentage || 0}%`,
                  transition: 'width 0.3s'
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 6 }}>
              {((snap.contextTokens || 0) / 1000).toFixed(1)}k tokens used of {(snap.contextWindow / 1000).toFixed(0)}k token window limit
            </div>
          </div>

          {/* 7-Day Usage Chart */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Daily Token Activity (Last 7 Days)</div>
            <div style={{ height: 220, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily.length > 0 ? daily : [{ date: 'Today', totalTokens: 12000 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
                  <XAxis dataKey="date" stroke="#a6adc8" fontSize={11} />
                  <YAxis stroke="#a6adc8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#181825', borderColor: '#313244', color: '#fff' }} />
                  <Area type="monotone" dataKey="totalTokens" stroke="#89b4fa" fill="#89b4fa" fillOpacity={0.2} name="Total Tokens" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Sessions Table */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Recent Conversation Sessions</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'var(--subtext)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Source</th>
                  <th style={{ padding: '8px 10px' }}>Conversation ID</th>
                  <th style={{ padding: '8px 10px' }}>Model</th>
                  <th style={{ padding: '8px 10px' }}>Turns</th>
                  <th style={{ padding: '8px 10px' }}>Est. Tokens</th>
                  <th style={{ padding: '8px 10px' }}>State</th>
                  <th style={{ padding: '8px 10px' }}>Started</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: 'var(--subtext)' }}>No sessions recorded yet</td></tr>
                ) : (
                  sessions.slice(0, 10).map((s: any) => {
                    const srcBadge = s.source === 'ide' ? '💻 IDE' : s.source === 'app' ? '🖥️ App' : '📟 CLI';
                    const srcBg = s.source === 'ide' ? 'rgba(137, 180, 250, 0.2)' : s.source === 'app' ? 'rgba(166, 227, 161, 0.2)' : 'rgba(249, 226, 175, 0.2)';
                    const srcColor = s.source === 'ide' ? '#89b4fa' : s.source === 'app' ? '#a6e3a1' : '#f9e2af';
                    const totalTokens = (s.total_estimated_input_tokens || 0) + (s.total_estimated_output_tokens || 0);

                    return (
                      <tr key={s.conversation_id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 4, background: srcBg, color: srcColor, fontSize: 11, fontWeight: 600 }}>
                            {srcBadge}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{s.conversation_id.slice(0, 14)}...</td>
                        <td style={{ padding: '8px 10px' }}>{s.model || 'Gemini'}</td>
                        <td style={{ padding: '8px 10px' }}>{s.step_count}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: totalTokens > 30000 ? '#f9e2af' : 'var(--text)' }}>
                          {totalTokens > 0 ? totalTokens.toLocaleString() : '--'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, background: s.agent_state === 'RUNNING' ? 'rgba(166, 227, 161, 0.2)' : 'rgba(137, 180, 250, 0.2)', color: s.agent_state === 'RUNNING' ? '#a6e3a1' : '#89b4fa' }}>
                            {s.agent_state}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--subtext)' }}>{s.started_at ? s.started_at.slice(0, 16).replace('T', ' ') : '--'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: USAGE & TOKENS */}
      {activeTab === 'usage' && (() => {
        const totalInputTokens = daily.reduce((sum: number, d: any) => sum + (d.inputTokens || 0), 0);
        const totalOutputTokens = daily.reduce((sum: number, d: any) => sum + (d.outputTokens || 0), 0);
        const totalDailyTokens = totalInputTokens + totalOutputTokens;
        const totalRequests = daily.reduce((sum: number, d: any) => sum + (d.requestCount || 0), 0);
        const avgCostPerPrompt = totalRequests > 0 ? Math.round(totalDailyTokens / totalRequests) : 0;
        const inputPct = totalDailyTokens > 0 ? Math.round((totalInputTokens / totalDailyTokens) * 100) : 0;
        const outputPct = totalDailyTokens > 0 ? Math.round((totalOutputTokens / totalDailyTokens) * 100) : 0;

        return (
          <div>
            {/* Summary Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Total Tokens (30 Days)</div>
                <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', color: '#fff' }}>
                  {totalDailyTokens.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: 'var(--accent)' }}>Across {totalRequests.toLocaleString()} prompts</div>
              </div>

              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Input Tokens</div>
                <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', color: '#89b4fa' }}>
                  {totalInputTokens.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: 'var(--subtext)' }}>{inputPct}% of total consumption</div>
              </div>

              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Output Tokens</div>
                <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', color: '#a6e3a1' }}>
                  {totalOutputTokens.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: 'var(--subtext)' }}>{outputPct}% of total consumption</div>
              </div>

              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Avg Cost / Prompt</div>
                <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', color: '#f9e2af' }}>
                  {avgCostPerPrompt.toLocaleString()} tk
                </div>
                <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Input + model generation</div>
              </div>
            </div>

            {/* Chart 1: Daily Token Activity & Cost Per Prompt Trend */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Daily Token Volume & Cost Per Prompt Trend</div>
                <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Blue: Total Tokens (Left) | Yellow: Avg Cost/Prompt (Right)</div>
              </div>
              <div style={{ height: 260, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily.length > 0 ? daily : [{ date: 'Today', totalTokens: 0, avgTokensPerRequest: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
                    <XAxis dataKey="date" stroke="#a6adc8" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#89b4fa" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f9e2af" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#181825', borderColor: '#313244', color: '#fff' }} />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="totalTokens" stroke="#89b4fa" fill="#89b4fa" fillOpacity={0.2} name="Total Tokens" />
                    <Line yAxisId="right" type="monotone" dataKey="avgTokensPerRequest" stroke="#f9e2af" strokeWidth={2} dot={false} name="Avg Cost/Prompt" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Input vs Output Token Distribution */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Input vs Output Token Distribution (Daily)</div>
              <div style={{ height: 260, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
                    <XAxis dataKey="date" stroke="#a6adc8" fontSize={11} />
                    <YAxis stroke="#a6adc8" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#181825', borderColor: '#313244', color: '#fff' }} />
                    <Legend />
                    <Bar dataKey="inputTokens" fill="#89b4fa" name="Input Tokens" stackId="a" />
                    <Bar dataKey="outputTokens" fill="#a6e3a1" name="Output Tokens" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2-Column Grid: Source & Category Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 24 }}>
              {/* Tokens by Source */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 12 }}>
                  Tokens by Source (CLI vs Desktop App vs IDE)
                </div>
                {usageBySource.length === 0 ? (
                  <p style={{ color: 'var(--subtext)', fontSize: 13 }}>No source data recorded yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {usageBySource.map((s: any) => {
                      const totalAll = usageBySource.reduce((sum: number, item: any) => sum + (item.totalTokens || 0), 0);
                      const pct = totalAll > 0 ? Math.round(((s.totalTokens || 0) / totalAll) * 100) : 0;
                      const icon = s.source === 'ide' ? '💻 IDE' : s.source === 'app' ? '🖥️ Desktop App' : '📟 Terminal CLI';
                      const color = s.source === 'ide' ? '#89b4fa' : s.source === 'app' ? '#a6e3a1' : '#f9e2af';

                      return (
                        <div key={s.source} style={{ padding: 10, background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color, fontSize: 13 }}>{icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                              {(s.totalTokens || 0).toLocaleString()} tk ({pct}%)
                            </span>
                          </div>
                          <div style={{ background: 'var(--border)', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--subtext)' }}>
                            <span>{s.promptCount} prompts</span>
                            <span>In: {(s.inputTokens || 0).toLocaleString()} | Out: {(s.outputTokens || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tokens by Category */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 12 }}>
                  Token Consumption by Task Category
                </div>
                {tokensByCategory.length === 0 ? (
                  <p style={{ color: 'var(--subtext)', fontSize: 13 }}>No category metrics available yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {tokensByCategory.slice(0, 6).map((cat: any) => {
                      const maxCatTokens = Math.max(...tokensByCategory.map((c: any) => c.totalTokens || 0), 1);
                      const barWidth = Math.round(((cat.totalTokens || 0) / maxCatTokens) * 100);

                      return (
                        <div key={cat.category} style={{ fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontWeight: 500, color: '#fff' }}>{cat.category}</span>
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                              {(cat.totalTokens || 0).toLocaleString()} tk
                            </span>
                          </div>
                          <div style={{ background: 'var(--border)', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 2 }}>
                            <div style={{ height: '100%', width: `${barWidth}%`, background: '#89b4fa' }} />
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--subtext)' }}>
                            {cat.promptCount} prompt(s) • Avg {cat.promptCount > 0 ? Math.round(cat.totalTokens / cat.promptCount).toLocaleString() : 0} tk/prompt
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Daily Metrics Breakdown Table */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Daily Metrics Breakdown</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: 'var(--subtext)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px' }}>Date</th>
                    <th style={{ padding: '8px 10px' }}>Prompts</th>
                    <th style={{ padding: '8px 10px' }}>Input Tokens</th>
                    <th style={{ padding: '8px 10px' }}>Output Tokens</th>
                    <th style={{ padding: '8px 10px' }}>Total Tokens</th>
                    <th style={{ padding: '8px 10px' }}>Avg Cost/Prompt</th>
                    <th style={{ padding: '8px 10px' }}>Avg Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((d: any) => (
                    <tr key={d.date} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{d.date}</td>
                      <td style={{ padding: '8px 10px' }}>{d.requestCount}</td>
                      <td style={{ padding: '8px 10px' }}>{d.inputTokens.toLocaleString()}</td>
                      <td style={{ padding: '8px 10px' }}>{d.outputTokens.toLocaleString()}</td>
                      <td style={{ padding: '8px 10px', color: '#89b4fa', fontWeight: 600 }}>{d.totalTokens.toLocaleString()}</td>
                      <td style={{ padding: '8px 10px', color: '#f9e2af', fontWeight: 500 }}>
                        {d.avgTokensPerRequest ? `${d.avgTokensPerRequest.toLocaleString()} tk` : '--'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {d.avgPromptScore ? (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                            background: d.avgPromptScore >= 75 ? 'rgba(166, 227, 161, 0.2)' : d.avgPromptScore >= 50 ? 'rgba(249, 226, 175, 0.2)' : 'rgba(243, 139, 168, 0.2)',
                            color: d.avgPromptScore >= 75 ? '#a6e3a1' : d.avgPromptScore >= 50 ? '#f9e2af' : '#f38ba8'
                          }}>
                            {d.avgPromptScore}/100
                          </span>
                        ) : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TAB: PROMPT COACH */}
      {activeTab === 'prompts' && (
        <div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
              Interactive Prompt Quality Sandbox
            </div>
            <p style={{ fontSize: 13, color: 'var(--subtext)', marginBottom: 12 }}>
              Score your prompt against 7 transparent dimensions: Clarity, Context, Requirements, Constraints, Expected Output, Acceptance Criteria, and Scope.
            </p>
            <textarea
              value={coachInput}
              onChange={(e) => setCoachInput(e.target.value)}
              placeholder="e.g. Implement a caching layer for the user profile service in Node.js using Redis. Preserve existing contracts and add unit tests."
              style={{
                width: '100%',
                minHeight: 100,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: 12,
                color: 'var(--text)',
                fontSize: 13,
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button
                onClick={handleAnalyzePrompt}
                style={{
                  background: 'var(--primary)',
                  color: 'var(--primary-fg)',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13
                }}
              >
                Score Prompt
              </button>
              <button
                onClick={handleImprovePrompt}
                style={{
                  background: 'transparent',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  padding: '8px 18px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13
                }}
              >
                Auto-Improve Structure
              </button>
            </div>

            {coachAnalysis && (
              <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: coachAnalysis.score >= 80 ? '#a6e3a1' : coachAnalysis.score >= 50 ? '#f9e2af' : '#f38ba8' }}>
                    Quality Score: {coachAnalysis.score} / 100
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 12, background: 'rgba(203, 166, 247, 0.2)', color: '#cba6f7', fontSize: 12, fontWeight: 600 }}>
                    Category: {coachAnalysis.category}
                  </span>
                </div>

                {/* Dimension pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {Object.entries(coachAnalysis.dimensionScores || {}).map(([dim, val]: any) => (
                    <div key={dim} style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 6, fontSize: 12 }}>
                      <span style={{ color: 'var(--subtext)', textTransform: 'capitalize' }}>{dim}: </span>
                      <strong style={{ color: '#fff' }}>{val}</strong>
                    </div>
                  ))}
                </div>

                {coachAnalysis.missingItems?.length > 0 && (
                  <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>
                    <strong>Missing Elements: </strong> {coachAnalysis.missingItems.join(', ')}
                  </div>
                )}

                {coachAnalysis.strengths?.length > 0 && (
                  <div style={{ color: 'var(--accent)', fontSize: 13, marginBottom: 8 }}>
                    <strong>Identified Strengths: </strong> {coachAnalysis.strengths.join(', ')}
                  </div>
                )}
              </div>
            )}

            {coachImproved && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>
                  Improved Battle-Tested Prompt:
                </div>
                <textarea
                  readOnly
                  value={coachImproved}
                  style={{
                    width: '100%',
                    minHeight: 140,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: 12,
                    color: 'var(--text)',
                    fontSize: 13,
                    fontFamily: 'monospace'
                  }}
                />
                <button
                  onClick={handleCopyImproved}
                  style={{
                    marginTop: 8,
                    background: copied ? 'var(--accent)' : 'var(--card-bg)',
                    color: copied ? '#11111b' : 'var(--text)',
                    border: '1px solid var(--border)',
                    padding: '6px 14px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600
                  }}
                >
                  {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
                </button>
              </div>
            )}
          </div>

          {/* Historical prompts */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Unified Prompt History & Token Cost</div>
                <div style={{ fontSize: 12, color: 'var(--subtext)' }}>
                  Aggregated from CLI, Desktop App, and VS Code IDE with granular token breakdown
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search prompts or missing elements..."
                  value={promptSearchText}
                  onChange={(e) => setPromptSearchText(e.target.value)}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '6px 12px',
                    color: 'var(--text)',
                    fontSize: 12,
                    minWidth: 220
                  }}
                />
                <select
                  value={promptSourceFilter}
                  onChange={(e: any) => setPromptSourceFilter(e.target.value)}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    color: 'var(--text)',
                    fontSize: 12
                  }}
                >
                  <option value="all">All Sources</option>
                  <option value="cli">📟 CLI</option>
                  <option value="app">🖥️ Desktop App</option>
                  <option value="ide">💻 IDE</option>
                </select>
                <select
                  value={promptSortBy}
                  onChange={(e: any) => setPromptSortBy(e.target.value)}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    color: 'var(--text)',
                    fontSize: 12
                  }}
                >
                  <option value="timestamp">Newest First</option>
                  <option value="tokens">Highest Tokens</option>
                  <option value="score">Highest Score</option>
                </select>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'var(--subtext)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Source</th>
                  <th style={{ padding: '8px 10px' }}>Prompt</th>
                  <th style={{ padding: '8px 10px' }}>Category</th>
                  <th style={{ padding: '8px 10px' }}>Est. Tokens</th>
                  <th style={{ padding: '8px 10px' }}>Score</th>
                  <th style={{ padding: '8px 10px' }}>Missing</th>
                  <th style={{ padding: '8px 10px' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrompts.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: 'var(--subtext)' }}>No matching prompts found</td></tr>
                ) : (
                  filteredPrompts.map((p: any, idx: number) => {
                    const isExpanded = expandedPromptIdx === idx;
                    const scoreColor = p.prompt_score >= 80 ? '#a6e3a1' : p.prompt_score >= 50 ? '#f9e2af' : '#f38ba8';
                    const srcBadge = p.source === 'ide' ? '💻 IDE' : p.source === 'app' ? '🖥️ App' : '📟 CLI';
                    const srcBg = p.source === 'ide' ? 'rgba(137, 180, 250, 0.2)' : p.source === 'app' ? 'rgba(166, 227, 161, 0.2)' : 'rgba(249, 226, 175, 0.2)';
                    const srcColor = p.source === 'ide' ? '#89b4fa' : p.source === 'app' ? '#a6e3a1' : '#f9e2af';
                    const inputTk = p.estimated_input_tokens || 0;
                    const outputTk = p.estimated_output_tokens || 0;
                    const totalTk = inputTk + outputTk;
                    const isExpensive = totalTk >= 30000;

                    return (
                      <React.Fragment key={idx}>
                        <tr
                          onClick={() => setExpandedPromptIdx(isExpanded ? null : idx)}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            background: isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 4, background: srcBg, color: srcColor, fontSize: 11, fontWeight: 600 }}>
                              {srcBadge}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#fff', textDecoration: isExpanded ? 'underline' : 'none' }}>
                              {p.prompt}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px' }}>{p.category}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                            <span style={{ color: isExpensive ? '#f38ba8' : totalTk > 10000 ? '#f9e2af' : 'var(--text)' }}>
                              {totalTk > 0 ? totalTk.toLocaleString() + ' tk' : '--'}
                            </span>
                            {isExpensive && (
                              <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(243, 139, 168, 0.2)', color: '#f38ba8' }}>
                                🔥 Expensive
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', color: scoreColor, fontWeight: 700 }}>
                            {p.prompt_score}/100
                            {(p.constraints_score === 0 || p.acceptance_criteria_score === 0 || p.expected_output_score === 0) && p.prompt_score < 80 && (
                              <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(249, 226, 175, 0.2)', color: '#f9e2af', fontWeight: 600 }}>
                                ⚡ Quick Win
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--subtext)', fontSize: 12 }}>{p.missing_items || 'None'}</td>
                          <td style={{ padding: '8px 10px', color: 'var(--subtext)', fontSize: 12 }}>
                            {p.timestamp ? p.timestamp.slice(0, 16).replace('T', ' ') : '--'}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border)' }}>
                            <td colSpan={7} style={{ padding: 14 }}>
                              <div style={{ marginBottom: 10 }}>
                                <strong style={{ color: '#fff' }}>Full Prompt:</strong>
                                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, marginTop: 4, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                                  {p.prompt}
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap', fontSize: 12 }}>
                                <div><span style={{ color: 'var(--subtext)' }}>Input Tokens: </span><strong>{inputTk.toLocaleString()}</strong></div>
                                <div><span style={{ color: 'var(--subtext)' }}>AI Output Tokens: </span><strong>{outputTk.toLocaleString()}</strong></div>
                                <div><span style={{ color: 'var(--subtext)' }}>Total Tokens: </span><strong style={{ color: '#89b4fa' }}>{totalTk.toLocaleString()}</strong></div>
                                <div><span style={{ color: 'var(--subtext)' }}>Words: </span><strong>{p.word_count || p.prompt.split(/\s+/).filter(Boolean).length}</strong></div>
                              </div>

                              {(p.constraints_score === 0 || p.acceptance_criteria_score === 0 || p.expected_output_score === 0) && p.prompt_score < 80 && (
                                <div style={{ background: 'rgba(249, 226, 175, 0.1)', border: '1px solid rgba(249, 226, 175, 0.3)', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#f9e2af' }}>
                                  <strong>⚡ Quick Win Opportunity:</strong> Adding explicit constraints (e.g. "Do not modify public API contracts") or verification criteria will immediately increase this prompt score by 15+ points!
                                </div>
                              )}

                              <div style={{ marginTop: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)', marginBottom: 8 }}>
                                  Transparent Evaluation Dimensions (7 Criteria):
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                                  {[
                                    { label: 'Clarity', val: p.clarity_score || 0, max: 20 },
                                    { label: 'Context', val: p.context_score || 0, max: 15 },
                                    { label: 'Requirements', val: p.requirements_score || 0, max: 15 },
                                    { label: 'Constraints', val: p.constraints_score || 0, max: 15 },
                                    { label: 'Output Spec', val: p.expected_output_score || 0, max: 15 },
                                    { label: 'Criteria', val: p.acceptance_criteria_score || 0, max: 10 },
                                    { label: 'Scope', val: p.scope_score || 0, max: 10 }
                                  ].map((d) => {
                                    const pct = Math.round((d.val / d.max) * 100);
                                    const color = pct >= 75 ? '#a6e3a1' : pct >= 45 ? '#f9e2af' : '#f38ba8';
                                    return (
                                      <div key={d.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 6, fontSize: 11 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                          <span style={{ color: 'var(--subtext)' }}>{d.label}</span>
                                          <span style={{ fontWeight: 600, color }}>{d.val}/{d.max}</span>
                                        </div>
                                        <div style={{ background: 'var(--border)', height: 4, borderRadius: 2, overflow: 'hidden' }}>
                                          <div style={{ height: '100%', width: `${pct}%`, background: color }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: CONVERSATIONS (Phase 6A) */}
      {activeTab === 'conversations' && (() => {
        const filteredConvs = sessions.filter((s: any) => {
          if (convSourceFilter !== 'all' && s.source !== convSourceFilter) return false;
          if (convSearchText.trim()) {
            const q = convSearchText.toLowerCase();
            return (
              (s.conversation_id && s.conversation_id.toLowerCase().includes(q)) ||
              (s.workspace && s.workspace.toLowerCase().includes(q)) ||
              (s.model && s.model.toLowerCase().includes(q))
            );
          }
          return true;
        });

        return (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Conversation History & Session Efficiency</div>
                <div style={{ fontSize: 12, color: 'var(--subtext)' }}>
                  All conversations indexed across CLI, Desktop App, and IDE ({filteredConvs.length} found)
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Search workspace or ID..."
                  value={convSearchText}
                  onChange={(e) => setConvSearchText(e.target.value)}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '6px 12px',
                    color: 'var(--text)',
                    fontSize: 12,
                    minWidth: 200
                  }}
                />
                <select
                  value={convSourceFilter}
                  onChange={(e: any) => setConvSourceFilter(e.target.value)}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    color: 'var(--text)',
                    fontSize: 12
                  }}
                >
                  <option value="all">All Sources</option>
                  <option value="cli">📟 CLI</option>
                  <option value="app">🖥️ Desktop App</option>
                  <option value="ide">💻 IDE</option>
                </select>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'var(--subtext)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Source</th>
                  <th style={{ padding: '8px 10px' }}>Conversation ID</th>
                  <th style={{ padding: '8px 10px' }}>Workspace</th>
                  <th style={{ padding: '8px 10px' }}>Model</th>
                  <th style={{ padding: '8px 10px' }}>Turns</th>
                  <th style={{ padding: '8px 10px' }}>Total Tokens</th>
                  <th style={{ padding: '8px 10px' }}>Efficiency</th>
                  <th style={{ padding: '8px 10px' }}>State</th>
                  <th style={{ padding: '8px 10px' }}>Started</th>
                </tr>
              </thead>
              <tbody>
                {filteredConvs.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: 16, textAlign: 'center', color: 'var(--subtext)' }}>No matching conversations found</td></tr>
                ) : (
                  filteredConvs.map((s: any) => {
                    const srcBadge = s.source === 'ide' ? '💻 IDE' : s.source === 'app' ? '🖥️ App' : '📟 CLI';
                    const srcBg = s.source === 'ide' ? 'rgba(137, 180, 250, 0.2)' : s.source === 'app' ? 'rgba(166, 227, 161, 0.2)' : 'rgba(249, 226, 175, 0.2)';
                    const srcColor = s.source === 'ide' ? '#89b4fa' : s.source === 'app' ? '#a6e3a1' : '#f9e2af';
                    const totalTokens = (s.total_estimated_input_tokens || 0) + (s.total_estimated_output_tokens || 0);
                    const efficiency = s.step_count <= 8 ? 'High' : s.step_count <= 25 ? 'Moderate' : 'Low';
                    const effColor = efficiency === 'High' ? '#a6e3a1' : efficiency === 'Moderate' ? '#f9e2af' : '#f38ba8';
                    const workspaceName = s.workspace ? s.workspace.split(/[\\/]/).filter(Boolean).pop() || s.workspace : 'General';

                    return (
                      <tr key={s.conversation_id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 4, background: srcBg, color: srcColor, fontSize: 11, fontWeight: 600 }}>
                            {srcBadge}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                          <span
                            title={s.conversation_id}
                            style={{ cursor: 'pointer', color: '#89b4fa', textDecoration: 'underline' }}
                            onClick={() => {
                              setPromptSearchText(s.conversation_id);
                              setActiveTab('prompts');
                            }}
                          >
                            {s.conversation_id.slice(0, 12)}...
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--text)' }}>{workspaceName}</td>
                        <td style={{ padding: '8px 10px' }}>{s.model || 'Gemini'}</td>
                        <td style={{ padding: '8px 10px' }}>{s.step_count}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: totalTokens > 30000 ? '#f38ba8' : 'var(--text)' }}>
                          {totalTokens > 0 ? totalTokens.toLocaleString() : '--'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: efficiency === 'High' ? 'rgba(166, 227, 161, 0.2)' : efficiency === 'Moderate' ? 'rgba(249, 226, 175, 0.2)' : 'rgba(243, 139, 168, 0.2)', color: effColor }}>
                            {efficiency}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, background: s.agent_state === 'RUNNING' ? 'rgba(166, 227, 161, 0.2)' : 'rgba(137, 180, 250, 0.2)', color: s.agent_state === 'RUNNING' ? '#a6e3a1' : '#89b4fa' }}>
                            {s.agent_state}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--subtext)', fontSize: 12 }}>
                          {s.started_at ? s.started_at.slice(0, 16).replace('T', ' ') : '--'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* TAB: MODELS (Phase 6C) */}
      {activeTab === 'models' && (
        <div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Model Usage Distribution</div>
            <div style={{ height: 240, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={models}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
                  <XAxis dataKey="model" stroke="#a6adc8" fontSize={11} />
                  <YAxis stroke="#a6adc8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#181825', borderColor: '#313244', color: '#fff' }} />
                  <Bar dataKey="requestCount" fill="#cba6f7" name="Sessions / Requests" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Model Performance & Token Consumption</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'var(--subtext)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Model</th>
                  <th style={{ padding: '8px 10px' }}>Requests</th>
                  <th style={{ padding: '8px 10px' }}>Share %</th>
                  <th style={{ padding: '8px 10px' }}>Input Tokens</th>
                  <th style={{ padding: '8px 10px' }}>Output Tokens</th>
                  <th style={{ padding: '8px 10px' }}>Total Tokens</th>
                  <th style={{ padding: '8px 10px' }}>Avg Cost/Request</th>
                </tr>
              </thead>
              <tbody>
                {models.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: 'var(--subtext)' }}>No model usage recorded yet</td></tr>
                ) : (
                  models.map((m: any) => {
                    const totalM = (m.inputTokens || 0) + (m.outputTokens || 0);
                    const avgCost = m.requestCount > 0 ? Math.round(totalM / m.requestCount) : 0;
                    return (
                      <tr key={m.model} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#fff' }}>{m.model}</td>
                        <td style={{ padding: '8px 10px' }}>{m.requestCount}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 10, background: 'rgba(137, 180, 250, 0.2)', color: '#89b4fa' }}>
                            {m.percentage}%
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>{m.inputTokens.toLocaleString()}</td>
                        <td style={{ padding: '8px 10px' }}>{m.outputTokens.toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#89b4fa' }}>{totalM.toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', color: '#f9e2af' }}>{avgCost.toLocaleString()} tk</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: SOURCE COMPARISON (Phase 6B) */}
      {activeTab === 'sources' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { id: 'cli', label: 'Terminal CLI', icon: '📟', color: '#f9e2af', border: 'rgba(249, 226, 175, 0.3)' },
              { id: 'app', label: 'Desktop App', icon: '🖥️', color: '#a6e3a1', border: 'rgba(166, 227, 161, 0.3)' },
              { id: 'ide', label: 'VS Code IDE', icon: '💻', color: '#89b4fa', border: 'rgba(137, 180, 250, 0.3)' }
            ].map((src) => {
              const srcData = usageBySource.find((u: any) => u.source === src.id) || { promptCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
              const srcSessions = sessions.filter((s: any) => s.source === src.id);
              const avgScore = prompts.filter((p: any) => p.source === src.id).length > 0
                ? Math.round(prompts.filter((p: any) => p.source === src.id).reduce((sum: number, p: any) => sum + p.prompt_score, 0) / prompts.filter((p: any) => p.source === src.id).length)
                : 0;

              return (
                <div key={src.id} style={{ background: 'var(--card-bg)', border: `1px solid ${src.border}`, borderRadius: 8, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: src.color }}>{src.icon} {src.label}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bg)', color: 'var(--subtext)' }}>
                      {srcSessions.length} sessions
                    </span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                    {(srcData.totalTokens || 0).toLocaleString()} <span style={{ fontSize: 13, color: 'var(--subtext)', fontWeight: 400 }}>tokens</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 14 }}>
                    {srcData.promptCount || 0} user prompts • {srcSessions.length} total sessions
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--subtext)' }}>Avg Prompt Score:</span>
                      <strong style={{ color: src.color }}>{avgScore}/100</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--subtext)' }}>Input Tokens:</span>
                      <span>{(srcData.inputTokens || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--subtext)' }}>AI Output Tokens:</span>
                      <span>{(srcData.outputTokens || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Token Distribution Across Sources</div>
            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageBySource.map((s: any) => ({
                  source: s.source === 'ide' ? 'VS Code IDE' : s.source === 'app' ? 'Desktop App' : 'Terminal CLI',
                  inputTokens: s.inputTokens,
                  outputTokens: s.outputTokens,
                  totalTokens: s.totalTokens
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
                  <XAxis dataKey="source" stroke="#a6adc8" fontSize={12} />
                  <YAxis stroke="#a6adc8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#181825', borderColor: '#313244', color: '#fff' }} />
                  <Legend />
                  <Bar dataKey="inputTokens" fill="#89b4fa" name="Input Tokens" />
                  <Bar dataKey="outputTokens" fill="#a6e3a1" name="Output Tokens" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PERSONAL PROFILE (Phase 5) */}
      {activeTab === 'profile' && profile && (
        <div>
          {/* Improvement Trajectory Banner */}
          {profile.improvementTrajectory && (
            <div style={{ background: 'rgba(166, 227, 161, 0.1)', border: '1px solid rgba(166, 227, 161, 0.3)', borderRadius: 8, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>🚀</span>
              <div>
                <strong style={{ color: '#a6e3a1', fontSize: 14 }}>Improvement Trajectory:</strong>
                <div style={{ fontSize: 13, color: '#fff' }}>{profile.improvementTrajectory}</div>
              </div>
            </div>
          )}

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Total Analyzed Prompts</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '6px 0' }}>{profile.totalPrompts}</div>
            </div>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Avg Prompt Length</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '6px 0' }}>{profile.avgPromptLength} chars</div>
            </div>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Avg Prompt Quality</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f9e2af', margin: '6px 0' }}>{profile.avgPromptScore}/100</div>
            </div>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Total Sessions</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#89b4fa', margin: '6px 0' }}>{profile.totalSessions}</div>
            </div>
          </div>

          {/* 7 Dimension Averages Breakdown */}
          {profile.dimensionAverages && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                Prompt Quality Dimension Breakdown (7 Transparent Criteria)
              </div>
              <p style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 16 }}>
                Average performance across all historical prompts against evaluation criteria
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Clarity (Action Verbs & Intent)', score: profile.dimensionAverages.clarity, max: 20 },
                  { label: 'Context (Files, Code, Tech)', score: profile.dimensionAverages.context, max: 15 },
                  { label: 'Requirements (Lists & Structure)', score: profile.dimensionAverages.requirements, max: 15 },
                  { label: 'Constraints (Limits & Non-Goals)', score: profile.dimensionAverages.constraints, max: 15 },
                  { label: 'Expected Output (Format Spec)', score: profile.dimensionAverages.expectedOutput, max: 15 },
                  { label: 'Acceptance Criteria (Tests)', score: profile.dimensionAverages.acceptanceCriteria, max: 10 },
                  { label: 'Scope (Explicit Boundaries)', score: profile.dimensionAverages.scope, max: 10 }
                ].map((dim) => {
                  const pct = Math.round((dim.score / dim.max) * 100);
                  const color = pct >= 75 ? '#a6e3a1' : pct >= 50 ? '#f9e2af' : '#f38ba8';
                  return (
                    <div key={dim.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                        <span style={{ fontWeight: 500, color: '#fff' }}>{dim.label}</span>
                        <strong style={{ color }}>{dim.score} / {dim.max}</strong>
                      </div>
                      <div style={{ background: 'var(--border)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 4 }}>{pct}% benchmark score</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prompt Score Trend LineChart (Phase 5C) */}
          {profile.scoreTrend && profile.scoreTrend.length > 0 && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                Prompt Quality Trajectory Over Time
              </div>
              <p style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 16 }}>
                Daily average prompt score trend demonstrating quality evolution
              </p>
              <div style={{ height: 220, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profile.scoreTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
                    <XAxis dataKey="date" stroke="#a6adc8" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#a6adc8" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#181825', borderColor: '#313244', color: '#fff' }} />
                    <Line type="monotone" dataKey="avgScore" stroke="#a6e3a1" strokeWidth={3} dot={{ r: 4 }} name="Avg Score" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Best Prompts (Reusable Templates) & Needs Improvement (Phase 5B) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 24 }}>
            {/* Best Prompts */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', marginBottom: 12 }}>
                ⭐ Your Best Prompts (Reusable Templates)
              </div>
              {(profile.bestPrompts || []).length === 0 ? (
                <p style={{ color: 'var(--subtext)', fontSize: 13 }}>Prompts scoring 75+ will be saved here as templates.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(profile.bestPrompts || []).map((p: any, idx: number) => (
                    <div key={idx} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'rgba(166, 227, 161, 0.2)', color: '#a6e3a1', fontWeight: 600 }}>
                          Score: {p.prompt_score}/100 • {p.category}
                        </span>
                        <button
                          onClick={() => {
                            if (vscode) vscode.postMessage({ command: 'copyToClipboard', text: p.prompt });
                          }}
                          style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--subtext)', padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}
                        >
                          Copy Template
                        </button>
                      </div>
                      <div style={{ fontSize: 12, color: '#fff', maxHeight: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.prompt}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Needs Improvement */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)', marginBottom: 12 }}>
                ⚠️ Needs Improvement (Actionable Suggestions)
              </div>
              {(profile.needsImprovementPrompts || []).length === 0 ? (
                <p style={{ color: 'var(--subtext)', fontSize: 13 }}>No low-scoring prompts found — great job!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(profile.needsImprovementPrompts || []).map((p: any, idx: number) => (
                    <div key={idx} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'rgba(243, 139, 168, 0.2)', color: '#f38ba8', fontWeight: 600 }}>
                          Score: {p.prompt_score}/100 • {p.category}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 6 }}>
                        "{p.prompt}"
                      </div>
                      <div style={{ fontSize: 11, color: '#f9e2af' }}>
                        👉 <strong>Missing:</strong> {p.missing_items || 'Specific technical context or criteria'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Strengths & Improvement Areas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', marginBottom: 12 }}>
                Identified Prompting Strengths
              </div>
              <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                {(profile.strengths || []).map((s: string, idx: number) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--warning)', marginBottom: 12 }}>
                High-Impact Coaching Suggestions
              </div>
              <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                {(profile.improvementAreas || []).map((ia: string, idx: number) => (
                  <li key={idx}>{ia}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB: WEEKLY REPORT */}
      {activeTab === 'report' && weeklyReport && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                📊 Weekly Antigravity Usage Intelligence Report
              </div>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>
                Data-driven performance review, token burn rate analysis, and actionable prompt coaching
              </div>
            </div>
            {weeklyReport.sourceBreakdown && (
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(249, 226, 175, 0.2)', color: '#f9e2af', fontWeight: 600 }}>
                  📟 CLI: {weeklyReport.sourceBreakdown.cliCount}
                </span>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(166, 227, 161, 0.2)', color: '#a6e3a1', fontWeight: 600 }}>
                  🖥️ App: {weeklyReport.sourceBreakdown.appCount}
                </span>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(137, 180, 250, 0.2)', color: '#89b4fa', fontWeight: 600 }}>
                  💻 IDE: {weeklyReport.sourceBreakdown.ideCount}
                </span>
              </div>
            )}
          </div>

          {/* Week-over-Week Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, margin: '20px 0' }}>
            <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Prompts Submitted</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '4px 0' }}>{weeklyReport.promptsCount}</div>
              {weeklyReport.weekOverWeek ? (
                <div style={{ fontSize: 12, color: weeklyReport.weekOverWeek.promptsDiff >= 0 ? '#a6e3a1' : '#f38ba8' }}>
                  {weeklyReport.weekOverWeek.promptsDiff >= 0 ? '↑' : '↓'} {Math.abs(weeklyReport.weekOverWeek.promptsDiff)}% vs previous week
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Current active window</div>
              )}
            </div>

            <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Tokens Consumed</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#89b4fa', margin: '4px 0' }}>{weeklyReport.tokensCount.toLocaleString()}</div>
              {weeklyReport.weekOverWeek ? (
                <div style={{ fontSize: 12, color: weeklyReport.weekOverWeek.tokensDiff >= 0 ? '#f9e2af' : '#a6e3a1' }}>
                  {weeklyReport.weekOverWeek.tokensDiff >= 0 ? '↑' : '↓'} {Math.abs(weeklyReport.weekOverWeek.tokensDiff)}% volume change
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Input + output tokens</div>
              )}
            </div>

            <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Avg Prompt Quality</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#a6e3a1', margin: '4px 0' }}>{weeklyReport.avgPromptScore}/100</div>
              {weeklyReport.weekOverWeek ? (
                <div style={{ fontSize: 12, color: weeklyReport.weekOverWeek.scoreDiff >= 0 ? '#a6e3a1' : '#f38ba8' }}>
                  {weeklyReport.weekOverWeek.scoreDiff >= 0 ? '+' : ''}{weeklyReport.weekOverWeek.scoreDiff} pts vs last week
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Across 7 transparent dimensions</div>
              )}
            </div>

            <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Conversations & Model</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#cba6f7', margin: '4px 0' }}>{weeklyReport.sessionsCount} sessions</div>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Top: {weeklyReport.mostUsedModel}</div>
            </div>
          </div>

          {/* Top 5 Most Expensive Prompts */}
          {weeklyReport.topExpensivePrompts && weeklyReport.topExpensivePrompts.length > 0 && (
            <div style={{ marginTop: 24, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
                🔥 Top 5 Most Token-Intensive Prompts This Week
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: 'var(--subtext)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px' }}>Source</th>
                    <th style={{ padding: '6px 8px' }}>Prompt</th>
                    <th style={{ padding: '6px 8px' }}>Category</th>
                    <th style={{ padding: '6px 8px' }}>Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyReport.topExpensivePrompts.map((ep: any, idx: number) => {
                    const srcBadge = ep.source === 'ide' ? '💻 IDE' : ep.source === 'app' ? '🖥️ App' : '📟 CLI';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255, 255, 255, 0.08)', fontSize: 11 }}>{srcBadge}</span>
                        </td>
                        <td style={{ padding: '6px 8px', maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fff' }}>
                          {ep.prompt}
                        </td>
                        <td style={{ padding: '6px 8px', color: 'var(--subtext)' }}>{ep.category}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 700, color: ep.tokens >= 30000 ? '#f38ba8' : '#f9e2af' }}>
                          {ep.tokens.toLocaleString()} tk
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Lowest Scoring Prompts & Actionable Suggestions */}
          {weeklyReport.lowestScoringPrompts && weeklyReport.lowestScoringPrompts.length > 0 && (
            <div style={{ marginTop: 20, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--warning)', marginBottom: 12 }}>
                ⚠️ Lowest-Scoring Prompts & Diagnostic Suggestions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {weeklyReport.lowestScoringPrompts.map((lp: any, idx: number) => (
                  <div key={idx} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>"{lp.prompt.slice(0, 100)}{lp.prompt.length > 100 ? '...' : ''}"</span>
                      <span style={{ padding: '2px 8px', borderRadius: 10, background: 'rgba(243, 139, 168, 0.2)', color: '#f38ba8', fontSize: 11, fontWeight: 700 }}>
                        Score: {lp.score}/100
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 4 }}>
                      <strong>Missing: </strong> {lp.missingItems}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--accent)' }}>
                      💡 <strong>How to improve: </strong> {lp.suggestion}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coaching Recommendations */}
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
              🎯 Data-Backed Recommendations for Next Week:
            </h4>
            <ul style={{ paddingLeft: 20, fontSize: 13, lineHeight: 1.9 }}>
              {weeklyReport.improvementAreas.map((ia: string, idx: number) => (
                <li key={idx} style={{ marginBottom: 6 }}>{ia}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
