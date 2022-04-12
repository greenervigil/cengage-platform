import BasePlugin, { PluginOptions } from 'cmp-plugin-base';
import CMPContext from 'cmp-context';
export default class LocalStorePlugin extends BasePlugin {
    level: number;
    constructor(options: PluginOptions);
    /**
     * Set initial values and settings
     *
     * @public
     * @returns {Promise<void>}
     */
    init(): Promise<void>;
    read(ctx: CMPContext): Promise<any>;
    write(ctx: CMPContext, data: any): Promise<void>;
    /**
     * Function to be ran during request prior to hitting the proxy target
     *
     * @public
     * @param {cmpContext} - ctx
     * @returns {Promise<void>}
     */
    middleware(ctx: CMPContext): Promise<void>;
}
