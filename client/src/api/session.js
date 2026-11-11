// Where the signed-in user's JWT lives.
// localStorage = "Remember me" on; sessionStorage = this browser session only.
export const getStoredToken = () =>
  localStorage.getItem('jklu_auth_token') || sessionStorage.getItem('jklu_auth_token');

export const clearStoredAuth = () => {
  ['jklu_auth_user', 'jklu_auth_token'].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};
