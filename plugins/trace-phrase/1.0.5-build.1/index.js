const pkg         = require('./package.json')
const schema      = require('./schema.json')
const BasePlugin  = require('cmp-plugin-base')(pkg, schema)
const adverbs     = require('./phrase/adverbs.js')
const adjectives  = require('./phrase/adjectives.js')
const animals     = require('./phrase/animals.js')
const _           = require('lodash')
/*
 * Plugin which will generate (if not present) a cengage_trace_phrase header
 */
class TracePhrasePlugin extends BasePlugin {

  /*
   * Set initial values and settings
   */
  init() {
    this.notPropagated = [ 'ignored' ]
    //ensures this plugin is bootstrapped into the router pluging stack:
    this.level = 1000
  }

  /*
   * Passes plugin-specific information to be logged to analytical trends for the request
   */
  trends(config) {
    return (req, res, resolve) => {
      resolve({
        tracephrase: _.get(req, 'result.headers.cengage_trace_phrase')
      })
    }
  }

  /*
   * Process the config for the path and find if there should be any
   * children added from this node.
   *
   * @param {object} config - path config from the router
   * @return {object} subpath config for the router to merge into the tree
   * @public
   */
  children(config) {
    // allows us to declare which paths should be ignored
    // in the root config, instead of on each individual path
    const ignorePaths = config.ignored || []

    return ignorePaths.reduce((accumulator, subpath) => {
      accumulator[subpath] = { enabled: false }
      return accumulator
    }, {})

  }

  /*
   * Middleware to be added to the path's middleware stack
   *
   * @param {http.clientRequest} - req
   * @param {http.serverResponse} - res
   * @param {function} - next proceeding middleware to be called
   * @param {object} - config path config from the router
   * @public
   */
  middleware() {
    return (req, res, next, config) => {
      const sessionAware = config.sessionAware

      const headerName = config.headerName || 'cengage_trace_phrase'

      const sharedPhrase = config.sharedPhrase
      const phraseKey = sharedPhrase ? 'cengage_trace_phrase' : headerName

      const phrasePath = `session["${phraseKey}"].phrase`
      const headersPath = `session.headers["${headerName}"]`

      if (config.enabled) {
        if( sessionAware ) {
          if ( ! _.get(req, phrasePath) ) {
            const phrase = `${this.pickOneWord(adverbs)} ${this.pickOneWord(adjectives)} ${this.pickOneWord(animals)}`
            _.set(req, phrasePath, phrase)
          }
          _.set(req, headersPath, _.get(req, phrasePath))
          // makes sure the session is persisted between requests
          req.preserveSession(next)
        } else {
          const phrase = `${this.pickOneWord(adverbs)} ${this.pickOneWord(adjectives)} ${this.pickOneWord(animals)}`
          _.set(req, headersPath, phrase)
          next()
        }
      } else {
        next()
      }
    }
  }

  /*
   * Should this middleware be ran for this request
   * Defaults to true in the base plugin
   *
   * @param {http.clientRequest} - req 
   * @param {http.serverResponse} - res 
   * @param {function} - next proceeding middleware to be called
   * @param {object} - config path config from the router
   * @public
   */
  shouldRun(req, res, next, config) {
    return config.enabled
  }

  //
  // Helper methods
  //

  /*
   * Given a list of phrases, pick a single word from one of the phrases
   *
   * @param {Array} - phrases
   */
  pickOneWord(phrases) {
    const idx = Math.floor(Math.random() * phrases.length)
    const phrase = phrases[idx]
    const wordArr = phrase.split(' ')

    if (wordArr.length === 1) {
      return phrase
    } else {
      return this.pickOneWord(wordArr)
    }
  }
}

module.exports = TracePhrasePlugin
