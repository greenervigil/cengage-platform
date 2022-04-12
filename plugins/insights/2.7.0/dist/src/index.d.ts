import BasePlugin, { PluginOptions } from 'cmp-plugin-base';
import CMPContext from 'cmp-context';
export default class InsightsPlugin extends BasePlugin {
    crowdControlUrl: string;
    whitelist: string[];
    constructor(options: PluginOptions);
    /**
     * Set initial values and settings
     *
     * @public
     * @returns {Promise<void>}
     */
    init(): Promise<void>;
    crowdControlBasicAuth(credentials: {
        name: string;
        pass: string;
    }): Promise<unknown>;
    crowdControlFindByToken(token: string): Promise<unknown>;
    checkCredentials(ctx: CMPContext): Promise<void>;
    /**
     * Function to be ran during request prior to hitting the proxy target
     *
     * @public
     * @param {cmpContext} - ctx
     * @returns {Promise<void>}
     */
    middleware(ctx: CMPContext): Promise<void>;
    obfuscateSecrets(value: any): any;
}
