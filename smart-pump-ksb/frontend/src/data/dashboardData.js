export const DUMMY_CONTROL_URL =
  'https://jsonplaceholder.typicode.com/posts';

export const FALLBACK_PUMPS = [
  { id: 1, name: 'Amarex', mode: 'Auto' },
  { id: 2, name: 'Amacan 1', mode: 'Manual' },
  { id: 3, name: 'Amacan 2', mode: 'Auto' },
  { id: 4, name: 'Amacan 3', mode: 'Auto' },
];

export const ALARM_ROWS = [
  {
    no: 1,
    alarmText: 'Pump 1 Run Feedback',
    date: '2025-12-09',
    time: '14:21:35',
    status: 'Active',
  },
  {
    no: 2,
    alarmText: 'Pump 2 Run Feedback',
    date: '2025-12-09',
    time: '14:19:02',
    status: 'Not Active',
  },
  {
    no: 3,
    alarmText: 'Valve MOV-01 Position OK',
    date: '2025-12-09',
    time: '14:15:47',
    status: 'Active',
  },
  {
    no: 4,
    alarmText: 'Tank Level Sensor Healthy',
    date: '2025-12-09',
    time: '14:10:11',
    status: 'Not Active',
  },
];

export const LEVEL_RANGES = [
  { label: 'High High Level', value: '4.50 m' },
  { label: 'High Level', value: '4.00 m' },
  { label: 'Start Level', value: '2.00 m' },
  { label: 'Stop Level', value: '1.00 m' },
  { label: 'Low Low Level', value: '0.30 m' },
];