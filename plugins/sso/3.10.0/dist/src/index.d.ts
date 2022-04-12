import AuthenticationPlugin from 'cmp-plugin-authentication';
import { PluginOptions } from 'cmp-plugin-base';
import CMPContext from 'cmp-context';
export default class SsoPlugin extends AuthenticationPlugin {
    level: any;
    clients: any[];
    defaults: any;
    headerPrefix: string;
    constructor(options: PluginOptions);
    /**
     * Set initial values and settings
     *
     * @public
     * @returns {Promise<void>}
     */
    init(): Promise<void>;
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
    getClient(): any;
    mapDefaultsToHeaders(ctx: CMPContext): void;
    handleAuthError(token: string, error: any, ctx: CMPContext): void;
    handleAuthModeRedirect(ctx: CMPContext): void;
    fetchAuth(token: string, callback: (err: any, data: any) => void): void;
    manageSession(ctx: CMPContext): Promise<void>;
    resumeSession(ctx: CMPContext): void;
}
