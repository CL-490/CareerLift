// stub types for vis-network bundles lacking TS definitions

declare module 'vis-network/standalone' {
  import { Network, DataSet } from 'vis-network';
  export { Network, DataSet };
}

declare module 'vis-network' {
  export interface Node {
    id: string | number;
    label?: string;
    group?: string;
    title?: string;
    [key: string]: any;
  }
  export interface Edge {
    from: string | number;
    to: string | number;
    label?: string;
    arrows?: string;
    [key: string]: any;
  }
  export class Network {
    constructor(container: HTMLElement, data: { nodes: any; edges: any }, options?: any);
    on(event: string, callback: (params: any) => void): void;
    destroy(): void;
    body?: any;
  }
  export class DataSet<T = any> {
    constructor(data?: T[]);
    add(item: T): void;
    get(id: string | number): T | undefined;
  }
}
