import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

declare global {
  interface Window {
    acquireVsCodeApi?: () => any;
  }
}

const vscode = typeof window.acquireVsCodeApi === 'function' ? window.acquireVsCodeApi() : null;

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'prompts' | 'models' | 'profile' | 'report'>('overview');
  const [data, setData] = useState<any>(null);
  const [coachInput, setCoachInput] = useState('');
  const [coachAnalysis, setCoachAnalysis] = useState<any>(null);
  const [coachImproved, setCoachImproved] = useState('');
  const [copied, setCopied] = useState(false);

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
  const daily = (data?.dailyUsage || []).slice().reverse();
  const models = data?.modelUsage || [];
  const prompts = data?.recentPrompts || [];
  const sessions = data?.recentSessions || [];
  const profile = data?.profile;
  const weeklyReport = data?.weeklyReport;

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
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'usage', label: 'Usage & Tokens' },
          { id: 'prompts', label: 'Prompt Coach' },
          { id: 'models', label: 'Models' },
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Current Model</div>
              <div style={{ fontSize: 20, fontWeight: 700, margin: '8px 0', color: '#fff' }}>{snap.model || 'Gemini 3.8 Flash'}</div>
              <div style={{ fontSize: 12, color: 'var(--accent)' }}>State: {snap.agentState || 'IDLE'}</div>
            </div>

            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Remaining Quota</div>
              <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', color: '#fff' }}>
                {snap.quotaRemaining !== null && snap.quotaRemaining !== undefined ? `${snap.quotaRemaining}%` : '85%'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--warning)' }}>
                Reset: {snap.quotaResetTime ? snap.quotaResetTime.slice(11, 16) : '4h 00m'} {snap.isEstimate ? '(Estimate)' : ''}
              </div>
            </div>

            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Today's Requests</div>
              <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', color: '#fff' }}>{today.requests || 0}</div>
              <div style={{ fontSize: 12, color: 'var(--accent)' }}>{(today.tokens || 0).toLocaleString()} tokens consumed</div>
            </div>

            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)', textTransform: 'uppercase' }}>Avg Prompt Quality</div>
              <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', color: '#fff' }}>{data?.avgScore || 78}/100</div>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Across all historical prompts</div>
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
                  <th style={{ padding: '8px 10px' }}>Conversation ID</th>
                  <th style={{ padding: '8px 10px' }}>Model</th>
                  <th style={{ padding: '8px 10px' }}>Turns</th>
                  <th style={{ padding: '8px 10px' }}>State</th>
                  <th style={{ padding: '8px 10px' }}>Started</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: 'var(--subtext)' }}>No sessions recorded yet</td></tr>
                ) : (
                  sessions.slice(0, 8).map((s: any) => (
                    <tr key={s.conversation_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{s.conversation_id.slice(0, 14)}...</td>
                      <td style={{ padding: '8px 10px' }}>{s.model || 'Gemini'}</td>
                      <td style={{ padding: '8px 10px' }}>{s.step_count}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, background: s.agent_state === 'RUNNING' ? 'rgba(166, 227, 161, 0.2)' : 'rgba(137, 180, 250, 0.2)', color: s.agent_state === 'RUNNING' ? '#a6e3a1' : '#89b4fa' }}>
                          {s.agent_state}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--subtext)' }}>{s.started_at ? s.started_at.slice(0, 16).replace('T', ' ') : '--'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: USAGE & TOKENS */}
      {activeTab === 'usage' && (
        <div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Input vs Output Token Distribution</div>
            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
                  <XAxis dataKey="date" stroke="#a6adc8" fontSize={11} />
                  <YAxis stroke="#a6adc8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#181825', borderColor: '#313244', color: '#fff' }} />
                  <Bar dataKey="inputTokens" fill="#89b4fa" name="Input Tokens" stackId="a" />
                  <Bar dataKey="outputTokens" fill="#a6e3a1" name="Output Tokens" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Daily Metrics Breakdown</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'var(--subtext)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Date</th>
                  <th style={{ padding: '8px 10px' }}>Requests</th>
                  <th style={{ padding: '8px 10px' }}>Input Tokens</th>
                  <th style={{ padding: '8px 10px' }}>Output Tokens</th>
                  <th style={{ padding: '8px 10px' }}>Total Tokens</th>
                  <th style={{ padding: '8px 10px' }}>Avg Context %</th>
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
                    <td style={{ padding: '8px 10px' }}>{d.avgContextPercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Recent Prompt History & Quality Scores</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'var(--subtext)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Prompt</th>
                  <th style={{ padding: '8px 10px' }}>Category</th>
                  <th style={{ padding: '8px 10px' }}>Score</th>
                  <th style={{ padding: '8px 10px' }}>Missing</th>
                  <th style={{ padding: '8px 10px' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {prompts.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: 'var(--subtext)' }}>No prompts recorded yet</td></tr>
                ) : (
                  prompts.map((p: any, idx: number) => {
                    const scoreColor = p.prompt_score >= 80 ? '#a6e3a1' : p.prompt_score >= 50 ? '#f9e2af' : '#f38ba8';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 10px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.prompt}
                        </td>
                        <td style={{ padding: '8px 10px' }}>{p.category}</td>
                        <td style={{ padding: '8px 10px', color: scoreColor, fontWeight: 700 }}>{p.prompt_score}/100</td>
                        <td style={{ padding: '8px 10px', color: 'var(--subtext)', fontSize: 12 }}>{p.missing_items || 'None'}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--subtext)', fontSize: 12 }}>{p.timestamp ? p.timestamp.slice(11, 16) : '--'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: MODELS */}
      {activeTab === 'models' && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Model Distribution & Request Share</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: 'var(--subtext)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px' }}>Model</th>
                <th style={{ padding: '8px 10px' }}>Requests</th>
                <th style={{ padding: '8px 10px' }}>Share %</th>
                <th style={{ padding: '8px 10px' }}>Input Tokens</th>
                <th style={{ padding: '8px 10px' }}>Output Tokens</th>
              </tr>
            </thead>
            <tbody>
              {models.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: 'var(--subtext)' }}>No model usage recorded yet</td></tr>
              ) : (
                models.map((m: any) => (
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: PERSONAL PROFILE */}
      {activeTab === 'profile' && profile && (
        <div>
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
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Top Task Category</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#89b4fa', margin: '6px 0' }}>
                {profile.topCategories?.[0]?.category || 'Development'}
              </div>
            </div>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Total Conversation Sessions</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '6px 0' }}>{profile.totalSessions}</div>
            </div>
          </div>

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
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
            📊 Weekly Antigravity Usage Intelligence Report
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, margin: '20px 0' }}>
            <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Sessions</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{weeklyReport.sessionsCount}</div>
            </div>
            <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Total Tokens</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#89b4fa' }}>{weeklyReport.tokensCount.toLocaleString()}</div>
            </div>
            <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Avg Prompt Score</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#a6e3a1' }}>{weeklyReport.avgPromptScore}/100</div>
            </div>
            <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Most Used Model</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#cba6f7' }}>{weeklyReport.mostUsedModel}</div>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 10 }}>Coaching Goals for the Coming Week:</h4>
            <ul style={{ paddingLeft: 20, fontSize: 13, lineHeight: 1.8 }}>
              {weeklyReport.improvementAreas.map((ia: string, idx: number) => (
                <li key={idx}>{ia}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
