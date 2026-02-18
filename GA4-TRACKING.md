# GA4 Tracking for Civic Action Box

## How It Works

Every link in the generated civic action box HTML includes UTM parameters so you can track which items readers actually click in Google Analytics.

### UTM Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `utm_source` | `planet_detroit` | Identifies traffic as coming from PD's own content |
| `utm_medium` | `civic_action_box` | Distinguishes from newsletter, social, etc. |
| `utm_campaign` | `civic_action` | Groups all civic action box clicks together |
| `utm_content` | `meeting_AGENCY`, `comment_AGENCY`, `org_NAME`, `action_TITLE`, `official_NAME`, `calendar_google`, `calendar_outlook` | Identifies the specific item clicked |

### Example

A link to an EGLE meeting agenda becomes:
```
https://michigan.gov/egle/...?utm_source=planet_detroit&utm_medium=civic_action_box&utm_campaign=civic_action&utm_content=meeting_egle
```

---

## Setting Up GA4 Reports

### Prerequisites
- GA4 property set up for planetdetroit.org
- You need Editor or Analyst access to the GA4 property

### Step 1: Find UTM Data in Standard Reports

1. Go to [analytics.google.com](https://analytics.google.com)
2. Select your Planet Detroit property
3. Navigate to **Reports > Acquisition > Traffic acquisition**
4. In the primary dimension dropdown, select **Session source/medium**
5. Filter for `planet_detroit / civic_action_box`
6. Click the **+** button to add a secondary dimension: **Session manual ad content** (this is `utm_content`)

This shows you every civic action box click broken down by item type.

### Step 2: Create a Custom Exploration (Recommended)

For a dedicated civic action dashboard:

1. Go to **Explore** (left sidebar)
2. Click **Blank** to create a new exploration
3. Name it "Civic Action Box Performance"

**Add these dimensions** (click + next to Dimensions):
- Session source
- Session medium
- Session campaign
- Session manual ad content
- Page path (the article the box was on)
- Date

**Add these metrics** (click + next to Metrics):
- Sessions
- Event count
- Engagement rate
- Average engagement time per session

**Build the report:**
1. Drag **Session manual ad content** to Rows
2. Drag **Sessions** and **Event count** to Values
3. Add a filter: Session medium = `civic_action_box`
4. Optionally add **Page path** as a secondary row to see which articles drive the most civic engagement

### Step 3: Create a Segment for Civic Action Clickers

1. In any Exploration, click **+** next to Segments
2. Choose **Session segment**
3. Name it "Civic Action Box Clickers"
4. Add condition: Session medium exactly matches `civic_action_box`
5. Save

Now you can apply this segment to any report to compare civic-action-engaged readers vs. general readers (time on site, pages per session, return visits, etc.).

### Step 4: Set Up a Looker Studio Dashboard (Optional)

For a shareable, auto-updating dashboard:

1. Go to [lookerstudio.google.com](https://lookerstudio.google.com)
2. Create a new report, connect your GA4 property as a data source
3. Add a table with:
   - Dimension: Session manual ad content
   - Metrics: Sessions, Event count
   - Filter: Session medium = `civic_action_box`
4. Add a time series chart showing civic action clicks over time
5. Add a pie chart breaking down clicks by content type (meetings vs. orgs vs. actions)
6. Share the dashboard URL with the team

---

## Understanding utm_content Values

The `utm_content` parameter tells you exactly what was clicked:

| Prefix | Meaning | Example |
|--------|---------|---------|
| `meeting_` | Meeting link (details/agenda) | `meeting_egle`, `meeting_mpsc` |
| `comment_` | Comment period link | `comment_egle` |
| `org_` | Organization link | `org_sierra_club` |
| `action_` | Civic action link | `action_submit_comments` |
| `official_` | Official email link | `official_sam_singh` |
| `calendar_google` | Google Calendar add link | — |
| `calendar_outlook` | Outlook Calendar add link | — |

### Key Questions This Answers

- **Which civic actions do readers actually take?** Sort by Sessions on utm_content.
- **Do readers click meeting links or org links more?** Filter utm_content by prefix.
- **Which articles generate the most civic engagement?** Add Page path dimension.
- **Are readers adding meetings to their calendars?** Check `calendar_google` / `calendar_outlook` counts.
- **Do comment period deadlines drive urgency?** Compare click rates on soon-expiring vs. far-future periods.

---

## Notes

- UTM parameters are only added to **external links** in the generated HTML (not mailto: links or the Planet Detroit self-links).
- Links that already have query parameters get `&utm_...` appended; others get `?utm_...`.
- The `utm_content` slug is auto-generated from the item name (lowercased, spaces → underscores, truncated to 50 chars).
- Calendar links (Google/Outlook) get their own utm_content values so you can track calendar additions separately from meeting page clicks.
