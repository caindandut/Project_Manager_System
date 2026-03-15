export const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  CHAT_SEND: 'chat:send',
  CHAT_TYPING: 'chat:typing',
  CHAT_READ: 'chat:read',

  NOTIFICATION_NEW: 'notification:new',

  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',

  COMMENT_NEW: 'comment:new',
  TASK_UPDATED: 'task:updated',
} as const;

export type SocketEventKey = keyof typeof SOCKET_EVENTS;
export type SocketEventValue = (typeof SOCKET_EVENTS)[SocketEventKey];

