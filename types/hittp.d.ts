declare module "hittp" {
  import { Readable } from "stream";
  import { IncomingHttpHeaders } from "http";
  function str2url(str: string): URL
  function stream(url: URL, options?: any): Promise<Readable>
  function get(url: URL, options?: any): Promise<{html: string, url: URL}>
  function cancel(url: URL): void
  function head(url, uoptions): Promise<IncomingHttpHeaders>
}