/**
 * Google Workspace APIs Integration Utilities for CIVICTAS
 */

export interface CalendarEventParams {
  summary: string;
  description: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  createMeet?: boolean;
}

export interface WorkspaceExportResult {
  success: boolean;
  message: string;
  url?: string;
}

/**
 * 1. Gmail API: Send an email on behalf of the user
 */
export async function sendGmailEmail(
  token: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<WorkspaceExportResult> {
  try {
    const emailParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody
    ];
    const emailString = emailParts.join('\r\n');
    const base64Encoded = btoa(unescape(encodeURIComponent(emailString)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: base64Encoded })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gmail API error: ${errText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: `Email successfully sent to ${to}! (Message ID: ${data.id})`
    };
  } catch (error: any) {
    console.error('sendGmailEmail error:', error);
    return { success: false, message: error.message || 'Failed to send email via Gmail' };
  }
}

/**
 * 2. Google Sheets API: Create a new spreadsheet and dump comparisons
 */
export async function exportSheetsSimulation(
  token: string,
  title: string,
  headers: string[],
  rows: Array<Array<string | number>>
): Promise<WorkspaceExportResult> {
  try {
    // Step 1: Create a new spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title: title }
      })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Spreadsheet creation failed: ${errText}`);
    }

    const sheetData = await createRes.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const spreadsheetUrl = sheetData.spreadsheetUrl;

    // Step 2: Push cell values
    const values = [headers, ...rows];
    const range = 'Sheet1!A1';

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Failed to write values into Sheet: ${errText}`);
    }

    return {
      success: true,
      message: 'Spreadsheet simulation outcomes created successfully!',
      url: spreadsheetUrl
    };
  } catch (error: any) {
    console.error('exportSheetsSimulation error:', error);
    return { success: false, message: error.message || 'Failed to export to Google Sheets' };
  }
}

/**
 * 3. Google Calendar & Google Meet API
 * Creates a Calendar Event and auto-attaches a Google Meet invitation link
 */
export async function createCalendarMeeting(
  token: string,
  params: CalendarEventParams
): Promise<WorkspaceExportResult> {
  try {
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1';
    
    const body: any = {
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.startTime, timeZone: 'UTC' },
      end: { dateTime: params.endTime, timeZone: 'UTC' }
    };

    if (params.createMeet) {
      body.conferenceData = {
        createRequest: {
          requestId: `civitas-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Calendar API error: ${errText}`);
    }

    const data = await response.json();
    const eventUrl = data.htmlLink;
    let meetUrl = '';

    if (data.conferenceData?.entryPoints) {
      const meetEntry = data.conferenceData.entryPoints.find((ep: any) => ep.entryPointType === 'video');
      if (meetEntry) {
        meetUrl = meetEntry.uri;
      }
    }

    return {
      success: true,
      message: params.createMeet && meetUrl 
        ? `Event scheduled with Google Meet link: ${meetUrl}`
        : 'Google Calendar event scheduled successfully!',
      url: meetUrl || eventUrl
    };
  } catch (error: any) {
    console.error('createCalendarMeeting error:', error);
    return { success: false, message: error.message || 'Failed to schedule Calendar event' };
  }
}

/**
 * 4. Google Drive API: Upload a decision record or brief direct as a file
 */
export async function uploadDriveFile(
  token: string,
  fileName: string,
  content: string
): Promise<WorkspaceExportResult> {
  try {
    // Step 1: Create file metadata
    const metadataRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: fileName,
        mimeType: 'text/plain'
      })
    });

    if (!metadataRes.ok) {
      const errText = await metadataRes.text();
      throw new Error(`Drive metadata creation failed: ${errText}`);
    }

    const fileMeta = await metadataRes.json();
    const fileId = fileMeta.id;

    // Step 2: Upload content (using media upload PATCH update)
    const mediaRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain'
        },
        body: content
      }
    );

    if (!mediaRes.ok) {
      const errText = await mediaRes.text();
      throw new Error(`Drive media upload failed: ${errText}`);
    }

    // Return viewable web link
    const viewUrl = `https://drive.google.com/open?id=${fileId}`;
    return {
      success: true,
      message: `Brief uploaded successfully: '${fileName}'`,
      url: viewUrl
    };
  } catch (error: any) {
    console.error('uploadDriveFile error:', error);
    return { success: false, message: error.message || 'Failed to upload to Google Drive' };
  }
}

/**
 * 5. Google Tasks API: Create action items from audits
 */
export async function createTaskItem(
  token: string,
  title: string,
  notes: string,
  dueDate?: string
): Promise<WorkspaceExportResult> {
  try {
    const body: any = {
      title,
      notes,
    };
    if (dueDate) {
      body.due = dueDate; // Expecting ISO-8601 format (yyyy-mm-ddThh:mm:ss.xxZ)
    }

    const response = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Tasks API error: ${errText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: `Task successfully synced: '${title}'`,
      url: `https://tasks.google.com/`
    };
  } catch (error: any) {
    console.error('createTaskItem error:', error);
    return { success: false, message: error.message || 'Failed to sync Google Task' };
  }
}

/**
 * 6. Google Chat API: Send updates to channels
 */
export async function listChatSpaces(token: string): Promise<Array<{ name: string; displayName: string }>> {
  try {
    const response = await fetch('https://chat.googleapis.com/v1/spaces', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.spaces || [];
  } catch (e) {
    console.error('Error fetching chat spaces:', e);
    return [];
  }
}

export async function sendChatMessage(
  token: string,
  spaceName: string, // format: "spaces/XXXXXXXX"
  text: string
): Promise<WorkspaceExportResult> {
  try {
    const response = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Chat API error: ${errText}`);
    }

    return {
      success: true,
      message: 'Notification posted to Google Chat space!'
    };
  } catch (error: any) {
    console.error('sendChatMessage error:', error);
    return { success: false, message: error.message || 'Failed to post to Google Chat' };
  }
}
