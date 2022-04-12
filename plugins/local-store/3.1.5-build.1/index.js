const _          = require('lodash')
const uuid       = require('uuid')
const requireAll = require('requireall')
const pkg        = require('./package.json')
const properties = require('./properties.json')
const BasePlugin = require('cmp-plugin-base')(pkg, properties)
const crypto     = require('crypto')
const isUuid     = require('is-uuid')
const jsonfile   = require('jsonfile')
const file       = __dirname + '/sessions.json'

/*
 * Plugin providing a local in-memory session store .
 *
 * @extends BasePlugin
 */
class LocalStorePlugin extends BasePlugin {

  /*
   * Function to be ran by the constructor
   * Initializes the session store as an empty object
   */
  init() {
    jsonfile.writeFileSync(file, {})
  }

  /*
   * Read a session from the local store
   *
   * @param {string} sessionId - the key matching the session
   * @param {Function} callback -
  */
  read(req, callback) {
    process.nextTick(() => {
      if(isUuid.v4(req.sessionId)) {
        const sessions = jsonfile.readFileSync(file)
        callback(_.cloneDeep(sessions[req.sessionId]))
      } else {
        try {
          const decSession = req.getDecryptedSession(req.sessionId)
          req.sessionCookie = JSON.parse(decSession)
          jsonfile.readFile(file, (err, obj) => {
            const guid = _.get(req.sessionCookie, 'sso.guid')
            callback(_.cloneDeep(obj[guid]))
            if(err) {
              this.baseConfig.logger.error(err)
            }
          })
        } catch (e) {
          this.baseConfig.logger.error({
            action: 'read session cookie',
            msg: 'could not parse session cookie',
            error: e
          })
          callback({ headers: {} })
          return
        }
      }
    })
  }

  /*
   * Write a session to the local store
   *
   * @param {string} sessionId - the key matching the session
   * @param {object} data -
   * @param {Function} callback -
   */
  write(req, data, callback) {
    let decSessionId
    let session = {}
    process.nextTick(() => {
      if(isUuid.v4(req.sessionId) && !req.isAuthenticated) {
        decSessionId = req.sessionId
      } else {
        decSessionId = _.get(req, 'session.sso.guid', '')
        if(!decSessionId) {
          try{
            const sessionDec = JSON.parse(req.getDecryptedSession(req.sessionId))
            decSessionId = _.get(sessionDec, 'sso.guid', '')
          } catch (e) {
            this.baseConfig.logger.error({
              action: 'write session cookie',
              msg: 'could not parse session cookie for guid to write',
              error: e
            })
          }
        }
      }

      const sessions = jsonfile.readFileSync(file)

      sessions[decSessionId] = data
      jsonfile.writeFileSync(file, sessions)
      if (callback) {
        callback()
      }
    })
  }

  /*
   * Pull the sessionId off the request, and update the cookie to match
   *
   * @param {http.clientRequest} request
   * @param {http.serverResponse} response
   *
   */
  getSessionId(req, res) {
    req.sessionId = _.get(req, 'cookies.cmp-session-id')

    if(req.sessionId && req.sessionId !== _.get(req, 'cookies.cmp-session-id')) {
      res.cookie('cmp-session-id', req.sessionId)
    }

    return req.sessionId
  }

  middleware() {
    /*
     * Express-like middleware to add the session onto the request based on the session id
     *
     * @param {http.clientRequest}
     * @param {http.serverResponse}
     * @param {Function} next
     * @param {object} [config]
     *
     * @public
     * @return {Function} middleware
    */
    return (req, res, next, config) => {
      req.getEncryptedSession = (session) => {
        const cipher = crypto.createCipher(this.baseConfig.sessionAlgorithm, this.baseConfig.sessionSecretKey)
        let crypted = cipher.update(session, 'utf8', 'hex')
        crypted += cipher.final('hex')
        return crypted
      }

      req.getDecryptedSession = (encrypted) => {
        const decipher = crypto.createDecipher(this.baseConfig.sessionAlgorithm, this.baseConfig.sessionSecretKey)
        let dec = decipher.update(encrypted, 'hex', 'utf8')
        dec += decipher.final('utf8')
        return dec
      }

      req.preserveSession = (callback) => {
        callback = (callback) ? callback : () => {}
        _.set(req, 'session.dirty', true)
        callback()
      }

      req.saveSession = (callback) => {
        _.unset(req, 'session.dirty')
        this.write(req, req.session, callback)
      }

      req.mergeSession = (callback) => {
        const guid = _.get(req, 'sessionCookie.sso.guid', '')
        const sessions = jsonfile.readFileSync(file)
        const existingSession = sessions[guid]
        req.session = _.merge(existingSession, req.session)
        callback()
      }

      if (this.getSessionId(req, res)) {
        this.read(req, (session) => {
          req.session = session
          next()
        })
      } else {
        req.sessionId = uuid.v4()
        res.cookie('cmp-session-id', req.sessionId)
        req.session = { headers: {} }
        req.sessionCookie = {}
        next()
      }
    }
  }
}

module.exports = LocalStorePlugin
