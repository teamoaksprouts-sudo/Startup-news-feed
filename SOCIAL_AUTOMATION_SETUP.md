# Social Automation Setup

The social automation runs privately on Netlify and reads its controls from Google Sheets.

## Google Sheet

Create these two tabs.

### Social Settings

| Setting | Value |
|---|---|
| enabled | TRUE |
| linkedin | TRUE |
| instagram | TRUE |
| posting_days | Tuesday,Thursday |
| posting_time | 11:00 |
| keywords | startup,AI,funding,fintech |
| hashtags | #Startups,#AI,#Funding,#Fintech |

The time is interpreted in the SOCIAL_TIMEZONE environment variable. The default is Asia/Kolkata.

### Social Queue

| article_url | article_id | force_post | posted |
|---|---|---|---|
| | | FALSE | FALSE |

To force a particular article, put its exact article URL in article_url and set force_post to TRUE.

## Google Apps Script bridge

Open Extensions → Apps Script in the Google Sheet and paste google-sheets/social-automation.gs.

Change SCRIPT_SECRET to a long random secret.

Deploy → New deployment → Web app:
- Execute as: Me
- Who has access: Anyone

Copy the Web App URL.

## Netlify environment variables

Add these under Netlify Site configuration → Environment variables:

Required:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SOCIAL_SHEET_WEBAPP_URL
- SOCIAL_SHEET_SECRET
- SOCIAL_TIMEZONE = Asia/Kolkata

LinkedIn:
- LINKEDIN_ACCESS_TOKEN
- LINKEDIN_AUTHOR_URN
- LINKEDIN_VERSION = current LinkedIn API version

Instagram:
- INSTAGRAM_ACCESS_TOKEN
- INSTAGRAM_ACCOUNT_ID
- META_GRAPH_VERSION

The tokens stay server-side and are never placed in the public JavaScript.

## Scheduling

social-post runs hourly. It does not publish every hour. It checks the Google Sheet and only publishes when the current local day/time matches the Sheet.

Examples:
- Tuesday,Thursday → twice weekly
- Monday,Wednesday,Friday → three times weekly
- Tuesday → once weekly

## Selection logic

1. A forced article in Social Queue takes priority.
2. Otherwise the function looks at recent articles.
3. It filters them by the keywords in Social Settings.
4. It randomly selects one eligible article.
5. It skips platforms where that article has already been published.
6. It records the result in Supabase social_posts.
7. Failed platform posts can be retried on a later scheduled run.

## Important Instagram requirement

Instagram automated publishing requires an eligible Instagram Professional account and Meta API authorization. The article image must be publicly accessible over HTTPS because Meta fetches the image from its public URL.

## Important LinkedIn requirement

For a company page, the LinkedIn token must have the appropriate organization posting permission and the LINKEDIN_AUTHOR_URN must be the organization URN.