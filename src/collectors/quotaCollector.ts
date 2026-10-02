export interface QuotaSnapshot {
  model: string;
  remainingPercentage: number | null;
  resetTimeIso: string | null;
  countdownDisplay: string;
  isEstimate: boolean;
  timestamp: string;
}

export class QuotaCollector {
  public static collect(modelName: string, reportedRemaining?: number | null, reportedResetIso?: string | null): QuotaSnapshot {
    const now = new Date();
    // Default rolling 24h reset window if not explicitly given by Antigravity API
    let resetIso = reportedResetIso || null;
    let remaining = reportedRemaining ?? null;
    let isEstimate = false;

    if (remaining === null || remaining === undefined) {
      // Heuristic default for display when Antigravity doesn't broadcast explicit %
      remaining = 85;
      isEstimate = true;
    }

    if (!resetIso) {
      const tomorrow = new Date(now);
      tomorrow.setHours(tomorrow.getHours() + 4);
      resetIso = tomorrow.toISOString();
      isEstimate = true;
    }

    const diffMs = Math.max(0, new Date(resetIso).getTime() - now.getTime());
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const countdownDisplay = `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;

    return {
      model: modelName,
      remainingPercentage: remaining,
      resetTimeIso: resetIso,
      countdownDisplay,
      isEstimate,
      timestamp: now.toISOString()
    };
  }
}
