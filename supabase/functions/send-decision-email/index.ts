import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOGO_URL =
  "rest.techbehemoths.com/storage/images/users/main/company-avatar-6861c1ff76573-x2.png";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmailTemplate({
  fullName,
  status,
  feedback,
}: {
  fullName: string;
  status: "accepted" | "rejected";
  feedback: string;
}) {
  const accepted = status === "accepted";

  const subject = accepted
    ? "Congratulations — You’ve Been Accepted to MoonDev"
    : "Update on Your MoonDev Internship Submission";

  const previewText = accepted
    ? "We’re excited to welcome you to the team."
    : "Thank you for your effort and time on this submission.";

  const intro = accepted
    ? `We’re happy to let you know that your internship submission was successful and you have been selected to move forward with MoonDev.`
    : `Thank you for taking the time to complete and submit your internship task. After careful review, we won’t be moving forward with your application at this stage.`;

  const closing = accepted
    ? `We were genuinely impressed by your work and we’re excited about the possibility of having you on the team.`
    : `We sincerely appreciate the time and effort you invested in your submission, and we wish you the very best in your next steps.`;

  const accentColor = accepted ? "#10b981" : "#ef4444";
  const badgeText = accepted ? "ACCEPTED" : "NOT SELECTED";
  const escapedName = escapeHtml(fullName);
  const escapedFeedback = escapeHtml(feedback).replaceAll("\n", "<br />");

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subject}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Arial, Helvetica, sans-serif; color:#0f172a;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
      ${previewText}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; background-color:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 10px 30px rgba(15,23,42,0.08);">

            <tr>
              <td style="background:linear-gradient(135deg, #0f172a 0%, #312e81 55%, #4f46e5 100%); padding:32px 36px; text-align:left;">
                <div style="display:inline-block; padding:8px 14px; border-radius:999px; background-color:rgba(255,255,255,0.12); color:#ffffff; font-size:12px; font-weight:700; letter-spacing:1.5px;">
                  MOONDEV INTERNSHIP
                </div>
                <h1 style="margin:18px 0 10px; color:#ffffff; font-size:28px; line-height:1.25;">
                  ${accepted ? "Final Decision" : "Submission Review Update"}
                </h1>
                <p style="margin:0; color:rgba(255,255,255,0.82); font-size:15px; line-height:1.7;">
                  ${previewText}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:36px;">
                <div style="display:inline-block; padding:7px 12px; border-radius:999px; background-color:${accentColor}15; color:${accentColor}; font-size:12px; font-weight:700; letter-spacing:1px; margin-bottom:18px;">
                  ${badgeText}
                </div>

                <p style="margin:0 0 16px; font-size:16px; line-height:1.8; color:#334155;">
                  Hello <strong style="color:#0f172a;">${escapedName}</strong>,
                </p>

                <p style="margin:0 0 16px; font-size:16px; line-height:1.8; color:#334155;">
                  ${intro}
                </p>

                <div style="margin:28px 0; border:1px solid #e2e8f0; border-radius:18px; background-color:#f8fafc; padding:22px;">
                  <p style="margin:0 0 10px; font-size:13px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:#64748b;">
                    Evaluator Feedback
                  </p>
                  <div style="font-size:15px; line-height:1.8; color:#1e293b;">
                    ${escapedFeedback}
                  </div>
                </div>

                ${
                  accepted
                    ? `
                <div style="margin:0 0 24px; border-left:4px solid #10b981; background:#ecfdf5; padding:16px 18px; border-radius:12px;">
                  <p style="margin:0; font-size:15px; line-height:1.8; color:#065f46;">
                    Welcome aboard. Please keep an eye on your email for any follow-up communication regarding next steps.
                  </p>
                </div>
                `
                    : `
                <div style="margin:0 0 24px; border-left:4px solid #ef4444; background:#fef2f2; padding:16px 18px; border-radius:12px;">
                  <p style="margin:0; font-size:15px; line-height:1.8; color:#991b1b;">
                    Although this was not the outcome you hoped for, we truly appreciate your interest in MoonDev and the work you put into your submission.
                  </p>
                </div>
                `
                }

                <p style="margin:0 0 24px; font-size:16px; line-height:1.8; color:#334155;">
                  ${closing}
                </p>

                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
                  <tr>
                    <td>
                      <a href="https://moondev.solutions/"
                         style="display:inline-block; background-color:#0f172a; color:#ffffff; text-decoration:none; padding:14px 22px; border-radius:14px; font-size:14px; font-weight:700;">
                        Visit MoonDev
                      </a>
                    </td>
                  </tr>
                </table>

                <hr style="border:none; border-top:1px solid #e2e8f0; margin:28px 0;" />

                <p style="margin:0; font-size:13px; line-height:1.8; color:#64748b;">
                  This message was sent by the MoonDev Internship Portal.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

  const text = accepted
    ? `Hello ${fullName},

Congratulations — your internship submission has been accepted.

Evaluator Feedback:
${feedback}

We were impressed by your work and are excited to welcome you to MoonDev.

MoonDev Internship`
    : `Hello ${fullName},

Thank you for completing the internship submission.

After careful review, we won’t be moving forward with your application at this stage.

Evaluator Feedback:
${feedback}

We appreciate your time and effort, and we wish you the best ahead.

MoonDev Internship`;

  return { html, text, subject };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, full_name, status, feedback } = await req.json();

    const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
    const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");
    const MAILJET_FROM_EMAIL = Deno.env.get("MAILJET_FROM_EMAIL");
    const MAILJET_FROM_NAME =
      Deno.env.get("MAILJET_FROM_NAME") || "MoonDev Internship";

    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY || !MAILJET_FROM_EMAIL) {
      return new Response(
        JSON.stringify({
          error:
            "Missing Mailjet secrets: MAILJET_API_KEY, MAILJET_SECRET_KEY, or MAILJET_FROM_EMAIL",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!email || !full_name || !status) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: email, full_name, or status",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const normalizedStatus =
      status === "accepted" ? "accepted" : "rejected";

    const safeFeedback =
      feedback && String(feedback).trim().length > 0
        ? String(feedback).trim()
        : normalizedStatus === "accepted"
        ? "Your submission stood out positively during our review."
        : "We appreciate the effort you put into your submission.";

    const { html, text, subject } = buildEmailTemplate({
      fullName: String(full_name),
      status: normalizedStatus,
      feedback: safeFeedback,
    });

    const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);

    const payload = {
      Messages: [
        {
          From: {
            Email: MAILJET_FROM_EMAIL,
            Name: MAILJET_FROM_NAME,
          },
          To: [
            {
              Email: String(email),
              Name: String(full_name),
            },
          ],
          Subject: subject,
          TextPart: text,
          HTMLPart: html,
        },
      ],
    };

    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });

    const resultText = await response.text();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "Mailjet request failed",
          details: resultText,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});