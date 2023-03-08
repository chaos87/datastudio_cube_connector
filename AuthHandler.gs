
/**
 * Resets the auth service.
 */
function resetAuth() {
  getOAuthService().reset();
}
/**
 * Returns true if the auth service has access.
 * @return {boolean} True if the auth service has access.
 */
function isAuthValid() {
  return getOAuthService().hasAccess();
}

/**
 * Returns the configured OAuth Service.
 * @return {Service} The OAuth Service
 */
function getOAuthService() {
  return OAuth2.createService('cubeJwtSign')
      .setAuthorizationBaseUrl('...')
      .setTokenUrl('...')
      .setClientId('...')
      .setClientSecret('...')
      .setPropertyStore(PropertiesService.getUserProperties())
      .setCache(CacheService.getUserCache())
      .setLock(LockService.getUserLock())
      .setCallbackFunction('authCallback')
      .setParam('access_type', 'offline')
      .setParam('prompt', 'consent')
      .setScope('...');
};

/**
 * The OAuth callback.
 * @param {object} request The request data received from the OAuth flow.
 * @return {HtmlOutput} The HTML output to show to the user.
 */
function authCallback(request) {
  var authorized = getOAuthService().handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied. You can close this tab');
  }
};

/**
 * Gets the 3P authorization URL.
 * @return {string} The authorization URL.
 * @see https://developers.google.com/apps-script/reference/script/authorization-info
 */
function get3PAuthorizationUrls() {
  return getOAuthService().getAuthorizationUrl();
}