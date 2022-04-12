import BasePlugin, { PluginOptions } from 'cmp-plugin-base';
import CMPContext from 'cmp-context';
export default class TracePhrasePlugin extends BasePlugin {
    constructor(options: PluginOptions);
    /**
     * Optional function which is called by the CMP trends logging function
     * for persisting any plugin-specific information.
     * Be mindful of sensitive information being resolved to the logger!
     *
     * @public
     * @param {cmpContext} - ctx
     * @returns {Promise<unknown>}
     */
    trends(ctx: CMPContext): Promise<unknown>;
    /**
     * Function to be ran during request prior to hitting the proxy target
     *
     * @public
     * @param {cmpContext} - ctx
     * @returns {Promise<void>}
     */
    middleware(ctx: CMPContext): Promise<void>;
    /**
     * Given a list of phrases, pick a single word from one of the phrases
     *
     * @param {Array} - phrases
     */
    pickOneWord(phrases: string[]): string;
}
