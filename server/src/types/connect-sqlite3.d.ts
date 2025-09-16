declare module 'connect-sqlite3' {
  import { Store } from 'express-session';
  
  interface SQLiteStoreOptions {
    db?: string;
    dir?: string;
    table?: string;
  }
  
  function SQLiteStore(session: any): {
    new (options?: SQLiteStoreOptions): Store;
  };
  
  export = SQLiteStore;
}
