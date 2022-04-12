const pkg = require('./package.json')
const schema = require('./schema.json')
const AuthenticationPlugin = require('cmp-plugin-authentication')(pkg, schema)
const querystring = require('querystring')
const sso = require('sso-olr')
const URL = require('url')
const _ = require('lodash')

/*
 * SSO Implementatio of Authentication Interface
 */
class SsoPlugin extends AuthenticationPlugin {

  /*
   * Set initial values and settings
   */
  init() {
    super.init()
    this.level = AuthenticationPlugin.level + 10

    this.clients = []
    this.defaults.mappings.authResponse = Object.freeze({
      'guid': 'data.guid',
      'role': 'data.userType',
      'first-name': 'user.givenName',
      'last-name': 'user.sn',
      'email': 'user.mail',
      'institution': 'user.tlinstitutionName',
      'institution-id': 'user.tlinstitutionId'
    })

    this.registerMode('redirect', this.handleAuthModeRedirect)
  }

  /*
   * Passes plugin-specific information to be logged to analytical trends for the request
   */
  trends(config) {
    return (req, res, resolve) => {
      resolve({
        guid: this.getSessionValue(req, 'guid'),
        role: this.getSessionValue(req, 'role'),
        institution: this.getSessionValue(req, 'institution-id'),
        refresh: _.get(req, 'result.headers.cengage-sso-refresh'),
        timer: req.fetchHandlerTime('ssoMiddleware') || 0
      })
    }
  }

  /*
   * Initialize the SSO/OLR Client
   */
  getClient(config) {
    if (!config.endpoint) {
      return
    }

    let client = this.clients[config.endpoint]

    if (!client) {
      client = this.clients[config.endpoint] = sso(config.endpoint)
    }

    return client
  }

  getGuidFromSession(req) {
    return _.get(req, 'session.sso.guid', '')
  }

  clearSessionForceful(req) {
    return _.set(req, 'session', {})
  }

  clearSessionCookieForceful(req) {
    return _.set(req, 'sessionCookie', {})
  }

  getSSOVersion(config) {
    let ssoVersion = _.get(config, 'version', null)
    if (!ssoVersion) {
      //grab sso version from baseConfig
      ssoVersion = _.get(this.baseConfig, 'defaultPluginVersions.sso', '')
    }
    return ssoVersion
  }

  setSessionMetaValue(req, key, value, options = {}) {
    const func = (value) ? _.set : _.unset
    if (options.namespace) {
      return func(req, `session.${this.name}_meta['${options.namespace}'].${key}`, value)
    } else {
      return func(req, `session.${this.name}_meta.${key}`, value)
    }
  }

  mapToSession(sessionData, req, config, options) {
    const ssoVersion = this.getSSOVersion()
    _.set(req, [ 'session', 'mappings', req.header('host'), 'ssoVersion' ], ssoVersion)

    const params = this.getParams(req)
    const transformers = _.get(config, 'transformers', this.defaults.transformers)
    const requestParamsMappings = _.get(config, 'mappings.requestParams', this.defaults.mappings.requestParams)
    const authResponseMappings = _.get(config, 'mappings.authResponse', this.defaults.mappings.authResponse)

    Object.keys(sessionData).forEach(key => {
      this.setSessionMetaValue(req, key, sessionData[key], options)
    })

    // want to setup old session data for previous versions
    Object.keys(authResponseMappings).forEach(key => {
      const mappedValue = this.getValueFromMappings(sessionData, authResponseMappings[key])
      const value = !!transformers[key] && !!this.util.transformFunctions[transformers[key]] ? this.util.transformFunctions[transformers[key]].call(mappedValue) : mappedValue
      this.setSessionValue(req, key, value, options)
    })

    if (requestParamsMappings.length) {
      requestParamsMappings.forEach(key => {
        if (params[key]) {
          const mappedValue = this.getValueFromMappings(params, key)
          const value = !!transformers[key] && !!this.util.transformFunctions[transformers[key]] ? this.util.transformFunctions[transformers[key]].call(mappedValue) : mappedValue
          this.setParamSessionValue(req, key, value, options)
        }
      })
    }
  }

  mapToHeaders(req, config) {
    if (_.get(req, [ 'session', 'mappings', req.header('host'), 'ssoVersion' ], null)) {
      // we have a newer version of sso mapped to the session, need to use values from req.session.sso_meta and use authMappings
      const transformers = _.get(config, 'transformers', this.defaults.transformers)
      const authResponseMappings = _.get(config, 'mappings.authResponse', this.defaults.mappings.authResponse)
      const ssoData = _.get(req, `session.${this.name}_meta`, {})      

      Object.keys(authResponseMappings).forEach(key => {
        const locationOfValue = authResponseMappings[key]
        const mappedValue = this.getValueFromMappings(ssoData, locationOfValue)
        const value = !!transformers[key] && !!this.util.transformFunctions[transformers[key]] ? this.util.transformFunctions[transformers[key]].call(mappedValue) : mappedValue
        if (!_.isObject(value)) {
          this.setHeaderValue(req, key, value)
        }
      })

      Object.keys(_.get(req, 'session.params', {})).forEach(key => {
        const val = _.get(req, `session.params.${key}`)
        if (!_.isObject(val)) {
          this.setParamHeaderValue(req, key, val)
        }
      })
    } else {
      // this host has an older version of sso, map headers as is straight from req.session.sso
      super.mapToHeaders(req)
    }

  }

