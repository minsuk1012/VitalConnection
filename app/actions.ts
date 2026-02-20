'use server'

const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL

export async function submitInquiry(formData: {
  hospital: string
  name: string
  phone: string
  email: string
}) {
  console.log("Submitting inquiry:", formData)

  // Send to Slack
  if (!slackWebhookUrl) {
    console.error("SLACK_WEBHOOK_URL is not configured")
    throw new Error("Failed to send inquiry")
  }

  const slackMessage = {
    text: `🚀 *새로운 입점 문의가 도착했습니다!*`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚀 새로운 입점 문의",
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*병원명:*\n${formData.hospital}`
          },
          {
            type: "mrkdwn",
            text: `*담당자:*\n${formData.name}`
          },
          {
            type: "mrkdwn",
            text: `*연락처:*\n${formData.phone}`
          },
          {
            type: "mrkdwn",
            text: `*이메일:*\n${formData.email}`
          }
        ]
      },
      {
        "type": "actions",
        "elements": [
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "text": "관리자 페이지 바로가기",
              "emoji": true
            },
            "value": "click_me_123",
            "url": `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin`,
            "action_id": "actionId-0"
          }
        ]
      }
    ]
  }

  const response = await fetch(slackWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slackMessage),
  })

  if (!response.ok) {
    console.error("Slack Webhook Error:", await response.text())
    throw new Error("Failed to send inquiry")
  }

  return { success: true }
}
