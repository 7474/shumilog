// Type declarations for jest-openapi matchers to work with Vitest
import 'vitest';

declare module 'vitest' {
  interface Assertion {
    toSatisfyApiSpec(): void;
    toSatisfySchemaInApiSpec(schemaName: string): void;
  }

  interface AsymmetricMatchersContaining {
    toSatisfyApiSpec(): void;
    toSatisfySchemaInApiSpec(schemaName: string): void;
  }
}
