"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cmp_plugin_authentication_1 = __importDefault(require("cmp-plugin-authentication"));
const package_json_1 = __importDefault(require("../package.json"));
const lodash_find_1 = __importDefault(require("lodash.find"));
const lodash_foreach_1 = __importDefault(require("lodash.foreach"));
const lodash_isempty_1 = __importDefault(require("lodash.isempty"));
const lodash_reduce_1 = __importDefault(require("lodash.reduce"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sso = require('sso-olr');
const REFRESH_HEADER = 'ciam-session-refresh';
const COURSE_KEY_TYPE_SECTION_ID = 'SECTION_ID';
/*
 * OLR Implementatio of Authentication Interface
 */
class OlrPlugin extends cmp_plugin_authentication_1.default {
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
        this.level = 1020;
        this.clients = [];
        this.defaults.mappings.requestParams = Object.freeze([
            'eISBN', 'titleIsbn', 'courseKey', 'courseKeyType', 'ctx', 'ILRN_CODE', 'courseCgi'
        ]);
        this.defaults.mappings.authResponse = Object.freeze({
            'guid': 'data.entitlement.guid',
            'role': 'entitlementProduct.enrollmentType',
            'cgi': 'entitlementProduct.cgi',
            'institution': 'data.entitlement.institutionName',
            'institution-id': 'data.entitlement.cnowInstitutionId'
        });
    }
    isRefreshRequest(ctx) {
        var _a, _b, _c, _d;
        const reqRefreshHeader = Boolean(ctx.get(REFRESH_HEADER) || ctx.get(`${this.headerPrefix}-refresh`)) || false;
        const proxyResRefreshHeader = Boolean(((_b = (_a = ctx.proxyRes) === null || _a === void 0 ? void 0 : _a.headers) === null || _b === void 0 ? void 0 : _b[REFRESH_HEADER]) || ((_d = (_c = ctx.proxyRes) === null || _c === void 0 ? void 0 : _c.headers) === null || _d === void 0 ? void 0 : _d[`${this.headerPrefix}-refresh`])) || false;
        return reqRefreshHeader || proxyResRefreshHeader;
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
        var _a, _b, _c, _d, _e, _f;
        const session = ctx.session.get();
        return {
            courseKey: ((_a = session.params) === null || _a === void 0 ? void 0 : _a.courseKey) || '',
            courseKeyType: ((_b = session.params) === null || _b === void 0 ? void 0 : _b.courseKeyType) || '',
            eISBN: ((_c = session.params) === null || _c === void 0 ? void 0 : _c.eISBN) || '',
            courseCgi: ((_d = session.mapped) === null || _d === void 0 ? void 0 : _d.cgi) || '',
            role: ((_e = session.mapped) === null || _e === void 0 ? void 0 : _e.role) || '',
            institution: ((_f = session.mapped) === null || _f === void 0 ? void 0 : _f['institution-id']) || '',
            refresh: this.isRefreshRequest(ctx)
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
    fetchAuth(token, params, callback) {
        const client = this.getClient();
        // TODO: validate the client
        if (params.eISBN) {
            if (params.courseKey && params.courseKeyType === COURSE_KEY_TYPE_SECTION_ID) {
                client.getEntitlementsForSection(token, params.eISBN, params.courseKey, callback);
            }
            else {
                client.getEntitlements(token, params.eISBN, callback);
            }
        }
        else {
            client.getAllEntitlements(token, callback);
        }
    }
    getEntitlementProductFromAll(options) {
        const { data, courseKey, courseCgi } = options;
        let foundProduct;
        lodash_foreach_1.default(data.entitlement.titles.title, (title) => {
            return title.products && lodash_foreach_1.default(title.products.entitlementProduct, (product) => {
                if (courseKey && product.contextId === courseKey) {
                    foundProduct = product;
                    return false;
                }
                // A check on `courseKeyType` is purposefully being skipped here as this function should be unreachable code by definition when one is present since an eISBN was specified.
                if (courseCgi && product.cgi === courseCgi) {
                    foundProduct = product;
                    return false;
                }
            });
        });
        return foundProduct;
    }
    getEntitlementProduct(options) {
        const { data, courseKey, courseKeyType, courseCgi } = options;
        let titles;
        let entitlementProducts;
        const hasTitles = () => {
            let tlt;
            return (tlt = data.entitlement.titles.title) && tlt.length > 0 && (data.entitlement.titles.title);
        };
        const hasProducts = (titles) => {
            return lodash_reduce_1.default(titles, (accumulator, title, key) => {
                title.products.entitlementProduct.map((product) => product.titleKey = key);
                return accumulator.concat(title.products.entitlementProduct);
            }, []);
        };
        if ((titles = hasTitles()) && (entitlementProducts = hasProducts(titles))) {
            if (courseKey) {
                if (courseKeyType === COURSE_KEY_TYPE_SECTION_ID) {
                    return lodash_find_1.default(entitlementProducts, { 'sectionId': courseKey });
                }
                else {
                    return lodash_find_1.default(entitlementProducts, { 'contextId': courseKey });
                }
            }
            if (courseCgi) {
                return lodash_find_1.default(entitlementProducts, { 'cgi': courseCgi });
            }
            return false;
        }
    }
    handleAuthError(token, error, ctx) {
        const identity = ctx.session.getIdentity();
        const params = this.getParams(ctx);
        ctx.stopwatch.stop('plugin.olr.getEntitlements');
        // TODO: Convert to helper library
        ctx.headers['cmp-error-code'] = '3321';
        ctx.set('cmp-error-code', '3321');
        if (this.hasFallbackPrivilege(ctx)) {
            return this.setFallbackData(ctx);
        }
        this.logger.error({
            action: 'getting entitlements',
            host: ctx.hostname,
            eISBN: params.eISBN,
            courseKey: params.courseKey,
            courseKeyType: params.courseKeyType,
            courseCgi: params.courseCgi,
            token: this.truncateToken(token),
            ssoGuid: identity.guid,
            sessionId: ctx.headers['cmp-session-id'],
            error
        });
        return this.notAuthenticated(ctx);
    }
    handleAuthSuccess(data, params, callback) {
        const func = (params.eISBN) ? this.getEntitlementProduct : this.getEntitlementProductFromAll;
        callback(func({
            data,
            courseKey: params.courseKey,
            courseKeyType: params.courseKeyType,
            courseCgi: params.courseCgi
        }));
    }
    shouldAllowQuery(ctx, params) {
        var _a, _b, _c, _d;
        if (this.isRefreshRequest(ctx)) {
            return true;
        }
        const session = ctx.session.get();
        if (params.eISBN && (params.eISBN !== ((_a = session.params) === null || _a === void 0 ? void 0 : _a.eISBN))) {
            return true;
        }
        if (params.courseKey && (params.courseKey !== ((_b = session.params) === null || _b === void 0 ? void 0 : _b.courseKey))) {
            return true;
        }
        if (params.courseKeyType && (params.courseKeyType !== ((_c = session.params) === null || _c === void 0 ? void 0 : _c.courseKeyType))) {
            return true;
        }
        if (params.courseCgi && (params.courseCgi !== ((_d = session.params) === null || _d === void 0 ? void 0 : _d.courseCgi))) {
            return true;
        }
        return false;
    }
    async manageSession(ctx) {
        // Need to wrap in a promise unless we convert all of the callback-based
        // functions to promises
        return new Promise((resolve) => {
            var _a;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const identity = ctx.session.getIdentity();
            const session = ctx.session.get();
            const params = this.getParams(ctx);
            const shouldQuery = this.shouldAllowQuery(ctx, params);
            if (shouldQuery && identity.token && (params.courseKey || params.courseCgi)) {
                ctx.stopwatch.start('plugin.olr.getEntitlements');
                this.fetchAuth(identity.token, params, (err, authData) => {
                    var _a;
                    if (err || ((_a = authData === null || authData === void 0 ? void 0 : authData.resultCode) !== null && _a !== void 0 ? _a : -1) !== 0) {
                        this.handleAuthError(identity.token, err, ctx);
                        return resolve();
                    }
                    ctx.stopwatch.stop('plugin.olr.getEntitlements');
                    this.handleAuthSuccess(authData, params, (processedData) => {
                        var _a, _b, _c, _d;
                        if (processedData) {
                            const entitlementData = Object.assign({}, {
                                data: authData,
                                entitlementProduct: processedData
                            }, (params.eISBN) ? {
                                title: (_d = (_c = (_b = (_a = authData.entitlement) === null || _a === void 0 ? void 0 : _a.titles) === null || _b === void 0 ? void 0 : _b.title) === null || _c === void 0 ? void 0 : _c[processedData.titleKey]) !== null && _d !== void 0 ? _d : {}
                            } : {});
                            const mapped = Object.assign({
                                mapped: {},
                                params: {},
                                fallback: {}
                            }, this.mapToSession(ctx, entitlementData), this.mapFallbacksToSession(ctx, entitlementData));
                            Object.assign(mapped.mapped, {
                                'has-entitlements': String(!lodash_isempty_1.default(authData)),
                                'expiration': this.getExpiration(this.options.ttl),
                                'endpoint': this.options.endpoint
                            });
                            ctx.session.set(mapped);
                            this.mapToHeaders(ctx);
                            this.mapFallbacksToHeaders(ctx);
                            resolve();
                        }
                        else {
                            if (params.courseKey) {
                                // TODO: Convert to helper library
                                ctx.headers['cmp-error-code'] = '3322';
                                ctx.set('cmp-error-code', '3322');
                            }
                            else {
                                // TODO: Convert to helper library
                                ctx.headers['cmp-error-code'] = '3323';
                                ctx.set('cmp-error-code', '3323');
                            }
                            if (this.hasFallbackPrivilege(ctx)) {
                                this.setFallbackData(ctx);
                            }
                            this.handleAuthMode(ctx);
                            resolve();
                        }
                    });
                });
            }
            else if (shouldQuery && identity.token && params.eISBN) {
                ctx.stopwatch.start('plugin.olr.getEntitlements');
                this.fetchAuth(identity.token, params, (err, authData) => {
                    var _a, _b, _c, _d, _e, _f, _g, _h;
                    if (err || ((_a = authData === null || authData === void 0 ? void 0 : authData.resultCode) !== null && _a !== void 0 ? _a : -1) !== 0) {
                        this.handleAuthError(identity.token, err, ctx);
                        return resolve();
                    }
                    ctx.stopwatch.stop('plugin.olr.getEntitlements');
                    const entitlementData = Object.assign({}, {
                        data: authData
                    });
                    const mapped = Object.assign({
                        mapped: {},
                        params: {},
                        fallback: {}
                    }, this.mapToSession(ctx, entitlementData), this.mapFallbacksToSession(ctx, entitlementData));
                    Object.assign(mapped.mapped, {
                        'has-entitlements': String(!lodash_isempty_1.default((_h = (_g = (_f = (_e = (_d = (_c = (_b = authData.entitlement) === null || _b === void 0 ? void 0 : _b.titles) === null || _c === void 0 ? void 0 : _c.title) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.products) === null || _f === void 0 ? void 0 : _f.entitlementProduct) === null || _g === void 0 ? void 0 : _g[0]) !== null && _h !== void 0 ? _h : {})),
                        'expiration': this.getExpiration(this.options.ttl),
                        'endpoint': this.options.endpoint
                    });
                    ctx.session.set(mapped);
                    this.mapToHeaders(ctx);
                    this.mapFallbacksToHeaders(ctx);
                    resolve();
                });
            }
            else {
                // Session is authenticated
                // Session has not mapped has-entitlements OR it is now expired
                // selfHandleResponse has not been set to true
                // Then call handleAuthMode
                if (this.isAuth(ctx) && ((typeof ((_a = session.mapped) === null || _a === void 0 ? void 0 : _a['has-entitlements']) === 'undefined') || this.isExpired(session.mapped.expiration)) && !ctx.selfHandleResponse) {
                    this.handleAuthMode(ctx);
                }
                else {
                    this.resumeSession(ctx);
                }
                resolve();
            }
        });
    }
    isExpired(expiration) {
        if (isNaN(Number(expiration))) {
            return true;
        }
        else {
            return expiration < Date.now();
        }
    }
    setFallbackData(ctx) {
        const mapped = Object.assign({
            mapped: {},
            params: {},
            fallback: {}
        }, this.mapToSession(ctx, {}), this.mapFallbacksToSession(ctx, {}));
        Object.assign(mapped.mapped, {
            'has-entitlements': false,
            'expiration': this.getExpiration(this.options.ttl),
            'endpoint': this.options.endpoint
        });
        ctx.session.set(mapped);
        this.resumeSession(ctx);
    }
    resumeSession(ctx) {
        const session = ctx.session.get();
        if (session.mapped) {
            this.mapToHeaders(ctx);
            this.mapFallbacksToHeaders(ctx);
        }
    }
}
exports.default = OlrPlugin;
module.exports = OlrPlugin;
