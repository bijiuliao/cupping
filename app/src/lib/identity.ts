const CLIENT_ID_KEY = 'cupping.clientId';
const USER_NAME_KEY = 'cupping.userName';

function uuid() {
  if ('randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * One "cupper identity" per browser TAB, not per browser — sessionStorage
 * (unlike localStorage) isn't shared between tabs, so opening the app in a
 * second tab on the same device correctly acts as a second participant
 * instead of silently colliding with the first tab's room membership.
 * It still survives a reload of that same tab.
 */
export function getClientId(): string {
  let id = sessionStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = uuid();
    sessionStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export function getUserName(): string {
  return localStorage.getItem(USER_NAME_KEY) || '';
}

export function setUserName(name: string) {
  localStorage.setItem(USER_NAME_KEY, name);
}
