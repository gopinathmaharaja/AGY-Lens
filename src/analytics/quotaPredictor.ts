import { QuotaRecord, UsageRecord } from '../types/usage';

export interface QuotaForecast {
  estimatedUsageUntilReset: number;
  hourlyBurnRate: number; // tokens/hour
  estimatedHoursRemaining: number;
  confidence: 'Low' | 'Medium' | 'High';
  isEstimate: boolean;
  advice: string;
}

export class QuotaPredictor {
  public static forecast(recentUsage: UsageRecord[], latestQuota?: QuotaRecord): QuotaForecast {
    if (!recentUsage || recentUsage.length === 0) {
      return {
        estimatedUsageUntilReset: 0,
        hourlyBurnRate: 0,
        estimatedHoursRemaining: 0,
        confidence: 'Low',
        isEstimate: true,
        advice: 'Insufficient usage history to project burn rate.'
      };
    }

    const totalTokens = recentUsage.reduce((sum, u) => sum + (u.input_tokens || 0) + (u.output_tokens || 0), 0);
    const hourlyBurnRate = Math.round(totalTokens / Math.max(1, recentUsage.length / 5));

    const hasRealQuota = latestQuota?.remaining !== null && latestQuota?.remaining !== undefined;
    const currentQuota = hasRealQuota ? latestQuota!.remaining : null;

    let advice = 'Tracking token consumption across all sessions. Antigravity does not expose quota limits locally.';
    let hoursRemaining = 0;

    if (currentQuota !== null) {
      hoursRemaining = Math.max(1, Math.round(currentQuota / Math.max(1, hourlyBurnRate / 10000)));
      if (currentQuota < 20) {
        advice = 'Quota is low. Consider using faster/smaller models or shorter prompts until reset.';
      } else if (currentQuota < 40) {
        advice = 'Monitor usage frequency. Approaching peak consumption.';
      } else {
        advice = 'Usage is within normal operating limits.';
      }
    }

    let confidence: 'Low' | 'Medium' | 'High' = 'Low';
    if (recentUsage.length > 50) confidence = 'High';
    else if (recentUsage.length > 15) confidence = 'Medium';

    return {
      estimatedUsageUntilReset: Math.min(100, Math.round(hourlyBurnRate / 500)),
      hourlyBurnRate,
      estimatedHoursRemaining: hoursRemaining,
      confidence,
      isEstimate: true,
      advice
    };
  }
}
