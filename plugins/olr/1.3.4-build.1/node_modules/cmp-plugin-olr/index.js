const pkg         = require('./package.json')
const schema      = require('./schema.json')
const AuthenticationPlugin = require('cmp-plugin-authentication')(pkg, schema)
const sso         = require('sso-olr')
const _           = require('lodash')

/*
 * OLR Implementatio of Authentication Interface
 */
class OlrPlugin extends AuthenticationPlugin {

  /*
   * Set initial values and settings
   */
  init() {
    super.init()
    this.level = AuthenticationPlugin.level + 20

    this.clients = []
    this.defaults.mappings.requestParams = Object.freeze([
      'eISBN', 'titleIsbn', 'courseKey', 'ctx', 'ILRN_CODE', 'courseCgi'
    ])
    this.defaults.mappings.authResponse = Object.freeze({
      'guid': 'data.entitlement.guid',
      'role': 'entitlementProduct.enrollmentType',
      'cgi': 'entitlementProduct.cgi',
      'institution': 'data.entitlement.institutionName',
      'institution-id': 'data.entitlement.cnowInstitutionId'
    })
  }

  /*
   * Passes plugin-specific information to be logged to analytical trends for the request
   */
  trends(config) {
    return (req, res, resolve) => {
      const namespace = _.get(req, [ 'session', 'mappings', req.header('host'), 'currentEntitlement' ])
      
      resolve({
        courseKey: this.getParamSessionValue(req, 'courseKey', { namespace }),
        eISBN: this.getParamSessionValue(req, 'eISBN', { namespace }),
        courseCgi: this.getSessionValue(req, 'cgi', { namespace }),
        role: this.getSessionValue(req, 'role', { namespace }),
        institution: this.getSessionValue(req, 'institution-id', { namespace }),
        refresh: _.get(req, 'result.headers.cengage-sso-refresh'),
        timer: req.fetchHandlerTime('olrMiddleware') || 0
      })
    }
  }

  clearSession(req = {}, options = {}) {
    _.set(req, `session.params['${options.namespace}']`, {})
    _.unset(req, [ 'session', 'mappings', req.header('host'), 'currentEntitlement' ])
    return _.set(req, `session.${this.name}['${options.namespace}']`, {})
  }

  /*
   * Initialize the SSO/OLR Client
   */
  getClient(config) {
    if(!config.endpoint) {
      return
    }

    let client = this.clients[config.endpoint]

    if (!client) {
      client = this.clients[config.endpoint] = sso(config.endpoint)
    }

    return client
  }

  fetchAuth(token, params, config, callback) {
    const client = this.getClient(config)

    // TODO: validate the client

    if (params.eISBN) {
      client.getEntitlements(token, params.eISBN, callback)
    } else {
      client.getAllEntitlements(token, callback)
    }
  }

  getEntitlementProductFromAll(options) {
    const { data, courseKey, courseCgi, config } = options
    let foundProduct

    _.forEach(data.entitlement.titles.title, (title) => {
      return title.products && _.forEach(title.products.entitlementProduct, (product) => {
        if (courseKey && product.contextId === courseKey) {
          foundProduct = product
          return false
        }

        if (courseCgi && product.cgi === courseCgi) {
          foundProduct = product
          return false
        }
      })
    })

    return foundProduct
  }

  getEntitlementProduct(options) {
    const { data, courseKey, courseCgi, config } = options
    let titles
    let entitlementProducts
    let foundProduct

    const hasTitles = () => {
      let tlt
      return (tlt = data.entitlement.titles.title) && tlt.length > 0 && (data.entitlement.titles.title)
    }

    const hasProducts = (titles) => {
      return _.reduce(titles, (accumulator, title , key) => {
        title.products.entitlementProduct.map(product => product.titleKey = key)
        return accumulator.concat(title.products.entitlementProduct)
      }, [])
    }

    if ((titles = hasTitles()) && (entitlementProducts = hasProducts(titles))) {
      if (courseKey) {
        return _.find(entitlementProducts, { 'contextId': courseKey })
      }

      if (courseCgi) {
        return _.find(entitlementProducts, { 'cgi': courseCgi })
      }

      return false
    }
  }

  handleAuthModeRestrict(req, res, next, config) {
    res.status(401).end()
  }

  handleAuthError(token, params, error, req, res, next, config) {
    const sessionOptions = {
      namespace: this.getNamespace(params)
    }

    req.endHandlerTimer('olrMiddleware')

    if(this.hasFallbackPrivilege(req, sessionOptions)) {
      this.setFallbackData(req, params, config,sessionOptions)
      return this.updateAndSaveSession(req, next, sessionOptions)
    }

    this.baseConfig.logger.error({
      action: 'getting entitlements',
      host: req.header('host'),
      eISBN: params.eISBN,
      courseKey: params.courseKey,
      courseCgi: params.courseCgi,
      token: this.truncateToken(token),
      ssoGuid: this.getSessionValue(req, 'guid'),
      sessionId: req.sessionId,
      error
    })

    return this.notAuthenticated(req, res, next, config, sessionOptions)
  }

  handleAuthSuccess(data, params, config, callback) {
    const func = (params.eISBN) ? this.getEntitlementProduct : this.getEntitlementProductFromAll
    callback(func({
      data,
      courseKey: params.courseKey,
      courseCgi: params.courseCgi,
      config
    }))
  }

