import type { PrivacySection } from '../../../types/admin'

export const useCases = [
  {
    title: 'Field Teams',
    desc: 'Track visits, travel, and attendance with location-aware check-ins.'
  },
  {
    title: 'Retail & Branch Ops',
    desc: 'Ensure shift compliance, break discipline, and daily closure visibility.'
  },
  {
    title: 'Sales & Leads',
    desc: 'Tie activities to leads and keep a verified visit history.'
  },
  {
    title: 'HR & Admin',
    desc: 'One place for approvals, exceptions, and compliance auditing.'
  }
] as const

export const features = [
  {
    title: 'Smart Attendance',
    desc: 'Clock-in/out with geo-tagging, auto shift hours, and late detection.'
  },
  {
    title: 'Activity Tracking',
    desc: 'Start/end activities, log visits, and capture route evidence.'
  },
  {
    title: 'Approvals & Exceptions',
    desc: 'Late arrivals and early leave requests with manager workflows.'
  },
  {
    title: 'Leave & Comp-off',
    desc: 'Apply leave, track status, and redeem comp-off automatically.'
  },
  {
    title: 'Distance Alerts',
    desc: 'Detect out-of-range movement to protect attendance integrity.'
  },
  {
    title: 'Auto Clock-out',
    desc: 'Prevents missing logs with configurable shift-end closure.'
  }
] as const

export const workflowSteps = [
  {
    title: 'Start Day',
    desc: 'Employee clocks in with location and begins the shift.'
  },
  {
    title: 'Track Work',
    desc: 'Activities, visits, and breaks are recorded in real time.'
  },
  {
    title: 'Review & Approve',
    desc: 'Managers handle exceptions and approvals within the app.'
  },
  {
    title: 'Close Day',
    desc: 'Clock-out completes hours and comp-off calculations.'
  }
] as const

export const privacySections: PrivacySection[] = [
  {
    title: 'Information We Collect',
    body: [
      'Fawnix collects account and workforce management information such as employee ID, name, phone number, email address, role, Todays Activity, activity records, leave requests, and device/session details needed to authenticate users and operate the service.',
      'Fawnix also collects and processes location data to support attendance and workforce features, including clock-in, clock-out, field visits, route tracking, geofence validation, working-hours pause and resume, and attendance-related notifications.',
      'If your organization enables meeting-notes features, Fawnix may collect audio recordings or uploaded audio files from meetings in order to generate transcripts, summaries, minutes of meeting, and action items.'
    ],
    bullets: []
  },
  {
    title: 'Meeting Audio and AI Processing',
    body: [
      'When a user records or uploads meeting audio through Fawnix, that audio is processed to generate meeting documentation such as transcript text, summaries, minutes of meeting, and important discussion points.',
      'This processing may use secure third-party AI service providers and cloud storage providers acting on behalf of your organization to analyze the audio and return the generated output.'
    ],
    bullets: [
      'Meeting audio recordings or uploaded audio files',
      'AI-generated transcripts, summaries, minutes of meeting, and key points',
      'Related metadata such as meeting title, file name, employee identifier, and generation timestamps'
    ]
  },
  {
    title: 'How We Use Meeting Audio',
    body: [
      'Meeting audio and AI-generated content are used only to support authorized workplace productivity and documentation features.'
    ],
    bullets: [
      'Generate transcripts and meeting summaries',
      'Prepare minutes of meeting and action items',
      'Store meeting records for organizational reference and reporting',
      'Improve operational efficiency, follow-up tracking, and internal documentation'
    ]
  },
  {
    title: 'Location Information',
    body: [
      'Our app collects and processes location data to support attendance and workforce management features such as clock-in/clock-out, field visits, route tracking, and geofence-based validation.'
    ],
    bullets: []
  },
  {
    title: 'What Location Data We Collect',
    body: [],
    bullets: [
      'Precise location data from your device (GPS and network-based)',
      'Clock-in and clock-out location coordinates',
      'Field visit locations and movement tracking',
      'Background location data (only when enabled) for attendance and geofence monitoring'
    ]
  },
  {
    title: 'How We Use Location Data',
    body: ['We use location data to:'],
    bullets: [
      'Verify attendance actions such as clock-in and clock-out',
      'Ensure employees are within the assigned work or geofence area',
      'Automatically pause or resume working hours based on location rules',
      'Enable field visit tracking and route history',
      'Improve accuracy, security, and compliance of Todays Activity'
    ]
  },
  {
    title: 'When Location Is Collected',
    body: ['Location data may be collected:'],
    bullets: [
      'While the app is actively in use',
      'In the background, only when attendance tracking or field visit tracking is enabled, and required permissions are granted'
    ]
  },
  {
    title: 'Background Location Usage',
    body: ['Background location is used strictly for attendance and workforce tracking features, such as:'],
    bullets: [
      'Ensuring accurate work hour tracking',
      'Validating presence within assigned locations',
      'Supporting continuous field visit tracking',
      'Users are informed and can control this permission at any time through device settings.'
    ]
  },
  {
    title: 'Sharing of Location Data',
    body: [
      'Location data is shared only with:',
      'We do not sell or use location data for advertising purposes.'
    ],
    bullets: [
      'Your organization (employer/admin)',
      'Secure backend services required to provide attendance, reporting, compliance, and AI meeting-notes features'
    ]
  },
  {
    title: 'Data Retention',
    body: ['Location data and meeting-notes data are retained only as long as necessary for:'],
    bullets: [
      'Todays Activity',
      'Field visit logs',
      'Meeting transcripts, summaries, and generated reports where enabled by your organization',
      'Organizational compliance and reporting',
      'Retention duration may vary based on organizational policies. Data is securely stored and protected.'
    ]
  },
  {
    title: 'User Choice and Consent',
    body: [
      'Users should record or upload meeting audio only when authorized by their organization and permitted by applicable law and internal policy.',
      'If meeting recording features are optional in your deployment, you may choose not to use those features. Device permissions such as microphone access can also be managed through system settings.'
    ],
    bullets: []
  },
  {
    title: 'Retention and Deletion',
    body: [
      'Users can request account deletion from the website section below. After a valid deletion request is completed, personal data is deleted or anonymized except where retention is required for legal, fraud-prevention, security, payroll, tax, or dispute-resolution purposes.'
    ],
    bullets: []
  },
  {
    title: 'User Control',
    body: ['Users can:'],
    bullets: [
      'Enable or disable location permissions at any time via device settings',
      'Stop background tracking by disabling permissions or logging out of the app'
    ]
  },
  {
    title: 'Security',
    body: [
      'Fawnix uses reasonable administrative, technical, and organizational measures to protect personal information from unauthorized access, disclosure, alteration, or loss. No method of storage or transmission is completely secure, so absolute security cannot be guaranteed.'
    ],
    bullets: []
  },
  {
    title: 'Contact',
    body: [
      'For privacy questions, data requests, or policy concerns, contact ACS Technologies Ltd.',
      'Email: chaitanya.k@acstechnologies.co.in',
      'Phone: 6304718795'
    ],
    bullets: []
  }
]
