"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cmp_plugin_base_1 = __importDefault(require("cmp-plugin-base"));
const package_json_1 = __importDefault(require("../package.json"));
const path_1 = require("path");
const jsonfile_1 = __importDefault(require("jsonfile"));
const file = path_1.join(__dirname, 'sessions.json');
/*
 * Plugin providing a local file based session store
 *
 * @extends BasePlugin
 */
class LocalStorePlugin extends cmp_plugin_base_1.default {
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
        this.level = 0;
        this.logger.debug(`Writing session file to: ${file}`);
        jsonfile_1.default.writeFileSync(file, {});
    }
    /*
     * Read a session from the local store
     *
     * @param {string} sessionId - the key matching the session
     * @param {Function} callback -
    */
    async read(ctx) {
        return new Promise(async (resolve) => {
            const sessionId = await ctx.session.getId(ctx);
            try {
                const sessions = jsonfile_1.default.readFileSync(file);
                resolve(JSON.parse(JSON.stringify(sessions[sessionId] || {})));
            }
            catch (e) {
                this.logger.warn({
                    msg: e.toString(),
                    stack: e.stack
                });
                resolve({});
            }
        });
    }
    /*
     * Write a session to the local store
     *
     * @param {string} sessionId - the key matching the session
     * @param {object} data -
     * @param {Function} callback -
     */
    async write(ctx, data) {
        return new Promise(async (resolve) => {
            const sessionId = await ctx.session.getId(ctx);
            try {
                const sessions = jsonfile_1.default.readFileSync(file);
                sessions[sessionId] = data;
                jsonfile_1.default.writeFileSync(file, sessions);
                resolve();
            }
            catch (e) {
                this.logger.warn({
                    msg: e.toString(),
                    stack: e.stack
                });
                resolve();
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
        ctx.store.setWriteHandler(this.write.bind(this));
        // Will always get a sessionId, even if its a brand new one
        const session = await this.read(ctx);
        ctx.session.hydrate(session);
    }
}
exports.default = LocalStorePlugin;
module.exports = LocalStorePlugin;