  manageSession(req, res, next, config) {
    const namespace = _.get(req, [ 'session', 'mappings', req.header('host'), 'currentEntitlement' ])
    const ssoToken = _.get(req, 'session.sso.token')
    let params = this.getParams(req, { namespace })
    let syncRefresh = false

    // Trigger a refresh if the entitlement in cache is expired/expiring
    if(ssoToken && this.shouldRefresh(this.getSessionValue(req, 'expiration', { namespace }))) {

      if(!req.params.courseKey && !req.params.courseCgi && !req.params.eISBN) {
        // We need to update req.params so those save into the session namespace properly
        // We also want to use the passed in params in priority over the session params saved on the namespace
        params = req.params = Object.assign({}, _.get(req, `session.params[${namespace}]`), params)
        params.token = ssoToken
        syncRefresh = true
      }
    }

    const sessionOptions = {
      namespace: this.getNamespace(params)
    }

    if(params.token && (params.courseKey || params.courseCgi)) {
      req.startHandlerTimer('olrMiddleware')

      this.fetchAuth(params.token, params, config, (err, authData) => {
        if (err || authData.resultCode !== 0) return this.handleAuthError(params.token, params, err, req, res, next, config)

        this.handleAuthSuccess(authData, params, config, (processedData) => {
          if (processedData) {
            const entitlementData = Object.assign({}, {
              data: authData,
              entitlementProduct: processedData
            }, (params.eISBN) ? {
              title: _.get(authData, 'entitlement.titles.title[processedData.titleKey]', {})
            } : {})

            this.clearSession(req, sessionOptions)
            this.sanitizeUnauthorizedEntitlements(req)

            this.mapToSession(entitlementData, req, config, sessionOptions)
            this.setSessionValue(req, 'has-entitlements', String(!_.isEmpty(authData)), sessionOptions)
            this.setSessionValue(req, 'expiration',
              (syncRefresh) ? _.get(req, 'session.sso.expiration') : this.getExpiration(config.ttl),
              sessionOptions)
            this.setSessionValue(req, 'endpoint', config.endpoint, sessionOptions)

            this.mapFallbacksToSession(req, entitlementData, config)

            this.mapToHeaders(req, sessionOptions)

            req.endHandlerTimer('olrMiddleware')

            this.updateAndSaveSession(req, next, sessionOptions)
          } else {
            this.setFallbackData(req, params, config, sessionOptions)

            req.endHandlerTimer('olrMiddleware')

            this.updateAndSaveSession(req, next, sessionOptions)
          }
        })
      })
    } else if(params.token && params.eISBN) {
      req.startHandlerTimer('olrMiddleware')

      this.fetchAuth(params.token, params, config, (err, authData) => {
        if (err || authData.resultCode !== 0) return this.handleAuthError(params.token, params, err, req, res, next, config)

        const entitlementData = Object.assign({}, {
          data: authData
        })

        this.clearSession(req, sessionOptions)
        this.sanitizeUnauthorizedEntitlements(req)

        this.mapToSession(entitlementData, req, config, sessionOptions)
        this.setSessionValue(req, 'has-entitlements', String(!_.isEmpty(_.get(authData, 'entitlement.titles.title[0].products.entitlementProduct[0]', {}))), sessionOptions)
        this.setSessionValue(req, 'expiration',
          (syncRefresh) ? _.get(req, 'session.sso.expiration') : this.getExpiration(config.ttl),
          sessionOptions)
        this.setSessionValue(req, 'endpoint', config.endpoint, sessionOptions)

        this.mapFallbacksToSession(req, entitlementData, config)

        this.mapToHeaders(req, sessionOptions)

        req.endHandlerTimer('olrMiddleware')

        this.updateAndSaveSession(req, next, sessionOptions)
      })
    } else {
      this.resumeSession(req, res, next, config)
    }
  }

  setFallbackData(req, params, config, options) {
    this.mapToSession({}, req, config, options)
    this.mapFallbacksToSession(req, params, config, options)
    this.mapFallbackToHeaders(req, options)
  }

  resumeSession(req, res, next, config) {
    let namespace = _.get(req, [ 'session', 'mappings', req.header('host'), 'currentEntitlement' ])

    if(namespace) {
      if(_.isEmpty(_.get(req, `session.olr['${namespace}']`))) {
        this.mapFallbackToHeaders(req, { namespace })
      } else {
        this.mapToHeaders(req, { namespace })
      }
    }

    next()
  }

  sanitizeUnauthorizedEntitlements(req) {
    const guid = _.get(req, 'session.sso.guid', '')
    const olr = _.get(req, 'session.olr', {})

    _.forEach(olr, (entitlement, key) => {
      if(!_.isEmpty(entitlement) && entitlement.guid !== guid) {
        delete req.session.params[key]
        delete req.session.olr[key]
      }
    })
  }

  notAuthenticated(req, res, next, config, options) {
    this.setSessionValue(req, 'has-entitlements', null, options)
    this.handleAuthMode(req, res, next, config, options)
  }

  updateAndSaveSession(req, next, options) {
    _.set(req, [ 'session', 'mappings', req.header('host'), 'currentEntitlement' ], options.namespace)
    super.updateAndSaveSession(req, next, options)
  }
}

module.exports = OlrPlugin
