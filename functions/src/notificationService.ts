import { NotificationPreferences } from './types';

export class NotificationService {
  /**
   * Send notification via Slack webhook
   */
  async sendSlackNotification(
    webhookUrl: string,
    message: {
      clientName: string;
      churnRisk: string;
      trajectory: string;
      dashboardUrl?: string;
    }
  ): Promise<boolean> {
    try {
      const slackMessage = {
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🔔 New Sentiment Analysis Ready',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Client:*\n${message.clientName}`,
              },
              {
                type: 'mrkdwn',
                text: `*Trajectory:*\n${message.trajectory}`,
              },
              {
                type: 'mrkdwn',
                text: `*Churn Risk:*\n${this.getRiskEmoji(message.churnRisk)} ${message.churnRisk}`,
              },
            ],
          },
        ],
      };

      if (message.dashboardUrl) {
        slackMessage.blocks.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Analysis',
                emoji: true,
              },
              url: message.dashboardUrl,
              style: this.getButtonStyle(message.churnRisk),
            },
          ],
        } as any);
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      return false;
    }
  }

  /**
   * Send email notification (placeholder for future implementation)
   */
  async sendEmailNotification(
    email: string,
    subject: string,
    body: string
  ): Promise<boolean> {
    // TODO: Implement with SendGrid or similar
    console.log(`Email notification to ${email}: ${subject}`);
    return true;
  }

  /**
   * Send notification based on preferences
   */
  async notifyPodLeader(
    preferences: NotificationPreferences,
    analysisData: {
      clientName: string;
      churnRisk: string;
      trajectory: string;
      dashboardUrl?: string;
    }
  ): Promise<void> {
    const notifications: Promise<boolean>[] = [];

    // Send Slack notification if configured
    if (preferences.slackWebhookUrl && preferences.notifyOnAutoAnalysis) {
      notifications.push(
        this.sendSlackNotification(preferences.slackWebhookUrl, analysisData)
      );
    }

    // Send email notification if configured
    if (preferences.podLeaderEmail && preferences.notifyOnAutoAnalysis) {
      const emailBody = `
        A new sentiment analysis is ready for ${analysisData.clientName}.

        Trajectory: ${analysisData.trajectory}
        Churn Risk: ${analysisData.churnRisk}

        ${analysisData.dashboardUrl ? `View the full analysis: ${analysisData.dashboardUrl}` : ''}
      `;

      notifications.push(
        this.sendEmailNotification(
          preferences.podLeaderEmail,
          `New Analysis Ready: ${analysisData.clientName}`,
          emailBody
        )
      );
    }

    await Promise.all(notifications);
  }

  /**
   * Get emoji for risk level
   */
  private getRiskEmoji(risk: string): string {
    switch (risk) {
      case 'Low':
        return '🟢';
      case 'Medium':
        return '🟡';
      case 'High':
        return '🟠';
      case 'Immediate':
        return '🔴';
      default:
        return '⚪';
    }
  }

  /**
   * Get button style for Slack based on risk
   */
  private getButtonStyle(risk: string): 'primary' | 'danger' | undefined {
    if (risk === 'High' || risk === 'Immediate') {
      return 'danger';
    }
    return 'primary';
  }
}
