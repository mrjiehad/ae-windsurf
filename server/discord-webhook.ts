interface OrderNotification {
  username: string;
  coins: number;
  paymentMethod: string;
  amount: string;
  orderId: string;
  timestamp: Date;
}

export async function sendDiscordOrderNotification(data: OrderNotification): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL not configured - skipping Discord notification');
    return;
  }

  try {
    const formattedTime = data.timestamp.toLocaleString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');

    const message = [
      '💎 **AECOIN STORE — PURCHASE LOG**',
      '────────────────────────────',
      `👤 **User**        ${data.username}`,
      `🪙 **Coin**        ${data.coins.toLocaleString()}`,
      `💳 **Payment**     ${data.paymentMethod}`,
      `💰 **Amount**      RM${parseFloat(data.amount).toFixed(2)}`,
      `🆔 **Order ID**    ${data.orderId}`,
      `⏱ **Time**        ${formattedTime} MYT`,
    ].join('\n');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
      }),
    });

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, response.statusText);
    } else {
      console.log('✓ Discord notification sent for order', data.orderId);
    }
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
  }
}
