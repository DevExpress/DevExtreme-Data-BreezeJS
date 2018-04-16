/// <reference path="../data/data.store.d.ts" />
/// <reference path="../breeze.d.ts" />
declare module DevExpress.data {
    export interface BreezeStoreOptions extends StoreOptions {
        autoCommit?: boolean;
        resourceName?: string;
        entityQuery?: breeze.EntityQuery;
        entityManager: breeze.EntityManager;
    }
    export class BreezeStore extends Store {
        constructor(options: BreezeStoreOptions);
        public entityType(): string;
        public entityManager(): breeze.EntityManager;
    }
}