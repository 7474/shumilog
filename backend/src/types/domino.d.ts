/**
 * Type definitions for @mixmark-io/domino
 * The package includes types for 'domino' but we need them for '@mixmark-io/domino'
 */

declare module '@mixmark-io/domino' {
  export function createDOMImplementation(): any;
  export function createDocument(html?: string, force?: boolean): any;
  export function createWindow(html?: string, address?: string): any;
}
