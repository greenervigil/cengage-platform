import AuthenticationPlugin from 'cmp-plugin-authentication';
import { PluginOptions } from 'cmp-plugin-base';
import CMPContext from 'cmp-context';
export default class OlrPlugin extends AuthenticationPlugin {
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
    isRefreshRequest(ctx: CMPContext): boolean;
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
    fetchAuth(token: string, params: any, callback: (err: any, data: any) => void): void;
    getEntitlementProductFromAll(options: any): undefined;
    getEntitlementProduct(options: any): any;
    handleAuthError(token: string, error: any, ctx: CMPContext): void;
    handleAuthSuccess(data: any, params: any, callback: (options: any) => any): void;
    shouldAllowQuery(ctx: CMPContext, params: {
        eISBN?: string;
        courseKey?: string;
        courseKeyType?: string;
        courseCgi?: string;
    }): boolean;
    manageSession(ctx: CMPContext): Promise<void>;
    isExpired(expiration: number): boolean;
    setFallbackData(ctx: CMPContext): void;
    resumeSession(ctx: CMPContext): void;
}
