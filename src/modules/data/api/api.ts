/**
 * Client for the dev-only read API (see scripts/dev-server.ts).
 *
 * The API exists under `npm run dev` only. `npm run build` produces a static
 * site with no /api, where LWR answers these paths with the HTML shell — so a
 * non-JSON response means "no API in this build", not "bad request". Callers
 * must handle the rejection and render an empty state; an unhandled one is the
 * only way this breaks the static build.
 */

/** No auth in this prototype: the API takes account_id from the caller. */
export const DEV_ACCOUNT_ID = 1; // Neighbourhood Builders Ltd

const BASE = '/api';

export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

interface RequestOptions {
    method?: string;
    body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body } = options;
    let response: Response;
    try {
        response = await fetch(`${BASE}${path}`, {
            method,
            headers: body
                ? { accept: 'application/json', 'content-type': 'application/json' }
                : { accept: 'application/json' },
            body: body ? JSON.stringify(body) : undefined
        });
    } catch {
        throw new ApiError(0, 'Could not reach the data API.');
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
        throw new ApiError(response.status, 'Live data is not available in this build.');
    }

    const payload = await response.json();
    if (!response.ok) {
        // The API's error contract is always { error: string }.
        throw new ApiError(response.status, payload?.error ?? 'Request failed.');
    }
    return payload as T;
}

function query(params: Record<string, string | number | undefined>): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
            search.set(key, String(value));
        }
    }
    const out = search.toString();
    return out ? `?${out}` : '';
}

export interface AuthUser {
    contact_id: number;
    ciam_id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
    job_title: string | null;
    phone: string | null;
    account_id: number | null;
    employer_role: string | null;
    company_name: string | null;
}

export interface RegisterInput {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    job_title?: string;
    phone?: string;
    company_name?: string;
}

export const api = {
    health: () => request<{ status: string }>('/health'),

    /**
     * Prototype auth: these verify a password and return the user. No token is
     * issued and no route is protected — see data/session.
     */
    auth: {
        login: (email: string, password: string) =>
            request<AuthUser>('/auth/login', { method: 'POST', body: { email, password } }),
        register: (input: RegisterInput) =>
            request<AuthUser>('/auth/register', { method: 'POST', body: input }),
        me: (contactId: number) => request<AuthUser>(`/auth/me/${contactId}`)
    },

    contact: (id: number) => request<Row>(`/contacts/${id}`),
    updateContact: (id: number, body: Row) =>
        request<Row>(`/contacts/${id}`, { method: 'PATCH', body }),

    account: (id: number) => request<Record<string, unknown>>(`/accounts/${id}`),
    members: (id: number) => request<Record<string, unknown>[]>(`/accounts/${id}/members`),

    jobs: (accountId: number, filters: { status?: string; contact_id?: number } = {}) =>
        request<Record<string, unknown>[]>(`/jobs${query({ account_id: accountId, ...filters })}`),
    job: (id: number) => request<Record<string, unknown>>(`/jobs/${id}`),

    candidates: (accountId: number, filters: { status?: string } = {}) =>
        request<Record<string, unknown>[]>(
            `/candidates${query({ account_id: accountId, ...filters })}`
        ),
    candidatesByJob: (jobId: number, status?: string) =>
        request<Record<string, unknown>[]>(`/candidates/job/${jobId}${query({ status })}`),
    statusCounts: (jobId: number) =>
        request<Record<string, number>>(`/candidates/job/${jobId}/status-counts`),
    candidate: (id: number) => request<Record<string, unknown>>(`/candidates/${id}`),

    /**
     * Generic table CRUD behind /data. The server's registry is the single
     * source of truth: `schema()` describes every table, and the screen builds
     * its grid and forms from that rather than hard-coding any table.
     */
    admin: {
        schema: () => request<TableSchema[]>('/admin/schema'),

        list: (table: string, params: ListParams = {}) => {
            const { start = 0, limit = 25, sort, order, q, filters = {} } = params;
            const search = query({
                _start: start,
                _end: start + limit,
                _sort: sort,
                _order: order,
                q,
                ...filters
            });
            return request<{ data: Row[]; total: number }>(`/admin/${table}${search}`);
        },

        get: (table: string, id: number) => request<Row>(`/admin/${table}/${id}`),

        create: (table: string, body: Row) =>
            request<Row>(`/admin/${table}`, { method: 'POST', body }),

        update: (table: string, id: number, body: Row) =>
            request<Row>(`/admin/${table}/${id}`, { method: 'PATCH', body }),

        remove: (table: string, id: number) =>
            request<DeleteResult>(`/admin/${table}/${id}`, { method: 'DELETE' })
    }
};

export type Row = Record<string, unknown>;

export interface ColumnSpec {
    name: string;
    options?: string[];
    fk?: boolean;
    long?: boolean;
}

export interface TableSchema {
    name: string;
    label: string;
    columns: string[];
    editable: ColumnSpec[];
    creatable: boolean;
    required: string[];
    searchable: string[];
    deletable: boolean;
    cascades?: string;
    primaryKey: string;
    rowCount: number;
}

export interface ListParams {
    start?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
    q?: string;
    filters?: Record<string, string>;
}

export interface DeleteResult {
    deleted: { table: string; id: number };
    cascaded: Record<string, number>;
}

export default api;
