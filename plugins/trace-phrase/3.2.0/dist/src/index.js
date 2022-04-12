"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cmp_plugin_base_1 = __importDefault(require("cmp-plugin-base"));
const package_json_1 = __importDefault(require("../package.json"));
const adverbs_1 = __importDefault(require("./phrase/adverbs"));
const adjectives_1 = __importDefault(require("./phrase/adjectives"));
const animals_1 = __importDefault(require("./phrase/animals"));
const lodash_get_1 = __importDefault(require("lodash.get"));
const lodash_set_1 = __importDefault(require("lodash.set"));
/*
 * Plugin which will generate (if not present) a cengage_trace_phrase header
 */
class TracePhrasePlugin extends cmp_plugin_base_1.default {
    constructor(options) {
        super(package_json_1.default, options);
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
        return {
            tracephrase: ctx.headers[this.options.headerName || 'cengage_trace_phrase']
        };
    }
    /**
     * Function to be ran during request prior to hitting the proxy target
     *
     * @public
     * @param {cmpContext} - ctx
     * @returns {Promise<void>}
     */
    async middleware(ctx) {
        const headerName = this.options.headerName || 'cengage_trace_phrase';
        const sessionAware = this.options.sessionAware;
        const sharedPhrase = this.options.sharedPhrase;
        const phraseKey = sharedPhrase ? 'cengage_trace_phrase' : headerName;
        if (sessionAware) {
            const sessionData = ctx.session.get();
            const phrasePath = `["${phraseKey}"].phrase`;
            if (!lodash_get_1.default(sessionData, phrasePath)) {
                const phrase = `${this.pickOneWord(adverbs_1.default)} ${this.pickOneWord(adjectives_1.default)} ${this.pickOneWord(animals_1.default)}`;
                lodash_set_1.default(sessionData, phrasePath, phrase);
                ctx.session.set(sessionData);
            }
            ctx.setHeader(headerName, lodash_get_1.default(sessionData, phrasePath));
        }
        else {
            const phrase = `${this.pickOneWord(adverbs_1.default)} ${this.pickOneWord(adjectives_1.default)} ${this.pickOneWord(animals_1.default)}`;
            ctx.setHeader(headerName, phrase);
        }
    }
    //
    // Helper methods
    //
    /**
     * Given a list of phrases, pick a single word from one of the phrases
     *
     * @param {Array} - phrases
     */
    pickOneWord(phrases) {
        const idx = Math.floor(Math.random() * phrases.length);
        const phrase = phrases[idx];
        const wordArr = phrase.split(' ');
        if (wordArr.length === 1) {
            return phrase;
        }
        else {
            return this.pickOneWord(wordArr);
        }
    }
}
exports.default = TracePhrasePlugin;
module.exports = TracePhrasePlugin;
