export interface QuotaSnapshot {
  model: string;
  remainingPercentage: number | null;
  resetTimeIso: string | null;
  countdownDisplay: string;
  isEstimate: boolean;
  timestamp: string;
}

export class QuotaCollector {
  /**
   * Collect quota info.
   * If real quota data is not provided, returns nulls and 'Unavailable'.
   * NEVER returns fabricated 85% or fake 4-hour countdowns.
   */
  public static collect(
    modelName: string,
    reportedRemaining?: number | null,
    reportedResetIso?: string | null
  ): QuotaSnapshot {
    const now = new Date();
    const remaining = reportedRemaining !== undefined ? reportedRemaining : null;
    const resetIso = reportedResetIso || null;

    let countdownDisplay = 'Unavailable';
    if (resetIso) {
      const diffMs = Math.max(0, new Date(resetIso).getTime() - now.getTime());
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      countdownDisplay = `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
    }

    return {
      model: modelName,
      remainingPercentage: remaining,
      resetTimeIso: resetIso,
      countdownDisplay,
      isEstimate: false,
      timestamp: now.toISOString()
    };
  }
}
