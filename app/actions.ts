'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl!, supabaseKey!)

export async function submitInquiry(formData: {
  hospital: string
  name: string
  phone: string
  email: string
}) {
  console.log("Submitting inquiry:", formData)
  
  // 1. Save to Supabase
  const { error: dbError } = await supabase
    .from('consultations')
    .insert([
      {
        hospital_name: formData.hospital,
        contact_name: formData.name,
        phone: formData.phone,
        email: formData.email,
      },
    ])

  if (dbError) {
    console.error("Supabase Error:", dbError)
    throw new Error("Failed to save inquiry")
  }

  // 2. Send to Slack
  if (slackWebhookUrl) {
    try {
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
      }
    } catch (slackError) {
      console.error("Failed to send Slack notification:", slackError)
      // We don't throw here to avoid failing the whole request if just Slack fails
    }
  }

  return { success: true }
}
