/** The current time. One place to read it, so pages and jobs agree. */
export async function now(): Promise<Date> {
  return new Date();
}
