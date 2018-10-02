// TypeScript Version: 3.1.1

declare namespace Morsify {
    type options<T> = T;
}

export function encode<T>(text: string, opts?: Morsify.options<T>): void;

export function decode<T>(morse: string, opts?: Morsify.options<T>): void;

export function characters<T>(opts?: Morsify.options<T>, usePriority?: boolean): void;

export function audio<T>(text: string, opts?: Morsify.options<T>): any;
