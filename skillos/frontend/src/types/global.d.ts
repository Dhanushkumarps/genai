/// <reference types="vite/client" />

// Fix JSX namespace issue for older patterns
declare global {
    namespace JSX {
        interface IntrinsicElements {
            [key: string]: any
        }
    }
}

// Fix NodeJS namespace for setTimeout/setInterval
declare namespace NodeJS {
    interface Timeout { }
}

export { }
