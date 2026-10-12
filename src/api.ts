export class ApiError extends Error {
  fields: Record<string, string>;
  constructor(message: string, fields: Record<string, string> = {}) { super(message); this.fields = fields; }
}
export async function api<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, { method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin' });
  const data = await response.json().catch(() => ({ error: 'The service returned an unexpected response. Please try again.' })) as {error?:string;fields?:Record<string,string>} & T;
  if (!response.ok) throw new ApiError(data.error || 'The request could not be completed.', data.fields);
  return data as T;
}
export const usd = (cents: number) => `US$${(cents / 100).toFixed(2)}`;
export const whatsappLink = (number: string, message: string) => `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
