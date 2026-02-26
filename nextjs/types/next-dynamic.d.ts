// temporary workaround for editor/type errors
// Next's types should include this, but sometimes TS can't locate them in monorepo setups.

declare module 'next/dynamic' {
  import { ComponentType, ComponentProps } from 'react';
  type DynamicOptions<P> = {
    loadableGenerated?: any;
    ssr?: boolean;
    loading?: ComponentType<any>;
    loadable?: any;
    modules?: any;
    suspense?: boolean;
  } & Partial<{
    // mimic Next's own definitions, minimal subset
    loader: () => Promise<ComponentType<P>>;
  }>;
  function dynamic<P = {}>(
    loader: () => Promise<ComponentType<P>>,
    options?: DynamicOptions<P>
  ): ComponentType<P>;
  function dynamic<P = {}>(
    options: DynamicOptions<P>
  ): ComponentType<P>;
  export default dynamic;
}