  mapDefaultsToHeaders(req) {
    this.setHeaderValue(req, 'token', this.getSessionValue(req, 'token'))
    this.setHeaderValue(req, 'guid', this.getSessionValue(req, 'guid'))
    this.setHeaderValue(req, 'expiration', this.getSessionValue(req, 'expiration'))
    this.setHeaderValue(req, 'endpoint', this.getSessionValue(req, 'endpoint'))
  }

  handleAuthError(token, error, req, res, next, config) {

    req.endHandlerTimer('ssoMiddleware')

    this.baseConfig.logger.error({
      action: 'getting user from token',
      host: req.header('host'),
      token: this.truncateToken(token),
      ssoGuid: this.getSessionValue(req, 'guid'),
      sessionId: req.sessionId,
      error
    })

    return this.notAuthenticated(req, res, next, config)
  }

  handleAuthModeRedirect(req, res, next, config) {
    if (config.intended) {
      let loginUrl = URL.parse(config.login)
      let loginUrlQuery = querystring.parse(loginUrl.query)
      let reqUrl = URL.parse(req.url)
      let reqUrlParams = querystring.parse(reqUrl.query)
      const proto = (req.headers['x-forwarded-proto'] || req.protocol) === 'https' ? 'https' : 'http'

      delete reqUrlParams.token

      const query = {
        targeturl: URL.format(`${proto}://${req.headers.host}${reqUrl.pathname}?${querystring.stringify(reqUrlParams)}`),
        app: 'cmp'
      }

      Object.assign(loginUrlQuery, query)
      Object.assign(loginUrl, { query })

      // search is only rebuilt with query during URL.format if search is undefined
      delete loginUrl.search

      res.redirect(URL.format(loginUrl))
    } else {
      res.redirect(config.login)
    }
  }

  fetchAuth(token, config, callback) {
    const client = this.getClient(config)
    client.getUser(token, callback)

    // TODO: validate the client
  }

  clearSession(req = {}) {
    _.set(req, `session.${this.name}`, {})
    _.unset(req, [ 'session', 'mappings', req.header('host'), 'ssoVersion' ])
    return _.set(req, 'session[sso_meta]', {})
  }

  manageSession(req, res, next, config) {
    const expiringToken = this.getExpiringToken(req, config)
    const tokenToRefresh = this.getRequestToken(req) || expiringToken

    if (expiringToken) {
      _.set(req, `headers.[${this.headerPrefix}-refresh]`, true)
    }

    if (tokenToRefresh) {
      this.clearSession(req)
      req.startHandlerTimer('ssoMiddleware')

      this.fetchAuth(tokenToRefresh, config, (err, authData) => {
        if (err || authData.resultCode !== 0) return this.handleAuthError(tokenToRefresh, err, req, res, next, config)

        // Clear out the session completely if guid's dont match
        if (this.getGuidFromSession(req) !== authData.guid) {
          this.clearSessionForceful(req)
          this.clearSessionCookieForceful(req)
        }

        const expiration = this.getExpiration(config.ttl)
        const sessionData = {
          token: authData.token,
          data: authData,
          expiration: expiration,
          user: _.get(authData, 'users.tlperson[0]')
        }

        const sessionOptions = {
          namespace: this.getNamespace(this.getParams(req))
        }

        this.mapToSession(sessionData, req, config)

        this.setSessionValue(req, 'token', sessionData.token)
        this.setSessionValue(req, 'guid', sessionData.data.guid)
        this.setSessionValue(req, 'expiration', expiration)
        this.setSessionValue(req, 'endpoint', config.endpoint)
        this.mapDefaultsToHeaders(req)

        this.setFallbackPrivilege(req, sessionData, config, sessionOptions)
        this.mapFallbacksToSession(req, sessionData, config, sessionOptions)
        this.mapToHeaders(req, config)
        req.isAuthenticated = true
        req.isLoggingIn = true
        _.set(req, 'sessionCookie.sso.guid', sessionData.data.guid)

        req.endHandlerTimer('ssoMiddleware')
        this.updateAndSaveSession(req, () => { req.mergeSession(next) })
      })
    } else if (this.isAuth(req)) {
      this.resumeSession(req, res, next, config)
    } else {
      this.notAuthenticated(req, res, next, config)
    }
  }

  resumeSession(req, res, next, config) {
    req.isAuthenticated = true
    this.mapToHeaders(req, config)
    this.mapDefaultsToHeaders(req)
    next()
  }
}

module.exports = SsoPlugin
