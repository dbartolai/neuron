import resend
import os
from app.schemas.resend import EmailSend

resend.api_key=os.environ["RESEND_API_KEY"]

class ResendService:

    @staticmethod
    def send_email(body: EmailSend):

        params: resend.Emails.SendParams = {
            "from" : body.sender,
            "to" : [body.recipient],
            "subject" : body.subject,
            "html" : f"<div>{body.body}</div>"
        }

        email = resend.Emails.send(params)
        return email



    @staticmethod
    def send_invite_to_email(token: str, recipient: str):

        token_url = f"http://neuron.ceria.io/instructor/activate?token={token}"

        body = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <title>Neuron Instructor Invitation</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #111827; line-height: 1.5; padding: 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td>
                    <h2 style="margin: 0 0 16px 0;">You’ve been invited to Neuron</h2>

                    <p style="margin: 0 0 16px 0;">
                        You’ve been granted instructor access to <strong>Neuron</strong>, an instructor-controlled AI development environment designed for programming courses.
                    </p>

                    <p style="margin: 0 0 24px 0;">
                        Click the button below to activate your instructor account. You’ll be asked to sign in or create an account using this email address.
                    </p>

                    <p style="margin: 0 0 32px 0;">
                        <a
                        href="{token_url}"
                        style="
                            display: inline-block;
                            padding: 12px 20px;
                            background-color: #111827;
                            color: #ffffff;
                            text-decoration: none;
                            border-radius: 6px;
                            font-weight: 500;
                        "
                        >
                        Activate Instructor Access
                        </a>
                    </p>

                    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">
                        This invitation link is unique to you and will expire. If you did not expect this invite, you can safely ignore this email.
                    </p>

                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                        Drake Bartolai<br />
                        Co-Founder, Neuron
                    </p>
                    </td>
                </tr>
                </table>
            </body>
            </html>
        """


        params: resend.Emails.SendParams = {
            "from" : "Neuron <neuron@invites.ceria.io>",
            "to" : [recipient],
            "subject" : "You're Invited to Neuron!",
            "html" : body
        }

        email = resend.Emails.send(params)
        return email

    @staticmethod
    def send_outreach_notification(email: str, role: str | None, notes: str | None):
        """
        Send an email notification to drakeab2@illinois.edu when a new outreach submission is received.
        """
        from datetime import datetime
        
        role_display = role if role else "Not specified"
        notes_display = notes if notes else "No notes provided"
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        body = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <title>New Outreach Submission - Neuron</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #111827; line-height: 1.5; padding: 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td>
                    <h2 style="margin: 0 0 16px 0;">New Outreach Submission</h2>

                    <p style="margin: 0 0 16px 0;">
                        A new outreach submission has been received on the Neuron landing page.
                    </p>

                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 24px 0;">
                        <p style="margin: 0 0 8px 0;"><strong>Email:</strong> {email}</p>
                        <p style="margin: 0 0 8px 0;"><strong>Interest:</strong> {role_display}</p>
                        <p style="margin: 0 0 8px 0;"><strong>Notes:</strong> {notes_display}</p>
                        <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Submitted:</strong> {timestamp}</p>
                    </div>

                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                        This submission has been logged in the outreach database.
                    </p>
                    </td>
                </tr>
                </table>
            </body>
            </html>
        """

        params: resend.Emails.SendParams = {
            "from": "Neuron <neuron@invites.ceria.io>",
            "to": ["drakeab2@illinois.edu"],
            "subject": f"New Outreach Submission: {email}",
            "html": body
        }

        email_result = resend.Emails.send(params)
        return email_result
