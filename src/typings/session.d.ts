import { ReadStream } from 'fs';
import { IncomingHttpHeaders } from 'http';

export interface WindowCredentials {
    domain?: string;
    workstation?: string;
}

export interface Credentials {
    username: string;
    password: string;
    domain?: string;
    workstation?: string;
}

export interface StoragesSnapshot {
    localStorage: string;
    sessionStorage: string;
}

export interface ExternalProxySettingsRaw {
    url: string;
    bypassRules?: string[];
}

export interface ExternalProxySettings {
    host: string;
    hostname: string;
    bypassRules?: string[];
    port?: string;
    proxyAuth?: string;
    authHeader?: string;
}

export interface FileStream extends ReadStream {
    statusCode: number;
    trailers: object;
    headers: IncomingHttpHeaders;
}

export interface RequestEventListenerError {
    error: Error;
    methodName: string;
}

