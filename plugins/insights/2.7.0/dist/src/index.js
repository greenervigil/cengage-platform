"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cmp_plugin_base_1 = __importDefault(require("cmp-plugin-base"));
const package_json_1 = __importDefault(require("../package.json"));
const basic_auth_1 = __importDefault(require("basic-auth"));
const jsonpath_1 = __importDefault(require("jsonpath"));
const lodash_get_1 = __importDefault(require("lodash.get"));
const request_1 = __importDefault(require("request"));
class InsightsPlugin extends cmp_plugin_base_1.default {
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
        this.crowdControlUrl = lodash_get_1.default(this.baseConfig, 'crowdControl.url', '');
        this.whitelist = [
            '/_cmp/plugins/maintenance'
        ];
    }
    async crowdControlBasicAuth(credentials) {
        return new Promise((resolve, reject) => {
            const url = new URL(this.crowdControlUrl);
            url.pathname = '/user/authenticate';
            const options = {
                method: 'POST',
                strictSSL: false,
                url: url.toString(),
                headers: {
                    'accept': 'application/x-crowd+json',
                    'content-type': 'application/json'
                },
                body: `{"username": "${credentials.name}", "password": "${credentials.pass}"}`
            };
            request_1.default(options, function requestCallback(error, response, body) {
                if (error || response.error) {
                    reject(new Error(error || response.error));
                }
                else {
                    resolve(body);
                }
            });
        });
    }
    async crowdControlFindByToken(token) {
        return new Promise((resolve, reject) => {
            const url = new URL(this.crowdControlUrl);
            url.pathname = '/user/info';
            url.search = `token=${token}`;
            const options = {
                method: 'GET',
                strictSSL: false,
                url: url.toString()
            };
            request_1.default(options, function requestCallback(error, response, body) {
                if (error || response.error) {
                    reject(new Error(error || response.error));
                }
                else {
                    resolve(body);
                }
            });
        });
    }
    async checkCredentials(ctx) {
        return new Promise(async (resolve, reject) => {
            if (!this.crowdControlUrl) {
                return resolve();
            }
            const credentials = basic_auth_1.default(ctx.req);
            if (credentials && credentials.name && credentials.pass) {
                try {
                    const details = await this.crowdControlBasicAuth(credentials);
                    const user = JSON.parse(details).user;
                    if (user.name) {
                        return resolve();
                    }
                    return reject();
                }
                catch (e) {
                    return reject();
                }
            }
            else if (ctx.get('crowd-sso-token')) {
                try {
                    const details = await this.crowdControlFindByToken(ctx.get('crowd-sso-token'));
                    const user = JSON.parse(details).user;
                    if (user.name) {
                        return resolve();
                    }
                    return reject();
                }
                catch (e) {
                    return reject();
                }
            }
            else {
                ctx.set('WWW-Authenticate', 'Basic realm="to use Active Directory credentials"');
                reject();
            }
        });
    }
    /**
     * Function to be ran during request prior to hitting the proxy target
     *
     * @public
     * @param {cmpContext} - ctx
     * @returns {Promise<void>}
     */
    async middleware(ctx) {
        // Safety to ensure the path begins with /_cmp
        if (ctx.pathContext !== '/_cmp') {
            return;
        }
        // If the request url is in the whitelist, skip the plugin
        if (this.whitelist.includes(ctx.request.url)) {
            return;
        }
        if (ctx.pathRemainder === '/health') {
            ctx.status = 200;
            ctx.selfHandleResponse = true;
            ctx.type = 'application/json';
            ctx.body = { status: 'ok' };
            return;
        }
        try {
            await this.checkCredentials(ctx);
        }
        catch (e) {
            ctx.status = 401;
            ctx.selfHandleResponse = true;
            ctx.body = 'Unauthorized';
            return;
        }
        if (ctx.pathRemainder === '/config') {
            ctx.status = 200;
            ctx.selfHandleResponse = true;
            ctx.type = 'application/json';
            ctx.body = JSON.stringify(this.obfuscateSecrets(this.baseConfig), null, 2);
            return;
        }
        else if (ctx.pathRemainder === '/policy') {
            ctx.status = 200;
            ctx.selfHandleResponse = true;
            ctx.type = 'application/json';
            ctx.body = JSON.stringify(this.obfuscateSecrets(ctx.cmp.policy), null, 2);
            return;
        }
        else if (ctx.pathRemainder === '/session') {
            ctx.status = 200;
            ctx.selfHandleResponse = true;
            ctx.type = 'application/json';
            ctx.body = JSON.stringify(ctx.session.getSessionData(), null, 2);
            return;
        }
        else if (ctx.pathRemainder === '/identity') {
            ctx.status = 200;
            ctx.selfHandleResponse = true;
            ctx.type = 'application/json';
            ctx.body = JSON.stringify(ctx.session.getIdentity(), null, 2);
            return;
        }
        else {
            ctx.status = 307;
            ctx.selfHandleResponse = true;
            ctx.redirect('/_cmp/config');
            return;
        }
    }
    obfuscateSecrets(value) {
        const obfuscateValue = '**********';
        const clone = Object.assign({}, value);
        jsonpath_1.default.apply(clone, '$..["plugins"]["redis-store"]["instance"]["password"]', () => { return obfuscateValue; });
        jsonpath_1.default.apply(clone, '$..["plugins"]["redis-store"]["cluster"]["options"]["password"]', () => { return obfuscateValue; });
        return clone;
    }
}
exports.default = InsightsPlugin;
module.exports = InsightsPlugin;
