const url = require('url');
const path = require('path');
const environment = require('@medic/environment');
const isClientHuman = require('./is-client-human');
const logger = require('@medic/logger');
const MEDIC_BASIC_AUTH = 'Basic realm="Medic Web Services"';
const REQUEST_ID_HEADER = 'X-Request-Id';
const cookie = require('./services/cookie');
const {InvalidArgumentError} = require('@medic/cht-datasource');
const config = require('./config');

const wantsJSON = req => req.accepts(['text', 'json']) === 'json';

const writeJSON = (res, code, error, details) => {
  if (!res.headersSent) {
    res.status(code);
    res.type('json');
  }
  // using res.json would also automatically try to set the Content-Type header, which fails if headers are sent
  res.end(JSON.stringify({ code, error, details }));
};

const respond = (req, res, code, message, details) => {
  if (wantsJSON(req)) {
    return writeJSON(res, code, message, details);
  }
  if (!res.headersSent) {
    res.writeHead(code, {
      'Content-Type': 'text/plain',
    });
  }
  if (message.message) {
    message = message.message;
  }
  if (typeof message !== 'string') {
    message = JSON.stringify(message);
  }
  if (details) {
    message += ': ' + JSON.stringify(details);
  }
  res.end(message);
};

const promptForBasicAuth = res => {
  res.writeHead(401, {
    'Content-Type': 'text/plain',
    'WWW-Authenticate': MEDIC_BASIC_AUTH,
  });
  res.end('not logged in');
};

module.exports = {
  MEDIC_BASIC_AUTH: MEDIC_BASIC_AUTH,
  REQUEST_ID_HEADER: REQUEST_ID_HEADER,
  /**
   * Returns the URL used to access the app. The configured `app_url` value is preferred because a non-standard
   * host port (not 443) will not be reflected in the `req` object when deployed in Docker behind a reverse proxy.
   *
   * We should remove this function once https://github.com/medic/cht-core/issues/9983 is addressed.
   */
  getAppUrl: req => (config.get('app_url') || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, ''),

  /*
   * Attempts to determine the correct response given the error code.
   * Set showPrompt if this is a direct API call rather than from the webapp
   */
  error: (err, req, res, showPrompt) => {
    if (typeof err === 'string') {
      return module.exports.serverError(err, req, res);
    }

    // https://github.com/nodejs/node/issues/9027
    let code = err.code || err.statusCode || err.status || 500;
    if (err instanceof InvalidArgumentError) {
      code = 400;
    }
    if (!Number.isInteger(code)) {
      logger.warn(`Non-numeric error code: ${code}`);
      code = 500;
    }

    if (code === 401) {
      return module.exports.notLoggedIn(req, res, showPrompt);
    }
    if (code >= 500 && code < 600) {
      return module.exports.serverError(err, req, res);
    }
    respond(req, res, code, err.message || err.reason, err.details);
  },

  /**
   * The correct error handler to call when you know the error is
   * an authentication error.
   */
  notLoggedIn: (req, res, showPrompt) => {
    if (!res.headersSent) {
      res.setHeader('logout-authorization', 'CHT-Core API');
    }

    if (showPrompt) {
      // api access - basic auth allowed
      promptForBasicAuth(res);
      return;
    }
    if (wantsJSON(req)) {
      // couch request - respond with JSON error
      return writeJSON(res, 401, 'unauthorized');
    }
    // web access - redirect humans to login page; prompt others for basic auth
    if (isClientHuman(req)) {
      const redirectUrl = url.format({
        pathname: path.join('/', environment.db, 'login'),
        query: { redirect: req.url },
      });
      cookie.setForceLogin(res);
      res.redirect(302, redirectUrl);
    } else {
      promptForBasicAuth(res);
    }
  },

  rateLimited: (req, res) => {
    respond(req, res, 429, 'Too Many Requests');
  },

  /**
   * Only to be used when handling unexpected errors.
   */
  serverError: (err, req, res) => {
    logger.error('Server error: %o', err);
    if (err.type === 'entity.too.large') {
      return respond(req, res, 413, 'Payload Too Large');
    }
    if (err.type === 'upgrade.connection.refused') {
      return respond(req, res, 503, 'Connection refused');
    }
    respond(req, res, 500, 'Server error', err.publicMessage);
  },

  emptyJSONBodyError: (req, res) => {
    const err = {
      code: 400,
      message: 'Request body is empty or Content-Type header was not set to application/json.',
    };
    return module.exports.error(err, req, res);
  },

  wantsJSON,

  doOrError: (fn) => async (req, res) => {
    try {
      return await fn(req, res);
    } catch (err) {
      module.exports.error(err, req, res);
    }
  }
};
