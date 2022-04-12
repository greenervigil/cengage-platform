"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cmp_plugin_authentication_1 = __importDefault(require("cmp-plugin-authentication"));
const package_json_1 = __importDefault(require("../package.json"));
const querystring_1 = __importDefault(require("querystring"));
const url_1 = __importDefault(require("url"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sso = require('sso-olr');
const REFRESH_HEADER = 'ciam-session-refresh';
/*
 * OLR Implementatio of Authentication Interface
 */
class SsoPlugin extends cmp_plugin_authentication_1.default {
    constructor(options) {
        super(package_json_1.default, options);
    }
    /**
     * Set initial values and settings
     *
     * @public
     * @returns {Promise<void>}
     */
    async init() {
        super.init();
        this.level = 1010;
        this.clients = [];
        this.defaults.mappings.authResponse = Object.freeze({
            'guid': 'data.guid',
            'role': 'data.userType',
            'first-name': 'user.givenName',
            'last-name': 'user.sn',
            'email': 'user.mail',
            'institution': 'user.tlinstitutionName',
            'institution-id': 'user.tlinstitutionId'
        });
        this.registerMode('redirect', this.handleAuthModeRedirect);
    }
    /**
     * Optional function which is called by the CMP trends logging function
     * for persisting any plugin-specific information.
     * Be mindful of sensitive information being resolved to the logger!
     *
     * @public
     * @param {cmpContext} - ctx
     * @returns {Promise<unknown>}
     */
    async trends(ctx) {
        var _a, _b, _c, _d, _e, _f, _g;
        const session = ctx.session.get();
        return {
            guid: ((_a = session.mapped) === null || _a === void 0 ? void 0 : _a.guid) || '',
            role: ((_b = session.mapped) === null || _b === void 0 ? void 0 : _b.role) || '',
            institution: ((_c = session.mapped) === null || _c === void 0 ? void 0 : _c['institution-id']) || '',
            refresh: ((_e = (_d = ctx.proxyRes) === null || _d === void 0 ? void 0 : _d.headers) === null || _e === void 0 ? void 0 : _e[REFRESH_HEADER]) || ((_g = (_f = ctx.proxyRes) === null || _f === void 0 ? void 0 : _f.headers) === null || _g === void 0 ? void 0 : _g[`${this.headerPrefix}-refresh`]) || false
        };
    }
    /*
     * Initialize the SSO/OLR Client
     */
    getClient() {
        if (!this.options.endpoint) {
            return;
        }
        let client = this.clients[this.options.endpoint];
        if (!client) {
            client = this.clients[this.options.endpoint] = sso(this.options.endpoint);
        }
        return client;
    }
    mapDefaultsToHeaders(ctx) {
        const identity = ctx.session.getIdentity();
        this.setHeaderValue(ctx, 'token', identity.token);
        this.setHeaderValue(ctx, 'guid', identity.guid);
        this.setHeaderValue(ctx, 'expiration', identity.expiration);
        this.setHeaderValue(ctx, 'endpoint', identity.endpoint);
    }
    handleAuthError(token, error, ctx) {
        const identity = ctx.session.getIdentity();
        ctx.stopwatch.stop('plugin.sso.getUser');
        this.logger.error({
            action: 'getting user from token',
            host: ctx.hostname,
            token: this.truncateToken(token),
            ssoGuid: identity.guid,
            sessionId: ctx.headers['cmp-session-id'],
            error
        });
        // TODO: Convert to helper library
        ctx.headers['cmp-error-code'] = '3220';
        ctx.set('cmp-error-code', '3220');
        return this.notAuthenticated(ctx);
    }
    handleAuthModeRedirect(ctx) {
        if (this.options.intended) {
            const loginUrl = url_1.default.parse(this.options.login);
            const loginUrlQuery = querystring_1.default.parse(loginUrl.query);
            const reqUrl = url_1.default.parse(ctx.req.url);
            const reqUrlParams = querystring_1.default.parse(reqUrl.query);
            /*
            TODO: Look into using these options later
      
            request.protocol
            Return request protocol, "https" or "http". Supports X-Forwarded-Proto when app.proxy is true.
      
            request.secure
            Shorthand for ctx.protocol == "https" to check if a request was issued via TLS.
            */
            const proto = (ctx.get('x-forwarded-proto') || ctx.protocol) === 'https' ? 'https' : 'http';
            delete reqUrlParams.token;
            const query = {
                targeturl: url_1.default.format(`${proto}://${ctx.headers.host}${reqUrl.pathname}?${querystring_1.default.stringify(reqUrlParams)}`),
                app: 'cmp'
            };
            Object.assign(loginUrlQuery, query);
            Object.assign(loginUrl, { query });
            // search is only rebuilt with query during URL.format if search is undefined
            delete loginUrl.search;
            ctx.selfHandleResponse = true;
            ctx.redirect(url_1.default.format(loginUrl));
        }
        else {
            ctx.selfHandleResponse = true;
            ctx.redirect(this.options.login);
        }
    }
    fetchAuth(token, callback) {
        const client = this.getClient();
        client.getUser(token, callback);
        // TODO: validate the client
    }
    async manageSession(ctx) {
        return new Promise(async (resolve) => {
            var _a, _b, _c;
            if (ctx.sanitizeHeaders) {
                await ctx.sanitizeHeaders(this.headerPrefix);
            }
            if (ctx.query.token) {
                // Invalidate the session, since the token query param is telling us to start with a clean slate
                ctx.session.invalidate();
            }
            const session = ctx.session.get();
            // Set identity based on currently saved sso details
            ctx.session.setIdentity('sso', {
                guid: (_a = session.mapped) === null || _a === void 0 ? void 0 : _a.guid,
                token: (_b = session.mapped) === null || _b === void 0 ? void 0 : _b.token,
                expiration: (_c = session.mapped) === null || _c === void 0 ? void 0 : _c.expiration,
                endpoint: this.options.endpoint
            });
            const expiringToken = this.getExpiringToken(ctx);
            const tokenToRefresh = this.getRequestToken(ctx) || expiringToken;
            if (expiringToken) {
                ctx.headers[REFRESH_HEADER] = true;
                ctx.set(REFRESH_HEADER, 'true');
                // Keeping old ones for max backwards compatibility
                ctx.headers[`${this.headerPrefix}-refresh`] = true;
                ctx.set(`${this.headerPrefix}-refresh`, 'true');
            }
            if (tokenToRefresh) {
                ctx.stopwatch.start('plugin.sso.getUser');
                this.fetchAuth(tokenToRefresh, (err, authData) => {
                    var _a, _b, _c;
                    if (err || ((_a = authData === null || authData === void 0 ? void 0 : authData.resultCode) !== null && _a !== void 0 ? _a : -1) !== 0) {
                        this.handleAuthError(tokenToRefresh, err, ctx);
                        return resolve();
                    }
                    ctx.stopwatch.stop('plugin.sso.getUser');
                    const expiration = this.getExpiration(this.options.ttl);
                    // This will handle session invalidation if guids do not match
                    ctx.session.setIdentity('sso', {
                        guid: authData.guid,
                        token: authData.token,
                        expiration: expiration,
                        endpoint: this.options.endpoint
                    });
                    const sessionData = {
                        token: authData.token,
                        data: authData,
                        expiration: expiration,
                        user: (_c = (_b = authData.users) === null || _b === void 0 ? void 0 : _b.tlperson) === null || _c === void 0 ? void 0 : _c[0]
                    };
                    this.setFallbackPrivilege(ctx, sessionData);
                    const mapped = Object.assign({
                        mapped: {},
                        params: {},
                        fallback: {}
                    }, this.mapToSession(ctx, sessionData), this.mapFallbacksToSession(ctx, sessionData));
                    Object.assign(mapped.mapped, {
                        token: sessionData.token,
                        guid: sessionData.data.guid,
                        expiration: expiration,
                        endpoint: this.options.endpoint
                    });
                    ctx.session.set(mapped);
                    this.mapToHeaders(ctx);
                    this.mapDefaultsToHeaders(ctx);
                    ctx.isLoggingIn = true;
                    resolve();
                });
            }
            else if (this.isAuth(ctx)) {
                this.resumeSession(ctx);
                resolve();
            }
            else {
                this.notAuthenticated(ctx);
                resolve();
            }
        });
    }
    resumeSession(ctx) {
        this.mapToHeaders(ctx);
        this.mapDefaultsToHeaders(ctx);
    }
}
exports.default = SsoPlugin;
module.exports = SsoPlugin;
